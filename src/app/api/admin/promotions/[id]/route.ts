import { deletePromotion,errorResponse,headers,promotionDetail,readBody,requireAdmin,togglePromotion,updatePromotion,verifyOrigin } from "@/lib/promotions/server";
export const dynamic="force-dynamic";
type Context={params:Promise<{id:string}>};
export async function GET(_:Request,ctx:Context){
  try{await requireAdmin();return Response.json({success:true,data:await promotionDetail((await ctx.params).id)},{headers});}
  catch(e){return errorResponse(e);}
}
export async function PATCH(request:Request,ctx:Context){
  try{
    await requireAdmin();verifyOrigin(request);const id=(await ctx.params).id;const body=await readBody(request);
    if(body && typeof body==="object" && !Array.isArray(body) && Object.keys(body).length===1 && "isActive" in body){
      if(typeof body.isActive!=="boolean")return Response.json({success:false,message:"isActive must be boolean."},{status:400,headers});
      await togglePromotion(id,body.isActive);
    }else await updatePromotion(id,body);
    return Response.json({success:true,message:"Promotion updated."},{headers});
  }catch(e){return errorResponse(e);}
}
export async function DELETE(request:Request,ctx:Context){
  try{await requireAdmin();verifyOrigin(request);await deletePromotion((await ctx.params).id);return Response.json({success:true,message:"Promotion deleted."},{headers});}
  catch(e){return errorResponse(e);}
}
