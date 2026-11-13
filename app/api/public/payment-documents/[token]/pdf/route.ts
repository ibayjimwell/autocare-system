import {NextResponse} from 'next/server';
import {resolveShare} from '@/lib/document-share/access';
import {loadDocument} from '@/lib/document-share/document';
import {documentPdf} from '@/lib/document-share/pdf';
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function GET(_:Request,{params}:{params:Promise<{token:string}>}) {
  const share=await resolveShare((await params).token);
  if(!share)return new NextResponse('Link expired or unavailable.',{status:404});
  const doc=await loadDocument(share.documentType,share.documentId);
  if(!doc)return new NextResponse('Document unavailable.',{status:404});
  const pdf=documentPdf(doc);
  const filename=`AutoCare-${share.documentType==='estimate'?'Estimate':'Final-Cost'}-${doc.appointment.trackingNumber.replace(/[^A-Za-z0-9_-]/g,'').slice(0,24)}.pdf`;
  return new NextResponse(new Uint8Array(pdf),{headers:{'Content-Type':'application/pdf',
    'Content-Disposition':`attachment; filename="${filename}"`,'Cache-Control':'private, no-store',
    'Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'}});
}
