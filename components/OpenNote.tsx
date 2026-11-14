"use client";

import { useState } from "react";
import Link from "next/link";
import { getSalt, openNote } from "@/app/actions";
import { decryptNote, deriveAuthToken } from "@/lib/crypto";
import { CopyButton } from "./CopyButton";
import { PinInput } from "./PinInput";

type State =
  | { kind: "form"; error?: string }
  | { kind: "gone"; message: string }
  | { kind: "open"; text: string; burned: boolean };

export function OpenNote({ code }: { code: string }) {
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [state, setState] = useState<State>({ kind: "form" });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!pin) return;
    setBusy(true);
    try {
      const salt = await getSalt(code);
      if (!salt.ok) {
        return setState(
          salt.error === "not_found"
            ? {
                kind: "gone",
                message:
                  "Tulisan tidak ditemukan, sudah kedaluwarsa, atau sudah dihapus.",
              }
            : { kind: "form", error: "Server error. Coba lagi." },
        );
      }

      const { key, authToken } = await deriveAuthToken(pin, salt.salt);
      const res = await openNote(code, authToken);

      switch (res.status) {
        case "ok":
          setPin("");
          return setState({
            kind: "open",
            text: await decryptNote(key, res.ciphertext, res.iv),
            burned: res.burned,
          });
        case "wrong_pin":
          return setState({
            kind: "form",
            error: `PIN salah. Sisa percobaan: ${res.remaining}.`,
          });
        case "locked":
          return setState({
            kind: "gone",
            message:
              "Terlalu banyak PIN salah. Tulisan telah dihapus demi keamanan.",
          });
        case "not_found":
          return setState({
            kind: "gone",
            message:
              "Tulisan tidak ditemukan, sudah kedaluwarsa, atau sudah dihapus.",
          });
        default:
          return setState({ kind: "form", error: "Server error. Coba lagi." });
      }
    } catch {
      setState({ kind: "form", error: "Gagal membuka tulisan. Coba lagi." });
    } finally {
      setBusy(false);
    }
  }

  if (state.kind === "gone") {
    return (
      <div className="card space-y-4">
        <p>{state.message}</p>
        <Link href="/" className="btn-primary inline-block">
          Kembali
        </Link>
      </div>
    );
  }

  if (state.kind === "open") {
    return (
      <div className="card space-y-4">
        <pre className="max-h-[60vh] overflow-auto whitespace-pre-wrap break-words font-mono text-sm">
          {state.text}
        </pre>
        <div className="flex flex-wrap items-center gap-2">
          <CopyButton value={state.text} label="Salin teks" />
          <Link href="/" className="btn-secondary">
            Tulis baru
          </Link>
        </div>
        {state.burned && (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            Tulisan ini sudah dihapus dari server. Salin sekarang sebelum
            menutup halaman.
          </p>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} autoComplete="off" className="card space-y-4">
      <div className="space-y-1">
        <span className="text-sm font-medium">Masukkan PIN</span>
        <PinInput value={pin} onChange={setPin} autoFocus />
      </div>
      {state.error && (
        <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>
      )}
      <button
        type="submit"
        disabled={busy || !pin}
        className="btn-primary w-full"
      >
        {busy ? "Membuka…" : "Buka tulisan"}
      </button>
    </form>
  );
}
