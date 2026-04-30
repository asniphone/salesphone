# Project Context & AI Rules

## 1. Project Overview

- **Project Name:** Manajemen Penjualan Internal (POS)
- **Purpose:** Sistem manajemen inventaris dan penjualan internal khusus admin (bukan e-commerce publik).
- **Domain Business:** Terbagi menjadi 2 sub-sistem utama dengan modal/pembukuan terpisah:
  1. **Unit:** Handphone bekas (memiliki ID/IMEI unik per item).
  2. **Barang:** Aksesoris pendukung (stok massal).
- **Language:** Bahasa Indonesia wajib digunakan untuk seluruh antarmuka pengguna (UI/Copywriting).

## 2. Tech Stack

- **Framework:** Next.js 15 (App Router, React 19)
- **Styling:** Tailwind CSS 4
- **Database ORM:** Prisma 6 (Akses via `/src/lib/prisma.ts`)
- **UI Components:** Shadcn UI (Terletak di `/src/components/ui/`)
- **Authentication:** Custom Auth dengan `bcryptjs` untuk hashing password.
- **Media Storage:** Cloudinary (Upload via API Routes, simpan URL di database).

## 3. Architecture & Directory Rules

- `@/constants/`: Letakkan semua nilai statis di sini.
  - `@/constants/env.ts`: Re-export dan validasi dari `.env`.
  - `@/constants/cache-tag.ts`: Konstanta string untuk kebutuhan cache tags.
- `@/actions/`: Wajib membuat 1 file per model Prisma untuk Server Actions (contoh: `@/actions/unit.ts`, `@/actions/customer.ts`).
- Jangan letakkan _business logic_ di dalam UI Components. Panggil Server Actions dari Client Components menggunakan hook React 19 (`useTransition` atau `useActionState`).

## 4. Coding Standards & TypeScript

- **STRICT TYPE:** Dilarang keras menggunakan `any`. Selalu definisikan `interface` atau `type`, atau gunakan tipe inferensi dari Prisma (`Prisma.UnitGetPayload`, dll).
- **Server-First Fetching:** Prioritaskan _data fetching_ langsung di dalam Server Components. Hanya gunakan _client-side fetching_ jika data sangat interaktif atau bergantung pada _state_ lokal.
- **Error Handling:** Pastikan Server Actions selalu me-return object yang konsisten, contoh: `{ success: boolean, data?: any, error?: string }`.

## 5. Next.js 15 Data Fetching & Caching Strategy

- **Mutations:** Wajib menggunakan Server Actions untuk semua operasi CRUD (Tidak boleh membuat `/api/route` untuk CRUD, kecuali untuk _webhook_ eksternal atau upload Cloudinary).
- **Cache Invalidation:** Setelah operasi Create, Update, atau Delete berhasil di Server Action, WAJIB memanggil `revalidatePath(path)` atau `revalidateTag(tag)` untuk memperbarui UI.
- Pastikan penggunaan _cache_ dioptimalkan untuk halaman yang jarang berubah, namun langsung di-invalidasi secara akurat setelah ada transaksi.
