import React, { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient.js";
import {
  PawPrint, Dog, Cat, Lock, Camera, Calendar, AlertTriangle,
  Check, Send, ShieldAlert, Info, BookOpen, ShoppingBag, Plus, Minus, X, Banknote
} from "lucide-react";
import { fmtDate, stampParts, daysUntil, vaccineStatus, STATUS_LABEL, STATUS_COLOR, VACCINE_INFO, fmtPrice } from "../lib/helpers.js";

const SpeciesIcon = ({ species, ...p }) => {
  if (species === "Kedi") return <Cat {...p} />;
  if (species === "Köpek") return <Dog {...p} />;
  return <PawPrint {...p} />;
};

export default function Owner() {
  const { slug } = useParams();
  const [status, setStatus] = useState("loading");
  const [pin, setPin] = useState("");
  const [pinErr, setPinErr] = useState("");
  const [patient, setPatient] = useState(null);
  const [toast, setToast] = useState("");
  const [uploading, setUploading] = useState(false);
  const [reqMsg, setReqMsg] = useState("");
  const [reqSent, setReqSent] = useState(false);
  const [reqLoading, setReqLoading] = useState(false);
  const [tab, setTab] = useState("karne");
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [orderSent, setOrderSent] = useState(false);
  const [orderLoading, setOrderLoading] = useState(false);
  const fileInputRef = useRef(null);
  const verifiedPin = useRef(null);

  const flash = (msg) => { setToast(msg); setTimeout(() => setToast(""), 2400); };

  async function fetchPatient(withPin) {
    const { data, error } = await supabase.rpc("get_patient_by_slug", {
      p_slug: slug,
      p_pin: withPin ?? null,
    });
    if (error || !data) { setStatus("not_found"); return; }
    if (data.status === "not_found") { setStatus("not_found"); return; }
    if (data.status === "pin_required") { setStatus("pin_required"); return; }
    verifiedPin.current = withPin ?? null;
    setPatient(data.patient);
    setStatus("ok");
  }

  useEffect(() => { fetchPatient(); /* eslint-disable-next-line */ }, [slug]);

  useEffect(() => {
    if (status !== "ok") return;
    (async () => {
      const { data } = await supabase.from("products").select("*").eq("active", true).order("created_at", { ascending: false });
      setProducts(data || []);
    })();
  }, [status]);

  async function submitPin() {
    setPinErr("");
    if (pin.trim().length === 0) { setPinErr("Lütfen PIN girin."); return; }
    const { data } = await supabase.rpc("get_patient_by_slug", { p_slug: slug, p_pin: pin.trim() });
    if (data?.status === "ok") { verifiedPin.current = pin.trim(); setPatient(data.patient); setStatus("ok"); }
    else setPinErr("PIN hatalı, tekrar deneyin.");
  }

  async function handlePhoto(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const path = `${slug}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("pet-photos").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("pet-photos").getPublicUrl(path);
      const { data, error } = await supabase.rpc("update_patient_photo", {
        p_slug: slug, p_pin: verifiedPin.current, p_photo_url: pub.publicUrl,
      });
      if (error || data?.status !== "ok") throw error || new Error("update failed");
      setPatient((p) => ({ ...p, photo_url: pub.publicUrl }));
      flash("Fotoğraf güncellendi.");
    } catch (err) {
      flash("Fotoğraf yüklenemedi, tekrar deneyin.");
    } finally {
      setUploading(false);
    }
  }

  async function submitAppointment() {
    setReqLoading(true);
    const { data, error } = await supabase.rpc("submit_appointment_request", {
      p_slug: slug, p_pin: verifiedPin.current, p_message: reqMsg.trim() || null,
    });
    setReqLoading(false);
    if (!error && data?.status === "ok") { setReqSent(true); flash("Randevu talebiniz iletildi."); }
    else flash("Talep gönderilemedi, tekrar deneyin.");
  }

  function addToCart(product) {
    setCart((c) => {
      const existing = c.find((i) => i.product_id === product.id);
      if (existing) return c.map((i) => i.product_id === product.id ? { ...i, qty: i.qty + 1 } : i);
      return [...c, { product_id: product.id, name: product.name, price: product.price, qty: 1 }];
    });
    flash(`${product.name} sepete eklendi.`);
  }
  function changeQty(productId, delta) {
    setCart((c) => c.map((i) => i.product_id === productId ? { ...i, qty: Math.max(1, i.qty + delta) } : i).filter((i) => i.qty > 0));
  }
  function removeFromCart(productId) {
    setCart((c) => c.filter((i) => i.product_id !== productId));
  }
  const cartTotal = cart.reduce((s, i) => s + i.price * i.qty, 0);

  async function submitOrder() {
    setOrderLoading(true);
    const { data, error } = await supabase.rpc("submit_order", {
      p_slug: slug, p_pin: verifiedPin.current,
      p_items: cart.map((i) => ({ product_id: i.product_id, qty: i.qty })),
    });
    setOrderLoading(false);
    if (!error && data?.status === "ok") { setOrderSent(true); setCart([]); flash("Siparişiniz alındı."); }
    else flash("Sipariş gönderilemedi, tekrar deneyin.");
  }

  if (status === "loading") return <CenterMsg><div className="spinner" /></CenterMsg>;
  if (status === "not_found") {
    return (
      <CenterMsg>
        <AlertTriangle size={32} color="var(--red)" />
        <p style={{ marginTop: 12, fontWeight: 600 }}>Bu bağlantı geçersiz veya kaldırılmış.</p>
        <p style={{ fontSize: 13, color: "rgba(42,36,28,0.6)" }}>Lütfen kliniğimizle iletişime geçin.</p>
      </CenterMsg>
    );
  }
  if (status === "pin_required") {
    return (
      <CenterMsg>
        <div className="card" style={{ padding: 28, width: 320, textAlign: "left" }}>
          <div style={{ width: 44, height: 44, borderRadius: 999, background: "var(--navy)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
            <Lock size={18} color="var(--cream)" />
          </div>
          <h2 className="font-display" style={{ fontSize: 22, margin: "0 0 4px" }}>PIN Gerekli</h2>
          <p style={{ fontSize: 13, color: "rgba(42,36,28,0.6)", marginBottom: 16 }}>Kliniğimizin verdiği PIN kodunu girin.</p>
          <input className="input" inputMode="numeric" placeholder="••••" value={pin}
            onChange={(e) => setPin(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submitPin()} />
          {pinErr && <div style={{ color: "var(--red)", fontSize: 13, marginTop: 8 }}>{pinErr}</div>}
          <button className="btn btn-primary" style={{ width: "100%", marginTop: 14 }} onClick={submitPin}>Görüntüle</button>
        </div>
      </CenterMsg>
    );
  }

  const all = patient.vaccines || [];
  const planned = all.filter((v) => !v.administered_date).sort((a, b) => new Date(a.planned_date) - new Date(b.planned_date));
  const done = all.filter((v) => v.administered_date).sort((a, b) => new Date(b.administered_date) - new Date(a.administered_date));
  const soonest = planned[0];
  const info = VACCINE_INFO[patient.species] || null;
  const cartCount = cart.reduce((s, i) => s + i.qty, 0);

  return (
    <div style={{ minHeight: "100vh", paddingBottom: 40 }}>
      {toast && (
        <div style={{ position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)", zIndex: 50, background: "var(--navy)", color: "var(--cream)", padding: "8px 16px", borderRadius: 999, fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
          <Check size={14} /> {toast}
        </div>
      )}
      <header style={{ background: "var(--navy)", padding: "16px 20px", display: "flex", alignItems: "center", gap: 10 }}>
        <img src="/logo.png" alt="Pati Kapım" style={{ width: 30, height: 30, objectFit: "contain" }} />
        <span className="font-display" style={{ color: "var(--cream)", fontSize: 18 }}>Pati Kapım · Aşı Karnesi</span>
      </header>

      <div className="container" style={{ paddingTop: 20 }}>
        <div className="card" style={{ padding: 22, marginBottom: 18, position: "relative" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ position: "relative" }}>
              <div style={{ width: 64, height: 64, borderRadius: 999, background: "var(--navy)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                {patient.photo_url
                  ? <img src={patient.photo_url} alt={patient.pet_name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : <SpeciesIcon species={patient.species} size={28} color="var(--cream)" />}
              </div>
              <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
                style={{ position: "absolute", bottom: -2, right: -2, width: 24, height: 24, borderRadius: 999, background: "var(--gold)", border: "2px solid var(--paper)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                <Camera size={12} color="var(--navy)" />
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handlePhoto} />
            </div>
            <div>
              <h1 className="font-display" style={{ fontSize: 24, margin: 0 }}>{patient.pet_name}</h1>
              <p style={{ fontSize: 13, color: "rgba(42,36,28,0.6)", margin: "2px 0 0" }}>
                {patient.species}{patient.breed ? ` · ${patient.breed}` : ""}{patient.gender ? ` · ${patient.gender}` : ""}
              </p>
            </div>
          </div>
          {patient.owner_name && (
            <div style={{ marginTop: 14, fontSize: 12, color: "rgba(42,36,28,0.5)" }}>
              Sahip: <span style={{ fontWeight: 600, color: "var(--ink)" }}>{patient.owner_name}</span>
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 4, marginBottom: 18, background: "var(--paper)", padding: 4, borderRadius: 12, border: "1px solid rgba(20,40,60,0.1)" }}>
          <button onClick={() => setTab("karne")} className="btn" style={{ flex: 1, background: tab === "karne" ? "var(--navy)" : "transparent", color: tab === "karne" ? "var(--cream)" : "var(--ink)", padding: "9px", fontSize: 12 }}>
            <PawPrint size={13} /> Karne
          </button>
          <button onClick={() => setTab("bilgi")} className="btn" style={{ flex: 1, background: tab === "bilgi" ? "var(--navy)" : "transparent", color: tab === "bilgi" ? "var(--cream)" : "var(--ink)", padding: "9px", fontSize: 12 }}>
            <BookOpen size={13} /> Bilgi
          </button>
          <button onClick={() => setTab("magaza")} className="btn" style={{ flex: 1, background: tab === "magaza" ? "var(--navy)" : "transparent", color: tab === "magaza" ? "var(--cream)" : "var(--ink)", padding: "9px", fontSize: 12, position: "relative" }}>
            <ShoppingBag size={13} /> Mağaza
            {cartCount > 0 && (
              <span style={{ position: "absolute", top: 2, right: 8, background: "var(--gold)", color: "var(--navy)", fontSize: 9, fontWeight: 700, borderRadius: 999, minWidth: 14, height: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>{cartCount}</span>
            )}
          </button>
        </div>

        {tab === "karne" && (
          <>
            {soonest && (() => {
              const st = vaccineStatus(soonest);
              const c = STATUS_COLOR[st];
              const d = daysUntil(soonest.planned_date);
              return (
                <div className="card" style={{ padding: 16, marginBottom: 18, background: c.bg, borderColor: c.border, display: "flex", gap: 12, alignItems: "center" }}>
                  {st === "overdue" ? <AlertTriangle size={20} color={c.text} /> : <Calendar size={20} color={c.text} />}
                  <div style={{ fontSize: 13 }}>
                    <div style={{ fontWeight: 700, color: c.text }}>{soonest.name} · {fmtDate(soonest.planned_date)}</div>
                    <div style={{ color: "rgba(42,36,28,0.6)" }}>{st === "overdue" ? `${Math.abs(d)} gün gecikti` : `${d} gün kaldı`}</div>
                  </div>
                </div>
              );
            })()}

            {planned.length > 0 && (
              <>
                <div className="font-mono" style={{ fontSize: 12, letterSpacing: 1, textTransform: "uppercase", color: "rgba(42,36,28,0.5)", marginBottom: 10 }}>
                  Planlanan Aşılar
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
                  {planned.map((v) => {
                    const st = vaccineStatus(v);
                    return (
                      <div key={v.id} className="card" style={{ padding: 12, display: "flex", gap: 12, alignItems: "flex-start", background: "white" }}>
                        <div className="stamp" style={{ borderStyle: "dashed", borderColor: STATUS_COLOR[st].text, color: STATUS_COLOR[st].text }}>
                          <span className="font-mono" style={{ fontSize: 12, fontWeight: 700, lineHeight: 1 }}>{stampParts(v.planned_date).d}</span>
                          <span className="font-mono" style={{ fontSize: 9, lineHeight: 1 }}>{stampParts(v.planned_date).m}</span>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                            <span style={{ fontWeight: 700, fontSize: 14 }}>{v.name}</span>
                            <span className="badge" style={{ background: STATUS_COLOR[st].bg, borderColor: STATUS_COLOR[st].border, color: STATUS_COLOR[st].text }}>
                              {st === "overdue" ? <AlertTriangle size={11} /> : <Calendar size={11} />} {STATUS_LABEL[st]}
                            </span>
                          </div>
                          <div style={{ fontSize: 12, color: "rgba(42,36,28,0.55)", margin: "3px 0" }}>{fmtDate(v.planned_date)}</div>
                          {v.notes && <div style={{ fontSize: 12, color: "rgba(42,36,28,0.45)", marginTop: 4, fontStyle: "italic" }}>{v.notes}</div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            <div className="font-mono" style={{ fontSize: 12, letterSpacing: 1, textTransform: "uppercase", color: "rgba(42,36,28,0.5)", marginBottom: 10 }}>
              Aşı Geçmişi
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
              {done.length === 0 && <div style={{ fontSize: 13, color: "rgba(42,36,28,0.4)", textAlign: "center", padding: "24px 0" }}>Henüz uygulanmış aşı yok.</div>}
              {done.map((v, i) => (
                <div key={v.id} className="card" style={{ padding: 12, display: "flex", gap: 12, alignItems: "flex-start", background: "white" }}>
                  <div className="stamp" style={{ transform: `rotate(${((i % 3) - 1) * 4}deg)` }}>
                    <span className="font-mono" style={{ fontSize: 12, fontWeight: 700, lineHeight: 1 }}>{stampParts(v.administered_date).d}</span>
                    <span className="font-mono" style={{ fontSize: 9, lineHeight: 1 }}>{stampParts(v.administered_date).m}</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 700, fontSize: 14 }}>{v.name}</span>
                      <span className="badge" style={{ background: "#5C7A661A", borderColor: "#5C7A664D", color: "#3F5A4C" }}>
                        <Check size={11} /> Yapıldı
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: "rgba(42,36,28,0.55)", margin: "3px 0" }}>{fmtDate(v.administered_date)}</div>
                    {v.notes && <div style={{ fontSize: 12, color: "rgba(42,36,28,0.45)", marginTop: 4, fontStyle: "italic" }}>{v.notes}</div>}
                  </div>
                </div>
              ))}
            </div>

            <div className="card" style={{ padding: 18 }}>
              {reqSent ? (
                <div style={{ textAlign: "center", padding: "8px 0", color: "var(--green)", fontWeight: 600, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                  <Check size={16} /> Randevu talebiniz alındı, sizinle iletişime geçilecek.
                </div>
              ) : (
                <>
                  <div className="font-mono" style={{ fontSize: 12, letterSpacing: 1, textTransform: "uppercase", color: "rgba(42,36,28,0.5)", marginBottom: 8 }}>
                    Randevu Talep Et
                  </div>
                  <textarea className="input" rows={2} placeholder="Not (opsiyonel)" value={reqMsg} onChange={(e) => setReqMsg(e.target.value)} style={{ marginBottom: 10, resize: "vertical" }} />
                  <button className="btn btn-gold" style={{ width: "100%" }} onClick={submitAppointment} disabled={reqLoading}>
                    <Send size={15} /> {reqLoading ? "Gönderiliyor…" : "Randevu Talep Et"}
                  </button>
                </>
              )}
            </div>
          </>
        )}

        {tab === "bilgi" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {!info && (
              <div style={{ fontSize: 13, color: "rgba(42,36,28,0.5)", textAlign: "center", padding: "24px 0" }}>
                Bu tür için henüz bilgilendirme içeriği eklenmedi.
              </div>
            )}
            {info && info.map((item) => (
              <div key={item.title} className="card" style={{ padding: 14, background: "white", display: "flex", gap: 12, alignItems: "flex-start" }}>
                <div style={{ width: 30, height: 30, borderRadius: 999, background: "var(--navy)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Info size={14} color="var(--cream)" />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{item.title}</div>
                  <div style={{ fontSize: 13, color: "rgba(42,36,28,0.65)", marginTop: 2, lineHeight: 1.4 }}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "magaza" && (
          <div>
            {orderSent ? (
              <div className="card" style={{ padding: 24, textAlign: "center" }}>
                <Check size={28} color="var(--green)" style={{ marginBottom: 8 }} />
                <div style={{ fontWeight: 700 }}>Siparişiniz alındı!</div>
                <div style={{ fontSize: 13, color: "rgba(42,36,28,0.6)", marginTop: 4 }}>Kliniğimiz en kısa sürede sizinle iletişime geçecek.</div>
                <button className="btn btn-outline" style={{ marginTop: 14 }} onClick={() => setOrderSent(false)}>Yeni Sipariş</button>
              </div>
            ) : (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 18 }}>
                  {products.length === 0 && (
                    <div style={{ gridColumn: "1 / -1", fontSize: 13, color: "rgba(42,36,28,0.4)", textAlign: "center", padding: "24px 0" }}>
                      Şu anda mağazada ürün yok.
                    </div>
                  )}
                  {products.map((p) => (
                    <div key={p.id} className="card" style={{ overflow: "hidden", background: "white" }}>
                      <div style={{ width: "100%", aspectRatio: "1", background: "var(--paper)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {p.photo_url
                          ? <img src={p.photo_url} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          : <ShoppingBag size={26} color="rgba(20,40,60,0.25)" />}
                      </div>
                      <div style={{ padding: 10 }}>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>{p.name}</div>
                        {p.description && <div style={{ fontSize: 11, color: "rgba(42,36,28,0.55)", margin: "2px 0 6px", lineHeight: 1.3 }}>{p.description}</div>}
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 6 }}>
                          <span className="font-mono" style={{ fontWeight: 700, fontSize: 13 }}>{fmtPrice(p.price)}</span>
                          <button className="btn btn-gold" style={{ padding: "5px 9px", fontSize: 11 }} onClick={() => addToCart(p)}>
                            <Plus size={12} /> Ekle
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {cart.length > 0 && (
                  <div className="card" style={{ padding: 16 }}>
                    <div className="font-mono" style={{ fontSize: 12, letterSpacing: 1, textTransform: "uppercase", color: "rgba(42,36,28,0.5)", marginBottom: 10 }}>Sepetim</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
                      {cart.map((i) => (
                        <div key={i.product_id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ flex: 1, fontSize: 13 }}>{i.name}</span>
                          <button onClick={() => changeQty(i.product_id, -1)} className="btn btn-outline" style={{ padding: "2px 7px" }}><Minus size={11} /></button>
                          <span className="font-mono" style={{ fontSize: 12, minWidth: 16, textAlign: "center" }}>{i.qty}</span>
                          <button onClick={() => changeQty(i.product_id, 1)} className="btn btn-outline" style={{ padding: "2px 7px" }}><Plus size={11} /></button>
                          <span className="font-mono" style={{ fontSize: 12, minWidth: 60, textAlign: "right" }}>{fmtPrice(i.price * i.qty)}</span>
                          <button onClick={() => removeFromCart(i.product_id)} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(42,36,28,0.3)" }}><X size={14} /></button>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, marginBottom: 10, borderTop: "1px solid rgba(20,40,60,0.1)", paddingTop: 10 }}>
                      <span>Toplam</span><span className="font-mono">{fmtPrice(cartTotal)}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "rgba(42,36,28,0.5)", marginBottom: 10 }}>
                      <Banknote size={13} /> Ödeme seçenekleri: Nakit veya EFT — teslimat sırasında.
                    </div>
                    <button className="btn btn-gold" style={{ width: "100%" }} onClick={submitOrder} disabled={orderLoading}>
                      {orderLoading ? "Gönderiliyor…" : "Sipariş Ver"}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        <div style={{ marginTop: 24, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, color: "rgba(42,36,28,0.35)", fontSize: 11 }}>
          <ShieldAlert size={12} /> Bu bağlantıyı yalnızca güvendiğiniz kişilerle paylaşın.
        </div>
      </div>
    </div>
  );
}

function CenterMsg({ children }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, textAlign: "center" }}>
      {children}
    </div>
  );
}
