"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  const [sport, setSport] = useState(searchParams.get("sport") ?? "");

  const applyFilters = useCallback(() => {
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (sport.trim()) params.set("sport", sport.trim());
    router.push(`/dashboard?${params.toString()}`);
  }, [router, search, sport]);

  const clearFilters = useCallback(() => {
    setSearch("");
    setSport("");
    router.push("/dashboard");
  }, [router]);

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
      <div className="relative flex-1 space-y-2">
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
      <div className="space-y-2 sm:w-[180px]">
        <Label id="sport-filter-label" className="sr-only">
          Filter by sport
        </Label>
        <Select value={sport || "all"} onValueChange={(v) => setSport(v === "all" ? "" : v)}>
          <SelectTrigger aria-labelledby="sport-filter-label" className="w-full sm:w-[180px]">
            <SelectValue placeholder="All sports" />
          </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All sports</SelectItem>
          {sportTypes.map((s) => (
            <SelectItem key={s.id} value={s.id}>
              {s.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
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
  );
}
