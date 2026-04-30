import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

/**
 * Hash password menggunakan bcryptjs
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verifikasi password dengan hash yang tersimpan di database
 */
export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}
