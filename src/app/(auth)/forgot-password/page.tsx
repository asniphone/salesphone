import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { ForgotPasswordForm } from "./form";

export const metadata = {
    title: "Lupa Password - POS Internal",
};

export default async function ForgotPasswordPage() {
    const session = await getSession();
    if (session) {
        redirect("/dashboard");
    }

    return (
        <div className="space-y-6">
            <div className="text-center space-y-2">
                <h1 className="text-2xl font-bold tracking-tight">Lupa Password</h1>
                <p className="text-muted-foreground text-sm">
                    Kami akan mengirimkan OTP via WhatsApp untuk mereset kata sandi Anda.
                </p>
            </div>
            <ForgotPasswordForm />
        </div>
    );
}
