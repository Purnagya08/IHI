"use client";

import React, { useMemo } from "react";

interface ContributionHeatmapProps {
  userId: string;
  empty?: boolean;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAYS = ["Mon", "", "Wed", "", "Fri", "", "Sun"];

export default function ContributionHeatmap({ userId }: ContributionHeatmapProps) {
  // 52 weeks x 7 days empty grid (LeetCode zero-state)
  const contributionGrid = useMemo(() => {
    return Array.from({ length: 52 }, () =>
      Array.from({ length: 7 }, () => ({ level: 0, count: 0 }))
    );
  }, [userId]);

  return (
    <div className="w-full overflow-x-auto pb-2">
      <div className="min-w-[680px]">
        {/* Month Headers */}
        <div className="flex justify-between pl-8 pr-2 pb-2 text-[9px] font-mono font-bold uppercase text-[var(--organizer-ink-muted)]">
          {MONTHS.map((m, idx) => (
            <span key={idx}>{m}</span>
          ))}
        </div>

        {/* Heatmap Matrix */}
        <div className="flex gap-1.5">
          {/* Day labels */}
          <div className="flex flex-col justify-between pr-2 text-[9px] font-mono font-bold text-[var(--organizer-ink-muted)]">
            {DAYS.map((d, i) => (
              <span key={i} className="h-3 leading-3">
                {d}
              </span>
            ))}
          </div>

          {/* 52 Columns */}
          <div className="flex flex-1 gap-1">
            {contributionGrid.map((week, wIdx) => (
              <div key={wIdx} className="flex flex-col gap-1">
                {week.map((_, dIdx) => (
                  <div
                    key={dIdx}
                    title="0 contributions"
                    className="h-3 w-3 rounded-none border border-[var(--organizer-border-light)] bg-[var(--organizer-surface-hover)] transition-transform hover:scale-125 hover:z-20 cursor-pointer"
                  />
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="mt-4 flex items-center justify-between border-t border-[var(--organizer-border)] pt-3 text-[10px] font-mono text-[var(--organizer-ink-muted)]">
          <span className="font-bold uppercase">
            0 CONTRIBUTIONS RECORDED · Learn how we calculate commits &amp; evaluations
          </span>
          <div className="flex items-center gap-1.5">
            <span className="uppercase text-[9px]">LESS</span>
            <div className="h-3 w-3 border border-[var(--organizer-border-light)] bg-[var(--organizer-surface-hover)]" />
            <div className="h-3 w-3 border border-[var(--organizer-border)] bg-[var(--organizer-gold-champagne)]" />
            <div className="h-3 w-3 border border-[var(--organizer-ink-primary)] bg-[var(--organizer-gold)]" />
            <div className="h-3 w-3 border border-[var(--organizer-ink-primary)] bg-[var(--organizer-gold-deep)]" />
            <div className="h-3 w-3 border border-[var(--organizer-ink-primary)] bg-[var(--organizer-ink-primary)]" />
            <span className="uppercase text-[9px]">MORE</span>
          </div>
        </div>
      </div>
    </div>
  );
}