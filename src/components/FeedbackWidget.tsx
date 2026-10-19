'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  MessageSquare, 
  X, 
  Send, 
  CheckCircle2, 
  Loader2,
  Bug,
  Lightbulb,
  Star,
  HelpCircle
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

type Category = 'bug_report' | 'suggestion' | 'review' | 'inquiry'

export function FeedbackWidget() {
  const { toast } = useToast()
  const [isOpen, setIsOpen] = useState(false)
  const [rating, setRating] = useState<number | null>(null)
  const [category, setCategory] = useState<Category>('suggestion')
  const [email, setEmail] = useState('')
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  const emojis = [
    { emoji: '😠', label: 'Angry', value: 1 },
    { emoji: '🙁', label: 'Sad', value: 2 },
    { emoji: '😐', label: 'Neutral', value: 3 },
    { emoji: '🙂', label: 'Happy', value: 4 },
    { emoji: '😄', label: 'Excellent', value: 5 }
  ]

  const categories = [
    { value: 'suggestion', label: '💡 Suggestion', desc: 'Feature requests & ideas' },
    { value: 'bug_report', label: '🐛 Bug Report', desc: 'Inconveniences & visual errors' },
    { value: 'review', label: '⭐ General Review', desc: 'Overall platform feedback' },
    { value: 'inquiry', label: '❓ Inquiry', desc: 'General queries & questions' }
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!rating) {
      toast({
        title: 'Rating Required',
        description: 'Please select an emoji rating before submitting.',
        variant: 'destructive'
      })
      return
    }

    if (!content.trim()) {
      toast({
        title: 'Message Required',
        description: 'Please enter your feedback comments.',
        variant: 'destructive'
      })
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, category, rating, content })
      })

      if (res.ok) {
        setSuccess(true)
        // Reset state after success animation
        setTimeout(() => {
          setIsOpen(false)
          // Wait for exit transition to complete before resetting states
          setTimeout(() => {
            setRating(null)
            setCategory('suggestion')
            setEmail('')
            setContent('')
            setSuccess(false)
          }, 300)
        }, 2200)
      } else {
        const data = await res.json()
        throw new Error(data.error || 'Failed to submit.')
      }
    } catch (err: any) {
      console.error(err)
      toast({
        title: 'Submission Failed',
        description: err.message || 'Server error. Please try again later.',
        variant: 'destructive'
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      {/* 1. SIDE-PINNED VERTICAL TAB TRIGGER */}
      <div className="fixed right-0 top-1/2 -translate-y-1/2 z-50 pointer-events-none">
        <button
          onClick={() => setIsOpen(true)}
          className="pointer-events-auto flex items-center gap-2 bg-gradient-to-l from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white font-extrabold text-[10px] uppercase tracking-widest py-4 px-2.5 rounded-l-2xl shadow-2xl border-l border-y border-orange-500/20 active:scale-95 transition-all duration-200"
          style={{ 
            boxShadow: '-4px 0 14px rgba(234, 88, 12, 0.3)',
            writingMode: 'vertical-rl',
            textOrientation: 'mixed'
          }}
        >
          <div className="flex items-center gap-1.5" style={{ writingMode: 'vertical-rl' }}>
            <MessageSquare width={13} height={13} className="mb-2 animate-bounce" style={{ transform: 'rotate(90deg)' }} />
            <span>Give Feedback</span>
          </div>
        </button>
      </div>

      {/* 2. BACKDROP OVERLAY */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            exit={{ opacity: 0 }}
            onClick={() => { if (!submitting) setIsOpen(false) }}
            className="fixed inset-0 bg-black z-50 backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      {/* 3. SLIDE-OUT FULL-HEIGHT PANEL */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="fixed inset-y-0 right-0 w-full sm:max-w-md bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl border-l border-neutral-200 dark:border-neutral-800 z-[60] shadow-2xl flex flex-col overflow-hidden text-neutral-900 dark:text-neutral-100"
          >
            {/* Header */}
            <div className="p-6 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-white/40 dark:bg-black/20">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center border border-orange-500/20 text-orange-500">
                  <MessageSquare width={16} height={16} />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm uppercase tracking-tight">Review & Suggestion</h3>
                  <p className="text-[10px] text-neutral-500 dark:text-neutral-400 font-medium uppercase tracking-wider mt-0.5">Help us build a better platform</p>
                </div>
              </div>
              <button
                disabled={submitting}
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors flex items-center justify-center text-neutral-500 dark:text-neutral-400 active:scale-95"
              >
                <X width={16} height={16} />
              </button>
            </div>

            {/* Inner Content Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <AnimatePresence mode="wait">
                {success ? (
                  /* SUCCESS STATE */
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="h-full flex flex-col items-center justify-center text-center space-y-4 px-4 py-12"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.1, type: 'spring', stiffness: 200, damping: 10 }}
                      className="w-16 h-16 rounded-full bg-green-500/10 dark:bg-green-500/20 flex items-center justify-center border border-green-500/30 text-green-500 shadow-lg shadow-green-500/10"
                    >
                      <CheckCircle2 width={32} height={32} />
                    </motion.div>
                    <h4 className="text-lg font-black uppercase tracking-tight text-green-600 dark:text-green-400">Feedback Submitted!</h4>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed max-w-xs mx-auto font-medium">
                      Thank you for making our campus platform better! Your suggestions have been recorded and synced with our development portal.
                    </p>
                  </motion.div>
                ) : (
                  /* FORM STATE */
                  <motion.form
                    key="form"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onSubmit={handleSubmit}
                    className="space-y-6 flex flex-col h-full"
                  >
                    {/* Emoji Reaction Rating */}
                    <div className="space-y-3">
                      <label className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                        How is your platform experience? *
                      </label>
                      <div className="flex items-center justify-between bg-neutral-100/50 dark:bg-neutral-800/30 border border-neutral-200 dark:border-neutral-800/60 p-3 rounded-2xl">
                        {emojis.map((item) => (
                          <button
                            type="button"
                            key={item.value}
                            onClick={() => setRating(item.value)}
                            className="flex flex-col items-center gap-1 group focus:outline-none"
                          >
                            <motion.span
                              whileHover={{ scale: 1.25, y: -2 }}
                              whileTap={{ scale: 0.9 }}
                              className={`text-2xl transition-opacity duration-200 ${
                                rating !== null && rating !== item.value ? 'opacity-40 scale-95' : 'opacity-100 scale-100'
                              } ${rating === item.value ? 'filter drop-shadow-md drop-shadow-orange-500/20' : ''}`}
                            >
                              {item.emoji}
                            </motion.span>
                            <span 
                              className={`text-[9px] font-bold uppercase tracking-tighter transition-colors duration-200 ${
                                rating === item.value 
                                  ? 'text-orange-500' 
                                  : 'text-neutral-400 dark:text-neutral-500 group-hover:text-neutral-600 dark:group-hover:text-neutral-300'
                              }`}
                            >
                              {item.label}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Category Selector */}
                    <div className="space-y-3">
                      <label className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                        Feedback Category *
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {categories.map((cat) => (
                          <button
                            type="button"
                            key={cat.value}
                            onClick={() => setCategory(cat.value as Category)}
                            className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all ${
                              category === cat.value
                                ? 'bg-orange-500/10 border-orange-500 text-orange-600 dark:text-orange-400 shadow-sm'
                                : 'border-neutral-200 dark:border-neutral-800 bg-white/30 dark:bg-black/5 hover:bg-neutral-100/40 dark:hover:bg-neutral-800/30'
                            }`}
                          >
                            <span className="text-xs font-bold">{cat.label}</span>
                            <span className="text-[8px] text-neutral-500 dark:text-neutral-400 mt-1 leading-normal font-medium">{cat.desc}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Optional Email Address */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                        Email Address (Optional)
                      </label>
                      <input
                        type="text"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="e.g. john@gmail.com or i210432@isb.nu.edu.pk"
                        className="w-full px-4 py-3 text-xs rounded-xl bg-white/40 dark:bg-black/10 border border-neutral-200 dark:border-neutral-800 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
                      />
                      <p className="text-[8px] text-neutral-400 dark:text-neutral-500 leading-normal font-medium uppercase tracking-wider">
                        Provide your email only if you would like us to reach out regarding feature updates.
                      </p>
                    </div>

                    {/* Suggestion Textbox */}
                    <div className="space-y-2 flex-1 flex flex-col">
                      <label className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                        Review & Suggestions *
                      </label>
                      <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="Tell us what went wrong, what is working exceptionally well, or any suggestions you would love to see implemented!"
                        className="w-full flex-1 min-h-[140px] px-4 py-3 text-xs rounded-xl bg-white/40 dark:bg-black/10 border border-neutral-200 dark:border-neutral-800 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors resize-none leading-relaxed"
                      />
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full py-3.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-600/25 active:scale-[0.98] disabled:opacity-50 disabled:scale-100"
                    >
                      {submitting ? (
                        <>
                          <Loader2 size={13} className="animate-spin" />
                          Submitting Suggestions...
                        </>
                      ) : (
                        <>
                          <Send size={13} />
                          Submit Review
                        </>
                      )}
                    </button>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
