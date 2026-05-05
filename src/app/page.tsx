import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { getCurrentUserAccess } from "@/lib/access";

export default async function RootPage() {
  // Jika sudah login dan user valid, langsung ke dashboard
  const userAccess = await getCurrentUserAccess();
  if (userAccess) {
    redirect("/dashboard");
  }

  // Cek apakah sudah ada user di database
  const userCount = await prisma.user.count();

  if (userCount === 0) {
    redirect("/first-time-setup");
  } else {
    redirect("/login");
  }
}
