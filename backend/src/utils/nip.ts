import bcrypt from 'bcrypt';

const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS || 12);

export async function hashNip(nipPlain: string): Promise<string> {
  return bcrypt.hash(nipPlain, SALT_ROUNDS);
}

export async function verifyNip(nipPlain: string, hash?: string): Promise<boolean> {
  if (!hash) return false;
  return bcrypt.compare(nipPlain, hash);
}
