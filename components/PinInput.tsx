"use client";

import { useState } from "react";

// Sengaja TIDAK memakai type="password": field password memicu prompt "Simpan password?"
// dan saran password dari browser/password manager. Sebagai gantinya input teks biasa
// disamarkan dengan CSS (-webkit-text-security) + atribut untuk mematikan autofill.
// Inline style supaya penyamaran tidak bergantung pada stylesheet.
const MASKED = { WebkitTextSecurity: "disc" } as React.CSSProperties;

export function PinInput({
  value,
  onChange,
  placeholder,
  autoFocus,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        type="text"
        name="kopas-pin"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        data-1p-ignore
        data-lpignore="true"
        data-bwignore
        data-form-type="other"
        className="input pr-16"
        style={visible ? undefined : MASKED}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute inset-y-0 right-2 my-auto h-7 rounded px-2 text-xs text-muted hover:bg-foreground/5"
        aria-label={visible ? "Sembunyikan PIN" : "Tampilkan PIN"}
      >
        {visible ? "Sembunyi" : "Lihat"}
      </button>
    </div>
  );
}

/** Atribut untuk input non-PIN (code, teks) agar tidak di-autofill / dikoreksi otomatis. */
export const noAutofill = {
  autoComplete: "off",
  autoCorrect: "off",
  spellCheck: false,
  "data-1p-ignore": true,
  "data-lpignore": "true",
  "data-bwignore": true,
  "data-form-type": "other",
} as const;
