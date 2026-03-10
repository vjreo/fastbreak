import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EventForm } from "@/components/events/event-form";
import { getSportTypes, getVenueCatalog } from "@/app/dashboard/events/actions";

export default async function NewEventPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    redirect("/auth/login");
  }

  const [sportTypes, venueCatalog] = await Promise.all([
    getSportTypes(),
    getVenueCatalog(),
  ]);

  return (
    <div className="flex-1 w-full max-w-5xl mx-auto p-8">
      <h1 className="text-2xl font-bold tracking-tight mb-1">Create event</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Add a new event to your dashboard
      </p>
      <EventForm key="new" sportTypes={sportTypes} venueCatalog={venueCatalog} />
    </div>
  );
}
