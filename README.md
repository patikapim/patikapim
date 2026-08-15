# Pati Kapım · Dijital Aşı Karnesi — Kurulum Rehberi

Bu rehber, hiç kod bilmesen bile siteyi yayına almanı sağlayacak şekilde
adım adım yazıldı. Toplam süre yaklaşık 15-20 dakika. Üç tane ücretsiz
hesaba ihtiyacın var: **GitHub**, **Supabase**, **Vercel**.

Sistem nasıl çalışıyor (kısaca):
- **Sen (yönetici):** `/admin` adresinden kendi e-posta/şifrenle giriş
  yapıyorsun. Hasta ekliyorsun, aşı işliyorsun.
- **Hasta sahipleri:** Kendilerine özel, tahmin edilemeyen bir bağlantı
  alıyor (örn. `.../hasta/a8x92kdlq0`). Bu bağlantıya tıklayınca direkt
  kendi dostunun karnesini görüyorlar — ayrı kayıt olmalarına gerek yok.
  İstersen ekstra güvenlik için her hastaya 4 haneli bir PIN de
  koyabilirsin.

---

## 1. Supabase projesi oluştur (veritabanı + giriş sistemi)

1. [supabase.com](https://supabase.com) adresine git, ücretsiz hesap aç.
2. "New Project" ile yeni proje oluştur. Bir isim ver (örn. `pati-kapim`),
   bir veritabanı şifresi belirle ve **not al** (unutma).
3. Proje hazır olunca sol menüden **SQL Editor**'e gir.
4. Bu klasördeki `supabase/schema.sql` dosyasının tüm içeriğini kopyala,
   SQL Editor'e yapıştır, sağ üstten **Run** butonuna bas. Tüm tablolar,
   güvenlik kuralları ve fotoğraf deposu otomatik kurulacak.
5. Sol menüden **Project Settings > API** kısmına git. Şu iki değeri bir
   yere not al:
   - **Project URL**
   - **anon / public** anahtarı

## 2. Kendi yönetici hesabını oluştur

1. Supabase panelinde sol menüden **Authentication > Users**.
2. **Add User** ile kendi e-postanı ve bir şifre belirleyerek hesabını
   oluştur ("Auto Confirm User" seçeneğini işaretle ki e-posta
   doğrulaması beklemesin).
3. Tekrar **SQL Editor**'e dön, aşağıdaki satırı çalıştır (e-postanı
   kendi e-postanla değiştir):

   ```sql
   insert into public.admins (user_id)
   select id from auth.users where email = 'seninmailin@ornek.com';
   ```

   Bu adım seni sistemin yöneticisi yapıyor. Bu adım olmadan giriş
   yapabilsen bile hiçbir hasta verisi göremezsin (güvenlik amaçlı).

## 3. Projeyi GitHub'a yükle

1. [github.com](https://github.com) üzerinde ücretsiz hesap aç.
2. **New repository** ile `pati-kapim` adında yeni, boş bir repo oluştur
   (Private seçebilirsin).
3. Repo sayfasında **"Add file" > "Upload files"** butonuna tıkla, bu
   proje klasöründeki tüm dosya ve klasörleri (node_modules hariç —
   zaten yok) sürükle-bırak yap, **Commit changes**.

## 4. Vercel ile yayına al

1. [vercel.com](https://vercel.com) adresine git, **GitHub hesabınla**
   giriş yap (bu ikisini otomatik bağlar).
2. **Add New > Project**, az önce oluşturduğun `pati-kapim` reposunu
   seç, **Import**.
3. "Environment Variables" bölümüne şu ikisini ekle (Supabase'ten aldığın
   değerler):
   - `VITE_SUPABASE_URL` → Project URL
   - `VITE_SUPABASE_ANON_KEY` → anon/public anahtarı
4. **Deploy** butonuna bas, 1-2 dakika bekle.
5. Deploy bitince sana bir link verecek, örn.
   `https://pati-kapim.vercel.app`. Site artık canlı!
   - Ana sayfa: hasta sahiplerine yönelik genel tanıtım sayfası.
   - `.../admin`: senin gizli yönetici giriş adresin (ana sayfada hiçbir
     yerde bu linke tıklanabilir bağlantı yok, sadece sen biliyorsun).

## 5. Kullanmaya başla

1. `https://pati-kapim.vercel.app/admin` adresine git, oluşturduğun
   e-posta/şifreyle giriş yap.
2. **Yeni Hasta** ile hayvanı ekle (istersen PIN de koy).
3. Hastayı seçtiğinde, üstte kendine özel bağlantısını göreceksin —
   **Kopyala**'ya bas, WhatsApp/SMS ile hasta sahibine gönder.
4. **Aşı Ekle** ile aşı kayıtlarını işle. Hasta sahibi kendi bağlantısına
   girdiğinde anında güncellenmiş halini görür.
5. Sağ üstteki zil ikonu randevu taleplerini gösterir.

---

## E-posta bildirimi (opsiyonel, kod yazmadan)

Hasta biri "Randevu Talep Et" butonuna bastığında **panelde zaten anında
görünüyor**. Ayrıca e-postana da düşmesini istersen, kod yazmana gerek
yok — [Zapier](https://zapier.com) veya [Make](https://make.com) gibi
ücretsiz bir araçla 5 dakikada kurulur:

1. Supabase panelinde **Database > Webhooks > Create a new hook**.
2. Tablo: `appointment_requests`, Olay: `INSERT`.
3. Zapier/Make'te "Webhooks" tetikleyicisini oluştur, aldığın adresi
   Supabase'teki webhook URL'sine yapıştır.
4. Zapier/Make'te ikinci adım olarak "Send Email" (Gmail/Outlook) ekle,
   gelen veriden hasta adını içeren bir e-posta şablonu yaz.

Bu adım tamamen opsiyonel — panel bildirimi zaten güvenilir şekilde
çalışıyor.

---

## Güvenlik notları

- Hasta sahiplerinin bağlantıları tahmin edilemeyecek kadar uzun ve
  rastgele — ama yine de bağlantıyı yalnızca ilgili hasta sahibiyle
  paylaş.
- Hassas hissettiğin hastalara PIN eklemeni öneririm.
- Yönetici şifreni güçlü tut; bu şifre sağlık kayıtlarının tamamına
  erişim veriyor.
- Bu sistem ödeme veya kimlik bilgisi almıyor — sadece aşı kayıtları ve
  isteğe bağlı fotoğraf tutuyor.

## Bir şey ters giderse

Kurulumun herhangi bir adımında takılırsan (hata mesajı, "deploy failed"
vb.), o ekranın görüntüsünü bu sohbete gönder, birlikte çözelim.
