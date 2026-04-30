// Re-export dan validasi environment variables
// Pastikan semua variabel yang dibutuhkan tersedia saat runtime

function getEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`❌ Environment variable "${key}" tidak ditemukan. Pastikan sudah diatur di file .env`);
  }
  return value;
}

function getEnvOptional(key: string, defaultValue = ""): string {
  return process.env[key] ?? defaultValue;
}

// Database
export const DATABASE_URL = getEnv("DATABASE_URL");
export const DIRECT_URL = getEnv("DIRECT_URL");

// Authentication
export const AUTH_SECRET = getEnv("AUTH_SECRET");

// Cloudinary (opsional, diisi nanti saat integrasi media storage)
export const CLOUDINARY_CLOUD_NAME = getEnvOptional("CLOUDINARY_CLOUD_NAME");
export const CLOUDINARY_API_KEY = getEnvOptional("CLOUDINARY_API_KEY");
export const CLOUDINARY_API_SECRET = getEnvOptional("CLOUDINARY_API_SECRET");

// Fonnte WhatsApp API
export const FONNTE_TOKEN = getEnvOptional("FONNTE_TOKEN");
