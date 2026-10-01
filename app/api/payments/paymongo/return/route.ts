import {
  NextRequest,
  NextResponse,
} from 'next/server';

function getFirstParam(
  value: string | null,
) {
  return value?.trim() || null;
}

function buildAutoCareDeepLink(
  billId: string,
  paymentIntentId: string | null,
) {
  const scheme =
    process.env.MOBILE_APP_SCHEME ||
    'autocare';

  const params =
    new URLSearchParams();

  params.set(
    'billId',
    billId,
  );

  if (paymentIntentId) {
    params.set(
      'paymentIntentId',
      paymentIntentId,
    );
  }

  return `${scheme}://payment-return?${params.toString()}`;
}

export async function GET(
  req: NextRequest,
) {
  const billId =
    getFirstParam(
      req.nextUrl.searchParams.get(
        'billId',
      ),
    );

  const paymentIntentId =
    getFirstParam(
      req.nextUrl.searchParams.get(
        'payment_intent_id',
      ) ??
        req.nextUrl.searchParams.get(
          'paymentIntentId',
        ),
    );

  if (!billId) {
    return new NextResponse(
      '<!doctype html><html><head><meta charset="utf-8"><title>AutoCare Payment</title></head><body><h1>Payment return received</h1><p>The AutoCare bill reference was missing. You can return to the app.</p></body></html>',
      {
        status: 400,
        headers: {
          'Content-Type':
            'text/html; charset=utf-8',
        },
      },
    );
  }

  const deepLink =
    buildAutoCareDeepLink(
      billId,
      paymentIntentId,
    );

  /*
   * PayMongo expects an HTTPS return_url. This page is the HTTPS bridge
   * back into the native Expo application.
   *
   * The browser receives the HTTPS return, then the client-side redirect
   * opens AutoCare's custom URL scheme. The app separately verifies the
   * Payment Intent server-side; the query parameters are never treated as
   * proof of payment.
   */
  const escapedDeepLink =
    deepLink
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <meta http-equiv="refresh" content="0;url=${escapedDeepLink}">
    <title>Returning to AutoCare</title>
  </head>
  <body style="font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding:32px;text-align:center">
    <h1>Returning to AutoCare…</h1>
    <p>We are taking you back to the AutoCare app so we can verify your payment.</p>
    <p><a href="${escapedDeepLink}">Open AutoCare</a></p>
    <script>
      window.location.replace(${JSON.stringify(deepLink)});
    </script>
  </body>
</html>`;

  return new NextResponse(
    html,
    {
      status: 200,
      headers: {
        'Content-Type':
          'text/html; charset=utf-8',
        'Cache-Control':
          'no-store, no-cache, must-revalidate',
      },
    },
  );
}
