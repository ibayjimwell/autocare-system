import { ClipboardCheck, Search, Wrench } from "lucide-react";

export const FILTER_OPTIONS = [
  { value: "CONFIRMED", label: "Confirmed", icon: ClipboardCheck },
  { value: "UNDER_INSPECTION", label: "Inspecting", icon: Search },
  { value: "IN_PROGRESS", label: "In Progress", icon: Wrench },
];

export const SORT_OPTIONS = [
  { value: "customerName", label: "Customer Name" },
  { value: "vehiclePlate", label: "Vehicle Plate" },
  { value: "trackingNumber", label: "Tracking Number" },
];

export type SortField = "customerName" | "vehiclePlate" | "trackingNumber";