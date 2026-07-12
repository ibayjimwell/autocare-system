// app-utils/appointments/schema.ts
import { z } from "zod";

export const appointmentFormSchema = z.object({
  customerId: z.string().uuid("Select a customer"),
  vehicleId: z.string().uuid("Select a vehicle"),
  services: z.array(z.string().uuid()).min(1, "Select at least one service"),
  appointmentDate: z.date(),   // ← fixed – no options object
  appointmentTime: z.string().min(1, "Select time"),
  notes: z.string().optional(),
});

export type AppointmentFormData = z.infer<typeof appointmentFormSchema>;