'use client';

import React from 'react';
import PageContainer from '@/components/shared/page-container';
import ServiceTrackingSkeleton from '@/components/skeleton/service-tracking-skeleton';
import ServiceDetailPanel from '@/components/service-tracking/service-detail-panel';
import AppointmentListView from '@/components/service-tracking/appointment-list-view';
import { useAppointmentList } from '@/hooks/service-tracking/useAppointmentList';

export default function ServiceTrackingPage() {
  const {
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
  } = useAppointmentList();

  if (initialLoading) {
    return (
      <PageContainer
        title="Service Tracking"
        subtitle="Monitor and manage real‑time workshop operations"
      >
        <ServiceTrackingSkeleton />
      </PageContainer>
    );
  }

  if (selectedAppointment) {
    return (
      <ServiceDetailPanel
        appointment={selectedAppointment}
        onBack={handleBack}
        onStatusChanged={loadAppointments}
      />
    );
  }

  return (
    <PageContainer
      title="Service Tracking"
      subtitle="Monitor and manage real‑time workshop operations"
    >
      <AppointmentListView
        activeFilter={activeFilter}
        setActiveFilter={setActiveFilter}
        search={search}
        setSearch={setSearch}
        sortField={sortField}
        setSortField={setSortField}
        sortDirection={sortDirection}
        setSortDirection={setSortDirection}
        filteredAppointments={filteredAppointments}
        handleInspect={handleInspect}
        confirmDialogOpen={confirmDialogOpen}
        setConfirmDialogOpen={setConfirmDialogOpen}
        pendingAppointment={pendingAppointment}
        handleConfirmStartInspection={handleConfirmStartInspection}
      />
    </PageContainer>
  );
}