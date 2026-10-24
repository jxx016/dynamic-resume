# Multi-Provider AI (Gemini + OpenAI) — Design Spec

**Date:** 2026-08-06
**Status:** Approved (design) → implementation plan
**Builds on:** [2026-07-30-dynamic-resume-design.md](2026-07-30-dynamic-resume-design.md) (Phase 1)

---

## 1. Problem

Phase 1 hardcodes Google Gemini as the only AI provider. The user wants to run the same resume + JD through OpenAI as well, to **compare tailoring quality** and pick the better provider. Today `getEnv()` hard-throws without `GEMINI_API_KEY`, and `createRealTransport()` can only build a Gemini client.

## 2. Goals & Non-Goals

**Goals**
- Support **Gemini and OpenAI** as interchangeable providers for every AI operation.
- Let the user **pick the provider per request** from the UI, so the same input can be run through both and compared.
- Keep both providers under the **identical validation + repair-retry contract**, so a comparison measures the model, not the plumbing.
- Only offer providers whose API key is actually configured.

**Non-Goals**
- Side-by-side dual runs in one click (run one at a time, compare manually).
- Automatic fallback / retry across providers.
- Per-request model selection (model is env-level per provider).
- A third provider now — though the seam makes adding one a single-file job.

## 3. Key Decisions

| Area | Decision |
|---|---|
| Seam | `GenerateTransport` (`generate(prompt) → text`) is already provider-agnostic; OpenAI slots in beneath it |
| Provider choice | Per-request, from the UI; server defaults to `AI_PROVIDER`, else the first configured provider |
| OpenAI API | **Responses API** (`client.responses.create`), the current primary API — not Chat Completions |
| OpenAI JSON mode | `text: { format: { type: 'json_object' } }`; read via `response.output_text` |
| OpenAI default model | `gpt-5.6-terra` (balanced tier), overridable via `OPENAI_MODEL` |
| Gemini default model | `gemini-2.5-flash` (unchanged), via `GEMINI_MODEL` |
| Rename | `GeminiClient` → `StructuredClient` — the class is provider-agnostic and the old name would lie |
| Availability | `GET /api/providers` reports which providers have keys, so the UI only offers usable ones |

**Current OpenAI model tiers** (verified 2026-08-06 against OpenAI docs): `gpt-5.6-sol` (frontier), `gpt-5.6-terra` (balanced — our default), `gpt-5.6-luna` (cost-optimized).

## 4. Architecture

Everything above the transport is untouched. Agents, prompts, schemas, store, and the PDF renderer do not change.

```
  agents (tailor / builder / importer / base-picker)   ← unchanged
                      ↓
  StructuredClient  (parse → Zod validate → 1 repair retry)   ← unchanged logic, renamed
                      ↓
  GenerateTransport   { generate(prompt): Promise<string> }   ← unchanged interface
                      ↓
      ┌───────────────┴────────────────┐
  Gemini transport              OpenAI transport            ← new sibling
  (@google/genai)               (openai, Responses API)
```

The provider flows in from the request: **UI picker → API route → `clientFor(provider)` → transport**.

## 5. Component Changes

### 5.1 `src/lib/env.ts`
Replaces the single `getEnv()` with provider-aware access:

- `type Provider = 'gemini' | 'openai'`
- `getProviderEnv(provider): { apiKey, model }` — throws `MissingKeyError` naming the exact env var (`GEMINI_API_KEY` / `OPENAI_API_KEY`).
- `configuredProviders(): Provider[]` — those whose key is set.
- `defaultProvider(): Provider` — `AI_PROVIDER` if valid and configured, else the first configured provider; throws if none are configured.

`MissingKeyError` is a typed error (like `AiValidationError`) so routes can map it to 400 rather than 500.

### 5.2 `src/lib/ai/transport.ts`
- `createGeminiTransport()` — the existing implementation, renamed.
- `createOpenAiTransport()` — new:
  ```ts
  const res = await openai.responses.create({
    model,
    input: prompt,
    text: { format: { type: 'json_object' } },
  })
  return res.output_text ?? ''
  ```
