#!/usr/bin/env python3
"""Update product.html with animated CRM mockups"""
import shutil, datetime, os

FILE = "/opt/flowmatix/services/web/html/product.html"
shutil.copy2(FILE, FILE + ".bak-" + datetime.datetime.now().strftime("%Y%m%d%H%M%S"))

with open(FILE, "r") as f:
    content = f.read()

# 1. Insert animation CSS before TABLE COLORS comment
anim_css = """
/* ===== CRM MOCK ANIMATIONS ===== */
@keyframes fmPulse {
  0%,100% { opacity:.6; transform:scale(1); }
  50% { opacity:1; transform:scale(1.3); }
}
@keyframes fmGlow {
  0%,100% { box-shadow:0 0 4px rgba(76,201,255,.15); }
  50% { box-shadow:0 0 14px rgba(76,201,255,.35),0 0 30px rgba(76,201,255,.1); }
}
@keyframes fmShimmer {
  0% { background-position:-200% 0; }
  100% { background-position:200% 0; }
}
@keyframes fmScanLine {
  0% { top:-2px; opacity:0; }
  10% { opacity:1; }
  90% { opacity:1; }
  100% { top:calc(100% + 2px); opacity:0; }
}
@keyframes fmBreath {
  0%,100% { opacity:.5; }
  50% { opacity:.9; }
}
@keyframes fmFadeSlide {
  0% { opacity:0; transform:translateY(6px); }
  100% { opacity:1; transform:translateY(0); }
}
.fm-crm-mock__status-dot { animation: fmPulse 2s ease-in-out infinite; }
.fm-crm-mock__stat-value { animation: fmBreath 3s ease-in-out infinite; }
.fm-crm-mock__main { position:relative; }
.fm-crm-mock__main::after {
  content:""; position:absolute; left:0; right:0; height:1px;
  background:linear-gradient(90deg,transparent,rgba(76,201,255,.25),transparent);
  animation:fmScanLine 4s linear infinite;
  pointer-events:none; z-index:2;
}
.fm-crm-mock.is-glowing {
  box-shadow:0 0 40px rgba(76,201,255,.08),0 0 80px rgba(76,201,255,.04);
  animation:fmGlow 3s ease-in-out infinite;
}
.fm-crm-mock__pipeline-card,
.fm-crm-mock__inbox-item { transition:all .3s ease; }
.fm-crm-mock__pipeline-card:hover,
.fm-crm-mock__inbox-item:hover {
  border-color:rgba(76,201,255,.2);
  box-shadow:0 0 12px rgba(76,201,255,.1);
}
.fm-crm-mock__stat { transition:all .3s ease; }
.fm-crm-mock__stat:hover {
  border-color:rgba(76,201,255,.15);
  box-shadow:0 0 12px rgba(76,201,255,.08);
}
.fm-mock__shimmer-bar {
  background:linear-gradient(90deg,rgba(76,201,255,.06) 25%,rgba(76,201,255,.18) 50%,rgba(76,201,255,.06) 75%);
  background-size:200% 100%;
  animation:fmShimmer 2.5s linear infinite;
  border-radius:4px;
}
.fm-mock__patient-card {
  padding:8px 10px; border-radius:8px;
  background:linear-gradient(135deg,rgba(167,107,255,.05),rgba(76,201,255,.05));
  border:1px solid rgba(167,107,255,.12);
  position:relative; overflow:hidden;
}
.fm-mock__patient-card::before {
  content:""; position:absolute; top:0; left:0; right:0; height:2px;
  background:linear-gradient(90deg,#a76bff,#4cc9ff);
  opacity:.6;
}
.fm-mock__patient-card-title {
  font-size:8px; font-weight:800; color:rgba(167,107,255,.7);
  text-transform:uppercase; letter-spacing:.08em; margin-bottom:5px;
}
.fm-mock__patient-card-grid { display:grid; grid-template-columns:1fr 1fr; gap:4px 10px; }
.fm-mock__patient-card-field { font-size:7px; display:flex; gap:4px; }
.fm-mock__patient-card-field span:first-child { color:rgba(167,177,195,.4); }
.fm-mock__patient-card-field span:last-child { color:rgba(232,238,252,.75); font-weight:600; }
.fm-mock__flag {
  display:inline-flex; align-items:center; gap:3px;
  padding:1px 5px; border-radius:3px; font-size:6px; font-weight:700;
  background:rgba(239,68,68,.08); border:1px solid rgba(239,68,68,.15); color:#ef4444;
}

"""

marker = "/* ===== TABLE COLORS ===== */"
if marker in content:
    content = content.replace(marker, anim_css + marker)
    print("[1/2] Animation CSS injected.")
else:
    print("[1/2] WARNING: TABLE COLORS marker not found!")

# 2. Replace MK + rn function block with updated version including Patient Card + auto-cycling
old_start = content.find("var MK={")
if old_start == -1:
    print("[2/2] ERROR: var MK={ not found!")
    exit(1)

old_end = content.find("})();", old_start)
if old_end == -1:
    print("[2/2] ERROR: })(); not found after MK!")
    exit(1)
old_end += len("})();")

# Read the new MK block from a separate file to avoid escaping issues
new_mk_path = "/tmp/fm_new_mk_block.js"
with open(new_mk_path, "r") as f:
    new_block = f.read()

content = content[:old_start] + new_block + content[old_end:]
print("[2/2] MK + rn function replaced with animated version.")

with open(FILE, "w") as f:
    f.write(content)

print("Done! product.html updated.")
