import type { Profile } from '@/lib/schema/profile'
export interface ProfileStore { get(): Profile; replace(profile: Profile): Profile }
