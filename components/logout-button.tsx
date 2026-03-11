"use client";

import { useTransition } from "react";
import { signOut } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  const [isPending, startTransition] = useTransition();

  const handleLogout = () => {
    startTransition(async () => {
      await signOut();
    });
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleLogout}
      disabled={isPending}
      className="border-primary/40 text-primary hover:bg-primary/10"
    >
      {isPending ? "Logging out..." : "Logout"}
    </Button>
  );
}
