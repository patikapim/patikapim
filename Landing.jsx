import React from "react";
import { PawPrint, Link2 } from "lucide-react";

export default function Landing() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div className="container" style={{ textAlign: "center" }}>
        <img src="/logo.png" alt="Pati Kapım" style={{ width: 140, height: 140, objectFit: "contain", margin: "0 auto 20px" }} />
        <h1 className="font-display" style={{ fontSize: 32, margin: "0 0 8px" }}>Pati Kapım · Aşı Karnesi</h1>
        <p style={{ color: "rgba(42,36,28,0.65)", fontSize: 15, marginBottom: 28 }}>
          Dostunuzun aşı geçmişini görüntülemek için size özel olarak paylaşılan bağlantıyı kullanın.
        </p>
        <div className="card" style={{ padding: 22, display: "inline-flex", alignItems: "center", gap: 12, textAlign: "left" }}>
          <div style={{ width: 40, height: 40, borderRadius: 999, background: "var(--navy)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Link2 size={18} color="var(--cream)" />
          </div>
          <div style={{ fontSize: 13, color: "rgba(42,36,28,0.7)", maxWidth: 320 }}>
            Kliniğimiz her hasta için size özel bir bağlantı gönderir. Bağlantınız yoksa lütfen kliniğimizle iletişime geçin.
          </div>
        </div>
        <div style={{ marginTop: 32, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, color: "rgba(42,36,28,0.4)", fontSize: 12 }}>
          <PawPrint size={13} /> Seviyoruz, özen gösteriyoruz.
        </div>
      </div>
    </div>
  );
}
