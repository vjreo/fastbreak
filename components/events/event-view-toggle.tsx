"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { LayoutList, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EventCalendar } from "./event-calendar";
import { EventCalendarGrid } from "./event-calendar-grid";
import type { Event } from "@/types/database";

interface EventViewToggleProps {
  events: Event[];
  hasActiveFilters?: boolean;
}

export function EventViewToggle({ events, hasActiveFilters = false }: EventViewToggleProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const view = searchParams.get("view") ?? "list";

  const setView = (v: "list" | "calendar") => {
    const params = new URLSearchParams(searchParams.toString());
    if (v === "list") params.delete("view");
    else params.set("view", v);
    router.push(`/dashboard?${params.toString()}`);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button
          variant={view === "calendar" ? "outline" : "secondary"}
          size="sm"
          onClick={() => setView("list")}
          className={view === "list" ? "border-primary/40 bg-primary/10 text-primary" : ""}
        >
          <LayoutList className="size-4 mr-1.5" aria-hidden />
          List
        </Button>
        <Button
          variant={view === "list" ? "outline" : "secondary"}
          size="sm"
          onClick={() => setView("calendar")}
          className={view === "calendar" ? "border-primary/40 bg-primary/10 text-primary" : ""}
        >
          <Calendar className="size-4 mr-1.5" aria-hidden />
          Calendar
        </Button>
      </div>
      {view === "calendar" ? (
        <EventCalendarGrid events={events} hasActiveFilters={hasActiveFilters} />
      ) : (
        <EventCalendar events={events} hasActiveFilters={hasActiveFilters} />
      )}
    </div>
  );
}
