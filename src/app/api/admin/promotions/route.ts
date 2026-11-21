import { createPromotion, errorResponse, headers, listPromotions, readBody, requireAdmin, verifyOrigin } from "@/lib/promotions/server";
export const dynamic="force-dynamic";
export async function GET(request:Request){
  try{
    await requireAdmin();const p=new URL(request.url).searchParams;
    return Response.json({success:true,data:await listPromotions(Number(p.get("page")||1),Number(p.get("pageSize")||10))},{headers});
  }catch(e){return errorResponse(e);}
}
export async function POST(request:Request){
  try{
    await requireAdmin();verifyOrigin(request);
    return Response.json({success:true,message:"Promotion created.",data:await createPromotion(await readBody(request))},{status:201,headers});
  }catch(e){return errorResponse(e);}
}
