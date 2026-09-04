"use client";

import { Button } from "@/components/ui/button";
import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

export default function LogoutButton() {
  const handleLogout = () => {
    signOut({ callbackUrl: "/login" });
  };

  return (
    <Button
      onClick={handleLogout}
      variant="outline"
      size="sm"
      className="h-11 rounded-md border-border bg-card px-4 text-sm font-medium text-foreground shadow-none transition-colors hover:bg-secondary hover:text-secondary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:h-9 md:px-3"
    >
      <LogOut className="mr-2 h-4 w-4 text-muted-foreground" />
      Logout
    </Button>
  );
}