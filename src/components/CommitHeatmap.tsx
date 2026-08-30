import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { GitCommit, Flame, Award, Calendar, Zap, TrendingUp, Sparkles, RefreshCw, AlertCircle, ExternalLink } from 'lucide-react';
import { ContributionCalendar, ContributionDay } from '../types';
import { fetchGitHubContributions } from '../lib/github';
import { useAuth } from '../context/AuthContext';

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
  const { githubToken } = useAuth();
  const [calendarData, setCalendarData] = useState<ContributionCalendar | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hoveredDay, setHoveredDay] = useState<{ day: ContributionDay; x: number; y: number } | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadContributions = useCallback(async (showRefreshIndicator = false) => {
    if (!username) {
      setIsLoading(false);
      setErrorMessage('No GitHub username specified.');
      return;
    }

    if (showRefreshIndicator) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setErrorMessage(null);

    try {
      const data = await fetchGitHubContributions(username, githubToken, compact);
      setCalendarData(data);
    } catch (err: any) {
      console.error(`Failed to load real GitHub contributions for @${username}:`, err);
      setErrorMessage(
        err?.message || `Unable to retrieve GitHub contribution activity for @${username}. GitHub rate-limit or network timeout.`
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [username, githubToken, compact]);

  useEffect(() => {
    loadContributions();
  }, [loadContributions]);

  // Month labels for column headings
  const monthLabels = useMemo(() => {
    if (!calendarData || !calendarData.weeks) return [];
    const labels: { label: string; weekIndex: number }[] = [];
    let lastMonth = -1;

    calendarData.weeks.forEach((week, index) => {
      if (week.days.length > 0) {
        const firstDay = new Date(week.days[0].date);
        const month = firstDay.getMonth();
        if (month !== lastMonth) {
          labels.push({
            label: firstDay.toLocaleString('default', { month: 'short' }),
            weekIndex: index,
          });
          lastMonth = month;
        }
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
      {/* Header with Title, Source Badge & Live Sync Control */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-dashed border-[#212121] pb-3">
        <div className="space-y-0.5">
          <div className="flex items-center space-x-2 flex-wrap gap-y-1">
            <span className="text-[10px] sm:text-xs font-sketch uppercase tracking-widest text-stone-700 font-bold">
              VERIFIED GITHUB TELEMETRY
            </span>
            <span className="paper-badge bg-emerald-100 text-emerald-950 border-emerald-700 text-[9px] font-bold">
              REAL-TIME GITHUB API
            </span>
          </div>
          <h2 className="text-base sm:text-lg lg:text-xl font-[900] uppercase font-newspaper-title text-[#212121]">
            Annual Commit &amp; Contribution Activity
          </h2>
        </div>

        {/* Top Sync & Live GitHub Link */}
        <div className="flex items-center space-x-2 self-start sm:self-auto">
          <a
            href={`https://github.com/${username}`}
            target="_blank"
            rel="noreferrer"
            className="paper-button text-[11px] font-mono py-1 px-2.5 min-h-[30px] flex items-center space-x-1"
            title={`View @${username} on GitHub`}
          >
            <span>@{username}</span>
            <ExternalLink className="w-2.5 h-2.5" />
          </a>

          <button
            onClick={() => loadContributions(true)}
            disabled={isLoading || isRefreshing}
            className="paper-button-icon min-w-[32px] min-h-[32px] p-1.5 cursor-pointer disabled:opacity-50"
            title="Re-sync GitHub Contribution Calendar"
            aria-label="Re-sync GitHub Contribution Calendar"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-stone-800 ${isRefreshing || isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && !calendarData && (
        <div className="p-8 text-center space-y-3 bg-[#FAF6EC] paper-card border border-dashed border-[#212121]">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-stone-700" />
          <div className="space-y-1">
            <p className="text-xs font-sketch uppercase tracking-wider font-bold text-[#212121]">
              Fetching Verified GitHub Contribution Activity...
            </p>
            <p className="text-[11px] font-mono text-stone-600">
              Querying GitHub GraphQL &amp; public contribution events for @{username}
            </p>
          </div>
        </div>
      )}

      {/* Error State (No fake fallback) */}
      {!isLoading && errorMessage && !calendarData && (
        <div className="p-4 sm:p-5 bg-amber-50 border border-amber-600 paper-card text-amber-950 space-y-2.5">
          <div className="flex items-start space-x-2.5">
            <AlertCircle className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h3 className="font-bold text-xs uppercase font-headline">
                GitHub Contribution Activity Unavailable
              </h3>
              <p className="text-xs font-serif-body text-stone-800 leading-relaxed">
                {errorMessage}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2 pt-1 border-t border-amber-300">
            <button
              onClick={() => loadContributions(true)}
              className="paper-button paper-button-dark text-xs py-1 px-3 font-bold min-h-[30px]"
            >
              Retry GitHub Sync
            </button>
            <span className="text-[10px] font-mono text-stone-600">
              Verified real-time GitHub data requirement
            </span>
          </div>
        </div>
      )}

      {/* Active Heatmap Grid Display */}
      {calendarData && (
        <>
          {/* Scrollable / Responsive Calendar Container */}
          <div className="relative overflow-x-auto pb-2 -mx-1 px-1 sm:mx-0 sm:px-0">
            <div className="min-w-[660px] sm:min-w-[700px] flex flex-col space-y-1">
              {/* Month Labels Bar */}
              <div className="flex items-center text-[10px] font-mono text-stone-700 pl-6 h-4 relative">
                {monthLabels.map((m, idx) => (
                  <span
                    key={`${m.label}-${idx}`}
                    className="absolute font-bold"
                    style={{ left: `calc(${m.weekIndex * 12.8}px + 1.5rem)` }}
                  >
                    {m.label}
                  </span>
                ))}
              </div>

              {/* Heatmap Grid & Day-of-week Axis */}
              <div className="flex items-start space-x-1.5">
                {/* Day of Week Axis (Mon, Wed, Fri) */}
                <div className="flex flex-col justify-between h-[84px] text-[9px] font-mono text-stone-600 pr-1 py-0.5 flex-shrink-0 select-none">
                  <span className="leading-none">Mon</span>
                  <span className="leading-none">Wed</span>
                  <span className="leading-none">Fri</span>
                </div>

                {/* 52 Columns (Weeks) */}
                <div className="flex items-center space-x-[2.5px] sm:space-x-[3px] flex-1">
                  {calendarData.weeks.map((week, wIndex) => (
                    <div key={wIndex} className="flex flex-col space-y-[2.5px] sm:space-y-[3px]">
                      {week.days.map((day, dIndex) => (
                        <button
                          key={`${day.date}-${dIndex}`}
                          type="button"
                          onMouseEnter={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            setHoveredDay({ day, x: rect.left + rect.width / 2, y: rect.top - 8 });
                          }}
                          onMouseLeave={() => setHoveredDay(null)}
                          onClick={() => {
                            const rect = (document.activeElement as HTMLElement)?.getBoundingClientRect();
                            if (rect) {
                              setHoveredDay({ day, x: rect.left + rect.width / 2, y: rect.top - 8 });
                            }
                          }}
                          aria-label={`${day.count} contributions on ${day.date}`}
                          className={`w-[10px] h-[10px] sm:w-[10.5px] sm:h-[10.5px] rounded-[1.5px] border transition-transform hover:scale-130 hover:z-20 cursor-pointer ${getLevelColor(
                            day.level
                          )}`}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              {/* Legend & Summary Info */}
              <div className="flex items-center justify-between pt-2.5 text-[10px] sm:text-xs font-mono text-stone-700 border-t border-dashed border-stone-300">
                <div className="flex items-center space-x-1.5 font-bold">
                  <span>{calendarData.totalContributions} total contributions in past {compact ? '26' : '52'} weeks</span>
                  {calendarData.totalContributions === 0 && (
                    <span className="paper-badge bg-stone-200 text-stone-700 text-[9px]">
                      Awaiting commits
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-1.5">
                  <span className="text-[10px] text-stone-600">Less</span>
                  <div className="flex items-center space-x-1">
                    <span className="w-2.5 h-2.5 rounded-[1px] bg-[#EAE5D9] border border-[#D8D2C4]/70" title="0 commits" />
                    <span className="w-2.5 h-2.5 rounded-[1px] bg-[#9BE9A8] border border-[#212121]/30" title="1-2 commits" />
                    <span className="w-2.5 h-2.5 rounded-[1px] bg-[#40C463] border border-[#212121]/40" title="3-4 commits" />
                    <span className="w-2.5 h-2.5 rounded-[1px] bg-[#30A14E] border border-[#212121]/50" title="5-7 commits" />
                    <span className="w-2.5 h-2.5 rounded-[1px] bg-[#216E39] border border-[#212121]/60" title="8+ commits" />
                  </div>
                  <span className="text-[10px] text-stone-600">More</span>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Day Tooltip */}
          {hoveredDay && (
            <div
              className="fixed z-50 pointer-events-none transform -translate-x-1/2 -translate-y-full px-2.5 py-1.5 paper-card bg-[#212121] text-[#FEFCF6] text-[11px] font-mono shadow-[2px_2px_0px_#000] whitespace-nowrap"
              style={{ left: `${hoveredDay.x}px`, top: `${hoveredDay.y}px` }}
            >
              <div className="font-bold text-emerald-400">
                {hoveredDay.day.count} {hoveredDay.day.count === 1 ? 'contribution' : 'contributions'}
              </div>
              <div className="text-stone-300 text-[10px]">{formatDate(hoveredDay.day.date)}</div>
            </div>
          )}

          {/* Real Telemetry Metric Cards */}
          {showStats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 pt-1 border-t border-dashed border-[#212121]">
              <div className="p-2 sm:p-2.5 bg-[#FAF6EC] paper-card border border-[#212121] shadow-[1px_1px_0px_#212121]">
                <div className="flex items-center justify-between text-stone-700">
                  <span className="text-[9px] font-sketch uppercase font-bold tracking-wider">Total Commits</span>
                  <GitCommit className="w-3.5 h-3.5 text-stone-600" />
                </div>
                <div className="mt-1">
                  <span className="text-base sm:text-lg font-[900] font-newspaper-title text-[#212121] leading-none block">
                    {calendarData.totalContributions}
                  </span>
                  <span className="text-[9px] font-serif-body text-stone-600">
                    52-week activity
                  </span>
                </div>
              </div>

              <div className="p-2 sm:p-2.5 bg-[#FAF6EC] paper-card border border-[#212121] shadow-[1px_1px_0px_#212121]">
                <div className="flex items-center justify-between text-amber-900">
                  <span className="text-[9px] font-sketch uppercase font-bold tracking-wider">Current Streak</span>
                  <Flame className="w-3.5 h-3.5 fill-amber-500 text-amber-700" />
                </div>
                <div className="mt-1">
                  <span className="text-base sm:text-lg font-[900] font-newspaper-title text-[#212121] leading-none block">
                    {calendarData.currentStreak} {calendarData.currentStreak === 1 ? 'day' : 'days'}
                  </span>
                  <span className="text-[9px] font-serif-body text-stone-600">
                    Active streak
                  </span>
                </div>
              </div>

              <div className="p-2 sm:p-2.5 bg-[#FAF6EC] paper-card border border-[#212121] shadow-[1px_1px_0px_#212121]">
                <div className="flex items-center justify-between text-stone-700">
                  <span className="text-[9px] font-sketch uppercase font-bold tracking-wider">Longest Streak</span>
                  <Award className="w-3.5 h-3.5 text-stone-600" />
                </div>
                <div className="mt-1">
                  <span className="text-base sm:text-lg font-[900] font-newspaper-title text-[#212121] leading-none block">
                    {calendarData.longestStreak} {calendarData.longestStreak === 1 ? 'day' : 'days'}
                  </span>
                  <span className="text-[9px] font-serif-body text-stone-600">
                    Peak continuous
                  </span>
                </div>
              </div>

              <div className="p-2 sm:p-2.5 bg-[#FAF6EC] paper-card border border-[#212121] shadow-[1px_1px_0px_#212121]">
                <div className="flex items-center justify-between text-stone-700">
                  <span className="text-[9px] font-sketch uppercase font-bold tracking-wider">Consistency</span>
                  <TrendingUp className="w-3.5 h-3.5 text-stone-600" />
                </div>
                <div className="mt-1">
                  <span className="text-base sm:text-lg font-[900] font-newspaper-title text-[#212121] leading-none block">
                    {calendarData.activePercent}%
                  </span>
                  <span className="text-[9px] font-serif-body text-stone-600">
                    {calendarData.activeDaysCount} active days
                  </span>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
