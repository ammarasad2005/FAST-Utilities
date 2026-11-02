'use client'

import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, CheckCircle2, FileUp, Loader2, RefreshCw, ShieldCheck } from 'lucide-react'
import { parseSeatingPdf, type ParsedPdfFile } from '@/lib/seating-plan/parse-pdf'

type ActivePlan = {
  dateISO: string
  term: string | null
  assignmentCount: number
  pageCount: number
  importedAt?: string
} | null

const panelClass = 'rounded-2xl border p-5 md:p-6'
const mutedStyle = { color: 'var(--color-text-secondary)' } as const

export function SeatingPlanImporter() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [parsedFile, setParsedFile] = useState<ParsedPdfFile | null>(null)
  const [activePlan, setActivePlan] = useState<ActivePlan>(null)
  const [reading, setReading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [loadingStatus, setLoadingStatus] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const previewRows = useMemo(() => {
    const rows = parsedFile?.plan.assignments ?? []
    if (rows.length <= 10) return rows
    // Spot-check assignments throughout the document, not just the first page.
    return Array.from({ length: 10 }, (_, index) => rows[Math.round(index * (rows.length - 1) / 9)])
  }, [parsedFile])

  const refreshStatus = async () => {
    setLoadingStatus(true)
    try {
      const response = await fetch('/api/admin/seating-plan', { cache: 'no-store' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Could not read the active plan.')
      setActivePlan(data.activePlan ?? null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not read the active plan.')
    } finally {
      setLoadingStatus(false)
    }
  }

  useEffect(() => {
    void refreshStatus()
  }, [])

  const handleFile = async (file: File | null) => {
    setSelectedFile(file)
    setParsedFile(null)
    setError('')
    setNotice('')
    if (!file) return

    setReading(true)
    try {
      const result = await parseSeatingPdf(file)
      setParsedFile(result)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not parse this PDF.')
    } finally {
      setReading(false)
    }
  }

  const handleImport = async () => {
    if (!parsedFile || !selectedFile) return
    setImporting(true)
    setError('')
    setNotice('')
    try {
      const response = await fetch('/api/admin/seating-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'manual-import',
          plan: {
            dateISO: parsedFile.plan.dates[0],
            term: parsedFile.plan.term,
            pageCount: parsedFile.plan.pageCount,
            assignmentCount: parsedFile.plan.assignmentCount,
            sourceSha256: parsedFile.sha256,
            assignments: parsedFile.plan.assignments,
          },
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Import failed; the existing plan was kept.')
      setActivePlan({
        dateISO: data.dateISO,
        term: data.term ?? parsedFile.plan.term,
        assignmentCount: data.assignmentCount,
        pageCount: data.pageCount,
      })
      setNotice(`Imported ${data.assignmentCount.toLocaleString()} assignments for ${data.dateISO}.`)
      setParsedFile(null)
      setSelectedFile(null)
      const input = document.getElementById('seating-plan-pdf') as HTMLInputElement | null
      if (input) input.value = ''
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Import failed; the existing plan was kept.')
    } finally {
      setImporting(false)
    }
  }

  return (
    <section className="max-w-4xl space-y-5">
      <div className={`${panelClass} space-y-4`} style={{ borderColor: 'var(--color-border)', backgroundColor: 'rgba(255,255,255,0.01)' }}>
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-orange-500/10 p-2.5 text-orange-500"><FileUp size={20} /></div>
          <div>
            <h2 className="text-base font-extrabold uppercase tracking-wider">Manual Seating Plan Import</h2>
            <p className="mt-1 text-sm" style={mutedStyle}>Upload one day’s PDF. The printed date is used; a valid import replaces the currently active day.</p>
          </div>
        </div>

        <div className="rounded-xl border p-4" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-subtle)' }}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide">
              <ShieldCheck size={15} className="text-emerald-500" /> Current active plan
            </div>
            <button onClick={() => void refreshStatus()} disabled={loadingStatus} className="rounded-lg p-2 hover:bg-black/5" aria-label="Refresh active plan">
              <RefreshCw size={14} className={loadingStatus ? 'animate-spin' : ''} />
            </button>
          </div>
          <p className="mt-2 text-sm" style={mutedStyle}>
            {loadingStatus ? 'Checking…' : activePlan
              ? `${activePlan.dateISO} · ${activePlan.term ?? 'Term not specified'} · ${activePlan.assignmentCount.toLocaleString()} assignments`
              : 'No active seating plan is currently stored.'}
          </p>
        </div>

        <label htmlFor="seating-plan-pdf" className="block text-[10px] font-black uppercase tracking-[0.1em]" style={mutedStyle}>Choose seating-plan PDF</label>
        <input
          id="seating-plan-pdf"
          type="file"
          accept="application/pdf,.pdf"
          disabled={reading || importing}
          onChange={(event) => void handleFile(event.target.files?.[0] ?? null)}
          className="block w-full rounded-xl border p-3 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-orange-600 file:px-4 file:py-2 file:text-xs file:font-bold file:text-white"
          style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-subtle)' }}
        />
        {selectedFile && <p className="text-xs" style={mutedStyle}>{selectedFile.name} · {(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>}

        {reading && <div className="flex items-center gap-2 text-sm text-orange-500"><Loader2 size={16} className="animate-spin" />Reading and validating PDF locally…</div>}

        {parsedFile && (
          <div className="space-y-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
            <div className="flex items-start gap-2 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 size={17} className="mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-bold">PDF parsed successfully</p>
                <p className="mt-1 text-xs">Printed date: <strong>{parsedFile.plan.dates[0]}</strong> · {parsedFile.plan.term ?? 'Term not found'} · {parsedFile.plan.pageCount} pages · {parsedFile.plan.assignmentCount.toLocaleString()} assignments</p>
              </div>
            </div>
            <div className="overflow-x-auto rounded-lg border" style={{ borderColor: 'var(--color-border)' }}>
              <table className="w-full min-w-[560px] text-left text-xs">
                <thead className="uppercase tracking-wider" style={{ backgroundColor: 'var(--color-bg-subtle)', color: 'var(--color-text-secondary)' }}>
                  <tr><th className="p-2.5">Roll</th><th className="p-2.5">Course / Section</th><th className="p-2.5">Room</th><th className="p-2.5">Seat</th></tr>
                </thead>
                <tbody>
                  {previewRows.map((row, index) => (
                    <tr key={`${row.rollNumber}-${row.courseCode}-${index}`} className="border-t" style={{ borderColor: 'var(--color-border)' }}>
                      <td className="p-2.5 font-mono">{row.rollNumber}</td>
                      <td className="p-2.5">{row.courseCode} · {row.sectionCode}</td>
                      <td className="p-2.5">{row.venue}</td>
                      <td className="p-2.5">{row.seat}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {parsedFile.plan.assignmentCount > previewRows.length && <p className="px-3 py-2 text-[11px]" style={mutedStyle}>Showing {previewRows.length} assignments sampled across the parsed document as a spot check.</p>}
            </div>
            <p className="text-[11px] leading-relaxed" style={mutedStyle}>
              The PDF is parsed in this browser and is not uploaded or retained. Only structured assignment fields (including roll numbers) are sent to the authenticated import endpoint. Student names are not included in the parsed data. Confirm the preview before importing.
            </p>
            {activePlan && activePlan.dateISO !== parsedFile.plan.dates[0] && (
              <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs font-semibold text-amber-700 dark:text-amber-300">
                This will replace the currently active {activePlan.dateISO} plan with the plan dated {parsedFile.plan.dates[0]}.
              </p>
            )}
            <button
              onClick={() => void handleImport()}
              disabled={importing || reading}
              className="rounded-xl bg-orange-600 px-5 py-3 text-xs font-black uppercase tracking-wider text-white transition hover:bg-orange-500 disabled:opacity-50"
            >
              {importing ? <span className="inline-flex items-center gap-2"><Loader2 size={14} className="animate-spin" />Validating and importing…</span> : 'Confirm Import & Replace Active Day'}
            </button>
          </div>
        )}

        {error && <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-sm text-red-500"><AlertCircle size={16} className="mt-0.5 shrink-0" /><span>{error}</span></div>}
        {notice && <div role="status" className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-sm text-emerald-600 dark:text-emerald-400"><CheckCircle2 size={16} />{notice}</div>}
      </div>
    </section>
  )
}
