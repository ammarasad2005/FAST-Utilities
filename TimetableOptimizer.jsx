'use client';

import React, { useState } from 'react';
import timetableData from './timetable.json'; 

const AFTERNOON_START_MINUTES = 13 * 60;
const AFTERNOON_FATIGUE_END_MINUTES = 15 * 60 + 50;

export default function TimetableOptimizer() {
  const ObjectKeys = (obj) => (obj ? Object.keys(obj) : []);
  const availableYears = ObjectKeys(timetableData).filter(k => k !== "__meta__");

  const getDefaultRow = () => {
    const defaultYear = availableYears[0] || '';
    const defaultDept = ObjectKeys(timetableData[defaultYear])[0] || '';
    const defaultType = ObjectKeys(timetableData[defaultYear]?.[defaultDept])[0] || '';
    return { year: defaultYear, dept: defaultDept, type: defaultType, course: '', preferredSection: '' };
  };

  // --- State ---
  const [selectedCourses, setSelectedCourses] = useState([getDefaultRow()]);
  const [hasPreferences, setHasPreferences] = useState(false);
  const [optimizationMode, setOptimizationMode] = useState('balanced'); 
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  // --- Row Management ---
  const addCourse = () => {
    const lastRow = selectedCourses[selectedCourses.length - 1];
    setSelectedCourses([...selectedCourses, { ...lastRow, course: '', preferredSection: '' }]);
  };

  const removeCourse = (index) => {
    const newCourses = selectedCourses.filter((_, i) => i !== index);
    setSelectedCourses(newCourses.length ? newCourses : [getDefaultRow()]);
  };

  const updateRowField = (index, field, value) => {
    const newCourses = [...selectedCourses];
    const row = { ...newCourses[index] };
    
    row[field] = value;
    
    if (field === 'year') {
      const depts = ObjectKeys(timetableData[value]);
      row.dept = depts[0] || '';
      const types = ObjectKeys(timetableData[value]?.[row.dept]);
      row.type = types[0] || '';
      row.course = '';
      row.preferredSection = '';
    } else if (field === 'dept') {
      const types = ObjectKeys(timetableData[row.year]?.[value]);
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
  const parseTime = (timeStr) => {
    const [start, end] = timeStr.split('-');
    const toMinutes = (tS) => {
      let [h, m] = tS.split(':').map(Number);
      if (h >= 1 && h <= 7) h += 12; // PM shift
      return h * 60 + m;
    };
    return [toMinutes(start), toMinutes(end)];
  };

  const isClash = (currentSlots, newSlots) => {
    for (const n of newSlots) {
      for (const s of currentSlots) {
        if (n.day === s.day) {
          if (!(n.end <= s.start || n.start >= s.end)) return true;
        }
      }
    }
    return false;
  };

  const calculateWorkloadMetrics = (slots) => {
    const days = {};
    slots.forEach(s => {
      if (!days[s.day]) days[s.day] = [];
      days[s.day].push(s);
    });

    let score = 0;
    let totalBadGapMinutes = 0;
    let maxClassesInOneDay = 0;
    let missedDhuhrDays = 0;
    
    let maxConsecutiveAMClasses = 1;
    let hasBackToBackPMClasses = false;

    // New Comfort Score Deductions
    let totalComfortDeductions = 0;

    for (const [day, daySlots] of Object.entries(days)) {
      daySlots.sort((a, b) => a.start - b.start);
      
      const starts = daySlots.map(s => s.start);
      const ends = daySlots.map(s => s.end);
      const minStart = Math.min(...starts);
      const maxEnd = Math.max(...ends);
      
      const span = maxEnd - minStart;
      maxClassesInOneDay = Math.max(maxClassesInOneDay, daySlots.length);
      
      let dayBadGapMinutes = 0;
      let dhuhrBreakAchieved = false;

      let dayConsecutiveClasses = 1;
      let dayFatiguePenalty = 0;
      let currentStreakAfternoonClasses = daySlots[0].end > AFTERNOON_START_MINUTES ? 1 : 0;

      for (let i = 0; i < daySlots.length - 1; i++) {
        const gapStart = daySlots[i].end;
        const gapEnd = daySlots[i+1].start;
        const gapDuration = gapEnd - gapStart;

        if (gapDuration <= 20) {
          dayConsecutiveClasses++;

          if (daySlots[i+1].end > AFTERNOON_START_MINUTES) {
            currentStreakAfternoonClasses++;
          }

          const hasAfternoonFatigueBlock =
            currentStreakAfternoonClasses >= 2 &&
            daySlots[i+1].end >= AFTERNOON_FATIGUE_END_MINUTES;

          if (hasAfternoonFatigueBlock) {
            dayFatiguePenalty += 300; 
            hasBackToBackPMClasses = true;
            totalComfortDeductions += 25; // 25% penalty for consecutive afternoon stretch reaching 3:50 PM+
          } else {
            maxConsecutiveAMClasses = Math.max(maxConsecutiveAMClasses, dayConsecutiveClasses);
            if (dayConsecutiveClasses > 2) {
              dayFatiguePenalty += 150; 
              totalComfortDeductions += 10; // 10% penalty for 3+ AM classes
            }
          }
        } else {
          dayConsecutiveClasses = 1;
          currentStreakAfternoonClasses = daySlots[i+1].end > AFTERNOON_START_MINUTES ? 1 : 0;

          const isNoonGap = gapStart >= (11 * 60 + 30) && gapStart <= (14 * 60 + 30);
          if (isNoonGap && gapDuration >= 30 && gapDuration <= 100) {
            dhuhrBreakAchieved = true;
            dayBadGapMinutes += (gapDuration * 0.1); 
          } else {
            dayBadGapMinutes += gapDuration;
          }
        }
      }

      const onCampusDuringNoon = (minStart <= 12 * 60 + 30) && (maxEnd >= 13 * 60 + 30);
      if (onCampusDuringNoon && !dhuhrBreakAchieved) {
        missedDhuhrDays += 1;
        score += 200; 
        totalComfortDeductions += 20; // 20% penalty for missing Dhuhr/Lunch
      }

      totalBadGapMinutes += dayBadGapMinutes;

      score += span; 
      score += (dayBadGapMinutes * 1.5); 
      score += dayFatiguePenalty; 

      if (daySlots.length > 3) {
        score += (daySlots.length - 3) * 120; 
        totalComfortDeductions += (daySlots.length - 3) * 5; // 5% penalty per extra class
      }
      
      if (minStart <= 8 * 60 + 30) score += 40; 
      if (maxEnd >= 16 * 60) score += 50;       
    }

    // Deduct 1% from comfort for every 10 mins of bad gaps
    totalComfortDeductions += (totalBadGapMinutes / 10);
    
    // Ensure score stays between 0 and 100
    const comfortScore = Math.max(0, Math.min(100, Math.round(100 - totalComfortDeductions)));

    return { 
      score, 
      totalBadGapMinutes, 
      maxClassesInOneDay, 
      missedDhuhrDays,
      maxConsecutiveAMClasses,
      hasBackToBackPMClasses,
      comfortScore // Export the new UX metric
    };
  };

  const handleOptimize = () => {
    setError('');
    setResult(null);
    
    const validCourses = selectedCourses.filter(c => c.course !== '');
    
    if (validCourses.length === 0) {
      setError('Please select at least one course.');
      return;
    }

    const courseNames = validCourses.map(c => c.course);
    if (new Set(courseNames).size !== courseNames.length) {
      setError('You have selected duplicate courses. Please remove them.');
      return;
    }

    const courseData = {};
    for (const item of validCourses) {
      const data = timetableData[item.year]?.[item.dept]?.[item.type]?.[item.course];
      if (!data) {
        setError(`Data for '${item.course}' is missing.`);
        return;
      }
      courseData[item.course] = data;
    }

    let allValidSchedules = [];

    const backtrack = (courseIdx, currentSchedule, currentSlots) => {
      if (courseIdx === validCourses.length) {
        const activeDays = new Set(currentSlots.map(s => s.day));
        const metrics = calculateWorkloadMetrics(currentSlots);

        allValidSchedules.push({
          activeDays: activeDays.size,
          maxOffDays: 5 - activeDays.size,
          workloadScore: metrics.score,
          comfortScore: metrics.comfortScore,
          totalBadGapMinutes: metrics.totalBadGapMinutes,
          maxClassesInOneDay: metrics.maxClassesInOneDay,
          missedDhuhrDays: metrics.missedDhuhrDays,
          maxConsecutiveAMClasses: metrics.maxConsecutiveAMClasses,
          hasBackToBackPMClasses: metrics.hasBackToBackPMClasses,
          schedule: [...currentSchedule]
        });
        return;
      }

      const currentItem = validCourses[courseIdx];
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
        const newSlots = [];
        for (const [day, classes] of Object.entries(daysDict)) {
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
      if (optimizationMode === 'max_off_days') {
        allValidSchedules.sort((a, b) => {
          if (a.activeDays !== b.activeDays) return a.activeDays - b.activeDays;
          return a.workloadScore - b.workloadScore;
        });
      } else if (optimizationMode === 'min_workload') {
        allValidSchedules.sort((a, b) => {
          if (a.workloadScore !== b.workloadScore) return a.workloadScore - b.workloadScore;
          return a.activeDays - b.activeDays;
        });
      } else if (optimizationMode === 'balanced') {
        allValidSchedules.sort((a, b) => {
          const balancedScoreA = a.workloadScore + (a.activeDays * 250);
          const balancedScoreB = b.workloadScore + (b.activeDays * 250);
          if (balancedScoreA !== balancedScoreB) return balancedScoreA - balancedScoreB;
          return a.activeDays - b.activeDays;
        });
      }
      
      setResult({
        totalFound: allValidSchedules.length,
        options: allValidSchedules.slice(0, 15) 
      });
    }
  };

  // --- UI Render ---
  return (
    <div className="max-w-5xl mx-auto p-6 bg-white rounded-xl shadow-md border border-gray-100 mt-10">
      <div className="flex flex-col md:flex-row md:justify-between md:items-start mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Advanced Timetable Optimizer</h2>
          <p className="text-sm text-gray-500 mt-1">
            Configure the exact batch, department, and type for every course you plan to take. (5-Day Week Mode).
          </p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 mb-8 bg-gray-50 p-4 rounded-lg border border-gray-200">
        <div className="flex-1">
          <label className="block text-sm font-bold text-gray-800 mb-3">Optimization Goal</label>
          <div className="space-y-3">
            <label className="flex items-start gap-3 cursor-pointer p-2 rounded-md hover:bg-white transition-colors">
              <input 
                type="radio" 
                name="optMode" 
                className="w-4 h-4 mt-0.5 text-blue-600 focus:ring-blue-500"
                checked={optimizationMode === 'max_off_days'}
                onChange={() => { setOptimizationMode('max_off_days'); setResult(null); }}
              />
              <span className="text-sm text-gray-700">
                <strong className="text-blue-900 block mb-0.5">Maximize Off-Days</strong>
                Crams classes into fewest days possible.
              </span>
            </label>
            
            <label className="flex items-start gap-3 cursor-pointer p-2 rounded-md hover:bg-white transition-colors bg-teal-50/50 border border-teal-100/50">
              <input 
                type="radio" 
                name="optMode" 
                className="w-4 h-4 mt-0.5 text-teal-600 focus:ring-teal-500"
                checked={optimizationMode === 'balanced'}
                onChange={() => { setOptimizationMode('balanced'); setResult(null); }}
              />
              <span className="text-sm text-gray-700">
                <strong className="text-teal-900 block mb-0.5">Balanced (Recommended)</strong>
                Maximizes off-days, but gracefully accepts an extra campus day if it saves you from a brutal workload or missed prayers.
              </span>
            </label>

            <label className="flex items-start gap-3 cursor-pointer p-2 rounded-md hover:bg-white transition-colors">
              <input 
                type="radio" 
                name="optMode" 
                className="w-4 h-4 mt-0.5 text-indigo-600 focus:ring-indigo-500"
                checked={optimizationMode === 'min_workload'}
                onChange={() => { setOptimizationMode('min_workload'); setResult(null); }}
              />
              <span className="text-sm text-gray-700">
                <strong className="text-indigo-900 block mb-0.5">Minimize Workload</strong>
                Absolute priority on balanced days, avoids heavy gaps, limits back-to-back classes, and ensures time for Dhuhr/Lunch.
              </span>
            </label>
          </div>
        </div>

        <div className="w-px bg-gray-200 hidden lg:block"></div>

        <div className="flex-1">
          <label className="block text-sm font-bold text-gray-800 mb-3">Section Constraints</label>
          <label className="flex items-center gap-2 cursor-pointer bg-white p-2 border border-gray-200 rounded-md w-max shadow-sm">
            <input 
              type="checkbox" 
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              checked={hasPreferences} 
              onChange={e => { setHasPreferences(e.target.checked); setResult(null); }} 
            />
            <span className="text-sm font-medium text-gray-700 select-none">
              I want to lock in preferred sections manually
            </span>
          </label>
        </div>
      </div>

      <div className="space-y-4 mb-6">
        {selectedCourses.map((row, idx) => {
          const availableDepts = ObjectKeys(timetableData[row.year]);
          const availableTypes = ObjectKeys(timetableData[row.year]?.[row.dept]);
          const availableCourses = ObjectKeys(timetableData[row.year]?.[row.dept]?.[row.type]);
          const availableSections = row.course 
            ? ObjectKeys(timetableData[row.year]?.[row.dept]?.[row.type]?.[row.course])
            : [];

          return (
            <div key={idx} className="flex flex-wrap lg:flex-nowrap gap-3 p-4 border border-gray-200 rounded-lg bg-white items-end shadow-sm">
              <div className="flex-1 min-w-[80px]">
                <label className="block text-xs font-medium text-gray-500 mb-1">Year</label>
                <select 
                  className="w-full p-2 border rounded-md outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-gray-50"
                  value={row.year} onChange={e => updateRowField(idx, 'year', e.target.value)}>
                  {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>

              <div className="flex-1 min-w-[80px]">
                <label className="block text-xs font-medium text-gray-500 mb-1">Dept</label>
                <select 
                  className="w-full p-2 border rounded-md outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-gray-50"
                  value={row.dept} onChange={e => updateRowField(idx, 'dept', e.target.value)}>
                  {availableDepts.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              <div className="flex-1 min-w-[80px]">
                <label className="block text-xs font-medium text-gray-500 mb-1">Type</label>
                <select 
                  className="w-full p-2 border rounded-md outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-gray-50"
                  value={row.type} onChange={e => updateRowField(idx, 'type', e.target.value)}>
                  {availableTypes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div className="flex-[2] min-w-[150px]">
                <label className="block text-xs font-bold text-gray-700 mb-1">Course</label>
                <select
                  className="w-full p-2 border border-blue-300 rounded-md outline-none focus:ring-2 focus:ring-blue-500 font-medium text-sm"
                  value={row.course}
                  onChange={e => updateRowField(idx, 'course', e.target.value)}
                >
                  <option value="">-- Select Course --</option>
                  {availableCourses.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {hasPreferences && (
                <div className="flex-1 min-w-[120px]">
                  <label className="block text-xs font-bold text-indigo-600 mb-1">Lock Section</label>
                  <select
                    disabled={!row.course}
                    className="w-full p-2 border border-indigo-200 bg-indigo-50 rounded-md outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-sm disabled:opacity-50"
                    value={row.preferredSection}
                    onChange={e => updateRowField(idx, 'preferredSection', e.target.value)}
                  >
                    <option value="">Optimize Any</option>
                    {availableSections.map(s => (
                      <option key={s} value={s}>Section {s}</option>
                    ))}
                  </select>
                </div>
              )}

              <button 
                onClick={() => removeCourse(idx)}
                className="px-4 py-2 text-red-500 hover:bg-red-50 bg-white border border-red-200 rounded-md font-medium transition-colors text-sm h-[38px]"
              >
                Remove
              </button>
            </div>
          );
        })}
      </div>
      
      <button 
        onClick={addCourse}
        className="mb-8 text-blue-600 font-bold hover:text-blue-800 transition-colors"
      >
        + Add Another Course
      </button>

      <button 
        onClick={handleOptimize}
        className={`w-full py-4 text-white rounded-lg font-bold text-lg transition-colors shadow-lg 
          ${optimizationMode === 'max_off_days' ? 'bg-blue-600 hover:bg-blue-700' : 
            optimizationMode === 'balanced' ? 'bg-teal-600 hover:bg-teal-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}
      >
        Find the Best Schedules
      </button>

      {/* Results Display */}
      {error && (
        <div className="mt-6 p-4 bg-red-50 text-red-700 border border-red-200 rounded-lg flex items-center gap-3">
          <span className="font-medium">{error}</span>
        </div>
      )}

      {result && (
        <div className="mt-10 border-t pt-8">
          <div className="mb-6 flex justify-between items-end">
            <div>
              <h3 className="text-xl font-bold text-gray-900">
                Top Schedules ({
                  optimizationMode === 'max_off_days' ? 'Max Off-Days' : 
                  optimizationMode === 'balanced' ? 'Balanced' : 'Min Workload'
                })
              </h3>
              <p className="text-gray-600 mt-1">
                Found {result.totalFound} valid combinations. Showing top {result.options.length}.
              </p>
            </div>
          </div>
          
          <div className="space-y-6">
            {result.options.map((option, optIdx) => {
              const isAbsoluteBest = optIdx === 0;
              
              // Color coding for Comfort Score
              const getComfortColor = (score) => {
                if (score >= 90) return 'text-emerald-600';
                if (score >= 70) return 'text-amber-500';
                return 'text-rose-500';
              };
              
              let borderClass = 'border-gray-200 bg-white';
              let badgeClass = 'bg-gray-200 text-gray-700';
              
              if (isAbsoluteBest) {
                if (optimizationMode === 'max_off_days') {
                  borderClass = 'border-blue-400 bg-blue-50';
                  badgeClass = 'bg-blue-500 text-white';
                } else if (optimizationMode === 'balanced') {
                  borderClass = 'border-teal-400 bg-teal-50';
                  badgeClass = 'bg-teal-500 text-white';
                } else {
                  borderClass = 'border-indigo-400 bg-indigo-50';
                  badgeClass = 'bg-indigo-500 text-white';
                }
              }
              
              return (
                <div key={optIdx} className={`p-5 rounded-xl border-2 transition-all flex flex-col gap-4 ${borderClass}`}>
                  
                  <div className="flex flex-col xl:flex-row justify-between xl:items-center pb-3 border-b border-gray-200/60 gap-4">
                    <div className="flex items-center gap-4">
                      <span className={`text-sm font-bold px-3 py-1 rounded-lg ${badgeClass}`}>
                        Rank #{optIdx + 1}
                      </span>
                      <div className="flex flex-col">
                        <span className={`text-xl font-black ${getComfortColor(option.comfortScore)}`}>
                          Comfort Score: {option.comfortScore}%
                        </span>
                        <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">
                           {option.maxOffDays} Off-Days Secured
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-gray-600">
                      
                      {/* Dhuhr/Lunch Badges */}
                      {option.missedDhuhrDays === 0 ? (
                         <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5">
                           🕌 Dhuhr Break Secured
                         </span>
                      ) : (
                         <span className="bg-orange-100 text-orange-800 border border-orange-200 px-2.5 py-1.5 rounded-lg">
                           ⚠️ Missed Prayer Break ({option.missedDhuhrDays}x)
                         </span>
                      )}

                      {/* Attention Span / Fatigue Badges */}
                      {option.hasBackToBackPMClasses ? (
                         <span className="bg-red-100 text-red-800 border border-red-200 px-2.5 py-1.5 rounded-lg">
                           ⚠️ Afternoon Fatigue (2+ consecutive classes reaching 3:50 PM or later)
                         </span>
                      ) : option.maxConsecutiveAMClasses > 2 ? (
                         <span className="bg-orange-100 text-orange-800 border border-orange-200 px-2.5 py-1.5 rounded-lg">
                           ⚠️ Morning Fatigue (3+ back-to-back AM classes)
                         </span>
                      ) : (
                         <span className="bg-blue-100 text-blue-800 border border-blue-200 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5">
                           🧠 Focus Maintained (Well spaced)
                         </span>
                      )}
                      
                      {/* Removed the Bad Gaps display entirely, relying solely on Comfort Score */}
                    </div>
                  </div>
                  
                  <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {option.schedule.map((item, idx) => (
                      <li key={idx} className="flex justify-between items-center p-3 bg-white rounded-lg border border-gray-100 shadow-sm hover:border-blue-200 transition-colors">
                        <div className="flex flex-col pr-2">
                          <span className="font-bold text-gray-900 text-sm">{item.course}</span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {item.isLocked && <span className="text-xs font-bold text-indigo-600">🔒</span>}
                          <span className={`font-mono text-xs px-2 py-1 rounded border ${item.isLocked ? 'bg-indigo-50 border-indigo-200 text-indigo-800' : 'bg-gray-100 border-gray-200 text-gray-800'}`}>
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
