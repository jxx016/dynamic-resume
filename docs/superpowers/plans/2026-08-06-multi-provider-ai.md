# Multi-Provider AI (Gemini + OpenAI) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the user pick Gemini or OpenAI per request from the UI, so the same resume + JD can be run through both and compared.

**Architecture:** The existing `GenerateTransport` interface (`generate(prompt) → text`) is already provider-agnostic, so OpenAI slots in beneath it as a sibling transport. Everything above — the agents, prompts, schemas, store, PDF renderer — is untouched. The provider flows in from the request: UI picker → API route → `clientFor(provider)` → transport.

**Tech Stack:** Next.js 16 (App Router) · TypeScript · Vitest · Zod · `@google/genai` · `openai` (Responses API).

## Global Constraints

- **TypeScript strict.** `npx tsc --noEmit` must be clean (zero errors) at the end of every task.
- **All 28 existing tests must stay green.** Run `npm run test:run` before every commit.
- **No network in tests.** Every AI call in tests uses an injected fake transport or fake client.
- **OpenAI API:** use the **Responses API** — `client.responses.create({ model, input, text: { format: { type: 'json_object' } } })`, read via `res.output_text`. Not Chat Completions.
- **Model defaults:** Gemini `gemini-2.5-flash` (via `GEMINI_MODEL`); OpenAI `gpt-5.6-terra` (via `OPENAI_MODEL`). These OpenAI ids were verified against OpenAI's docs on 2026-08-06; the tiers are `gpt-5.6-sol` (frontier), `gpt-5.6-terra` (balanced), `gpt-5.6-luna` (cost-optimized).
- **Error mapping:** missing provider key or invalid provider → **400** with the exact env var named; unparseable model JSON after one repair retry → **502** (`AiValidationError`, unchanged).
- **Honesty guardrail unchanged:** `tailorResume` still forces every suggestion to `status: 'pending'`.
- **Keyless build must still pass:** `GEMINI_API_KEY= OPENAI_API_KEY= npm run build` succeeds (clients are constructed lazily, never at module load or render).

---

## File Structure

```
src/lib/
  env.ts                      # MODIFY: provider-aware config (replaces getEnv)
  ai/
    transport.ts              # MODIFY: gemini + openai transports, createTransport dispatch
    gemini.ts                 # RENAME → structured-client.ts (GeminiClient → StructuredClient)
    resolve-provider.ts       # CREATE: shared provider resolution + client lookup for routes
  app-context.ts              # MODIFY: client → clientFor(provider), cached per provider
src/app/api/
  providers/route.ts          # CREATE: GET which providers are configured
  tailor/route.ts             # MODIFY: accept provider
  builder/message/route.ts    # MODIFY: accept provider
  resumes/route.ts            # MODIFY: accept provider on the AI-import path
src/components/
  ProviderPicker.tsx          # CREATE: <select> of configured providers
src/app/tailor/[id]/page.tsx  # MODIFY: picker + send provider
src/app/build/page.tsx        # MODIFY: picker + send provider
.env.example                  # MODIFY: document all five vars
```

---

### Task 1: Provider-aware env + OpenAI transport

**Files:**
- Modify: `src/lib/env.ts` (full rewrite), `src/lib/ai/transport.ts` (full rewrite), `.env.example`
- Test: `tests/lib/env.test.ts` (rewrite), `tests/lib/ai/transport.test.ts` (create), `tests/lib/ai/prompts.test.ts` (append one test)

**Interfaces:**
- Consumes: nothing from other tasks in this plan.
- Produces:
  - From `@/lib/env`: `ProviderSchema` (Zod enum), `type Provider = 'gemini' | 'openai'`, `PROVIDERS: readonly Provider[]`, `class MissingKeyError extends Error { provider: Provider; envVar: string }`, `getProviderEnv(provider): { apiKey: string; model: string }`, `configuredProviders(): Provider[]`, `defaultProvider(): Provider` (throws if none configured).
  - From `@/lib/ai/transport`: `interface GenerateTransport { generate(prompt: string): Promise<string> }` (unchanged), `createGeminiTransport()`, `createOpenAiTransport()`, `createTransport(provider: Provider): GenerateTransport`.
  - **The old `getEnv()` is removed.** Its only caller is `transport.ts`, rewritten in this task.

- [ ] **Step 1: Install the OpenAI SDK**

```bash
npm install openai
```

- [ ] **Step 2: Write the failing env test**

Replace the entire contents of `tests/lib/env.test.ts`:

