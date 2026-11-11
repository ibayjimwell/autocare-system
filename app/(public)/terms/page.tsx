import type { Metadata } from 'next';
import Link from 'next/link';
import PublicPolicyLayout from '@/components/public-site/PublicPolicyLayout';
import { getPublicSiteConfig } from '@/lib/public-site';

export const metadata: Metadata = { title: 'Terms & Conditions | AutoCare' };

export default function TermsPage() {
  const business = getPublicSiteConfig();
  return (
    <PublicPolicyLayout eyebrow="Customer policies" title="Terms & Conditions" introduction="The following information explains how appointments, services, estimates, payments and customer support are handled by AutoCare.">
      <section><h2>1. Our services</h2><p>{business.name}, operated by {business.legalName}, offers automotive preventive maintenance, repairs and diagnostics. This public website lists available services and general prices. Customer-specific appointments, estimates and final bills are managed in the AutoCare customer mobile app and at the service center.</p></section>
      <section><h2>2. Booking and availability</h2><p>Booking requests are subject to service-center schedules, capacity and confirmation. Customers must provide correct contact and vehicle information. Cancellation or rescheduling is available according to the status and procedures communicated in the app or by the service center.</p></section>
      <section><h2>3. Prices and approved work</h2><p>Publicly displayed service prices are base prices in PHP, not guaranteed final totals. Inspection findings, extra parts, excluded labor, applicable fees, discounts and customer-approved additional work can change the estimate. The appointment-specific estimate and final invoice govern the applicable charges. This website does not charge a booking or placement fee.</p></section>
      <section><h2>4. Payment methods</h2><p>Customers should pay only through a payment option actually presented in AutoCare Mobile or confirmed directly by authorized service-center staff. Electronic payment options depend on available provider features and merchant activation. A pending or submitted transfer is not a confirmed payment until verified. Never disclose a password or one-time passcode.</p></section>
      <section><h2>5. Work progress and warranties</h2><p>Repair recommendations depend on vehicle condition and inspection results. Any service warranty applies only if issued with a defined scope, coverage and duration. No general warranty period is promised by browsing this website.</p></section>
      <section><h2>6. Cancellations, refunds and support</h2><p>Please consult our <Link href="/refund-policy">Cancellation & Refund Policy</Link> for how to request a review. For service, billing, privacy or appointment concerns, use our <Link href="/contact">official contact details</Link>. These terms do not restrict any rights available under Philippine law.</p></section>
    </PublicPolicyLayout>
  );
}
