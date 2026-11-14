"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { noAutofill } from "./PinInput";
import { CODE_LENGTH, isValidCode, normalizeCode } from "@/lib/shared";

export function OpenCodeForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const normalized = normalizeCode(code);
    if (!isValidCode(normalized)) return setError(`Code harus ${CODE_LENGTH} karakter.`);
    router.push(`/c/${normalized}`);
  }

  return (
    <form onSubmit={onSubmit} autoComplete="off" className="card space-y-3">
      <label className="block space-y-1">
        <span className="text-sm font-medium">Punya code? Buka tulisan</span>
        <div className="flex gap-2">
          <input
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase());
              setError(null);
            }}
            placeholder="K7Q2XM"
            maxLength={CODE_LENGTH + 2}
            name="kopas-code"
            autoCapitalize="characters"
            {...noAutofill}
            className="input font-mono uppercase tracking-widest"
          />
          <button type="submit" className="btn-primary shrink-0">
            Buka
          </button>
        </div>
      </label>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </form>
  );
}
