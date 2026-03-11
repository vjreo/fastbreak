import Link from "next/link";
import { Suspense } from "react";
import { AuthButton } from "@/components/auth-button";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen flex flex-col bg-background">
      <nav className="w-full flex justify-center border-b border-border h-16 bg-card/50 backdrop-blur-sm border-b-primary/10">
        <div className="w-full max-w-5xl flex justify-between items-center p-3 px-5 text-sm">
          <Link
            href="/dashboard"
            className="font-bold text-lg tracking-tight text-foreground"
          >
            Forecheck <span className="text-primary font-semibold">AI</span>
          </Link>
          <Suspense fallback={<div className="h-9 w-24" />}>
            <AuthButton />
          </Suspense>
        </div>
      </nav>
      <div id="main-content" tabIndex={-1} className="flex-1">
        {children}
      </div>
    </main>
  );
}
