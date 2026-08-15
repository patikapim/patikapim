-- =========================================================
-- Pati Kapım — Güncelleme: Aşı planlama + otomatik program
-- Bunu Supabase SQL Editor'e yapıştırıp Run'a bas.
-- Mevcut hasta/aşı verini SİLMEZ, sadece yapıyı genişletir.
-- =========================================================

alter table public.vaccines add column if not exists planned_date date;
alter table public.vaccines add column if not exists administered_date date;

-- Eski kayıtlarda "date" uygulama tarihiydi; bunları hem
-- uygulanmış hem de planlanmış tarih olarak taşıyoruz.
update public.vaccines
set planned_date = coalesce(planned_date, date),
    administered_date = coalesce(administered_date, date)
where planned_date is null;

alter table public.vaccines alter column planned_date set not null;
alter table public.vaccines drop column if exists date;
alter table public.vaccines drop column if exists next_due;

-- =========================================================
-- Bitti. Artık bir aşıyı sadece "planlanan tarih" ile,
-- uygulama tarihi girmeden ekleyebilirsin.
-- =========================================================
