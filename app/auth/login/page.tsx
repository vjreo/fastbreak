import Link from "next/link";
import { LoginForm } from "@/components/login-form";

export default function Page() {
  return (
    <div id="main-content" tabIndex={-1} className="flex min-h-svh w-full flex-col items-center justify-center gap-8 p-6 md:p-10">
      <Link
        href="/"
        className="font-bold text-2xl tracking-tight text-foreground"
      >
        Forecheck <span className="text-primary font-semibold">AI</span>
      </Link>
      <div className="w-full max-w-sm">
        <LoginForm />
      </div>
    </div>
  );
}
