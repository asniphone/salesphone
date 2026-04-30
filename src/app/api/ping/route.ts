import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const user = await prisma.user.count();
  return NextResponse.json({ message: "pong", timestamp: Date.now(), user });
}