```ts
import { describe, it, expect, afterEach } from 'vitest'
import {
  getProviderEnv, configuredProviders, defaultProvider, MissingKeyError,
} from '@/lib/env'

const OLD = { ...process.env }
afterEach(() => { process.env = { ...OLD } })

function clearProviderEnv() {
  delete process.env.GEMINI_API_KEY
  delete process.env.OPENAI_API_KEY
  delete process.env.GEMINI_MODEL
  delete process.env.OPENAI_MODEL
  delete process.env.AI_PROVIDER
}

describe('getProviderEnv', () => {
  it('returns the gemini key and default model', () => {
    clearProviderEnv()
    process.env.GEMINI_API_KEY = 'g-key'
    expect(getProviderEnv('gemini')).toEqual({ apiKey: 'g-key', model: 'gemini-2.5-flash' })
  })

  it('returns the openai key and default model', () => {
    clearProviderEnv()
    process.env.OPENAI_API_KEY = 'o-key'
    expect(getProviderEnv('openai')).toEqual({ apiKey: 'o-key', model: 'gpt-5.6-terra' })
  })

  it('honors a model override', () => {
    clearProviderEnv()
    process.env.OPENAI_API_KEY = 'o-key'
    process.env.OPENAI_MODEL = 'gpt-5.6-sol'
    expect(getProviderEnv('openai').model).toBe('gpt-5.6-sol')
  })

  it('throws MissingKeyError naming the exact env var', () => {
    clearProviderEnv()
    expect(() => getProviderEnv('openai')).toThrow(MissingKeyError)
    expect(() => getProviderEnv('openai')).toThrow(/OPENAI_API_KEY/)
    expect(() => getProviderEnv('gemini')).toThrow(/GEMINI_API_KEY/)
  })
})

describe('configuredProviders', () => {
  it('lists only providers whose key is set', () => {
    clearProviderEnv()
    expect(configuredProviders()).toEqual([])
    process.env.OPENAI_API_KEY = 'o-key'
    expect(configuredProviders()).toEqual(['openai'])
    process.env.GEMINI_API_KEY = 'g-key'
    expect(configuredProviders()).toEqual(['gemini', 'openai'])
  })
})

describe('defaultProvider', () => {
  it('honors AI_PROVIDER when that provider is configured', () => {
    clearProviderEnv()
    process.env.GEMINI_API_KEY = 'g-key'
    process.env.OPENAI_API_KEY = 'o-key'
    process.env.AI_PROVIDER = 'openai'
    expect(defaultProvider()).toBe('openai')
  })

  it('falls back to the first configured provider when AI_PROVIDER is unset', () => {
    clearProviderEnv()
    process.env.OPENAI_API_KEY = 'o-key'
    expect(defaultProvider()).toBe('openai')
  })

  it('ignores AI_PROVIDER naming an unconfigured provider', () => {
    clearProviderEnv()
    process.env.OPENAI_API_KEY = 'o-key'
    process.env.AI_PROVIDER = 'gemini'
    expect(defaultProvider()).toBe('openai')
  })

  it('throws when no provider is configured', () => {
    clearProviderEnv()
    expect(() => defaultProvider()).toThrow(/GEMINI_API_KEY|OPENAI_API_KEY/)
  })
})
```

- [ ] **Step 3: Run it to verify it fails**

Run: `npm run test:run -- tests/lib/env.test.ts`
Expected: FAIL — `getProviderEnv` / `MissingKeyError` are not exported from `@/lib/env`.

- [ ] **Step 4: Implement `src/lib/env.ts`**

Replace the entire file:

```ts
import { z } from 'zod'

export const ProviderSchema = z.enum(['gemini', 'openai'])
export type Provider = z.infer<typeof ProviderSchema>
export const PROVIDERS: readonly Provider[] = ProviderSchema.options

const KEY_VAR: Record<Provider, string> = {
  gemini: 'GEMINI_API_KEY',
  openai: 'OPENAI_API_KEY',
}
const MODEL_VAR: Record<Provider, string> = {
  gemini: 'GEMINI_MODEL',
  openai: 'OPENAI_MODEL',
}
const DEFAULT_MODEL: Record<Provider, string> = {
  gemini: 'gemini-2.5-flash',
  openai: 'gpt-5.6-terra',
}

export class MissingKeyError extends Error {
  constructor(readonly provider: Provider, readonly envVar: string) {
    super(`${envVar} is not set`)
    this.name = 'MissingKeyError'
  }
}

export function getProviderEnv(provider: Provider): { apiKey: string; model: string } {
  const apiKey = process.env[KEY_VAR[provider]]
  if (!apiKey) throw new MissingKeyError(provider, KEY_VAR[provider])
  return { apiKey, model: process.env[MODEL_VAR[provider]] ?? DEFAULT_MODEL[provider] }
}

export function configuredProviders(): Provider[] {
  return PROVIDERS.filter(p => Boolean(process.env[KEY_VAR[p]]))
}

export function defaultProvider(): Provider {
  const configured = configuredProviders()
  if (configured.length === 0) {
    throw new Error('No AI provider configured: set GEMINI_API_KEY or OPENAI_API_KEY')
  }
  const preferred = process.env.AI_PROVIDER
  const parsed = ProviderSchema.safeParse(preferred)
  if (parsed.success && configured.includes(parsed.data)) return parsed.data
  return configured[0]
}
```

