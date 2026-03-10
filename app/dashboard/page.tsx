import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { AuthButton } from "@/components/auth-button";
import { Suspense } from "react";

async function DashboardContent() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    redirect("/auth/login");
  }

  return (
    <>
      <nav className="w-full flex justify-center border-b border-b-foreground/10 h-16">
        <div className="w-full max-w-5xl flex justify-between items-center p-3 px-5 text-sm">
          <Link href="/dashboard" className="font-semibold">
            Fastbreak
          </Link>
          <AuthButton />
        </div>
      </nav>
      <div className="flex-1 w-full max-w-5xl mx-auto p-8">
        <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to Fastbreak. Event management features coming in Phase 4.
        </p>
      </div>
    </>
  );
}

export default function DashboardPage() {
  return (
    <main className="min-h-screen flex flex-col">
      <Suspense fallback={<div className="flex-1 flex items-center justify-center">Loading...</div>}>
        <DashboardContent />
      </Suspense>
    </main>
  );
}
