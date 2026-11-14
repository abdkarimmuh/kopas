import { CreateForm } from "@/components/CreateForm";
import { OpenCodeForm } from "@/components/OpenCodeForm";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-2xl space-y-6 px-4 py-10 sm:py-16">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">Kopas</h1>
        <p className="text-muted">Tulis di satu device, buka di device lain dengan code + PIN.</p>
      </header>
      <OpenCodeForm />
      <CreateForm />
    </main>
  );
}
