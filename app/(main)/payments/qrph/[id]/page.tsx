import QRPhPaymentClient from '@/components/payments/QRPhPaymentClient';

export default async function QRPhPaymentPage({
  params,
}: {
  params: Promise<{
    id: string;
  }>;
}) {
  const { id } = await params;

  return (
    <QRPhPaymentClient
      billId={id}
    />
  );
}
