'use client'

import { extractSeatingPageLines, type PdfTextItemLike } from './pdf-text'
import { parseSeatingPlanPages, type ParsedSeatingPlan } from './plan'

export interface ParsedPdfFile {
  plan: ParsedSeatingPlan
  sha256: string
  byteLength: number
}

/** Extract text in the browser only. The PDF bytes are never uploaded or saved. */
export async function parseSeatingPdf(file: File): Promise<ParsedPdfFile> {
  if (!/\.pdf$/i.test(file.name) || file.type && file.type !== 'application/pdf') {
    throw new Error('Choose a PDF seating-plan file.')
  }
  if (file.size < 1000 || file.size > 9 * 1024 * 1024) {
    throw new Error('PDF size must be between 1 KB and 9 MB.')
  }

  const bytes = new Uint8Array(await file.arrayBuffer())
  if (new TextDecoder().decode(bytes.slice(0, 5)) !== '%PDF-') {
    throw new Error('The selected file does not have a valid PDF signature.')
  }

  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
  // Keep the worker as a public static asset: webpack otherwise treats the
  // package's .mjs worker as a classic script during production minification.
  pdfjs.GlobalWorkerOptions.workerSrc = '/vendor/pdf.worker.min.mjs'

  const loadingTask = pdfjs.getDocument({ data: bytes, isEvalSupported: false })
  try {
    const document = await loadingTask.promise
    if (document.numPages < 1 || document.numPages > 1000) {
      throw new Error('PDF page count is outside the accepted range.')
    }

    const pageTexts: string[] = []
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber++) {
      const page = await document.getPage(pageNumber)
      const content = await page.getTextContent()
      const items = content.items.filter((item): item is typeof item & PdfTextItemLike =>
        'str' in item && 'transform' in item,
      )
      const pageWidth = page.getViewport({ scale: 1 }).width
      pageTexts.push(extractSeatingPageLines(items, pageWidth).join('\n'))
    }

    // No email timestamp is passed: parseSeatingPlanPages requires the date
    // printed on every plan page and rejects mixed/missing dates.
    const plan = parseSeatingPlanPages(pageTexts)
    const digest = await crypto.subtle.digest('SHA-256', bytes)
    const sha256 = [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, '0')).join('')
    return { plan, sha256, byteLength: bytes.byteLength }
  } finally {
    await loadingTask.destroy()
  }
}
