'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { ShieldAlert, ExternalLink } from 'lucide-react';
import { useMobileSwipe } from '@/hooks/useMobileSwipe';
import { findMatchingCatalogEntry } from '@/lib/timetable-filter';
import type { SummerCourseCatalogEntry, TimetableEntry } from '@/lib/types';

// eslint-disable-next-line
const timetableData: any = require('../../public/data/timetable.json');

function nestTimetableEntries(entries: TimetableEntry[]): any {
  const nested: any = {};
  for (const e of entries) {
    const batch = e.batch || 'Summer';
    const dept = e.department || 'CS';
    const cat = e.category || 'regular';
    const course = e.courseName;
    const sec = e.section || 'A';
    const day = e.day;

    if (!nested[batch]) nested[batch] = {};
    if (!nested[batch][dept]) nested[batch][dept] = {};
    if (!nested[batch][dept][cat]) nested[batch][dept][cat] = {};
    if (!nested[batch][dept][cat][course]) nested[batch][dept][cat][course] = {};
    if (!nested[batch][dept][cat][course][sec]) nested[batch][dept][cat][course][sec] = {};
    if (!nested[batch][dept][cat][course][sec][day]) nested[batch][dept][cat][course][sec][day] = [];

    nested[batch][dept][cat][course][sec][day].push({
      room: e.room,
      time: e.time,
      rescheduled: e.rescheduled,
      exam: e.exam,
      is_elective: e.isElective,
      elective_group: e.electiveGroup
    });
  }
  return nested;
}

interface CourseRow {
  year: string;
  dept: string;
  type: string;
  course: string;
  preferredSection: string;
}

interface ScheduleItem {
  course: string;
  section: string;
  config: string;
  isLocked: boolean;
}

interface Slot {
  day: string;
  start: number;
  end: number;
}

interface ValidSchedule {
  activeDays: number;
  maxOffDays: number;
  workloadScore: number;
  comfortScore: number;
  totalBadGapMinutes: number;
  maxClassesInOneDay: number;
  missedMiddayBreaks: number;
  maxConsecutiveAMClasses: number;
  hasBackToBackPMClasses: boolean;
  totalEarlyClasses: number;
  totalLateClasses: number;
  totalConsecutivePenalties: number;
  customScore?: number;
  penalty?: number;
  fitScore?: number;
  schedule: ScheduleItem[];
}

const AFTERNOON_START_MINUTES = 13 * 60;
const AFTERNOON_FATIGUE_END_MINUTES = 15 * 60 + 50;

