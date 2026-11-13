import {NextResponse} from 'next/server';
import {getServerSession} from 'next-auth';
import {eq} from 'drizzle-orm';
import {authOptions} from '@/lib/auth/staffs/auth';
import {Database} from '@/lib/drizzle';
import {PaymentDocumentLinks} from '@/database/models/payments/payment-document-links.model';
import {validUuid} from '@/lib/document-share/access';

export async function DELETE(_:Request,{params}:{params:Promise<{id:string}>}) {
  const session=await getServerSession(authOptions);
  if(!session?.user?.id||session.user.access?.payments!==true)return NextResponse.json({error:true,errorMessage:'Payments permission required.'},{status:403});
  const {id}=await params;
  if(!validUuid(id))return NextResponse.json({error:true,errorMessage:'Invalid link ID.'},{status:422});
  const rows=await Database.update(PaymentDocumentLinks).set({revokedAt:new Date()})
    .where(eq(PaymentDocumentLinks.id,id)).returning({id:PaymentDocumentLinks.id});
  return NextResponse.json({error:false,data:{revoked:rows.length>0}});
}
