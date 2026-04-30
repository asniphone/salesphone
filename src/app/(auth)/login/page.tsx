import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { LoginForm } from "./form";

export default async function LoginPage() {
  // Jika sudah login, redirect ke dashboard
  const session = await getSession();
  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Masuk</h1>
        <p className="text-muted-foreground text-sm">
          Masukkan kredensial Anda untuk mengakses sistem.
        </p>
      </div>
      <LoginForm />
    </div>
  );
}
