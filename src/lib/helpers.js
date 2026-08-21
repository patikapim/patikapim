export function genSlug(len = 12) {
  const chars = "abcdefghijkmnopqrstuvwxyz23456789";
  let out = "";
  const arr = new Uint32Array(len);
  crypto.getRandomValues(arr);
  for (let i = 0; i < len; i++) out += chars[arr[i] % chars.length];
  return out;
}

export function fmtDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("tr-TR", { day: "2-digit", month: "short", year: "numeric" });
}

export function stampParts(iso) {
  if (!iso) return { d: "--", m: "---" };
  const d = new Date(iso + "T00:00:00");
  return {
    d: d.toLocaleDateString("tr-TR", { day: "2-digit" }),
    m: d.toLocaleDateString("tr-TR", { month: "short" }).toUpperCase(),
  };
}

export function daysUntil(iso) {
  if (!iso) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(iso + "T00:00:00");
  return Math.round((d - today) / 86400000);
}

export function addWeeks(startIso, weeks) {
  const d = new Date(startIso + "T00:00:00");
  d.setDate(d.getDate() + weeks * 7);
  return d.toISOString().slice(0, 10);
}
export function addMonths(startIso, months) {
  const d = new Date(startIso + "T00:00:00");
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}
export function addYears(startIso, years) {
  const d = new Date(startIso + "T00:00:00");
  d.setFullYear(d.getFullYear() + years);
  return d.toISOString().slice(0, 10);
}
export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function vaccineStatus(v) {
  if (v.administered_date) return "yapildi";
  const days = daysUntil(v.planned_date);
  if (days === null) return "planned";
  return days < 0 ? "overdue" : "planned";
}

export const STATUS_LABEL = {
  yapildi: "Yapıldı",
  overdue: "Zamanı Geçti",
  planned: "Planlandı",
};

export const STATUS_COLOR = {
  yapildi: { bg: "#5C7A661A", border: "#5C7A664D", text: "#3F5A4C" },
  overdue: { bg: "#A23B3B1A", border: "#A23B3B4D", text: "#A23B3B" },
  planned: { bg: "#B4913F1A", border: "#B4913F4D", text: "#93711F" },
};

export const VACCINE_TEMPLATES = {
  "Kedi": [
    { name: "İç Dış Parazit", weeks: 0 },
    { name: "Kedi Karma 1", weeks: 1 },
    { name: "Kedi Karma 2", weeks: 2 },
    { name: "Lösemi 1", weeks: 3 },
    { name: "Lösemi 2", weeks: 4 },
    { name: "Kuduz", weeks: 5 },
  ],
  "Köpek": [
    { name: "İç Dış Parazit", weeks: 0 },
    { name: "Köpek Karma 1", weeks: 1 },
    { name: "Köpek Karma 2", weeks: 2 },
    { name: "Corona 1", weeks: 3 },
    { name: "Corona 2", weeks: 4 },
    { name: "Bronşin 1", weeks: 5 },
    { name: "Bronşin 2", weeks: 6 },
    { name: "Kuduz", weeks: 7 },
  ],
};

export function nextAutoVaccine(v) {
  if (!v.administered_date) return null;
  const name = (v.name || "").trim();
  if (name === "İç Dış Parazit") {
    return { name: "İç Dış Parazit", planned_date: addMonths(v.administered_date, 2) };
  }
  if (name === "Kuduz") return null;
  if (name.startsWith("Yıllık ")) {
    return { name, planned_date: addYears(v.administered_date, 1) };
  }
  const m = name.match(/^(.+)\s+2$/);
  if (m) {
    return { name: `Yıllık ${m[1]}`, planned_date: addYears(v.administered_date, 1) };
  }
  return null;
}