- [ ] **Step 5: Run the env test to verify it passes**

Run: `npm run test:run -- tests/lib/env.test.ts`
Expected: PASS (all 8 tests).

- [ ] **Step 6: Write the failing transport test**

Create `tests/lib/ai/transport.test.ts`:

```ts
import { describe, it, expect, afterEach } from 'vitest'
import { createTransport } from '@/lib/ai/transport'
import { MissingKeyError } from '@/lib/env'

const OLD = { ...process.env }
afterEach(() => { process.env = { ...OLD } })

describe('createTransport', () => {
  it('builds a gemini transport when the key is present', () => {
    process.env.GEMINI_API_KEY = 'g-key'
    expect(typeof createTransport('gemini').generate).toBe('function')
  })

  it('builds an openai transport when the key is present', () => {
    process.env.OPENAI_API_KEY = 'o-key'
    expect(typeof createTransport('openai').generate).toBe('function')
  })

  it('throws MissingKeyError for a provider with no key', () => {
    delete process.env.OPENAI_API_KEY
    expect(() => createTransport('openai')).toThrow(MissingKeyError)
    delete process.env.GEMINI_API_KEY
    expect(() => createTransport('gemini')).toThrow(MissingKeyError)
  })
})
```

Note: constructing a transport builds an SDK client but makes **no** network call, so these tests are offline. The actual `generate()` round-trip stays untested, consistent with how the Gemini transport was treated in Phase 1.

- [ ] **Step 7: Run it to verify it fails**

Run: `npm run test:run -- tests/lib/ai/transport.test.ts`
Expected: FAIL — `createTransport` is not exported from `@/lib/ai/transport`.

- [ ] **Step 8: Implement `src/lib/ai/transport.ts`**

Replace the entire file:

```ts
import { GoogleGenAI } from '@google/genai'
import OpenAI from 'openai'
import { getProviderEnv, type Provider } from '@/lib/env'

export interface GenerateTransport { generate(prompt: string): Promise<string> }

export function createGeminiTransport(): GenerateTransport {
  const { apiKey, model } = getProviderEnv('gemini')
  const ai = new GoogleGenAI({ apiKey })
  return {
    async generate(prompt: string) {
      const res = await ai.models.generateContent({
        model,
        contents: prompt,
        config: { responseMimeType: 'application/json' },
      })
      return res.text ?? ''
    },
  }
}

export function createOpenAiTransport(): GenerateTransport {
  const { apiKey, model } = getProviderEnv('openai')
  const openai = new OpenAI({ apiKey })
  return {
    async generate(prompt: string) {
      const res = await openai.responses.create({
        model,
        input: prompt,
        text: { format: { type: 'json_object' } },
      })
      return res.output_text ?? ''
    },
  }
}

export function createTransport(provider: Provider): GenerateTransport {
  return provider === 'openai' ? createOpenAiTransport() : createGeminiTransport()
}
```

If `res.output_text` is not present on the SDK's response type, read the installed types (`node_modules/openai/resources/responses/`) and use the documented accessor for the aggregated output text — do not fall back to Chat Completions.

- [ ] **Step 9: Run the transport test to verify it passes**

Run: `npm run test:run -- tests/lib/ai/transport.test.ts`
Expected: PASS (all 3 tests).

- [ ] **Step 10: Add the prompt guard test**

OpenAI's JSON mode requires the literal word "json" somewhere in the prompt. Every prompt builder already satisfies this; this test locks it in so a future prompt edit can't silently break OpenAI.

Append to `tests/lib/ai/prompts.test.ts` (add `builderPrompt` to the existing import from `@/lib/ai/prompts`):

```ts
describe('OpenAI JSON-mode compatibility', () => {
  it('every prompt contains the word json', () => {
    const all = [
      importPrompt('raw text'),
      builderPrompt([{ role: 'user', text: 'hi' }], null),
      tailorPrompt(base, 'jd text'),
      pickPrompt('jd text', [{ id: 'a', label: 'PM', summary: 's' }]),
    ]
    for (const p of all) expect(p.toLowerCase()).toContain('json')
  })
})
```

- [ ] **Step 11: Update `.env.example`**

Replace the entire file:

```
# At least one provider key is required.

GEMINI_API_KEY=your-gemini-key-here
GEMINI_MODEL=gemini-2.5-flash

OPENAI_API_KEY=your-openai-key-here
# Options: gpt-5.6-sol (frontier) | gpt-5.6-terra (balanced) | gpt-5.6-luna (cheapest)
OPENAI_MODEL=gpt-5.6-terra

# Provider used when a request doesn't specify one: gemini | openai
AI_PROVIDER=gemini
```

