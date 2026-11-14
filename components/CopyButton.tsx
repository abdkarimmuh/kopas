"use client";

import { useState } from "react";

export function CopyButton({ value, label = "Salin" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API butuh HTTPS/localhost; diam saja jika gagal.
    }
  }

  return (
    <button type="button" onClick={copy} className="btn-secondary">
      {copied ? "Tersalin!" : label}
    </button>
  );
}
