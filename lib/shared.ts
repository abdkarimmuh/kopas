// Konstanta & helper yang dipakai di client dan server.

export const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"; // tanpa 0/O, 1/I/L
export const CODE_LENGTH = 6;
export const MIN_PIN_LENGTH = 6;
export const MAX_TEXT_BYTES = 100_000;

export const TTL_OPTIONS = [
  { value: "10m", label: "10 menit", seconds: 10 * 60 },
  { value: "1h", label: "1 jam", seconds: 60 * 60 },
  { value: "1d", label: "1 hari", seconds: 24 * 60 * 60 },
  { value: "7d", label: "7 hari", seconds: 7 * 24 * 60 * 60 },
  { value: "forever", label: "Permanen", seconds: null },
] as const;

export type Ttl = (typeof TTL_OPTIONS)[number]["value"];

export function normalizeCode(raw: string) {
  return raw.toUpperCase().replace(/[^0-9A-Z]/g, "");
}

export function isValidCode(code: string) {
  return code.length === CODE_LENGTH && [...code].every((c) => CODE_ALPHABET.includes(c));
}
