'use client';

import React from 'react';
import PageContainer from '@/components/shared/page-container';
import StaffList from '@/components/staffs/staff-list';

export default function StaffPage() {
  return (
    <PageContainer
      title="Staff management"
      subtitle="Manage your team members and their account permissions here."
    >
      <StaffList />
    </PageContainer>
  );
}