"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Chip } from "@/components/ui/chip";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import type { SportType } from "@/types/database";

interface EventFiltersProps {
  sportTypes: SportType[];
}

export function EventFilters({ sportTypes }: EventFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [date, setDate] = useState(searchParams.get("date") ?? "");
  const sportParam = searchParams.get("sport") ?? "";

  useEffect(() => {
    setSearch(searchParams.get("search") ?? "");
    setDate(searchParams.get("date") ?? "");
  }, [searchParams]);
  const selectedSports = sportParam
    ? sportParam.split(",").filter(Boolean)
    : [];

  const applyFilters = useCallback(() => {
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (date) params.set("date", date);
    if (selectedSports.length > 0) params.set("sport", selectedSports.join(","));
    router.push(`/dashboard?${params.toString()}`);
  }, [router, search, date, selectedSports]);

  const toggleSportFilter = useCallback(
    (sportId: string) => {
      const params = new URLSearchParams(searchParams.toString());
      const next = sportId
        ? selectedSports.includes(sportId)
          ? selectedSports.filter((id) => id !== sportId)
          : [...selectedSports, sportId]
        : [];
      if (next.length > 0) params.set("sport", next.join(","));
      else params.delete("sport");
      if (search.trim()) params.set("search", search.trim());
      if (date) params.set("date", date);
      router.push(`/dashboard?${params.toString()}`);
    },
    [router, searchParams, search, date, selectedSports]
  );

  const clearFilters = useCallback(() => {
    setSearch("");
    setDate("");
    router.push("/dashboard");
  }, [router]);

  return (
    <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:flex-wrap">
        <div className="relative flex-1 min-w-[200px] space-y-2">
          <Label htmlFor="event-search" className="sr-only">
            Search events
          </Label>
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-primary/70"
              aria-hidden
            />
            <Input
              id="event-search"
              placeholder="Search events..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && applyFilters()}
              className="pl-9"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="event-date" className="sr-only">
            Filter by date
          </Label>
          <Input
            id="event-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={`w-full sm:w-auto ${date ? "border-primary/50 ring-1 ring-primary/20" : ""}`}
            aria-label={date ? `Filter by date: ${date}` : "Filter by date"}
          />
        </div>
        <div className="flex gap-2">
          <Button onClick={applyFilters}>Apply</Button>
          <Button
            variant="outline"
            onClick={clearFilters}
            className="border-primary/40 text-primary hover:bg-primary/10"
          >
            Clear
          </Button>
        </div>
      </div>
      <div
        className="flex flex-nowrap gap-2 overflow-x-auto pb-1 -mx-1 overscroll-x-contain"
        role="group"
        aria-label="Filter by sport"
      >
        <Chip
          selected={selectedSports.length === 0}
          onClick={() => toggleSportFilter("")}
          className="shrink-0"
          aria-label="All sports"
        >
          All sports
        </Chip>
        {sportTypes.map((s) => (
          <Chip
            key={s.id}
            selected={selectedSports.includes(s.id)}
            onClick={() => toggleSportFilter(s.id)}
            className="shrink-0"
            aria-label={
              selectedSports.includes(s.id)
                ? `Remove ${s.name} filter`
                : `Filter by ${s.name}`
            }
          >
            {s.name}
          </Chip>
        ))}
      </div>
    </div>
  );
}
