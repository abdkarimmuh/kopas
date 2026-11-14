"use client";

import { useSyncExternalStore } from "react";

type Pref = "light" | "dark" | "system";

const STORAGE_KEY = "kopas-theme";
const DARK_QUERY = "(prefers-color-scheme: dark)";

/**
 * Dijalankan inline di <head> sebelum halaman dirender, supaya tidak ada kedipan tema
 * yang salah. Harus sinkron dengan logika `applyTheme` di bawah.
 */
export const themeInitScript = `(function(){var p;try{p=localStorage.getItem("${STORAGE_KEY}")}catch(e){}var d=p==="dark"||(p!=="light"&&matchMedia("${DARK_QUERY}").matches);var r=document.documentElement;r.dataset.theme=d?"dark":"light";r.style.colorScheme=d?"dark":"light"})()`;

const listeners = new Set<() => void>();

function getPref(): Pref {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "light" || v === "dark") return v;
  } catch {}
  return "system";
}

function applyTheme(pref: Pref) {
  const dark = pref === "dark" || (pref === "system" && matchMedia(DARK_QUERY).matches);
  const root = document.documentElement;
  root.dataset.theme = dark ? "dark" : "light";
  root.style.colorScheme = dark ? "dark" : "light";
}

function setPref(pref: Pref) {
  try {
    if (pref === "system") localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, pref);
  } catch {}
  applyTheme(pref);
  listeners.forEach((l) => l());
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  const mq = matchMedia(DARK_QUERY);
  const sync = () => {
    applyTheme(getPref());
    onChange();
  };
  mq.addEventListener("change", sync); // ikut berubah saat tema OS berubah (mode Sistem)
  window.addEventListener("storage", sync); // sinkron antar tab
  return () => {
    listeners.delete(onChange);
    mq.removeEventListener("change", sync);
    window.removeEventListener("storage", sync);
  };
}

const OPTIONS: { value: Pref; label: string; icon: React.ReactNode }[] = [
  {
    value: "light",
    label: "Terang",
    icon: (
      <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>
    ),
  },
  {
    value: "dark",
    label: "Gelap",
    icon: (
      <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
      </svg>
    ),
  },
  {
    value: "system",
    label: "Sistem",
    icon: (
      <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <path d="M8 21h8M12 17v4" />
      </svg>
    ),
  },
];

export function ThemeToggle() {
  const pref = useSyncExternalStore(subscribe, getPref, () => "system" as Pref);

  return (
    <div role="radiogroup" aria-label="Tema" className="inline-flex rounded-lg border border-border bg-card p-0.5">
      {OPTIONS.map((o) => {
        const active = pref === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            title={o.label}
            onClick={() => setPref(o.value)}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              active ? "bg-foreground text-background" : "text-muted hover:text-foreground"
            }`}
          >
            {o.icon}
            <span className="hidden sm:inline">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
