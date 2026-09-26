import { NextRequest, NextResponse } from 'next/server';

import {
  getAppointmentConfig,
  getEffectiveConfigForDate,
} from '@/utils/configurations';

export const dynamic = 'force-dynamic';

const SLOT_MINUTES = 30;

function parseTimeToMinutes(
  value: string,
): number | null {
  const match = value.match(
    /^(\d{2}):(\d{2})(?::\d{2})?$/,
  );

  if (!match) {
    return null;
  }

  const hour = Number(match[1]);
  const minute = Number(match[2]);

  if (
    !Number.isInteger(hour) ||
    !Number.isInteger(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return null;
  }

  return hour * 60 + minute;
}

function formatTime(
  totalMinutes: number,
): string {
  const hour = Math.floor(
    totalMinutes / 60,
  );

  const minute =
    totalMinutes % 60;

  return `${hour
    .toString()
    .padStart(2, '0')}:${minute
    .toString()
    .padStart(2, '0')}`;
}

export async function GET(
  req: NextRequest,
) {
  console.log(
    '🚀 [available-slots] ROUTE EXECUTED',
  );

  const {
    searchParams,
  } = new URL(
    req.url,
  );

  const date =
    searchParams.get(
      'date',
    );

  /*
   * `serviceIds` may still be present in older requests. It is
   * deliberately ignored. Available times are now determined only
   * by the shop hours for the selected date.
   */

  if (!date) {
    return NextResponse.json(
      {
        error: true,
        errorType: 'fve',
        errorTitle: 'Missing date',
        errorMessage:
          'A selected appointment date is required.',
        data: [],
      },
      {
        status: 400,
      },
    );
  }

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      date,
    )
  ) {
    return NextResponse.json(
      {
        error: true,
        errorType: 'fve',
        errorTitle: 'Invalid date',
        errorMessage:
          'Appointment date must use YYYY-MM-DD format.',
        data: [],
      },
      {
        status: 400,
      },
    );
  }

  try {
    const {
      merged,
    } = await getAppointmentConfig();

    const effective =
      getEffectiveConfigForDate(
        merged,
        date,
      );

    if (
      !effective.isOpen
    ) {
      return NextResponse.json(
        {
          error: false,
          message: `Shop is closed on ${date}${effective.reason ? `: ${effective.reason}` : ''}`,
          data: [],
          openingTime:
            effective.openingTime,
          closingTime:
            effective.closingTime,
          slotMinutes:
            SLOT_MINUTES,
        },
        {
          status: 200,
          headers: {
            'Cache-Control':
              'no-store, max-age=0',
          },
        },
      );
    }

    const openingTime =
      effective.openingTime;

    const closingTime =
      effective.closingTime;

    const shopOpen =
      parseTimeToMinutes(
        openingTime,
      );

    const shopClose =
      parseTimeToMinutes(
        closingTime,
      );

    if (
      shopOpen === null ||
      shopClose === null ||
      shopClose <= shopOpen
    ) {
      return NextResponse.json(
        {
          error: true,
          errorType: 'config',
          errorTitle:
            'Invalid shop hours',
          errorMessage:
            'The configured opening and closing times are invalid.',
          data: [],
        },
        {
          status: 422,
        },
      );
    }

    /*
     * Generate the complete time list from opening time until the
     * closing boundary. The current shop scheduling interval is 30
     * minutes.
     *
     * IMPORTANT:
     * - selected-service duration is NOT used here
     * - existing appointment duration is NOT used here
     * - existing appointments do NOT remove time entries here
     *
     * This endpoint is therefore a pure shop-hours time listing.
     */
    const slots: {
      time: string;
      available: boolean;
    }[] = [];

    for (
      let minutes = shopOpen;
      minutes < shopClose;
      minutes += SLOT_MINUTES
    ) {
      slots.push({
        time:
          formatTime(minutes),
        available: true,
      });
    }

    console.log(
      '[available-slots] Returning shop-hour times:',
      {
        date,
        openingTime,
        closingTime,
        slotCount:
          slots.length,
      },
    );

    return NextResponse.json(
      {
        error: false,
        message:
          'Available times retrieved from shop hours.',
        data: slots,
        openingTime,
        closingTime,
        slotMinutes:
          SLOT_MINUTES,
      },
      {
        status: 200,
        headers: {
          'Cache-Control':
            'no-store, max-age=0',
        },
      },
    );
  } catch (error) {
    console.error(
      '[available-slots] Error:',
      error,
    );

    return NextResponse.json(
      {
        error: true,
        errorType: 'dbe',
        errorTitle:
          'Database/configuration error',
        errorMessage:
          'Unable to load the shop time schedule.',
        data: [],
      },
      {
        status: 500,
      },
    );
  }
}
