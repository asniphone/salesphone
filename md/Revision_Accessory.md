# Revisi Aksesoris — Serial Number Tracking

## 1. Latar Belakang

Terdapat revisi mengenai bagian Accessory.

Aksesoris memiliki serial number yang berbeda tiap produknya (walau tipe produknya sama, ex: sama sama Charger Samsung 35w tetapi nomer seri beda), namun mungkin akan ada case tanpa serial number.

Jadi untuk melakukan track mengenai aksesoris, mungkin harus memilih serial number yang dipilih.

Yang dimana kondisi saat ini, setiap aksesoris yang didasarkan oleh stock yang ter-record dari purchase dan sale, sedangkan revisi ini membutuhkan serial number.

---

## 2. Analisis Kondisi Saat Ini vs Yang Dibutuhkan

### Kondisi Saat Ini

| Aspek | Detail |
|---|---|
| **Model `Accessory`** | Mewakili *tipe* produk (misal: "Charger Samsung 35W"). Tracking stok menggunakan field `recordedStock` (angka counter). |
| **Model `AccessoryPurchase`** | Mencatat sekali beli `quantity` unit dengan harga tertentu. Tidak ada identitas per-unit. |
| **Model `AccessorySaleItem`** | Mencatat penjualan `quantity` unit dari suatu tipe. Tidak tahu unit fisik mana yang terjual. |
| **Harga Modal (MAC)** | Dihitung dengan Moving Average Cost di level tipe (`Accessory.recordedBuyPrice`). |
| **Flow Jual** | Pilih tipe aksesoris → pilih kuantitas → stok dikurangi secara numerik. |

### Yang Dibutuhkan (Revisi)

| Aspek | Detail |
|---|---|
| **Identitas per-unit** | Setiap unit fisik aksesoris memiliki serial number unik (opsional — boleh `null` untuk unit tanpa SN). |
| **Tracking per-unit** | Bisa tahu unit mana yang dibeli kapan, dijual ke siapa, masih tersedia atau sudah terjual. |
| **Flow Jual** | Pilih tipe aksesoris → **pilih serial number spesifik** dari stok yang tersedia → stok berkurang secara individu. |
| **MAC** | Tetap bisa dihitung, tapi kini per-unit karena tiap unit punya `buyPrice` sendiri. |

---

## 3. Desain Schema Baru

### Pendekatan: Tambah Model `AccessoryUnit` (Unit Fisik per Aksesoris)

Daripada mengubah drastis semua model yang sudah ada, pendekatan yang paling aman dan minim risiko adalah **menambah model baru `AccessoryUnit`** yang mewakili setiap unit fisik dari aksesoris.

```prisma
// BARU — Setiap unit fisik aksesoris
model AccessoryUnit {
  id Int @id @default(autoincrement())

  accessoryId Int
  accessory   Accessory @relation(fields: [accessoryId], references: [id], onDelete: Cascade)

  serialNumber String?  // Opsional — boleh null jika tanpa SN
  buyPrice     Int      // Harga beli unit ini secara individual

  // Status unit
  status AccessoryUnitStatus @default(AVAILABLE)

  // Relasi ke purchase (dari mana unit ini masuk)
  purchaseId Int
  purchase   AccessoryPurchase @relation(fields: [purchaseId], references: [id], onDelete: Cascade)

  // Relasi ke sale item (jika sudah terjual)
  saleItemId Int?
  saleItem   AccessorySaleItem? @relation(fields: [saleItemId], references: [id], onDelete: SetNull)

  note String? @db.Text()

  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  deletedAt DateTime?
}

enum AccessoryUnitStatus {
  AVAILABLE
  SOLD
}
```

### Perubahan Model yang Ada

#### `Accessory` — Tambah relasi

```diff
model Accessory {
  ...
+ units     AccessoryUnit[]
  ...
}
```

**PENTING:** Field `recordedStock` dan `recordedBuyPrice` (MAC) **tetap dipertahankan** sebagai *denormalized cache* agar query list tetap cepat. Nilainya dihitung ulang dari `AccessoryUnit` yang statusnya `AVAILABLE`.

#### `AccessoryPurchase` — Tambah relasi balik

```diff
model AccessoryPurchase {
  ...
+ units AccessoryUnit[]
  ...
}
```

#### `AccessorySaleItem` — Tambah relasi balik & ubah relasi

```diff
model AccessorySaleItem {
  ...
+ units AccessoryUnit[]
  ...
}
```

`AccessorySaleItem.quantity` **tetap dipertahankan** dan nilainya = jumlah `AccessoryUnit` yang terpasang ke sale item tsb. Ini agar backward compatibility query report tetap terjaga.

---

## 4. Perubahan Logic Bisnis