- [ ] **Step 12: Run the full suite and typecheck**

Run: `npm run test:run` — expected: all pass (existing 28 + the new env/transport/prompt tests).
Run: `npx tsc --noEmit` — expected: zero errors.

- [ ] **Step 13: Commit**

```bash
git add -A
git commit -m "feat: add provider-aware env config and OpenAI transport"
```

---

### Task 2: Rename GeminiClient → StructuredClient

**Files:**
- Rename: `src/lib/ai/gemini.ts` → `src/lib/ai/structured-client.ts`; `tests/lib/ai/gemini.test.ts` → `tests/lib/ai/structured-client.test.ts`
- Modify (import + identifier updates only): `src/lib/app-context.ts`, `src/lib/agents/tailor.ts`, `src/lib/agents/builder.ts`, `src/lib/agents/base-picker.ts`, `src/lib/import/resume-importer.ts`, `src/app/api/tailor/route.ts`, `src/app/api/builder/message/route.ts`, `src/app/api/resumes/route.ts`, `tests/app/api/tailor-route.test.ts`, `tests/app/api/resumes-id-route.test.ts`, `tests/lib/agents/tailor.test.ts`, `tests/lib/agents/builder.test.ts`, `tests/lib/agents/base-picker.test.ts`, `tests/lib/import/resume-importer.test.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: `class StructuredClient` and `class AiValidationError`, both exported from `@/lib/ai/structured-client`. The class body, constructor signature (`constructor(transport: GenerateTransport)`), and `generateStructured<T>(prompt, schema): Promise<T>` behaviour are **unchanged** — this is a pure rename.

This is a mechanical rename with zero behaviour change. No new tests; the existing suite is the regression check.

- [ ] **Step 1: Rename the two files**

```bash
git mv src/lib/ai/gemini.ts src/lib/ai/structured-client.ts
git mv tests/lib/ai/gemini.test.ts tests/lib/ai/structured-client.test.ts
```

- [ ] **Step 2: Rewrite the class and update every reference**

```bash
# class name
grep -rl 'GeminiClient' src tests | xargs sed -i '' 's/GeminiClient/StructuredClient/g'
# import path
grep -rl "@/lib/ai/gemini'" src tests | xargs sed -i '' "s#@/lib/ai/gemini'#@/lib/ai/structured-client'#g"
# relative import inside src/lib/ai (transport.ts imports './transport', unaffected)
grep -rl "from './gemini'" src tests | xargs sed -i '' "s#from './gemini'#from './structured-client'#g"
```

Then verify nothing was missed:

```bash
grep -rn 'GeminiClient\|ai/gemini' src tests || echo "clean — no references remain"
```

Expected: `clean — no references remain`.

- [ ] **Step 3: Update the describe block in the renamed test**

In `tests/lib/ai/structured-client.test.ts`, the `describe` string will read `StructuredClient.generateStructured` after the sed. Confirm it does; if the original said something Gemini-specific that the sed missed, fix the wording so the test name matches the class.

- [ ] **Step 4: Run the full suite and typecheck**

Run: `npm run test:run` — expected: all pass, same count as after Task 1 (a pure rename changes no test count).
Run: `npx tsc --noEmit` — expected: zero errors.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor: rename GeminiClient to StructuredClient (now provider-agnostic)"
```

---

### Task 3: Per-provider clients and provider-aware routes

**Files:**
- Modify: `src/lib/app-context.ts`, `src/app/api/tailor/route.ts`, `src/app/api/builder/message/route.ts`, `src/app/api/resumes/route.ts`
- Create: `src/lib/ai/resolve-provider.ts`, `src/app/api/providers/route.ts`
- Test: `tests/app/api/provider-routing.test.ts` (create); update `tests/app/api/tailor-route.test.ts` and `tests/app/api/resumes-id-route.test.ts` for the new context shape

**Interfaces:**
- Consumes: `Provider`, `ProviderSchema`, `defaultProvider`, `configuredProviders`, `MissingKeyError` from `@/lib/env`; `createTransport` from `@/lib/ai/transport`; `StructuredClient` from `@/lib/ai/structured-client`.
- Produces:
  - `interface AppContext { store: ResumeStore; clientFor(provider: Provider): StructuredClient }` from `@/lib/app-context` — **`client` is replaced by `clientFor`**.
  - `resolveProviderClient(raw: unknown): { ok: true; provider: Provider; client: StructuredClient } | { ok: false; error: string }` from `@/lib/ai/resolve-provider`.
  - `GET /api/providers` → `{ configured: Provider[], default: Provider | null }`.

