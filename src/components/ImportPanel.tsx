'use client'
import React from 'react'
import { useRouter } from 'next/navigation'
import { ResumeImport } from './ResumeImport'

/** Client wrapper so the server-rendered library refreshes after an import. */
export function ImportPanel() {
  const router = useRouter()
  return <ResumeImport onImported={() => router.refresh()} />
}
