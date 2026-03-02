import { useState } from "react";
import { useApp } from "../../context/AppContext";
import { Stat } from "../shared/index";
import { FILE_CATEGORIES } from "../../data/constants";
import { genId, timeAgo } from "../../utils/helpers";

export default function FilesView() {
  const { myFiles, activeClinicId, setClinics, showT, browserNotify, openPatient, leads, t } = useApp();
  const [selFile, setSelFile] = useState(null);
  const [catFilter, setCatFilter] = useState("all");
  const [zoom, setZoom] = useState(1);

  const cats = Object.entries(FILE_CATEGORIES);
  const filtered = catFilter === "all" ? myFiles : myFiles.filter(f => f.category === catFilter);

  const deleteFile = (fid) => {
    setClinics(cs => cs.map(c => c.id === activeClinicId ? { ...c, files: c.files.filter(f => f.id !== fid) } : c));
    if (selFile?.id === fid) setSelFile(null);
    showT("File deleted");
  };

  const shareFile = (f) => {
    const link = `https://flowmatix.io/files/${activeClinicId}/${f.id}`;
    navigator.clipboard?.writeText(link);
    showT("Share link copied");
  };

  const findPatientByName = (name) => leads.find(l => l.name === name);

  return <div style={{ padding: 28, maxWidth: selFile ? 1200 : 900, display: "flex", gap: 20 }}>
    {/* Main file list */}
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>{t("files")}</h1>
        <label style={{ padding: "8px 16px", borderRadius: 10, background: "rgba(76,201,255,0.1)", border: "1px solid rgba(76,201,255,0.25)", color: "#4cc9ff", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6 }}>
          📤 {t("upload_file")}
          <input id="fileUpload" name="fileUpload" type="file" multiple accept="image/*,.pdf" style={{ display: "none" }} onChange={e => {
            const files = Array.from(e.target.files || []);
            if (!files.length) return;
            const newFiles = files.map(f => {
              const isImg = f.type.startsWith("image");
              return { id: genId(), name: f.name, patient: "Manual Upload", type: isImg ? "image" : "pdf", size: `${(f.size / 1024).toFixed(0)} KB`, uploaded: new Date().toISOString(), category: isImg ? "photos" : "documents" };
            });
            setClinics(cs => cs.map(c => c.id === activeClinicId ? { ...c, files: [...newFiles, ...c.files] } : c));
            showT(`${files.length} file(s) uploaded`);
            browserNotify("Files Uploaded", `${files.length} file(s) added`);
            e.target.value = "";
          }} />
        </label>
      </div>
      <p style={{ fontSize: 14, color: "rgba(167,177,195,0.6)", margin: "0 0 20px" }}>Patient photos, documents & invoices.</p>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 20 }}>
        <Stat label="Total" value={myFiles.length} color="#4cc9ff" />
        {cats.map(([k, v]) => <Stat key={k} label={v.label} value={myFiles.filter(f => f.category === k).length} color={v.color} />)}
      </div>

      {/* Category filter tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        <button onClick={() => setCatFilter("all")} style={{ padding: "6px 12px", borderRadius: 8, background: catFilter === "all" ? "rgba(76,201,255,0.12)" : "rgba(255,255,255,0.04)", border: `1px solid ${catFilter === "all" ? "rgba(76,201,255,0.25)" : "rgba(255,255,255,0.08)"}`, color: catFilter === "all" ? "#4cc9ff" : "rgba(167,177,195,0.6)", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>{t("all_files")}</button>
        {cats.map(([k, v]) => <button key={k} onClick={() => setCatFilter(k)} style={{ padding: "6px 12px", borderRadius: 8, background: catFilter === k ? `${v.color}18` : "rgba(255,255,255,0.04)", border: `1px solid ${catFilter === k ? `${v.color}40` : "rgba(255,255,255,0.08)"}`, color: catFilter === k ? v.color : "rgba(167,177,195,0.6)", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4 }}>
          {v.icon} {v.label}
        </button>)}
      </div>

      {/* File table header */}
      <div style={{ display: "grid", gridTemplateColumns: "3fr 1.2fr 0.8fr 0.8fr auto", gap: 8, marginBottom: 8, fontSize: 11, fontWeight: 700, color: "rgba(167,177,195,0.4)", textTransform: "uppercase", padding: "0 16px" }}>
        <div>Name</div><div>Patient</div><div>Category</div><div>Size</div><div>Actions</div>
      </div>

      {filtered.map(f => {
        const cat = FILE_CATEGORIES[f.category];
        const isSelected = selFile?.id === f.id;
        return <div key={f.id} onClick={() => { setSelFile(f); setZoom(1); }} style={{ display: "grid", gridTemplateColumns: "3fr 1.2fr 0.8fr 0.8fr auto", gap: 8, padding: "12px 16px", borderRadius: 12, background: isSelected ? "rgba(76,201,255,0.06)" : "rgba(255,255,255,0.02)", border: `1px solid ${isSelected ? "rgba(76,201,255,0.2)" : "rgba(255,255,255,0.06)"}`, marginBottom: 6, alignItems: "center", fontSize: 13, cursor: "pointer", transition: "all .15s" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 18 }}>{f.type === "image" ? "📷" : "📄"}</span>
            <div>
              <div style={{ fontWeight: 600 }}>{f.name}</div>
              <div style={{ fontSize: 11, color: "rgba(167,177,195,0.4)" }}>{timeAgo(f.uploaded)}</div>
            </div>
          </div>
          <div style={{ fontSize: 12, color: "rgba(167,177,195,0.6)" }}>{f.patient}</div>
          <div>{cat && <span style={{ padding: "2px 8px", borderRadius: 5, fontSize: 10, fontWeight: 700, background: `${cat.color}15`, color: cat.color }}>{cat.icon} {cat.label}</span>}</div>
          <div style={{ fontSize: 12, color: "rgba(167,177,195,0.5)" }}>{f.size}</div>
          <div style={{ display: "flex", gap: 4 }} onClick={e => e.stopPropagation()}>
            <button onClick={() => shareFile(f)} title="Share" style={{ padding: "4px 6px", borderRadius: 5, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(167,177,195,0.5)", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>🔗</button>
            <button onClick={() => deleteFile(f.id)} title="Delete" style={{ padding: "4px 6px", borderRadius: 5, background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.12)", color: "#ef4444", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>✕</button>
          </div>
        </div>;
      })}
      {filtered.length === 0 && <div style={{ textAlign: "center", padding: 40, color: "rgba(167,177,195,0.4)" }}>No files in this category.</div>}
    </div>

    {/* Preview Panel */}
    {selFile && <div style={{ width: 340, flexShrink: 0, padding: 20, borderRadius: 16, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", alignSelf: "flex-start", position: "sticky", top: 28 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#4cc9ff", textTransform: "uppercase", letterSpacing: "0.5px" }}>{t("file_preview")}</span>
        <button onClick={() => setSelFile(null)} style={{ background: "rgba(255,255,255,0.06)", border: "none", color: "rgba(167,177,195,0.7)", width: 24, height: 24, borderRadius: 6, cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
      </div>

      {/* Preview area */}
      <div style={{ width: "100%", height: 220, borderRadius: 12, background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16, overflow: "hidden", cursor: selFile.type === "image" ? "zoom-in" : "default" }} onClick={() => { if (selFile.type === "image") setZoom(z => z >= 3 ? 1 : z + 0.5); }}>
        {selFile.type === "image"
          ? <div style={{ fontSize: 60 + zoom * 20, transition: "font-size .2s", userSelect: "none" }}>📷</div>
          : <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 48, marginBottom: 8 }}>📄</div>
              <div style={{ fontSize: 11, color: "rgba(167,177,195,0.4)" }}>PDF Document</div>
            </div>}
      </div>
      {selFile.type === "image" && <div style={{ display: "flex", gap: 6, justifyContent: "center", marginBottom: 14 }}>
        <button onClick={() => setZoom(z => Math.max(0.5, z - 0.5))} style={{ padding: "4px 10px", borderRadius: 6, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(167,177,195,0.6)", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>−</button>
        <span style={{ fontSize: 11, color: "rgba(167,177,195,0.4)", padding: "4px 8px" }}>{Math.round(zoom * 100)}%</span>
        <button onClick={() => setZoom(z => Math.min(3, z + 0.5))} style={{ padding: "4px 10px", borderRadius: 6, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(167,177,195,0.6)", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>+</button>
      </div>}

      {/* Metadata */}
      <div style={{ display: "grid", gap: 10, fontSize: 13 }}>
        <div><div style={{ fontSize: 10, fontWeight: 700, color: "rgba(167,177,195,0.4)", textTransform: "uppercase", marginBottom: 2 }}>Filename</div><div style={{ fontWeight: 600, wordBreak: "break-all" }}>{selFile.name}</div></div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div><div style={{ fontSize: 10, fontWeight: 700, color: "rgba(167,177,195,0.4)", textTransform: "uppercase", marginBottom: 2 }}>Size</div><div>{selFile.size}</div></div>
          <div><div style={{ fontSize: 10, fontWeight: 700, color: "rgba(167,177,195,0.4)", textTransform: "uppercase", marginBottom: 2 }}>Type</div><div>{selFile.type === "image" ? "Image" : "PDF"}</div></div>
        </div>
        <div><div style={{ fontSize: 10, fontWeight: 700, color: "rgba(167,177,195,0.4)", textTransform: "uppercase", marginBottom: 2 }}>Patient</div><div>{selFile.patient}</div></div>
        {selFile.category && <div><div style={{ fontSize: 10, fontWeight: 700, color: "rgba(167,177,195,0.4)", textTransform: "uppercase", marginBottom: 2 }}>Category</div><div>{FILE_CATEGORIES[selFile.category]?.icon} {FILE_CATEGORIES[selFile.category]?.label}</div></div>}
        {selFile.source && <div><div style={{ fontSize: 10, fontWeight: 700, color: "rgba(167,177,195,0.4)", textTransform: "uppercase", marginBottom: 2 }}>Source</div><div style={{ display: "flex", alignItems: "center", gap: 4 }}>{selFile.source === "whatsapp" ? "💬 WhatsApp Auto-Upload" : "📤 Manual Upload"}</div></div>}
        <div><div style={{ fontSize: 10, fontWeight: 700, color: "rgba(167,177,195,0.4)", textTransform: "uppercase", marginBottom: 2 }}>Uploaded</div><div>{timeAgo(selFile.uploaded)}</div></div>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 16 }}>
        <button onClick={() => showT("Download started")} style={{ width: "100%", padding: "8px 14px", borderRadius: 8, background: "rgba(76,201,255,0.08)", border: "1px solid rgba(76,201,255,0.15)", color: "#4cc9ff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>📥 {t("download")}</button>
        {selFile.patient && selFile.patient !== "Manual Upload" && (() => {
          const p = findPatientByName(selFile.patient);
          return p ? <button onClick={() => openPatient(p.id)} style={{ width: "100%", padding: "8px 14px", borderRadius: 8, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(167,177,195,0.7)", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>👤 {t("open_patient")}</button> : null;
        })()}
        <button onClick={() => shareFile(selFile)} style={{ width: "100%", padding: "8px 14px", borderRadius: 8, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(167,177,195,0.7)", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>🔗 {t("share_link")}</button>
        <button onClick={() => deleteFile(selFile.id)} style={{ width: "100%", padding: "8px 14px", borderRadius: 8, background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.12)", color: "#ef4444", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>🗑 {t("delete_file")}</button>
      </div>
    </div>}
  </div>;
}