- [ ] **Step 1: Update the app context**

Replace the entire `src/lib/app-context.ts`:

```ts
import { SqliteResumeStore } from '@/lib/store/sqlite-store'
import { StructuredClient } from '@/lib/ai/structured-client'
import { createTransport } from '@/lib/ai/transport'
import type { ResumeStore } from '@/lib/store/resume-store'
import type { Provider } from '@/lib/env'

export interface AppContext {
  store: ResumeStore
  clientFor(provider: Provider): StructuredClient
}

let override: AppContext | null = null
let realStore: ResumeStore | null = null
const realClients = new Map<Provider, StructuredClient>()

export function setContextForTest(ctx: AppContext | null) { override = ctx }

export function getContext(): AppContext {
  if (override) return override
  if (!realStore) realStore = new SqliteResumeStore(process.env.DB_PATH ?? 'data/resumes.db')
  const store = realStore
  return {
    store,
    // Built lazily and cached per provider, so a provider with no key is never constructed.
    clientFor(provider: Provider): StructuredClient {
      let client = realClients.get(provider)
      if (!client) {
        client = new StructuredClient(createTransport(provider))
        realClients.set(provider, client)
      }
      return client
    },
  }
}
```

- [ ] **Step 2: Add the shared provider resolver**

Create `src/lib/ai/resolve-provider.ts`:

```ts
import { ProviderSchema, defaultProvider, MissingKeyError, type Provider } from '@/lib/env'
import { getContext } from '@/lib/app-context'
import type { StructuredClient } from './structured-client'

export type ProviderResolution =
  | { ok: true; provider: Provider; client: StructuredClient }
  | { ok: false; error: string }

/**
 * Resolves the provider for a request body's `provider` field (absent → the
 * configured default) and returns its client. Every failure here is a caller
 * or configuration problem, so routes map `ok: false` to HTTP 400.
 */
export function resolveProviderClient(raw: unknown): ProviderResolution {
  let provider: Provider
  if (raw === undefined || raw === null) {
    try {
      provider = defaultProvider()
    } catch (e) {
      return { ok: false, error: (e as Error).message }
    }
  } else {
    const parsed = ProviderSchema.safeParse(raw)
    if (!parsed.success) return { ok: false, error: `invalid provider: ${String(raw)}` }
    provider = parsed.data
  }

  try {
    return { ok: true, provider, client: getContext().clientFor(provider) }
  } catch (e) {
    if (e instanceof MissingKeyError) return { ok: false, error: e.message }
    throw e
  }
}
```

- [ ] **Step 3: Add the providers route**

Create `src/app/api/providers/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { configuredProviders, defaultProvider } from '@/lib/env'

export const dynamic = 'force-dynamic'

export async function GET() {
  const configured = configuredProviders()
  return NextResponse.json({
    configured,
    default: configured.length > 0 ? defaultProvider() : null,
  })
}
```

- [ ] **Step 4: Update the tailor route**

Replace the entire `src/app/api/tailor/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { getContext } from '@/lib/app-context'
import { tailorResume } from '@/lib/agents/tailor'
import { pickBase } from '@/lib/agents/base-picker'
import { AiValidationError } from '@/lib/ai/structured-client'
import { resolveProviderClient } from '@/lib/ai/resolve-provider'

export async function POST(req: Request) {
  const { baseResumeId, jdText, provider } = await req.json()
  if (!jdText?.trim()) return NextResponse.json({ error: 'jdText is required' }, { status: 400 })

  const resolved = resolveProviderClient(provider)
  if (!resolved.ok) return NextResponse.json({ error: resolved.error }, { status: 400 })
  const client = resolved.client

  const { store } = getContext()
  try {
    let id = baseResumeId
    if (baseResumeId === 'auto') {
      const resumes = store.list()
      if (resumes.length === 0) return NextResponse.json({ error: 'no base resumes' }, { status: 400 })
      id = await pickBase(client, jdText, resumes)
    }
    const base = store.get(id)
    if (!base) return NextResponse.json({ error: 'resume not found' }, { status: 404 })
    return NextResponse.json(await tailorResume(client, base, jdText))
  } catch (e) {
    if (e instanceof AiValidationError) return NextResponse.json({ error: e.message }, { status: 502 })
    throw e
  }
}
```

- [ ] **Step 5: Update the builder route**

Replace the entire `src/app/api/builder/message/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { builderTurn } from '@/lib/agents/builder'
import { AiValidationError } from '@/lib/ai/structured-client'
import { resolveProviderClient } from '@/lib/ai/resolve-provider'

export async function POST(req: Request) {
  const { history, draft, provider } = await req.json()

  const resolved = resolveProviderClient(provider)
  if (!resolved.ok) return NextResponse.json({ error: resolved.error }, { status: 400 })

  try {
    return NextResponse.json(await builderTurn(resolved.client, history ?? [], draft ?? null))
  } catch (e) {
    if (e instanceof AiValidationError) return NextResponse.json({ error: e.message }, { status: 502 })
    throw e
  }
}
```

