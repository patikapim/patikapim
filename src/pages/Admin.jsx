import React, { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "../lib/supabaseClient.js";
import {
  genSlug, fmtDate, stampParts, vaccineStatus, STATUS_LABEL, STATUS_COLOR,
  VACCINE_TEMPLATES, addWeeks, nextAutoVaccine, todayIso, DOG_BREEDS, CAT_BREEDS, GENDERS, fmtPrice,
} from "../lib/helpers.js";
import {
  Lock, LogOut, Plus, Search, X, Trash2, Syringe, PawPrint, Dog, Cat,
  Copy, Check, Bell, AlertTriangle, CalendarPlus, CalendarCheck, Pencil,
  ShoppingBag, Image as ImageIcon, Users, BarChart3, Wallet, TrendingDown, TrendingUp
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from "recharts";

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
  const [view, setView] = useState("hastalar");
  const [patients, setPatients] = useState([]);
  const [requests, setRequests] = useState([]);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [ledger, setLedger] = useState([]);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [showPatientForm, setShowPatientForm] = useState(null);
  const [showNewVaccine, setShowNewVaccine] = useState(false);
  const [editVaccineTarget, setEditVaccineTarget] = useState(null);
  const [showRequests, setShowRequests] = useState(false);
  const [showOrders, setShowOrders] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [showProductForm, setShowProductForm] = useState(null);
  const [showLedgerForm, setShowLedgerForm] = useState(null);
  const [markDoneTarget, setMarkDoneTarget] = useState(null);
  const [toast, setToast] = useState("");

  const flash = (m) => { setToast(m); setTimeout(() => setToast(""), 2200); };

  const loadPatients = useCallback(async () => {
    const { data } = await supabase.from("patients").select("*, vaccines(*)").order("created_at", { ascending: false });
    setPatients(data || []);
  }, []);
  const loadRequests = useCallback(async () => {
    const { data } = await supabase.from("appointment_requests")
      .select("*, patients(pet_name, owner_name)").order("created_at", { ascending: false });
    setRequests(data || []);
  }, []);
  const loadOrders = useCallback(async () => {
    const { data } = await supabase.from("orders")
      .select("*, patients(pet_name, owner_name)").order("created_at", { ascending: false });
    setOrders(data || []);
  }, []);
  const loadProducts = useCallback(async () => {
    const { data } = await supabase.from("products").select("*").order("created_at", { ascending: false });
    setProducts(data || []);
  }, []);
  const loadLedger = useCallback(async () => {
    const { data } = await supabase.from("ledger_entries").select("*").order("created_at", { ascending: false });
    setLedger(data || []);
  }, []);

  useEffect(() => { loadPatients(); loadRequests(); loadOrders(); loadProducts(); loadLedger(); }, [loadPatients, loadRequests, loadOrders, loadProducts, loadLedger]);

  const selected = patients.find((p) => p.id === selectedId);
  const filtered = patients.filter((p) => (p.pet_name + " " + (p.owner_name || "")).toLowerCase().includes(query.toLowerCase()));
  const pendingReq = requests.filter((r) => r.status === "beklemede").length;
  const pendingOrders = orders.filter((o) => o.status === "beklemede").length;
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
      <header style={{ background: "var(--navy)", padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 10, flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img src="/logo.png" alt="" style={{ width: 28, height: 28, objectFit: "contain" }} />
          <span className="font-display" style={{ color: "var(--cream)", fontSize: 17 }}>Pati Kapım · Yönetici</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ display: "flex", gap: 4, background: "rgba(255,255,255,0.08)", padding: 3, borderRadius: 10 }}>
            <button onClick={() => setView("hastalar")} className="btn" style={{ padding: "5px 10px", fontSize: 12, background: view === "hastalar" ? "var(--gold)" : "transparent", color: view === "hastalar" ? "var(--navy)" : "var(--cream)" }}>
              <Users size={13} /> Hastalar
            </button>
            <button onClick={() => setView("magaza")} className="btn" style={{ padding: "5px 10px", fontSize: 12, background: view === "magaza" ? "var(--gold)" : "transparent", color: view === "magaza" ? "var(--navy)" : "var(--cream)" }}>
              <ShoppingBag size={13} /> Mağaza
            </button>
            <button onClick={() => setView("finans")} className="btn" style={{ padding: "5px 10px", fontSize: 12, background: view === "finans" ? "var(--gold)" : "transparent", color: view === "finans" ? "var(--navy)" : "var(--cream)" }}>
              <BarChart3 size={13} /> Finans
            </button>
          </div>
          <button onClick={() => setShowRequests(true)} style={{ position: "relative", background: "none", border: "none", cursor: "pointer" }} title="Randevu talepleri">
            <Bell size={19} color="var(--cream)" />
            {pendingReq > 0 && <Badge count={pendingReq} />}
          </button>
          <button onClick={() => setShowOrders(true)} style={{ position: "relative", background: "none", border: "none", cursor: "pointer" }} title="Siparişler">
            <ShoppingBag size={19} color="var(--cream)" />
            {pendingOrders > 0 && <Badge count={pendingOrders} />}
          </button>
          <button onClick={() => supabase.auth.signOut()} style={{ background: "none", border: "none", color: "rgba(251,248,242,0.7)", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 13 }}>
            <LogOut size={15} /> Çıkış
          </button>
        </div>
      </header>

      {view === "finans" && (
        <FinansView patients={patients} orders={orders} ledger={ledger}
          onAddLedger={(kind) => setShowLedgerForm(kind)}
          onMarkOrder={async (id, status) => { await supabase.from("orders").update({ status }).eq("id", id); loadOrders(); }}
          onMarkPaid={async (id) => { await supabase.from("ledger_entries").update({ status: "odendi", paid_at: new Date().toISOString() }).eq("id", id); loadLedger(); }}
          onDeleteLedger={async (id) => { await supabase.from("ledger_entries").delete().eq("id", id); loadLedger(); }} />
      )}
      {view === "hastalar" && (
        <div className="container-wide" style={{ paddingTop: 16, display: "grid", gridTemplateColumns: "1fr", gap: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: window.innerWidth > 800 ? "280px 1fr" : "1fr", gap: 16 }}>
            <div className="card" style={{ padding: 12, height: "fit-content" }}>
              <div style={{ position: "relative", marginBottom: 10 }}>
                <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "rgba(20,40,60,0.4)" }} />
                <input className="input" style={{ paddingLeft: 30 }} placeholder="Hasta / sahip ara…" value={query} onChange={(e) => setQuery(e.target.value)} />
              </div>
              <button className="btn btn-primary" style={{ width: "100%", marginBottom: 10 }} onClick={() => setShowPatientForm("new")}>
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
                  onEdit={() => setShowPatientForm(selected)}
                  onDelete={async () => {
                    if (!confirm(`${selected.pet_name} kaydı silinsin mi?`)) return;
                    await supabase.from("patients").delete().eq("id", selected.id);
                    setSelectedId(null);
                    loadPatients();
                    flash("Hasta kaydı silindi.");
                  }}
                  onAddVaccine={() => setShowNewVaccine(true)}
                  onEditVaccine={(v) => setEditVaccineTarget(v)}
                  onApplySchedule={() => setShowSchedule(true)}
                  onMarkDone={(v) => setMarkDoneTarget(v)}
                  onDeleteVaccine={async (vid) => { await supabase.from("vaccines").delete().eq("id", vid); loadPatients(); }}
                  onCopyLink={() => flash("Bağlantı kopyalandı.")}
                />
              )}
            </div>
          </div>
        </div>
      )}
      {view === "magaza" && (
        <ProductsManager products={products} onAdd={() => setShowProductForm("new")} onEdit={(p) => setShowProductForm(p)}
          onDelete={async (id) => { await supabase.from("products").delete().eq("id", id); loadProducts(); flash("Ürün silindi."); }}
          onToggleActive={async (p) => { await supabase.from("products").update({ active: !p.active }).eq("id", p.id); loadProducts(); }} />
      )}

      {showPatientForm && (
        <PatientFormModal
          patient={showPatientForm === "new" ? null : showPatientForm}
          onClose={() => setShowPatientForm(null)}
          onSaved={() => { loadPatients(); flash(showPatientForm === "new" ? "Hasta eklendi." : "Hasta güncellendi."); setShowPatientForm(null); }} />
      )}
      {showNewVaccine && selected && (
        <NewVaccineModal patientId={selected.id} petName={selected.pet_name}
          onClose={() => setShowNewVaccine(false)}
          onSaved={() => { loadPatients(); flash("Aşı kaydı eklendi."); setShowNewVaccine(false); }} />
      )}
      {editVaccineTarget && (
        <EditVaccineModal vaccine={editVaccineTarget}
          onClose={() => setEditVaccineTarget(null)}
          onSaved={() => { loadPatients(); flash("Aşı kaydı güncellendi."); setEditVaccineTarget(null); }} />
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
      {showOrders && (
        <OrdersModal orders={orders} onClose={() => setShowOrders(false)}
          onMark={async (id, status) => { await supabase.from("orders").update({ status }).eq("id", id); loadOrders(); }} />
      )}
      {showProductForm && (
        <ProductFormModal product={showProductForm === "new" ? null : showProductForm}
          onClose={() => setShowProductForm(null)}
          onSaved={() => { loadProducts(); flash(showProductForm === "new" ? "Ürün eklendi." : "Ürün güncellendi."); setShowProductForm(null); }} />
      )}
      {showLedgerForm && (
        <LedgerFormModal kind={showLedgerForm} patients={patients}
          onClose={() => setShowLedgerForm(null)}
          onSaved={() => { loadLedger(); flash("Kayıt eklendi."); setShowLedgerForm(null); }} />
      )}
    </div>
  );
}

