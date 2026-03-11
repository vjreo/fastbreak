"use client";

import React, { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Event } from "@/types/database";

interface EventCalendarGridProps {
  events: Event[];
  hasActiveFilters?: boolean;
}

function toDateKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatEventTimeRange(iso: string, durationMinutes?: number | null): string {
  const start = new Date(iso);
  const duration = durationMinutes ?? 60;
  const end = new Date(start.getTime() + duration * 60 * 1000);
  const startStr = start.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const endStr = end.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${startStr} – ${endStr}`;
}

function getUniqueVenueNames(venues: { name: string; address?: string | null }[]): string[] {
  const seen = new Set<string>();
  return venues
    .filter((v) => {
      const key = `${v.name}|${v.address ?? ""}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((v) => v.name);
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function EventCalendarGrid({ events, hasActiveFilters = false }: EventCalendarGridProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dateParam = searchParams.get("date") ?? "";

  const eventsByDate = useMemo(() => {
    const map = new Map<string, Event[]>();
    for (const e of events) {
      const key = toDateKey(e.date_time);
      const list = map.get(key) ?? [];
      list.push(e);
      map.set(key, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => new Date(a.date_time).getTime() - new Date(b.date_time).getTime());
    }
    return map;
  }, [events]);

  const [viewMonth, setViewMonth] = useState(() => {
    if (dateParam) {
      const [y, m] = dateParam.split("-").map(Number);
      return { year: y, month: m };
    }
    if (events.length > 0) {
      const d = new Date(events[0].date_time);
      return { year: d.getFullYear(), month: d.getMonth() + 1 };
    }
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  });

  const daysInMonth = useMemo(() => {
    const { year, month } = viewMonth;
    const first = new Date(year, month - 1, 1);
    const last = new Date(year, month, 0);
    const startPad = first.getDay();
    const dayCount = last.getDate();
    const cells: { dateKey: string | null; day: number; isCurrentMonth: boolean }[] = [];

    for (let i = 0; i < startPad; i++) {
      const d = new Date(year, month - 1, -startPad + i + 1);
      cells.push({
        dateKey: toDateKey(d.toISOString()),
        day: d.getDate(),
        isCurrentMonth: false,
      });
    }
    for (let d = 1; d <= dayCount; d++) {
      const dateKey = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      cells.push({ dateKey, day: d, isCurrentMonth: true });
    }
    const remaining = 42 - cells.length;
    for (let i = 0; i < remaining; i++) {
      const d = new Date(year, month, i + 1);
      cells.push({
        dateKey: toDateKey(d.toISOString()),
        day: d.getDate(),
        isCurrentMonth: false,
      });
    }
    return cells;
  }, [viewMonth]);

  const goPrevMonth = () => {
    setViewMonth((prev) => {
      if (prev.month === 1) return { year: prev.year - 1, month: 12 };
      return { ...prev, month: prev.month - 1 };
    });
  };

  const goNextMonth = () => {
    setViewMonth((prev) => {
      if (prev.month === 12) return { year: prev.year + 1, month: 1 };
      return { ...prev, month: prev.month + 1 };
    });
  };

  const selectDate = (dateKey: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("date", dateKey);
    router.push(`/dashboard?${params.toString()}`);
  };

  const clearDate = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("date");
    router.push(`/dashboard?${params.toString()}`);
  };

  if (events.length === 0) {
    return (
      <div className="text-center py-16 rounded-xl border border-dashed border-border bg-card/30">
        {hasActiveFilters ? (
          <>
            <p className="text-muted-foreground dark:text-foreground/80 mb-2">
              No events found for that search.
            </p>
            <p className="text-sm text-muted-foreground dark:text-foreground/70">
              Try a different sport, date, or search term.
            </p>
          </>
        ) : (
          <>
            <p className="text-muted-foreground dark:text-foreground/80 mb-2">
              No events found. Create your first event to get started.
            </p>
            <p className="text-sm text-muted-foreground dark:text-foreground/70">
              Accelerate your game with Forecheck AI.
            </p>
          </>
        )}
      </div>
    );
  }

  const monthLabel = new Date(viewMonth.year, viewMonth.month - 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  const selectedDayEvents = dateParam ? eventsByDate.get(dateParam) ?? [] : [];

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border">
          <Button variant="ghost" size="icon" className="size-8" onClick={goPrevMonth} aria-label="Previous month">
            <ChevronLeft className="size-4" />
          </Button>
          <h2 className="text-sm font-semibold">{monthLabel}</h2>
          <Button variant="ghost" size="icon" className="size-8" onClick={goNextMonth} aria-label="Next month">
            <ChevronRight className="size-4" />
          </Button>
        </div>
        <div className="p-2">
          <div className="grid grid-cols-7 gap-0.5 mb-1">
            {WEEKDAYS.map((d) => (
              <div
                key={d}
                className="text-center text-[10px] font-medium text-muted-foreground py-0.5"
              >
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {daysInMonth.map(({ dateKey, day, isCurrentMonth }) => {
              if (!dateKey) return null;
              const count = eventsByDate.get(dateKey)?.length ?? 0;
              const isSelected = dateParam === dateKey;
              return (
                <button
                  key={dateKey}
                  type="button"
                  onClick={() => selectDate(dateKey)}
                  title={count > 0 ? `${count} event${count !== 1 ? "s" : ""}` : undefined}
                  className={`
                    relative min-h-[2rem] rounded-md text-xs transition-colors flex flex-col items-center justify-center
                    ${!isCurrentMonth ? "text-muted-foreground/50" : "text-foreground"}
                    ${count > 0 ? "bg-primary/10 hover:bg-primary/20 font-medium" : "hover:bg-muted/50"}
                    ${isSelected ? "ring-2 ring-primary bg-primary/20" : ""}
                  `}
                >
                  <span>{day}</span>
                  {count > 0 && (
                    <span
                      className="absolute top-0 right-0 min-w-[1.25rem] h-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold flex items-center justify-center shadow-sm"
                      aria-hidden
                    >
                      {count > 99 ? "99+" : count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {dateParam && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h3 className="font-semibold">
              {new Date(dateParam + "T12:00:00").toLocaleDateString(undefined, {
                weekday: "long",
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </h3>
            <Button variant="ghost" size="sm" onClick={clearDate}>
              Clear
            </Button>
          </div>
          {selectedDayEvents.length > 0 ? (
            <ul className="divide-y divide-border">
              {selectedDayEvents.map((event) => {
                const sport = Array.isArray(event.sport_types)
                  ? event.sport_types[0]
                  : event.sport_types;
                const sportName = sport?.name ?? "Unknown";
                const uniqueVenues = getUniqueVenueNames(event.venues ?? []);
                const venueText = uniqueVenues.join(", ");
                return (
                  <li key={event.id} className="px-4 py-3 hover:bg-muted/30">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-primary shrink-0">
                        {formatEventTimeRange(event.date_time, event.duration_minutes)}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary">
                        {sportName}
                      </span>
                    </div>
                    <p className="font-medium mt-0.5">{event.name}</p>
                    {venueText && (
                      <p className="text-sm text-muted-foreground">{venueText}</p>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="px-4 py-8 text-center text-muted-foreground text-sm">
              No events on this day.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
