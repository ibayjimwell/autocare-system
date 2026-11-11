import type { Metadata } from 'next';
import Link from 'next/link';
import PublicPolicyLayout from '@/components/public-site/PublicPolicyLayout';
import { getPublicSiteConfig } from '@/lib/public-site';

export const metadata: Metadata = { title: 'Cancellation & Refund Policy | AutoCare' };

export default function RefundPolicyPage() {
  const business = getPublicSiteConfig();
  return (
    <PublicPolicyLayout eyebrow="Customer policies" title="Cancellation & Refund Policy" introduction="Information about appointment changes, payment corrections and refund requests for automotive services.">
      <section><h2>1. Appointment cancellations and rescheduling</h2><p>{business.name} accepts requests to cancel or reschedule through available AutoCare Mobile functions or service-center support. Requests depend on the appointment’s current status and open schedule slots. Contact the service center for assistance when in-app changes are no longer available.</p></section>
      <section><h2>2. Booking charges</h2><p>Browsing and viewing prices on this public website is free. The website does not charge a booking or reservation-placement fee, collect card information or provide a payment checkout. Any appointment-specific advance charge would need to be disclosed through the actual service and invoice process.</p></section>
      <section><h2>3. When to request a review</h2><p>Contact the service center for duplicate payments, incorrect charges, cancellation of work, unprovided services or other billing concerns. Provide the appointment/invoice reference, payment date, amount and a brief explanation. Eligibility depends on the circumstances, stage of work, parts already purchased, payment-provider procedures and applicable Philippine consumer law.</p></section>
      <section><h2>4. Approved refund processing</h2><p>If a refund or correction is approved, staff will communicate the method and applicable timeline. How quickly funds are credited can depend on the bank, e-wallet or payment provider. Do not provide passwords, one-time codes or private account credentials when asking for a refund.</p></section>
      <section><h2>5. Questions or disputes</h2><p>Use our <Link href="/contact">customer support information</Link> to request help. This policy does not limit any rights guaranteed by applicable Philippine law.</p></section>
    </PublicPolicyLayout>
  );
}
