import { SqliteResumeStore } from '@/lib/store/sqlite-store'
import { StructuredClient } from '@/lib/ai/structured-client'
import { createTransport } from '@/lib/ai/transport'
import type { ResumeStore } from '@/lib/store/resume-store'
import { SqliteApplicationStore } from '@/lib/store/sqlite-application-store'
import type { ApplicationStore } from '@/lib/store/application-store'
import type { Provider } from '@/lib/env'
import { SqliteProfileStore } from '@/lib/store/sqlite-profile-store'
import type { ProfileStore } from '@/lib/store/profile-store'

export interface AppContext {
  store: ResumeStore
  applications: ApplicationStore
  profiles: ProfileStore
  clientFor(provider: Provider): StructuredClient
}

type TestAppContext = Omit<AppContext, 'applications' | 'profiles'> & { applications?: ApplicationStore; profiles?: ProfileStore }

let override: TestAppContext | null = null
let realStore: ResumeStore | null = null
let realApplications: ApplicationStore | null = null
let realProfiles: ProfileStore | null = null
const realClients = new Map<Provider, StructuredClient>()

export function setContextForTest(ctx: TestAppContext | null) { override = ctx }

export function getContext(): AppContext {
  if (override) {
    return {
      ...override,
      // Existing tests exercising resume-only routes do not need a persistent
      // application store. Application-route tests inject their own instance.
      applications: override.applications ?? new SqliteApplicationStore(':memory:'),
      profiles: override.profiles ?? new SqliteProfileStore(':memory:'),
    }
  }
  if (!realStore) realStore = new SqliteResumeStore(process.env.DB_PATH ?? 'data/resumes.db')
  if (!realApplications) realApplications = new SqliteApplicationStore(process.env.DB_PATH ?? 'data/resumes.db')
  if (!realProfiles) realProfiles = new SqliteProfileStore(process.env.DB_PATH ?? 'data/resumes.db')
  const store = realStore
  const applications = realApplications
  const profiles = realProfiles
  return {
    store,
    applications,
    profiles,
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
