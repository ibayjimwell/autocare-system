import { Database } from "@/lib/drizzle";
import { Appointments } from "@/database/models/appointments/appointments.model";
import { Customers } from "@/database/models/customers/customers.model";
import { Vehicles } from "@/database/models/customers/vehicles.model";
import { Services } from "@/database/models/services/services.model";
import { NextRequest, NextResponse } from "next/server";
import { getFormDataEntries, isValidUUID } from "@/utils/shared";
import {
  validateAppointmentData,
  generateTrackingNumber,
  serviceExists,
} from "@/utils/appointments";
import { and, asc, eq, inArray, sql, desc, not, gte, lte } from "drizzle-orm";
import { appointmentsTriggers } from '@/triggers/appointments';
import { mobileAppointmentsTriggers } from "@/app-triggers/appointments";
import { getAppointmentConfig, getEffectiveConfigForDate } from '@/utils/configurations';

// ------------------------------------------------------------------
// GET /api/appointments – List appointments with filters
// ------------------------------------------------------------------
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const customerId = searchParams.get('customerId');
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10) || 20));
  const all = searchParams.get('all') === 'true' || searchParams.get('all') === '1';
  const offset = all ? 0 : (page - 1) * limit;

  try {
    const conditions: any[] = [];

    if (status) {
      conditions.push(eq(Appointments.status, status.toUpperCase()));
    }

    if (customerId && isValidUUID(customerId)) {
      conditions.push(eq(Appointments.customerId, customerId));
    }

    if (from) {
      conditions.push(gte(Appointments.appointmentDate, from));
    }

    if (to) {
      conditions.push(lte(Appointments.appointmentDate, to));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    let countQuery: any = Database.select({ count: sql<number>`count(*)` })
      .from(Appointments);

    if (whereClause) {
      countQuery = countQuery.where(whereClause);
    }

    const [countResult] = await countQuery;
    const total = Number(countResult?.count || 0);

    let query: any = Database.select({
      id: Appointments.id,
      customerId: Appointments.customerId,
      vehicleId: Appointments.vehicleId,
      services: Appointments.services,
      trackingNumber: Appointments.trackingNumber,
      appointmentDate: Appointments.appointmentDate,
      appointmentTime: Appointments.appointmentTime,
      status: Appointments.status,
      notes: Appointments.notes,
      createdAt: Appointments.createdAt,
      updatedAt: Appointments.updatedAt,
      customer: {
        id: Customers.id,
        fullname: Customers.fullname,
        email: Customers.email,
        phone: Customers.phone,
      },
      vehicle: {
        id: Vehicles.id,
        make: Vehicles.make,
        model: Vehicles.model,
        year: Vehicles.year,
        plateNumber: Vehicles.plateNumber,
      },
    })
      .from(Appointments)
      .leftJoin(Customers, eq(Appointments.customerId, Customers.id))
      .leftJoin(Vehicles, eq(Appointments.vehicleId, Vehicles.id));

    if (whereClause) {
      query = query.where(whereClause);
    }

    query = query.orderBy(
      desc(Appointments.appointmentDate),
      desc(Appointments.appointmentTime),
    );

    if (!all) {
      query = query.limit(limit).offset(offset);
    }

    const appointments = await query;

    // Fetch service details for every returned appointment so searching by
    // service name works across the full database result set.
    const serviceMap: Record<string, any[]> = {};
    const allServiceIds = new Set<string>();

    for (const appt of appointments) {
      if (appt.services && Array.isArray(appt.services)) {
        for (const sid of appt.services) {
          if (typeof sid === 'string' && sid) allServiceIds.add(sid);
        }
      }
    }

    if (allServiceIds.size > 0) {
      const serviceList = await Database.select({
        id: Services.id,
        name: Services.name,
        description: Services.description,
        basePrice: Services.basePrice,
        estimatedDuration: Services.estimatedDuration,
        type: Services.type,
      })
        .from(Services)
        .where(inArray(Services.id, Array.from(allServiceIds)));

      const serviceObjMap = serviceList.reduce((acc, service) => {
        acc[service.id] = service;
        return acc;
      }, {} as Record<string, any>);

      for (const appt of appointments) {
        serviceMap[appt.id] = Array.isArray(appt.services)
          ? appt.services.map((sid: string) => serviceObjMap[sid]).filter(Boolean)
          : [];
      }
    }

    const data = appointments.map((appointment: any) => ({
      ...appointment,
      services: serviceMap[appointment.id] || [],
    }));

    return NextResponse.json(
      {
        error: false,
        message: 'Appointments retrieved successfully.',
        data,
        pagination: {
          page: all ? 1 : page,
          limit: all ? total : limit,
          total,
          pages: all ? (total > 0 ? 1 : 0) : Math.ceil(total / limit),
        },
      },
      { status: 200 },
    );
  } catch (e) {
    console.error('[GET /api/appointments] Error:', e);
    return NextResponse.json(
      {
        error: true,
        errorType: 'dbe',
        errorTitle: 'Database query error',
        errorMessage: 'Unable to fetch appointments.',
        errorLog: e instanceof Error ? e.message : String(e),
      },
      { status: 500 },
    );
  }
}

