import mammoth from 'mammoth'

export async function extractText(
  file: { buffer: Buffer; kind: 'pdf' | 'docx' | 'text' },
): Promise<string> {
  let text: string
  if (file.kind === 'text') text = file.buffer.toString('utf-8')
  else if (file.kind === 'pdf') {
    // Lazy dynamic import so pdf-parse/pdfjs is not evaluated at server-bundle load time.
    const pdfParse = (await import('pdf-parse')).default
    text = (await pdfParse(file.buffer)).text
  }
  else text = (await mammoth.extractRawText({ buffer: file.buffer })).value
  if (!text.trim()) throw new Error('empty extraction')
  return text.trim()
}
