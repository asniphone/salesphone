// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PrismaClient } = require('@prisma/client');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path');

const prisma = new PrismaClient();

/**
 * Helper untuk menangani BigInt agar bisa di-serialize ke JSON
 * (Penting untuk model Ledger kamu)
 */
const bigIntReplacer = (key, value) => {
  return typeof value === 'bigint' ? value.toString() : value;
};

/**
 * Helper untuk mengubah camelCase/PascalCase ke kebab-case
 * Contoh: AccessorySale -> accessory-sale
 */
const toKebabCase = (str) => {
  return str
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .toLowerCase();
};

async function backup() {
  // Tentukan direktori output
  const outputDir = path.join(__dirname, 'backup-data');

  // Buat folder jika belum ada
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log(`📁 Folder dibuat: ${outputDir}`);
  }

  /**
   * Daftar model sesuai dengan schema.prisma kamu.
   * Nama model di sini menggunakan format property di Prisma Client (camelCase).
   */
  const models = [
    'user',
    'unit',
    'unitLog',
    'customer',
    'accessory',
    'accessoryPurchase',
    'accessorySale',
    'accessorySaleItem',
    'accessoryLog',
    'accessoryUnit',
    'blastMessageHistory',
    'sendInvoiceHistory',
    'worker',
    'commonInformation',
    'cashflow',
    'cashflowLog',
    'oTP',
    'imbursement',
    'imbursementLog',
    'ledger',
  ];

  console.log('🚀 Memulai proses backup data...');

  for (const modelName of models) {
    try {
      console.log(`⏳ Mengambil data dari model: ${modelName}...`);

      // Mengambil semua data dari model secara dinamis
      const data = await prisma[modelName].findMany();

      const fileName = `${toKebabCase(modelName)}.json`;
      const filePath = path.join(outputDir, fileName);

      // Simpan ke file JSON
      fs.writeFileSync(
        filePath,
        JSON.stringify(data, bigIntReplacer, 2),
        'utf-8'
      );

      console.log(`✅ Berhasil menyimpan: ${fileName} (${data.length} baris)`);
    } catch (error) {
      console.error(`❌ Gagal backup model ${modelName}:`, error);
    }
  }

  console.log('\n✨ Backup selesai! Semua data ada di folder ./scripts/backup-data/');
}

backup()
  .catch((e) => {
    console.error('💥 Terjadi error fatal saat backup:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });