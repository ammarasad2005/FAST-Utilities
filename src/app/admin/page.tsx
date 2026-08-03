'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ShieldAlert,
  Lock,
  User,
  LogOut,
  RefreshCw,
  Search,
  Trash2,
  CheckCircle,
  AlertTriangle,
  ArrowLeft,
  PieChart,
  Tag,
  MapPin,
  Calendar,
  AlertCircle,
  X,
  FileText,
  MessageSquare,
  Heart,
  Smile,
  Lightbulb,
  Bug,
  Star,
  HelpCircle,
  Settings
} from 'lucide-react'
import { Header } from '@/components/Header'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { extractTimeFromCourseName } from '@/lib/timetable-filter'
import type { SummerCourseCatalogEntry, RegularCourseMappings } from '@/lib/types'
import { HARDCODED_VALID_COURSES_MAP } from '@/lib/types'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface LostFoundItem {
  id: string
  type: 'lost' | 'found'
  category: string
  title: string
  description: string
  location: string
  handoffNote?: string
  date: string
  contactInfo: string
  reporterName?: string
  isResolved: boolean
  resolvedBy?: string
  imageUrl: string | null
  createdAt: string
  updatedAt: string
}

export default function AdminPage() {
  const router = useRouter()
  const { toast } = useToast()

  // State Management
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [authenticated, setAuthenticated] = useState(false)
  const [adminView, setAdminView] = useState<'items' | 'feedback' | 'settings'>('items')

  // Settings Form State
  const [semesterType, setSemesterType] = useState<'regular' | 'summer'>('regular')
  const [semesterName, setSemesterName] = useState('Spring 2026')
  const [bypassCoursesConfig, setBypassCoursesConfig] = useState(false)
  const [googleSheetsUrl, setGoogleSheetsUrl] = useState('')
  const [courseMappings, setCourseMappings] = useState('[]') // Used for regular (legacy fallback)
  const [summerCatalog, setSummerCatalog] = useState<SummerCourseCatalogEntry[]>([]) // Used for summer
  // Regular semester course mappings (admin-editable, mirrors VALID_COURSES_MAP)
  const [regularMappings, setRegularMappings] = useState<RegularCourseMappings>({})
  const [overrideCourseMappings, setOverrideCourseMappings] = useState(false)
  const [sheetNameMappings, setSheetNameMappings] = useState<Record<string, string>>({
    Monday: '',
    Tuesday: '',
    Wednesday: '',
    Thursday: '',
    Friday: '',
    Saturday: ''
  })
  const [activeBatchTab, setActiveBatchTab] = useState('2025')
  const [newCourseInput, setNewCourseInput] = useState<Record<string, string>>({}) // key: `${batch}|${dept}`
  const [savingSettings, setSavingSettings] = useState(false)
  const [loadingSettings, setLoadingSettings] = useState(false)
  const [refreshingCatalog, setRefreshingCatalog] = useState(false)
  const [refetchingTimetable, setRefetchingTimetable] = useState(false)
  
  // Login Form State
  const [usernameInput, setUsernameInput] = useState('')
  const [passwordInput, setPasswordInput] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)
  const [loginError, setLoginError] = useState('')

  // Dashboard Data State
  const [items, setItems] = useState<LostFoundItem[]>([])
  const [loadingItems, setLoadingItems] = useState(false)

  // Feedback Data State
  const [feedbackList, setFeedbackList] = useState<any[]>([])
  const [loadingFeedback, setLoadingFeedback] = useState(false)
  
  // Search & Filter State (Items)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [typeFilter, setTypeFilter] = useState('all') // 'all' | 'lost' | 'found'
  const [statusFilter, setStatusFilter] = useState('all') // 'all' | 'resolved' | 'active'

  // Search & Filter State (Feedback)
  const [feedbackSearchQuery, setFeedbackSearchQuery] = useState('')
  const [feedbackCategoryFilter, setFeedbackCategoryFilter] = useState('All')
  const [feedbackRatingFilter, setFeedbackRatingFilter] = useState('All')

  // Action States
  const [itemToDelete, setItemToDelete] = useState<LostFoundItem | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)

  const [feedbackToDelete, setFeedbackToDelete] = useState<any | null>(null)
  const [feedbackDeleteConfirmOpen, setFeedbackDeleteConfirmOpen] = useState(false)

  const [actionLoading, setActionLoading] = useState<string | null>(null) // id of item being updated

  const categories = [
    'All',
    'Electronics',
    'Documents',
    'Accessories',
    'Clothing',
    'Keys',
    'Bags',
    'Books',
    'Other'
  ]

  // Fetch all items from the database
  const fetchItems = useCallback(async () => {
    setLoadingItems(true)
    try {
      const res = await fetch('/api/lost-found')
      const data = await res.json()
      setItems(data.items || [])
    } catch (err) {
      console.error('Failed to fetch items:', err)
      toast({
        title: 'Error',
        description: 'Failed to load database items.',
        variant: 'destructive'
      })
    } finally {
      setLoadingItems(false)
    }
  }, [toast])

  // Fetch all feedback submissions
  const fetchFeedback = useCallback(async () => {
    setLoadingFeedback(true)
    try {
      const res = await fetch('/api/feedback')
      const data = await res.json()
      setFeedbackList(data.feedback || [])
    } catch (err) {
      console.error('Failed to fetch feedback:', err)
      toast({
        title: 'Error',
        description: 'Failed to load database feedback.',
        variant: 'destructive'
      })
    } finally {
      setLoadingFeedback(false)
    }
  }, [toast])

  // Fetch settings from database
  const fetchSettings = useCallback(async () => {
    setLoadingSettings(true)
    try {
      const { data, error } = await supabase
        .from('semester_settings')
        .select('*')
        .eq('id', 1)
        .single()
      
      if (error) {
        console.error('Error fetching settings:', error)
        toast({
          title: 'Error',
          description: 'Failed to load semester settings.',
          variant: 'destructive'
        })
      } else if (data) {
        setSemesterType(data.semester_type)
        setSemesterName(data.semester_name ?? 'Spring 2026')
        setBypassCoursesConfig(data.bypass_courses_config)
        setGoogleSheetsUrl(data.google_sheets_url)
        setOverrideCourseMappings(data.override_course_mappings ?? false)
        if (data.sheet_name_mappings && typeof data.sheet_name_mappings === 'object') {
          setSheetNameMappings({
            Monday: (data.sheet_name_mappings as any).Monday || '',
            Tuesday: (data.sheet_name_mappings as any).Tuesday || '',
            Wednesday: (data.sheet_name_mappings as any).Wednesday || '',
            Thursday: (data.sheet_name_mappings as any).Thursday || '',
            Friday: (data.sheet_name_mappings as any).Friday || '',
            Saturday: (data.sheet_name_mappings as any).Saturday || ''
          })
        } else {
          setSheetNameMappings({
            Monday: '',
            Tuesday: '',
            Wednesday: '',
            Thursday: '',
            Friday: '',
            Saturday: ''
          })
        }
        if (data.regular_course_mappings && typeof data.regular_course_mappings === 'object') {
          setRegularMappings(data.regular_course_mappings as RegularCourseMappings)
        } else {
          setRegularMappings({})
        }

        if (data.semester_type === 'summer') {
          setSummerCatalog(Array.isArray(data.course_mappings) ? data.course_mappings : [])
          setCourseMappings('[]')
        } else {
          setCourseMappings(JSON.stringify(data.course_mappings, null, 2))
          setSummerCatalog([])
        }
      }
    } catch (err) {
      console.error('Unexpected error fetching settings:', err)
    } finally {
      setLoadingSettings(false)
    }
  }, [toast])

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingSettings(true)

    // In summer mode, we use summerCatalog array directly. In regular mode, we save regularMappings.
    let parsedMappings: any[] | undefined = undefined;
    if (semesterType === 'regular') {
      // legacy course_mappings stays unchanged
      try {
        parsedMappings = JSON.parse(courseMappings)
        if (!Array.isArray(parsedMappings)) throw new Error('Course mappings must be a JSON array.')
      } catch (err: any) {
        toast({ title: 'Invalid JSON', description: err.message || 'Course mappings must be a valid JSON array.', variant: 'destructive' })
        setSavingSettings(false)
        return
      }
    } else if (semesterType === 'summer') {
      parsedMappings = summerCatalog
    }

    try {
      const updatePayload: Record<string, any> = {
          semester_type: semesterType,
          semester_name: semesterName,
          bypass_courses_config: bypassCoursesConfig,
          google_sheets_url: googleSheetsUrl,
          override_course_mappings: overrideCourseMappings,
          regular_course_mappings: Object.keys(regularMappings).length > 0 ? regularMappings : null,
          sheet_name_mappings: sheetNameMappings,
          updated_at: new Date().toISOString()
        }
        
        // Save the chosen mappings list
        if (parsedMappings !== undefined) {
          updatePayload.course_mappings = parsedMappings
        }

        const { error } = await supabase
          .from('semester_settings')
          .update(updatePayload)
          .eq('id', 1)

      if (error) {
        console.error('Error saving settings:', error)
        toast({
          title: 'Save Failed',
          description: 'Failed to update semester settings in database.',
          variant: 'destructive'
        })
      } else {
        toast({
          title: 'Settings Saved',
          description: 'Semester configuration successfully updated.'
        })
      }
    } catch (err) {
      console.error('Unexpected error saving settings:', err)
      toast({
        title: 'Error',
        description: 'An unexpected error occurred while saving settings.',
        variant: 'destructive'
      })
    } finally {
      setSavingSettings(false)
    }
  }

  const handleRefreshSummerCatalog = async () => {
    if (!googleSheetsUrl) {
      toast({
        title: 'Error',
        description: 'Please enter a Google Sheets URL first.',
        variant: 'destructive',
      })
      return
    }

    const match = googleSheetsUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    const spreadsheetId = match ? match[1] : null;
    if (!spreadsheetId) {
      toast({
        title: 'Error',
        description: 'Invalid Google Sheets URL. Could not find Spreadsheet ID.',
        variant: 'destructive',
      })
      return
    }

    setRefreshingCatalog(true)
    try {
      const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const fetchedCourses = new Set<string>();

      // Helper to split CSV row safely handling quotes
      const parseCSVLine = (line: string): string[] => {
        const result = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        result.push(current.trim());
        return result;
      };

      const cleanCourseCell = (cellText: string): string => {
        let cleaned = cellText;
        if (cleaned.toLowerCase().includes("cancel") || cleaned.toLowerCase().includes("cancle")) {
          cleaned = cleaned.replace(/\s*\(\s*(?:cancel|cancle)[a-z]*\s*\)\s*/gi, ' ')
                           .replace(/\s*\b(?:cancel|cancle)[a-z]*\b\s*/gi, ' ')
                           .trim();
        }
        if (/\b(?:resched[a-z]*|resch)\b/i.test(cleaned)) {
          cleaned = cleaned.replace(/\s*\(\s*(?:resched[a-z]*|resch)\s*\)\s*/gi, ' ')
                           .replace(/\s*\b(?:resched[a-z]*|resch)\b\s*/gi, ' ')
                           .trim();
        }
        const match = cleaned.match(/^([^(]+?)\s*\(\s*([A-Za-z0-9\-/]+)\s*\)/);
        if (match) {
          cleaned = match[1].trim();
        }
        cleaned = cleaned.replace(/\s*\([^)]*\)\s*$/, '').trim();
        const { cleanName } = extractTimeFromCourseName(cleaned);
        return cleanName;
      };

      const promises = DAYS.map(async (day) => {
        const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(day)}`;
        try {
          const res = await fetch(csvUrl);
          if (!res.ok) return;
          const text = await res.text();
          if (text.toLowerCase().includes('<!doctype html') || text.toLowerCase().includes('<html')) {
            // Probably private or invalid
            return;
          }

          const lines = text.split('\n');
          if (lines.length < 2) return;

          // Detect format
          let isGridFormat = false;
          for (let i = 0; i < Math.min(lines.length, 5); i++) {
            const row = parseCSVLine(lines[i]);
            const firstCell = row[0]?.toLowerCase() || '';
            if (firstCell === 'room' || firstCell === 'rooms' || firstCell === 'lab' || firstCell === 'labs') {
              isGridFormat = true;
              break;
            }
          }

          if (isGridFormat) {
            let hasHeaders = false;
            for (const line of lines) {
              const row = parseCSVLine(line);
              if (row.length === 0 || !row[0]) continue;
              const firstCell = row[0].toLowerCase();
              if (firstCell === 'room' || firstCell === 'rooms' || firstCell === 'lab' || firstCell === 'labs') {
                hasHeaders = true;
                continue;
              }
              if (hasHeaders) {
                // Room row: check grid cells
                for (let col = 1; col < row.length; col++) {
                  const cell = row[col];
                  if (cell && !cell.toLowerCase().includes('reserved') && !cell.toLowerCase().includes('students')) {
                    // Extract course name (strip section info, rescheduled, cancel, and times)
                    const cleanCell = cleanCourseCell(cell);
                    if (cleanCell) {
                      fetchedCourses.add(cleanCell);
                    }
                  }
                }
              }
            }
          } else {
            // Flat Table format
            const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase());
            let courseIdx = -1;
            for (let idx = 0; idx < headers.length; idx++) {
              if (headers[idx].includes('course') || headers[idx].includes('subject') || headers[idx].includes('class')) {
                courseIdx = idx;
                break;
              }
            }
            if (courseIdx !== -1) {
              for (let i = 1; i < lines.length; i++) {
                const row = parseCSVLine(lines[i]);
                if (row.length > courseIdx) {
                  const cell = row[courseIdx];
                  if (cell) {
                    const cleanCell = cleanCourseCell(cell);
                    if (cleanCell) {
                      fetchedCourses.add(cleanCell);
                    }
                  }
                }
              }
            }
          }
        } catch (e) {
          console.warn(`Failed to fetch/parse sheet for ${day}:`, e);
        }
      });

      await Promise.all(promises);

      if (fetchedCourses.size === 0) {
        throw new Error('No courses could be parsed from the Google Sheet. Please verify the URL and ensure the sheet is shared publicly ("Anyone with the link can view").');
      }

      const uniqueSheetNames = Array.from(fetchedCourses).sort();
      const newCatalog: SummerCourseCatalogEntry[] = uniqueSheetNames.map(name => ({
        sheetName: name,
        hidden: false,
        displayName: null
      }))

      // Merge: keep existing aliases/hidden states if they match by sheetName
      setSummerCatalog(prev => {
        const prevMap = new Map(prev.map(c => [c.sheetName, c]))
        return newCatalog.map(nc => {
          const existing = prevMap.get(nc.sheetName)
          if (existing) {
            return { ...nc, displayName: existing.displayName, hidden: existing.hidden }
          }
          return nc
        })
      })

      toast({
        title: 'Catalog Refreshed',
        description: `Successfully loaded ${newCatalog.length} unique courses directly from Google Sheets!`,
      })
    } catch (err: any) {
      toast({
        title: 'Refresh Failed',
        description: err.message || 'Failed to refresh catalog.',
        variant: 'destructive'
      })
    } finally {
      setRefreshingCatalog(false)
    }
  }

  const handleHardRefetchTimetable = async () => {
    setRefetchingTimetable(true)
    try {
      const res = await fetch('/api/admin/refetch-timetable', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to trigger timetable refetch.')
      }
      toast({
        title: 'Refetch Triggered',
        description: data.message || 'GitHub workflow triggered. The timetable will be updated shortly.',
      })
    } catch (err: any) {
      toast({
        title: 'Refetch Failed',
        description: err.message || 'Failed to trigger timetable refetch.',
        variant: 'destructive'
      })
    } finally {
      setRefetchingTimetable(false)
    }
  }

  const updateSummerCatalogEntry = (index: number, updates: Partial<SummerCourseCatalogEntry>) => {
    setSummerCatalog(prev => {
      const next = [...prev]
      next[index] = { ...next[index], ...updates }
      return next
    })
  }

  // Check Authentication Status
  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/check')
      const data = await res.json()
      setAuthenticated(data.authenticated)
      if (data.authenticated) {
        fetchItems()
        fetchFeedback()
        fetchSettings()
      }
    } catch (err) {
      console.error('Auth check failed:', err)
    } finally {
      setCheckingAuth(false)
    }
  }, [fetchItems, fetchFeedback, fetchSettings])

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  // Handle Login Submission
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError('')
    
    if (!usernameInput.trim() || !passwordInput) {
      setLoginError('Both username and password are required.')
      return
    }

    setLoginLoading(true)
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: usernameInput.trim(), password: passwordInput })
      })

      if (res.ok) {
        setAuthenticated(true)
        toast({
          title: 'Welcome back!',
          description: 'Logged in successfully as Administrator.'
        })
        fetchItems()
        fetchFeedback()
        fetchSettings()
      } else {
        const data = await res.json()
        setLoginError(data.error || 'Invalid credentials.')
      }
    } catch (err) {
      setLoginError('Server error. Please try again.')
    } finally {
      setLoginLoading(false)
    }
  }

  // Handle Logout
  const handleLogout = async () => {
    try {
      const res = await fetch('/api/admin/logout', { method: 'POST' })
      if (res.ok) {
        setAuthenticated(false)
        setUsernameInput('')
        setPasswordInput('')
        setItems([])
        setFeedbackList([])
        toast({
          title: 'Logged Out',
          description: 'You have logged out of the admin panel.'
        })
      }
    } catch (err) {
      console.error('Logout error:', err)
    }
  }

  // Handle status toggle (Manual resolve / unresolve)
  const handleToggleResolve = async (item: LostFoundItem) => {
    setActionLoading(item.id)
    try {
      const targetIsResolved = !item.isResolved
      const res = await fetch(`/api/lost-found/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'admin-toggle-resolved',
          isResolved: targetIsResolved,
          resolvedBy: 'ammarasad321993'
        })
      })

      if (res.ok) {
        toast({
          title: targetIsResolved ? 'Marked Resolved' : 'Marked Active',
          description: `"${item.title}" status successfully modified.`
        })
        
        // Update local item list
        setItems(prev =>
          prev.map(i => (i.id === item.id ? { ...i, isResolved: targetIsResolved } : i))
        )
      } else {
        toast({
          title: 'Action Failed',
          description: 'Failed to update status. Check session.',
          variant: 'destructive'
        })
      }
    } catch (err) {
      console.error('Failed to toggle status:', err)
    } finally {
      setActionLoading(null)
    }
  }

  // Handle Deletion Confirmation
  const handleDeleteTrigger = (item: LostFoundItem) => {
    setItemToDelete(item)
    setDeleteConfirmOpen(true)
  }

  // Direct Deletion from Database
  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return
    
    setActionLoading(itemToDelete.id)
    setDeleteConfirmOpen(false)
    try {
      const res = await fetch(`/api/lost-found/${itemToDelete.id}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        toast({
          title: 'Item Deleted',
          description: `"${itemToDelete.title}" permanently deleted from database.`,
        })
        // Remove locally
        setItems(prev => prev.filter(i => i.id !== itemToDelete.id))
      } else {
        toast({
          title: 'Delete Failed',
          description: 'Failed to delete item from database.',
          variant: 'destructive'
        })
      }
    } catch (err) {
      console.error('Deletion error:', err)
    } finally {
      setActionLoading(null)
      setItemToDelete(null)
    }
  }

  // Trigger Deletion of Feedback Entry
  const handleFeedbackDeleteTrigger = (feedbackItem: any) => {
    setFeedbackToDelete(feedbackItem)
    setFeedbackDeleteConfirmOpen(true)
  }

  // Confirm Deletion of Feedback from database
  const handleFeedbackDeleteConfirm = async () => {
    if (!feedbackToDelete) return
    
    setActionLoading(feedbackToDelete.id)
    setFeedbackDeleteConfirmOpen(false)
    try {
      const res = await fetch(`/api/feedback/${feedbackToDelete.id}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        toast({
          title: 'Feedback Deleted',
          description: 'Feedback submission permanently deleted from database.',
        })
        // Remove locally
        setFeedbackList(prev => prev.filter(f => f.id !== feedbackToDelete.id))
      } else {
        toast({
          title: 'Delete Failed',
          description: 'Failed to delete feedback submission.',
          variant: 'destructive'
        })
      }
    } catch (err) {
      console.error('Feedback deletion error:', err)
    } finally {
      setActionLoading(null)
      setFeedbackToDelete(null)
    }
  }

  // Filtering Feedback Logic
  const filteredFeedback = feedbackList.filter(item => {
    const matchesSearch =
      (item.email || '').toLowerCase().includes(feedbackSearchQuery.toLowerCase()) ||
      item.content.toLowerCase().includes(feedbackSearchQuery.toLowerCase())

    const matchesCategory =
      feedbackCategoryFilter === 'All' || item.category === feedbackCategoryFilter

    const matchesRating =
      feedbackRatingFilter === 'All' || String(item.rating) === feedbackRatingFilter

    return matchesSearch && matchesCategory && matchesRating
  })

  // Feedback Statistics
  const totalFeedbackCount = feedbackList.length
  const bugReportCount = feedbackList.filter(f => f.category === 'bug_report').length
  const suggestionCount = feedbackList.filter(f => f.category === 'suggestion').length
  const positiveCount = feedbackList.filter(f => f.rating >= 4).length
  const avgSatisfaction = feedbackList.length > 0 
    ? (feedbackList.reduce((acc, f) => acc + f.rating, 0) / feedbackList.length).toFixed(1) 
    : 'N/A'

  // Filtering Logic
  const filteredItems = items.filter(item => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.contactInfo.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesCategory = categoryFilter === 'All' || item.category === categoryFilter
    
    const matchesType =
      typeFilter === 'all' ||
      (typeFilter === 'lost' && item.type === 'lost') ||
      (typeFilter === 'found' && item.type === 'found')

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'resolved' && item.isResolved) ||
      (statusFilter === 'active' && !item.isResolved)

    return matchesSearch && matchesCategory && matchesType && matchesStatus
  })

  // Statistics Computations
  const totalCount = items.length
  const lostCount = items.filter(i => i.type === 'lost').length
  const foundCount = items.filter(i => i.type === 'found').length
  const resolvedCount = items.filter(i => i.isResolved).length
  const activeCount = items.filter(i => !i.isResolved).length

  // Render Loader during auth check
  if (checkingAuth) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--color-bg)] text-[var(--color-text-primary)]">
        <RefreshCw className="animate-spin text-orange-500 mb-4" size={40} />
        <p className="text-sm font-semibold tracking-wider uppercase text-[var(--color-text-secondary)]">
          Verifying Admin Credentials...
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text-primary)] flex flex-col font-sans transition-colors duration-300">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8 md:px-8">
        <AnimatePresence mode="wait">
          {!authenticated ? (
            /* ==========================================
               1. LOGIN FORM SCREEN
               ========================================== */
            <motion.div
              key="login"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              className="flex justify-center items-center py-12"
            >
              <div 
                className="w-full max-w-md rounded-2xl p-8 border backdrop-blur-md relative overflow-hidden shadow-2xl"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.03)',
                  borderColor: 'var(--color-border)',
                  boxShadow: 'var(--shadow-card)'
                }}
              >
                {/* Glowing subtle gradient circle */}
                <div 
                  className="absolute -top-20 -right-20 w-44 h-44 rounded-full filter blur-[60px]"
                  style={{ backgroundColor: 'rgba(234, 88, 12, 0.15)' }}
                />

                <div className="text-center mb-8 relative">
                  <div className="inline-block p-4 rounded-full bg-orange-500/10 text-orange-500 mb-3 border border-orange-500/20">
                    <ShieldAlert size={36} />
                  </div>
                  <h1 className="text-2xl font-black tracking-tight uppercase">Admin Login</h1>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-1.5 uppercase tracking-wider">
                    FAST ISB Lost & Found Control Portal
                  </p>
                </div>

                <form onSubmit={handleLogin} className="space-y-5 relative">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-[0.1em] text-[var(--color-text-secondary)] flex items-center gap-1.5">
                      <User size={12} />
                      Login ID
                    </label>
                    <input
                      type="text"
                      value={usernameInput}
                      onChange={(e) => setUsernameInput(e.target.value)}
                      placeholder="Enter administrative ID"
                      className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all border bg-[var(--color-bg-subtle)] focus:border-orange-500/50"
                      style={{
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-text-primary)'
                      }}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-[0.1em] text-[var(--color-text-secondary)] flex items-center gap-1.5">
                      <Lock size={12} />
                      Secret Password
                    </label>
                    <input
                      type="password"
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      placeholder="••••••••••••••"
                      className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all border bg-[var(--color-bg-subtle)] focus:border-orange-500/50"
                      style={{
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-text-primary)'
                      }}
                    />
                  </div>

                  {loginError && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="flex items-center gap-2 p-3.5 rounded-lg border border-red-500/20 bg-red-500/5 text-red-500 text-xs font-semibold"
                    >
                      <AlertCircle size={16} className="shrink-0" />
                      <span>{loginError}</span>
                    </motion.div>
                  )}

                  <button
                    type="submit"
                    disabled={loginLoading}
                    className="w-full rounded-xl py-3.5 bg-orange-600 hover:bg-orange-500 text-white font-black text-xs uppercase tracking-[0.12em] transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-600/25 active:scale-[0.98]"
                  >
                    {loginLoading ? (
                      <RefreshCw size={14} className="animate-spin" />
                    ) : (
                      <>
                        <Lock size={14} />
                        Authenticate Portal
                      </>
                    )}
                  </button>
                </form>

                <div className="mt-8 text-center border-t border-[var(--color-border)] pt-4">
                  <button
                    onClick={() => router.push('/lost-found')}
                    className="text-[10px] font-black uppercase tracking-[0.1em] text-[var(--color-text-secondary)] hover:text-orange-500 transition-colors flex items-center justify-center gap-1.5 mx-auto"
                  >
                    <ArrowLeft size={12} />
                    Back to Public Hub
                  </button>
                </div>
              </div>
            </motion.div>
          ) : (
            /* ==========================================
               2. ADMIN DASHBOARD SCREEN
               ========================================== */
            <motion.div
              key="dashboard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-8"
            >
              {/* Dashboard Sub-Header / Controls */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <div className="flex items-center gap-2.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse" />
                    <h1 className="text-3xl font-black uppercase tracking-tight">Admin Console</h1>
                  </div>
                  <p className="text-xs text-[var(--color-text-secondary)] uppercase mt-1 tracking-wider font-bold">
                    Logged in securely as <span className="text-orange-500">ammarasad321993</span>
                  </p>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                  <button
                    onClick={() => {
                      fetchItems()
                      fetchFeedback()
                      fetchSettings()
                    }}
                    className="px-4 py-2.5 rounded-xl border font-bold text-xs uppercase tracking-[0.08em] hover:bg-[var(--color-bg-subtle)] transition-all flex items-center gap-1.5"
                    style={{ borderColor: 'var(--color-border)' }}
                  >
                    <RefreshCw size={12} className={(loadingItems || loadingFeedback || loadingSettings) ? 'animate-spin' : ''} />
                    Refresh
                  </button>
                  <button
                    onClick={handleLogout}
                    className="px-4 py-2.5 rounded-xl border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 text-red-500 font-bold text-xs uppercase tracking-[0.08em] transition-all flex items-center gap-1.5"
                  >
                    <LogOut size={12} />
                    Exit Portal
                  </button>
                </div>
              </div>

              {/* Tab Selector Header */}
              <div className="flex border-b border-[var(--color-border)] gap-2">
                <button
                  onClick={() => setAdminView('items')}
                  className={`px-5 py-3 font-black text-xs uppercase tracking-[0.08em] border-b-2 transition-all flex items-center gap-2 ${
                    adminView === 'items'
                      ? 'border-orange-500 text-orange-500 font-black'
                      : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                  }`}
                >
                  <FileText size={13} />
                  Belongings Database ({items.length})
                </button>
                <button
                  onClick={() => setAdminView('feedback')}
                  className={`px-5 py-3 font-black text-xs uppercase tracking-[0.08em] border-b-2 transition-all flex items-center gap-2 ${
                    adminView === 'feedback'
                      ? 'border-orange-500 text-orange-500 font-black'
                      : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                  }`}
                >
                  <MessageSquare size={13} />
                  Student Suggestions ({feedbackList.length})
                </button>
                <button
                  onClick={() => setAdminView('settings')}
                  className={`px-5 py-3 font-black text-xs uppercase tracking-[0.08em] border-b-2 transition-all flex items-center gap-2 ${
                    adminView === 'settings'
                      ? 'border-orange-500 text-orange-500 font-black'
                      : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                  }`}
                >
                  <Settings size={13} />
                  Semester Settings
                </button>
              </div>

              {adminView === 'items' ? (
                <>
                  {/* Statistics Grid Cards (Items) */}
                  <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                    {[
                      { label: 'Total Records', val: totalCount, icon: FileText, color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
                      { label: 'Lost Reports', val: lostCount, icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
                      { label: 'Found Belongings', val: foundCount, icon: Search, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
                      { label: 'Resolved Success', val: resolvedCount, icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20' },
                      { label: 'Active Reminders', val: activeCount, icon: AlertTriangle, color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' },
                    ].map((stat, idx) => (
                      <div
                        key={idx}
                        className={`rounded-2xl p-5 border flex flex-col relative overflow-hidden ${stat.bg} ${stat.border}`}
                      >
                        <div className="flex justify-between items-start mb-4">
                          <p className="text-[10px] font-black uppercase tracking-wider text-[var(--color-text-secondary)]">
                            {stat.label}
                          </p>
                          <stat.icon size={16} className={stat.color} />
                        </div>
                        <p className="text-3xl font-black tracking-tight">{stat.val}</p>
                      </div>
                    ))}
                  </div>

                  {/* Controls bar (Search & Filtering) */}
                  <div 
                    className="rounded-2xl p-5 border flex flex-col md:flex-row gap-4 items-center justify-between shadow-sm"
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.01)',
                      borderColor: 'var(--color-border)'
                    }}
                  >
                    {/* Search query input */}
                    <div className="relative w-full md:max-w-md">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]" size={16} />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search database by title, description, location..."
                        className="w-full rounded-xl pl-10 pr-4 py-2.5 text-xs font-semibold outline-none transition-all border bg-[var(--color-bg-subtle)] focus:border-orange-500/30"
                        style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
                      />
                      {searchQuery && (
                        <button
                          onClick={() => setSearchQuery('')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)] hover:text-orange-500"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>

                    {/* Filters selection */}
                    <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                      {/* Category Selector */}
                      <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="rounded-xl px-3 py-2.5 text-xs font-bold uppercase tracking-wider border bg-[var(--color-bg-subtle)] outline-none"
                        style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
                      >
                        {categories.map((cat, idx) => (
                          <option key={idx} value={cat}>{cat}</option>
                        ))}
                      </select>

                      {/* Type Selector */}
                      <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        className="rounded-xl px-3 py-2.5 text-xs font-bold uppercase tracking-wider border bg-[var(--color-bg-subtle)] outline-none"
                        style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
                      >
                        <option value="all">All Types</option>
                        <option value="lost">Lost</option>
                        <option value="found">Found</option>
                      </select>

                      {/* Status Selector */}
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="rounded-xl px-3 py-2.5 text-xs font-bold uppercase tracking-wider border bg-[var(--color-bg-subtle)] outline-none"
                        style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
                      >
                        <option value="all">All Statuses</option>
                        <option value="active">Active Only</option>
                        <option value="resolved">Resolved Only</option>
                      </select>
                    </div>
                  </div>

                  {/* Items List Section */}
                  <div 
                    className="rounded-2xl border overflow-hidden shadow-sm"
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.01)',
                      borderColor: 'var(--color-border)'
                    }}
                  >
                    <div className="px-6 py-4 border-b border-[var(--color-border)] bg-[var(--color-bg-subtle)] flex items-center justify-between">
                      <h3 className="text-xs font-black uppercase tracking-wider text-[var(--color-text-secondary)]">
                        Items Records Database ({filteredItems.length} listed)
                      </h3>
                    </div>

                    {filteredItems.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 text-[var(--color-text-secondary)]">
                        <Search size={32} className="text-orange-500 mb-3 opacity-60 animate-bounce" />
                        <p className="text-sm font-bold uppercase tracking-wide">No database entries found</p>
                        <p className="text-[10px] uppercase mt-1 font-semibold opacity-70">
                          Try widening your query filter conditions
                        </p>
                      </div>
                    ) : (
                      <div className="divide-y divide-[var(--color-border)]">
                        {filteredItems.map((item) => (
                          <div
                            key={item.id}
                            className="p-6 hover:bg-[var(--color-bg-subtle)]/40 transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-6"
                          >
                            {/* Left Side: Thumbnail & Text Metadata */}
                            <div className="flex items-start gap-4">
                              <div className="relative shrink-0 w-16 h-16 rounded-lg overflow-hidden border border-[var(--color-border)] flex items-center justify-center bg-[var(--color-bg-subtle)]">
                                {item.imageUrl ? (
                                  <img
                                    src={item.imageUrl}
                                    alt={item.title}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <span className="text-xl">📦</span>
                                )}
                              </div>

                              <div className="space-y-1">
                                <div className="flex items-center flex-wrap gap-2">
                                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                    item.type === 'lost' 
                                      ? 'bg-red-500/10 text-red-500 border border-red-500/20' 
                                      : 'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                                  }`}>
                                    {item.type}
                                  </span>

                                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-[var(--color-bg-subtle)] text-[var(--color-text-secondary)] border border-[var(--color-border)]">
                                    {item.category}
                                  </span>

                                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                    item.isResolved
                                      ? 'bg-green-500/10 text-green-500 border border-green-500/20'
                                      : 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'
                                  }`}>
                                    {item.isResolved ? 'Resolved' : 'Active'}
                                  </span>
                                </div>

                                <h4 className="font-extrabold text-sm text-[var(--color-text-primary)]">
                                  {item.title}
                                </h4>
                                <p className="text-xs text-[var(--color-text-secondary)] line-clamp-1 max-w-2xl">
                                  {item.description}
                                </p>

                                {/* Details flex list */}
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-1.5 text-[10px] text-[var(--color-text-secondary)] font-bold">
                                  <span className="flex items-center gap-1">
                                    <MapPin size={10} />
                                    {item.location}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Calendar size={10} />
                                    {new Date(item.date).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <User size={10} />
                                    {item.contactInfo}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Right Side: Administrative Actions */}
                            <div className="flex items-center gap-3 border-t lg:border-t-0 pt-4 lg:pt-0 shrink-0">
                              <button
                                onClick={() => handleToggleResolve(item)}
                                disabled={actionLoading === item.id}
                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.06em] border transition-all flex items-center gap-1.5 ${
                                  item.isResolved
                                    ? 'border-yellow-500/30 hover:bg-yellow-500/5 text-yellow-500'
                                    : 'border-green-500/30 hover:bg-green-500/5 text-green-500'
                                }`}
                              >
                                {actionLoading === item.id ? (
                                  <RefreshCw size={11} className="animate-spin" />
                                ) : item.isResolved ? (
                                  <>
                                    <AlertTriangle size={11} />
                                    Re-activate Item
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle size={11} />
                                    Mark Resolved
                                  </>
                                )}
                              </button>

                              <button
                                onClick={() => handleDeleteTrigger(item)}
                                disabled={actionLoading === item.id}
                                className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.06em] border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 text-red-500 transition-all flex items-center gap-1.5"
                              >
                                <Trash2 size={11} />
                                Delete Permanent
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              ) : adminView === 'feedback' ? (
                <>
                  {/* Statistics Grid Cards (Feedback) */}
                  <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                    {[
                      { label: 'Total Suggestions', val: totalFeedbackCount, icon: MessageSquare, color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
                      { label: 'Bug Reports', val: bugReportCount, icon: Bug, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
                      { label: 'Feature Ideas', val: suggestionCount, icon: Lightbulb, color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20' },
                      { label: 'Positive (4-5★)', val: positiveCount, icon: Smile, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
                      { label: 'Avg Rating', val: avgSatisfaction === 'N/A' ? 'N/A' : `${avgSatisfaction} / 5`, icon: Star, color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' },
                    ].map((stat, idx) => (
                      <div
                        key={idx}
                        className={`rounded-2xl p-5 border flex flex-col relative overflow-hidden ${stat.bg} ${stat.border}`}
                      >
                        <div className="flex justify-between items-start mb-4">
                          <p className="text-[10px] font-black uppercase tracking-wider text-[var(--color-text-secondary)]">
                            {stat.label}
                          </p>
                          <stat.icon size={16} className={stat.color} />
                        </div>
                        <p className="text-3xl font-black tracking-tight">{stat.val}</p>
                      </div>
                    ))}
                  </div>

                  {/* Controls bar (Search & Filtering - Feedback) */}
                  <div 
                    className="rounded-2xl p-5 border flex flex-col md:flex-row gap-4 items-center justify-between shadow-sm"
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.01)',
                      borderColor: 'var(--color-border)'
                    }}
                  >
                    {/* Search query input */}
                    <div className="relative w-full md:max-w-md">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]" size={16} />
                      <input
                        type="text"
                        value={feedbackSearchQuery}
                        onChange={(e) => setFeedbackSearchQuery(e.target.value)}
                        placeholder="Search feedback by email or text content..."
                        className="w-full rounded-xl pl-10 pr-4 py-2.5 text-xs font-semibold outline-none transition-all border bg-[var(--color-bg-subtle)] focus:border-orange-500/30"
                        style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
                      />
                      {feedbackSearchQuery && (
                        <button
                          onClick={() => setFeedbackSearchQuery('')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)] hover:text-orange-500"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>

                    {/* Filters selection */}
                    <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                      {/* Category Selector */}
                      <select
                        value={feedbackCategoryFilter}
                        onChange={(e) => setFeedbackCategoryFilter(e.target.value)}
                        className="rounded-xl px-3 py-2.5 text-xs font-bold uppercase tracking-wider border bg-[var(--color-bg-subtle)] outline-none"
                        style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
                      >
                        <option value="All">All Categories</option>
                        <option value="suggestion">💡 Suggestion</option>
                        <option value="bug_report">🐛 Bug Report</option>
                        <option value="review">⭐ Review</option>
                        <option value="inquiry">❓ Inquiry</option>
                      </select>

                      {/* Rating Selector */}
                      <select
                        value={feedbackRatingFilter}
                        onChange={(e) => setFeedbackRatingFilter(e.target.value)}
                        className="rounded-xl px-3 py-2.5 text-xs font-bold uppercase tracking-wider border bg-[var(--color-bg-subtle)] outline-none"
                        style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
                      >
                        <option value="All">All Ratings</option>
                        <option value="5">5 ★ 😄 Excellent</option>
                        <option value="4">4 ★ 🙂 Happy</option>
                        <option value="3">3 ★ 😐 Neutral</option>
                        <option value="2">2 ★ 🙁 Sad</option>
                        <option value="1">1 ★ 😠 Angry</option>
                      </select>
                    </div>
                  </div>

                  {/* Feedback Log Section */}
                  <div 
                    className="rounded-2xl border overflow-hidden shadow-sm"
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.01)',
                      borderColor: 'var(--color-border)'
                    }}
                  >
                    <div className="px-6 py-4 border-b border-[var(--color-border)] bg-[var(--color-bg-subtle)] flex items-center justify-between">
                      <h3 className="text-xs font-black uppercase tracking-wider text-[var(--color-text-secondary)]">
                        Student Suggestions Log ({filteredFeedback.length} submissions)
                      </h3>
                    </div>

                    {filteredFeedback.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 text-[var(--color-text-secondary)]">
                        <MessageSquare size={32} className="text-orange-500 mb-3 opacity-60 animate-bounce" />
                        <p className="text-sm font-bold uppercase tracking-wide">No feedback entries found</p>
                        <p className="text-[10px] uppercase mt-1 font-semibold opacity-70">
                          No suggestions registered under these filters yet
                        </p>
                      </div>
                    ) : (
                      <div className="divide-y divide-[var(--color-border)]">
                        {filteredFeedback.map((item) => (
                          <div
                            key={item.id}
                            className="p-6 hover:bg-[var(--color-bg-subtle)]/40 transition-colors flex flex-col lg:flex-row lg:items-start justify-between gap-6"
                          >
                            {/* Left Side: Category, rating and textual feedback */}
                            <div className="space-y-3 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                {/* Category Badge */}
                                {item.category === 'bug_report' && (
                                  <span className="bg-red-500/10 text-red-500 border border-red-500/20 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider flex items-center gap-1">
                                    <Bug size={10} /> Bug Report
                                  </span>
                                )}
                                {item.category === 'suggestion' && (
                                  <span className="bg-green-500/10 text-green-500 border border-green-500/20 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider flex items-center gap-1">
                                    <Lightbulb size={10} /> Suggestion
                                  </span>
                                )}
                                {item.category === 'review' && (
                                  <span className="bg-blue-500/10 text-blue-500 border border-blue-500/20 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider flex items-center gap-1">
                                    <Star size={10} /> Review
                                  </span>
                                )}
                                {item.category === 'inquiry' && (
                                  <span className="bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider flex items-center gap-1">
                                    <HelpCircle size={10} /> Inquiry
                                  </span>
                                )}

                                {/* Rating Smiley badge */}
                                <div className="flex items-center gap-1 text-[11px] bg-[var(--color-bg-subtle)] border border-[var(--color-border)] px-2 py-0.5 rounded-full font-bold">
                                  <span>
                                    {item.rating === 1 && '😠'}
                                    {item.rating === 2 && '🙁'}
                                    {item.rating === 3 && '😐'}
                                    {item.rating === 4 && '🙂'}
                                    {item.rating === 5 && '😄'}
                                  </span>
                                  <span className="text-[8px] font-mono text-[var(--color-text-secondary)] uppercase tracking-wider">
                                    Rating: {item.rating}/5
                                  </span>
                                </div>
                              </div>

                              <p className="text-xs font-semibold leading-relaxed text-[var(--color-text-primary)] max-w-4xl whitespace-pre-wrap">
                                {item.content}
                              </p>

                              {/* Details metadata */}
                              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-1 text-[10px] text-[var(--color-text-secondary)] font-bold">
                                <span className="flex items-center gap-1">
                                  <User size={10} />
                                  {item.email ? (
                                    <span className="text-orange-500">{item.email}</span>
                                  ) : (
                                    <span className="text-[var(--color-text-tertiary)] italic">Anonymous Student</span>
                                  )}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Calendar size={10} />
                                  {new Date(item.created_at).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                            </div>

                            {/* Right Side: Feedback Delete Action */}
                            <div className="flex items-center shrink-0 border-t lg:border-t-0 pt-4 lg:pt-0">
                              <button
                                onClick={() => handleFeedbackDeleteTrigger(item)}
                                disabled={actionLoading === item.id}
                                className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.06em] border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 text-red-500 transition-all flex items-center gap-1.5"
                              >
                                <Trash2 size={11} />
                                Delete Submission
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                /* ==========================================
                   3. SETTINGS VIEW
                   ========================================== */
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="max-w-3xl space-y-6"
                >
                  <div 
                    className="rounded-2xl p-6 border shadow-sm space-y-6"
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.01)',
                      borderColor: 'var(--color-border)'
                    }}
                  >
                    <div>
                      <h3 className="text-base font-extrabold uppercase tracking-wider text-[var(--color-text-primary)]">
                        Semester Configurations
                      </h3>
                      <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                        Configure the active semester settings, toggle Google Sheets bypass, and map courses to custom batches.
                      </p>
                    </div>

                    {loadingSettings ? (
                      <div className="flex flex-col items-center justify-center py-10 text-[var(--color-text-secondary)]">
                        <RefreshCw className="animate-spin text-orange-500 mb-2" size={24} />
                        <p className="text-xs font-semibold">Loading current settings...</p>
                      </div>
                    ) : (
                      <form onSubmit={handleSaveSettings} className="space-y-6">
                        {/* Active Semester */}
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-[0.1em] text-[var(--color-text-secondary)]">
                            Active Semester Selector
                          </label>
                          <select
                            value={semesterType}
                            onChange={(e) => setSemesterType(e.target.value as 'regular' | 'summer')}
                            className="w-full rounded-xl px-4 py-3 text-sm font-semibold border bg-[var(--color-bg-subtle)] outline-none transition-all focus:border-orange-500/50"
                            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
                          >
                            <option value="regular">Regular Semester</option>
                            <option value="summer">Summer Semester</option>
                          </select>
                        </div>

                        {/* Active Semester Name */}
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-[0.1em] text-[var(--color-text-secondary)]">
                            Active Semester Name
                          </label>
                          <input
                            type="text"
                            value={semesterName}
                            onChange={(e) => setSemesterName(e.target.value)}
                            placeholder="e.g. Spring 2026"
                            className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all border bg-[var(--color-bg-subtle)] focus:border-orange-500/50"
                            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
                            required
                          />
                          <p className="text-[10px] text-[var(--color-text-secondary)] italic font-medium mt-1">
                            Name used globally across all headers, footers, lists, and pages (e.g. &quot;Spring 2026&quot;).
                          </p>
                        </div>

                        {/* Google Sheets URL */}
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-[0.1em] text-[var(--color-text-secondary)]">
                            Google Sheets URL
                          </label>
                          <input
                            type="url"
                            value={googleSheetsUrl}
                            onChange={(e) => setGoogleSheetsUrl(e.target.value)}
                            placeholder="https://docs.google.com/spreadsheets/d/SpreadsheetID/edit#gid=GID"
                            className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all border bg-[var(--color-bg-subtle)] focus:border-orange-500/50"
                            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
                          />
                          <p className="text-[10px] text-[var(--color-text-secondary)] italic font-medium mt-1">
                            URL of the Google Sheet containing the timetable data. Make sure it is shared publicly (&quot;Anyone with the link can view&quot;).
                          </p>
                          <div className="pt-1">
                            <button
                              type="button"
                              onClick={handleHardRefetchTimetable}
                              disabled={refetchingTimetable || !googleSheetsUrl}
                              className="w-full flex items-center justify-center gap-2 px-4 py-3 text-xs font-black uppercase tracking-[0.12em] rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-bg-raised)] text-[var(--color-text-primary)] hover:border-orange-500 hover:text-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                              <RefreshCw className={`h-3.5 w-3.5 ${refetchingTimetable ? 'animate-spin' : ''}`} />
                              {refetchingTimetable ? 'Refetching Timetable...' : 'Hard Refetch Timetable'}
                            </button>
                          </div>
                        </div>

                        {/* Sheet Name Mappings (Explicit Tab Matching) */}
                        <div className="space-y-4 pt-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
                          <div>
                            <label className="text-[10px] font-black uppercase tracking-[0.1em] text-[var(--color-text-primary)]">
                              Explicit Sheet Name Mappings (Optional)
                            </label>
                            <p className="text-[10px] text-[var(--color-text-secondary)] italic font-medium mt-1">
                              Optionally type the exact Google Sheets tab names for each day (e.g. &quot;Tuesday (18 May)&quot;) to completely bypass the date/alias resolution guessing logic. Leave a field blank to let the parser automatically find the sheet.
                            </p>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-3">
                            {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day) => (
                              <div key={day} className="space-y-1">
                                <label className="text-[9px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
                                  {day}
                                </label>
                                <input
                                  type="text"
                                  value={sheetNameMappings[day] || ''}
                                  onChange={(e) => setSheetNameMappings(prev => ({ ...prev, [day]: e.target.value }))}
                                  placeholder={`Auto-detect ${day}`}
                                  className="w-full rounded-xl px-3 py-2 text-xs outline-none transition-all border bg-[var(--color-bg-subtle)] focus:border-orange-500/50"
                                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
                                />
                              </div>
                            ))}
                          </div>
                        </div>

        {/* Regular Semester — Course Mappings Editor */}
                        {semesterType === 'regular' && (
                          <div className="space-y-4">
                            {/* Header + Override Toggle */}
                            <div className="flex items-start justify-between gap-3 p-4 rounded-xl border bg-[var(--color-bg-subtle)]/40" style={{ borderColor: 'var(--color-border)' }}>
                              <div>
                                <p className="text-xs font-black uppercase tracking-[0.1em] text-[var(--color-text-primary)] mb-1">Course → Batch/Dept Mappings</p>
                                <p className="text-[10px] text-[var(--color-text-secondary)]">
                                  {overrideCourseMappings
                                    ? '✅ Admin mappings are ACTIVE — the Python script uses these instead of the hardcoded VALID_COURSES_MAP.'
                                    : '⚠️ Override is OFF — the Python script uses the hardcoded VALID_COURSES_MAP. Mappings below are saved but not applied.'}
                                </p>
                              </div>
                              <div className="flex flex-col items-end gap-2 shrink-0">
                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                  <span className="text-[10px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider whitespace-nowrap">Use Admin Mappings</span>
                                  <input
                                    type="checkbox"
                                    checked={overrideCourseMappings}
                                    onChange={(e) => setOverrideCourseMappings(e.target.checked)}
                                    className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500 accent-orange-500"
                                  />
                                </label>
                                <button
                                  type="button"
                                  onClick={() => setRegularMappings(JSON.parse(JSON.stringify(HARDCODED_VALID_COURSES_MAP)))}
                                  className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-bg-raised)] text-[var(--color-text-secondary)] hover:border-orange-500 hover:text-orange-600 transition-colors"
                                >
                                  Load from Code
                                </button>
                              </div>
                            </div>

                            {/* Batch Tabs */}
                            <div className="flex gap-1 border-b border-[var(--color-border)] pb-0">
                              {['2025', '2024', '2023', '2022'].map(batch => (
                                <button
                                  key={batch}
                                  type="button"
                                  onClick={() => setActiveBatchTab(batch)}
                                  className={`px-4 py-2 text-[10px] font-black uppercase tracking-wider border-b-2 transition-all ${
                                    activeBatchTab === batch
                                      ? 'border-orange-500 text-orange-500'
                                      : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                                  }`}
                                >
                                  {batch}
                                </button>
                              ))}
                            </div>

                            {/* Department Rows for active batch */}
                            <div className="space-y-3">
                              {(['CS','SE','AI','DS','CY'] as const).map(dept => {
                                const courses = regularMappings[activeBatchTab]?.[dept] ?? []
                                const inputKey = `${activeBatchTab}|${dept}`
                                return (
                                  <div key={dept} className="p-3 rounded-xl border" style={{ borderColor: 'var(--color-border)' }}>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-secondary)] mb-2"
                                      style={{ color: `var(--accent-${dept.toLowerCase()})` }}>
                                      {dept}
                                    </p>
                                    {/* Course pills */}
                                    <div className="flex flex-wrap gap-1.5 mb-2">
                                      {courses.map((course, ci) => (
                                        <span
                                          key={ci}
                                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-[var(--color-bg-subtle)] text-[var(--color-text-primary)] border-[var(--color-border-strong)]"
                                        >
                                          {course}
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setRegularMappings(prev => ({
                                                ...prev,
                                                [activeBatchTab]: {
                                                  ...prev[activeBatchTab],
                                                  [dept]: prev[activeBatchTab]?.[dept]?.filter((_, i) => i !== ci) ?? []
                                                }
                                              }))
                                            }}
                                            className="text-[var(--color-text-tertiary)] hover:text-red-500 transition-colors ml-0.5"
                                            title={`Remove ${course}`}
                                          >
                                            ×
                                          </button>
                                        </span>
                                      ))}
                                      {courses.length === 0 && (
                                        <span className="text-[10px] italic text-[var(--color-text-tertiary)]">No courses — add below</span>
                                      )}
                                    </div>
                                    {/* Add course input */}
                                    <div className="flex gap-2">
                                      <input
                                        type="text"
                                        placeholder="Add course name…"
                                        value={newCourseInput[inputKey] ?? ''}
                                        onChange={(e) => setNewCourseInput(prev => ({ ...prev, [inputKey]: e.target.value }))}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') {
                                            e.preventDefault()
                                            const val = (newCourseInput[inputKey] ?? '').trim()
                                            if (!val) return
                                            setRegularMappings(prev => ({
                                              ...prev,
                                              [activeBatchTab]: {
                                                ...prev[activeBatchTab],
                                                [dept]: [...(prev[activeBatchTab]?.[dept] ?? []), val]
                                              }
                                            }))
                                            setNewCourseInput(prev => ({ ...prev, [inputKey]: '' }))
                                          }
                                        }}
                                        className="flex-1 rounded-lg px-3 py-1.5 text-[11px] outline-none border bg-[var(--color-bg-subtle)] focus:border-orange-500/50 transition-all"
                                        style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
                                      />
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const val = (newCourseInput[inputKey] ?? '').trim()
                                          if (!val) return
                                          setRegularMappings(prev => ({
                                            ...prev,
                                            [activeBatchTab]: {
                                              ...prev[activeBatchTab],
                                              [dept]: [...(prev[activeBatchTab]?.[dept] ?? []), val]
                                            }
                                          }))
                                          setNewCourseInput(prev => ({ ...prev, [inputKey]: '' }))
                                        }}
                                        className="px-3 py-1.5 rounded-lg text-[10px] font-bold border border-orange-500/40 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/30 transition-colors"
                                      >
                                        + Add
                                      </button>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )}

                        {semesterType === 'summer' && (
                          <div className="space-y-4">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                              <div>
                                <h3 className="text-sm font-bold text-[var(--color-text-primary)]">Summer Course Catalog</h3>
                                <p className="text-[10px] text-[var(--color-text-secondary)]">
                                  Manage course visibility and set display aliases for the student timetable checklist.
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={handleRefreshSummerCatalog}
                                disabled={refreshingCatalog}
                                className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider bg-[var(--color-bg-raised)] border border-[var(--color-border-strong)] rounded-lg text-[var(--color-text-primary)] hover:border-orange-500 hover:text-orange-600 transition-colors flex items-center gap-2 disabled:opacity-50"
                              >
                                {refreshingCatalog ? <RefreshCw size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                                Refresh from Sheet
                              </button>
                            </div>

                            {summerCatalog.length === 0 ? (
                              <div className="p-6 text-center border border-dashed border-[var(--color-border)] rounded-xl bg-[var(--color-bg-subtle)]/50">
                                <p className="text-xs text-[var(--color-text-tertiary)] italic">No courses loaded. Click &quot;Refresh from Sheet&quot; to populate.</p>
                              </div>
                            ) : (
                              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                                {summerCatalog.map((entry, idx) => (
                                  <div key={idx} className={`p-3 rounded-xl border transition-colors flex flex-col md:flex-row md:items-center gap-3 ${entry.hidden ? 'bg-[var(--color-bg-subtle)] border-[var(--color-border)] opacity-60' : 'bg-[var(--color-bg-raised)] border-[var(--color-border-strong)]'}`}>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-[10px] font-mono text-[var(--color-text-tertiary)] uppercase tracking-wider mb-1 truncate" title={entry.sheetName}>
                                        {entry.sheetName}
                                      </p>
                                      <input
                                        type="text"
                                        placeholder="Display Alias (optional)"
                                        value={entry.displayName || ''}
                                        onChange={(e) => updateSummerCatalogEntry(idx, { displayName: e.target.value || null })}
                                        className="w-full bg-transparent text-sm font-medium text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-tertiary)] focus:border-orange-500 border-b border-transparent transition-colors py-0.5"
                                      />
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => updateSummerCatalogEntry(idx, { hidden: !entry.hidden })}
                                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border ${entry.hidden ? 'bg-[var(--color-bg-raised)] border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)]' : 'bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100 dark:bg-orange-950/30 dark:border-orange-800 dark:text-orange-400'}`}
                                    >
                                      {entry.hidden ? 'Hidden' : 'Visible'}
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Save Button */}
                        <button
                          type="submit"
                          disabled={savingSettings}
                          className="w-full md:w-auto px-6 py-3 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-black text-xs uppercase tracking-[0.12em] transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-600/25 active:scale-[0.98] disabled:opacity-50"
                        >
                          {savingSettings ? (
                            <RefreshCw size={14} className="animate-spin" />
                          ) : (
                            'Save Configurations'
                          )}
                        </button>
                      </form>
                    )}
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* 1. Items Database Deletion Confirmation Alert Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent className="rounded-2xl border border-red-500/20 bg-[var(--color-bg)] text-[var(--color-text-primary)] max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm font-black uppercase tracking-wider text-red-500 flex items-center gap-2">
              <AlertTriangle size={18} />
              Confirm Database Deletion
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-[var(--color-text-secondary)] font-medium leading-relaxed mt-2">
              Are you sure you want to permanently delete <strong className="text-[var(--color-text-primary)]">&quot;{itemToDelete?.title}&quot;</strong> from the database? This action is irreversible and will remove all associated item records, image links, and claims metadata from Supabase.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 gap-2">
            <AlertDialogCancel className="rounded-xl border font-bold text-xs uppercase tracking-wide px-4 py-2">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm}
              className="rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs uppercase tracking-wide px-4 py-2"
            >
              Permanently Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 2. Feedback Submissions Deletion Confirmation Alert Dialog */}
      <AlertDialog open={feedbackDeleteConfirmOpen} onOpenChange={setFeedbackDeleteConfirmOpen}>
        <AlertDialogContent className="rounded-2xl border border-red-500/20 bg-[var(--color-bg)] text-[var(--color-text-primary)] max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm font-black uppercase tracking-wider text-red-500 flex items-center gap-2">
              <AlertTriangle size={18} />
              Confirm Submission Deletion
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-[var(--color-text-secondary)] font-medium leading-relaxed mt-2">
              Are you sure you want to permanently delete this student suggestion from the database? This action is irreversible and will remove the log entry permanently from Supabase.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 gap-2">
            <AlertDialogCancel className="rounded-xl border font-bold text-xs uppercase tracking-wide px-4 py-2">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleFeedbackDeleteConfirm}
              className="rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs uppercase tracking-wide px-4 py-2"
            >
              Confirm Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <footer className="mt-auto py-6 border-t border-[var(--color-border)] text-center no-print">
        <p className="text-[9px] font-black tracking-widest text-[var(--color-text-secondary)] uppercase">
          FAST ISB Schedule Platform &middot; Administrative Engine
        </p>
      </footer>
    </div>
  )
}
