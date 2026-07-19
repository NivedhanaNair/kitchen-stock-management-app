import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createUser, getUserByEmailWithPassword } from "@/lib/store";

export async function POST(request: NextRequest) {
  const body = await request.json();

  if (typeof body.name !== "string" || body.name.trim() === "") {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  if (typeof body.email !== "string" || !body.email.includes("@")) {
    return NextResponse.json({ error: "A valid email is required" }, { status: 400 });
  }
  if (typeof body.password !== "string" || body.password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }
  if (typeof body.inviteCode !== "string" || body.inviteCode !== process.env.FAMILY_INVITE_CODE) {
    return NextResponse.json({ error: "Invalid family invite code" }, { status: 400 });
  }

  const existing = await getUserByEmailWithPassword(body.email);
  if (existing) {
    return NextResponse.json({ error: "An account with that email already exists" }, { status: 409 });
  }

  const password_hash = await bcrypt.hash(body.password, 12);
  const user = await createUser({ name: body.name, email: body.email, password_hash });

  return NextResponse.json(user, { status: 201 });
}