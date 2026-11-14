-- Kopas: penyimpanan catatan terenkripsi (E2E).
-- Server hanya menyimpan ciphertext + hash dari authToken; PIN & teks asli tidak pernah sampai ke sini.

create table if not exists public.notes (
  id               uuid primary key default gen_random_uuid(),
  code             text not null unique,
  ciphertext       text not null,
  iv               text not null,
  salt             text not null,
  auth_hash        text not null,
  burn_after_read  boolean not null default false,
  expires_at       timestamptz,                 -- null = permanen
  failed_attempts  int not null default 0,
  created_at       timestamptz not null default now()
);

create index if not exists notes_expires_at_idx on public.notes (expires_at) where expires_at is not null;

-- RLS aktif tanpa policy => anon/authenticated tidak bisa akses apa pun.
-- Aplikasi mengakses lewat server (service role / secret key) yang mem-bypass RLS.
alter table public.notes enable row level security;
revoke all on table public.notes from anon, authenticated;

-- Buka catatan secara atomik: cek PIN (via hash), hitung percobaan gagal,
-- hapus setelah 5x salah, dan hapus setelah dibaca jika burn_after_read.
create or replace function public.open_note(p_code text, p_auth_hash text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  n public.notes%rowtype;
  max_attempts constant int := 5;
begin
  select * into n from public.notes where code = p_code for update;

  if not found or (n.expires_at is not null and n.expires_at <= now()) then
    return jsonb_build_object('status', 'not_found');
  end if;

  if n.auth_hash <> p_auth_hash then
    if n.failed_attempts + 1 >= max_attempts then
      delete from public.notes where id = n.id;
      return jsonb_build_object('status', 'locked');
    end if;
    update public.notes set failed_attempts = failed_attempts + 1 where id = n.id;
    return jsonb_build_object(
      'status', 'wrong_pin',
      'remaining', max_attempts - (n.failed_attempts + 1)
    );
  end if;

  if n.burn_after_read then
    delete from public.notes where id = n.id;
  end if;

  return jsonb_build_object(
    'status', 'ok',
    'ciphertext', n.ciphertext,
    'iv', n.iv,
    'burned', n.burn_after_read
  );
end;
$$;

revoke execute on function public.open_note(text, text) from public, anon, authenticated;
grant execute on function public.open_note(text, text) to service_role;

-- Pembersihan otomatis catatan kedaluwarsa tiap 15 menit.
create extension if not exists pg_cron;

select cron.schedule(
  'kopas-purge-expired',
  '*/15 * * * *',
  $$delete from public.notes where expires_at is not null and expires_at < now()$$
);
