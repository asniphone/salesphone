import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { UserCreateForm } from "./form";

export default function UserCreatePage() {
  return (
    <>
      <header className="flex h-14 items-center gap-2 border-b px-4">
        <SidebarTrigger />
        <Separator orientation="vertical" className="h-4" />
        <h1 className="text-sm font-semibold">User / Tambah</h1>
      </header>

      <div className="p-4 md:p-6 max-w-2xl">
        <div className="mb-6">
          <h2 className="text-2xl font-bold tracking-tight">Tambah User Baru</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Buat akun staf atau karyawan agar mereka dapat login ke dalam sistem.
          </p>
        </div>

        <UserCreateForm />
      </div>
    </>
  );
}
