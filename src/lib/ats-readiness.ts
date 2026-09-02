export const READY_TO_DOWNLOAD_THRESHOLD = 70

export function isReadyToDownload(score: number): boolean {
  return score >= READY_TO_DOWNLOAD_THRESHOLD
}
