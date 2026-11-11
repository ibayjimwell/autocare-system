import type { Metadata } from 'next';
import Link from 'next/link';
import PublicPolicyLayout from '@/components/public-site/PublicPolicyLayout';
import { getPublicSiteConfig } from '@/lib/public-site';

export const metadata: Metadata = { title: 'Privacy Policy | AutoCare' };

export default function PrivacyPage() {
  const business = getPublicSiteConfig();
  return (
    <PublicPolicyLayout eyebrow="Customer policies" title="Privacy Policy" introduction="This notice describes the types of information processed through AutoCare’s public website, Web system and customer mobile application.">
      <section><h2>1. Controller and services</h2><p>{business.name}, operated by {business.legalName}, processes information for vehicle servicing, bookings, billing and customer support. This public service catalog does not require customer registration.</p></section>
      <section><h2>2. Personal data</h2><p>Depending on the services used, AutoCare may collect or process customer names, contact information, account credentials, vehicle details, appointment history, inspection findings, service tasks, estimates, invoices, payment status and references, and notification subscriptions. Service catalog information comes from non-personal business records.</p></section>
      <section><h2>3. Purposes</h2><p>Information supports account verification, appointment booking, customer service, workshop operations, estimate approval, payment and receipt records, service and warranty history, fraud prevention, notifications and applicable legal obligations.</p></section>
      <section><h2>4. Authorized access and service providers</h2><p>Data may be accessible to authorized service-center staff and providers supporting hosting, databases, notifications, SMS and active payment facilities as appropriate to their roles. Payment providers may separately process transaction information under their own privacy notices. AutoCare does not intend to publish private customer records on this website.</p></section>
      <section><h2>5. Security and retention</h2><p>Account authentication and access restrictions are used to manage private records. Information is retained as reasonably necessary for service fulfillment, operational records, dispute resolution and legal requirements. No online service can guarantee absolute security.</p></section>
      <section><h2>6. Your rights and contact</h2><p>In accordance with applicable Philippine law including the Data Privacy Act of 2012, customers may request information about, access to, or correction of personal data and exercise other applicable rights. Send privacy concerns to the business using the official channels on our <Link href="/contact">contact page</Link>.</p></section>
      <section><h2>7. Policy changes</h2><p>We may update this policy if the application or business data practices change. The current version will be made available through this public website.</p></section>
    </PublicPolicyLayout>
  );
}
