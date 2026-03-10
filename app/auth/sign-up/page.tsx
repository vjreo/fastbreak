import Link from "next/link";
import { SignUpForm } from "@/components/sign-up-form";

export default function Page() {
  return (
    <div className="flex min-h-svh w-full flex-col items-center justify-center gap-8 p-6 md:p-10">
      <Link
        href="/"
        className="font-bold text-2xl tracking-tight text-foreground hover:text-primary transition-colors"
      >
        Fastbreak <span className="text-primary font-semibold">AI</span>
      </Link>
      <div className="w-full max-w-sm">
        <SignUpForm />
      </div>
    </div>
  );
}
