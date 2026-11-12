import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { Database } from '@/lib/drizzle';
import { Vehicles } from '@/database/models/customers/vehicles.model';
import { isValidUUID } from '@/utils/shared';
import { canAccessCustomerVehicles } from '@/lib/customers/vehicle-access';
import { deleteVehicleImage, uploadVehicleImage } from '@/lib/customers/vehicle-image';

export const runtime = 'nodejs';
const errorResponse = (message: string, status: number) => NextResponse.json(
  { error: true, errorMessage: message }, { status, headers: { 'Cache-Control': 'no-store' } },
);

type Context = { params: Promise<{ id: string; vehicleId: string }> };

async function findAuthorizedVehicle(req: NextRequest, params: Context['params']) {
  const { id, vehicleId } = await params;
  if (!isValidUUID(id) || !isValidUUID(vehicleId)) return { status: 422, vehicle: null };
  if (!(await canAccessCustomerVehicles(req, id))) return { status: 403, vehicle: null };
  const [vehicle] = await Database.select().from(Vehicles)
    .where(and(eq(Vehicles.id, vehicleId), eq(Vehicles.customerId, id))).limit(1);
  return { status: vehicle ? 200 : 404, vehicle: vehicle || null };
}

export async function POST(req: NextRequest, { params }: Context) {
  try {
    const found = await findAuthorizedVehicle(req, params);
    if (!found.vehicle) return errorResponse('Vehicle not found or access denied.', found.status);
    const form = await req.formData();
    const file = form.get('photo');
    if (!(file instanceof File)) return errorResponse('Select a vehicle photo.', 400);
    if (file.size > 3 * 1024 * 1024) return errorResponse('Photo must be smaller than 3 MB.', 413);
    let uploaded: Awaited<ReturnType<typeof uploadVehicleImage>>;
    try { uploaded = await uploadVehicleImage(file); }
    catch (error) {
      return errorResponse(error instanceof Error ? error.message : 'Unable to upload photo.', 422);
    }
    let updated;
    try {
      [updated] = await Database.update(Vehicles).set({ ...uploaded, updatedAt: new Date() })
        .where(and(eq(Vehicles.id, found.vehicle.id), eq(Vehicles.customerId, found.vehicle.customerId))).returning();
    } catch (error) {
      await deleteVehicleImage(uploaded.imagePublicId).catch((cleanupError) => console.warn('[VehiclePhoto] Cleanup failed:', cleanupError));
      throw error;
    }
    if (!updated) {
      await deleteVehicleImage(uploaded.imagePublicId).catch((error) => console.warn('[VehiclePhoto] Cleanup failed:', error));
      return errorResponse('Vehicle no longer exists.', 404);
    }
    if (found.vehicle.imagePublicId && found.vehicle.imagePublicId !== uploaded.imagePublicId) {
      await deleteVehicleImage(found.vehicle.imagePublicId).catch((error) => console.warn('[VehiclePhoto] Old image cleanup failed:', error));
    }
    return NextResponse.json({ error: false, data: updated }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('[VehiclePhoto] Upload error:', error);
    return errorResponse('Unable to save vehicle photo.', 500);
  }
}

export async function DELETE(req: NextRequest, { params }: Context) {
  try {
    const found = await findAuthorizedVehicle(req, params);
    if (!found.vehicle) return errorResponse('Vehicle not found or access denied.', found.status);
    const [updated] = await Database.update(Vehicles)
      .set({ imageUrl: null, imagePublicId: null, updatedAt: new Date() })
      .where(and(eq(Vehicles.id, found.vehicle.id), eq(Vehicles.customerId, found.vehicle.customerId))).returning();
    if (!updated) return errorResponse('Vehicle no longer exists.', 404);
    if (found.vehicle.imagePublicId) {
      await deleteVehicleImage(found.vehicle.imagePublicId).catch((error) => console.warn('[VehiclePhoto] Cleanup failed:', error));
    }
    return NextResponse.json({ error: false, data: updated }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('[VehiclePhoto] Remove error:', error);
    return errorResponse('Unable to remove vehicle photo.', 500);
  }
}
