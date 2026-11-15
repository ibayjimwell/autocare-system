import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/staffs/auth';
import { eq } from 'drizzle-orm';
import { Database } from '@/lib/drizzle';
import { EstimatedCosts } from '@/database/models/payments/estimated-costs.model';
import { ServiceWarranties, ServiceWarrantyParts } from '@/database/models/payments/service-warranties.model';
import { loadEstimateWarranties } from '@/lib/payments/warranties';
import { Inventory } from '@/database/models/inventory/inventory.model';
import { inArray } from 'drizzle-orm';
import { parseWarrantyInput } from '@/lib/payments/warranty-validation';
import { isValidUUID } from '@/utils/shared';

export async function GET(_request: NextRequest, { params }: { params: Promise<{id:string}> }) {
  const {id} = await params;
  if (!isValidUUID(id)) return NextResponse.json({error:true,errorMessage:'Invalid estimate ID.'},{status:400});
  try { return NextResponse.json({error:false,data:await loadEstimateWarranties(id)}, {headers:{'Cache-Control':'private, no-store'}}); }
  catch { return NextResponse.json({error:true,errorMessage:'Could not load warranties. Apply migration 0059.'},{status:500}); }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{id:string}> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({error:true,errorMessage:'Staff login required.'},{status:401});
  if (session.user.access?.payments !== true) return NextResponse.json({error:true,errorMessage:'Payments permission required.'},{status:403});
  const {id} = await params;
  if (!isValidUUID(id)) return NextResponse.json({error:true,errorMessage:'Invalid estimate ID.'},{status:400});
  let data: ReturnType<typeof parseWarrantyInput>;
  try { data = parseWarrantyInput(await request.json()); }
  catch (e) { return NextResponse.json({error:true,errorMessage:e instanceof Error?e.message:'Invalid request.'},{status:422}); }
  try {
    // Query inside transaction and lock estimate to avoid concurrent approval/warranty creation.
    const record = await Database.transaction(async tx => {
      const [estimate] = await tx.select().from(EstimatedCosts).where(eq(EstimatedCosts.id,id)).for('update').limit(1);
      if (!estimate) throw new Error('Estimate does not exist.');
      if (estimate.status!=='PENDING') throw new Error('Warranty terms are locked after estimate approval/decline.');
      const selected = data.inventoryIds.length ? await tx.select({id:Inventory.id,name:Inventory.name,active:Inventory.active}).from(Inventory).where(inArray(Inventory.id,data.inventoryIds)) : [];
      if (selected.length!==data.inventoryIds.length || selected.some(i=>!i.active)) throw new Error('Select only existing, active inventory items.');
      const [created] = await tx.insert(ServiceWarranties).values({estimateId:id,title:data.title,coverageType:data.coverageType,
        provider:data.provider,startDate:data.startDate,endDate:data.endDate,coverage:data.coverage,terms:data.terms,
        exclusions:data.exclusions,claimInstructions:data.claimInstructions,contact:data.contact}).returning({id:ServiceWarranties.id});
      if (selected.length) await tx.insert(ServiceWarrantyParts).values(selected.map(p=>({warrantyId:created.id,inventoryId:p.id,partName:p.name})));
      return created.id;
    });
    return NextResponse.json({error:false,message:'Warranty added.',data:{id:record}}, {status:201});
  } catch(e) {const msg=e instanceof Error?e.message:'Could not save warranty.';
    const validation=/Estimate does not|locked|Select only/.test(msg);
    return NextResponse.json({error:true,errorMessage:validation?msg:'Could not save warranty.'},{status:validation?409:500});}
}