- [ ] **Step 6: Update the resumes route's AI-import path**

In `src/app/api/resumes/route.ts`, the `POST` handler has two branches: the non-AI `kind: 'resume'` branch (leave it completely alone — it takes no provider) and the AI-import branch for `kind: 'text' | 'pdf' | 'docx'`.

In the AI-import branch only, replace the use of `getContext().client` with the resolved client. Add the import:

```ts
import { resolveProviderClient } from '@/lib/ai/resolve-provider'
```

and inside the AI-import branch, before calling `importResume`:

```ts
const resolved = resolveProviderClient(body.provider)
if (!resolved.ok) return NextResponse.json({ error: resolved.error }, { status: 400 })
```

then pass `resolved.client` to `importResume(...)` in place of the old client. Also update the `AiValidationError` import path to `@/lib/ai/structured-client` if Task 2's sed did not already do so.

- [ ] **Step 7: Update the two existing route tests for the new context shape**

In `tests/app/api/tailor-route.test.ts` and `tests/app/api/resumes-id-route.test.ts`, the `setContextForTest({ store, client })` calls must become `clientFor`. Change each to:

```ts
setContextForTest({ store, clientFor: () => fakeClient })
```

where `fakeClient` is the `StructuredClient` the test already builds. Everything else in those tests stays the same.

- [ ] **Step 8: Write the failing provider-routing test**

Create `tests/app/api/provider-routing.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { setContextForTest } from '@/lib/app-context'
import { SqliteResumeStore } from '@/lib/store/sqlite-store'
import { StructuredClient } from '@/lib/ai/structured-client'
import { POST as tailorPost } from '@/app/api/tailor/route'
import { GET as providersGet } from '@/app/api/providers/route'
import type { Resume } from '@/lib/schema/resume'

const base = {
  id: 'a', label: 'x', isBase: true,
  basics: { name: 'Jo', email: '', phone: '', location: '', links: [] },
  summary: 'S', experience: [], education: [], skills: [], projects: [],
  meta: { createdAt: '', updatedAt: '' },
} as Resume

const modelOut = JSON.stringify({
  tailoredResume: base,
  changeLog: [],
  suggestions: [],
  atsReport: { jdKeywords: [], matched: [], missing: [], score: 10 },
})

const OLD = { ...process.env }
let requested: string[] = []

beforeEach(() => {
  requested = []
  const store = new SqliteResumeStore(':memory:')
  store.create(base)
  const fake = new StructuredClient({ generate: async () => modelOut })
  setContextForTest({
    store,
    clientFor: (p) => { requested.push(p); return fake },
  })
})

afterEach(() => {
  setContextForTest(null)
  process.env = { ...OLD }
})

function tailorReq(body: Record<string, unknown>) {
  return new Request('http://t/api/tailor', { method: 'POST', body: JSON.stringify(body) })
}

describe('provider selection on POST /api/tailor', () => {
  it('uses the requested provider', async () => {
    const res = await tailorPost(tailorReq({ baseResumeId: 'a', jdText: 'JD', provider: 'openai' }))
    expect(res.status).toBe(200)
    expect(requested).toEqual(['openai'])
  })

  it('falls back to the configured default when provider is omitted', async () => {
    process.env.GEMINI_API_KEY = 'g-key'
    delete process.env.OPENAI_API_KEY
    delete process.env.AI_PROVIDER
    const res = await tailorPost(tailorReq({ baseResumeId: 'a', jdText: 'JD' }))
    expect(res.status).toBe(200)
    expect(requested).toEqual(['gemini'])
  })

  it('rejects an unknown provider with 400', async () => {
    const res = await tailorPost(tailorReq({ baseResumeId: 'a', jdText: 'JD', provider: 'bogus' }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/invalid provider/)
    expect(requested).toEqual([])
  })

  it('returns 400 when no provider is configured and none is given', async () => {
    delete process.env.GEMINI_API_KEY
    delete process.env.OPENAI_API_KEY
    const res = await tailorPost(tailorReq({ baseResumeId: 'a', jdText: 'JD' }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/GEMINI_API_KEY|OPENAI_API_KEY/)
  })
})

describe('GET /api/providers', () => {
  it('reports configured providers and the default', async () => {
    process.env.GEMINI_API_KEY = 'g-key'
    process.env.OPENAI_API_KEY = 'o-key'
    process.env.AI_PROVIDER = 'openai'
    expect(await (await providersGet()).json()).toEqual({
      configured: ['gemini', 'openai'], default: 'openai',
    })
  })

  it('reports an empty list with a null default when nothing is configured', async () => {
    delete process.env.GEMINI_API_KEY
    delete process.env.OPENAI_API_KEY
    expect(await (await providersGet()).json()).toEqual({ configured: [], default: null })
  })
})
```

