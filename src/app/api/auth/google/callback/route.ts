import { NextRequest } from "next/server";
import { handleOAuthCallback } from "@/server/oauth";

export async function GET(req: NextRequest) {
  return handleOAuthCallback(req, "google");
}
