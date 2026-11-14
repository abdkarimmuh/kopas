"use client";

import { useState } from "react";
import { createNote } from "@/app/actions";
import { encryptNote } from "@/lib/crypto";
import { MAX_TEXT_BYTES, MIN_PIN_LENGTH, TTL_OPTIONS, type Ttl } from "@/lib/shared";
import { CopyButton } from "./CopyButton";

type Created = { code: string; expiresAt: string | null; burn: boolean };

export function CreateForm() {
  const [text, setText] = useState("");
  const [pin, setPin] = useState("");
  const [ttl, setTtl] = useState<Ttl>("1h");
  const [burn, setBurn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<Created | null>(null);

  const textBytes = new TextEncoder().encode(text).length;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!text.trim()) return setError("Tulisan masih kosong.");
    if (textBytes > MAX_TEXT_BYTES) return setError("Tulisan terlalu panjang (maks 100 KB).");
    if (pin.length < MIN_PIN_LENGTH) return setError(`PIN minimal ${MIN_PIN_LENGTH} karakter.`);

    setBusy(true);
    try {
      const encrypted = await encryptNote(text, pin);
      const res = await createNote({ ...encrypted, ttl, burnAfterRead: burn });
      if (!res.ok) return setError(res.error);
      setCreated({ code: res.code, expiresAt: res.expiresAt, burn });
      setText("");
      setPin("");
    } catch {
      setError("Terjadi kesalahan. Coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  if (created) {
    const link = `${window.location.origin}/c/${created.code}`;
    return (
      <div className="card space-y-4">
        <p className="text-sm text-muted">Tulisan tersimpan dan terenkripsi. Buka di device lain dengan code:</p>
        <p className="font-mono text-4xl font-semibold tracking-[0.3em]">{created.code}</p>
        <div className="flex flex-wrap gap-2">
          <CopyButton value={created.code} label="Salin code" />
          <CopyButton value={link} label="Salin link" />
        </div>
        <p className="text-xs text-muted break-all">{link}</p>
        <p className="text-xs text-muted">
          {created.expiresAt
            ? `Kedaluwarsa: ${new Date(created.expiresAt).toLocaleString("id-ID")}`
            : "Disimpan permanen."}
          {created.burn && " Akan dihapus setelah dibaca sekali."} PIN tidak bisa dipulihkan, jadi
          jangan sampai lupa.
        </p>
        <button type="button" className="btn-primary" onClick={() => setCreated(null)}>
          Tulis baru
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="card space-y-4">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Tulis atau tempel teks di sini…"
        rows={8}
        className="input min-h-40 resize-y font-mono text-sm"
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1">
          <span className="text-sm font-medium">PIN</span>
          <input
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            autoComplete="new-password"
            placeholder={`Minimal ${MIN_PIN_LENGTH} karakter`}
            className="input"
          />
        </label>
        <label className="space-y-1">
          <span className="text-sm font-medium">Masa simpan</span>
          <select value={ttl} onChange={(e) => setTtl(e.target.value as Ttl)} className="input">
            {TTL_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={burn} onChange={(e) => setBurn(e.target.checked)} />
        Hapus setelah dibaca sekali
      </label>
      <p className="text-xs text-muted">
        Teks dienkripsi di browser ini sebelum dikirim. Server tidak pernah melihat isi atau PIN-mu.
        Gunakan PIN/frasa yang panjang untuk keamanan lebih.
      </p>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <button type="submit" disabled={busy} className="btn-primary w-full">
        {busy ? "Mengenkripsi…" : "Simpan & dapatkan code"}
      </button>
    </form>
  );
}
