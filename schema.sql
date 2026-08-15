-- =========================================================
-- Pati Kapım · Aşı Karnesi — Supabase kurulum betiği
-- Bunu Supabase Dashboard > SQL Editor içine yapıştırıp
-- "Run" ile tek seferde çalıştırabilirsiniz.
-- =========================================================

create extension if not exists pgcrypto;

-- ---------- Tablolar ----------

create table if not exists public.patients (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  pin text,
  pet_name text not null,
  species text not null default 'Köpek',
  breed text,
  owner_name text,
  photo_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.vaccines (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  name text not null,
  planned_date date not null,
  administered_date date,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.appointment_requests (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  message text,
  status text not null default 'beklemede',
  created_at timestamptz not null default now()
);

-- Yönetici (veteriner) kullanıcılarının listesi.
-- Kendi hesabınızı Authentication > Users kısmından oluşturduktan
-- sonra buraya user_id'nizi ekleyeceksiniz (aşağıdaki adımlarda anlatılıyor).
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

-- ---------- Row Level Security ----------

alter table public.patients enable row level security;
alter table public.vaccines enable row level security;
alter table public.appointment_requests enable row level security;
alter table public.admins enable row level security;

-- Sadece yöneticiler tabloları doğrudan okuyup yazabilir.
-- Hasta sahipleri tabloya asla doğrudan erişemez; sadece aşağıdaki
-- güvenli fonksiyonlar (RPC) üzerinden, sadece kendi bağlantı
-- koduyla (slug) eşleşen kaydı görebilir.

-- Bu betiği ikinci kez çalıştırsan bile hata almaman için önce
-- olası eski kuralları temizliyoruz.
drop policy if exists "admin_all_patients" on public.patients;
drop policy if exists "admin_all_vaccines" on public.vaccines;
drop policy if exists "admin_all_requests" on public.appointment_requests;
drop policy if exists "admin_read_admins" on public.admins;
drop policy if exists "public_read_pet_photos" on storage.objects;
drop policy if exists "anyone_upload_pet_photos" on storage.objects;

create policy "admin_all_patients" on public.patients
  for all using (exists (select 1 from public.admins a where a.user_id = auth.uid()))
  with check (exists (select 1 from public.admins a where a.user_id = auth.uid()));

create policy "admin_all_vaccines" on public.vaccines
  for all using (exists (select 1 from public.admins a where a.user_id = auth.uid()))
  with check (exists (select 1 from public.admins a where a.user_id = auth.uid()));

create policy "admin_all_requests" on public.appointment_requests
  for all using (exists (select 1 from public.admins a where a.user_id = auth.uid()))
  with check (exists (select 1 from public.admins a where a.user_id = auth.uid()));

create policy "admin_read_admins" on public.admins
  for select using (auth.uid() = user_id);

-- ---------- Güvenli fonksiyonlar (hasta sahipleri için) ----------
-- Bu fonksiyonlar "security definer" olduğu için RLS'i güvenli şekilde
-- atlar, ama sadece parametre olarak verilen slug/pin ile eşleşen
-- veriyi döndürür — başka hiçbir kayda erişim vermez.

create or replace function public.get_patient_by_slug(p_slug text, p_pin text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_patient public.patients%rowtype;
  v_vaccines jsonb;
begin
  select * into v_patient from public.patients where slug = p_slug;
  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;
  if v_patient.pin is not null and (p_pin is null or p_pin <> v_patient.pin) then
    return jsonb_build_object('status', 'pin_required');
  end if;
  select coalesce(jsonb_agg(to_jsonb(v) order by v.date desc), '[]'::jsonb)
    into v_vaccines from public.vaccines v where v.patient_id = v_patient.id;
  return jsonb_build_object(
    'status', 'ok',
    'patient', to_jsonb(v_patient) || jsonb_build_object('vaccines', v_vaccines)
  );
end;
$$;

create or replace function public.update_patient_photo(p_slug text, p_pin text, p_photo_url text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_patient public.patients%rowtype;
begin
  select * into v_patient from public.patients where slug = p_slug;
  if not found then return jsonb_build_object('status', 'not_found'); end if;
  if v_patient.pin is not null and (p_pin is null or p_pin <> v_patient.pin) then
    return jsonb_build_object('status', 'pin_required');
  end if;
  update public.patients set photo_url = p_photo_url where id = v_patient.id;
  return jsonb_build_object('status', 'ok');
end;
$$;

create or replace function public.submit_appointment_request(p_slug text, p_pin text, p_message text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_patient public.patients%rowtype;
begin
  select * into v_patient from public.patients where slug = p_slug;
  if not found then return jsonb_build_object('status', 'not_found'); end if;
  if v_patient.pin is not null and (p_pin is null or p_pin <> v_patient.pin) then
    return jsonb_build_object('status', 'pin_required');
  end if;
  insert into public.appointment_requests (patient_id, message) values (v_patient.id, p_message);
  return jsonb_build_object('status', 'ok');
end;
$$;

-- Anonim (giriş yapmamış) ziyaretçilerin bu üç fonksiyonu çağırabilmesine izin ver.
grant execute on function public.get_patient_by_slug(text, text) to anon;
grant execute on function public.update_patient_photo(text, text, text) to anon;
grant execute on function public.submit_appointment_request(text, text, text) to anon;

-- ---------- Fotoğraf depolama ----------

insert into storage.buckets (id, name, public)
values ('pet-photos', 'pet-photos', true)
on conflict (id) do nothing;

create policy "public_read_pet_photos" on storage.objects
  for select using (bucket_id = 'pet-photos');

create policy "anyone_upload_pet_photos" on storage.objects
  for insert with check (bucket_id = 'pet-photos');

-- =========================================================
-- Betik bitti. Sıradaki adım: README.md içindeki
-- "Yönetici hesabınızı oluşturun" bölümü.
-- =========================================================
