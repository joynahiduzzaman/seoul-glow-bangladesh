import { NextRequest } from "next/server";
import { startOAuthFlow } from "@/server/oauth";

export async function GET(req: NextRequest) {
  return startOAuthFlow(req, "google");
}
