import { getAuth } from "@/lib/auth";

// Better Auth handles its own auth endpoints below /api/auth/*.
// Do not add `runtime = "edge"`; OpenNext supplies the Worker runtime.
async function handler(request: Request): Promise<Response> {
  return getAuth().handler(request);
}

export { handler as GET, handler as POST };
