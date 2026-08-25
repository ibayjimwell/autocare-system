"use client";

import { Button } from "@/components/ui/button";
import { Wrench, Menu } from "lucide-react";
import NotificationBell from "./NotificationBell";

export function MobileHeader({ onMenuClick }: { onMenuClick: () => void }) {
  return (
    <header className="h-16 bg-card backdrop-blur-md border-b border-border flex items-center justify-between px-4 lg:hidden sticky top-0 z-40 animate-in fade-in slide-in-from-top-2 duration-500">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuClick}
          className="rounded-xl hover:bg-primary/5 active:scale-95 transition-all duration-200 h-10 w-10"
        >
          <Menu className="w-6 h-6 text-slate-700" />
          <span className="sr-only">Toggle Menu</span>
        </Button>

        <div className="flex items-center gap-2.5 ml-1">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-sm shadow-primary/20 rotate-0 hover:rotate-6 transition-transform">
            <Wrench className="w-4.5 h-4.5 text-primary-foreground" />
          </div>
          <div className="flex flex-col">
            <h1 className="font-black text-sm md:text-base tracking-tighter leading-none">
              <span className="text-primary uppercase">Auto</span>{" "}
              <span className="text-black uppercase">Pro Tech</span>
            </h1>
            <span className="text-[9px] font-bold text-muted-foreground tracking-[0.15em] uppercase">
              AutoCare System
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <NotificationBell />
      </div>
    </header>
  );
}