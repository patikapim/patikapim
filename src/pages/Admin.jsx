import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabaseClient.js";
import { genSlug, fmtDate, stampParts, nextDueStatus, STATUS_LABEL, STATUS_COLOR } from "../lib/helpers.js";
import {
  Lock, LogOut, Plus, Search, X, Trash2, Syringe, PawPrint, Dog, Cat,
  Copy, Check, Bell, ChevronLeft, AlertTriangle
} from "lucide-react";

const SpeciesIcon = ({ species, ...p }) => {
  if (species === "Kedi") return <Cat {...p} />;
  if (species === "Köpek") return <Dog {...p} />;
  return <PawPrint {...p} />;
};

export default function Admin() {
  const [session, setSession] = useState(undefined); // undefined=loading, null=signed out
  const [isAdmin, setIsAdmin] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) { setIsAdmin(null); return; }
    (async () => {
      const { data, error } = await supabase.from("admins").select("user_id").eq("user_id", session.user.id).maybeSingle();
      setIsAdmin(!error && !!data);
    })();
  }, [session]);

  if (session === undefined) return <CenterMsg><div className="spinner" /></CenterMsg>;
  if (!session) return <AdminLogin />;
  if (isAdmin === null) return <CenterMsg><div className="spinner" /></CenterMsg>;
  if (isAdmin === false) {
    return (
      <CenterMsg>
        <AlertTriangle size={28} color="var(--red)" />
        <p style={{ marginTop: 10, fontWeight: 600 }}>Bu hesabın yönetici yetkisi yok.</p>
        <button className="btn btn-outline" style={{ marginTop: 14 }} onClick={() => supabase.auth.signOut()}>Çıkış Yap</button>
      </CenterMsg>
    );
  }
  return <Dashboard />;
}

function CenterMsg({ children }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, textAlign: "center" }}>
      {children}
    </div>
  );
}

