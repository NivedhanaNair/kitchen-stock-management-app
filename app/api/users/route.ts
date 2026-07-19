import { NextResponse } from "next/server";
import { listUsers } from "@/lib/store";

/** Names of family members with accounts — used to show who logged a stock count. Never exposes password hashes. */
export async function GET() {
  return NextResponse.json(await listUsers());
}