import React, { useState, useMemo } from 'react';
import { Icon } from '../../shared/Icons';
import { useCRM } from '../../context/CRMContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../shared/Toast';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function CalendarView({ onOpenAddTask, onOpenScheduleVisit, onSelectLead }) {
  const { tasks, taskStats, updateTask, siteVisits, updateSiteVisit, projects, leads } = useCRM();
  const { user } = useAuth();
  const toast = useToast();

  const [taskFilter, setTaskFilter] = useState('all');
  const [currentMonth, setCurrentMonth] = useState(8); // 8 = September (0-indexed)
  const [currentYear, setCurrentYear] = useState(2026);
  const [selectedDay, setSelectedDay] = useState(18); // Default to Today (Sep 18)
  const [viewMode, setViewMode] = useState('split'); // 'split' (List + Mini) or 'month' (Full Grid)

  // Day number extractors
  const getTaskDay = (t) => {
    if (!t.due) return null;
    const due = t.due.toLowerCase();
    if (due.includes('today')) return 18;
    if (due.includes('tomorrow')) return 19;
    if (due.includes('yesterday')) return 17;
    const match = t.due.match(/Sep\s+(\d+)/i);
    if (match) return parseInt(match[1], 10);
    return null;
  };

  const getVisitDay = (sv) => {
    if (!sv.scheduledDate) return null;
    const date = sv.scheduledDate.toLowerCase();
    if (date.includes('today')) return 18;
    if (date.includes('tomorrow')) return 19;
    if (date.includes('yesterday')) return 17;
    const match = sv.scheduledDate.match(/Sep\s+(\d+)/i);
    if (match) return parseInt(match[1], 10);
    return null;
  };

  // Map of days to task and visit counts
  const eventsByDay = useMemo(() => {
    const map = {};
    for (let d = 1; d <= 31; d++) {
      map[d] = { tasks: [], visits: [] };
    }

    tasks.forEach(t => {
      const day = getTaskDay(t);
      if (day && map[day]) {
        map[day].tasks.push(t);
      }
    });

    siteVisits.forEach(sv => {
      const day = getVisitDay(sv);
      if (day && map[day]) {
        map[day].visits.push(sv);
      }
    });

    return map;
  }, [tasks, siteVisits]);

  // Filter tasks based on filter chips and selected calendar date
  const displayedTasks = useMemo(() => {
    return tasks.filter(t => {
      // If a specific day is selected and user isn't on a general filter
      if (selectedDay !== null && taskFilter === 'all') {
        return getTaskDay(t) === selectedDay;
      }

      if (taskFilter === 'my-tasks') {
        const isAssigned = t.assignee === user?.name || !t.assignee;
        return selectedDay !== null ? isAssigned && getTaskDay(t) === selectedDay : isAssigned;
      }
      if (taskFilter === 'overdue') {
        return t.status !== 'completed' && t.due && t.due.includes('Today');
      }
      if (taskFilter === 'today') {
        return getTaskDay(t) === 18;
      }
      if (taskFilter === 'this-week') {
        const d = getTaskDay(t);
        return d && d >= 14 && d <= 20;
      }
      if (taskFilter === 'completed') {
        return t.status === 'completed';
      }

      return true;
    });
  }, [tasks, selectedDay, taskFilter, user]);

  // Site visits for selected date
  const displayedVisits = useMemo(() => {
    if (selectedDay === null) return siteVisits;
    return siteVisits.filter(sv => getVisitDay(sv) === selectedDay);
  }, [siteVisits, selectedDay]);

  const toggleTaskStatus = async (task) => {
    const nextStatus = task.status === 'completed' ? 'pending' : 'completed';
    await updateTask(task.id, { status: nextStatus });
  };

  const handleOutcomeChange = async (visitId, outcome) => {
    await updateSiteVisit(visitId, {
      outcome,
      status: 'completed',
      feedback: `Outcome recorded as ${outcome}`
    });
  };

  // Calendar calculations
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  const handleGoToday = () => {
    setCurrentMonth(8);
    setCurrentYear(2026);
    setSelectedDay(18);
    setTaskFilter('all');
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="font-display font-extrabold text-[28px] tracking-tight text-[#0F172A]">
            Tasks &amp; Calendar
          </div>
          <div className="text-[#64748B] text-[14px] mt-0.5">
            Track follow-ups, site visits, and deadlines in one place. Click any day on the calendar to view its schedule.
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* View Mode Toggle */}
          <div className="bg-[#F1F5F9] p-1 rounded-[10px] flex items-center border border-[#E2E8F0]">
            <button
              onClick={() => setViewMode('split')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[12.5px] font-semibold transition-all ${
                viewMode === 'split'
                  ? 'bg-white text-[#2563EB] shadow-xs'
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              <Icon name="checkcircle" size={14} />
              <span>Agenda View</span>
            </button>
            <button
              onClick={() => setViewMode('month')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[12.5px] font-semibold transition-all ${
                viewMode === 'month'
                  ? 'bg-white text-[#2563EB] shadow-xs'
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              <Icon name="calendar" size={14} />
              <span>Full Month Grid</span>
            </button>
          </div>

          <button
            onClick={onOpenAddTask}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-[10px] border border-[#CBD5E1] text-[#334155] font-semibold text-[13px] hover:bg-[#F8FAFC] transition-all bg-white shadow-xs"
          >
            <Icon name="plus" size={15} />
            <span>Add task</span>
          </button>

          <button
            onClick={onOpenScheduleVisit}
            className="flex items-center gap-1.5 px-4 py-2 rounded-[10px] bg-[#2563EB] text-white font-semibold text-[13px] hover:bg-[#1D4ED8] transition-all shadow-sm"
          >
            <Icon name="calendar" size={15} />
            <span>Schedule Site Visit</span>
          </button>
        </div>
      </div>

      {/* Stats Counter Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        {[
          { label: 'Overdue', value: taskStats.overdue, color: '#DC2626', bg: '#FEE2E2' },
          { label: 'Due Today', value: taskStats.today, color: '#D97706', bg: '#FEF3C7' },
          { label: 'This Week', value: taskStats.thisWeek, color: '#2563EB', bg: '#DBEAFE' },
          { label: 'Completed', value: taskStats.completed, color: '#059669', bg: '#D1FAE5' }
        ].map((s, i) => (
          <div key={i} className="card-base bg-white border border-[#E2E8F0] rounded-[16px] p-4 text-center">
            <div className="font-display font-extrabold text-[28px] mb-0.5" style={{ color: s.color }}>
              {s.value}
            </div>
            <div className="text-[12px] text-[#64748B] font-medium">{s.label}</div>
          </div>
        ))}
      </div>

      {/* VIEW MODE 1: SPLIT AGENDA VIEW (List on Left + Interactive Modern Mini Calendar on Right) */}
      {viewMode === 'split' ? (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_310px] gap-4 items-start">
          {/* Left: Task List & Filter Toolbar */}
          <div className="space-y-4">
            {/* Filter Chips Bar */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex gap-2 flex-wrap items-center">
                {[
                  { id: 'all', label: 'All' },
                  { id: 'my-tasks', label: 'My Tasks' },
                  { id: 'overdue', label: 'Overdue' },
                  { id: 'today', label: 'Today' },
                  { id: 'this-week', label: 'This Week' },
                  { id: 'completed', label: 'Completed' }
                ].map(chip => (
                  <button
                    key={chip.id}
                    onClick={() => {
                      setTaskFilter(chip.id);
                      if (chip.id !== 'all') setSelectedDay(null);
                    }}
                    className={`text-[12.6px] font-semibold px-3.5 py-1.5 rounded-full border transition-all ${
                      taskFilter === chip.id && selectedDay === null
                        ? 'bg-[#2563EB] border-[#2563EB] text-white shadow-xs'
                        : 'border-[#CBD5E1] text-[#475569] hover:bg-[#F1F5F9] bg-white'
                    }`}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>

              {selectedDay !== null && (
                <div className="flex items-center gap-2 bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE] px-3 py-1 rounded-full text-[12px] font-semibold">
                  <span>Showing Sep {selectedDay}, 2026</span>
                  <button
                    onClick={() => setSelectedDay(null)}
                    className="hover:text-[#DC2626] font-bold ml-1"
                    title="Clear date filter"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>

            {/* Tasks Cards List */}
            <div className="space-y-2.5">
              {displayedTasks.map(t => {
                const lead = leads.find(l => l.id === t.contactId);
                const isCompleted = t.status === 'completed';
                const isHigh = t.priority === 'high';
                const isMed = t.priority === 'medium';
                const prioColor = isHigh
                  ? 'bg-[#FEE2E2] text-[#DC2626]'
                  : isMed
                  ? 'bg-[#FEF3C7] text-[#D97706]'
                  : 'bg-[#D1FAE5] text-[#047857]';

                return (
                  <div
                    key={t.id}
                    className={`card-base bg-white border border-[#E2E8F0] rounded-[14px] p-4 transition-all flex items-start justify-between gap-3 hover:border-[#CBD5E1] ${
                      isCompleted ? 'opacity-60 bg-[#FAFBFC]' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3.5 min-w-0 flex-1">
                      <input
                        type="checkbox"
                        checked={isCompleted}
                        onChange={() => toggleTaskStatus(t)}
                        className="mt-1 w-4 h-4 rounded text-[#2563EB] border-[#CBD5E1] focus:ring-[#2563EB] cursor-pointer"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`font-semibold text-[13.5px] text-[#0F172A] ${
                              isCompleted ? 'line-through text-[#94A3B8]' : ''
                            }`}
                          >
                            {t.title}
                          </span>
                        </div>

                        <div className="text-[11.8px] text-[#64748B] mt-1 flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-[#475569]">{t.due}</span>
                          {t.assignee && <span>· {t.assignee}</span>}
                          {lead && (
                            <button
                              onClick={() => onSelectLead(lead.id)}
                              className="text-[#2563EB] font-semibold hover:underline"
                            >
                              ({lead.name})
                            </button>
                          )}
                        </div>

                        {t.description && (
                          <div className="text-[12.2px] text-[#475569] mt-1.5 leading-relaxed">
                            {t.description}
                          </div>
                        )}
                      </div>
                    </div>

                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${prioColor} flex-shrink-0`}>
                      {t.priority}
                    </span>
                  </div>
                );
              })}

              {displayedTasks.length === 0 && (
                <div className="card-base bg-white border border-[#E2E8F0] rounded-[16px] p-8 text-center text-[#94A3B8] text-[13px] space-y-2">
                  <div>No tasks scheduled for {selectedDay ? `Sep ${selectedDay}` : 'this filter'}.</div>
                  <button
                    onClick={onOpenAddTask}
                    className="text-[12.5px] font-semibold text-[#2563EB] hover:underline"
                  >
                    + Create a task now
                  </button>
                </div>
              )}
            </div>

            {/* Site Visits on Selected Day (if any) */}
            {selectedDay !== null && displayedVisits.length > 0 && (
              <div className="card-base bg-white border border-[#E2E8F0] rounded-[16px] p-4 mt-4">
                <div className="font-bold text-[14px] text-[#0F172A] mb-3 flex items-center gap-2">
                  <span className="text-[#059669]">
                    <Icon name="mappin" size={16} />
                  </span>
                  <span>Site Visits Scheduled on Sep {selectedDay}</span>
                </div>
                <div className="space-y-2">
                  {displayedVisits.map(sv => {
                    const lead = leads.find(l => l.id === sv.contactId);
                    const proj = projects.find(p => p.id === sv.projectId);
                    return (
                      <div
                        key={sv.id}
                        className="p-3 bg-[#F0FDF4] border border-[#BBF7D0] rounded-[10px] flex items-center justify-between"
                      >
                        <div>
                          <div className="text-[13px] font-bold text-[#0F172A]">
                            {lead?.name || 'Prospect'} — {proj?.name || 'Project'}
                          </div>
                          <div className="text-[11.5px] text-[#475569]">
                            {sv.scheduledDate} · Rep: {sv.attendedBy}
                          </div>
                        </div>
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#059669] text-white">
                          {sv.status}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right: Interactive Modern Mini Calendar */}
          <div className="card-base bg-white border border-[#E2E8F0] rounded-[16px] p-4 space-y-3 sticky top-4">
            {/* Calendar Header with Controls */}
            <div className="flex items-center justify-between">
              <div className="font-display font-bold text-[14.5px] text-[#0F172A]">
                {MONTH_NAMES[currentMonth]} {currentYear}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={handlePrevMonth}
                  className="w-7 h-7 rounded-[6px] hover:bg-[#F1F5F9] text-[#475569] flex items-center justify-center font-bold text-[14px]"
                  title="Previous Month"
                >
                  ‹
                </button>
                <button
                  onClick={handleGoToday}
                  className="text-[11px] font-semibold px-2 py-0.5 rounded-[5px] bg-[#F1F5F9] text-[#334155] hover:bg-[#E2E8F0]"
                  title="Go to Today"
                >
                  Today
                </button>
                <button
                  onClick={handleNextMonth}
                  className="w-7 h-7 rounded-[6px] hover:bg-[#F1F5F9] text-[#475569] flex items-center justify-center font-bold text-[14px]"
                  title="Next Month"
                >
                  ›
                </button>
              </div>
            </div>

            {/* Calendar Table Grid */}
            <div className="w-full select-none">
              {/* Day Headers */}
              <div className="grid grid-cols-7 text-center mb-1">
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                  <div key={d} className="text-[11px] font-semibold text-[#94A3B8] py-1">
                    {d}
                  </div>
                ))}
              </div>

              {/* Day Numbers Grid */}
              <div className="grid grid-cols-7 gap-1 text-center">
                {/* Previous month leading blank days */}
                {Array.from({ length: firstDayOfWeek }).map((_, i) => {
                  const dayNum = daysInPrevMonth - firstDayOfWeek + i + 1;
                  return (
                    <div
                      key={`prev-${i}`}
                      className="h-8 flex items-center justify-center text-[12px] text-[#CBD5E1]"
                    >
                      {dayNum}
                    </div>
                  );
                })}

                {/* Current month days */}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const isToday = currentMonth === 8 && currentYear === 2026 && day === 18;
                  const isSelected = selectedDay === day;
                  const dayEvents = eventsByDay[day] || { tasks: [], visits: [] };
                  const hasTasks = dayEvents.tasks.length > 0;
                  const hasVisits = dayEvents.visits.length > 0;

                  return (
                    <button
                      key={`day-${day}`}
                      onClick={() => {
                        setSelectedDay(selectedDay === day ? null : day);
                        setTaskFilter('all');
                      }}
                      className={`h-8 rounded-full flex flex-col items-center justify-center text-[12px] transition-all relative group ${
                        isSelected
                          ? 'bg-[#2563EB] text-white font-bold shadow-sm'
                          : isToday
                          ? 'bg-[#DBEAFE] text-[#1D4ED8] font-bold hover:bg-[#BFDBFE]'
                          : 'text-[#334155] hover:bg-[#F1F5F9]'
                      }`}
                      title={`Day ${day}: ${dayEvents.tasks.length} tasks, ${dayEvents.visits.length} site visits`}
                    >
                      <span className="leading-none">{day}</span>

                      {/* Event indicators dots underneath date */}
                      {(hasTasks || hasVisits) && (
                        <span className="flex gap-0.5 mt-0.5">
                          {hasTasks && (
                            <span
                              className={`w-1 h-1 rounded-full ${
                                isSelected ? 'bg-white' : 'bg-[#2563EB]'
                              }`}
                            ></span>
                          )}
                          {hasVisits && (
                            <span
                              className={`w-1 h-1 rounded-full ${
                                isSelected ? 'bg-white' : 'bg-[#059669]'
                              }`}
                            ></span>
                          )}
                        </span>
                      )}
                    </button>
                  );
                })}

                {/* Next month trailing blank days */}
                {Array.from({
                  length: (7 - ((firstDayOfWeek + daysInMonth) % 7)) % 7
                }).map((_, i) => (
                  <div
                    key={`next-${i}`}
                    className="h-8 flex items-center justify-center text-[12px] text-[#CBD5E1]"
                  >
                    {i + 1}
                  </div>
                ))}
              </div>
            </div>

            {/* Selected Date Details Callout */}
            {selectedDay !== null && (
              <div className="pt-3 border-t border-[#E2E8F0] space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-[12.5px] text-[#0F172A]">
                    Sep {selectedDay} Schedule
                  </div>
                  <button
                    onClick={() => setSelectedDay(null)}
                    className="text-[11px] text-[#2563EB] font-semibold hover:underline"
                  >
                    View All
                  </button>
                </div>

                <div className="text-[12px] text-[#64748B]">
                  • <b>{eventsByDay[selectedDay]?.tasks?.length || 0}</b> tasks scheduled
                  <br />• <b>{eventsByDay[selectedDay]?.visits?.length || 0}</b> site visits
                </div>

                <div className="flex gap-1.5 pt-1">
                  <button
                    onClick={onOpenAddTask}
                    className="flex-1 text-[11.5px] font-semibold py-1.5 rounded-[6px] border border-[#CBD5E1] hover:bg-[#F1F5F9] text-center"
                  >
                    + Task
                  </button>
                  <button
                    onClick={onOpenScheduleVisit}
                    className="flex-1 text-[11.5px] font-semibold py-1.5 rounded-[6px] bg-[#2563EB] text-white hover:bg-[#1D4ED8] text-center"
                  >
                    + Visit
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* VIEW MODE 2: FULL MODERN MONTH CALENDAR GRID */
        <div className="card-base bg-white border border-[#E2E8F0] rounded-[16px] p-5 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <span className="font-display font-extrabold text-[20px] text-[#0F172A]">
                {MONTH_NAMES[currentMonth]} {currentYear}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={handlePrevMonth}
                  className="w-8 h-8 rounded-[8px] border border-[#CBD5E1] hover:bg-[#F1F5F9] flex items-center justify-center"
                >
                  ‹
                </button>
                <button
                  onClick={handleGoToday}
                  className="text-[12px] font-semibold px-2.5 py-1 rounded-[8px] border border-[#CBD5E1] hover:bg-[#F1F5F9]"
                >
                  Today
                </button>
                <button
                  onClick={handleNextMonth}
                  className="w-8 h-8 rounded-[8px] border border-[#CBD5E1] hover:bg-[#F1F5F9] flex items-center justify-center"
                >
                  ›
                </button>
              </div>
            </div>

            <div className="flex items-center gap-4 text-[12px] text-[#64748B]">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB]"></span>
                Tasks / Calls
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#059669]"></span>
                Site Visits
              </span>
            </div>
          </div>

          {/* 7-Day Month Grid */}
          <div className="border border-[#E2E8F0] rounded-[12px] overflow-hidden">
            <div className="grid grid-cols-7 bg-[#F8FAFC] border-b border-[#E2E8F0] text-center">
              {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(
                day => (
                  <div key={day} className="py-2.5 text-[12px] font-bold text-[#64748B]">
                    {day}
                  </div>
                )
              )}
            </div>

            <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-[#E2E8F0] bg-white">
              {/* Previous month days */}
              {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                <div
                  key={`full-prev-${i}`}
                  className="min-h-[110px] p-2 bg-[#FAFBFC]/60 text-[#CBD5E1] text-[12px]"
                >
                  {daysInPrevMonth - firstDayOfWeek + i + 1}
                </div>
              ))}

              {/* Current month days */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const isToday = currentMonth === 8 && currentYear === 2026 && day === 18;
                const isSelected = selectedDay === day;
                const dayEvents = eventsByDay[day] || { tasks: [], visits: [] };

                return (
                  <div
                    key={`full-day-${day}`}
                    onClick={() => setSelectedDay(day)}
                    className={`min-h-[110px] p-2 transition-all cursor-pointer hover:bg-[#F8FAFC] flex flex-col justify-between ${
                      isSelected
                        ? 'ring-2 ring-inset ring-[#2563EB] bg-[#EFF6FF]/40'
                        : isToday
                        ? 'bg-[#EFF6FF]/20'
                        : ''
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-[12px] ${
                          isToday
                            ? 'bg-[#2563EB] text-white font-bold'
                            : isSelected
                            ? 'bg-[#1D4ED8] text-white font-bold'
                            : 'font-semibold text-[#0F172A]'
                        }`}
                      >
                        {day}
                      </span>
                      {dayEvents.tasks.length + dayEvents.visits.length > 0 && (
                        <span className="text-[10px] font-mono text-[#94A3B8]">
                          {dayEvents.tasks.length + dayEvents.visits.length} items
                        </span>
                      )}
                    </div>

                    {/* Event pills inside calendar cell */}
                    <div className="space-y-1 overflow-y-auto max-h-[70px] flex-1">
                      {dayEvents.visits.slice(0, 2).map(sv => (
                        <div
                          key={`visit-${sv.id}`}
                          className="text-[10.5px] font-semibold bg-[#D1FAE5] text-[#047857] px-1.5 py-0.5 rounded-[4px] truncate"
                          title={`Site visit: ${sv.scheduledDate}`}
                        >
                          📍 Visit: {leads.find(l => l.id === sv.contactId)?.name || 'Prospect'}
                        </div>
                      ))}

                      {dayEvents.tasks.slice(0, 2).map(t => (
                        <div
                          key={`task-${t.id}`}
                          className="text-[10.5px] font-semibold bg-[#DBEAFE] text-[#1D4ED8] px-1.5 py-0.5 rounded-[4px] truncate"
                          title={t.title}
                        >
                          ⏱ {t.title}
                        </div>
                      ))}

                      {dayEvents.tasks.length + dayEvents.visits.length > 4 && (
                        <div className="text-[10px] text-[#94A3B8] font-bold">
                          +{dayEvents.tasks.length + dayEvents.visits.length - 4} more...
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Next month days */}
              {Array.from({
                length: (7 - ((firstDayOfWeek + daysInMonth) % 7)) % 7
              }).map((_, i) => (
                <div
                  key={`full-next-${i}`}
                  className="min-h-[110px] p-2 bg-[#FAFBFC]/60 text-[#CBD5E1] text-[12px]"
                >
                  {i + 1}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Site Visits Schedule & Outcomes Table */}
      <div className="card-base bg-white border border-[#E2E8F0] rounded-[16px] p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div>
            <div className="font-display font-bold text-[16px] text-[#0F172A]">
              Site Visits Schedule &amp; Outcomes
            </div>
            <div className="text-[12.4px] text-[#64748B]">
              Walkthrough tracking, feedback, and deal conversion
            </div>
          </div>
          <button
            onClick={onOpenScheduleVisit}
            className="text-[12px] font-semibold px-3 py-1.5 rounded-[8px] bg-[#DBEAFE] text-[#1D4ED8] hover:bg-[#BFDBFE] transition-colors"
          >
            + Book Walkthrough
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-[11.5px] font-semibold text-[#94A3B8] border-b border-[#E2E8F0] bg-[#FAFBFC]">
                <th className="px-4 py-3">Lead &amp; Phone</th>
                <th className="px-4 py-3">Project</th>
                <th className="px-4 py-3">Date &amp; Time</th>
                <th className="px-4 py-3">Executive</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Outcome</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] text-[13px]">
              {siteVisits.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-8 text-[13px] text-[#94A3B8]">
                    No site visits scheduled yet.
                  </td>
                </tr>
              ) : (
                siteVisits.map(sv => {
                  const lead = leads.find(l => l.id === sv.contactId);
                  const proj = projects.find(p => p.id === sv.projectId);
                  return (
                    <tr key={sv.id} className="hover:bg-[#F8FAFC]">
                      <td className="px-4 py-3 font-semibold text-[#0F172A]">
                        {lead ? (
                          <button
                            onClick={() => onSelectLead(lead.id)}
                            className="text-left hover:text-[#2563EB]"
                          >
                            <div>{lead.name}</div>
                            <div className="text-[11px] text-[#94A3B8] font-normal">
                              {lead.phone}
                            </div>
                          </button>
                        ) : (
                          'Walk-in prospect'
                        )}
                      </td>
                      <td className="px-4 py-3 text-[#475569]">{proj?.name || 'General Project'}</td>
                    <td className="px-4 py-3 font-medium text-[#0F172A]">{sv.scheduledDate}</td>
                    <td className="px-4 py-3 text-[#64748B]">{sv.attendedBy}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`tag-pill ${
                          sv.status === 'completed'
                            ? 'bg-[#D1FAE5] text-[#047857]'
                            : 'bg-[#DBEAFE] text-[#1D4ED8]'
                        }`}
                      >
                        {sv.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {sv.outcome ? (
                        <span className="font-semibold text-[#059669]">{sv.outcome}</span>
                      ) : (
                        <select
                          defaultValue=""
                          onChange={(e) => handleOutcomeChange(sv.id, e.target.value)}
                          className="text-[12px] px-2 py-1 rounded-[6px] border border-[#CBD5E1] outline-none bg-white cursor-pointer hover:border-[#2563EB]"
                        >
                          <option value="" disabled>
                            Record Outcome
                          </option>
                          <option value="Booked">🎉 Booked Unit</option>
                          <option value="Interested">Interested</option>
                          <option value="Needs Follow-up">Needs Follow-up</option>
                          <option value="Not Interested">Not Interested</option>
                        </select>
                      )}
                    </td>
                  </tr>
                );
              }))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
