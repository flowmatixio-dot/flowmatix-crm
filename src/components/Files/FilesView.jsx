import { API_URL } from "../../api/client";
import { useState, useEffect, useCallback } from "react";
import { useApp } from "../../context/AppContext";
import { Stat } from "../shared/index";
import { FILE_CATEGORIES } from "../../data/constants";
import { genId, timeAgo } from "../../utils/helpers";
import { getDriveStatus, getDriveFiles, uploadToDrive, deleteDriveFile, isAuthenticated } from "../../api/client";

const CAT_COLORS = {
  photos: "#a78bfa",
  documents: "#4cc9ff",
  invoices: "#10b981",
  logistics: "#f59e0b",
  blood_test: "#ef4444",
};

function getPatientDisplay(file, leads) {
  const name = file.patient_name || file.patient;
  if (!name || name === "Unknown" || name === "unknown" || name === "Unbekannt") {
    return { name: null, phone: file.phone || file.from || null };
  }
  // Try to find lead for phone number
  const lead = leads?.find(l => l.name === name);
  return { name, phone: lead?.phone || file.phone || file.from || null };
}

function detectCategory(file) {
  const name = (file.name || "").toLowerCase();
  const type = file.type || "";
  if (type.startsWith("image") || name.match(/\.(jpg|jpeg|png|gif|webp|heic)$/)) return "photos";
  if (name.includes("rechnung") || name.includes("invoice")) return "invoices";
  if (name.includes("flug") || name.includes("flight") || name.includes("ticket")) return "logistics";
  return "documents";
}