export function TimetableOptimizer() {
  const ObjectKeys = (obj: any) => (obj ? Object.keys(obj) : []);

  const [dynamicTimetableData, setDynamicTimetableData] = useState<any>(timetableData);
  const [summerCatalog, setSummerCatalog] = useState<SummerCourseCatalogEntry[]>([]);
  const [isSummer, setIsSummer] = useState<boolean>(false);

  useEffect(() => {
    const activeSemester = localStorage.getItem('fsc_active_semester');
    const isSummerMode = activeSemester === 'summer';
    setIsSummer(isSummerMode);
    if (isSummerMode) {
      fetch('/api/timetable', { cache: 'no-store' })
        .then(res => res.ok ? res.json() : { entries: [], catalog: [] })
        .then(data => {
          if (data.entries && data.entries.length > 0) {
            const nested = nestTimetableEntries(data.entries);
            setDynamicTimetableData(nested);
          }
          if (data.catalog) {
            setSummerCatalog(data.catalog);
          }
        })
        .catch(err => console.error('Error fetching dynamic timetable for optimizer:', err));
    }
  }, []);

  const availableYears = useMemo(() => {
    const keys = ObjectKeys(dynamicTimetableData).filter((k: string) => k !== '__meta__');
    if (isSummer) {
      return keys.filter((k: string) => k === 'Summer');
    } else {
      return keys.filter((k: string) => k !== 'Summer');
    }
  }, [dynamicTimetableData, isSummer]);

  const getDefaultRow = (): CourseRow => {
    const defaultYear = availableYears[0] || '';
    const defaultDept = ObjectKeys(dynamicTimetableData[defaultYear])[0] || '';
    const defaultType = ObjectKeys(dynamicTimetableData[defaultYear]?.[defaultDept])[0] || '';
    return { year: defaultYear, dept: defaultDept, type: defaultType, course: '', preferredSection: '' };
  };

  const { drawerRef: verifyDrawerRef, handleRef: verifyHandleRef, backdropRef: verifyBackdropRef, closeDrawer: verifyCloseDrawer } = useMobileSwipe({
    onClose: () => setIsDefaultDrawerOpen(false),
    defaultHeightStr: '60dvh'
  });

  const handlePreview = (schedule: ScheduleItem[]) => {
    try {
      const previewRows = schedule.map((item) => {
        const [year, dept, type] = item.config.split(' ');
        return {
          id: crypto.randomUUID(),
          batch: year,
          stream: dept,
          category: type,
          selection: `${item.course} | ${item.section}`,
          errorBatch: false,
          errorStream: false,
          errorCategory: false,
          errorSelection: false,
        };
      });
      localStorage.setItem('fsc_timetable_preview', JSON.stringify(previewRows));
    } catch (e) {
      console.error("Failed to set preview data", e);
    }
  };

  // --- State ---
  const [inputMode, setInputMode] = useState<'default' | 'custom'>('custom');
  const [defaultBatch, setDefaultBatch] = useState('');
  const [defaultDept, setDefaultDept] = useState('CS');
  const [defaultCoursesVerified, setDefaultCoursesVerified] = useState(false);
  const [isDefaultDrawerOpen, setIsDefaultDrawerOpen] = useState(false);
  const [defaultCourseSelections, setDefaultCourseSelections] = useState<{ course: string, type: string, selected: boolean }[]>([]);
  const [selectedCourses, setSelectedCourses] = useState<CourseRow[]>([getDefaultRow()]);

  useEffect(() => {
    if (availableYears.length > 0) {
      const defaultYear = availableYears[0];
      const defaultDept = ObjectKeys(dynamicTimetableData[defaultYear])[0] || '';
      const defaultType = ObjectKeys(dynamicTimetableData[defaultYear]?.[defaultDept])[0] || '';
      setSelectedCourses([{ year: defaultYear, dept: defaultDept, type: defaultType, course: '', preferredSection: '' }]);
      setDefaultBatch(defaultYear);
      setDefaultDept(defaultDept);
    }
  }, [availableYears, dynamicTimetableData]);
  const [hasPreferences, setHasPreferences] = useState(false);
  const [optimizationMode, setOptimizationMode] = useState('balanced');
  const [customWeights, setCustomWeights] = useState({
    earlyMorning: 50,
    lateAfternoon: 50,
    middayBreak: 50,
    gaps: 50,
    consecutiveClasses: 50,
    daysOnCampus: 50,
  });
  const [result, setResult] = useState<{ totalFound: number; options: ValidSchedule[] } | null>(null);
  const [error, setError] = useState('');

  const handleWeightChange = (key: keyof typeof customWeights, newValue: number) => {
    setCustomWeights(prev => ({ ...prev, [key]: newValue }));
  };

  const loadDefaultCoursesForVerification = (batch: string, dept: string) => {
    const yearData = dynamicTimetableData[batch];
    const courses: { course: string, type: string, selected: boolean }[] = [];
    if (yearData && yearData[dept]) {
      const deptData = yearData[dept];
      for (const type in deptData) {
        if (type !== 'repeat') {
          for (const courseName in deptData[type]) {
            courses.push({ course: courseName, type, selected: true });
          }
        }
      }
    }
    setDefaultCourseSelections(courses);
    setDefaultCoursesVerified(false);
    setResult(null);
  };

  const handleProceed = () => {
    if (defaultCourseSelections.length === 0) {
      loadDefaultCoursesForVerification(defaultBatch, defaultDept);
    }
    setIsDefaultDrawerOpen(true);
  };

  // --- Row Management ---
  const addCourse = () => {
    const lastRow = selectedCourses[selectedCourses.length - 1];
    setSelectedCourses([...selectedCourses, { ...lastRow, course: '', preferredSection: '' }]);
  };

  const removeCourse = (index: number) => {
    const newCourses = selectedCourses.filter((_, i) => i !== index);
    setSelectedCourses(newCourses.length ? newCourses : [getDefaultRow()]);
  };

  const updateRowField = (index: number, field: keyof CourseRow, value: string) => {
    const newCourses = [...selectedCourses];
    const row = { ...newCourses[index] };

    row[field] = value;

    if (field === 'year') {
      const depts = ObjectKeys(dynamicTimetableData[value]);
      row.dept = depts[0] || '';
      const types = ObjectKeys(dynamicTimetableData[value]?.[row.dept]);
      row.type = types[0] || '';
      row.course = '';
      row.preferredSection = '';
    } else if (field === 'dept') {
      const types = ObjectKeys(dynamicTimetableData[row.year]?.[value]);
      row.type = types[0] || '';
      row.course = '';
      row.preferredSection = '';
    } else if (field === 'type') {
      row.course = '';
      row.preferredSection = '';
    } else if (field === 'course') {
      row.preferredSection = '';
    }

    newCourses[index] = row;
    setSelectedCourses(newCourses);
    setResult(null);
  };

  // --- Core Algorithm ---
  const parseTime = (timeStr: string) => {
    const [start, end] = timeStr.split('-');
    const toMinutes = (tS: string) => {
      let [h, m] = tS.split(':').map(Number);
      if (h >= 1 && h <= 7) h += 12; // PM shift
      return h * 60 + m;
    };
    return [toMinutes(start), toMinutes(end)];
  };

  const isClash = (currentSlots: Slot[], newSlots: Slot[]) => {
    for (const n of newSlots) {
      for (const s of currentSlots) {
        if (n.day === s.day) {
          if (!(n.end <= s.start || n.start >= s.end)) return true;
        }
      }
    }
    return false;
  };

  const calculateWorkloadMetrics = (slots: Slot[]) => {
    const days: Record<string, Slot[]> = {};
    slots.forEach(s => {
      if (!days[s.day]) days[s.day] = [];
      days[s.day].push(s);
    });

    let score = 0;
    let totalBadGapMinutes = 0;
    let maxClassesInOneDay = 0;
    let missedMiddayBreaks = 0;
    let totalEarlyClasses = 0;
    let totalLateClasses = 0;
    let totalConsecutivePenalties = 0;

    let maxConsecutiveAMClasses = 1;
    let hasBackToBackPMClasses = false;

    // New Comfort Score Deductions
    let totalComfortDeductions = 0;

    for (const daySlots of Object.values(days)) {
      daySlots.sort((a, b) => a.start - b.start);

      const starts = daySlots.map(s => s.start);
      const ends = daySlots.map(s => s.end);
      const minStart = Math.min(...starts);
      const maxEnd = Math.max(...ends);

      const span = maxEnd - minStart;
      maxClassesInOneDay = Math.max(maxClassesInOneDay, daySlots.length);

      let dayBadGapMinutes = 0;
      let middayBreakAchieved = false;

      let dayConsecutiveClasses = 1;
      let dayFatiguePenalty = 0;
      let currentStreakAfternoonClasses = daySlots[0].end > AFTERNOON_START_MINUTES ? 1 : 0;

      for (let i = 0; i < daySlots.length - 1; i++) {
        const gapStart = daySlots[i].end;
        const gapEnd = daySlots[i + 1].start;
        const gapDuration = gapEnd - gapStart;

        if (gapDuration <= 20) {
          dayConsecutiveClasses++;
          if (daySlots[i + 1].end > AFTERNOON_START_MINUTES) {
            currentStreakAfternoonClasses++;
          }

          const hasAfternoonFatigueBlock =
            currentStreakAfternoonClasses >= 2 &&
            daySlots[i + 1].end >= AFTERNOON_FATIGUE_END_MINUTES;

          if (hasAfternoonFatigueBlock) {
            dayFatiguePenalty += 300;
            hasBackToBackPMClasses = true;
            totalConsecutivePenalties += 1;
            totalComfortDeductions += 25; // 25% penalty for consecutive afternoon stretch reaching 3:50 PM+
          } else {
            maxConsecutiveAMClasses = Math.max(maxConsecutiveAMClasses, dayConsecutiveClasses);
            if (dayConsecutiveClasses > 2) {
              dayFatiguePenalty += 150;
              totalConsecutivePenalties += 1;
              totalComfortDeductions += 10; // 10% penalty for 3+ AM classes
            }
          }
        } else {
          dayConsecutiveClasses = 1;
          currentStreakAfternoonClasses = daySlots[i + 1].end > AFTERNOON_START_MINUTES ? 1 : 0;

          // Midday Break logic: Must start between 11:30 AM and 2:30 PM
          const isNoonGap = gapStart >= (11 * 60 + 30) && gapStart <= (14 * 60 + 30);
          if (isNoonGap && gapDuration >= 30 && gapDuration <= 100) {
            middayBreakAchieved = true;
            dayBadGapMinutes += (gapDuration * 0.1);
          } else {
            dayBadGapMinutes += gapDuration;
          }
        }
      }

      // Midday Break Penalty Logic
      const arrivedEarly = minStart <= 11 * 60 + 30; // 11:30 AM or earlier
      const onCampusDuringMidday = maxEnd >= 13 * 60 + 30; // 1:30 PM or later

      if (arrivedEarly && onCampusDuringMidday && !middayBreakAchieved) {
        missedMiddayBreaks += 1;
        score += 200;
        totalComfortDeductions += 20; // 20% penalty for missing Midday Break
      }

      totalBadGapMinutes += dayBadGapMinutes;

      score += span;
      score += (dayBadGapMinutes * 1.5);
      score += dayFatiguePenalty;

      if (daySlots.length > 3) {
        score += (daySlots.length - 3) * 120;
        totalComfortDeductions += (daySlots.length - 3) * 5; // 5% penalty per extra class
      }

      if (minStart <= 8 * 60 + 30) {
        score += 40;
        totalEarlyClasses += 1;
      }
      if (maxEnd >= 16 * 60) {
        score += 50;
        totalLateClasses += 1;
      }
    }

    // Deduct 1% from comfort for every 10 mins of bad gaps
    totalComfortDeductions += (totalBadGapMinutes / 10);

    // Ensure score stays between 0 and 100
    const comfortScore = Math.max(0, Math.min(100, Math.round(100 - totalComfortDeductions)));

    return {
      score,
      totalBadGapMinutes,
      maxClassesInOneDay,
      missedMiddayBreaks,
      maxConsecutiveAMClasses,
      hasBackToBackPMClasses,
      totalEarlyClasses,
      totalLateClasses,
      totalConsecutivePenalties,
      comfortScore // Export the new UX metric
    };
  };

  const handleOptimize = () => {
    setError('');
    setResult(null);

    let coursesToOptimize: CourseRow[] = [];

    if (inputMode === 'custom') {
      coursesToOptimize = selectedCourses.filter(c => c.course !== '');
    } else {
      if (!defaultCoursesVerified) {
        setError('Please verify the course list before optimizing.');
        return;
      }
      for (const item of defaultCourseSelections) {
        if (item.selected) {
          coursesToOptimize.push({
            year: defaultBatch,
            dept: defaultDept,
            type: item.type,
            course: item.course,
            preferredSection: '',
          });
        }
      }
    }

    if (coursesToOptimize.length === 0) {
      setError('Please select at least one course or a valid default batch/department.');
      return;
    }

    const courseNames = coursesToOptimize.map(c => c.course);
    if (new Set(courseNames).size !== courseNames.length) {
      setError('You have duplicate courses selected. Please remove them.');
      return;
    }

    const courseData: Record<string, any> = {};
    for (const item of coursesToOptimize) {
      const data = dynamicTimetableData[item.year]?.[item.dept]?.[item.type]?.[item.course];
      if (!data) {
        setError(`Data for '${item.course}' is missing.`);
        return;
      }
      courseData[item.course] = data;
    }

    const allValidSchedules: ValidSchedule[] = [];

    const backtrack = (courseIdx: number, currentSchedule: ScheduleItem[], currentSlots: Slot[]) => {
      if (courseIdx === coursesToOptimize.length) {
        const activeDays = new Set(currentSlots.map(s => s.day));
        const metrics = calculateWorkloadMetrics(currentSlots);

        let customScore = 0;
        if (optimizationMode === 'custom') {
          const totalWeight = Object.values(customWeights).reduce((a, b) => a + b, 0);
          if (totalWeight > 0) {
            // Normalize weights so the final score is consistent regardless of scale
            const norm = (w: number) => w / totalWeight;

            customScore += (metrics.totalEarlyClasses * norm(customWeights.earlyMorning) * 100);
            customScore += (metrics.totalLateClasses * norm(customWeights.lateAfternoon) * 100);
            customScore += (metrics.missedMiddayBreaks * norm(customWeights.middayBreak) * 500); // High impact
            customScore += (metrics.totalBadGapMinutes * norm(customWeights.gaps) * 5);
            customScore += (metrics.totalConsecutivePenalties * norm(customWeights.consecutiveClasses) * 200);
            customScore += (activeDays.size * norm(customWeights.daysOnCampus) * 300);
          }
        }

        allValidSchedules.push({
          activeDays: activeDays.size,
          maxOffDays: 5 - activeDays.size,
          workloadScore: metrics.score,
          comfortScore: metrics.comfortScore,
          totalBadGapMinutes: metrics.totalBadGapMinutes,
          maxClassesInOneDay: metrics.maxClassesInOneDay,
          missedMiddayBreaks: metrics.missedMiddayBreaks,
          maxConsecutiveAMClasses: metrics.maxConsecutiveAMClasses,
          hasBackToBackPMClasses: metrics.hasBackToBackPMClasses,
          totalEarlyClasses: metrics.totalEarlyClasses,
          totalLateClasses: metrics.totalLateClasses,
          totalConsecutivePenalties: metrics.totalConsecutivePenalties,
          customScore: optimizationMode === 'custom' ? customScore : undefined,
          schedule: [...currentSchedule]
        });
        return;
      }

      const currentItem = coursesToOptimize[courseIdx];
      const currentCourseName = currentItem.course;
      const sections = courseData[currentCourseName];

      let sectionsToTry = Object.entries(sections);
      if (hasPreferences && currentItem.preferredSection) {
        if (sections[currentItem.preferredSection]) {
          sectionsToTry = [[currentItem.preferredSection, sections[currentItem.preferredSection]]];
        } else {
          setError(`Preferred section ${currentItem.preferredSection} for ${currentCourseName} is invalid.`);
          return;
        }
      }

      for (const [sectionName, daysDict] of sectionsToTry) {
        const newSlots: Slot[] = [];
        for (const [day, classes] of Object.entries(daysDict as Record<string, any[]>)) {
          if (day === 'Saturday' || day === 'Sunday') continue;

          for (const cls of classes) {
            const [startMin, endMin] = parseTime(cls.time);
            newSlots.push({ day, start: startMin, end: endMin });
          }
        }

        if (!isClash(currentSlots, newSlots)) {
          currentSchedule.push({
            course: currentCourseName,
            section: sectionName,
            config: `${currentItem.year} ${currentItem.dept} ${currentItem.type}`,
            isLocked: hasPreferences && currentItem.preferredSection === sectionName
          });

          backtrack(courseIdx + 1, currentSchedule, [...currentSlots, ...newSlots]);
          currentSchedule.pop();
        }
      }
    };

    backtrack(0, [], []);

    if (allValidSchedules.length === 0) {
      setError('No clash-free timetable exists within the 5-day workweek. Check your locked sections or selected courses.');
    } else {
      // Calculate penalty for sorting
      allValidSchedules.forEach(a => {
        if (optimizationMode === 'max_off_days') {
          a.penalty = (a.activeDays * 10000) + a.workloadScore;
        } else if (optimizationMode === 'min_workload') {
          a.penalty = (a.workloadScore * 100) + a.activeDays;
        } else if (optimizationMode === 'balanced') {
          a.penalty = a.workloadScore + (a.activeDays * 250);
        } else if (optimizationMode === 'custom') {
          a.penalty = a.customScore || 0;
        }
      });

      // Sort by penalty
      allValidSchedules.sort((a, b) => (a.penalty || 0) - (b.penalty || 0));

      // Calculate relative Fit Score (0-100%) mapped to 60-100% range for visual positivity
      const minPenalty = allValidSchedules[0].penalty || 0;
      const maxPenalty = allValidSchedules[allValidSchedules.length - 1].penalty || minPenalty;
      const penaltyRange = maxPenalty - minPenalty;

      allValidSchedules.forEach(a => {
        if (penaltyRange === 0) {
          a.fitScore = 100;
        } else {
          a.fitScore = Math.round(100 - (((a.penalty || 0) - minPenalty) / penaltyRange) * 40); // Scales 100% down to 60%
        }
      });

      setResult({
        totalFound: allValidSchedules.length,
        options: allValidSchedules.slice(0, 15)
      });
    }
  };

  // --- UI Render ---
  return (
    <div className="w-full mx-auto pb-24 rounded-xl bg-[var(--color-bg)]">
      <div className="flex flex-col md:flex-row md:justify-between md:items-start mb-6">
        <div>
          <h2 className="text-2xl font-bold text-[var(--color-text-primary)]">Advanced Timetable Optimizer</h2>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
            Configure the exact batch, department, and type for every course you plan to take. (5-Day Week Mode).
          </p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 mb-8 bg-[var(--color-bg-subtle)] p-4 rounded-lg border border-[var(--color-border)]">
        <div className="flex-1">
          <label className="block text-sm font-bold text-[var(--color-text-primary)] mb-3">Optimization Goal</label>
          <div className="space-y-3">
            <label className={`flex items-start gap-3 cursor-pointer p-3 rounded-xl border-2 transition-all duration-200 group ${optimizationMode === 'max_off_days'
              ? 'bg-[var(--accent-cs-bg)] border-[var(--accent-cs)] shadow-md ring-1 ring-[var(--accent-cs)]/20'
              : 'bg-transparent border-[var(--color-border)] hover:border-[var(--color-border-strong)] hover:bg-[var(--color-bg-raised)]'
              }`}>
              <input
                type="radio"
                name="optMode"
                className="w-4 h-4 mt-1 text-[var(--accent-cs)] focus:ring-[var(--accent-cs)] border-[var(--color-border-strong)]"
                checked={optimizationMode === 'max_off_days'}
                onChange={() => { setOptimizationMode('max_off_days'); setResult(null); }}
              />
              <span className="text-sm text-[var(--color-text-secondary)]">
                <strong className={`block mb-0.5 transition-colors ${optimizationMode === 'max_off_days' ? 'text-[var(--accent-cs)]' : 'text-[var(--color-text-primary)]'}`}>Maximize Off-Days</strong>
                Crams classes into fewest days possible.
              </span>
            </label>

            <label className={`flex items-start gap-3 cursor-pointer p-3 rounded-xl border-2 transition-all duration-200 group ${optimizationMode === 'balanced'
              ? 'bg-[var(--color-success-bg)] border-[var(--color-success)] shadow-md ring-1 ring-[var(--color-success)]/20'
              : 'bg-transparent border-[var(--color-border)] hover:border-[var(--color-border-strong)] hover:bg-[var(--color-bg-raised)]'
              }`}>
              <input
                type="radio"
                name="optMode"
                className="w-4 h-4 mt-1 text-[var(--color-success)] focus:ring-[var(--color-success)] border-[var(--color-border-strong)]"
                checked={optimizationMode === 'balanced'}
                onChange={() => { setOptimizationMode('balanced'); setResult(null); }}
              />
              <span className="text-sm text-[var(--color-text-secondary)]">
                <strong className={`block mb-0.5 transition-colors ${optimizationMode === 'balanced' ? 'text-[var(--color-success)]' : 'text-[var(--color-text-primary)]'}`}>Balanced (Recommended)</strong>
                Maximizes off-days, but gracefully accepts an extra campus day if it saves you from a brutal workload.
              </span>
            </label>

            <label className={`flex items-start gap-3 cursor-pointer p-3 rounded-xl border-2 transition-all duration-200 group ${optimizationMode === 'min_workload'
              ? 'bg-[var(--accent-ai-bg)] border-[var(--accent-ai)] shadow-md ring-1 ring-[var(--accent-ai)]/20'
              : 'bg-transparent border-[var(--color-border)] hover:border-[var(--color-border-strong)] hover:bg-[var(--color-bg-raised)]'
              }`}>
              <input
                type="radio"
                name="optMode"
                className="w-4 h-4 mt-1 text-[var(--accent-ai)] focus:ring-[var(--accent-ai)] border-[var(--color-border-strong)]"
                checked={optimizationMode === 'min_workload'}
                onChange={() => { setOptimizationMode('min_workload'); setResult(null); }}
              />
              <span className="text-sm text-[var(--color-text-secondary)]">
                <strong className={`block mb-0.5 transition-colors ${optimizationMode === 'min_workload' ? 'text-[var(--accent-ai)]' : 'text-[var(--color-text-primary)]'}`}>Minimize Workload</strong>
                Absolute priority on balanced days, avoids heavy gaps, and ensures time for Midday Break.
              </span>
            </label>

            <label
              className={`flex items-start gap-3 cursor-pointer p-3 rounded-xl transition-all duration-200 group relative ${optimizationMode === 'custom'
                ? 'shadow-md border-2 border-transparent'
                : 'bg-transparent border-2 border-[var(--color-border)] hover:border-[var(--color-border-strong)] hover:bg-[var(--color-bg-raised)]'
                }`}
              style={optimizationMode === 'custom' ? {
                backgroundImage: 'linear-gradient(var(--color-bg-raised), var(--color-bg-raised)), var(--today-border-gradient)',
                backgroundOrigin: 'border-box',
                backgroundClip: 'padding-box, border-box',
              } : {}}
            >
              <input
                type="radio"
                name="optMode"
                className="w-4 h-4 mt-1 z-10 focus:ring-offset-0 border-[var(--color-border-strong)]"
                checked={optimizationMode === 'custom'}
                onChange={() => { setOptimizationMode('custom'); setResult(null); }}
              />
              <span className="text-sm text-[var(--color-text-secondary)] w-full z-10">
                <strong className={`block mb-0.5 transition-colors ${optimizationMode === 'custom' ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-primary)]'}`}>Custom Weights</strong>
                Tune exactly how much you care about mornings, afternoons, gaps, and breaks.
              </span>
            </label>

            {optimizationMode === 'custom' && (
              <div className="pl-7 pr-2 py-2 flex flex-col gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                {[
                  { key: 'earlyMorning', label: 'Avoid Early Mornings (8:30 AM)' },
                  { key: 'lateAfternoon', label: 'Avoid Late Afternoons (4:00 PM+)' },
                  { key: 'middayBreak', label: 'Secure Midday Break' },
                  { key: 'gaps', label: 'Minimize Unproductive Gaps' },
                  { key: 'consecutiveClasses', label: 'Avoid Fatigue (Back-to-Back)' },
                  { key: 'daysOnCampus', label: 'Maximize Off-Days' },
                ].map(({ key, label }) => (
                  <div key={key} className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-medium text-[var(--color-text-primary)]">{label}</span>
                      <span className="font-mono font-bold text-[var(--color-text-secondary)] w-10 text-right">
                        {customWeights[key as keyof typeof customWeights]}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={customWeights[key as keyof typeof customWeights]}
                      onChange={(e) => handleWeightChange(key as keyof typeof customWeights, parseInt(e.target.value, 10))}
                      className="w-full h-1.5 bg-[var(--color-border)] rounded-lg appearance-none cursor-pointer accent-[var(--color-text-primary)]"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="w-px bg-[var(--color-border)] hidden lg:block"></div>

        <div className="flex-1">
          <label className="block text-sm font-bold text-[var(--color-text-primary)] mb-3">Section Constraints</label>
          <label className="flex items-center gap-2 cursor-pointer bg-[var(--color-bg-raised)] p-2 border border-[var(--color-border)] rounded-md w-max shadow-sm hover:border-[var(--color-border-strong)] transition-colors">
            <input
              type="checkbox"
              className="w-4 h-4 text-[var(--accent-cs)] rounded focus:ring-[var(--accent-cs)]"
              checked={hasPreferences}
              onChange={e => { setHasPreferences(e.target.checked); setResult(null); }}
            />
            <span className="text-sm font-medium text-[var(--color-text-secondary)] select-none">
              I want to lock in preferred sections manually
            </span>
          </label>
        </div>
      </div>

      {/* ─── Input Mode Toggle ────────────────────────────────────────────────── */}
      <div className="mb-6 flex justify-center">
        <div className="flex p-1 bg-[var(--color-bg-subtle)] rounded-lg border border-[var(--color-border)]">
          {(['custom', 'default'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => { setInputMode(mode); setResult(null); }}
              className={`px-6 py-1.5 rounded-md font-mono text-xs font-bold transition-colors ${inputMode === mode
                ? 'bg-[var(--color-text-primary)] text-[var(--color-bg)] shadow-sm'
                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                }`}
            >
              {mode === 'custom' ? 'Custom Courses' : 'Default Courses'}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Course Input Area ────────────────────────────────────────────────── */}
      {inputMode === 'custom' ? (
        <>
          <div className="space-y-4 mb-6">
            {selectedCourses.map((row, idx) => {
              const availableDepts = ObjectKeys(dynamicTimetableData[row.year]);
              const availableTypes = ObjectKeys(dynamicTimetableData[row.year]?.[row.dept]);
              const availableCourses = ObjectKeys(dynamicTimetableData[row.year]?.[row.dept]?.[row.type]);
              const availableSections = row.course
                ? ObjectKeys(dynamicTimetableData[row.year]?.[row.dept]?.[row.type]?.[row.course])
                : [];

              return (
                <div key={idx} className="flex flex-wrap lg:flex-nowrap gap-3 p-4 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-raised)] items-end shadow-sm">
                  <div className="flex-1 min-w-[80px]">
                    <label className="block text-xs font-medium text-[var(--color-text-tertiary)] mb-1 uppercase tracking-wider">Year</label>
                    <select
                      className="w-full p-2 border border-[var(--color-border)] rounded-md outline-none focus:ring-2 focus:ring-[var(--accent-cs)] text-sm bg-[var(--color-bg)] text-[var(--color-text-primary)]"
                      value={row.year} onChange={e => updateRowField(idx, 'year', e.target.value)}>
                      {availableYears.map((y: string) => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>

                  {!isSummer && (
                    <div className="flex-1 min-w-[80px]">
                      <label className="block text-xs font-medium text-[var(--color-text-tertiary)] mb-1 uppercase tracking-wider">Dept</label>
                      <select
                        className="w-full p-2 border border-[var(--color-border)] rounded-md outline-none focus:ring-2 focus:ring-[var(--accent-cs)] text-sm bg-[var(--color-bg)] text-[var(--color-text-primary)]"
                        value={row.dept} onChange={e => updateRowField(idx, 'dept', e.target.value)}>
                        {availableDepts.map((d: string) => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                  )}

                  {!isSummer && (
                    <div className="flex-1 min-w-[80px]">
                      <label className="block text-xs font-medium text-[var(--color-text-tertiary)] mb-1 uppercase tracking-wider">Type</label>
                      <select
                        className="w-full p-2 border border-[var(--color-border)] rounded-md outline-none focus:ring-2 focus:ring-[var(--accent-cs)] text-sm bg-[var(--color-bg)] text-[var(--color-text-primary)]"
                        value={row.type} onChange={e => updateRowField(idx, 'type', e.target.value)}>
                        {availableTypes.map((t: string) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                  )}

                  <div className="flex-[2] min-w-[150px]">
                    <label className="block text-xs font-bold text-[var(--color-text-primary)] mb-1">Course</label>
                    <select
                      className="w-full p-2 border border-[var(--color-border-strong)] rounded-md outline-none focus:ring-2 focus:ring-[var(--accent-cs)] font-medium text-sm bg-[var(--color-bg)] text-[var(--color-text-primary)]"
                      value={row.course}
                      onChange={e => updateRowField(idx, 'course', e.target.value)}
                    >
                      <option value="">-- Select Course --</option>
                      {availableCourses.map((c: string) => {
                        const catalogEntry = findMatchingCatalogEntry(c, summerCatalog);
                        const label = catalogEntry?.displayName ?? c;
                        return <option key={c} value={c}>{label}</option>;
                      })}
                    </select>
                  </div>

                  {hasPreferences && (
                    <div className="flex-1 min-w-[120px]">
                      <label className="block text-xs font-bold text-[var(--accent-ee)] mb-1">Lock Section</label>
                      <select
                        disabled={!row.course}
                        className="w-full p-2 border border-[var(--color-border)] bg-[var(--accent-ee-bg)] rounded-md outline-none focus:ring-2 focus:ring-[var(--accent-ee)] font-medium text-sm disabled:opacity-50 text-[var(--color-text-primary)]"
                        value={row.preferredSection}
                        onChange={e => updateRowField(idx, 'preferredSection', e.target.value)}
                      >
                        <option value="">Optimize Any</option>
                        {availableSections.map((s: string) => (
                          <option key={s} value={s}>Section {s}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <button
                    onClick={() => removeCourse(idx)}
                    className="px-4 py-2 text-red-500 hover:bg-red-500/10 bg-transparent border border-red-500/30 rounded-md font-medium transition-colors text-sm h-[38px] flex items-center justify-center"
                  >
                    Remove
                  </button>
                </div>
              );
            })}
          </div>
          <button
            onClick={addCourse}
            className="mb-8 text-[var(--color-text-secondary)] font-bold hover:text-[var(--color-text-primary)] transition-colors flex items-center gap-1"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            Add Another Course
          </button>
        </>
      ) : (
        <div className="mb-8 flex flex-col items-center gap-4">
          <div className="flex gap-4 p-4 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-raised)] shadow-sm w-full">
            <div className="flex-1">
              <label className="block text-xs font-medium text-[var(--color-text-tertiary)] mb-1 uppercase tracking-wider">Batch/Year</label>
              <select
                className="w-full p-2 border border-[var(--color-border-strong)] rounded-md outline-none focus:ring-2 focus:ring-[var(--accent-cs)] text-sm bg-[var(--color-bg)] text-[var(--color-text-primary)]"
                value={defaultBatch}
                onChange={e => {
                  const val = e.target.value;
                  setDefaultBatch(val);
                  if (val === 'Summer' || isSummer) {
                    setDefaultDept('CS');
                  }
                  setResult(null);
                  setDefaultCoursesVerified(false);
                  setDefaultCourseSelections([]);
                }}
              >
                {availableYears.map((y: string) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            {!isSummer && (
              <div className="flex-1">
                <label className="block text-xs font-medium text-[var(--color-text-tertiary)] mb-1 uppercase tracking-wider">Department</label>
                <select
                  className="w-full p-2 border border-[var(--color-border-strong)] rounded-md outline-none focus:ring-2 focus:ring-[var(--accent-cs)] text-sm bg-[var(--color-bg)] text-[var(--color-text-primary)]"
                  value={defaultDept}
                  onChange={e => {
                    setDefaultDept(e.target.value);
                    setResult(null);
                    setDefaultCoursesVerified(false);
                    setDefaultCourseSelections([]);
                  }}
                >
                  {ObjectKeys(dynamicTimetableData[defaultBatch] || {}).map((d: string) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            )}
            <div className="flex items-end">
              <button
                onClick={handleProceed}
                className="h-[38px] px-6 rounded-md bg-[var(--color-text-primary)] text-[var(--color-bg)] font-body text-sm font-bold transition-all active:scale-95 whitespace-nowrap"
              >
                Proceed
              </button>
            </div>
          </div>
          <p className="text-xs text-center text-[var(--color-text-tertiary)] font-mono">
            Select your batch and department, then click Proceed to verify courses.
          </p>
        </div>
      )}

      <button
        onClick={handleOptimize}
        disabled={inputMode === 'default' && !defaultCoursesVerified}
        className={`w-full py-4 rounded-xl font-bold text-lg transition-all shadow-lg active:scale-[0.99] text-white
          ${(inputMode === 'default' && !defaultCoursesVerified)
            ? 'bg-[var(--color-bg-subtle)] text-[var(--color-text-tertiary)] opacity-60 cursor-not-allowed shadow-none'
            : optimizationMode === 'max_off_days' ? 'bg-[var(--accent-cs)] shadow-[var(--accent-cs)]/20' :
              optimizationMode === 'balanced' ? 'bg-[var(--color-success)] shadow-[var(--color-success)]/20' :
                optimizationMode === 'min_workload' ? 'bg-[var(--accent-ai)] shadow-[var(--accent-ai)]/20' :
                  ''}`}
        style={(optimizationMode === 'custom' && !(inputMode === 'default' && !defaultCoursesVerified)) ? {
          background: 'var(--today-label-bg)',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
        } : {}}
      >
        {inputMode === 'default' && !defaultCoursesVerified ? 'Verify Courses to Proceed' : 'Find the Best Schedules'}
      </button>

      {/* ─── Default Courses Verification Drawer ──────────────────────────────── */}
      {isDefaultDrawerOpen && (
        <div ref={verifyBackdropRef} className="fixed inset-0 z-50 flex items-end justify-center md:items-start md:justify-end bg-black/40 backdrop-blur-sm animate-in fade-in duration-300 ease-out" onClick={(e) => { if (e.target === e.currentTarget) verifyCloseDrawer(); }}>
          <div ref={verifyDrawerRef} className="w-full md:w-96 bg-[var(--color-bg-raised)] shadow-2xl md:h-[calc(100dvh-56px)] md:mt-14 flex flex-col animate-in slide-in-from-bottom-4 md:slide-in-from-right-4 duration-300 ease-out rounded-t-3xl md:rounded-t-none md:rounded-l-2xl border-t md:border-t-0 border-l-0 md:border-l border-[var(--color-border)] h-[60dvh]">
            <div ref={verifyHandleRef} className="md:hidden flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing">
              <div className="w-10 h-1 rounded-full bg-[var(--color-border-strong)] pointer-events-none" />
            </div>
            <div className="p-5 pt-2 md:pt-5 border-b border-[var(--color-border)] flex items-center justify-between bg-[var(--color-bg-subtle)]/50 md:rounded-tl-2xl">
              <div>
                <h3 className="font-display text-xl">Verify Courses</h3>
                <p className="text-xs text-[var(--color-text-secondary)] font-mono mt-1">Uncheck courses you aren&apos;t taking</p>
              </div>
              <button onClick={verifyCloseDrawer} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--color-border)] transition-colors text-[var(--color-text-secondary)]">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {defaultCourseSelections.length === 0 ? (
                <p className="text-sm text-[var(--color-text-tertiary)] italic text-center py-10">No regular courses found for this selection.</p>
              ) : (
                <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-3">
                  {defaultCourseSelections.map((item, idx) => (
                    <label key={idx} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${item.selected ? 'bg-[var(--color-bg)] border-[var(--color-border-strong)]' : 'bg-transparent border-[var(--color-border)] opacity-60 hover:opacity-100'}`}>
                      <input
                        type="checkbox"
                        className="w-5 h-5 rounded border-[var(--color-border-strong)] text-[var(--color-text-primary)] focus:ring-[var(--color-text-primary)] shrink-0"
                        checked={item.selected}
                        onChange={(e) => {
                          const newSelections = [...defaultCourseSelections];
                          newSelections[idx].selected = e.target.checked;
                          setDefaultCourseSelections(newSelections);
                        }}
                      />
                      <div className="flex flex-col min-w-0">
                        <span className={`font-bold text-sm truncate ${item.selected ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-secondary)]'}`}>
                          {findMatchingCatalogEntry(item.course, summerCatalog)?.displayName ?? item.course}
                        </span>
                        <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-text-tertiary)] truncate">{item.type}</span>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="p-5 border-t border-[var(--color-border)] bg-[var(--color-bg-raised)] md:rounded-bl-2xl">
              <button
                onClick={() => {
                  setDefaultCoursesVerified(true);
                  setIsDefaultDrawerOpen(false);
                }}
                className="w-full py-3 rounded-lg font-body font-bold bg-[var(--color-text-primary)] text-[var(--color-bg)] hover:opacity-90 transition-all active:scale-[0.98]"
              >
                Verify & Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Results Display */}
      {error && (
        <div className="mt-6 p-4 bg-red-500/10 text-red-600 border border-red-500/20 rounded-lg flex items-center gap-3">
          <span className="font-medium">{error}</span>
        </div>
      )}

      {result && (
        <div className="mt-10 border-t border-[var(--color-border)] pt-8">
          <div className="mb-6 flex justify-between items-end">
            <div>
              <h3 className="text-xl font-bold text-[var(--color-text-primary)]">
                Top Schedules ({
                  optimizationMode === 'max_off_days' ? 'Max Off-Days' :
                    optimizationMode === 'balanced' ? 'Balanced' : 'Min Workload'
                })
              </h3>
              <p className="text-[var(--color-text-secondary)] mt-1">
                Found {result.totalFound} valid combinations. Showing top {result.options.length}.
              </p>
            </div>
          </div>

          <div className="space-y-6">
            {result.options.map((option, optIdx) => {
              const isAbsoluteBest = optIdx === 0;

              // Color coding for Comfort Score
              const getComfortColor = (score: number) => {
                if (score >= 90) return 'text-emerald-600 dark:text-emerald-400';
                if (score >= 70) return 'text-amber-500 dark:text-amber-400';
                return 'text-rose-500 dark:text-rose-400';
              };

              let borderClass = 'border-[var(--color-border)] bg-[var(--color-bg-raised)]';
              let badgeClass = 'bg-[var(--color-bg-subtle)] text-[var(--color-text-secondary)]';

              if (isAbsoluteBest) {
                if (optimizationMode === 'max_off_days') {
                  borderClass = 'border-[var(--accent-cs)] bg-[var(--accent-cs-bg)]';
                  badgeClass = 'bg-[var(--accent-cs)] text-white';
                } else if (optimizationMode === 'balanced') {
                  borderClass = 'border-[var(--color-success)] bg-[var(--color-success-bg)]';
                  badgeClass = 'bg-[var(--color-success)] text-white';
                } else {
                  borderClass = 'border-[var(--accent-ai)] bg-[var(--accent-ai-bg)]';
                  badgeClass = 'bg-[var(--accent-ai)] text-white';
                }
              }

              return (
                <div key={optIdx} className={`p-5 rounded-xl border-2 transition-all flex flex-col gap-4 ${borderClass}`}>

                  <div className="flex flex-col xl:flex-row justify-between xl:items-center pb-3 border-b border-[var(--color-border)] gap-4">
                    <div className="flex items-center gap-4">
                      <span className={`text-sm font-bold px-3 py-1 rounded-lg ${badgeClass}`}>
                        Rank #{optIdx + 1}
                      </span>
                      <div className="flex flex-col">
                        <span className={`text-xl font-black ${isAbsoluteBest ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-primary)] opacity-90'}`}>
                          Fit Score: {option.fitScore}%
                        </span>
                        <span className="text-[10px] text-[var(--color-text-secondary)] font-medium uppercase tracking-wider flex items-center gap-1.5 mt-0.5">
                          Comfort: <span className={getComfortColor(option.comfortScore)}>{option.comfortScore}%</span>
                          <span className="opacity-30">·</span>
                          {option.maxOffDays} Off-Days
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap xl:flex-nowrap items-center gap-3 text-xs font-medium text-[var(--color-text-primary)]">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Midday Break Badges */}
                        {option.missedMiddayBreaks === 0 ? (
                          <span className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5">
                            🕌 Midday Break Secured
                          </span>
                        ) : (
                          <span className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 px-2.5 py-1.5 rounded-lg">
                            ⚠️ Missed Midday Break ({option.missedMiddayBreaks}x)
                          </span>
                        )}

                        {/* Attention Span / Fatigue Badges */}
                        {option.hasBackToBackPMClasses ? (
                          <span className="bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20 px-2.5 py-1.5 rounded-lg">
                            ⚠️ Afternoon Drain (Back-to-Back PM Classes)
                          </span>
                        ) : option.maxConsecutiveAMClasses > 2 ? (
                          <span className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 px-2.5 py-1.5 rounded-lg">
                            ⚠️ Morning Fatigue (3+ Back-to-Back AM Classes)
                          </span>
                        ) : (
                          <span className="bg-[var(--accent-cs-bg)] text-[var(--accent-cs)] border border-[var(--accent-cs)]/20 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5">
                            🧠 Focus Maintained (Well spaced)
                          </span>
                        )}
                      </div>

                      <div className="flex items-center">
                        <a
                          href="/timetable/custom"
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => handlePreview(option.schedule)}
                          className="shrink-0 flex items-center justify-center gap-2 h-9 px-4 rounded-lg font-body text-[11px] font-bold transition-all border bg-[var(--color-text-primary)] text-[var(--color-bg)] border-transparent hover:opacity-90 active:scale-[0.98] shadow-sm"
                        >
                          <span>Preview Timetable</span>
                          <ExternalLink size={12} strokeWidth={2.5} className="opacity-80" />
                        </a>
                      </div>
                    </div>
                  </div>

                  <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {option.schedule.map((item, idx) => (
                      <li key={idx} className="flex justify-between items-center p-3 bg-[var(--color-bg)] rounded-lg border border-[var(--color-border)] shadow-sm hover:border-[var(--color-border-strong)] transition-colors">
                        <div className="flex flex-col pr-2">
                          <span className="font-bold text-[var(--color-text-primary)] text-sm">
                            {findMatchingCatalogEntry(item.course, summerCatalog)?.displayName ?? item.course}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {item.isLocked && <span className="text-xs font-bold text-[var(--accent-ee)]">🔒</span>}
                          <span className={`font-mono text-xs px-2 py-1 rounded border ${item.isLocked ? 'bg-[var(--accent-ee-bg)] border-[var(--accent-ee)]/30 text-[var(--accent-ee)]' : 'bg-[var(--color-bg-subtle)] border-[var(--color-border)] text-[var(--color-text-secondary)]'}`}>
                            Sec {item.section}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
