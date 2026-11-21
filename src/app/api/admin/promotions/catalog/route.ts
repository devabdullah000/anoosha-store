import { catalog,errorResponse,headers,requireAdmin } from "@/lib/promotions/server";
export const dynamic="force-dynamic";
export async function GET(request:Request){
  try{
    await requireAdmin();const p=new URL(request.url).searchParams;
    return Response.json({success:true,data:await catalog(Number(p.get("page")||1),20,p.get("q")||"",p.get("categoryId")||"",p.get("includeCategories")==="1")},{headers});
  }catch(e){return errorResponse(e);}
}
