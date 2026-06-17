"use client";

import { Button } from "@/components/ui/button";
import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

export default function LogoutButton() {
  const handleLogout = () => {
    signOut({ callbackUrl: "/login" });
  };

  return (
    <Button onClick={handleLogout} variant="outline" size="sm">
      <LogOut className="w-4 h-4 mr-2" />
      Logout
    </Button>
  );
}