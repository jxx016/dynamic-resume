import { NextResponse } from 'next/server'
import { getContext } from '@/lib/app-context'
import { ProfileSchema } from '@/lib/schema/profile'
export async function GET() { return NextResponse.json(getContext().profiles.get()) }
export async function PUT(req: Request) { const parsed = ProfileSchema.safeParse(await req.json()); return parsed.success ? NextResponse.json(getContext().profiles.replace(parsed.data)) : NextResponse.json({ error: 'invalid profile' }, { status: 400 }) }
