import type { Application } from '@/lib/schema/application'

export interface ApplicationStore {
  list(): Application[]
  get(id: string): Application | null
  create(application: Application): Application
  update(id: string, application: Application): Application
}