function AdminLogin() {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    setErr(""); setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: pw });
    setLoading(false);
    if (error) setErr("E-posta veya şifre hatalı.");
  }

  return (
    <CenterMsg>
      <div className="card" style={{ padding: 28, width: 320, textAlign: "left" }}>
        <div style={{ width: 44, height: 44, borderRadius: 999, background: "var(--navy)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
          <Lock size={18} color="var(--cream)" />
        </div>
        <h2 className="font-display" style={{ fontSize: 22, margin: "0 0 4px" }}>Yönetici Girişi</h2>
        <p style={{ fontSize: 13, color: "rgba(42,36,28,0.6)", marginBottom: 16 }}>Pati Kapım · Aşı Karnesi</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <input className="input" placeholder="E-posta" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input className="input" type="password" placeholder="Şifre" value={pw} onChange={(e) => setPw(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()} />
          {err && <div style={{ color: "var(--red)", fontSize: 13 }}>{err}</div>}
          <button className="btn btn-primary" style={{ marginTop: 4 }} onClick={submit} disabled={loading}>
            {loading ? "Giriş yapılıyor…" : "Giriş Yap"}
          </button>
        </div>
      </div>
    </CenterMsg>
  );
}

function Dashboard() {
  const [patients, setPatients] = useState([]);
  const [requests, setRequests] = useState([]);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [showNewPatient, setShowNewPatient] = useState(false);
  const [showNewVaccine, setShowNewVaccine] = useState(false);
  const [showRequests, setShowRequests] = useState(false);
  const [toast, setToast] = useState("");

  const flash = (m) => { setToast(m); setTimeout(() => setToast(""), 2200); };

  const loadPatients = useCallback(async () => {
    const { data } = await supabase.from("patients").select("*, vaccines(*)").order("created_at", { ascending: false });
    setPatients(data || []);
  }, []);
  const loadRequests = useCallback(async () => {
    const { data } = await supabase.from("appointment_requests")
      .select("*, patients(pet_name, owner_name)")
      .order("created_at", { ascending: false });
    setRequests(data || []);
  }, []);

  useEffect(() => { loadPatients(); loadRequests(); }, [loadPatients, loadRequests]);

  const selected = patients.find((p) => p.id === selectedId);
  const filtered = patients.filter((p) => (p.pet_name + " " + (p.owner_name || "")).toLowerCase().includes(query.toLowerCase()));
  const pendingCount = requests.filter((r) => r.status === "beklemede").length;
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <div style={{ minHeight: "100vh" }}>
      {toast && (
        <div style={{ position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)", zIndex: 50, background: "var(--navy)", color: "var(--cream)", padding: "8px 16px", borderRadius: 999, fontSize: 13, fontWeight: 600 }}>{toast}</div>
      )}
      <header style={{ background: "var(--navy)", padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img src="/logo.png" alt="" style={{ width: 28, height: 28, objectFit: "contain" }} />
          <span className="font-display" style={{ color: "var(--cream)", fontSize: 17 }}>Pati Kapım · Yönetici</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <button onClick={() => setShowRequests(true)} style={{ position: "relative", background: "none", border: "none", cursor: "pointer" }}>
            <Bell size={19} color="var(--cream)" />
            {pendingCount > 0 && (
              <span style={{ position: "absolute", top: -4, right: -6, background: "var(--gold)", color: "var(--navy)", fontSize: 10, fontWeight: 700, borderRadius: 999, minWidth: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 3px" }}>
                {pendingCount}
              </span>
            )}
          </button>
          <button onClick={() => supabase.auth.signOut()} style={{ background: "none", border: "none", color: "rgba(251,248,242,0.7)", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 13 }}>
            <LogOut size={15} /> Çıkış
          </button>
        </div>
      </header>

      <div className="container-wide" style={{ paddingTop: 16, display: "grid", gridTemplateColumns: "1fr", gap: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: window.innerWidth > 800 ? "280px 1fr" : "1fr", gap: 16 }}>
          <div className="card" style={{ padding: 12, height: "fit-content" }}>
            <div style={{ position: "relative", marginBottom: 10 }}>
              <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "rgba(20,40,60,0.4)" }} />
              <input className="input" style={{ paddingLeft: 30 }} placeholder="Hasta / sahip ara…" value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
            <button className="btn btn-primary" style={{ width: "100%", marginBottom: 10 }} onClick={() => setShowNewPatient(true)}>
              <Plus size={15} /> Yeni Hasta
            </button>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: "60vh", overflowY: "auto" }}>
              {filtered.length === 0 && <div style={{ fontSize: 12, color: "rgba(42,36,28,0.4)", textAlign: "center", padding: 16 }}>Hasta bulunamadı.</div>}
              {filtered.map((p) => (
                <button key={p.id} onClick={() => setSelectedId(p.id)}
                  style={{ textAlign: "left", padding: "8px 10px", borderRadius: 10, border: "none", cursor: "pointer",
                    background: selectedId === p.id ? "var(--navy)" : "transparent", color: selectedId === p.id ? "var(--cream)" : "var(--ink)",
                    display: "flex", alignItems: "center", gap: 8 }}>
                  <SpeciesIcon species={p.species} size={16} />
                  <span style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.pet_name}</div>
                    <div style={{ fontSize: 11, opacity: 0.65, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.owner_name}</div>
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="card" style={{ padding: 20 }}>
            {!selected && (
              <div style={{ textAlign: "center", padding: "60px 0", color: "rgba(42,36,28,0.4)" }}>
                <PawPrint size={32} style={{ opacity: 0.4, marginBottom: 8 }} />
                <p style={{ fontSize: 13 }}>Detayları görmek için soldan bir hasta seç.</p>
              </div>
            )}
            {selected && (
              <PatientDetail
                patient={selected}
                origin={origin}
                onDelete={async () => {
                  if (!confirm(`${selected.pet_name} kaydı silinsin mi?`)) return;
                  await supabase.from("patients").delete().eq("id", selected.id);
                  setSelectedId(null);
                  loadPatients();
                  flash("Hasta kaydı silindi.");
                }}
                onAddVaccine={() => setShowNewVaccine(true)}
                onDeleteVaccine={async (vid) => {
                  await supabase.from("vaccines").delete().eq("id", vid);
                  loadPatients();
                }}
                onCopyLink={() => flash("Bağlantı kopyalandı.")}
              />
            )}
          </div>
        </div>
      </div>

      {showNewPatient && (
        <NewPatientModal onClose={() => setShowNewPatient(false)} onSaved={() => { loadPatients(); flash("Hasta eklendi."); setShowNewPatient(false); }} />
      )}
      {showNewVaccine && selected && (
        <NewVaccineModal patientId={selected.id} petName={selected.pet_name}
          onClose={() => setShowNewVaccine(false)}
          onSaved={() => { loadPatients(); flash("Aşı kaydı eklendi."); setShowNewVaccine(false); }} />
      )}
      {showRequests && (
        <RequestsModal requests={requests} onClose={() => setShowRequests(false)}
          onMark={async (id, status) => { await supabase.from("appointment_requests").update({ status }).eq("id", id); loadRequests(); }} />
      )}
    </div>
  );
}

function PatientDetail({ patient, origin, onDelete, onAddVaccine, onDeleteVaccine, onCopyLink }) {
  const link = `${origin}/hasta/${patient.slug}`;
  const vaccines = [...(patient.vaccines || [])].sort((a, b) => new Date(b.date) - new Date(a.date));
  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <SpeciesIcon species={patient.species} size={20} />
          <h3 className="font-display" style={{ fontSize: 22, margin: 0 }}>{patient.pet_name}</h3>
        </div>
        <button onClick={onDelete} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(162,59,59,0.7)" }}>
          <Trash2 size={16} />
        </button>
      </div>
      <p style={{ fontSize: 13, color: "rgba(42,36,28,0.6)", margin: "4px 0" }}>{patient.species} · {patient.breed || "Irk belirtilmemiş"}</p>
      <p style={{ fontSize: 13, color: "rgba(42,36,28,0.6)", marginBottom: 14 }}>Sahip: {patient.owner_name || "—"}</p>

      <div style={{ display: "flex", alignItems: "center", gap: 8, background: "white", border: "1px solid rgba(20,40,60,0.12)", borderRadius: 10, padding: "8px 10px", marginBottom: 16 }}>
        <span className="font-mono" style={{ fontSize: 12, color: "rgba(42,36,28,0.6)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{link}</span>
        <button onClick={() => { navigator.clipboard.writeText(link); onCopyLink(); }} className="btn btn-outline" style={{ padding: "6px 10px" }}>
          <Copy size={13} /> Kopyala
        </button>
      </div>
      {patient.pin && <p style={{ fontSize: 12, color: "rgba(42,36,28,0.5)", marginTop: -10, marginBottom: 14 }}>PIN: <span className="font-mono">{patient.pin}</span></p>}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <span className="font-mono" style={{ fontSize: 11, letterSpacing: 1, textTransform: "uppercase", color: "rgba(42,36,28,0.5)" }}>Aşı Geçmişi ({vaccines.length})</span>
        <button className="btn btn-primary" style={{ padding: "7px 12px", fontSize: 12 }} onClick={onAddVaccine}>
          <Syringe size={13} /> Aşı Ekle
        </button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {vaccines.length === 0 && <div style={{ fontSize: 13, color: "rgba(42,36,28,0.4)", textAlign: "center", padding: 20 }}>Henüz kayıtlı aşı yok.</div>}
        {vaccines.map((v) => {
          const st = nextDueStatus(v.next_due);
          return (
            <div key={v.id} style={{ display: "flex", alignItems: "center", gap: 10, background: "white", border: "1px solid rgba(20,40,60,0.1)", borderRadius: 12, padding: "8px 10px" }}>
              <div className="stamp" style={{ width: 42, height: 42 }}>
                <span className="font-mono" style={{ fontSize: 10, fontWeight: 700, lineHeight: 1 }}>{stampParts(v.date).d}</span>
                <span className="font-mono" style={{ fontSize: 8, lineHeight: 1 }}>{stampParts(v.date).m}</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{v.name}</div>
                <div style={{ fontSize: 11, color: "rgba(42,36,28,0.5)" }}>
                  {fmtDate(v.date)}{v.next_due ? ` · Sıradaki: ${fmtDate(v.next_due)}` : ""}
                </div>
                {st && (
                  <span className="badge" style={{ marginTop: 4, background: STATUS_COLOR[st].bg, borderColor: STATUS_COLOR[st].border, color: STATUS_COLOR[st].text }}>
                    {STATUS_LABEL[st]}
                  </span>
                )}
              </div>
              <button onClick={() => onDeleteVaccine(v.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(42,36,28,0.3)" }}>
                <X size={15} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Modal({ title, icon, onClose, children }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(20,40,60,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 40 }} onClick={onClose}>
      <div className="card" style={{ padding: 22, width: "100%", maxWidth: 380, background: "var(--paper)" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <h3 className="font-display" style={{ fontSize: 19, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>{icon}{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label style={{ display: "block", marginBottom: 8 }}>
      <div style={{ fontSize: 12, color: "rgba(42,36,28,0.5)", marginBottom: 3 }}>{label}</div>
      {children}
    </label>
  );
}

function NewPatientModal({ onClose, onSaved }) {
  const [petName, setPetName] = useState("");
  const [species, setSpecies] = useState("Köpek");
  const [breed, setBreed] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [pin, setPin] = useState("");
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!petName) { setErr("Hayvanın adı zorunlu."); return; }
    setSaving(true);
    const slug = genSlug();
    const { error } = await supabase.from("patients").insert({
      pet_name: petName, species, breed: breed || null, owner_name: ownerName || null,
      slug, pin: pin.trim() || null,
    });
    setSaving(false);
    if (error) { setErr("Kaydedilemedi, tekrar deneyin."); return; }
    onSaved();
  }

  return (
    <Modal title="Yeni Hasta" icon={<PawPrint size={17} />} onClose={onClose}>
      <Field label="Hayvanın adı"><input className="input" value={petName} onChange={(e) => setPetName(e.target.value)} /></Field>
      <Field label="Tür">
        <select className="input" value={species} onChange={(e) => setSpecies(e.target.value)}>
          <option>Köpek</option><option>Kedi</option><option>Diğer</option>
        </select>
      </Field>
      <Field label="Irk (opsiyonel)"><input className="input" value={breed} onChange={(e) => setBreed(e.target.value)} /></Field>
      <Field label="Sahibinin adı"><input className="input" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} /></Field>
      <Field label="PIN (opsiyonel, ekstra güvenlik için)"><input className="input" inputMode="numeric" placeholder="Boş bırakılabilir" value={pin} onChange={(e) => setPin(e.target.value)} /></Field>
      {err && <div style={{ color: "var(--red)", fontSize: 13, marginBottom: 8 }}>{err}</div>}
      <button className="btn btn-primary" style={{ width: "100%", marginTop: 6 }} onClick={save} disabled={saving}>
        {saving ? "Kaydediliyor…" : "Hastayı Kaydet"}
      </button>
    </Modal>
  );
}

function NewVaccineModal({ patientId, petName, onClose, onSaved }) {
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [nextDue, setNextDue] = useState("");
  const [notes, setNotes] = useState("");
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!name || !date) { setErr("Aşı adı ve tarih zorunlu."); return; }
    setSaving(true);
    const { error } = await supabase.from("vaccines").insert({
      patient_id: patientId, name, date, next_due: nextDue || null, notes: notes || null,
    });
    setSaving(false);
    if (error) { setErr("Kaydedilemedi, tekrar deneyin."); return; }
    onSaved();
  }

  return (
    <Modal title={`Aşı Ekle · ${petName}`} icon={<Syringe size={17} />} onClose={onClose}>
      <Field label="Aşı adı (örn. Kuduz, Karma)"><input className="input" value={name} onChange={(e) => setName(e.target.value)} /></Field>
      <Field label="Uygulama tarihi"><input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
      <Field label="Sıradaki tarih (opsiyonel)"><input className="input" type="date" value={nextDue} onChange={(e) => setNextDue(e.target.value)} /></Field>
      <Field label="Not (opsiyonel)"><input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
      {err && <div style={{ color: "var(--red)", fontSize: 13, marginBottom: 8 }}>{err}</div>}
      <button className="btn btn-primary" style={{ width: "100%", marginTop: 6 }} onClick={save} disabled={saving}>
        {saving ? "Kaydediliyor…" : "Kaydet"}
      </button>
    </Modal>
  );
}

function RequestsModal({ requests, onClose, onMark }) {
  return (
    <Modal title="Randevu Talepleri" icon={<Bell size={17} />} onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: "60vh", overflowY: "auto" }}>
        {requests.length === 0 && <div style={{ fontSize: 13, color: "rgba(42,36,28,0.4)", textAlign: "center", padding: 16 }}>Henüz talep yok.</div>}
        {requests.map((r) => (
          <div key={r.id} style={{ background: "white", border: "1px solid rgba(20,40,60,0.1)", borderRadius: 10, padding: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: 600, fontSize: 13 }}>{r.patients?.pet_name} <span style={{ fontWeight: 400, opacity: 0.6 }}>· {r.patients?.owner_name}</span></span>
              <span className="badge" style={{
                background: r.status === "beklemede" ? "#B4913F1A" : "#5C7A661A",
                borderColor: r.status === "beklemede" ? "#B4913F4D" : "#5C7A664D",
                color: r.status === "beklemede" ? "#93711F" : "#3F5A4C",
              }}>{r.status}</span>
            </div>
            {r.message && <div style={{ fontSize: 12, color: "rgba(42,36,28,0.6)", margin: "6px 0" }}>{r.message}</div>}
            <div style={{ fontSize: 11, color: "rgba(42,36,28,0.4)", marginBottom: 8 }}>{new Date(r.created_at).toLocaleString("tr-TR")}</div>
            {r.status === "beklemede" && (
              <button className="btn btn-outline" style={{ padding: "5px 10px", fontSize: 12 }} onClick={() => onMark(r.id, "tamamlandı")}>
                <Check size={12} /> Tamamlandı olarak işaretle
              </button>
            )}
          </div>
        ))}
      </div>
    </Modal>
  );
}
