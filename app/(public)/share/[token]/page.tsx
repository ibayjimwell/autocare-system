import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import {resolveShare} from '@/lib/document-share/access';
import {loadDocument} from '@/lib/document-share/document';
import SharedDocumentView from '@/components/payments/SharedDocumentView';
export const dynamic='force-dynamic';
export const metadata:Metadata={title:'Customer Document | AutoCare',robots:{index:false,follow:false},referrer:'no-referrer'};
export default async function PublicPaymentDocument({params}:{params:Promise<{token:string}>}) {
  const {token}=await params;
  const link=await resolveShare(token);
  if(!link)notFound();
  const doc=await loadDocument(link.documentType,link.documentId);
  if(!doc)notFound();
  return <SharedDocumentView token={token} initial={doc}/>;
}
