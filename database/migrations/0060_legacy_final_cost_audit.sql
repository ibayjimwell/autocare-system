-- READ ONLY: inspect old bills created before 0060. Never blindly change their status.
SELECT f.id, f.appointment_id, f.estimate_id, f.status, f.grand_total,
       f.parked_at, e.status AS estimate_status, e.grand_total AS estimate_total
FROM public.final_bills f
LEFT JOIN public.estimated_costs e ON e.id = f.estimate_id
WHERE f.status IN ('PENDING','PARKED','HOLD')
ORDER BY f.created_at;
