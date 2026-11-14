import { Suspense } from "react";
import Link from "next/link";
import { OpenNote } from "@/components/OpenNote";
import { isValidCode, normalizeCode } from "@/lib/shared";

export default function NotePage({ params }: PageProps<"/c/[code]">) {
  return (
    <main className="mx-auto w-full max-w-2xl space-y-6 px-4 py-10 sm:py-16">
      <header className="space-y-1">
        <Link href="/" className="text-sm text-muted hover:underline">
          ← Kopas
        </Link>
        <Suspense fallback={<h1 className="text-3xl font-semibold">Memuat…</h1>}>
          {params.then(({ code }) => (
            <Content code={normalizeCode(code)} />
          ))}
        </Suspense>
      </header>
    </main>
  );
}

function Content({ code }: { code: string }) {
  if (!isValidCode(code)) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-semibold tracking-tight">Code tidak valid</h1>
        <p className="text-muted">Periksa kembali code yang kamu masukkan.</p>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      <h1 className="font-mono text-3xl font-semibold tracking-[0.3em]">{code}</h1>
      <OpenNote code={code} />
    </div>
  );
}
