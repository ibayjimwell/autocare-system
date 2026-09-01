'use client';

import React from 'react';
import PageContainer from '@/components/shared/page-container';
import ServiceList from '@/components/services/service-list';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export default function ServicesPage() {
  const [modalOpen, setModalOpen] = React.useState(false);

  return (
    <PageContainer
      title="Service Catalog"
      subtitle="Define and manage your professional service offerings"
      actions={
        <Button
          type="button"
          onClick={() => setModalOpen(true)}
          className="
            h-11 w-full rounded-md
            px-4 text-base font-medium
            shadow-sm
            focus-visible:outline-none
            focus-visible:ring-2
            focus-visible:ring-ring
            focus-visible:ring-offset-2
            md:h-9 md:w-auto
            md:px-3 md:text-sm
          "
        >
          <Plus className="h-5 w-5 md:h-4 md:w-4" />
          <span className="hidden sm:inline">
            Add Service Type
          </span>
          <span className="sm:hidden">
            Add Service
          </span>
        </Button>
      }
    >
      <ServiceList
        modalOpen={modalOpen}
        setModalOpen={setModalOpen}
      />
    </PageContainer>
  );
}