function Badge({ count }) {
  return (
    <span style={{ position: "absolute", top: -4, right: -6, background: "var(--gold)", color: "var(--navy)", fontSize: 10, fontWeight: 700, borderRadius: 999, minWidth: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 3px" }}>
      {count}
    </span>
  );
}

function PatientDetail({ patient, origin, onEdit, onDelete, onAddVaccine, onEditVaccine, onApplySchedule, onMarkDone, onDeleteVaccine, onCopyLink }) {
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
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onEdit} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(20,40,60,0.5)" }}>
            <Pencil size={16} />
          </button>
          <button onClick={onDelete} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(162,59,59,0.7)" }}>
            <Trash2 size={16} />
          </button>
        </div>
      </div>
      <p style={{ fontSize: 13, color: "rgba(42,36,28,0.6)", margin: "4px 0" }}>
        {patient.species} · {patient.breed || "Irk belirtilmemiş"}{patient.gender ? ` · ${patient.gender}` : ""}
      </p>
      <p style={{ fontSize: 13, color: "rgba(42,36,28,0.6)", marginBottom: 4 }}>Sahip: {patient.owner_name || "—"}</p>
      {(patient.microchip_number || patient.karne_number) && (
        <p style={{ fontSize: 12, color: "rgba(42,36,28,0.5)", marginBottom: 14 }}>
          {patient.microchip_number && <>Mikroçip: <span className="font-mono">{patient.microchip_number}</span>{patient.karne_number && "  ·  "}</>}
          {patient.karne_number && <>Karne No: <span className="font-mono">{patient.karne_number}</span></>}
        </p>
      )}

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
              <CalendarPlus size={13} /> {patient.species} Programı
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
                  <button onClick={() => onEditVaccine(v)} className="btn btn-outline" style={{ padding: "5px 8px", fontSize: 11 }}>
                    <Pencil size={12} />
                  </button>
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

function Modal({ title, icon, onClose, children, wide }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(20,40,60,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 40 }} onClick={onClose}>
      <div className="card" style={{ padding: 22, width: "100%", maxWidth: wide ? 640 : 400, background: "var(--paper)", maxHeight: "85vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
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

function PatientFormModal({ patient, onClose, onSaved }) {
  const isEdit = !!patient;
  const [petName, setPetName] = useState(patient?.pet_name || "");
  const [species, setSpecies] = useState(patient?.species || "Köpek");
  const breedList = species === "Kedi" ? CAT_BREEDS : species === "Köpek" ? DOG_BREEDS : null;
  const initialBreedIsCustom = patient?.breed && breedList && !breedList.includes(patient.breed);
  const [breedSelect, setBreedSelect] = useState(initialBreedIsCustom ? "Diğer (yazınız)" : (patient?.breed || ""));
  const [breedCustom, setBreedCustom] = useState(initialBreedIsCustom ? patient.breed : "");
  const [gender, setGender] = useState(patient?.gender || "");
  const [ownerName, setOwnerName] = useState(patient?.owner_name || "");
  const [microchip, setMicrochip] = useState(patient?.microchip_number || "");
  const [karneNo, setKarneNo] = useState(patient?.karne_number || "");
  const [pin, setPin] = useState(patient?.pin || "");
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  const finalBreed = breedSelect === "Diğer (yazınız)" ? breedCustom.trim() : breedSelect;

  async function save() {
    if (!petName) { setErr("Hayvanın adı zorunlu."); return; }
    setSaving(true);
    const payload = {
      pet_name: petName, species, breed: finalBreed || null, gender: gender || null,
      owner_name: ownerName || null, microchip_number: microchip.trim() || null,
      karne_number: karneNo.trim() || null, pin: pin.trim() || null,
    };
    let error;
    if (isEdit) {
      ({ error } = await supabase.from("patients").update(payload).eq("id", patient.id));
    } else {
      ({ error } = await supabase.from("patients").insert({ ...payload, slug: genSlug() }));
    }
    setSaving(false);
    if (error) { setErr("Kaydedilemedi, tekrar deneyin."); return; }
    onSaved();
  }

  return (
    <Modal title={isEdit ? "Hastayı Düzenle" : "Yeni Hasta"} icon={<PawPrint size={17} />} onClose={onClose}>
      <Field label="Hayvanın adı"><input className="input" value={petName} onChange={(e) => setPetName(e.target.value)} /></Field>
      <Field label="Tür">
        <select className="input" value={species} onChange={(e) => { setSpecies(e.target.value); setBreedSelect(""); setBreedCustom(""); }}>
          <option>Köpek</option><option>Kedi</option><option>Diğer</option>
        </select>
      </Field>
      {breedList ? (
        <Field label="Irk">
          <select className="input" value={breedSelect} onChange={(e) => setBreedSelect(e.target.value)}>
            <option value="">Seçiniz</option>
            {breedList.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
          {breedSelect === "Diğer (yazınız)" && (
            <input className="input" style={{ marginTop: 6 }} placeholder="Irk adı" value={breedCustom} onChange={(e) => setBreedCustom(e.target.value)} />
          )}
        </Field>
      ) : (
        <Field label="Irk (opsiyonel)"><input className="input" value={breedCustom} onChange={(e) => setBreedCustom(e.target.value)} /></Field>
      )}
      <Field label="Cinsiyet">
        <select className="input" value={gender} onChange={(e) => setGender(e.target.value)}>
          <option value="">Belirtilmemiş</option>
          {GENDERS.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
      </Field>
      <Field label="Sahibinin adı"><input className="input" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} /></Field>
      <Field label="Mikroçip numarası (opsiyonel)"><input className="input" value={microchip} onChange={(e) => setMicrochip(e.target.value)} /></Field>
      <Field label="Karne numarası (opsiyonel)"><input className="input" value={karneNo} onChange={(e) => setKarneNo(e.target.value)} /></Field>
      <Field label="PIN (opsiyonel, ekstra güvenlik için)"><input className="input" inputMode="numeric" placeholder="Boş bırakılabilir" value={pin} onChange={(e) => setPin(e.target.value)} /></Field>
      {err && <div style={{ color: "var(--red)", fontSize: 13, marginBottom: 8 }}>{err}</div>}
      <button className="btn btn-primary" style={{ width: "100%", marginTop: 6 }} onClick={save} disabled={saving}>
        {saving ? "Kaydediliyor…" : isEdit ? "Kaydet" : "Hastayı Kaydet"}
      </button>
      {!isEdit && (
        <p style={{ fontSize: 11, color: "rgba(42,36,28,0.45)", marginTop: 10 }}>
          Kayıttan sonra, hasta seçiliyken "Aşı Programını Uygula" ile standart takvimi otomatik oluşturabilirsin.
        </p>
      )}
    </Modal>
  );
}

function NewVaccineModal({ patientId, petName, onClose, onSaved }) {
  const [name, setName] = useState("");
  const [status, setStatus] = useState("planlandi");
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

function EditVaccineModal({ vaccine, onClose, onSaved }) {
  const [name, setName] = useState(vaccine.name);
  const [dateVal, setDateVal] = useState(vaccine.planned_date);
  const [notes, setNotes] = useState(vaccine.notes || "");
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!name || !dateVal) { setErr("Aşı adı ve tarih zorunlu."); return; }
    setSaving(true);
    const { error } = await supabase.from("vaccines").update({ name, planned_date: dateVal, notes: notes || null }).eq("id", vaccine.id);
    setSaving(false);
    if (error) { setErr("Kaydedilemedi, tekrar deneyin."); return; }
    onSaved();
  }

  return (
    <Modal title="Planlanan Aşıyı Düzenle" icon={<Pencil size={17} />} onClose={onClose}>
      <Field label="Aşı adı"><input className="input" value={name} onChange={(e) => setName(e.target.value)} /></Field>
      <Field label="Planlanan tarih"><input className="input" type="date" value={dateVal} onChange={(e) => setDateVal(e.target.value)} /></Field>
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
        {patient.pet_name} için standart {patient.species.toLowerCase()} aşı takvimi, aşağıdaki başlangıç tarihine göre otomatik planlanacak. Uygulandıktan sonra her aşıyı ayrı ayrı da düzenleyebilirsin.
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

function OrdersModal({ orders, onClose, onMark }) {
  return (
    <Modal title="Siparişler" icon={<ShoppingBag size={17} />} onClose={onClose} wide>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: "65vh", overflowY: "auto" }}>
        {orders.length === 0 && <div style={{ fontSize: 13, color: "rgba(42,36,28,0.4)", textAlign: "center", padding: 16 }}>Henüz sipariş yok.</div>}
        {orders.map((o) => (
          <div key={o.id} style={{ background: "white", border: "1px solid rgba(20,40,60,0.1)", borderRadius: 10, padding: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: 600, fontSize: 13 }}>{o.patients?.owner_name || "—"} <span style={{ fontWeight: 400, opacity: 0.6 }}>· {o.patients?.pet_name}</span></span>
              <span className="badge" style={{
                background: o.status === "beklemede" ? "#B4913F1A" : "#5C7A661A",
                borderColor: o.status === "beklemede" ? "#B4913F4D" : "#5C7A664D",
                color: o.status === "beklemede" ? "#93711F" : "#3F5A4C",
              }}>{o.status}</span>
            </div>
            <div style={{ margin: "8px 0", fontSize: 12 }}>
              {(o.items || []).map((it, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", color: "rgba(42,36,28,0.65)" }}>
                  <span>{it.qty}x {it.name}</span>
                  <span className="font-mono">{fmtPrice(it.price * it.qty)}</span>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 13, borderTop: "1px solid rgba(20,40,60,0.08)", paddingTop: 6 }}>
              <span>Toplam</span><span className="font-mono">{fmtPrice(o.total)}</span>
            </div>
            <div style={{ fontSize: 11, color: "rgba(42,36,28,0.4)", margin: "6px 0" }}>{new Date(o.created_at).toLocaleString("tr-TR")}</div>
            {o.status === "beklemede" && (
              <button className="btn btn-outline" style={{ padding: "5px 10px", fontSize: 12 }} onClick={() => onMark(o.id, "tamamlandı")}>
                <Check size={12} /> Tamamlandı olarak işaretle
              </button>
            )}
          </div>
        ))}
      </div>
    </Modal>
  );
}

function ProductsManager({ products, onAdd, onEdit, onDelete, onToggleActive }) {
  return (
    <div className="container-wide" style={{ paddingTop: 16 }}>
      <div className="card" style={{ padding: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h2 className="font-display" style={{ fontSize: 20, margin: 0 }}>Mağaza Ürünleri</h2>
          <button className="btn btn-primary" onClick={onAdd}><Plus size={15} /> Yeni Ürün</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: window.innerWidth > 700 ? "repeat(auto-fill, minmax(180px, 1fr))" : "1fr 1fr", gap: 12 }}>
          {products.length === 0 && <div style={{ fontSize: 13, color: "rgba(42,36,28,0.4)", textAlign: "center", padding: 30, gridColumn: "1 / -1" }}>Henüz ürün eklenmedi.</div>}
          {products.map((p) => (
            <div key={p.id} className="card" style={{ background: "white", overflow: "hidden", opacity: p.active ? 1 : 0.5 }}>
              <div style={{ width: "100%", aspectRatio: "1", background: "var(--paper)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {p.photo_url ? <img src={p.photo_url} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <ImageIcon size={26} color="rgba(20,40,60,0.25)" />}
              </div>
              <div style={{ padding: 10 }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{p.name}</div>
                <div className="font-mono" style={{ fontSize: 12, marginBottom: 8 }}>{fmtPrice(p.price)}</div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button className="btn btn-outline" style={{ flex: 1, padding: "5px 6px", fontSize: 11 }} onClick={() => onEdit(p)}><Pencil size={11} /></button>
                  <button className="btn btn-outline" style={{ flex: 1, padding: "5px 6px", fontSize: 11 }} onClick={() => onToggleActive(p)}>{p.active ? "Gizle" : "Göster"}</button>
                  <button className="btn btn-outline" style={{ padding: "5px 6px", fontSize: 11, color: "var(--red)" }} onClick={() => { if (confirm("Silinsin mi?")) onDelete(p.id); }}><Trash2 size={11} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ProductFormModal({ product, onClose, onSaved }) {
  const isEdit = !!product;
  const [name, setName] = useState(product?.name || "");
  const [price, setPrice] = useState(product?.price ?? "");
  const [description, setDescription] = useState(product?.description || "");
  const [photoUrl, setPhotoUrl] = useState(product?.photo_url || "");
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);

  async function handlePhoto(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const path = `${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("product-photos").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("product-photos").getPublicUrl(path);
      setPhotoUrl(pub.publicUrl);
    } catch {
      setErr("Fotoğraf yüklenemedi.");
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    if (!name || price === "") { setErr("Ürün adı ve fiyat zorunlu."); return; }
    setSaving(true);
    const payload = { name, price: Number(price), description: description || null, photo_url: photoUrl || null };
    let error;
    if (isEdit) ({ error } = await supabase.from("products").update(payload).eq("id", product.id));
    else ({ error } = await supabase.from("products").insert(payload));
    setSaving(false);
    if (error) { setErr("Kaydedilemedi, tekrar deneyin."); return; }
    onSaved();
  }

  return (
    <Modal title={isEdit ? "Ürünü Düzenle" : "Yeni Ürün"} icon={<ShoppingBag size={17} />} onClose={onClose}>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
        <div onClick={() => fileInputRef.current?.click()} style={{ width: 100, height: 100, borderRadius: 12, background: "white", border: "1px dashed rgba(20,40,60,0.25)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", overflow: "hidden" }}>
          {photoUrl ? <img src={photoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : (uploading ? <div className="spinner" /> : <ImageIcon size={22} color="rgba(20,40,60,0.3)" />)}
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handlePhoto} />
      </div>
      <Field label="Ürün adı"><input className="input" value={name} onChange={(e) => setName(e.target.value)} /></Field>
      <Field label="Fiyat (₺)"><input className="input" type="number" min="0" value={price} onChange={(e) => setPrice(e.target.value)} /></Field>
      <Field label="Açıklama (opsiyonel)"><textarea className="input" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} style={{ resize: "vertical" }} /></Field>
      {err && <div style={{ color: "var(--red)", fontSize: 13, marginBottom: 8 }}>{err}</div>}
      <button className="btn btn-primary" style={{ width: "100%", marginTop: 6 }} onClick={save} disabled={saving || uploading}>
        {saving ? "Kaydediliyor…" : "Kaydet"}
      </button>
    </Modal>
  );
}

function StatCard({ icon, label, value, color, onClick }) {
  return (
    <button onClick={onClick} className="card" style={{ padding: 16, background: "white", flex: 1, minWidth: 140, textAlign: "left", border: "none", cursor: onClick ? "pointer" : "default" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <div style={{ width: 26, height: 26, borderRadius: 999, background: color || "var(--navy)", display: "flex", alignItems: "center", justifyContent: "center", color: "white" }}>
          {icon}
        </div>
        <span style={{ fontSize: 12, color: "rgba(42,36,28,0.55)" }}>{label}</span>
      </div>
      <div className="font-display" style={{ fontSize: 22 }}>{value}</div>
    </button>
  );
}

function FinansView({ patients, orders, ledger, onAddLedger, onMarkOrder, onMarkPaid, onDeleteLedger }) {
  const [detail, setDetail] = useState(null);
  const [chartRange, setChartRange] = useState("ay");
  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();

  const vaccinesThisMonthList = [];
  patients.forEach((p) => {
    (p.vaccines || []).forEach((v) => {
      if (!v.administered_date) return;
      const d = new Date(v.administered_date + "T00:00:00");
      if (d.getMonth() === thisMonth && d.getFullYear() === thisYear) {
        vaccinesThisMonthList.push({ ...v, petName: p.pet_name, ownerName: p.owner_name });
      }
    });
  });
  vaccinesThisMonthList.sort((a, b) => new Date(b.administered_date) - new Date(a.administered_date));

  const ordersThisMonth = orders.filter((o) => {
    const d = new Date(o.created_at);
    return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
  });
  const revenueThisMonth = ordersThisMonth.reduce((s, o) => s + Number(o.total), 0);

  const tedarikci = ledger.filter((l) => l.kind === "tedarikci_borcu");
  const hasta = ledger.filter((l) => l.kind === "hasta_borcu");
  const tedarikciAcikToplam = tedarikci.filter((l) => l.status === "acik").reduce((s, l) => s + Number(l.amount), 0);
  const hastaAcikToplam = hasta.filter((l) => l.status === "acik").reduce((s, l) => s + Number(l.amount), 0);

  const MONTH_LABELS = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];

  function sumInRange(start, end) {
    const ciro = orders.filter((o) => { const d = new Date(o.created_at); return d >= start && d < end; })
      .reduce((s, o) => s + Number(o.total), 0);
    const borc = ledger.filter((l) => { const d = new Date(l.created_at); return l.kind === "tedarikci_borcu" && d >= start && d < end; })
      .reduce((s, l) => s + Number(l.amount), 0);
    const alacak = ledger.filter((l) => { const d = new Date(l.created_at); return l.kind === "hasta_borcu" && d >= start && d < end; })
      .reduce((s, l) => s + Number(l.amount), 0);
    return { Ciro: ciro, "Tedarikçi Borcu": borc, "Hasta Alacağı": alacak };
  }

  const monthlyData = [];
  if (chartRange === "gun") {
    for (let i = 6; i >= 0; i--) {
      const start = new Date(thisYear, now.getMonth(), now.getDate() - i, 0, 0, 0, 0);
      const end = new Date(start); end.setDate(end.getDate() + 1);
      monthlyData.push({ month: start.toLocaleDateString("tr-TR", { day: "2-digit", month: "short" }), ...sumInRange(start, end) });
    }
  } else if (chartRange === "hafta") {
    for (let i = 7; i >= 0; i--) {
      const start = new Date(thisYear, now.getMonth(), now.getDate() - i * 7, 0, 0, 0, 0);
      const end = new Date(start); end.setDate(end.getDate() + 7);
      monthlyData.push({ month: start.toLocaleDateString("tr-TR", { day: "2-digit", month: "short" }), ...sumInRange(start, end) });
    }
  } else {
    for (let i = 5; i >= 0; i--) {
      const start = new Date(thisYear, thisMonth - i, 1);
      const end = new Date(thisYear, thisMonth - i + 1, 1);
      monthlyData.push({ month: MONTH_LABELS[start.getMonth()], ...sumInRange(start, end) });
    }
  }

  return (
    <div className="container-wide" style={{ paddingTop: 16, paddingBottom: 30 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
        <StatCard icon={<Users size={13} />} label="Aktif Hasta" value={patients.length} onClick={() => setDetail("hasta")} />
        <StatCard icon={<Syringe size={13} />} label="Bu Ay Yapılan Aşı" value={vaccinesThisMonthList.length} color="var(--green)" onClick={() => setDetail("asi")} />
        <StatCard icon={<ShoppingBag size={13} />} label="Bu Ay Sipariş" value={ordersThisMonth.length} color="var(--gold)" onClick={() => setDetail("siparis")} />
        <StatCard icon={<Wallet size={13} />} label="Bu Ay Ciro" value={fmtPrice(revenueThisMonth)} color="var(--gold)" onClick={() => setDetail("siparis")} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: window.innerWidth > 800 ? "1fr 1fr" : "1fr", gap: 16 }}>
        <LedgerSection title="Tedarikçi Borçlarımız" subtitle="Biz kime ne kadar borçluyuz"
          icon={<TrendingDown size={15} />} entries={tedarikci} total={tedarikciAcikToplam}
          onAdd={() => onAddLedger("tedarikci_borcu")} onMarkPaid={onMarkPaid} onDelete={onDeleteLedger} />
        <LedgerSection title="Hasta Alacaklarımız" subtitle="Kim bize ne kadar borçlu"
          icon={<TrendingUp size={15} />} entries={hasta} total={hastaAcikToplam}
          onAdd={() => onAddLedger("hasta_borcu")} onMarkPaid={onMarkPaid} onDelete={onDeleteLedger} />
      </div>

      <div className="card" style={{ padding: 18, background: "white", marginTop: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 4 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>Ciro, Borç, Alacak</div>
            <div style={{ fontSize: 11, color: "rgba(42,36,28,0.5)" }}>Seçilen aralığa göre gruplanmış tutarlar</div>
          </div>
          <div style={{ display: "flex", gap: 4, background: "var(--paper)", padding: 3, borderRadius: 10 }}>
            {[["gun", "Gün"], ["hafta", "Hafta"], ["ay", "Ay"]].map(([key, label]) => (
              <button key={key} onClick={() => setChartRange(key)}
                className="btn" style={{ padding: "5px 12px", fontSize: 12, background: chartRange === key ? "var(--navy)" : "transparent", color: chartRange === key ? "var(--cream)" : "var(--ink)" }}>
                {label}
              </button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(20,40,60,0.08)" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v) => fmtPrice(v)} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="Ciro" fill="#B4913F" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Tedarikçi Borcu" fill="#A23B3B" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Hasta Alacağı" fill="#5C7A66" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {detail === "hasta" && (
        <Modal title="Aktif Hastalar" icon={<Users size={17} />} onClose={() => setDetail(null)} wide>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: "60vh", overflowY: "auto" }}>
            {patients.length === 0 && <div style={{ fontSize: 13, color: "rgba(42,36,28,0.4)" }}>Henüz hasta yok.</div>}
            {patients.map((p) => (
              <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", background: "white", border: "1px solid rgba(20,40,60,0.1)", borderRadius: 10 }}>
                <SpeciesIcon species={p.species} size={16} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{p.pet_name}</div>
                  <div style={{ fontSize: 11, color: "rgba(42,36,28,0.5)" }}>{p.species}{p.breed ? ` · ${p.breed}` : ""} · {p.owner_name || "—"}</div>
                </div>
              </div>
            ))}
          </div>
        </Modal>
      )}

      {detail === "asi" && (
        <Modal title="Bu Ay Yapılan Aşılar" icon={<Syringe size={17} />} onClose={() => setDetail(null)} wide>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: "60vh", overflowY: "auto" }}>
            {vaccinesThisMonthList.length === 0 && <div style={{ fontSize: 13, color: "rgba(42,36,28,0.4)" }}>Bu ay henüz aşı yapılmadı.</div>}
            {vaccinesThisMonthList.map((v) => (
              <div key={v.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", background: "white", border: "1px solid rgba(20,40,60,0.1)", borderRadius: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{v.name} <span style={{ fontWeight: 400, opacity: 0.6 }}>· {v.petName}</span></div>
                  <div style={{ fontSize: 11, color: "rgba(42,36,28,0.5)" }}>{v.ownerName || "—"}</div>
                </div>
                <span className="font-mono" style={{ fontSize: 12, color: "rgba(42,36,28,0.55)" }}>{fmtDate(v.administered_date)}</span>
              </div>
            ))}
          </div>
        </Modal>
      )}

      {detail === "siparis" && (
        <OrdersModal orders={ordersThisMonth} onClose={() => setDetail(null)} onMark={onMarkOrder} />
      )}
    </div>
  );
}

function LedgerSection({ title, subtitle, icon, entries, total, onAdd, onMarkPaid, onDelete }) {
  const acik = entries.filter((e) => e.status === "acik");
  const odendi = entries.filter((e) => e.status === "odendi");
  return (
    <div className="card" style={{ padding: 18, background: "white" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 4 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 26, height: 26, borderRadius: 999, background: "var(--navy)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--cream)" }}>{icon}</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>{title}</div>
            <div style={{ fontSize: 11, color: "rgba(42,36,28,0.5)" }}>{subtitle}</div>
          </div>
        </div>
        <button className="btn btn-outline" style={{ padding: "6px 10px", fontSize: 12 }} onClick={onAdd}><Plus size={13} /> Ekle</button>
      </div>
      <div className="font-mono" style={{ fontSize: 20, fontWeight: 700, margin: "10px 0 14px", color: "var(--red)" }}>{fmtPrice(total)}</div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {acik.length === 0 && <div style={{ fontSize: 12, color: "rgba(42,36,28,0.4)" }}>Açık kayıt yok.</div>}
        {acik.map((e) => (
          <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: "var(--paper)", borderRadius: 10 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.party_name}</div>
              {e.description && <div style={{ fontSize: 11, color: "rgba(42,36,28,0.5)" }}>{e.description}</div>}
            </div>
            <span className="font-mono" style={{ fontSize: 13, fontWeight: 700 }}>{fmtPrice(e.amount)}</span>
            <button onClick={() => onMarkPaid(e.id)} className="btn btn-outline" style={{ padding: "4px 8px", fontSize: 11 }}>Ödendi</button>
            <button onClick={() => onDelete(e.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(42,36,28,0.3)" }}><X size={14} /></button>
          </div>
        ))}
      </div>

      {odendi.length > 0 && (
        <details style={{ marginTop: 12 }}>
          <summary style={{ fontSize: 11, color: "rgba(42,36,28,0.4)", cursor: "pointer" }}>Ödenenler ({odendi.length})</summary>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
            {odendi.map((e) => (
              <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", opacity: 0.5 }}>
                <span style={{ flex: 1, fontSize: 12 }}>{e.party_name}</span>
                <span className="font-mono" style={{ fontSize: 12 }}>{fmtPrice(e.amount)}</span>
                <button onClick={() => onDelete(e.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(42,36,28,0.3)" }}><X size={13} /></button>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function LedgerFormModal({ kind, patients, onClose, onSaved }) {
  const isHasta = kind === "hasta_borcu";
  const [partyName, setPartyName] = useState("");
  const [patientId, setPatientId] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!partyName || amount === "") { setErr("İsim ve tutar zorunlu."); return; }
    setSaving(true);
    const { error } = await supabase.from("ledger_entries").insert({
      kind, party_name: partyName, patient_id: patientId || null,
      amount: Number(amount), description: description || null,
    });
    setSaving(false);
    if (error) { setErr("Kaydedilemedi, tekrar deneyin."); return; }
    onSaved();
  }

  return (
    <Modal title={isHasta ? "Hasta Alacağı Ekle" : "Tedarikçi Borcu Ekle"} icon={isHasta ? <TrendingUp size={17} /> : <TrendingDown size={17} />} onClose={onClose}>
      {isHasta && (
        <Field label="Hastayla ilişkilendir (opsiyonel)">
          <select className="input" value={patientId} onChange={(e) => {
            setPatientId(e.target.value);
            const p = patients.find((x) => x.id === e.target.value);
            if (p) setPartyName(p.owner_name || p.pet_name);
          }}>
            <option value="">İlişkilendirme</option>
            {patients.map((p) => <option key={p.id} value={p.id}>{p.owner_name || "—"} ({p.pet_name})</option>)}
          </select>
        </Field>
      )}
      <Field label={isHasta ? "Kişi adı" : "Tedarikçi adı"}>
        <input className="input" value={partyName} onChange={(e) => setPartyName(e.target.value)} />
      </Field>
      <Field label="Tutar (₺)"><input className="input" type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
      <Field label="Not (opsiyonel)"><input className="input" value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
      {err && <div style={{ color: "var(--red)", fontSize: 13, marginBottom: 8 }}>{err}</div>}
      <button className="btn btn-primary" style={{ width: "100%", marginTop: 6 }} onClick={save} disabled={saving}>
        {saving ? "Kaydediliyor…" : "Kaydet"}
      </button>
    </Modal>
  );
}
