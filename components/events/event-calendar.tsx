"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Pencil, Trash2, AlertTriangle } from "lucide-react";
import { deleteEvent } from "@/app/dashboard/events/actions";
import { toast } from "sonner";
import type { Event, Venue } from "@/types/database";

interface EventCalendarProps {
  events: Event[];
  /** When true, show search-specific empty state instead of "create first event" */
  hasActiveFilters?: boolean;
}

function formatEventDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatEventTimeRange(iso: string, durationMinutes?: number | null): string {
  const start = new Date(iso);
  const duration = durationMinutes ?? 60;
  const end = new Date(start.getTime() + duration * 60 * 1000);
  const startStr = start.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const endStr = end.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${startStr} – ${endStr}`;
}

function toDateKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getUniqueVenues(venues: Venue[]): Venue[] {
  const seen = new Set<string>();
  return venues
    .sort((a, b) => a.sort_order - b.sort_order)
    .filter((v) => {
      const key = `${v.name}|${v.address ?? ""}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

/** Check if two events overlap in time and share a venue */
function eventsOverlapAtVenue(a: Event, b: Event): boolean {
  const aStart = new Date(a.date_time).getTime();
  const bStart = new Date(b.date_time).getTime();
  const aDurationMs = (a.duration_minutes ?? 120) * 60 * 1000;
  const bDurationMs = (b.duration_minutes ?? 120) * 60 * 1000;
  const aEnd = aStart + aDurationMs;
  const bEnd = bStart + bDurationMs;
  const timeOverlap = aStart < bEnd && bStart < aEnd;

  if (!timeOverlap) return false;

  const aVenues = new Set(
    (a.venues ?? []).map((v) => `${v.name}|${v.address ?? ""}`)
  );
  const bVenues = (b.venues ?? []).map((v) => `${v.name}|${v.address ?? ""}`);
  return bVenues.some((key) => aVenues.has(key));
}

/** Group events by date and detect venue conflicts within each day */
function groupEventsByDate(events: Event[]) {
  const byDate = new Map<string, Event[]>();
  for (const e of events) {
    const key = toDateKey(e.date_time);
    const list = byDate.get(key) ?? [];
    list.push(e);
    byDate.set(key, list);
  }
  // Sort each day's events by time
  for (const list of byDate.values()) {
    list.sort((a, b) => new Date(a.date_time).getTime() - new Date(b.date_time).getTime());
  }
  // Sort dates chronologically
  const sortedDates = Array.from(byDate.keys()).sort();
  return { byDate, sortedDates };
}

function detectConflicts(events: Event[]): Set<string> {
  const conflicts = new Set<string>();
  for (let i = 0; i < events.length; i++) {
    for (let j = i + 1; j < events.length; j++) {
      if (eventsOverlapAtVenue(events[i], events[j])) {
        conflicts.add(events[i].id);
        conflicts.add(events[j].id);
      }
    }
  }
  return conflicts;
}

const EVENTS_PER_DAY_INITIAL = 5;

export function EventCalendar({ events, hasActiveFilters = false }: EventCalendarProps) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [detailEventId, setDetailEventId] = useState<string | null>(null);
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());

  const { byDate, sortedDates } = useMemo(
    () => groupEventsByDate(events),
    [events]
  );

  const handleDelete = async (eventId: string) => {
    setDeletingId(eventId);
    const result = await deleteEvent(eventId);
    setDeletingId(null);
    if (result.success) {
      setDetailEventId((prev) => (prev === eventId ? null : prev));
      toast.success("Event deleted.");
      router.refresh();
    } else {
      toast.error(result.error);
    }
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
              Try a different sport or search term.
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

  return (
    <div className="space-y-8">
      {sortedDates.map((dateKey) => {
        const dayEvents = byDate.get(dateKey) ?? [];
        const firstEvent = dayEvents[0];
        const dateLabel = firstEvent
          ? formatEventDate(firstEvent.date_time)
          : dateKey;
        const conflictIds = detectConflicts(dayEvents);
        const isExpanded = expandedDates.has(dateKey);
        const hasMore = dayEvents.length > EVENTS_PER_DAY_INITIAL;
        const visibleEvents = hasMore && !isExpanded
          ? dayEvents.slice(0, EVENTS_PER_DAY_INITIAL)
          : dayEvents;
        const hiddenCount = dayEvents.length - EVENTS_PER_DAY_INITIAL;

        return (
          <section
            key={dateKey}
            className="rounded-xl border border-border bg-card overflow-hidden"
            aria-label={`Events on ${dateLabel}`}
          >
            <div className="sticky top-0 z-10 px-4 py-3 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
              <h2 className="text-lg font-semibold">{dateLabel}</h2>
              <p className="text-sm text-muted-foreground dark:text-foreground/80">
                {dayEvents.length} event{dayEvents.length !== 1 ? "s" : ""}
                {conflictIds.size > 0 && (
                  <span className="ml-2 inline-flex items-center gap-1 text-amber-600 dark:text-amber-500">
                    <AlertTriangle className="size-3.5" aria-hidden />
                    Venue conflict
                  </span>
                )}
              </p>
            </div>
            <ul className="divide-y divide-border">
              {visibleEvents.map((event) => {
                const sport = Array.isArray(event.sport_types)
                  ? event.sport_types[0]
                  : event.sport_types;
                const sportName = sport?.name ?? "Unknown";
                const uniqueVenues = getUniqueVenues(event.venues ?? []);
                const hasConflict = conflictIds.has(event.id);
                const isDetailOpen = detailEventId === event.id;

                return (
                  <li key={event.id}>
                    <div
                      className={`flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors cursor-pointer ${
                        hasConflict ? "border-l-4 border-l-amber-500" : ""
                      }`}
                      onClick={() => setDetailEventId(event.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setDetailEventId(event.id);
                        }
                      }}
                      role="button"
                      tabIndex={0}
                      aria-label={`${event.name}, ${formatEventTimeRange(event.date_time, event.duration_minutes)}. Click to view details`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-primary shrink-0">
                            {formatEventTimeRange(event.date_time, event.duration_minutes)}
                          </span>
                          <Badge
                            variant="secondary"
                            className="bg-primary/20 text-primary border-primary/30 shrink-0"
                          >
                            {sportName}
                          </Badge>
                          {hasConflict && (
                            <span
                              className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-500"
                              title="Venue conflict with another event"
                            >
                              <AlertTriangle className="size-3" aria-hidden />
                              Conflict
                            </span>
                          )}
                        </div>
                        <p className="font-medium truncate mt-0.5">{event.name}</p>
                        {uniqueVenues.length > 0 && (
                          <p className="text-sm text-muted-foreground dark:text-foreground/75 truncate">
                            {uniqueVenues.map((v) => v.name).join(", ")}
                          </p>
                        )}
                      </div>
                      <div
                        className="flex gap-2 shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                          className="border-primary/40 text-primary hover:bg-primary/10"
                        >
                          <Link href={`/dashboard/events/${event.id}/edit`}>
                            <Pencil className="size-4 mr-1" aria-hidden />
                            Edit
                          </Link>
                        </Button>
                        <AlertDialog
                          open={deletingId === event.id}
                          onOpenChange={(open) => !open && setDeletingId(null)}
                        >
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-destructive/50 text-destructive hover:bg-destructive/10 hover:border-destructive"
                              onClick={() => setDeletingId(event.id)}
                              aria-label={`Delete event ${event.name}`}
                            >
                              <Trash2 className="size-4 mr-1" aria-hidden />
                              Delete
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete event?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete &quot;{event.name}&quot; and all its
                                venues. This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDelete(event.id)}
                              >
                                Delete
                              </Button>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                          </AlertDialog>
                      </div>
                    </div>

                    <Dialog
                      open={isDetailOpen}
                      onOpenChange={(open) => !open && setDetailEventId(null)}
                    >
                      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>{event.name}</DialogTitle>
                          <DialogDescription asChild>
                            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground dark:text-foreground/80">
                              <span>
                                {formatEventDate(event.date_time)} at{" "}
                                {formatEventTimeRange(event.date_time, event.duration_minutes)}
                              </span>
                              <Badge
                                variant="secondary"
                                className="bg-primary/20 text-primary border-primary/30"
                              >
                                {sportName}
                              </Badge>
                              {hasConflict && (
                                <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-500">
                                  <AlertTriangle className="size-3.5" aria-hidden />
                                  Venue conflict
                                </span>
                              )}
                            </div>
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-2">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground dark:text-foreground/80 mb-1">
                              Description
                            </p>
                            <p className="text-sm">
                              {event.description || (
                                <span className="text-muted-foreground dark:text-foreground/75 italic">
                                  No description
                                </span>
                              )}
                            </p>
                          </div>
                          {uniqueVenues.length > 0 && (
                            <div>
                              <p className="text-sm font-medium text-muted-foreground dark:text-foreground/80 mb-2">
                                Venues
                              </p>
                              <ul className="space-y-3">
                                {uniqueVenues.map((v) => (
                                  <li
                                    key={`${v.name}-${v.address ?? ""}`}
                                    className="text-sm pl-3 border-l-2 border-muted"
                                  >
                                    <span className="font-medium">{v.name}</span>
                                    {v.address ? (
                                      <p className="text-muted-foreground dark:text-foreground/75 text-xs mt-1 ml-1">
                                        {v.address}
                                      </p>
                                    ) : null}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                        <DialogFooter>
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/dashboard/events/${event.id}/edit`}>
                              <Pencil className="size-4 mr-1" aria-hidden />
                              Edit
                            </Link>
                          </Button>
                          <AlertDialog
                            open={deletingId === event.id}
                            onOpenChange={(open) => !open && setDeletingId(null)}
                          >
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-destructive/50 text-destructive hover:bg-destructive/10 hover:border-destructive"
                                onClick={() => setDeletingId(event.id)}
                                aria-label={`Delete event ${event.name}`}
                              >
                                <Trash2 className="size-4 mr-1" aria-hidden />
                                Delete
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete event?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently delete &quot;{event.name}&quot; and all its
                                  venues. This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <Button
                                  variant="destructive"
                                  onClick={() => handleDelete(event.id)}
                                >
                                  Delete
                                </Button>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                            </AlertDialog>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </li>
                );
              })}
            </ul>
            {hasMore && (
              <div className="px-4 py-3 border-t border-border">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-muted-foreground hover:text-foreground"
                  onClick={() =>
                    setExpandedDates((prev) => {
                      const next = new Set(prev);
                      if (isExpanded) next.delete(dateKey);
                      else next.add(dateKey);
                      return next;
                    })
                  }
                >
                  {isExpanded
                    ? "Show less"
                    : `Show ${hiddenCount} more event${hiddenCount !== 1 ? "s" : ""}`}
                </Button>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
