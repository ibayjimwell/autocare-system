import {NextRequest,NextResponse} from 'next/server';
import {getServerSession} from 'next-auth';
import {authOptions} from '@/lib/auth/staffs/auth';
import {loadDocument} from '@/lib/document-share/document';
import {newShareLink,validKind,validUuid} from '@/lib/document-share/access';
import {Database} from '@/lib/drizzle';
import {PaymentDocumentLinks} from '@/database/models/payments/payment-document-links.model';
import {and,eq,gt,isNull} from 'drizzle-orm';

export const dynamic='force-dynamic';
export async function POST(req:NextRequest) {
  const session=await getServerSession(authOptions);
  if(!session?.user?.id || session.user.access?.payments!==true) return NextResponse.json({error:true,errorMessage:'Payments permission required.'},{status:403});
  const body=await req.json().catch(()=>null);
  if(!validKind(body?.kind)||!validUuid(body?.documentId))return NextResponse.json({error:true,errorMessage:'Invalid document reference.'},{status:422});
  try {
    const document=await loadDocument(body.kind,body.documentId);
    if(!document)return NextResponse.json({error:true,errorMessage:'Document not found.'},{status:404});
    const share=await newShareLink(body.kind,body.documentId,String(session.user.id));
    return NextResponse.json({error:false,data:share},{status:201,headers:{'Cache-Control':'no-store'}});
  }catch(error){console.error('[Create document share]',error);return NextResponse.json({error:true,errorMessage:'Could not create secure document link.'},{status:500});}
}

export async function GET(req:NextRequest) {
  const session=await getServerSession(authOptions);
  if(!session?.user?.id||session.user.access?.payments!==true)return NextResponse.json({error:true,errorMessage:'Payments permission required.'},{status:403});
  const url=new URL(req.url);
  const kind=url.searchParams.get('kind'),id=url.searchParams.get('documentId');
  if(!validKind(kind)||!validUuid(id))return NextResponse.json({error:true,errorMessage:'Invalid document.'},{status:422});
  const rows=await Database.select({id:PaymentDocumentLinks.id,expiresAt:PaymentDocumentLinks.expiresAt,
    createdAt:PaymentDocumentLinks.createdAt}).from(PaymentDocumentLinks).where(and(
      eq(PaymentDocumentLinks.documentType,kind),eq(PaymentDocumentLinks.documentId,id),
      gt(PaymentDocumentLinks.expiresAt,new Date()),isNull(PaymentDocumentLinks.revokedAt),
  )).limit(100);
  return NextResponse.json({error:false,data:rows},{headers:{'Cache-Control':'no-store'}});
}
