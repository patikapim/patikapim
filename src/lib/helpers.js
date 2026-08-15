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
