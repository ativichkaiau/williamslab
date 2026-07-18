// Client-side PDF → text. pdfjs is heavy (~300 KB), so it is dynamically
// imported here — the chunk only loads when a user actually drops a PDF, and
// stays out of the main bundle.

export interface PdfExtract {
  text: string
  pages: number
  chars: number
}

export async function extractPdfText(file: File, onProgress?: (page: number, total: number) => void): Promise<PdfExtract> {
  const pdfjs = await import('pdfjs-dist')
  // resolve the worker as a URL Vite can serve (module worker)
  const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

  const data = new Uint8Array(await file.arrayBuffer())
  const doc = await pdfjs.getDocument({ data }).promise
  const pages = doc.numPages
  const parts: string[] = []
  for (let i = 1; i <= pages; i++) {
    onProgress?.(i, pages)
    const page = await doc.getPage(i)
    const content = await page.getTextContent()
    // join text items on a page; pdfjs marks line breaks with hasEOL
    let line = ''
    const lines: string[] = []
    for (const item of content.items) {
      if ('str' in item) {
        line += item.str
        if (item.hasEOL) {
          lines.push(line)
          line = ''
        } else {
          line += ' '
        }
      }
    }
    if (line.trim()) lines.push(line)
    parts.push(lines.join('\n'))
  }
  await doc.destroy()
  const text = parts.join('\n\n').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
  return { text, pages, chars: text.length }
}