export default function FilesView() {
  const { myFiles, activeClinicId, setClinics, showT, browserNotify, openPatient, leads, t, clinic } = useApp();
  const [selFile, setSelFile] = useState(null);
  const [catFilter, setCatFilter] = useState("all");
  const [zoom, setZoom] = useState(1);
  const [driveStatus, setDriveStatus] = useState(null);
  const [apiFiles, setApiFiles] = useState(null);
  const [apiLoading, setApiLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [hoverThumb, setHoverThumb] = useState(null);

  const orgId = clinic?.orgId || clinic?.id;
  const isLive = isAuthenticated() && orgId;

  useEffect(() => {
    if (!isLive) return;
    getDriveStatus(orgId).then(setDriveStatus).catch(() => {});
    setApiLoading(true);
    getDriveFiles({ orgId }).then(data => { setApiFiles(data.files || []); setApiLoading(false); }).catch(() => setApiLoading(false));
  }, [orgId, isLive]);

  const displayFiles = isLive && apiFiles ? apiFiles.map(f => ({
    id: f.id,
    name: f.file_name,
    patient: f.patient_name || null,
    patient_name: f.patient_name || null,
    phone: f.patient_phone || null,
    type: f.mime_type?.startsWith("image") ? "image" : "pdf",
    size: f.file_size ? `${Math.round(f.file_size / 1024)} KB` : "—",
    uploaded: f.created_at,
    category: f.category === "photo" ? "photos" : f.category === "document" ? "documents" : f.category || "documents",
    source: f.source,
    driveLink: f.google_drive_link,
    driveFileId: f.google_drive_file_id,
    thumbnailUrl: f.thumbnail_url || (f.mime_type?.startsWith("image") ? f.google_drive_link : null),
  })) : myFiles;

  const cats = Object.entries(FILE_CATEGORIES);
  const filtered = catFilter === "all" ? displayFiles : displayFiles.filter(f => f.category === catFilter);

  const deleteFile = async (fid) => {
    if (isLive) {
      try {
        await deleteDriveFile(fid);
        setApiFiles(prev => prev.filter(f => f.id !== fid));
        showT(t("file_deleted") || "Datei gelöscht");
      } catch { showT(t("delete_failed") || "Löschen fehlgeschlagen"); }
    } else {
      setClinics(cs => cs.map(c => c.id === activeClinicId ? { ...c, files: c.files.filter(f => f.id !== fid) } : c));
      showT(t("file_deleted") || "Datei gelöscht");
    }
    if (selFile?.id === fid) setSelFile(null);
  };

  const shareFile = (f) => {
    const link = f.driveLink || `${API_URL}/files/${activeClinicId}/${f.id}`;
    navigator.clipboard?.writeText(link);
    showT(t("share_link_copied") || "Link kopiert");
  };

  const findPatientByName = (name) => leads.find(l => l.name === name);

  const handleUpload = useCallback(async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    setUploadProgress(0);

    if (isLive) {
      for (let i = 0; i < files.length; i++) {
        setUploadProgress(Math.round(((i) / files.length) * 100));
        try {
          const result = await uploadToDrive(files[i]);
          if (result.file) setApiFiles(prev => [result.file, ...(prev || [])]);
        } catch { showT(t("upload_failed") || "Upload fehlgeschlagen"); }
      }
      setUploadProgress(100);
      showT(`${files.length} ${t("files_uploaded") || "Dateien hochgeladen"}`);
    } else {
      const newFiles = files.map(f => {
        const isImg = f.type.startsWith("image");
        const cat = detectCategory({ name: f.name, type: f.type });
        return { id: genId(), name: f.name, patient: null, type: isImg ? "image" : "pdf", size: `${(f.size / 1024).toFixed(0)} KB`, uploaded: new Date().toISOString(), category: cat };
      });
      setClinics(cs => cs.map(c => c.id === activeClinicId ? { ...c, files: [...newFiles, ...c.files] } : c));
      setUploadProgress(100);
      showT(`${files.length} ${t("files_uploaded") || "Dateien hochgeladen"}`);
    }
    browserNotify(t("files_uploaded_title") || "Dateien", `${files.length} ${t("files_added") || "hinzugefügt"}`);
    setTimeout(() => { setUploading(false); setUploadProgress(0); }, 1500);
    e.target.value = "";
  }, [isLive, orgId]);

  return <div style={{ padding: 28, maxWidth: selFile ? 1200 : 900, display: "flex", gap: 20 }}>
    {/* Main file list */}
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>{t("files") || "Dateien"}</h1>
        <label style={{ padding: "8px 16px", borderRadius: 10, background: uploading ? "rgba(16,185,129,0.1)" : "rgba(76,201,255,0.1)", border: `1px solid ${uploading ? "rgba(16,185,129,0.25)" : "rgba(76,201,255,0.25)"}`, color: uploading ? "#10b981" : "#4cc9ff", fontWeight: 700, fontSize: 13, cursor: uploading ? "default" : "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6, transition: "all 0.2s" }}>
          {uploading ? `${uploadProgress}%` : "📤"} {uploading ? (t("uploading_progress") || "Wird hochgeladen...") : (t("upload_file") || "Datei hochladen")}
          <input id="fileUpload" name="fileUpload" type="file" multiple accept="image/*,.pdf,.doc,.docx" style={{ display: "none" }} onChange={handleUpload} disabled={uploading} />
        </label>
      </div>
      <p style={{ fontSize: 14, color: "rgba(167,177,195,0.6)", margin: "0 0 20px" }}>{t("files_desc") || "Patientenfotos, Dokumente & Rechnungen."}</p>

      {/* Upload progress bar */}
      {uploading && (
        <div style={{ marginBottom: 16, borderRadius: 8, overflow: "hidden" }}>
          <div style={{ height: 3, background: "rgba(255,255,255,0.04)", borderRadius: 3 }}>
            <div style={{ height: 3, borderRadius: 3, background: "#10b981", width: `${uploadProgress}%`, transition: "width 0.3s ease" }} />
          </div>
        </div>
      )}

      {/* Drive status banner */}
      {isLive && driveStatus && <div style={{ padding: "12px 16px", borderRadius: 12, marginBottom: 16, display: "flex", alignItems: "center", gap: 10, background: driveStatus.connected && driveStatus.hasDriveScope ? "rgba(16,185,129,0.04)" : "rgba(255,138,42,0.04)", border: `1px solid ${driveStatus.connected && driveStatus.hasDriveScope ? "rgba(16,185,129,0.15)" : "rgba(255,138,42,0.15)"}` }}>
        <span style={{ fontSize: 18 }}>{driveStatus.connected && driveStatus.hasDriveScope ? "📁" : "☁️"}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: driveStatus.connected && driveStatus.hasDriveScope ? "#10b981" : "#ff8a2a" }}>
            {driveStatus.connected && driveStatus.hasDriveScope ? (t("drive_connected") || "Google Drive verbunden") : (t("drive_connect_prompt") || "Google Drive verbinden")}
          </div>
          {driveStatus.connected && driveStatus.hasDriveScope && <div style={{ fontSize: 11, color: "rgba(167,177,195,0.7)", marginTop: 2 }}>{driveStatus.fileCount} {t("files_synced") || "synchronisiert"}</div>}
        </div>
        {driveStatus.connected && driveStatus.hasDriveScope && driveStatus.folderId && <a href={`https://drive.google.com/drive/folders/${driveStatus.folderId}`} target="_blank" rel="noopener noreferrer" style={{ padding: "5px 12px", borderRadius: 7, background: "rgba(76,201,255,0.08)", border: "1px solid rgba(76,201,255,0.15)", color: "#4cc9ff", fontWeight: 700, fontSize: 11, cursor: "pointer", fontFamily: "inherit", textDecoration: "none" }}>{t("open_in_drive") || "In Drive öffnen"}</a>}
      </div>}

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${1 + cats.length},1fr)`, gap: 12, marginBottom: 20 }}>
        <Stat label={t("total") || "Gesamt"} value={displayFiles.length} color="#4cc9ff" />
        {cats.map(([k, v]) => <Stat key={k} label={v.label} value={displayFiles.filter(f => f.category === k).length} color={CAT_COLORS[k] || v.color} />)}
      </div>

      {/* Category filter tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        <button onClick={() => setCatFilter("all")} style={{ padding: "6px 12px", borderRadius: 8, background: catFilter === "all" ? "rgba(76,201,255,0.12)" : "rgba(255,255,255,0.04)", border: `1px solid ${catFilter === "all" ? "rgba(76,201,255,0.25)" : "rgba(255,255,255,0.08)"}`, color: catFilter === "all" ? "#4cc9ff" : "rgba(167,177,195,0.6)", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>{t("all_files") || "Alle"}</button>
        {cats.map(([k, v]) => {
          const color = CAT_COLORS[k] || v.color;
          return <button key={k} onClick={() => setCatFilter(k)} style={{ padding: "6px 12px", borderRadius: 8, background: catFilter === k ? `${color}18` : "rgba(255,255,255,0.04)", border: `1px solid ${catFilter === k ? `${color}40` : "rgba(255,255,255,0.08)"}`, color: catFilter === k ? color : "rgba(167,177,195,0.6)", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4 }}>
            {v.icon} {v.label}
          </button>;
        })}
      </div>

      {/* File table header */}
      <div style={{ display: "grid", gridTemplateColumns: "3fr 1.4fr 0.8fr 0.6fr auto", gap: 8, marginBottom: 8, fontSize: 10, fontWeight: 700, color: "rgba(167,177,195,0.75)", textTransform: "uppercase", letterSpacing: "0.05em", padding: "0 16px" }}>
        <div>{t("file_col") || "Datei"}</div><div>{t("patient_col") || "Patient"}</div><div>{t("category_col") || "Kategorie"}</div><div>{t("size_col") || "Größe"}</div><div>{t("actions_col") || "Aktionen"}</div>
      </div>

      {/* File rows */}
      {filtered.map(f => {
        const cat = FILE_CATEGORIES[f.category];
        const catColor = CAT_COLORS[f.category] || cat?.color || "#4cc9ff";
        const isSelected = selFile?.id === f.id;
        const isPhoto = f.type === "image" || f.category === "photos";
        const pd = getPatientDisplay(f, leads);

        return <div key={f.id} onClick={() => { setSelFile(f); setZoom(1); }} style={{ display: "grid", gridTemplateColumns: "3fr 1.4fr 0.8fr 0.6fr auto", gap: 8, padding: "10px 16px", borderRadius: 10, background: isSelected ? "rgba(76,201,255,0.05)" : "rgba(255,255,255,0.015)", border: `1px solid ${isSelected ? "rgba(76,201,255,0.15)" : "rgba(255,255,255,0.04)"}`, marginBottom: 4, alignItems: "center", fontSize: 13, cursor: "pointer", transition: "all .12s" }}
          onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = "rgba(255,255,255,0.025)"; }}
          onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = "rgba(255,255,255,0.015)"; }}
        >
          {/* File name + thumbnail */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            {isPhoto && f.thumbnailUrl ? (
              <div
                style={{ width: 36, height: 36, borderRadius: 6, overflow: "hidden", flexShrink: 0, background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.06)", position: "relative" }}
                onMouseEnter={(e) => { const r = e.currentTarget.getBoundingClientRect(); setHoverThumb({ url: f.thumbnailUrl, x: r.right + 8, y: r.top }); }}
                onMouseLeave={() => setHoverThumb(null)}
              >
                <img src={f.thumbnailUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => { e.target.style.display = "none"; }} />
              </div>
            ) : (
              <span style={{ fontSize: 20, flexShrink: 0, width: 36, textAlign: "center" }}>{isPhoto ? "📷" : f.category === "invoices" ? "🧾" : f.category === "logistics" ? "✈️" : "📄"}</span>
            )}
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 13 }}>{f.name}</div>
              <div style={{ fontSize: 10, color: "rgba(167,177,195,0.75)" }}>{timeAgo(f.uploaded)}{f.source === "whatsapp" ? " · WhatsApp" : ""}</div>
            </div>
          </div>

          {/* Patient */}
          <div>
            {pd.name ? (
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(232,238,252,0.75)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{pd.name}</div>
                {pd.phone && <div style={{ fontSize: 10, color: "rgba(167,177,195,0.7)" }}>{pd.phone}</div>}
              </div>
            ) : (
              <span style={{ fontSize: 11, color: "rgba(167,177,195,0.65)", fontStyle: "italic" }}>{t("no_patient_assigned") || "Kein Patient zugewiesen"}</span>
            )}
          </div>

          {/* Category badge */}
          <div>
            {cat && <span style={{
              padding: "2px 8px", borderRadius: 5, fontSize: 10, fontWeight: 700,
              background: `${catColor}12`, color: catColor,
              border: `1px solid ${catColor}20`,
            }}>
              {cat.label}
            </span>}
          </div>

          {/* Size */}
          <div style={{ fontSize: 11, color: "rgba(167,177,195,0.6)" }}>{f.size}</div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 3 }} onClick={e => e.stopPropagation()}>
            {f.driveLink && (
              <a href={f.driveLink} target="_blank" rel="noopener noreferrer" title={t("open_in_drive") || "In Drive öffnen"} style={{
                padding: "4px 6px", borderRadius: 5, background: "rgba(16,185,129,0.05)",
                border: "1px solid rgba(16,185,129,0.1)", color: "#10b981", fontSize: 10,
                cursor: "pointer", textDecoration: "none", display: "inline-flex", alignItems: "center",
              }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              </a>
            )}
            <button onClick={() => shareFile(f)} title={t("copy_link") || "Link kopieren"} style={{
              padding: "4px 6px", borderRadius: 5, background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.06)", color: "rgba(167,177,195,0.65)", fontSize: 10,
              cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center",
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>
            </button>
            <button onClick={() => deleteFile(f.id)} title={t("delete_label") || "Löschen"} style={{
              padding: "4px 6px", borderRadius: 5, background: "rgba(239,68,68,0.04)",
              border: "1px solid rgba(239,68,68,0.08)", color: "rgba(239,68,68,0.5)", fontSize: 10,
              cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center",
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
            </button>
          </div>
        </div>;
      })}

      {/* Empty state */}
      {filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: "50px 20px", color: "rgba(167,177,195,0.7)" }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>
            {catFilter === "all" ? (t("no_files_yet") || "Noch keine Dateien vorhanden") : `${t("no_files") || "Keine"} ${FILE_CATEGORIES[catFilter]?.label || (t("files") || "Dateien")} ${t("no_files_in_category") || "in dieser Kategorie"}`}
          </div>
          <div style={{ fontSize: 12, marginTop: 4, color: "rgba(167,177,195,0.6)" }}>
            {t("files_auto_added") || "Dateien werden automatisch hinzugefügt wenn Patienten Fotos oder Dokumente senden"}
          </div>
        </div>
      )}
    </div>

    {/* Thumbnail hover preview */}
    {hoverThumb && (
      <div style={{
        position: "fixed", left: hoverThumb.x, top: hoverThumb.y,
        width: 200, height: 200, borderRadius: 10, overflow: "hidden",
        background: "#0a0e17", border: "1px solid rgba(255,255,255,0.1)",
        boxShadow: "0 12px 40px rgba(0,0,0,0.6)", zIndex: 10000, pointerEvents: "none",
      }}>
        <img src={hoverThumb.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </div>
    )}

    {/* Preview Panel */}
    {selFile && <div style={{ width: 340, flexShrink: 0, padding: 20, borderRadius: 16, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", alignSelf: "flex-start", position: "sticky", top: 28 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(167,177,195,0.6)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{t("preview_label") || "Vorschau"}</span>
        <button onClick={() => setSelFile(null)} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", color: "rgba(167,177,195,0.7)", width: 24, height: 24, borderRadius: 6, cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
      </div>

      {/* Preview area */}
      <div style={{ width: "100%", height: 220, borderRadius: 10, background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16, overflow: "hidden", cursor: selFile.type === "image" ? "zoom-in" : "default" }} onClick={() => { if (selFile.type === "image") setZoom(z => z >= 3 ? 1 : z + 0.5); }}>
        {selFile.type === "image" && selFile.thumbnailUrl
          ? <img src={selFile.thumbnailUrl} alt="" style={{ maxWidth: `${zoom * 100}%`, maxHeight: `${zoom * 100}%`, objectFit: "contain", transition: "all .2s" }} />
          : selFile.type === "image"
            ? <div style={{ fontSize: 60 + zoom * 20, transition: "font-size .2s", userSelect: "none" }}>📷</div>
            : <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 48, marginBottom: 8 }}>📄</div>
                <div style={{ fontSize: 11, color: "rgba(167,177,195,0.75)" }}>{t("pdf_document") || "PDF / Dokument"}</div>
              </div>}
      </div>

      {/* Metadata */}
      <div style={{ display: "grid", gap: 10, fontSize: 13 }}>
        <div>
          <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(167,177,195,0.75)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>{t("filename_label") || "Dateiname"}</div>
          <div style={{ fontWeight: 600, wordBreak: "break-all", fontSize: 12 }}>{selFile.name}</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div>
            <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(167,177,195,0.75)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>{t("size_label") || "Größe"}</div>
            <div style={{ fontSize: 12 }}>{selFile.size}</div>
          </div>
          <div>
            <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(167,177,195,0.75)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>{t("category_col") || "Kategorie"}</div>
            <div style={{ fontSize: 12 }}>
              {FILE_CATEGORIES[selFile.category] ? (
                <span style={{ color: CAT_COLORS[selFile.category] || "#4cc9ff" }}>
                  {FILE_CATEGORIES[selFile.category].icon} {FILE_CATEGORIES[selFile.category].label}
                </span>
              ) : "—"}
            </div>
          </div>
        </div>
        <div>
          <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(167,177,195,0.75)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>Patient</div>
          {(() => {
            const pd = getPatientDisplay(selFile, leads);
            return pd.name ? (
              <div>
                <div style={{ fontSize: 12, fontWeight: 600 }}>{pd.name}</div>
                {pd.phone && <div style={{ fontSize: 10, color: "rgba(167,177,195,0.75)" }}>{pd.phone}</div>}
              </div>
            ) : (
              <div style={{ fontSize: 12, color: "rgba(167,177,195,0.65)", fontStyle: "italic" }}>{t("no_patient_assigned") || "Kein Patient zugewiesen"}</div>
            );
          })()}
        </div>
        {selFile.source && <div>
          <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(167,177,195,0.75)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>{t("source_label") || "Quelle"}</div>
          <div style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}>{selFile.source === "whatsapp" ? "💬 WhatsApp" : `📤 ${t("source_manual") || "Manuell"}`}</div>
        </div>}
        <div>
          <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(167,177,195,0.75)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>{t("uploaded_label") || "Hochgeladen"}</div>
          <div style={{ fontSize: 12 }}>{timeAgo(selFile.uploaded)}</div>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 16 }}>
        {selFile.driveLink && <a href={selFile.driveLink} target="_blank" rel="noopener noreferrer" style={{ width: "100%", padding: "8px 14px", borderRadius: 8, background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.12)", color: "#10b981", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", textDecoration: "none", textAlign: "center", display: "block", boxSizing: "border-box" }}>{t("open_in_drive") || "In Drive öffnen"}</a>}
        {(() => {
          const pd = getPatientDisplay(selFile, leads);
          const p = pd.name ? findPatientByName(pd.name) : null;
          return p ? <button onClick={() => openPatient(p.id)} style={{ width: "100%", padding: "8px 14px", borderRadius: 8, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", color: "rgba(167,177,195,0.6)", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>{t("open_patient_btn") || "Patient öffnen"}</button> : null;
        })()}
        <button onClick={() => shareFile(selFile)} style={{ width: "100%", padding: "8px 14px", borderRadius: 8, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", color: "rgba(167,177,195,0.6)", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>{t("copy_link") || "Link kopieren"}</button>
        <button onClick={() => deleteFile(selFile.id)} style={{ width: "100%", padding: "8px 14px", borderRadius: 8, background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.08)", color: "#ef4444", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>{t("delete_label") || "Löschen"}</button>
      </div>
    </div>}
  </div>;
}
