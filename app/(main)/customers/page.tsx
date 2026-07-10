'use client';

import React from 'react';
import PageContainer from '@/components/shared/page-container';
import CustomerList from '@/components/customers/customer-list';

export default function CustomersPage() {
  return (
    <PageContainer
      title="Customers"
      subtitle="Manage online or walk‑in customers"
    >
      <CustomerList />
    </PageContainer>
  );
}