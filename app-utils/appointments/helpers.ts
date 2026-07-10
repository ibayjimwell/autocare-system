// app-utils/appointments/helpers.ts

import { ClipboardCheck } from "lucide-react";

export const formatTime12h = (time24: string) => {
  if (!time24) return "";
  const [hour, minute] = time24.split(":");
  let h = parseInt(hour, 10);
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${minute} ${ampm}`;
};

export const FILTER_OPTIONS = [
  { value: "CONFIRMED", label: "Confirmed", icon: ClipboardCheck },
  // ... not used on this page, but placed here for other pages.
] as const;