
'use client';

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from 'react';

import { appointmentsApi } from '@/lib/appointments/appointments';
import { toast } from 'sonner';
import { useRealtimeAppointment } from '@/connections/useRealtimeAppointment';
import type { SortField } from '@/app-utils/service-tracking/constants';

/* ================================================================
   PHILIPPINE DATE HELPERS

   Auto Pro Tech operates in the Philippines (UTC+8).

   IMPORTANT:
   new Date().toISOString() returns UTC time.
   Between 12:00 AM and 7:59 AM in the Philippines,
   that UTC date can still be the previous day.

   Date.now() is converted to Philippine calendar time before
   extracting YYYY-MM-DD.
================================================================ */

const PHILIPPINE_OFFSET_MS = 8 * 60 * 60 * 1000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function todayPhilippinesString(
  timestamp: number = Date.now(),
): string {
  const philippinesDate = new Date(
    timestamp + PHILIPPINE_OFFSET_MS,
  );

  return philippinesDate.toISOString().slice(0, 10);
}

/* ================================================================
   NEXT PHILIPPINE CALENDAR DATE
================================================================ */

function nextPhilippinesDateString(
  dateString: string,
): string {
  const [year, month, day] = dateString.split('-').map(Number);

  const nextDate = new Date(
    Date.UTC(year, month - 1, day + 1),
  );

  return nextDate.toISOString().slice(0, 10);
}

/* ================================================================
   TIME REMAINING UNTIL PHILIPPINE MIDNIGHT
================================================================ */

function millisecondsUntilNextPhilippineDay(): number {
  const philippinesNow = Date.now() + PHILIPPINE_OFFSET_MS;

  const elapsedToday =
    ((philippinesNow % ONE_DAY_MS) + ONE_DAY_MS) % ONE_DAY_MS;

  return ONE_DAY_MS - elapsedToday + 250;
}

/* ================================================================
   APPOINTMENT LIST HOOK
================================================================ */

