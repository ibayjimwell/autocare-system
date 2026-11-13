import {NextResponse} from 'next/server';
import {resolveShare} from '@/lib/document-share/access';
import {loadDocument} from '@/lib/document-share/document';
export const dynamic='force-dynamic';
export async function GET(_:Request,{params}:{params:Promise<{token:string}>}) {
  try {
    const link=await resolveShare((await params).token);
    if(!link)return NextResponse.json({error:true,errorMessage:'Link expired or unavailable.'},{status:404});
    const doc=await loadDocument(link.documentType,link.documentId);
    if(!doc)return NextResponse.json({error:true,errorMessage:'Document unavailable.'},{status:404});
    return NextResponse.json({error:false,data:doc},{headers:{'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer'}});
  }catch(error){console.error('[Public document]',error);return NextResponse.json({error:true,errorMessage:'Unable to load document.'},{status:500});}
}
