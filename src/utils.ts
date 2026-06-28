import { createHash } from "crypto";

export function cleanTurkishCharacters(str: string): string {
  const map: Record<string, string> = {
    'ç': 'c', 'Ç': 'c',
    'ğ': 'g', 'Ğ': 'g',
    'ı': 'i', 'I': 'i', 'İ': 'i',
    'ö': 'o', 'Ö': 'o',
    'ş': 's', 'Ş': 's',
    'ü': 'u', 'Ü': 'u'
  };
  
  let result = str;
  for (const key in map) {
    result = result.replace(new RegExp(key, 'g'), map[key]);
  }
  
  return result.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function hashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

export function generateToken(userId: string, secret: string): string {
  const hash = createHash("sha256").update(userId + secret).digest("hex");
  return `${userId}.${hash}`;
}

export function verifyToken(token: string, secret: string): string | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [userId, hash] = parts;
  const expectedHash = createHash("sha256").update(userId + secret).digest("hex");
  if (hash === expectedHash) {
    return userId;
  }
  return null;
}
