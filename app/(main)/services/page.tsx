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
          onClick={() => setModalOpen(true)}
          className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 rounded-xl px-6 active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4 mr-2" />
          <span className="hidden sm:inline">Add Service Type</span>
          <span className="sm:hidden">Add</span>
        </Button>
      }
    >
      <ServiceList modalOpen={modalOpen} setModalOpen={setModalOpen} />
    </PageContainer>
  );
}