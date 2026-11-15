import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/staffs/auth';
import { loadInventoryWarranties } from '@/lib/payments/warranties';
import { isValidUUID } from '@/utils/shared';
export async function GET(_req:NextRequest,{params}:{params:Promise<{id:string}>}) {
  const session=await getServerSession(authOptions);
  if(!session?.user?.id)return NextResponse.json({error:true,errorMessage:'Staff login required.'},{status:401});
  if(session.user.access?.inventory!==true&&session.user.access?.payments!==true)return NextResponse.json({error:true,errorMessage:'Inventory or Payments permission required.'},{status:403});
  const {id}=await params;
  if(!isValidUUID(id))return NextResponse.json({error:true,errorMessage:'Invalid inventory ID.'},{status:400});
  try{return NextResponse.json({error:false,data:await loadInventoryWarranties(id)}, {headers:{'Cache-Control':'private, no-store'}});}
  catch{return NextResponse.json({error:true,errorMessage:'Warranty lookup failed.'},{status:500});}
}
