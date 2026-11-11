import 'server-only';

import { asc, eq } from 'drizzle-orm';
import { Database } from '@/lib/drizzle';
import { Services } from '@/database/models/services/services.model';
import { Configurations } from '@/database/models/configurations/configurations.model';

/** Only public catalog fields, never staff/customer/appointment data. */
export type PublicService = {
  id: string;
  name: string;
  description: string | null;
  basePrice: string | null;
  estimatedDuration: number;
  type: string;
  subcategory: string | null;
  isLaborInclude: boolean;
};

export type PublicCatalog = {
  services: PublicService[];
  unavailable: boolean;
  /** Standard appointment window; individual dates may be closed or overridden. */
  standardHours: { opening: string; closing: string } | null;
};

const validTime = (time: unknown): time is string =>
  typeof time === 'string' &&
  /^([01]\d|2[0-3]):[0-5]\d$/.test(time);

export async function getPublicCatalog(): Promise<PublicCatalog> {
  // The catalog is read directly on the server, not via an internal HTTP call.
  // Each query is isolated so a missing configuration doesn't hide services.
  const [serviceResult, configResult] = await Promise.allSettled([
    Database.select({
      id: Services.id,
      name: Services.name,
      description: Services.description,
      basePrice: Services.basePrice,
      estimatedDuration: Services.estimatedDuration,
      type: Services.type,
      subcategory: Services.subcategory,
      isLaborInclude: Services.isLaborInclude,
    })
      .from(Services)
      .where(eq(Services.active, true))
      .orderBy(asc(Services.name)),
    Database.select({ config: Configurations.config })
      .from(Configurations)
      .where(eq(Configurations.module, 'appointments'))
      .limit(1),
  ]);

  const unavailable = serviceResult.status === 'rejected';
  if (unavailable) {
    console.error('[Public website] Service catalog unavailable:', serviceResult.reason);
  }
  if (configResult.status === 'rejected') {
    console.error('[Public website] Appointment configuration unavailable:', configResult.reason);
  }

  let standardHours: PublicCatalog['standardHours'] = null;
  if (configResult.status === 'fulfilled') {
    const config = configResult.value[0]?.config;
    const raw = config && typeof config === 'object' && !Array.isArray(config)
      ? (config as Record<string, unknown>).global
      : null;
    const global = raw && typeof raw === 'object' && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : null;
    const opening = global?.openingTime;
    const closing = global?.closingTime;
    if (validTime(opening) && validTime(closing) && opening < closing) {
      standardHours = { opening, closing };
    }
  }

  return {
    services: serviceResult.status === 'fulfilled' ? serviceResult.value : [],
    unavailable,
    standardHours,
  };
}
