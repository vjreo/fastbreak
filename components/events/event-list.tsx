"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
} from "@/components/ui/alert-dialog";
import { Pencil, Trash2 } from "lucide-react";
import { deleteEvent } from "@/app/dashboard/events/actions";
import { toast } from "sonner";
import type { Event } from "@/types/database";

interface EventListProps {
  events: Event[];
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

function formatEventTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function EventList({ events }: EventListProps) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (eventId: string) => {
    setDeletingId(eventId);
    const result = await deleteEvent(eventId);
    setDeletingId(null);
    if (result.success) {
      toast.success("Event deleted.");
      router.refresh();
    } else {
      toast.error(result.error);
    }
  };

  if (events.length === 0) {
    return (
      <div className="text-center py-16 rounded-xl border border-dashed border-border bg-card/30">
        <p className="text-muted-foreground mb-2">
          No events found. Create your first event to get started.
        </p>
        <p className="text-sm text-muted-foreground/80">
          Accelerate your game with Fastbreak AI.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {events.map((event) => {
        const sport = Array.isArray(event.sport_types)
          ? event.sport_types[0]
          : event.sport_types;
        const sportName = sport?.name ?? "Unknown";
        const venues = event.venues ?? [];
        const seenVenueNames = new Set<string>();
        const uniqueVenues = venues
          .sort((a, b) => a.sort_order - b.sort_order)
          .filter((v) => {
            const key = `${v.name}|${v.address ?? ""}`;
            if (seenVenueNames.has(key)) return false;
            seenVenueNames.add(key);
            return true;
          });

        return (
          <Card
            key={event.id}
            className="flex flex-col border-primary/20 hover:border-primary/40 transition-colors"
          >
            <CardHeader className="flex flex-row items-start justify-between gap-2">
              <div className="space-y-1.5 min-w-0">
                <CardTitle className="text-lg truncate">{event.name}</CardTitle>
                <CardDescription className="flex flex-col">
                  <span>{formatEventDate(event.date_time)}</span>
                  <span>{formatEventTime(event.date_time)}</span>
                </CardDescription>
              </div>
              <Badge
                  variant="secondary"
                  className="bg-primary/20 text-primary border-primary/30"
                >
                  {sportName}
                </Badge>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col">
              <div className="flex-1 space-y-4">
                <div className="min-h-[2.5rem]">
                  {event.description ? (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {event.description}
                    </p>
                  ) : null}
                </div>
                <div className="min-h-[1.25rem] text-sm">
                  {uniqueVenues.length > 0 && (
                    <>
                      <span className="font-medium text-muted-foreground">Venues:</span>{" "}
                      {uniqueVenues.map((v) => v.name).join(", ")}
                    </>
                  )}
                </div>
              </div>
              <div className="flex gap-2 pt-2 mt-auto">
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="border-primary/40 text-primary hover:bg-primary/10"
                >
                  <Link href={`/dashboard/events/${event.id}/edit`}>
                    <Pencil className="size-4 mr-1" />
                    Edit
                  </Link>
                </Button>
                <AlertDialog
                  open={deletingId === event.id}
                  onOpenChange={(open) => !open && setDeletingId(null)}
                >
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setDeletingId(event.id)}
                  >
                    <Trash2 className="size-4 mr-1" />
                    Delete
                  </Button>
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
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
