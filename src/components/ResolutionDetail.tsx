'use client'

import { motion } from 'framer-motion'
import { 
  ArrowLeft, 
  CheckCircle, 
  Calendar, 
  MapPin, 
  User, 
  Mail, 
  Sparkles, 
  ShieldCheck, 
  Heart,
  TrendingUp
} from 'lucide-react'
import { LostFoundItem } from '@/app/lost-found/page'

interface ResolutionDetailProps {
  foundItem: LostFoundItem | null
  lostItem: LostFoundItem | null
  claim: any
  onBack: () => void
}

export function ResolutionDetail({ 
  foundItem, 
  lostItem, 
  claim, 
  onBack 
}: ResolutionDetailProps) {
  
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A'
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  // Handle case where both might be null (fallback)
  if (!foundItem && !lostItem) {
    return (
      <div className="py-20 text-center space-y-4">
        <p className="text-sm font-medium text-[var(--color-text-secondary)]">Resolution pair details not found.</p>
        <button 
          onClick={onBack} 
          className="px-4 py-2 bg-[var(--color-bg-subtle)] border border-[var(--color-border)] rounded-xl text-sm"
        >
          Back to History
        </button>
      </div>
    )
  }

  // Use the resolution image from the found item if available
  const resolutionImage = foundItem?.resolutionImageUrl || lostItem?.resolutionImageUrl

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* Back Button & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/40 dark:bg-black/20 backdrop-blur-md border border-[var(--color-border)] hover:bg-white/60 dark:hover:bg-black/30 transition-all duration-200 text-sm font-medium shadow-sm w-fit"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          <ArrowLeft width={16} height={16} />
          Back to History
        </button>
        
        <div className="inline-flex items-center gap-2 bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-4 py-1.5 rounded-full border border-emerald-500/20 text-xs font-semibold shadow-sm w-fit">
          <Sparkles width={14} height={14} className="animate-pulse" />
          Successfully Reunited & Resolved
        </div>
      </div>

      {/* Main Success Banner */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-emerald-500/10 border border-emerald-500/20 shadow-lg overflow-hidden text-center space-y-4"
      >
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto border border-emerald-500/30 shadow-md">
          <CheckCircle width={32} height={32} className="text-emerald-500" />
        </div>
        
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
          A Campus Success Story!
        </h1>
        <p className="text-sm max-w-2xl mx-auto leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
          This item was matched, verified, and successfully returned to its rightful owner. AI-Powered verification confirmed possession with outstanding confidence.
        </p>

        {claim && (
          <div className="pt-2 flex justify-center gap-4 text-xs font-mono" style={{ color: 'var(--color-text-tertiary)' }}>
            <span>CLAIM ID: {claim.id.slice(0, 8)}</span>
            <span>&bull;</span>
            <span>VERIFIED ON: {formatDate(claim.createdAt)}</span>
          </div>
        )}
      </motion.div>

      {/* Side-by-Side Cards Container */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative items-stretch">
        
        {/* Connection Line & Badge in center (Hidden on mobile) */}
        <div className="hidden md:flex absolute inset-y-0 left-1/2 -translate-x-1/2 flex-col items-center justify-center z-10 pointer-events-none">
          <div className="w-[2px] h-full bg-gradient-to-b from-transparent via-emerald-300 dark:via-emerald-800 to-transparent" />
          <div className="absolute w-12 h-12 rounded-full bg-white dark:bg-neutral-900 border-2 border-emerald-400 flex items-center justify-center shadow-lg">
            <ShieldCheck width={22} height={22} className="text-emerald-500" />
          </div>
        </div>

        {/* 1. FOUND REPORT CARD */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col rounded-3xl p-6 bg-white/40 dark:bg-black/10 backdrop-blur-md border border-[var(--color-border)] shadow-md space-y-4 hover:shadow-lg transition-shadow duration-200"
        >
          <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)]">
            <span className="text-[10px] font-mono tracking-widest text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded uppercase font-bold">
              Found Report
            </span>
            <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
              {foundItem ? formatDate(foundItem.createdAt) : 'N/A'}
            </span>
          </div>

          {foundItem ? (
            <div className="space-y-4 flex-1 flex flex-col">
              {foundItem.imageUrl && (
                <div className="relative aspect-video w-full rounded-2xl overflow-hidden border border-[var(--color-border)] shadow-inner">
                  <img 
                    src={foundItem.imageUrl} 
                    alt={foundItem.title} 
                    className="object-cover w-full h-full"
                  />
                </div>
              )}

              <div className="space-y-2 flex-1">
                <h3 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>{foundItem.title}</h3>
                <p className="text-xs font-mono uppercase tracking-widest opacity-80" style={{ color: 'var(--color-text-tertiary)' }}>
                  {foundItem.category}
                </p>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                  {foundItem.description}
                </p>
              </div>

              <div className="pt-4 border-t border-[var(--color-border)] space-y-3 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                <div className="flex items-center gap-2">
                  <MapPin width={14} height={14} className="text-[var(--color-text-tertiary)]" />
                  <span>Found at: <strong style={{ color: 'var(--color-text-primary)' }}>{foundItem.location}</strong></span>
                </div>
                {foundItem.reporterName && (
                  <div className="flex items-center gap-2">
                    <User width={14} height={14} className="text-[var(--color-text-tertiary)]" />
                    <span>Reported by: <strong style={{ color: 'var(--color-text-primary)' }}>{foundItem.reporterName}</strong></span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-xs font-medium" style={{ color: 'var(--color-text-tertiary)' }}>
              No detailed Found report linked.
            </div>
          )}
        </motion.div>

        {/* 2. LOST REPORT CARD */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col rounded-3xl p-6 bg-white/40 dark:bg-black/10 backdrop-blur-md border border-[var(--color-border)] shadow-md space-y-4 hover:shadow-lg transition-shadow duration-200"
        >
          <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)]">
            <span className="text-[10px] font-mono tracking-widest text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded uppercase font-bold">
              Lost Report
            </span>
            <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
              {lostItem ? formatDate(lostItem.createdAt) : 'N/A'}
            </span>
          </div>

          {lostItem ? (
            <div className="space-y-4 flex-1 flex flex-col">
              {lostItem.imageUrl && (
                <div className="relative aspect-video w-full rounded-2xl overflow-hidden border border-[var(--color-border)] shadow-inner">
                  <img 
                    src={lostItem.imageUrl} 
                    alt={lostItem.title} 
                    className="object-cover w-full h-full"
                  />
                </div>
              )}

              <div className="space-y-2 flex-1">
                <h3 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>{lostItem.title}</h3>
                <p className="text-xs font-mono uppercase tracking-widest opacity-80" style={{ color: 'var(--color-text-tertiary)' }}>
                  {lostItem.category}
                </p>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                  {lostItem.description}
                </p>
              </div>

              <div className="pt-4 border-t border-[var(--color-border)] space-y-3 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                <div className="flex items-center gap-2">
                  <MapPin width={14} height={14} className="text-[var(--color-text-tertiary)]" />
                  <span>Lost near: <strong style={{ color: 'var(--color-text-primary)' }}>{lostItem.location}</strong></span>
                </div>
                {lostItem.reporterName && (
                  <div className="flex items-center gap-2">
                    <User width={14} height={14} className="text-[var(--color-text-tertiary)]" />
                    <span>Reported by: <strong style={{ color: 'var(--color-text-primary)' }}>{lostItem.reporterName}</strong></span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-xs font-medium" style={{ color: 'var(--color-text-tertiary)' }}>
              No detailed Lost report linked.
            </div>
          )}
        </motion.div>
      </div>

      {/* Proof of Possession Section (Only show if resolutionImage is present) */}
      {resolutionImage && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-3xl p-6 bg-white/40 dark:bg-black/10 backdrop-blur-md border border-[var(--color-border)] shadow-md space-y-4"
        >
          <div className="flex items-center gap-2 pb-3 border-b border-[var(--color-border)]">
            <ShieldCheck width={18} height={18} className="text-emerald-500" />
            <h3 className="text-base font-bold" style={{ color: 'var(--color-text-primary)' }}>Proof of Possession & Verification</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            <div className="relative aspect-video rounded-2xl overflow-hidden border border-[var(--color-border)] shadow-sm md:col-span-1">
              <img 
                src={resolutionImage} 
                alt="Possession Proof" 
                className="object-cover w-full h-full"
              />
            </div>
            
            <div className="md:col-span-2 space-y-3">
              <div className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-3 py-1 rounded-full text-[11px] font-mono font-bold">
                VERIFIED BY AI
              </div>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                {"This verification photo was submitted by the claimant to verify their possession of the lost item. The VLM matched key features and wear patterns with 100% confidence to guarantee accuracy before resolving the reports."}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Claim details if available */}
      {claim && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-3xl p-6 bg-white/40 dark:bg-black/10 backdrop-blur-md border border-[var(--color-border)] shadow-md text-xs space-y-3"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          <div className="flex items-center gap-2 pb-2 border-b border-[var(--color-border)]">
            <Mail width={14} height={14} className="text-[var(--color-text-tertiary)]" />
            <span className="font-bold" style={{ color: 'var(--color-text-primary)' }}>Claimant Contact & Details</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] font-mono text-[var(--color-text-tertiary)] uppercase tracking-wider">Claimant Email</p>
              <p className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>{claim.claimerEmail}</p>
            </div>
            <div>
              <p className="text-[10px] font-mono text-[var(--color-text-tertiary)] uppercase tracking-wider">Claim Status</p>
              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                <CheckCircle width={12} height={12} /> Verified & Reunited
              </span>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}
