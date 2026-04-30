"use server";

import { prisma } from "@/lib/prisma";
import { revalidateTag } from "next/cache";
import { CACHE_TAG } from "@/constants/cache-tag";
import type { Prisma } from "@prisma/client";

interface ActionResult<T = undefined> {
  success: boolean;
  data?: T;
  error?: string;
}

export type CommonInformationData = Prisma.CommonInformationGetPayload<object>;

interface UpsertCommonInformationInput {
  storeName: string;
  storeAddress: string;
  storePhone: string;
  storeLogo?: string | null;
  footNoteReceipt?: string | null;
  unitFeePercentage: number;
}

export async function getCommonInformation(): Promise<
  ActionResult<CommonInformationData | null>
> {
  try {
    const information = await prisma.commonInformation.findFirst({
      where: { deletedAt: null },
      orderBy: { id: "desc" },
    });

    return { success: true, data: information };
  } catch (error) {
    console.error("getCommonInformation error:", error);
    return { success: false, error: "Gagal mengambil data informasi toko." };
  }
}

export async function upsertCommonInformation(
  input: UpsertCommonInformationInput,
): Promise<ActionResult<CommonInformationData>> {
  try {
    const storeName = input.storeName.trim();
    const storeAddress = input.storeAddress.trim();
    const storePhone = input.storePhone.trim();

    if (!storeName) {
      return { success: false, error: "Nama toko wajib diisi." };
    }
    if (!storeAddress) {
      return { success: false, error: "Alamat toko wajib diisi." };
    }
    if (!storePhone) {
      return { success: false, error: "Nomor telepon toko wajib diisi." };
    }
    if (
      Number.isNaN(input.unitFeePercentage) ||
      input.unitFeePercentage < 0 ||
      input.unitFeePercentage > 100
    ) {
      return { success: false, error: "Persentase fee unit harus di antara 0 sampai 100." };
    }

    const normalizedLogo = input.storeLogo?.trim() ? input.storeLogo.trim() : null;
    const normalizedFootNote = input.footNoteReceipt?.trim()
      ? input.footNoteReceipt.trim()
      : null;

    const existing = await prisma.commonInformation.findFirst({
      where: { deletedAt: null },
      orderBy: { id: "desc" },
    });

    const data = {
      storeName,
      storeAddress,
      storePhone,
      storeLogo: normalizedLogo,
      footNoteReceipt: normalizedFootNote,
      unitFeePercentage: input.unitFeePercentage,
    };

    const saved = existing
      ? await prisma.commonInformation.update({
          where: { id: existing.id },
          data,
        })
      : await prisma.commonInformation.create({
          data,
        });

    revalidateTag(CACHE_TAG.COMMON_INFORMATION);

    return { success: true, data: saved };
  } catch (error) {
    console.error("upsertCommonInformation error:", error);
    return { success: false, error: "Gagal menyimpan informasi toko." };
  }
}
