import {NextRequest,NextResponse} from 'next/server';
import {getServerSession} from 'next-auth';
import {authOptions} from '@/lib/auth/staffs/auth';
import {paypalSiteOrigin} from '@/lib/payments/paypal-sandbox';
import {qrSvg} from '@/lib/document-share/qr';

export const runtime='nodejs';
export async function GET(req:NextRequest) {
  const session=await getServerSession(authOptions);
  if(!session?.user?.id||session.user.access?.payments!==true)return new NextResponse('Unauthorized',{status:403});
  try {
    const text=new URL(req.url).searchParams.get('url')||'';
    const parsed=new URL(text);
    if(parsed.origin!==paypalSiteOrigin()||!/^\/share\/[a-f0-9]{64}$/.test(parsed.pathname)||parsed.search||parsed.hash)
      return new NextResponse('Invalid QR URL',{status:422});
    return new NextResponse(qrSvg(text),{status:200,headers:{'Content-Type':'image/svg+xml; charset=utf-8',
      'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'}});
  }catch{return new NextResponse('Unable to generate QR',{status:422});}
}
