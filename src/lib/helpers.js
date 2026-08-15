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

// Returns status for a vaccine's next-due date: 'overdue' | 'soon' | 'planned' | null
export function nextDueStatus(nextDueIso) {
  if (!nextDueIso) return null;
  const days = daysUntil(nextDueIso);
  if (days < 0) return "overdue";
  if (days <= 30) return "soon";
  return "planned";
}

export const STATUS_LABEL = {
  overdue: "Zamanı Geçti",
  soon: "Yaklaşıyor",
  planned: "Planlandı",
};

export const STATUS_COLOR = {
  overdue: { bg: "#A23B3B1A", border: "#A23B3B4D", text: "#A23B3B" },
  soon: { bg: "#B4913F1A", border: "#B4913F4D", text: "#93711F" },
  planned: { bg: "#5C7A661A", border: "#5C7A664D", text: "#3F5A4C" },
};