### 4.1 Purchase (Tambah Stok)

**Saat ini:** Buat 1 record `AccessoryPurchase` dengan `quantity=N` → increment `recordedStock` + recalculate MAC.

**Setelah revisi:**

1. Buat 1 record `AccessoryPurchase` dengan `quantity=N` (tetap sama).
2. **Buat N record `AccessoryUnit`**, masing-masing dengan:
   - `serialNumber` → diisi user (bisa null per-unit, jika tanpa SN cukup kosongkan).
   - `buyPrice` → dari `buyPricePerUnit` yang diinput.
   - `status: AVAILABLE`
   - `purchaseId` → link ke purchase yg baru dibuat.
3. Recalculate `recordedStock` = COUNT units WHERE status=AVAILABLE.
4. Recalculate `recordedBuyPrice` (MAC) = AVG(buyPrice) dari units yang AVAILABLE.

**UI Purchase baru:** Form pembelian perlu menampilkan input serial number per-unit. Contoh: jika beli 3 unit, muncul 3 field serial number (bisa dikosongkan).

### 4.2 Sale (Jual)

**Saat ini:** Pilih tipe → pilih quantity → stok dikurangi numerik.

**Setelah revisi:**

1. Pilih tipe aksesoris.
2. **Pilih unit-unit spesifik** dari daftar `AccessoryUnit` yang `status=AVAILABLE` (tampilkan serial number, jika null tampil "Tanpa SN #index").
3. Unit yang dipilih → `status` berubah jadi `SOLD`, `saleItemId` di-set.
4. `AccessorySaleItem.quantity` = jumlah unit yang dipilih.
5. `AccessorySaleItem.recordedBuyPricePerUnit` = rata-rata `buyPrice` dari unit-unit yang dipilih (atau bisa gunakan harga per-unit).
6. Recalculate `recordedStock` dan MAC di `Accessory`.

**UI Sale baru:** Setelah pilih tipe, muncul checklist/multiselect dari serial number yang tersedia.

### 4.3 Delete Purchase

**Saat ini:** Soft-delete purchase → decrement stok.

**Setelah revisi:**

1. Validasi: tidak boleh hapus purchase jika ada `AccessoryUnit` dari purchase tersebut yang sudah `SOLD`.
2. Soft-delete purchase.
3. Soft-delete semua `AccessoryUnit` yang masih `AVAILABLE` dari purchase tersebut.
4. Recalculate stock & MAC.

### 4.4 Delete Sale

**Saat ini:** Soft-delete sale → kembalikan stok numerik.

**Setelah revisi:**

1. Soft-delete sale.
2. Kembalikan `status` unit-unit yang terkait kembali ke `AVAILABLE`, hapus link `saleItemId`.
3. Recalculate stock & MAC.

### 4.5 Detail Aksesoris

Halaman detail menampilkan:
- Daftar semua `AccessoryUnit` (status, serial number, harga beli, tanggal masuk, terjual/tersedia).
- Tetap menampilkan riwayat purchase dan log seperti sekarang.

---

## 5. Rencana File yang Diubah

### 5.1 Prisma Schema

#### [MODIFY] `prisma/schema.prisma`
- Tambah model `AccessoryUnit` beserta enum `AccessoryUnitStatus`.
- Tambah relasi `units AccessoryUnit[]` di model `Accessory`, `AccessoryPurchase`, dan `AccessorySaleItem`.

### 5.2 Migration & Data

- Jalankan `npx prisma migrate dev` untuk membuat migration.
- **Data lama:** Unit yang sudah ada (dari purchase lama) **tidak** akan otomatis punya `AccessoryUnit`. Perlu migration script untuk membuat `AccessoryUnit` dummy dari purchase yang ada (tanpa serial number, `buyPrice` = `buyPricePerUnit` dari purchase, status didasarkan pada stok tersisa vs total purchased).

### 5.3 Server Actions

#### [MODIFY] `src/actions/accessory.ts`

| Function | Perubahan |
|---|---|
| `addAccessoryPurchase` | Terima array serial numbers → buat N `AccessoryUnit`. Recalculate dari count units. |
| `updateAccessoryPurchase` | Perlu disesuaikan — jika qty berubah, unit harus ditambah/hapus. Serial number bisa di-edit. |
| `deleteAccessoryPurchase` | Validasi unit belum SOLD → soft-delete units + purchase. |
| `createAccessorySale` | Terima array `unitId` per item (bukan quantity) → set status SOLD. |
| `deleteAccessorySale` | Kembalikan status unit ke AVAILABLE. |
| `getAccessoriesForSale` | Ganti `recordedStock > 0` check → sertakan daftar units AVAILABLE per aksesoris. |
| `getAccessoryById` | Include `units` (with status) di response. |

