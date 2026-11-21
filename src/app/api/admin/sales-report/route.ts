import {
  generateSalesReport,
  parseSalesReportRequest,
  privateHeaders,
  readReportBody,
  reportErrorResponse,
  requireSalesReportAdmin,
  sameOrigin,
} from "@/lib/sales-report/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    sameOrigin(request);
    await requireSalesReportAdmin();
    const input = parseSalesReportRequest(await readReportBody(request));
    const report = await generateSalesReport(input);
    return Response.json(
      { success: true, data: report },
      { headers: privateHeaders },
    );
  } catch (error) {
    return reportErrorResponse(error);
  }
}