export const VACCINE_INFO = {
  "Kedi": [
    { title: "İç Dış Parazit", desc: "Bağırsak kurtları, pire ve kene gibi parazitlere karşı düzenli koruma sağlar; ilk uygulamadan sonra 2 ayda bir tekrarlanması önerilir." },
    { title: "Kedi Karma (FVRCP)", desc: "Kedi nezlesi, kalisivirüs ve panlökopeni gibi yaygın ve bulaşıcı hastalıklara karşı koruma sağlar; genellikle 2 doz halinde uygulanır ve sonrasında yıllık tekrarlanır." },
    { title: "Lösemi (FeLV)", desc: "Kedi lösemi virüsüne karşı koruma sağlar; özellikle dışarı çıkan veya başka kedilerle temas eden kediler için önemlidir." },
    { title: "Kuduz", desc: "Ölümcül seyreden kuduz virüsüne karşı koruma sağlar; yasal olarak zorunludur." },
  ],
  "Köpek": [
    { title: "İç Dış Parazit", desc: "Bağırsak kurtları, pire ve kene gibi parazitlere karşı düzenli koruma sağlar; ilk uygulamadan sonra 2 ayda bir tekrarlanması önerilir." },
    { title: "Köpek Karma (DHPPi)", desc: "Gençlik hastalığı (distemper), parvoviral enterit, hepatit ve parainfluenza gibi ciddi hastalıklara karşı koruma sağlar; genellikle 2 doz halinde uygulanır ve sonrasında yıllık tekrarlanır." },
    { title: "Corona", desc: "Köpek koronavirüsünün neden olduğu bağırsak enfeksiyonlarına karşı koruma sağlar." },
    { title: "Bronşin (Kennel Cough)", desc: "Bulaşıcı köpek öksürüğüne karşı koruma sağlar; barınak, pansiyon veya köpek parkı gibi ortak alanları kullanan köpekler için önemlidir." },
    { title: "Kuduz", desc: "Ölümcül seyreden kuduz virüsüne karşı koruma sağlar; yasal olarak zorunludur." },
  ],
};

export const DOG_BREEDS = [
  "Kangal", "Alman Çoban Köpeği (Alman Kurdu)", "Golden Retriever", "Labrador Retriever",
  "Pomeranian (Spitz)", "Chihuahua", "Poodle (Kaniş)", "Pug", "Fransız Bulldog", "İngiliz Bulldog",
  "Rottweiler", "Doberman", "Siberian Husky", "Beagle", "Cocker Spaniel", "Shih Tzu",
  "Yorkshire Terrier", "Boxer", "Akita", "Belçika Malinois", "Melez / Sokak Köpeği", "Diğer (yazınız)",
];
export const CAT_BREEDS = [
  "Tekir (Melez)", "Van Kedisi", "Ankara Kedisi", "British Shorthair", "Scottish Fold",
  "Persian (İran Kedisi)", "Siyam (Siamese)", "Maine Coon", "Sphynx", "Ragdoll", "Bengal",
  "Russian Blue (Rus Mavisi)", "Exotic Shorthair", "Diğer (yazınız)",
];
export const GENDERS = ["Dişi", "Erkek", "Kısır Dişi", "Kısır Erkek"];

export function fmtPrice(n) {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(n);
}

