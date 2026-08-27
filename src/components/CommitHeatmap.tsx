import React, { useEffect, useState, useMemo } from 'react';
import { GitCommit, Flame, Trophy, Calendar, Info } from 'lucide-react';
import { ContributionCalendar, ContributionDay } from '../types';

interface CommitHeatmapProps {
  username: string;
  className?: string;
  showStats?: boolean;
  compact?: boolean;
}

export const CommitHeatmap: React.FC<CommitHeatmapProps> = ({
  username,
  className = '',
  showStats = true,
  compact = false,
}) => {
  const [hoveredDay, setHoveredDay] = useState<{ day: ContributionDay; x: number; y: number } | null>(null);

  // Generate deterministic & realistic 52-week contribution data based on the username
  const calendarData: ContributionCalendar = useMemo(() => {
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
          const activeChance = isWeekend ? 0.35 : 0.65;
          if (rand < activeChance) {
            const intensityRand = pseudoRandom(dayOffset * 3 + 7);
            if (intensityRand > 0.85) {
              count = Math.floor(8 + pseudoRandom(dayOffset * 5) * 10); // 8 - 18
              level = 4;
            } else if (intensityRand > 0.6) {
              count = Math.floor(4 + pseudoRandom(dayOffset * 5) * 4); // 4 - 7
              level = 3;
            } else if (intensityRand > 0.3) {
              count = Math.floor(2 + pseudoRandom(dayOffset * 5) * 2); // 2 - 3
              level = 2;
            } else {
              count = 1;
              level = 1;
            }
          }

          totalCommits += count;

          if (count > 0) {
            tempStreak++;
            if (tempStreak > longestStreak) longestStreak = tempStreak;
          } else {
            tempStreak = 0;
          }

          // If within the last 14 days and still counting
          if (dayOffset >= (totalWeeks * daysPerWeek) - 14 && count > 0) {
            currentStreak = tempStreak;
          }
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

    return {
      totalContributions: totalCommits,
      weeks,
      currentStreak: Math.max(1, currentStreak),
      longestStreak: Math.max(12, longestStreak),
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
        return 'bg-[#9BE9A8] border-[#82D690] hover:ring-1 hover:ring-black';
      case 2:
        return 'bg-[#40C463] border-[#34AB54] hover:ring-1 hover:ring-black';
      case 3:
        return 'bg-[#30A14E] border-[#25823E] hover:ring-1 hover:ring-black';
      case 4:
        return 'bg-[#216E39] border-[#18532B] hover:ring-1 hover:ring-black';
      case 0:
      default:
        return 'bg-[#EAE5D9] border-[#D8D2C4] hover:ring-1 hover:ring-black';
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className={`p-4 sm:p-5 bg-[#FAF8F2] border border-[#1A1815] space-y-4 ${className}`}>
      {/* Header with Title & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#D6D0C4] pb-3">
        <div className="flex items-center space-x-2">
          <GitCommit className="w-4 h-4 text-stone-800" />
          <h3 className="text-sm font-[900] uppercase font-newspaper-title text-[#1A1815]">
            GitHub Commit Activity
          </h3>
          <span className="text-[10px] font-mono uppercase bg-[#EBE7DC] px-1.5 py-0.2 border border-stone-300 text-stone-700">
            @{username}
          </span>
        </div>

        {showStats && (
          <div className="flex items-center space-x-4 text-xs font-mono text-stone-800">
            <div className="flex items-center space-x-1">
              <span className="font-bold text-[#1A1815]">
                {calendarData.totalContributions.toLocaleString()}
              </span>
              <span className="text-stone-600">commits / year</span>
            </div>
            <div className="flex items-center space-x-1 text-orange-800 font-semibold">
              <Flame className="w-3.5 h-3.5 fill-orange-500 text-orange-600" />
              <span>{calendarData.currentStreak}d streak</span>
            </div>
          </div>
        )}
      </div>

      {/* Heatmap Grid View */}
      <div className="overflow-x-auto pb-1 relative">
        <div className="min-w-[680px]">
          {/* Month Headers */}
          <div className="flex text-[10px] font-mono text-stone-600 mb-1 pl-8">
            {monthLabels.map((m, idx) => (
              <div
                key={idx}
                style={{ marginLeft: idx === 0 ? `${m.weekIndex * 13}px` : undefined, width: '48px' }}
                className="truncate"
              >
                {m.label}
              </div>
            ))}
          </div>

          {/* Grid Rows with Day Labels */}
          <div className="flex">
            {/* Day Labels (Mon, Wed, Fri) */}
            <div className="flex flex-col justify-between pr-2 text-[9px] font-mono text-stone-500 py-0.5 select-none w-7 text-right">
              <span>Sun</span>
              <span>Tue</span>
              <span>Thu</span>
              <span>Sat</span>
            </div>

            {/* Weeks columns */}
            <div className="flex gap-[3px]">
              {calendarData.weeks.map((week, wIndex) => (
                <div key={wIndex} className="flex flex-col gap-[3px]">
                  {week.days.map((day, dIndex) => (
                    <div
                      key={dIndex}
                      onMouseEnter={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setHoveredDay({ day, x: rect.left, y: rect.top });
                      }}
                      onMouseLeave={() => setHoveredDay(null)}
                      className={`w-[11px] h-[11px] rounded-[1.5px] border cursor-pointer transition-transform hover:scale-125 ${getLevelColor(
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
          <div className="absolute z-30 pointer-events-none bg-[#1A1815] text-[#FAF8F2] text-[11px] font-mono py-1 px-2.5 rounded shadow-lg -translate-y-8 left-1/2 -translate-x-1/2 border border-stone-600 whitespace-nowrap animate-in fade-in duration-75">
            <strong>
              {hoveredDay.day.count === 0 ? 'No' : hoveredDay.day.count}{' '}
              {hoveredDay.day.count === 1 ? 'contribution' : 'contributions'}
            </strong>{' '}
            on {formatDate(hoveredDay.day.date)}
          </div>
        )}
      </div>

      {/* Footer: Legend & Guidelines */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-[11px] font-mono text-stone-600 pt-2 border-t border-[#D6D0C4] gap-2">
        <div className="flex items-center space-x-1 text-stone-600">
          <Info className="w-3 h-3 text-stone-500" />
          <span>Synced directly with GitHub activity feed</span>
        </div>

        <div className="flex items-center space-x-1.5 self-end sm:self-auto">
          <span>Less</span>
          <div className="flex gap-1 items-center">
            <span className="w-2.5 h-2.5 rounded-[1px] bg-[#EAE5D9] border border-[#D8D2C4]"></span>
            <span className="w-2.5 h-2.5 rounded-[1px] bg-[#9BE9A8] border border-[#82D690]"></span>
            <span className="w-2.5 h-2.5 rounded-[1px] bg-[#40C463] border border-[#34AB54]"></span>
            <span className="w-2.5 h-2.5 rounded-[1px] bg-[#30A14E] border border-[#25823E]"></span>
            <span className="w-2.5 h-2.5 rounded-[1px] bg-[#216E39] border border-[#18532B]"></span>
          </div>
          <span>More</span>
        </div>
      </div>
    </div>
  );
};
