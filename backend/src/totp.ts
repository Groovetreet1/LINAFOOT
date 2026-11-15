import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const STEP_SECONDS = 30;
const DIGITS = 6;

export function generateTotpSecret(): string {
  const bytes = randomBytes(20);
  let value = 0;
  let bits = 0;
  let output = '';

  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  return output;
}

export function decodeBase32(input: string): Buffer {
  const normalized = input.replace(/[\s=-]/g, '').toUpperCase();
  if (!normalized) throw new Error('Empty TOTP secret');

  let value = 0;
  let bits = 0;
  const output: number[] = [];
  for (const character of normalized) {
    const index = BASE32_ALPHABET.indexOf(character);
    if (index === -1) throw new Error('Invalid TOTP secret');
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(output);
}

export function totpCode(secret: string, time = Date.now()): string {
  const counter = Math.floor(time / (STEP_SECONDS * 1000));
  const message = Buffer.alloc(8);
  message.writeBigUInt64BE(BigInt(counter));

  const digest = createHmac('sha1', decodeBase32(secret)).update(message).digest();
  const offset = digest[digest.length - 1]! & 0x0f;
  const binary =
    ((digest[offset]! & 0x7f) << 24) |
    (digest[offset + 1]! << 16) |
    (digest[offset + 2]! << 8) |
    digest[offset + 3]!;

  return String(binary % 10 ** DIGITS).padStart(DIGITS, '0');
}

export function verifyTotp(secret: string, code: string, time = Date.now()): boolean {
  const normalized = code.replace(/\s/g, '');
  if (!/^\d{6}$/.test(normalized)) return false;

  const counter = Math.floor(time / (STEP_SECONDS * 1000));
  const candidate = Buffer.from(normalized);
  for (let window = -1; window <= 1; window += 1) {
    let expected: string;
    try {
      expected = totpCode(secret, (counter + window) * STEP_SECONDS * 1000);
    } catch {
      return false;
    }
    const expectedBuffer = Buffer.from(expected);
    if (expectedBuffer.length === candidate.length && timingSafeEqual(expectedBuffer, candidate)) {
      return true;
    }
  }
  return false;
}

export function buildOtpauthUri(secret: string, account: string, issuer = 'LINAFOOT'): string {
  const label = `${encodeURIComponent(issuer)}:${encodeURIComponent(account)}`;
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: 'SHA1',
    digits: String(DIGITS),
    period: String(STEP_SECONDS),
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}