- `createTransport(provider): GenerateTransport` — dispatches on provider.

The `GenerateTransport` interface itself is unchanged.

### 5.3 `src/lib/ai/gemini.ts` → `src/lib/ai/structured-client.ts`
Mechanical rename of `GeminiClient` → `StructuredClient`. No logic change: JSON parse, fence-strip, Zod validate, exactly one repair retry, then `AiValidationError`. Call sites updated: the four agents, the resume importer, `app-context.ts`, and their tests.

### 5.4 `src/lib/app-context.ts`
`client` becomes `clientFor(provider)`, lazily constructing and caching one `StructuredClient` per provider, so a provider whose key is absent is never built:

```ts
export interface AppContext {
  store: ResumeStore
  clientFor(provider: Provider): StructuredClient
}
```

`setContextForTest` is unchanged in spirit; tests inject `{ store, clientFor: () => fakeClient }`.

### 5.5 API routes
The three AI-invoking routes accept an optional `provider` field, validated with a Zod enum and defaulting to `defaultProvider()`:

- `POST /api/tailor` — `{ baseResumeId, jdText, provider? }` (the base-picker on the `'auto'` path uses the same provider)
- `POST /api/builder/message` — `{ history, draft, provider? }`
- `POST /api/resumes` — `provider?` on the AI-import path only (`kind: 'text' | 'pdf' | 'docx'`); the non-AI `kind: 'resume'` path ignores it

New: `GET /api/providers` → `{ configured: Provider[], default: Provider | null }`. When nothing is configured it returns `{ configured: [], default: null }` rather than throwing (it must not call `defaultProvider()` unguarded), so the UI can render a clear "no provider configured" state.

### 5.6 UI
- `src/components/ProviderPicker.tsx` — a labelled `<select>` populated from `GET /api/providers`, defaulting to the reported default. Renders a disabled "no AI provider configured" state when the list is empty.
- Used on the tailor page and the builder page; the selected provider is included in the POST body.

### 5.7 Docs
`.env.example` documents `GEMINI_API_KEY`, `GEMINI_MODEL`, `OPENAI_API_KEY`, `OPENAI_MODEL`, and `AI_PROVIDER`, noting that at least one provider key is required.

## 6. Error Handling

| Condition | Response |
|---|---|
| Requested provider's key missing (`MissingKeyError`) | **400**, message naming the exact env var |
| Unknown provider value in body | **400** (Zod enum rejection) |
| No provider configured at all | **400** on AI routes; `GET /api/providers` returns an empty list instead of erroring |
| Model returns unparseable/invalid JSON after one repair retry | **502** (`AiValidationError`) — unchanged, identical for both providers |

The UI only lists configured providers, so missing-key errors should be rare — but the check is enforced server-side regardless, since the client is untrusted.

## 7. Testing

All 28 existing tests must stay green (with a mechanical update to `clientFor` injection). New coverage:

- **env** — per-provider key/model lookup; `MissingKeyError` names the right variable; `configuredProviders()` reflects which keys are set; `defaultProvider()` precedence (`AI_PROVIDER` → first configured) and its throw when none are set.
- **transport** — `createTransport('gemini'|'openai')` dispatches to the right builder; each throws without its key. The real network call stays untested, consistent with the existing Gemini transport.
- **routes** — the `provider` field is honored end-to-end (a fake context records which provider was requested); an invalid provider → 400; a missing key → 400; `GET /api/providers` reflects configured keys.
- **prompt guard** — every prompt builder's output contains the substring "json" (case-insensitive), which OpenAI's JSON mode requires. Cheap to lock down, and it protects a cross-provider assumption that is otherwise invisible.

All AI calls in tests continue to use injected fakes — no network.

## 8. Out of Scope / Future

- Side-by-side dual-provider runs with a diff view.
- Cross-provider fallback chains.
- Per-request model selection in the UI.
- Anthropic or other providers (the seam now makes this ~one file).
- Recording which provider produced a stored tailored resume (useful later for judging results after the fact).
