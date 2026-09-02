import { describe, expect, it } from 'vitest'
import { isReadyToDownload, READY_TO_DOWNLOAD_THRESHOLD } from '@/lib/ats-readiness'

describe('isReadyToDownload', () => {
  it('is true at the threshold and above', () => {
    expect(isReadyToDownload(READY_TO_DOWNLOAD_THRESHOLD)).toBe(true)
    expect(isReadyToDownload(90)).toBe(true)
  })

  it('is false below the threshold', () => {
    expect(isReadyToDownload(69)).toBe(false)
  })
})