export const BREED_INFO = {
  "Kangal": { risks: ["Büyük ırk olduğu için ileri yaşta kalça displazisi", "Şişkinlik / mide torsiyonu riski", "Göz kapağı anomalileri (entropion)"], tips: ["Eklem sağlığı için glukozamin/kondroitin takviyesi", "Hızlı yemeyi önlemek için yavaş besleme kabı"] },
  "Alman Çoban Köpeği (Alman Kurdu)": { risks: ["Kalça/dirsek displazisi", "İleri yaşta dejeneratif miyelopati", "Şişkinlik / mide torsiyonu riski"], tips: ["Düzenli eklem takviyesi (glukozamin/kondroitin)", "Omega-3 desteği"] },
  "Golden Retriever": { risks: ["Kalça displazisi", "Subaortik stenoz (kalp)", "Lenfoma/hemanjiosarkom gibi kanser türlerine yatkınlık"], tips: ["Eklem takviyesi", "Omega-3 desteği"] },
  "Labrador Retriever": { risks: ["Kalça/dirsek displazisi", "Obezite eğilimi", "İlerleyici retina atrofisi (göz)"], tips: ["Kilo kontrolü", "Eklem takviyesi"] },
  "Pomeranian (Spitz)": { risks: ["Diş taşı birikimi", "Trakea (nefes borusu) çökmesi", "Diz kapağı kayması (patella luksasyonu)"], tips: ["Düzenli diş bakım ürünleri", "Eklem destek takviyesi"] },
  "Chihuahua": { risks: ["Diz kapağı kayması", "Kalp kapak sorunları", "Yavru dönemde kan şekeri düşüklüğü"], tips: ["Eklem destek takviyesi", "Düzenli/sık öğünlerle beslenme"] },
  "Poodle (Kaniş)": { risks: ["Diz kapağı kayması", "İlerleyici retina atrofisi (göz)", "Addison hastalığı"], tips: ["Eklem takviyesi", "Göz sağlığı takviyesi"] },
  "Pug": { risks: ["Kısa burun yapısından solunum güçlüğü", "Obezite eğilimi", "Göz çıkıklığı riski"], tips: ["Kilo kontrolü", "Bağışıklık güçlendirici destek"] },
  "Fransız Bulldog": { risks: ["Solunum güçlüğü (kısa burun)", "Omurga anomalileri (hemivertebra)", "Cilt kıvrımlarında enfeksiyon"], tips: ["Cilt bakım ürünleri", "Düzenli cilt temizliği"] },
  "İngiliz Bulldog": { risks: ["Solunum güçlüğü", "Kalça/eklem sorunları", "Cilt kıvrımlarında enfeksiyon"], tips: ["Eklem takviyesi", "Düzenli cilt bakımı"] },
  "Rottweiler": { risks: ["Kalça/dirsek displazisi", "Kardiyomiyopati (kalp)", "Osteosarkom (kemik kanseri) riski"], tips: ["Eklem sağlığı takviyesi", "Düzenli sağlık kontrolü"] },
  "Doberman": { risks: ["Dilate kardiyomiyopati (kalp)", "von Willebrand hastalığı (kanama bozukluğu)", "Servikal vertebral instabilite (wobbler sendromu)"], tips: ["Düzenli kalp kontrolü", "Genel bağışıklık desteği"] },
  "Siberian Husky": { risks: ["Katarakt", "İlerleyici retina atrofisi", "Hipotiroidizm"], tips: ["Göz sağlığı takviyesi", "Düzenli tiroid kontrolü"] },
  "Beagle": { risks: ["Obezite eğilimi", "Kulak enfeksiyonları", "Epilepsi"], tips: ["Kilo kontrolü", "Düzenli kulak bakımı"] },
  "Cocker Spaniel": { risks: ["Sarkık kulaklardan enfeksiyon", "Cilt alerjileri", "İlerleyici retina atrofisi"], tips: ["Düzenli kulak bakımı", "Cilt bakım ürünleri"] },
  "Shih Tzu": { risks: ["Solunum güçlüğü", "Göz problemleri", "Diş sorunları"], tips: ["Diş bakım ürünleri", "Düzenli göz temizliği"] },
  "Yorkshire Terrier": { risks: ["Diş taşı birikimi", "Trakea çökmesi", "Yavru dönemde kan şekeri düşüklüğü"], tips: ["Diş bakım ürünleri", "Düzenli beslenme düzeni"] },
  "Boxer": { risks: ["Kardiyomiyopati (kalp)", "Mast hücreli tümör riski", "Sıcak çarpmasına yatkınlık"], tips: ["Düzenli kalp kontrolü", "Bağışıklık güçlendirici destek"] },
  "Akita": { risks: ["Otoimmün cilt hastalıkları", "Hipotiroidizm", "İleri yaşta kalça displazisi"], tips: ["Cilt bakım takviyesi", "Eklem desteği"] },
  "Belçika Malinois": { risks: ["Yüksek aktiviteye bağlı kalça displazisi", "Bazı göz sorunları", "Nadiren epilepsi"], tips: ["Eklem takviyesi", "Düzenli veteriner kontrolü"] },
  "Melez / Sokak Köpeği": { risks: ["Irka özgü belirgin bir yatkınlık yoktur", "Dış ortam kaynaklı parazit/enfeksiyon riski", "Genel bağışıklık düzeyi bireysel farklılık gösterebilir"], tips: ["Genel bağışıklık güçlendirici destek", "Düzenli parazit takibi"] },
  "Tekir (Melez)": { risks: ["Irka özgü belirgin bir yatkınlık yoktur", "Dış ortam kaynaklı parazit riski", "Yaşlandıkça diş taşı birikimi"], tips: ["Genel bağışıklık güçlendirici destek", "Malt macunu"] },
  "Van Kedisi": { risks: ["Özellikle mavi gözlülerde işitme hassasiyeti", "Aşırı su teması sonrası cilt tahrişi", "Genel olarak dayanıklı yapı"], tips: ["Genel bağışıklık desteği", "Malt macunu"] },
  "Ankara Kedisi": { risks: ["Beyaz/mavi göz kombinasyonunda işitme hassasiyeti", "Böbrek hastalıklarına hafif yatkınlık", "Genel olarak sağlıklı yapı"], tips: ["Genel bağışıklık desteği", "Malt macunu"] },
  "British Shorthair": { risks: ["Hipertrofik kardiyomiyopati (kalp kası hastalığı)", "Polikistik böbrek hastalığı", "Obezite eğilimi"], tips: ["Kilo kontrolü", "Eklem yükü fazla bireylerde glukozamin desteği"] },
  "Scottish Fold": { risks: ["Osteokondrodisplazi (kıkırdak/eklem gelişim bozukluğu)", "Kulak kıkırdak yapısından kaynaklı sorunlar", "Obezite eğilimi"], tips: ["Eklem destek takviyesi", "Düzenli kulak bakımı"] },
  "Persian (İran Kedisi)": { risks: ["Polikistik böbrek hastalığı", "Kısa burundan solunum sorunları", "Kronik göz akıntısı"], tips: ["Düzenli böbrek taraması", "Düzenli göz temizliği"] },
  "Siyam (Siamese)": { risks: ["Kalp hastalıkları", "Solunum yolu sorunları", "Amiloidoz riski (böbrek/karaciğer)"], tips: ["Düzenli genel sağlık kontrolü", "Genel bağışıklık desteği"] },
  "Maine Coon": { risks: ["Hipertrofik kardiyomiyopati", "Kalça displazisi", "Spinal muskuler atrofi (genetik)"], tips: ["Büyük cüsse nedeniyle eklem takviyesi", "Düzenli kalp taraması"] },
  "Sphynx": { risks: ["Cilt yağlanması ve güneş hassasiyeti", "Kardiyomiyopati", "Kürksüzlük nedeniyle solunum yolu enfeksiyonlarına yatkınlık"], tips: ["Düzenli cilt bakımı", "Ilık ortamda tutulması"] },
  "Ragdoll": { risks: ["Hipertrofik kardiyomiyopati", "Polikistik böbrek hastalığı", "Mesane taşı riski"], tips: ["Düzenli kalp/böbrek taraması", "Bol su tüketiminin teşvik edilmesi"] },
  "Bengal": { risks: ["Hafif kalp hastalığı (HCM) yatkınlığı", "Progresif retina atrofisi", "Sindirim hassasiyeti"], tips: ["Dengeli beslenme", "Genel bağışıklık desteği"] },
  "Russian Blue (Rus Mavisi)": { risks: ["Obezite eğilimi", "Yaşlandıkça diş taşı birikimi", "Genel olarak sağlıklı bir ırktır"], tips: ["Kilo kontrolü", "Diş bakım ürünleri"] },
  "Exotic Shorthair": { risks: ["Polikistik böbrek hastalığı", "Kısa burundan solunum sorunları", "Kronik göz akıntısı"], tips: ["Düzenli böbrek taraması", "Düzenli göz bakımı"] },
};

