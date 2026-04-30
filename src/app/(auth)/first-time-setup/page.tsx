import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { FirstTimeSetupForm } from "./form";

export default async function FirstTimeSetupPage() {
  // Jika sudah ada user, redirect ke login
  const userCount = await prisma.user.count();
  if (userCount > 0) {
    redirect("/login");
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Setup Awal</h1>
        <p className="text-muted-foreground text-sm">
          Buat akun admin pertama untuk mulai menggunakan sistem.
        </p>
      </div>
      <FirstTimeSetupForm />
    </div>
  );
}
