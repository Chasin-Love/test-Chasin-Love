/**
 * WebCrypto Vault Cryptography Engine
 * Provides PBKDF2 key derivation, AES-GCM 256-bit payload encryption/decryption,
 * verifier generation, and SHA-256 digesting.
 */

import type { PasswordRecord, VaultSecrets } from '../types';

export const KDF_TARGET_ROUNDS = 310000;
export const KDF_LEGACY_ROUNDS = 90000;
export const KDF_LEGACY_RECORD_ROUNDS = 120000;

export const b64enc = (buf: ArrayBuffer): string =>
  btoa(String.fromCharCode(...new Uint8Array(buf)));

export const b64dec = (s: string): Uint8Array<ArrayBuffer> =>
  Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

export async function deriveKey(
  passphrase: string,
  salt: BufferSource,
  rounds: number
): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: rounds, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptRecords(
  passphrase: string,
  records: PasswordRecord[],
  rounds = KDF_TARGET_ROUNDS
): Promise<VaultSecrets> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt, rounds);
  const ct = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    new TextEncoder().encode(JSON.stringify(records))
  );
  return {
    salt: b64enc(salt.buffer as ArrayBuffer),
    iv: b64enc(iv.buffer as ArrayBuffer),
    data: b64enc(ct),
    rounds,
  };
}

export async function decryptRecords(
  passphrase: string,
  secrets: VaultSecrets
): Promise<PasswordRecord[]> {
  const key = await deriveKey(
    passphrase,
    b64dec(secrets.salt),
    secrets.rounds ?? KDF_LEGACY_RECORD_ROUNDS
  );
  const pt = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: b64dec(secrets.iv) as BufferSource },
    key,
    b64dec(secrets.data)
  );
  return JSON.parse(new TextDecoder().decode(pt)) as PasswordRecord[];
}

export async function makeVerifier(
  passphrase: string,
  rounds = KDF_TARGET_ROUNDS
): Promise<{ salt: string; verifier: string }> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const base = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(passphrase),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations: rounds, hash: 'SHA-256' },
    base,
    256
  );
  return {
    salt: b64enc(salt.buffer as ArrayBuffer),
    verifier: b64enc(bits),
  };
}

export async function checkVerifier(
  passphrase: string,
  saltB64: string,
  verifier: string,
  rounds = KDF_TARGET_ROUNDS
): Promise<boolean> {
  const base = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(passphrase),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: b64dec(saltB64) as BufferSource, iterations: rounds, hash: 'SHA-256' },
    base,
    256
  );
  return b64enc(bits) === verifier;
}

export async function sha256Hex(s: string): Promise<string> {
  const dig = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(dig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
