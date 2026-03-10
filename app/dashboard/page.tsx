import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Suspense } from "react";
import { getEvents, getSportTypes } from "@/app/dashboard/events/actions";
import { EventList } from "@/components/events/event-list";
import { EventFilters } from "@/components/events/event-filters";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface DashboardPageProps {
  searchParams: Promise<{ search?: string; sport?: string }>;
}

async function DashboardContent({ searchParams }: { searchParams: Promise<{ search?: string; sport?: string }> }) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    redirect("/auth/login");
  }

  const params = await searchParams;
  const events = await getEvents(params.search, params.sport);
  const sportTypes = await getSportTypes();

  return (
    <div className="flex-1 w-full max-w-5xl mx-auto p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Events Dashboard
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Accelerate your game with Fastbreak AI
            </p>
          </div>
          <Button asChild>
            <Link href="/dashboard/events/new">
              <Plus className="size-4 mr-2" />
              New event
            </Link>
          </Button>
        </div>
        <Suspense fallback={<div className="h-12" />}>
          <EventFilters sportTypes={sportTypes} />
        </Suspense>
        <div className="mt-6">
          <EventList events={events} />
        </div>
    </div>
  );
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  return (
    <main className="min-h-screen flex flex-col">
      <Suspense fallback={<div className="flex-1 flex items-center justify-center"><div className="animate-pulse text-muted-foreground text-sm">Loading...</div></div>}>
        <DashboardContent searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
