import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";

export default async function RootPage() {
  // Jika sudah login, langsung ke dashboard
  const session = await getSession();
  if (session) {
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
