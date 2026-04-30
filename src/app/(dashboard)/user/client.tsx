"use client";

import type { UserWithoutPassword } from "@/actions/user";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import Link from "next/link";

interface Props {
  users: UserWithoutPassword[];
}

export function UserListClient({ users }: Props) {
  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[80px]">ID</TableHead>
            <TableHead>Nama</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Terdaftar Sejak</TableHead>
            <TableHead className="text-right">Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell className="font-medium">#{user.id}</TableCell>
              <TableCell className="font-semibold">{user.name}</TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>
                {new Intl.DateTimeFormat("id-ID", {
                  dateStyle: "medium",
                }).format(new Date(user.createdAt))}
              </TableCell>
              <TableCell className="text-right">
                <Button variant="secondary" size="sm" asChild>
                  <Link href={`/user/${user.id}`}>
                    <Eye className="mr-2 h-4 w-4" />
                    Detail
                  </Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