#### [NEW] Helper function: `recalculateAccessoryStock(tx, accessoryId)`
- `recordedStock` = COUNT units WHERE status=AVAILABLE AND deletedAt=null
- `recordedBuyPrice` = AVG(buyPrice) dari units yang AVAILABLE AND deletedAt=null (atau 0 jika 0 unit)

### 5.4 Frontend — Purchase

#### [MODIFY] `src/app/(dashboard)/accessory/[id]/client.tsx`
- Dialog "Tambah Stok": setelah user isi quantity dan harga, tampilkan N input field untuk serial number.
- Tabel riwayat pembelian: bisa expand untuk lihat serial number per-purchase.

### 5.5 Frontend — Sale

#### [MODIFY] `src/app/(dashboard)/accessory/sell/form.tsx`
- Setelah pilih tipe aksesoris, **bukan lagi pilih quantity**, melainkan pilih unit-unit spesifik dari daftar serial number yang tersedia.
- Tampilkan checklist dengan info: serial number, harga beli (untuk referensi profit).
- Quantity otomatis = jumlah unit yang dipilih.

#### [MODIFY] `src/app/(dashboard)/accessory/sell/page.tsx`
- `getAccessoriesForSale` sekarang mengembalikan data termasuk daftar unit yang tersedia.

### 5.6 Frontend — Detail & List

#### [MODIFY] `src/app/(dashboard)/accessory/[id]/client.tsx`
- Tambah section/tab "Daftar Unit" yang menampilkan semua AccessoryUnit (SN, status, harga beli, kapan masuk, terjual ke siapa jika SOLD).

#### [MODIFY] `src/app/(dashboard)/accessory/page.tsx`
- Kolom stok di list tetap menggunakan `recordedStock` (denormalized) → tidak perlu perubahan besar.

### 5.7 Frontend — History Sell

#### [MODIFY] `src/app/(dashboard)/accessory/history-sell/client.tsx`
- Tampilkan serial number di setiap item dalam riwayat penjualan.

---

## 6. Migration Strategy untuk Data Existing

Karena sudah ada data production, perlu langkah hati-hati:

1. **Schema migration**: Tambah model + relasi (non-breaking, semua field baru opsional atau punya default).
2. **Data migration script** (`prisma/seed-migrate-accessory-units.ts`):
   - Untuk setiap `AccessoryPurchase` yang `deletedAt = null`:
     - Buat `quantity` buah `AccessoryUnit` dengan `serialNumber = null`, `buyPrice = buyPricePerUnit`, `status = AVAILABLE`.
   - Untuk setiap `AccessorySaleItem`:
     - Dari pool unit AVAILABLE milik aksesoris tersebut, tandai `quantity` unit sebagai `SOLD` dan link ke `saleItemId`.
   - Recalculate `recordedStock` dan `recordedBuyPrice` di setiap `Accessory`.

---

## 7. Keputusan Final

> [!NOTE]
> **Q1: Serial number unique secara global.** Boleh null. Saat purchase 5 unit, user input hingga 5 SN berbeda. Unit tanpa SN boleh. Saat jual, pilih SN yang ingin dijual; untuk unit tanpa SN, tampilkan "Tanpa SN" dan user cukup input qty.

> [!NOTE]
> **Q2: Dalam 1 purchase, harga beli sama untuk semua unit.** Tetapi tetap record `buyPrice` per `AccessoryUnit` untuk fleksibilitas ke depan.

> [!NOTE]
> **Q3: Flow jual tanpa SN = input qty.** Jika semua unit tanpa SN → user langsung input quantity (seperti flow lama). Jika ada unit dengan SN → user harus pilih SN spesifik.

> [!NOTE]
> **Q4: Data lama tidak perlu dimigrasikan.** Pastikan schema migration non-breaking (semua field baru opsional atau punya default). Tidak boleh ada migration yang mengharuskan reset database.

---

## 8. Urutan Eksekusi

1. **Prisma Schema** — Tambah model `AccessoryUnit`, enum `AccessoryUnitStatus`, relasi ke model terkait.
2. **Migration** — `npx prisma migrate dev` (non-breaking).
3. **Helper** — `recalculateAccessoryStock()`.
4. **Server Actions** — Update semua fungsi purchase/sale di `actions/accessory.ts`.
5. **Frontend Purchase** — Update dialog tambah stok + form serial number.
6. **Frontend Sale** — Update flow jual ke unit/SN selection.
7. **Frontend Detail** — Tambah daftar unit di halaman detail aksesoris.
8. **Frontend History** — Tampilkan SN di riwayat penjualan.
9. **Build & Testing** — `npm run build` + verifikasi flow end-to-end.
