# Project Route

## 1. Authentication

Dimulai dari `/` yang akan mengecek count user terlebih dahulu. jika count user 0 maka akan redirect ke `/first-time-setup`, jika count user > 0 maka akan redirect ke `/login`.

- `/first-time-setup` -> First Time Login Page

First Time Setup Page, hanya muncul sekali saat pertama kali dan saat belum ada count dari user.

- `/login` -> Login Page
- `/logout` -> Logout Page

Note:

Masukkan ke group page `/(auth)/*/page.tsx`

## 2. Unit

Merupakan halaman utama untuk manajemen unit (handphone bekas).

- `/unit` -> Unit List Page
  Menampilkan list unit yang tersedia.

- `/unit/create` -> Unit Create Page
  Membuat unit baru.

- `/unit/[id]` -> Unit Detail Page
  Melihat detail unit, termasuk log changes nya, dan juga bisa edit unit nya. `[id]` jika di database pakai Int.

  Saat ingin mengubah status ke BOOKED atau SOLD, maka akan muncul modal untuk mengisi data customer dan juga data penjualan.

- `/unit/report` -> Unit Report Page
  Menampilkan laporan penjualan unit. (untuk data dummy dahulu)

Note:

Masukkan ke group page `/(dashboard)/unit/*/page.tsx`

## 3. Customer

- `/customer` -> Customer List Page
  Menampilkan list customer yang tersedia.

- `/customer/create` -> Customer Create Page
  Membuat customer baru.

- `/customer/[id]` -> Customer Detail Page
  Melihat detail customer, termasuk history pembelian, dan juga bisa edit customer nya. `[id]` jika di database pakai Int

## 4. Dashboard General

- `/dashboard` -> Dashboard Page
  Buat dummy dahulu saja

Note:

Masukkan ke group page `/(dashboard)/dashboard/page.tsx`

## 5. Accessory

- `/accessory` -> Accessory List Page
  Menampilkan list accessory yang tersedia.

- `/accessory/create` -> Accessory Create Page
  Membuat accessory baru.

- `/accessory/[id]` -> Accessory Detail Page
  Melihat detail accessory, termasuk log changes nya, dan juga bisa edit accessory nya. `[id]` jika di database pakai Int. Pada halaman ini juga bisa melakukan pembelian accessory.
  - `/accessory/sell` -> Accessory Sell Page
    Halaman untuk menjual accessory.

- `/accessory/report` -> Accessory Report Page
  Menampilkan laporan penjualan accessory. (untuk data dummy dahulu)

## 6. Message

- `/message` -> Message List Page
  Menampilkan riwayat pengiriman pesan.

- `/message/create` -> Message Create Page
  Membuat pesan baru.

## 7. User

- `/user` -> User List Page
  Menampilkan list user yang tersedia. Pada halaman ini juga terdapat aksi untuk menghapus user.

- `/user/create` -> User Create Page

- `/user/[id]` -> User Detail Page
  Melihat detail user, termasuk log changes nya, dan juga bisa edit user nya. `[id]` jika di database pakai Int. Yang bisa diedit yaitu nama dan email. lalu ada button juga untuk reset ke password default (12345678). Tombol hapus juga ditaruh disini.

## 8. Worker

- `/worker` -> Worker List Page
  Menampilkan list worker yang tersedia. Pada halaman ini juga terdapat aksi untuk menghapus worker dan menonaktifkan worker.

- `/worker/create` -> Worker Create Page
  Membuat worker baru.

- `/worker/[id]` -> Worker Detail Page
  Melihat detail worker, termasuk history dia pernah menjual unit apa saja beserta fee dan detail lainnya (seperti report per worker), dan juga bisa edit worker nya. `[id]` jika di database pakai Int. Yang bisa diedit yaitu nama dan nomor telepon. lalu ada button juga untuk menghapus worker.

## 9. Information

- `/information` digunakan untuk mengelola informasi mengenai nama toko dan semacamnya (nanti digunakan di receipt)

## 10. Cashflow

- `/cashflow` -> Cashflow List Page
  Berisi list pemasukan atau pengeluaran (bayar listrik dll). pada halaman ini juga terdapat aksi untuk menambah, mengedit, dan menghapus data. langsung saja menggunakan modal untuk menambah dan mengedit data.
