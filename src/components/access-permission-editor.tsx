"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield } from "lucide-react";

// ============================================================
// Access permission keys — must match Prisma schema field names
// ============================================================

export const ACCESS_GROUPS = [
  {
    label: "Dashboard",
    permissions: [
      { key: "accessDashboardGeneralRead", label: "Lihat Dashboard" },
    ],
  },
  {
    label: "Unit",
    permissions: [
      { key: "accessUnitRead", label: "Lihat" },
      { key: "accessUnitCreate", label: "Tambah" },
      { key: "accessUnitUpdate", label: "Edit" },
      { key: "accessUnitDelete", label: "Hapus" },
      { key: "accessUnitReport", label: "Laporan" },
    ],
  },
  {
    label: "Aksesoris",
    permissions: [
      { key: "accessAccessoryRead", label: "Lihat" },
      { key: "accessAccessoryCreate", label: "Tambah" },
      { key: "accessAccessoryUpdate", label: "Edit" },
      { key: "accessAccessorySell", label: "Jual" },
      { key: "accessAccessoryDelete", label: "Hapus" },
      { key: "accessAccessoryReport", label: "Laporan" },
      { key: "accessAccessoryHistory", label: "Riwayat Jual" },
    ],
  },
  {
    label: "Pesan / Broadcast",
    permissions: [
      { key: "accessMessageSend", label: "Kirim Pesan" },
      { key: "accessMessageHistory", label: "Riwayat" },
    ],
  },
  {
    label: "Customer",
    permissions: [
      { key: "accessCustomerRead", label: "Lihat" },
      { key: "accessCustomerCreate", label: "Tambah" },
      { key: "accessCustomerUpdate", label: "Edit" },
      { key: "accessCustomerDelete", label: "Hapus" },
    ],
  },
  {
    label: "Manajemen User",
    permissions: [
      { key: "accessUserRead", label: "Lihat" },
      { key: "accessUserCreate", label: "Tambah" },
      { key: "accessUserUpdate", label: "Edit" },
      { key: "accessUserDelete", label: "Hapus" },
    ],
  },
  {
    label: "Worker / Sales",
    permissions: [
      { key: "accessWorkerRead", label: "Lihat" },
      { key: "accessWorkerCreate", label: "Tambah" },
      { key: "accessWorkerUpdate", label: "Edit" },
      { key: "accessWorkerDelete", label: "Hapus" },
      { key: "accessWorkerReport", label: "Laporan" },
    ],
  },
  {
    label: "Informasi Toko",
    permissions: [
      { key: "accessInformationRead", label: "Lihat" },
      { key: "accessInformationUpdate", label: "Edit" },
    ],
  },
  {
    label: "Arus Kas",
    permissions: [
      { key: "accessCashflowRead", label: "Lihat" },
      { key: "accessCashflowCreate", label: "Tambah" },
      { key: "accessCashflowUpdate", label: "Edit" },
      { key: "accessCashflowDelete", label: "Hapus" },
    ],
  },
] as const;

export type AccessPermissionKey = (typeof ACCESS_GROUPS)[number]["permissions"][number]["key"];

export const ALL_ACCESS_KEYS: AccessPermissionKey[] = ACCESS_GROUPS.flatMap(
  (g) => g.permissions.map((p) => p.key),
);

// ============================================================
// Default values helper
// ============================================================

export function getDefaultAccessMap(): Record<AccessPermissionKey, boolean> {
  const map = {} as Record<AccessPermissionKey, boolean>;
  for (const key of ALL_ACCESS_KEYS) {
    map[key] = false;
  }
  return map;
}

// ============================================================
// Component
// ============================================================

interface AccessPermissionEditorProps {
  value: Record<AccessPermissionKey, boolean>;
  onChange: (key: AccessPermissionKey, checked: boolean) => void;
  disabled?: boolean;
}

export function AccessPermissionEditor({
  value,
  onChange,
  disabled,
}: AccessPermissionEditorProps) {
  const allChecked = ALL_ACCESS_KEYS.every((k) => value[k]);
  const someChecked = ALL_ACCESS_KEYS.some((k) => value[k]);

  function toggleAll(checked: boolean) {
    for (const key of ALL_ACCESS_KEYS) {
      onChange(key, checked);
    }
  }

  function toggleGroup(groupIndex: number, checked: boolean) {
    for (const perm of ACCESS_GROUPS[groupIndex].permissions) {
      onChange(perm.key, checked);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="w-4 h-4 text-muted-foreground" />
              Hak Akses
            </CardTitle>
            <CardDescription className="mt-1">
              Tentukan halaman dan fitur yang dapat diakses oleh user ini.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="toggle-all"
              checked={allChecked ? true : someChecked ? "indeterminate" : false}
              onCheckedChange={(checked) => toggleAll(checked === true)}
              disabled={disabled}
            />
            <Label htmlFor="toggle-all" className="text-xs font-medium cursor-pointer">
              Semua
            </Label>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {ACCESS_GROUPS.map((group, gIdx) => {
          const groupAllChecked = group.permissions.every((p) => value[p.key]);
          const groupSomeChecked = group.permissions.some((p) => value[p.key]);

          return (
            <div key={group.label} className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id={`group-${gIdx}`}
                  checked={
                    groupAllChecked
                      ? true
                      : groupSomeChecked
                        ? "indeterminate"
                        : false
                  }
                  onCheckedChange={(checked) =>
                    toggleGroup(gIdx, checked === true)
                  }
                  disabled={disabled}
                />
                <Label
                  htmlFor={`group-${gIdx}`}
                  className="text-sm font-semibold cursor-pointer"
                >
                  {group.label}
                </Label>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-4 gap-y-2 pl-6">
                {group.permissions.map((perm) => (
                  <div key={perm.key} className="flex items-center gap-2">
                    <Checkbox
                      id={perm.key}
                      checked={value[perm.key]}
                      onCheckedChange={(checked) =>
                        onChange(perm.key, checked === true)
                      }
                      disabled={disabled}
                    />
                    <Label
                      htmlFor={perm.key}
                      className="text-sm text-muted-foreground cursor-pointer"
                    >
                      {perm.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
