import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EventForm } from "@/components/events/event-form";
import { getEvent, getSportTypes, getVenueCatalog } from "@/app/dashboard/events/actions";

interface EditEventPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditEventPage({ params }: EditEventPageProps) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    redirect("/auth/login");
  }

  const { id } = await params;
  const [event, sportTypes, venueCatalog] = await Promise.all([
    getEvent(id),
    getSportTypes(),
    getVenueCatalog(),
  ]);

  if (!event) {
    notFound();
  }

  return (
    <div className="flex-1 w-full max-w-5xl mx-auto p-8">
      <h1 className="text-2xl font-bold tracking-tight mb-1">Edit event</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Update your event details
      </p>
      <EventForm key={event.id} sportTypes={sportTypes} venueCatalog={venueCatalog} event={event} />
    </div>
  );
}
