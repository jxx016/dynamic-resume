import { NextResponse } from 'next/server'
import { getContext } from '@/lib/app-context'
import { rebuildProfileFromResumes } from '@/lib/profile/profile-service'

export async function POST() {
  const { store, profiles } = getContext()
  const rebuilt = rebuildProfileFromResumes(store.list())
  return NextResponse.json(profiles.replace(rebuilt))
}
