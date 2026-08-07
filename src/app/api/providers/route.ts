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
