import React, { useState, useMemo } from 'react';
import { GitCommit, Flame, Award, Calendar, Zap, TrendingUp, Sparkles } from 'lucide-react';
import { ContributionCalendar, ContributionDay } from '../types';

interface CommitHeatmapProps {
  username: string;
  className?: string;
  showStats?: boolean;
  compact?: boolean;
  totalProjects?: number;
}

export const CommitHeatmap: React.FC<CommitHeatmapProps> = ({
  username,
  className = '',
  showStats = true,
  compact = false,
  totalProjects,
}) => {
  const [hoveredDay, setHoveredDay] = useState<{ day: ContributionDay; x: number; y: number } | null>(null);

  // Generate deterministic & realistic 52-week contribution data based on username
  const calendarData = useMemo(() => {
    // Generate seeded random values using username string
    let seed = 0;
    for (let i = 0; i < username.length; i++) {
      seed = (seed << 5) - seed + username.charCodeAt(i);
      seed |= 0;
    }
    const pseudoRandom = (offset: number) => {
      const x = Math.sin(seed + offset) * 10000;
      return x - Math.floor(x);
    };

    const today = new Date();
    const totalWeeks = compact ? 26 : 52;
    const daysPerWeek = 7;
    const weeks: { days: ContributionDay[] }[] = [];
    
    let totalCommits = 0;
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    let activeDaysCount = 0;
    const levelCounts: Record<0 | 1 | 2 | 3 | 4, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 };

    // Start from (totalWeeks * 7) days ago
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - (totalWeeks * daysPerWeek - (7 - today.getDay())));

    let dayOffset = 0;
    for (let w = 0; w < totalWeeks; w++) {
      const days: ContributionDay[] = [];
      for (let d = 0; d < daysPerWeek; d++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + dayOffset);
        
        const isFuture = currentDate > today;
        let count = 0;
        let level: 0 | 1 | 2 | 3 | 4 = 0;

        if (!isFuture) {
          const dayOfWeek = currentDate.getDay(); // 0 is Sunday, 6 is Saturday
          const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
          const rand = pseudoRandom(dayOffset);
          
          // Activity probability logic: higher on weekdays, occasional bursts
          const activeChance = isWeekend ? 0.38 : 0.68;
          if (rand < activeChance) {
            const intensityRand = pseudoRandom(dayOffset * 3 + 7);
            if (intensityRand > 0.82) {
              count = Math.floor(8 + pseudoRandom(dayOffset * 5) * 10); // 8 - 18
              level = 4;
            } else if (intensityRand > 0.55) {
              count = Math.floor(4 + pseudoRandom(dayOffset * 5) * 4); // 4 - 7
              level = 3;
            } else if (intensityRand > 0.25) {
              count = Math.floor(2 + pseudoRandom(dayOffset * 5) * 2); // 2 - 3
              level = 2;
            } else {
              count = 1;
              level = 1;
            }
          }

          totalCommits += count;
          if (count > 0) {
            activeDaysCount++;
            tempStreak++;
            if (tempStreak > longestStreak) longestStreak = tempStreak;
          } else {
            tempStreak = 0;
          }

          levelCounts[level]++;

          // If within the last 14 days and still counting
          if (dayOffset >= (totalWeeks * daysPerWeek) - 14 && count > 0) {
            currentStreak = tempStreak;
          }
        } else {
          levelCounts[0]++;
        }

        days.push({
          date: currentDate.toISOString().split('T')[0],
          count,
          level,
        });

        dayOffset++;
      }
      weeks.push({ days });
    }

    const calculatedStreak = Math.max(1, currentStreak);
    const calculatedLongest = Math.max(calculatedStreak + 4, longestStreak);
    const totalTrackedDays = totalWeeks * daysPerWeek;
    const weeklyAverage = (totalCommits / totalWeeks).toFixed(1);
    const activePercent = Math.round((activeDaysCount / totalTrackedDays) * 100);

    return {
      totalContributions: totalCommits,
      weeks,
      currentStreak: calculatedStreak,
      longestStreak: calculatedLongest,
      activeDaysCount,
      totalTrackedDays,
      weeklyAverage,
      activePercent,
      levelCounts,
    };
  }, [username, compact]);

  // Month labels for column headings
  const monthLabels = useMemo(() => {
    const labels: { label: string; weekIndex: number }[] = [];
    let lastMonth = -1;

    calendarData.weeks.forEach((week, index) => {
      const firstDay = new Date(week.days[0].date);
      const month = firstDay.getMonth();
      if (month !== lastMonth) {
        labels.push({
          label: firstDay.toLocaleString('default', { month: 'short' }),
          weekIndex: index,
        });
        lastMonth = month;
      }
    });

    return labels;
  }, [calendarData]);

  const getLevelColor = (level: 0 | 1 | 2 | 3 | 4) => {
    switch (level) {
      case 1:
        return 'bg-[#9BE9A8] border-[#212121]/30 hover:border-[#212121]';
      case 2:
        return 'bg-[#40C463] border-[#212121]/40 hover:border-[#212121]';
      case 3:
        return 'bg-[#30A14E] border-[#212121]/50 hover:border-[#212121]';
      case 4:
        return 'bg-[#216E39] border-[#212121]/60 hover:border-[#212121]';
      case 0:
      default:
        return 'bg-[#EAE5D9] border-[#D8D2C4]/70 hover:border-[#212121]';
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className={`w-full max-w-full overflow-hidden p-3.5 sm:p-5 paper-card bg-[#FEFCF6] space-y-3.5 sm:space-y-4 ${className}`}>
      {/* Header with Title & Live Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-dashed border-[#212121] pb-3">
        <div className="space-y-0.5">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 rounded-xs border-1.5 border-[#212121] bg-[#FAF6EC] flex items-center justify-center shadow-[1px_1px_0px_#212121] flex-shrink-0">
              <GitCommit className="w-3.5 h-3.5 text-[#212121] stroke-[2]" />
            </div>
            <h3 className="text-sm sm:text-base font-[900] uppercase font-newspaper-title text-[#212121] tracking-tight">
              Activity &amp; Commit Dispatch
            </h3>
          </div>
          <p className="text-[11px] sm:text-xs font-serif-body text-stone-700 pl-8">
            52-week contribution timeline &amp; coding consistency telemetry.
          </p>
        </div>

        {showStats && (
          <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto font-mono text-xs">
            <div className="flex items-center space-x-1.5 bg-[#FAF6EC] px-2.5 py-1 border border-[#212121] rounded-xs shadow-[1px_1px_0px_#212121]">
              <span className="font-[900] font-newspaper-title text-sm text-[#212121]">
                {calendarData.totalContributions.toLocaleString()}
              </span>
              <span className="text-[10px] font-sketch text-stone-700 font-bold uppercase tracking-wider">
                Contributions
              </span>
            </div>
            <div className="flex items-center space-x-1.5 bg-amber-100 px-2.5 py-1 border border-amber-800 rounded-xs shadow-[1px_1px_0px_#92400E] text-amber-950 font-bold">
              <Flame className="w-3.5 h-3.5 fill-amber-500 text-amber-700 flex-shrink-0" />
              <span className="text-xs">{calendarData.currentStreak}d Streak</span>
            </div>
          </div>
        )}
      </div>

      {/* Activity Summary Metrics Grid (Efficient space utilization) */}
      {showStats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5 pt-0.5">
          {/* Card 1: Total Contributions */}
          <div className="p-2 sm:p-2.5 bg-[#FAF6EC] paper-card border border-[#212121] shadow-[1px_1px_0px_#212121] flex flex-col justify-between">
            <div className="flex items-center justify-between text-stone-700">
              <span className="text-[9px] font-sketch uppercase font-bold tracking-wider">Annual Velocity</span>
              <TrendingUp className="w-3 h-3 text-stone-600" />
            </div>
            <div className="mt-1">
              <span className="text-base sm:text-lg font-[900] font-newspaper-title text-[#212121] block leading-none">
                {calendarData.totalContributions}
              </span>
              <span className="text-[10px] font-serif-body text-stone-600">
                ~{calendarData.weeklyAverage} commits / wk
              </span>
            </div>
          </div>

          {/* Card 2: Current Active Streak */}
          <div className="p-2 sm:p-2.5 bg-[#FAF6EC] paper-card border border-[#212121] shadow-[1px_1px_0px_#212121] flex flex-col justify-between">
            <div className="flex items-center justify-between text-amber-800">
              <span className="text-[9px] font-sketch uppercase font-bold tracking-wider">Current Streak</span>
              <Flame className="w-3 h-3 fill-amber-500 text-amber-600" />
            </div>
            <div className="mt-1">
              <span className="text-base sm:text-lg font-[900] font-newspaper-title text-[#212121] block leading-none">
                {calendarData.currentStreak} Days
              </span>
              <span className="text-[10px] font-serif-body text-emerald-800 font-bold">
                Active &amp; Counting
              </span>
            </div>
          </div>

          {/* Card 3: Longest Run */}
          <div className="p-2 sm:p-2.5 bg-[#FAF6EC] paper-card border border-[#212121] shadow-[1px_1px_0px_#212121] flex flex-col justify-between">
            <div className="flex items-center justify-between text-stone-700">
              <span className="text-[9px] font-sketch uppercase font-bold tracking-wider">Longest Run</span>
              <Award className="w-3 h-3 text-stone-600" />
            </div>
            <div className="mt-1">
              <span className="text-base sm:text-lg font-[900] font-newspaper-title text-[#212121] block leading-none">
                {calendarData.longestStreak} Days
              </span>
              <span className="text-[10px] font-serif-body text-stone-600">
                Personal Record
              </span>
            </div>
          </div>

          {/* Card 4: Active Days Consistency */}
          <div className="p-2 sm:p-2.5 bg-[#FAF6EC] paper-card border border-[#212121] shadow-[1px_1px_0px_#212121] flex flex-col justify-between">
            <div className="flex items-center justify-between text-stone-700">
              <span className="text-[9px] font-sketch uppercase font-bold tracking-wider">
                {totalProjects !== undefined ? 'Showcased Work' : 'Active Days'}
              </span>
              <Zap className="w-3 h-3 text-stone-600" />
            </div>
            <div className="mt-1">
              <span className="text-base sm:text-lg font-[900] font-newspaper-title text-[#212121] block leading-none">
                {totalProjects !== undefined ? `${totalProjects} Projects` : `${calendarData.activeDaysCount} Days`}
              </span>
              <span className="text-[10px] font-serif-body text-stone-600">
                {totalProjects !== undefined ? 'Published Dispatches' : `${calendarData.activePercent}% Consistency`}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Prominent Scaled Heatmap Visualization */}
      <div className="w-full max-w-full overflow-x-auto pb-1.5 pt-1 relative touch-pan-x bg-[#FAF6EC]/50 p-2 sm:p-3 border border-[#212121]/30 rounded-xs paper-card">
        <div className="min-w-[700px] sm:min-w-[740px] md:min-w-[780px]">
          {/* Month Headers */}
          <div className="flex text-[10px] sm:text-[11px] font-sketch text-stone-800 mb-1.5 pl-8 font-bold">
            {monthLabels.map((m, idx) => (
              <div
                key={idx}
                style={{ marginLeft: idx === 0 ? `${m.weekIndex * 14}px` : undefined, width: '52px' }}
                className="truncate uppercase tracking-wider"
              >
                {m.label}
              </div>
            ))}
          </div>

          {/* Grid Rows with Day Labels */}
          <div className="flex items-start">
            {/* Day Labels (Sun, Tue, Thu, Sat) */}
            <div className="flex flex-col justify-between pr-2 text-[9px] sm:text-[10px] font-sketch text-stone-700 select-none w-7 text-right font-bold h-[105px] sm:h-[114px] md:h-[119px] py-0.5">
              <span>Sun</span>
              <span>Tue</span>
              <span>Thu</span>
              <span>Sat</span>
            </div>

            {/* Weeks columns (Proportionally scaled tiles) */}
            <div className="flex gap-[3px] sm:gap-[3.5px]">
              {calendarData.weeks.map((week, wIndex) => (
                <div key={wIndex} className="flex flex-col gap-[3px] sm:gap-[3.5px]">
                  {week.days.map((day, dIndex) => (
                    <div
                      key={dIndex}
                      onMouseEnter={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setHoveredDay({ day, x: rect.left, y: rect.top });
                      }}
                      onMouseLeave={() => setHoveredDay(null)}
                      className={`w-[11.5px] h-[11.5px] sm:w-[13px] sm:h-[13px] md:w-[13.5px] md:h-[13.5px] rounded-[2px] border cursor-pointer transition-all duration-100 hover:scale-135 hover:z-20 hover:shadow-[2px_2px_0px_#212121] ${getLevelColor(
                        day.level
                      )}`}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Hover Tooltip */}
        {hoveredDay && (
          <div className="absolute z-40 pointer-events-none bg-[#212121] text-[#FEFCF6] text-[10px] sm:text-xs font-mono py-1 px-2.5 shadow-[3px_3px_0px_#000] -translate-y-9 left-1/2 -translate-x-1/2 border-1.5 border-[#FEFCF6] whitespace-nowrap animate-in fade-in duration-75 paper-card">
            <strong className="text-amber-300">
              {hoveredDay.day.count === 0 ? 'No' : hoveredDay.day.count}{' '}
              {hoveredDay.day.count === 1 ? 'contribution' : 'contributions'}
            </strong>{' '}
            on {formatDate(hoveredDay.day.date)}
          </div>
        )}
      </div>

      {/* Mobile Swipe Guidance Note */}
      <p className="md:hidden text-[9px] font-sketch text-stone-600 text-center font-bold">
        ← Swipe across horizontally to explore full 52-week activity →
      </p>

      {/* Footer: Activity Intensity Distribution & Swatch Legend */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-[10px] sm:text-[11px] font-sketch text-stone-800 pt-2 border-t border-dashed border-[#212121] gap-2 font-bold">
        {/* Left: Intensity distribution stats */}
        <div className="flex items-center space-x-2 text-stone-700 flex-wrap gap-y-1">
          <span className="paper-badge bg-stone-200 text-[#212121] text-[9px] font-mono">
            {calendarData.activeDaysCount} active days
          </span>
          <span className="text-[10px] text-stone-600 font-serif-body">
            ({calendarData.activePercent}% active frequency)
          </span>
        </div>

        {/* Right: Legend */}
        <div className="flex items-center space-x-2 self-end sm:self-auto">
          <span className="text-stone-700 uppercase tracking-wider text-[9px]">Less</span>
          <div className="flex gap-1 items-center">
            <span className="w-3 h-3 rounded-[2px] bg-[#EAE5D9] border border-[#212121]/60 shadow-[0.5px_0.5px_0px_#212121]" title="0 contributions"></span>
            <span className="w-3 h-3 rounded-[2px] bg-[#9BE9A8] border border-[#212121]/60 shadow-[0.5px_0.5px_0px_#212121]" title="1-2 contributions"></span>
            <span className="w-3 h-3 rounded-[2px] bg-[#40C463] border border-[#212121]/60 shadow-[0.5px_0.5px_0px_#212121]" title="3-4 contributions"></span>
            <span className="w-3 h-3 rounded-[2px] bg-[#30A14E] border border-[#212121]/60 shadow-[0.5px_0.5px_0px_#212121]" title="5-7 contributions"></span>
            <span className="w-3 h-3 rounded-[2px] bg-[#216E39] border border-[#212121]/60 shadow-[0.5px_0.5px_0px_#212121]" title="8+ contributions"></span>
          </div>
          <span className="text-stone-700 uppercase tracking-wider text-[9px]">More</span>
        </div>
      </div>
    </div>
  );
};
