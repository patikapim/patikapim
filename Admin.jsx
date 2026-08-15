import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabaseClient.js";
import {
  genSlug, fmtDate, stampParts, vaccineStatus, STATUS_LABEL, STATUS_COLOR,
  VACCINE_TEMPLATES, addWeeks, nextAutoVaccine, todayIso,
} from "../lib/helpers.js";
import {
  Lock, LogOut, Plus, Search, X, Trash2, Syringe, PawPrint, Dog, Cat,
  Copy, Check, Bell, AlertTriangle, CalendarPlus, CalendarCheck
} from "lucide-react";

const SpeciesIcon = ({ species, ...p }) => {
  if (species === "Kedi") return <Cat {...p} />;
  if (species === "Köpek") return <Dog {...p} />;
  return <PawPrint {...p} />;
};

export default function Admin() {
  const [session, setSession] = useState(undefined);
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
  const [showSchedule, setShowSchedule] = useState(false);
  const [markDoneTarget, setMarkDoneTarget] = useState(null);
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

  async function markVaccineDone(vaccine, administeredDate) {
    await supabase.from("vaccines").update({ administered_date: administeredDate }).eq("id", vaccine.id);
    const next = nextAutoVaccine({ ...vaccine, administered_date: administeredDate });
    if (next) {
      await supabase.from("vaccines").insert({ patient_id: vaccine.patient_id, name: next.name, planned_date: next.planned_date });
    }
    await loadPatients();
    flash(next ? `Yapıldı — "${next.name}" otomatik planlandı.` : "Yapıldı olarak işaretlendi.");
  }

  return (
    <div style={{ minHeight: "100vh" }}>
      {toast && (
        <div style={{ position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)", zIndex: 50, background: "var(--navy)", color: "var(--cream)", padding: "8px 16px", borderRadius: 999, fontSize: 13, fontWeight: 600, maxWidth: "90vw", textAlign: "center" }}>{toast}</div>
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
                onApplySchedule={() => setShowSchedule(true)}
                onMarkDone={(v) => setMarkDoneTarget(v)}
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
      {showSchedule && selected && (
        <ScheduleModal patient={selected}
          onClose={() => setShowSchedule(false)}
          onApplied={(count) => { loadPatients(); flash(`${count} aşı planlandı.`); setShowSchedule(false); }} />
      )}
      {markDoneTarget && (
        <MarkDoneModal vaccine={markDoneTarget}
          onClose={() => setMarkDoneTarget(null)}
          onConfirm={async (date) => { await markVaccineDone(markDoneTarget, date); setMarkDoneTarget(null); }} />
      )}
      {showRequests && (
        <RequestsModal requests={requests} onClose={() => setShowRequests(false)}
          onMark={async (id, status) => { await supabase.from("appointment_requests").update({ status }).eq("id", id); loadRequests(); }} />
      )}
    </div>
  );
}

function PatientDetail({ patient, origin, onDelete, onAddVaccine, onApplySchedule, onMarkDone, onDeleteVaccine, onCopyLink }) {
  const link = `${origin}/hasta/${patient.slug}`;
  const all = patient.vaccines || [];
  const planned = all.filter((v) => !v.administered_date).sort((a, b) => new Date(a.planned_date) - new Date(b.planned_date));
  const done = all.filter((v) => v.administered_date).sort((a, b) => new Date(b.administered_date) - new Date(a.administered_date));
  const hasTemplate = patient.species === "Kedi" || patient.species === "Köpek";

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

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
        <span className="font-mono" style={{ fontSize: 11, letterSpacing: 1, textTransform: "uppercase", color: "rgba(42,36,28,0.5)" }}>
          Aşılar ({all.length})
        </span>
        <div style={{ display: "flex", gap: 8 }}>
          {hasTemplate && (
            <button className="btn btn-outline" style={{ padding: "7px 12px", fontSize: 12 }} onClick={onApplySchedule}>
              <CalendarPlus size={13} /> {patient.species} Aşı Programını Uygula
            </button>
          )}
          <button className="btn btn-primary" style={{ padding: "7px 12px", fontSize: 12 }} onClick={onAddVaccine}>
            <Syringe size={13} /> Aşı Ekle
          </button>
        </div>
      </div>

      {planned.length > 0 && (
        <>
          <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(42,36,28,0.45)", margin: "10px 0 6px" }}>PLANLANAN</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
            {planned.map((v) => {
              const st = vaccineStatus(v);
              return (
                <div key={v.id} style={{ display: "flex", alignItems: "center", gap: 10, background: "white", border: "1px solid rgba(20,40,60,0.1)", borderRadius: 12, padding: "8px 10px" }}>
                  <div className="stamp" style={{ width: 42, height: 42, borderStyle: "dashed", borderColor: STATUS_COLOR[st].text, color: STATUS_COLOR[st].text }}>
                    <span className="font-mono" style={{ fontSize: 10, fontWeight: 700, lineHeight: 1 }}>{stampParts(v.planned_date).d}</span>
                    <span className="font-mono" style={{ fontSize: 8, lineHeight: 1 }}>{stampParts(v.planned_date).m}</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{v.name}</div>
                    <div style={{ fontSize: 11, color: "rgba(42,36,28,0.5)" }}>{fmtDate(v.planned_date)}</div>
                    <span className="badge" style={{ marginTop: 4, background: STATUS_COLOR[st].bg, borderColor: STATUS_COLOR[st].border, color: STATUS_COLOR[st].text }}>
                      {STATUS_LABEL[st]}
                    </span>
                  </div>
                  <button onClick={() => onMarkDone(v)} className="btn btn-outline" style={{ padding: "5px 9px", fontSize: 11 }}>
                    <CalendarCheck size={12} /> Yapıldı
                  </button>
                  <button onClick={() => onDeleteVaccine(v.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(42,36,28,0.3)" }}>
                    <X size={15} />
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}

      <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(42,36,28,0.45)", margin: "10px 0 6px" }}>GEÇMİŞ</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {done.length === 0 && <div style={{ fontSize: 13, color: "rgba(42,36,28,0.4)", textAlign: "center", padding: 20 }}>Henüz uygulanmış aşı yok.</div>}
        {done.map((v) => (
          <div key={v.id} style={{ display: "flex", alignItems: "center", gap: 10, background: "white", border: "1px solid rgba(20,40,60,0.1)", borderRadius: 12, padding: "8px 10px" }}>
            <div className="stamp" style={{ width: 42, height: 42 }}>
              <span className="font-mono" style={{ fontSize: 10, fontWeight: 700, lineHeight: 1 }}>{stampParts(v.administered_date).d}</span>
              <span className="font-mono" style={{ fontSize: 8, lineHeight: 1 }}>{stampParts(v.administered_date).m}</span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{v.name}</div>
              <div style={{ fontSize: 11, color: "rgba(42,36,28,0.5)" }}>{fmtDate(v.administered_date)}</div>
              <span className="badge" style={{ marginTop: 4, background: "#5C7A661A", borderColor: "#5C7A664D", color: "#3F5A4C" }}>
                <Check size={11} /> Yapıldı
              </span>
            </div>
            <button onClick={() => onDeleteVaccine(v.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(42,36,28,0.3)" }}>
              <X size={15} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function Modal({ title, icon, onClose, children }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(20,40,60,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 40 }} onClick={onClose}>
      <div className="card" style={{ padding: 22, width: "100%", maxWidth: 400, background: "var(--paper)", maxHeight: "85vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
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
      <p style={{ fontSize: 11, color: "rgba(42,36,28,0.45)", marginTop: 10 }}>
        Kayıttan sonra, hasta seçiliyken "Aşı Programını Uygula" ile standart aşı takvimini otomatik oluşturabilirsin.
      </p>
    </Modal>
  );
}

function NewVaccineModal({ patientId, petName, onClose, onSaved }) {
  const [name, setName] = useState("");
  const [status, setStatus] = useState("planlandi"); // planlandi | yapildi
  const [dateVal, setDateVal] = useState(todayIso());
  const [notes, setNotes] = useState("");
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!name || !dateVal) { setErr("Aşı adı ve tarih zorunlu."); return; }
    setSaving(true);
    const payload = status === "yapildi"
      ? { patient_id: patientId, name, planned_date: dateVal, administered_date: dateVal, notes: notes || null }
      : { patient_id: patientId, name, planned_date: dateVal, administered_date: null, notes: notes || null };
    const { error } = await supabase.from("vaccines").insert(payload);
    setSaving(false);
    if (error) { setErr("Kaydedilemedi, tekrar deneyin."); return; }
    onSaved();
  }

  return (
    <Modal title={`Aşı Ekle · ${petName}`} icon={<Syringe size={17} />} onClose={onClose}>
      <Field label="Aşı adı (örn. Kuduz, Kedi Karma 1, Lösemi 2)"><input className="input" value={name} onChange={(e) => setName(e.target.value)} /></Field>
      <Field label="Durum">
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" onClick={() => setStatus("planlandi")}
            className="btn" style={{ flex: 1, background: status === "planlandi" ? "var(--navy)" : "white", color: status === "planlandi" ? "var(--cream)" : "var(--ink)", border: "1px solid rgba(20,40,60,0.15)" }}>
            Planlandı
          </button>
          <button type="button" onClick={() => setStatus("yapildi")}
            className="btn" style={{ flex: 1, background: status === "yapildi" ? "var(--navy)" : "white", color: status === "yapildi" ? "var(--cream)" : "var(--ink)", border: "1px solid rgba(20,40,60,0.15)" }}>
            Yapıldı
          </button>
        </div>
      </Field>
      <Field label={status === "yapildi" ? "Uygulama tarihi" : "Planlanan tarih"}>
        <input className="input" type="date" value={dateVal} onChange={(e) => setDateVal(e.target.value)} />
      </Field>
      <Field label="Not (opsiyonel)"><input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
      {err && <div style={{ color: "var(--red)", fontSize: 13, marginBottom: 8 }}>{err}</div>}
      <button className="btn btn-primary" style={{ width: "100%", marginTop: 6 }} onClick={save} disabled={saving}>
        {saving ? "Kaydediliyor…" : "Kaydet"}
      </button>
    </Modal>
  );
}

function ScheduleModal({ patient, onClose, onApplied }) {
  const template = VACCINE_TEMPLATES[patient.species] || [];
  const [startDate, setStartDate] = useState(todayIso());
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  async function apply() {
    setSaving(true);
    const rows = template.map((t) => ({
      patient_id: patient.id, name: t.name, planned_date: addWeeks(startDate, t.weeks),
    }));
    const { error } = await supabase.from("vaccines").insert(rows);
    setSaving(false);
    if (error) { setErr("Uygulanamadı, tekrar deneyin."); return; }
    onApplied(rows.length);
  }

  return (
    <Modal title={`${patient.species} Aşı Programı`} icon={<CalendarPlus size={17} />} onClose={onClose}>
      <p style={{ fontSize: 13, color: "rgba(42,36,28,0.6)", marginBottom: 12 }}>
        {patient.pet_name} için standart {patient.species.toLowerCase()} aşı takvimi, aşağıdaki başlangıç tarihine göre otomatik planlanacak (aşılar 1'er hafta ara ile sıralanır).
      </p>
      <Field label="Başlangıç tarihi (ilk aşı)">
        <input className="input" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
      </Field>
      <div style={{ background: "white", borderRadius: 10, border: "1px solid rgba(20,40,60,0.1)", padding: 10, marginBottom: 12, maxHeight: 180, overflowY: "auto" }}>
        {template.map((t) => (
          <div key={t.name} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "3px 0" }}>
            <span>{t.name}</span>
            <span style={{ color: "rgba(42,36,28,0.5)" }} className="font-mono">{fmtDate(addWeeks(startDate, t.weeks))}</span>
          </div>
        ))}
      </div>
      {err && <div style={{ color: "var(--red)", fontSize: 13, marginBottom: 8 }}>{err}</div>}
      <button className="btn btn-primary" style={{ width: "100%" }} onClick={apply} disabled={saving}>
        {saving ? "Uygulanıyor…" : `${template.length} Aşıyı Planla`}
      </button>
    </Modal>
  );
}

function MarkDoneModal({ vaccine, onClose, onConfirm }) {
  const [date, setDate] = useState(todayIso());
  const preview = nextAutoVaccine({ ...vaccine, administered_date: date });
  return (
    <Modal title={`Yapıldı Olarak İşaretle`} icon={<CalendarCheck size={17} />} onClose={onClose}>
      <p style={{ fontSize: 13, color: "rgba(42,36,28,0.6)", marginBottom: 12 }}><strong>{vaccine.name}</strong> için uygulama tarihini onayla.</p>
      <Field label="Uygulama tarihi">
        <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </Field>
      {preview && (
        <div style={{ fontSize: 12, color: "rgba(42,36,28,0.55)", background: "white", borderRadius: 10, padding: 10, marginBottom: 10 }}>
          Otomatik olarak <strong>"{preview.name}"</strong> için {fmtDate(preview.planned_date)} tarihine yeni bir plan oluşturulacak.
        </div>
      )}
      <button className="btn btn-primary" style={{ width: "100%" }} onClick={() => onConfirm(date)}>
        <Check size={15} /> Onayla
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
