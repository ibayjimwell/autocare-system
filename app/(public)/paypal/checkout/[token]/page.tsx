import type { Metadata } from 'next';
import PaypalCheckoutClient from '@/components/paypal/PaypalCheckoutClient';

export const metadata: Metadata = {
  title:'Secure PayPal Checkout | AutoCare',robots:{index:false,follow:false},
  referrer:'no-referrer',
};
export const dynamic = 'force-dynamic';
export default async function PaypalCheckoutPage({params}:{params:Promise<{token:string}>}) {
  const {token}=await params;
  return <PaypalCheckoutClient ticket={token}/>;
}
