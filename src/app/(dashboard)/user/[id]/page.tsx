import { notFound } from "next/navigation";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { getUserById } from "@/actions/user";
import { UserDetailClient } from "./client";

interface UserDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function UserDetailPage({ params }: UserDetailPageProps) {
  const resolvedParams = await params;
  const idRaw = parseInt(resolvedParams.id, 10);

  if (isNaN(idRaw)) {
    notFound();
  }

  const result = await getUserById(idRaw);

  const user = result.data;
  if (!user) {
    notFound();
  }

  return (
    <>
      <header className="flex h-14 items-center gap-2 border-b px-4">
        <SidebarTrigger />
        <Separator orientation="vertical" className="h-4" />
        <h1 className="text-sm font-semibold">User / Profil</h1>
      </header>

      <div className="p-4 md:p-6 max-w-6xl mx-auto w-full">
        <div className="mb-6">
          <h2 className="text-2xl font-bold tracking-tight">Detail User: {user.name}</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Lihat profil, edit informasi, atau pantau aktivitas log dari user di sistem.
          </p>
        </div>

        <UserDetailClient user={user} />
      </div>
    </>
  );
}