export const STANDARD_VACCINE_NAMES = [
  "İç Dış Parazit", "Kedi Karma 1", "Kedi Karma 2", "Lösemi 1", "Lösemi 2", "Kuduz",
  "Yıllık Kedi Karma", "Yıllık Lösemi", "Köpek Karma 1", "Köpek Karma 2", "Corona 1", "Corona 2",
  "Bronşin 1", "Bronşin 2", "Yıllık Köpek Karma", "Yıllık Corona", "Yıllık Bronşin", "Diğer (yazınız)",
];

export const CAT_GENERAL_TIP = "Kediler düzenli tüylenme yaşadığından, kıl yumağı oluşumunu azaltmak için malt macunu kullanımı tüm kediler için genel olarak önerilir.";

export const PUPPY_CARE = [
  "Yavru köpekler günde 3-4 öğün, yaşına uygun yavru maması ile beslenmelidir.",
  "İlk aşı programı ve iç-dış parazit takvimine düzenli uyulması bağışıklık gelişimi için kritiktir.",
  "6-16 hafta arası sosyalleşme dönemidir; farklı insan, ortam ve seslerle güvenli şekilde tanıştırılmalıdır.",
  "Tam aşı programı tamamlanana kadar dışarıda diğer köpeklerle temastan kaçınılmalıdır.",
  "Diş değişimi döneminde (4-7 ay) çiğneme oyuncakları diş sağlığına katkı sağlar.",
];

export const KITTEN_CARE = [
  "Yavru kediler günde 3-4 öğün, yaşına uygun yavru maması ile beslenmelidir.",
  "İlk aşı ve iç-dış parazit takvimine düzenli uyulması bağışıklık gelişimi için önemlidir.",
  "2-7 hafta arası sosyalleşme dönemidir; nazik dokunuşlarla insan temasına alıştırılmalıdır.",
  "Kum kabına erken alışma, ileride davranış sorunlarını azaltır.",
  "Tam aşı programı tamamlanana kadar dışarı çıkışlarından kaçınılmalıdır.",
];
