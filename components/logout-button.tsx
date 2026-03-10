"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();

  const logout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={logout}
      className="border-primary/40 text-primary hover:bg-primary/10"
    >
      Logout
    </Button>
  );
}