- [ ] **Step 9: Run the new test to verify it passes**

Run: `npm run test:run -- tests/app/api/provider-routing.test.ts`
Expected: PASS (6 tests). If the "falls back to default" case fails because the fake context short-circuits `clientFor`, confirm `resolveProviderClient` calls `defaultProvider()` **before** `getContext().clientFor(...)` — the resolution order matters.

- [ ] **Step 10: Run the full suite, typecheck, and a keyless build**

Run: `npm run test:run` — expected: all pass.
Run: `npx tsc --noEmit` — expected: zero errors.
Run: `GEMINI_API_KEY= OPENAI_API_KEY= npm run build` — expected: succeeds (no provider is constructed at build time).

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "feat: per-provider clients and provider selection on AI routes"
```

---

### Task 4: Provider picker in the UI

**Files:**
- Create: `src/components/ProviderPicker.tsx`
- Modify: `src/app/tailor/[id]/page.tsx`, `src/app/build/page.tsx`
- Test: `tests/components/ProviderPicker.test.tsx` (create)

**Interfaces:**
- Consumes: `GET /api/providers` → `{ configured: Provider[], default: Provider | null }`.
- Produces: `<ProviderPicker value={string | null} onChange={(p: string) => void} disabled?={boolean} />` — fetches the configured providers on mount, calls `onChange` with the reported default once loaded, and renders a disabled notice when none are configured.

- [ ] **Step 1: Write the failing component test**

Create `tests/components/ProviderPicker.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { ProviderPicker } from '@/components/ProviderPicker'

function mockProviders(configured: string[], def: string | null) {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ configured, default: def }),
  }) as unknown as typeof fetch
}

beforeEach(() => vi.restoreAllMocks())
afterEach(() => vi.unstubAllGlobals())