// ------------------------------------------------------------------
// POST /api/appointments – Create or merge a new appointment
// ------------------------------------------------------------------

const formatTimeForMessage = (time: string | null | undefined) => {
  if (!time) return 'the booked time';

  const [hourText, minuteText] = String(time).split(':');
  const hour = Number(hourText);
  const minute = Number(minuteText);

  if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
    return String(time);
  }

  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${String(minute).padStart(2, '0')} ${period}`;
};

const formatDateForMessage = (date: string | null | undefined) => {
  if (!date) return 'the selected date';

  const [year, month, day] = String(date).split('-').map(Number);

  if (!year || !month || !day) {
    return String(date);
  }

  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(Date.UTC(year, month - 1, day)));
  } catch {
    return String(date);
  }
};

const normalizeServiceIds = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];

  return Array.from(
    new Set(
      value
        .map((id) => String(id || '').trim())
        .filter(Boolean),
    ),
  );
};

const findExistingAppointment = async (
  customerId: string,
  vehicleId: string,
  appointmentDate: string,
) => {
  const [existing] = await Database.select({
    id: Appointments.id,
    customerId: Appointments.customerId,
    vehicleId: Appointments.vehicleId,
    services: Appointments.services,
    trackingNumber: Appointments.trackingNumber,
    appointmentDate: Appointments.appointmentDate,
    appointmentTime: Appointments.appointmentTime,
    status: Appointments.status,
    notes: Appointments.notes,
  })
    .from(Appointments)
    .where(
      and(
        eq(Appointments.customerId, customerId),
        eq(Appointments.vehicleId, vehicleId),
        eq(Appointments.appointmentDate, appointmentDate),
        not(eq(Appointments.status, 'CANCELLED')),
      ),
    )
    .orderBy(asc(Appointments.appointmentTime), asc(Appointments.createdAt))
    .limit(1);

  return existing || null;
};

const buildDuplicateDetails = async (
  existingAppointment: any,
  requestedServiceIds: string[],
) => {
  const existingServiceIds = normalizeServiceIds(
    existingAppointment?.services,
  );

  const existingSet = new Set(existingServiceIds);
  const missingServiceIds = requestedServiceIds.filter(
    (id) => !existingSet.has(id),
  );

  let missingServices: any[] = [];

  if (missingServiceIds.length > 0) {
    missingServices = await Database.select({
      id: Services.id,
      name: Services.name,
      description: Services.description,
      basePrice: Services.basePrice,
      estimatedDuration: Services.estimatedDuration,
      type: Services.type,
    })
      .from(Services)
      .where(inArray(Services.id, missingServiceIds));
  }

  return {
    existingServiceIds,
    missingServiceIds,
    missingServices,
  };
};

const duplicateResponse = ({
  existingAppointment,
  missingServices,
  missingServiceIds,
}: {
  existingAppointment: any;
  missingServices: any[];
  missingServiceIds: string[];
}) => {
  const hasMissingServices = missingServiceIds.length > 0;
  const bookedTime = formatTimeForMessage(
    existingAppointment?.appointmentTime,
  );
  const bookedDate = formatDateForMessage(
    existingAppointment?.appointmentDate,
  );

  return NextResponse.json(
    {
      error: true,
      errorCode: 'APPOINTMENT_DUPLICATE',
      errorType: 'fve',
      errorTitle: 'Appointment already booked',
      errorMessage: hasMissingServices
        ? `This customer and vehicle already have an appointment at ${bookedTime} on ${bookedDate}.`
        : `This appointment is already booked at ${bookedTime} on ${bookedDate}.`,
      duplicateType: hasMissingServices
        ? 'SERVICES_MISSING'
        : 'EXACT',
      existingAppointment: {
        ...existingAppointment,
        services: Array.isArray(existingAppointment?.services)
          ? existingAppointment.services
          : [],
      },
      missingServiceIds,
      missingServices,
    },
    { status: 409 },
  );
};

export async function POST(req: NextRequest) {
  let rawData: any;
  try {
    rawData = await getFormDataEntries(req);
  } catch (e) {
    return NextResponse.json({
      error: true,
      errorType: 'fe',
      errorTitle: 'Form data error',
      errorMessage: 'Could not read submitted form data.',
      errorLog: e instanceof Error ? e.message : String(e),
    }, { status: 400 });
  }

  const errors = validateAppointmentData(rawData);
  if (errors.length > 0) {
    return NextResponse.json({
      error: true,
      errorType: 'fve',
      errorTitle: 'Validation failed',
      errorMessage: errors.join(' '),
      errorLog: errors,
    }, { status: 422 });
  }

  // ----- Check if date is closed -----
  try {
    const { merged } = await getAppointmentConfig();
    const effective = getEffectiveConfigForDate(merged, rawData.appointmentDate);
    if (!effective.isOpen) {
      return NextResponse.json({
        error: true,
        errorType: 'fve',
        errorTitle: 'Shop closed',
        errorMessage: `The shop is closed on ${rawData.appointmentDate}${effective.reason ? ': ' + effective.reason : ''}. Please choose another date.`,
        errorLog: null,
      }, { status: 422 });
    }
  } catch (configErr) {
    console.error('[POST /api/appointments] Config check error:', configErr);
    return NextResponse.json({
      error: true,
      errorType: 'dbe',
      errorTitle: 'Configuration error',
      errorMessage: 'Unable to verify shop availability.',
      errorLog: String(configErr),
    }, { status: 500 });
  }

  let serviceIds: string[] = [];

  if (!rawData.services) {
    return NextResponse.json({
      error: true,
      errorType: 'fve',
      errorTitle: 'Services required',
      errorMessage: 'At least one service must be selected.',
      errorLog: null,
    }, { status: 422 });
  }

  try {
    serviceIds = normalizeServiceIds(
      JSON.parse(rawData.services),
    );
  } catch {
    return NextResponse.json({
      error: true,
      errorType: 'fve',
      errorTitle: 'Invalid services format',
      errorMessage: 'Services must be a JSON array of UUIDs.',
      errorLog: null,
    }, { status: 422 });
  }

  if (serviceIds.length === 0) {
    return NextResponse.json({
      error: true,
      errorType: 'fve',
      errorTitle: 'Invalid services',
      errorMessage: 'At least one service is required.',
      errorLog: null,
    }, { status: 422 });
  }

  for (const id of serviceIds) {
    if (!isValidUUID(id)) {
      return NextResponse.json({
        error: true,
        errorType: 'fve',
        errorTitle: 'Invalid service ID',
        errorMessage: `Service ID "${id}" is not a valid UUID.`,
        errorLog: null,
      }, { status: 422 });
    }

    const exists = await serviceExists(id);

    if (!exists) {
      return NextResponse.json({
        error: true,
        errorType: 'fve',
        errorTitle: 'Service not found',
        errorMessage: `Service "${id}" does not exist.`,
        errorLog: null,
      }, { status: 404 });
    }
  }

  const insertData = {
    customerId: rawData.customerId,
    vehicleId: rawData.vehicleId,
    services: serviceIds,
    trackingNumber: generateTrackingNumber(),
    appointmentDate: rawData.appointmentDate,
    appointmentTime: rawData.appointmentTime,
    status: 'PENDING',
    notes: rawData.notes?.trim() || null,
  };

  const duplicateAction = String(
    rawData.duplicateAction || '',
  ).toUpperCase();

  const requestedExistingAppointmentId = String(
    rawData.existingAppointmentId || '',
  ).trim();

  try {
    const existingAppointment = await findExistingAppointment(
      rawData.customerId,
      rawData.vehicleId,
      rawData.appointmentDate,
    );

    if (existingAppointment) {
      const duplicateDetails = await buildDuplicateDetails(
        existingAppointment,
        serviceIds,
      );

      if (duplicateAction === 'MERGE_SERVICES') {
        if (
          !requestedExistingAppointmentId ||
          !isValidUUID(requestedExistingAppointmentId)
        ) {
          return NextResponse.json({
            error: true,
            errorType: 'fve',
            errorTitle: 'Merge target required',
            errorMessage: 'The existing appointment could not be identified for the service merge.',
            errorLog: null,
          }, { status: 422 });
        }

        if (requestedExistingAppointmentId !== existingAppointment.id) {
          return NextResponse.json({
            error: true,
            errorCode: 'APPOINTMENT_DUPLICATE_STALE',
            errorType: 'fve',
            errorTitle: 'Appointment changed',
            errorMessage: 'The existing appointment changed before the services could be added. Please review the booking and try again.',
            errorLog: null,
          }, { status: 409 });
        }

        const mergedServiceIds = Array.from(
          new Set([
            ...duplicateDetails.existingServiceIds,
            ...serviceIds,
          ]),
        );

        const [updatedAppointment] = await Database.update(Appointments)
          .set({
            services: mergedServiceIds,
            updatedAt: new Date(),
          })
          .where(eq(Appointments.id, existingAppointment.id))
          .returning();

        if (!updatedAppointment) {
          return NextResponse.json({
            error: true,
            errorType: 'dbe',
            errorTitle: 'Merge failed',
            errorMessage: 'The existing appointment could not be updated.',
            errorLog: null,
          }, { status: 500 });
        }

        return NextResponse.json({
          error: false,
          merged: true,
          message: 'Services added to the existing appointment successfully.',
          data: updatedAppointment,
          existingAppointment: updatedAppointment,
          addedServiceIds: duplicateDetails.missingServiceIds,
        }, { status: 200 });
      }

      return duplicateResponse({
        existingAppointment,
        missingServices: duplicateDetails.missingServices,
        missingServiceIds: duplicateDetails.missingServiceIds,
      });
    }

    const [newAppointment] = await Database.insert(Appointments)
      .values(insertData)
      .returning();

    if (newAppointment) {
      appointmentsTriggers.onNew({
        trackingNumber: newAppointment.trackingNumber,
        customerName: 'Customer',
        appointmentDate: newAppointment.appointmentDate,
      }).catch(console.error);

      mobileAppointmentsTriggers.onNew({
        customerId: newAppointment.customerId,
        trackingNumber: newAppointment.trackingNumber,
        appointmentDate: newAppointment.appointmentDate,
      }).catch(console.error);
    }

    return NextResponse.json({
      error: false,
      message: 'Appointment created successfully.',
      data: newAppointment,
    }, { status: 201 });
  } catch (e: any) {
    console.error('[POST /api/appointments] Error:', e);

    /*
     * The database unique index is a second line of defense against
     * two simultaneous booking requests creating two appointments for
     * the same customer + vehicle + date.
     */
    if (e?.code === '23505') {
      try {
        const existingAfterConflict = await findExistingAppointment(
          rawData.customerId,
          rawData.vehicleId,
          rawData.appointmentDate,
        );

        if (existingAfterConflict) {
          const duplicateDetails = await buildDuplicateDetails(
            existingAfterConflict,
            serviceIds,
          );

          return duplicateResponse({
            existingAppointment: existingAfterConflict,
            missingServices: duplicateDetails.missingServices,
            missingServiceIds: duplicateDetails.missingServiceIds,
          });
        }
      } catch (lookupError) {
        console.error(
          '[POST /api/appointments] Failed to resolve unique constraint conflict:',
          lookupError,
        );
      }
    }

    return NextResponse.json({
      error: true,
      errorType: 'dbe',
      errorTitle: 'Database insertion failed',
      errorMessage: 'Could not create appointment.',
      errorLog: e instanceof Error ? e.message : String(e),
    }, { status: 500 });
  }
}
