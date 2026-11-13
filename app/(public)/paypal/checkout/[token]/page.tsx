import type { Metadata } from 'next';
import PaypalCheckoutClient from '@/components/paypal/PaypalCheckoutClient';

export const metadata: Metadata = {
  title:'Secure PayPal Checkout | AutoCare',robots:{index:false,follow:false},
  referrer:'no-referrer',
};
export const dynamic = 'force-dynamic';
export default async function PaypalCheckoutPage({params,searchParams}:{params:Promise<{token:string}>;searchParams:Promise<{returnTo?:string}>}) {
  const {token}=await params;
  const query=await searchParams;
  // Only return to a customer document on this same origin. Never allow
  // protocol-relative or external redirects from untrusted search parameters.
  const returnTo=typeof query.returnTo==='string' && /^\/share\/[a-f0-9]{64}$/.test(query.returnTo)
    ? query.returnTo : undefined;
  return <PaypalCheckoutClient ticket={token} returnTo={returnTo}/>;
}