describe('ProviderPicker', () => {
  it('lists the configured providers and selects the default', async () => {
    mockProviders(['gemini', 'openai'], 'openai')
    const onChange = vi.fn()
    render(<ProviderPicker value={null} onChange={onChange} />)
    await waitFor(() => expect(onChange).toHaveBeenCalledWith('openai'))
    expect(screen.getByRole('option', { name: /gemini/i })).toBeDefined()
    expect(screen.getByRole('option', { name: /openai/i })).toBeDefined()
  })

  it('emits the provider the user picks', async () => {
    mockProviders(['gemini', 'openai'], 'gemini')
    const onChange = vi.fn()
    render(<ProviderPicker value="gemini" onChange={onChange} />)
    await waitFor(() => expect(screen.getByRole('combobox')).toBeDefined())
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'openai' } })
    expect(onChange).toHaveBeenCalledWith('openai')
  })

  it('shows a notice when no provider is configured', async () => {
    mockProviders([], null)
    render(<ProviderPicker value={null} onChange={() => {}} />)
    await waitFor(() => expect(screen.getByText(/no ai provider configured/i)).toBeDefined())
    expect(screen.queryByRole('combobox')).toBeNull()
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm run test:run -- tests/components/ProviderPicker.test.tsx`
Expected: FAIL — cannot find `@/components/ProviderPicker`.

- [ ] **Step 3: Implement `src/components/ProviderPicker.tsx`**

```tsx
'use client'
import React, { useEffect, useState } from 'react'

const LABELS: Record<string, string> = { gemini: 'Gemini', openai: 'OpenAI' }

export function ProviderPicker(
  { value, onChange, disabled }: {
    value: string | null
    onChange: (provider: string) => void
    disabled?: boolean
  },
) {
  const [configured, setConfigured] = useState<string[] | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/providers')
      .then(r => r.json())
      .then((data: { configured: string[]; default: string | null }) => {
        if (cancelled) return
        setConfigured(data.configured)
        if (data.default) onChange(data.default)
      })
      .catch(() => { if (!cancelled) setConfigured([]) })
    return () => { cancelled = true }
    // Runs once on mount; onChange is intentionally not a dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (configured === null) return <p>Loading providers…</p>
  if (configured.length === 0) {
    return <p style={{ color: 'red' }}>No AI provider configured — set GEMINI_API_KEY or OPENAI_API_KEY.</p>
  }

  return (
    <label style={{ display: 'inline-flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
      AI provider:
      <select
        value={value ?? configured[0]}
        disabled={disabled}
        onChange={e => onChange(e.target.value)}
      >
        {configured.map(p => <option key={p} value={p}>{LABELS[p] ?? p}</option>)}
      </select>
    </label>
  )
}
```

- [ ] **Step 4: Run the component test to verify it passes**

Run: `npm run test:run -- tests/components/ProviderPicker.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Wire the picker into the tailor page**

In `src/app/tailor/[id]/page.tsx`:

Add the import beside the other component imports:

```tsx
import { ProviderPicker } from '@/components/ProviderPicker'
```

Add state next to the existing `useState` calls:

```tsx
const [provider, setProvider] = useState<string | null>(null)
```

In `handleTailor`, include the provider in the request body — change the `body` line to:

```tsx
body: JSON.stringify({ baseResumeId, jdText, provider }),
```

Render the picker immediately above `<JdInput ... />` inside the `{!finalResume && (` block:

```tsx
<ProviderPicker value={provider} onChange={setProvider} disabled={loading} />
```

- [ ] **Step 6: Wire the picker into the builder page**

In `src/app/build/page.tsx`:

Add the import:

```tsx
import { ProviderPicker } from '@/components/ProviderPicker'
```

Add state next to the existing `useState` calls:

```tsx
const [provider, setProvider] = useState<string | null>(null)
```

In `sendMessage`, change the `body` line to:

```tsx
body: JSON.stringify({ history: nextHistory, draft, provider }),
```

Render the picker immediately above the `<textarea>`:

```tsx
<ProviderPicker value={provider} onChange={setProvider} disabled={loading} />
```

Leave `saveAsBaseResume` untouched — it posts `kind: 'resume'`, the non-AI path, which takes no provider.

- [ ] **Step 7: Run the full suite, typecheck, and a keyless build**

Run: `npm run test:run` — expected: all pass.
Run: `npx tsc --noEmit` — expected: zero errors.
Run: `GEMINI_API_KEY= OPENAI_API_KEY= npm run build` — expected: succeeds.

- [ ] **Step 8: Manual smoke test**

With both keys set in `.env`:

```bash
npm run dev
```

Verify: the tailor page shows an "AI provider" dropdown listing Gemini and OpenAI; tailoring with each selected returns a result; the builder page shows the same picker and responds with each provider selected.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: add provider picker to tailor and builder pages"
```

---

## Self-Review

**Spec coverage:**
- Provider-aware env (`getProviderEnv`, `configuredProviders`, `defaultProvider`, `MissingKeyError`) → Task 1. ✓
- OpenAI transport via Responses API + `createTransport` dispatch → Task 1. ✓
- OpenAI default model `gpt-5.6-terra`, Gemini `gemini-2.5-flash` → Task 1 (verified ids in Global Constraints). ✓
- `GeminiClient` → `StructuredClient` rename → Task 2. ✓
- `clientFor(provider)` with per-provider caching → Task 3. ✓
- `provider` field on `/api/tailor`, `/api/builder/message`, `/api/resumes` (AI path only) → Task 3. ✓
- `GET /api/providers` with `default: null` when unconfigured → Task 3. ✓
- Error mapping: missing key → 400 naming the var; invalid provider → 400; `AiValidationError` → 502 unchanged → Task 3 (`resolveProviderClient` + route handlers). ✓
- `ProviderPicker` on tailor + builder pages, only listing configured providers → Task 4. ✓
- Prompt guard test for OpenAI's "json" requirement → Task 1 Step 10. ✓
- `.env.example` documents all five vars → Task 1 Step 11. ✓
- All 28 existing tests stay green; test-injection shape updated → Task 3 Step 7. ✓
- Keyless build still passes → verified in Tasks 3 and 4. ✓

**Placeholder scan:** No TBD/TODO. Every code step carries real code. Task 3 Step 6 describes an edit to a branch inside an existing file rather than quoting the whole file — the branch, the exact import, the exact inserted lines, and the explicit "leave the `kind: 'resume'` branch alone" instruction are all stated.

**Type consistency:** `Provider` / `ProviderSchema` / `MissingKeyError` (Task 1) are consumed under those exact names in Tasks 3 and 4. `StructuredClient` (Task 2) is the type used in `AppContext.clientFor` and `ProviderResolution` (Task 3). `clientFor(provider: Provider): StructuredClient` is defined in Task 3 Step 1 and used identically in Steps 2, 7, 8. `resolveProviderClient`'s discriminated union (`ok: true` with `provider`/`client`, `ok: false` with `error`) is consumed consistently across all three routes. `ProviderPicker`'s props (`value: string | null`, `onChange: (p: string) => void`, `disabled?: boolean`) match its usage on both pages. ✓

**Known deviation to watch:** `res.output_text` on the OpenAI Responses API is documented but SDK-version-dependent; Task 1 Step 8 tells the implementer to check the installed types and use the documented aggregated-text accessor rather than silently switching APIs.