export function useAppointmentList() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [futureAppointments, setFutureAppointments] = useState<any[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);

  const [selectedAppointment, setSelectedAppointment] =
    useState<any>(null);

  const [activeFilter, setActiveFilter] = useState('CONFIRMED');

  const [search, setSearch] = useState('');

  const [sortField, setSortField] =
    useState<SortField>('customerName');

  const [sortDirection, setSortDirection] =
    useState<'asc' | 'desc'>('asc');

  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [pendingAppointment, setPendingAppointment] = useState<any>(null);
  const [futureDrawerOpen, setFutureDrawerOpen] = useState(false);

  /* ==============================================================
     CURRENT DATE — PHILIPPINES

     Use state instead of a normal const so the Confirmed Queue
     automatically refreshes when the date changes.
  ============================================================== */

  const [todayDate, setTodayDate] = useState<string>(
    () => todayPhilippinesString(),
  );

  /* ==============================================================
     AUTOMATIC PHILIPPINE DATE REFRESH

     This handles:
     - Initial page load
     - Philippine midnight
     - Browser tab returning from background
     - Browser window receiving focus

     Any change to todayDate causes useServiceQueue and
     loadAppointments to request the correct date.
  ============================================================== */

  useEffect(() => {
    let midnightTimer: ReturnType<typeof setTimeout> | null = null;

    const syncPhilippineDate = () => {
      const currentDate = todayPhilippinesString();

      setTodayDate((previousDate) => {
        return previousDate === currentDate
          ? previousDate
          : currentDate;
      });
    };

    const scheduleNextMidnight = () => {
      if (midnightTimer !== null) {
        clearTimeout(midnightTimer);
      }

      midnightTimer = setTimeout(() => {
        syncPhilippineDate();

        scheduleNextMidnight();
      }, millisecondsUntilNextPhilippineDay());
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        syncPhilippineDate();

        scheduleNextMidnight();
      }
    };

    const handleWindowFocus = () => {
      syncPhilippineDate();

      scheduleNextMidnight();
    };

    syncPhilippineDate();

    scheduleNextMidnight();

    document.addEventListener(
      'visibilitychange',
      handleVisibilityChange,
    );

    window.addEventListener(
      'focus',
      handleWindowFocus,
    );

    return () => {
      if (midnightTimer !== null) {
        clearTimeout(midnightTimer);
      }

      document.removeEventListener(
        'visibilitychange',
        handleVisibilityChange,
      );

      window.removeEventListener(
        'focus',
        handleWindowFocus,
      );
    };
  }, []);

  /* ==============================================================
     LOAD APPOINTMENTS

     CONFIRMED:
       Load appointments for the current Philippine date.

     OTHER STATUSES:
       Load appointments regardless of date.
  ============================================================== */

  const loadAppointments = useCallback(async () => {
    try {
      const params: any = {
        status: activeFilter,
        all: true,
      };

      if (activeFilter === 'CONFIRMED') {
        params.from = todayDate;
        params.to = todayDate;
      }

      const res = await appointmentsApi.list(params);

      if (res?.error) {
        toast.error(
          res.errorMessage || 'Failed to load appointments.',
        );

        setAppointments([]);
      } else {
        setAppointments(res?.data || []);
      }
    } catch (err: any) {
      toast.error(
        err?.message || 'Error loading appointments.',
      );

      setAppointments([]);
    }
  }, [activeFilter, todayDate]);

  /* ==============================================================
     FUTURE CONFIRMED APPOINTMENTS

     Tomorrow is based on the Philippine calendar date.
  ============================================================== */

  const loadFutureAppointments = useCallback(async () => {
    try {
      const from = nextPhilippinesDateString(
        todayPhilippinesString(),
      );

      const res = await appointmentsApi.list({
        status: 'CONFIRMED',
        from,
        all: true,
      });

      if (res?.error) {
        toast.error(
          res.errorMessage ||
            'Failed to load future appointments.',
        );

        setFutureAppointments([]);
      } else {
        const sorted = [...(res?.data || [])].sort(
          (a: any, b: any) => {
            const dateA =
              a.appointmentDate +
              ' ' +
              (a.appointmentTime || '00:00');

            const dateB =
              b.appointmentDate +
              ' ' +
              (b.appointmentTime || '00:00');

            return dateA.localeCompare(dateB);
          },
        );

        setFutureAppointments(sorted);
      }
    } catch (err: any) {
      toast.error(
        err?.message || 'Error loading future appointments.',
      );

      setFutureAppointments([]);
    }
  }, []);

  /* ==============================================================
     INITIAL LOAD
  ============================================================== */

  useEffect(() => {
    const init = async () => {
      setInitialLoading(true);

      try {
        await loadAppointments();
      } finally {
        setInitialLoading(false);
      }
    };

    void init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ==============================================================
     REFETCH ON FILTER OR DATE CHANGE

     When todayDate changes at Philippine midnight, loadAppointments
     is recreated and this effect refreshes the appointment list.

     The initial mount is skipped because the initial load effect
     already handles the first request.
  ============================================================== */

  const isFirstFilterChange = useRef(true);

  useEffect(() => {
    if (isFirstFilterChange.current) {
      isFirstFilterChange.current = false;
      return;
    }

    void loadAppointments();
  }, [activeFilter, loadAppointments]);

  /* ==============================================================
     REALTIME APPOINTMENT REFRESH
  ============================================================== */

  const handleRealtimeRefresh = useCallback(() => {
    void loadAppointments();
  }, [loadAppointments]);

  useRealtimeAppointment({
    onDataChanged: handleRealtimeRefresh,
  });

  /* ==============================================================
     INSPECT APPOINTMENT
  ============================================================== */

  const handleInspect = (appt: any) => {
    if (appt.status === 'CONFIRMED') {
      setPendingAppointment(appt);

      setConfirmDialogOpen(true);
    } else {
      setSelectedAppointment(appt);
    }
  };

  /* ==============================================================
     CONFIRM START INSPECTION

     After successfully updating the appointment to UNDER_INSPECTION,
     load the updated record and open its detail panel.

     Prevent duplicate requests while the transition is in progress.
  ============================================================== */

  const startingConfirmationRef = useRef(false);

  const handleConfirmStartInspection = async () => {
    if (
      !pendingAppointment ||
      startingConfirmationRef.current
    ) {
      return;
    }

    startingConfirmationRef.current = true;

    const appointmentToInspect = pendingAppointment;

    try {
      const res = await appointmentsApi.updateStatus(
        appointmentToInspect.id,
        'UNDER_INSPECTION',
      );

      if (res?.error) {
        toast.error(
          res.errorMessage || 'Failed to start inspection.',
        );

        return;
      }

      /* ----------------------------------------------------------
         LOAD COMPLETE UPDATED APPOINTMENT
      ---------------------------------------------------------- */

      let detail: any = null;

      try {
        const detailResponse = await appointmentsApi.get(
          appointmentToInspect.id,
        );

        if (
          !detailResponse?.error &&
          detailResponse?.data
        ) {
          detail = detailResponse.data;
        }
      } catch (error) {
        console.error(
          '[useAppointmentList] Unable to refresh inspection detail:',
          error,
        );
      }

      /* ----------------------------------------------------------
         OPEN INSPECTION DETAIL PANEL

         The original appointment data is retained as a fallback
         if fetching the updated record fails.
      ---------------------------------------------------------- */

      setSelectedAppointment({
        ...appointmentToInspect,
        ...(res?.data || {}),
        ...(detail || {}),
        id: appointmentToInspect.id,
        status: 'UNDER_INSPECTION',
      });

      /* ----------------------------------------------------------
         CHANGE ACTIVE TAB TO UNDER INSPECTION
      ---------------------------------------------------------- */

      setActiveFilter('UNDER_INSPECTION');

      setConfirmDialogOpen(false);

      toast.success('Inspection started!');
    } catch (err: any) {
      toast.error(
        err?.message || 'Error starting inspection.',
      );
    } finally {
      setPendingAppointment(null);

      startingConfirmationRef.current = false;
    }
  };

  /* ==============================================================
     BACK FROM DETAIL PANEL
  ============================================================== */

  const handleBack = () => {
    setSelectedAppointment(null);
  };

  /* ==============================================================
     CLIENT-SIDE FILTERING AND SORTING

     Existing behavior preserved.
  ============================================================== */

  const filteredAppointments = useMemo(() => {
    let data = [...appointments];

    if (search.trim()) {
      const term = search.toLowerCase();

      data = data.filter(
        (appt) =>
          (appt.customer?.fullname || '')
            .toLowerCase()
            .includes(term) ||

          (appt.vehicle?.plateNumber || '')
            .toLowerCase()
            .includes(term) ||

          (appt.vehicle?.model || '')
            .toLowerCase()
            .includes(term) ||

          (appt.trackingNumber || '')
            .toLowerCase()
            .includes(term) ||

          (appt.customer?.email || '')
            .toLowerCase()
            .includes(term) ||

          (appt.customer?.phone || '')
            .toLowerCase()
            .includes(term) ||

          (appt.vehicle?.make || '')
            .toLowerCase()
            .includes(term) ||

          (appt.status || '')
            .toLowerCase()
            .includes(term) ||

          (
            Array.isArray(appt.services)
              ? appt.services
              : []
          ).some((service: any) =>
            String(
              service?.name ||
                service?.title ||
                service ||
                '',
            )
              .toLowerCase()
              .includes(term),
          ),
      );
    }

    data.sort((a, b) => {
      let valA: any;
      let valB: any;

      switch (sortField) {
        case 'customerName':
          valA = (
            a.customer?.fullname || ''
          ).toLowerCase();

          valB = (
            b.customer?.fullname || ''
          ).toLowerCase();

          break;

        case 'vehiclePlate':
          valA = (
            a.vehicle?.plateNumber || ''
          ).toLowerCase();

          valB = (
            b.vehicle?.plateNumber || ''
          ).toLowerCase();

          break;

        case 'trackingNumber':
          valA = a.trackingNumber || '';
          valB = b.trackingNumber || '';

          break;

        default:
          return 0;
      }

      if (valA < valB) {
        return sortDirection === 'asc' ? -1 : 1;
      }

      if (valA > valB) {
        return sortDirection === 'asc' ? 1 : -1;
      }

      return 0;
    });

    return data;
  }, [
    appointments,
    search,
    sortField,
    sortDirection,
  ]);

  /* ==============================================================
     RETURN HOOK VALUES

     Keep every existing property so ServiceTrackingPage and
     other consumers continue working without modifications.
  ============================================================== */

  return {
    initialLoading,

    selectedAppointment,

    activeFilter,
    setActiveFilter,

    search,
    setSearch,

    sortField,
    setSortField,

    sortDirection,
    setSortDirection,

    confirmDialogOpen,
    setConfirmDialogOpen,

    pendingAppointment,

    handleInspect,
    handleConfirmStartInspection,

    handleBack,

    filteredAppointments,

    loadAppointments,

    futureAppointments,
    loadFutureAppointments,

    futureDrawerOpen,
    setFutureDrawerOpen,

    todayDate,
  };
}
