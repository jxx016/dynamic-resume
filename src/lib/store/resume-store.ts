import type { Resume } from '@/lib/schema/resume'

export interface ResumeStore {
  list(): Resume[]
  get(id: string): Resume | null
  create(r: Resume): Resume
  update(id: string, r: Resume): Resume
}
