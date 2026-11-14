"use server";

import { createHash, randomInt } from "node:crypto";
import { db } from "@/lib/supabase";
import {
  CODE_ALPHABET,
  CODE_LENGTH,
  TTL_OPTIONS,
  isValidCode,
  normalizeCode,
  type Ttl,
} from "@/lib/shared";

const MAX_CIPHERTEXT_B64 = 140_000; // ~100 KB teks setelah enkripsi + base64

const B64 = /^[A-Za-z0-9+/]+={0,2}$/;
const isB64 = (v: unknown, maxLen: number): v is string =>
  typeof v === "string" && v.length > 0 && v.length <= maxLen && B64.test(v);

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

function generateCode() {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return code;
}

type Fail = { ok: false; error: string };

export async function createNote(input: {
  ciphertext: string;
  iv: string;
  salt: string;
  authToken: string;
  ttl: Ttl;
  burnAfterRead: boolean;
}): Promise<{ ok: true; code: string; expiresAt: string | null } | Fail> {
  if (!input || typeof input !== "object") return { ok: false, error: "Input tidak valid." };
  const { ciphertext, iv, salt, authToken, ttl, burnAfterRead } = input;
  const ttlOption = TTL_OPTIONS.find((o) => o.value === ttl);
  if (
    !isB64(ciphertext, MAX_CIPHERTEXT_B64) ||
    !isB64(iv, 32) ||
    !isB64(salt, 32) ||
    !isB64(authToken, 64) ||
    typeof burnAfterRead !== "boolean" ||
    !ttlOption
  ) {
    return { ok: false, error: "Input tidak valid atau teks terlalu panjang." };
  }

  const seconds = ttlOption.seconds;
  const expiresAt = seconds === null ? null : new Date(Date.now() + seconds * 1000).toISOString();

  // Retry jika code bentrok (unique violation).
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateCode();
    const { error } = await db().from("notes").insert({
      code,
      ciphertext,
      iv,
      salt,
      auth_hash: hashToken(authToken),
      burn_after_read: burnAfterRead,
      expires_at: expiresAt,
    });
    if (!error) return { ok: true, code, expiresAt };
    if (error.code !== "23505") {
      console.error("createNote:", error);
      return { ok: false, error: "Gagal menyimpan. Coba lagi." };
    }
  }
  return { ok: false, error: "Gagal membuat code. Coba lagi." };
}

/** Ambil salt untuk menurunkan kunci di browser. Ciphertext belum dikirim di tahap ini. */
export async function getSalt(rawCode: string): Promise<{ ok: true; salt: string } | Fail> {
  const code = normalizeCode(String(rawCode ?? ""));
  if (!isValidCode(code)) return { ok: false, error: "not_found" };

  const { data, error } = await db()
    .from("notes")
    .select("salt, expires_at")
    .eq("code", code)
    .maybeSingle();
  if (error) {
    console.error("getSalt:", error);
    return { ok: false, error: "server" };
  }
  if (!data || (data.expires_at && new Date(data.expires_at) <= new Date())) {
    return { ok: false, error: "not_found" };
  }
  return { ok: true, salt: data.salt };
}

export type OpenResult =
  | { status: "ok"; ciphertext: string; iv: string; burned: boolean }
  | { status: "wrong_pin"; remaining: number }
  | { status: "locked" }
  | { status: "not_found" }
  | { status: "error" };

export async function openNote(rawCode: string, authToken: string): Promise<OpenResult> {
  const code = normalizeCode(String(rawCode ?? ""));
  if (!isValidCode(code)) return { status: "not_found" };
  if (!isB64(authToken, 64)) return { status: "error" };

  const { data, error } = await db().rpc("open_note", {
    p_code: code,
    p_auth_hash: hashToken(authToken),
  });
  if (error) {
    console.error("openNote:", error);
    return { status: "error" };
  }
  return data as OpenResult;
}
