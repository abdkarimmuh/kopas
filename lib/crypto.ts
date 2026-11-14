// Enkripsi end-to-end di browser (WebCrypto). Tidak ada yang dikirim ke server dalam bentuk plaintext.
//
// PBKDF2(PIN, salt) -> 512 bit:
//   - 256 bit pertama  : kunci AES-GCM untuk enkripsi/dekripsi teks
//   - 256 bit berikutnya: authToken, dikirim ke server untuk verifikasi PIN
//     (server hanya menyimpan sha256-nya, dan tidak bisa menurunkan kunci AES dari situ)

const PBKDF2_ITERATIONS = 600_000;
const encoder = new TextEncoder();
const decoder = new TextDecoder();

export function toB64(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

export function fromB64(b64: string): Uint8Array<ArrayBuffer> {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function deriveKeys(pin: string, salt: Uint8Array<ArrayBuffer>) {
  const base = await crypto.subtle.importKey(
    "raw",
    encoder.encode(pin.normalize("NFKC")),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
      base,
      512,
    ),
  );
  const key = await crypto.subtle.importKey(
    "raw",
    bits.slice(0, 32),
    "AES-GCM",
    false,
    ["encrypt", "decrypt"],
  );
  return { key, authToken: toB64(bits.slice(32)) };
}

export async function encryptNote(text: string, pin: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const { key, authToken } = await deriveKeys(pin, salt);
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoder.encode(text)),
  );
  return {
    ciphertext: toB64(ciphertext),
    iv: toB64(iv),
    salt: toB64(salt),
    authToken,
  };
}

export async function deriveAuthToken(pin: string, saltB64: string) {
  return deriveKeys(pin, fromB64(saltB64));
}

export async function decryptNote(key: CryptoKey, ciphertextB64: string, ivB64: string) {
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromB64(ivB64) },
    key,
    fromB64(ciphertextB64),
  );
  return decoder.decode(plain);
}
