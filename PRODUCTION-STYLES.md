# Flowmatix CRM Production Styles Reference

Extracted from production bundles on 2026-03-14:
- `index-BdyAA222.js` (React base, 61782 lines beautified)
- `fm-cal-v152.js` (DOM injection layer, 13805 lines beautified)

Beautified files saved at `/tmp/prod-index-pretty.js` and `/tmp/prod-fm-cal-pretty.js`.

---

## 1. Global Theme & Colors

### Dark Theme (default)
```
Body background:           #0f1623
Sidebar background:        #131c2e
Page overlay background:   #0f1623
Card/Panel background:     #141820 | #131c2e | #162032
Modal background:          #141820
Input background:          #1a1f2e | rgba(255,255,255,0.04)
```

### Light Theme
```
Body background:           #F8FAFC
```

### Brand Colors
```
Primary (blue):            #4cc9ff
Secondary (purple):        #a78bfa
Success (green):           #10b981
Warning (amber):           #f59e0b
Danger (red):              #ef4444
Orange accent:             #ff8a2a
Gold/yellow:               #fbbf24
Pink:                      #ec4899
Cyan:                      #06b6d4
Deep purple:               #8b5cf6
Neutral gray:              #94a3b8
```

### Text Colors
```
Primary text:              #e8eefc | #f1f5f9 | #e2e8f0
Secondary text:            rgba(167,177,195,0.5) | rgba(167,177,195,0.6) | #6b7280
Muted text:                rgba(167,177,195,0.35) | rgba(167,177,195,0.4) | #9ca3af
Subtle text:               rgba(167,177,195,0.3) | #4b5563
Label text:                #6b7280 | rgba(167,177,195,0.5)
```

### Border Colors
```
Standard:                  rgba(255,255,255,0.06) | rgba(255,255,255,0.08)
Subtle:                    rgba(255,255,255,0.04)
Input:                     rgba(255,255,255,0.1) | rgba(255,255,255,0.12)
Sidebar border-right:      rgba(255,255,255,0.06)
```

### Treatment Colors (TREAT_COLORS)
```js
fue:          '#4cc9ff'
dhi:          '#a78bfa'
prp:          '#10b981'
bart:         '#f59e0b'
augenbrauen:  '#ec4899'
meso:         '#06b6d4'
consultation: '#94a3b8'
```

### Pipeline Stage Colors
```js
new:        { color: '#4cc9ff', icon: '✦' }
contacted:  { color: '#fbbf24', icon: '◉' }
booked:     { color: '#a78bfa', icon: '◈' }
done:       { color: '#10b981', icon: '✓' }
```

### Status Colors
```js
booked:           '#4cc9ff'
confirmed:        '#a78bfa'
reserved:         '#fbbf24'
awaiting_deposit: '#f59e0b'
completed:        '#10b981'
cancelled:        '#ef4444'
no_show:          '#f97316'
pending:          '#fbbf24'
```

### Capacity Indicator Colors
```
Full (100%):               #ef4444
Warning (>=65-70%):        #f59e0b
OK (<65%):                 #10b981
```

### Readiness Progress Colors
```
<=40%:                     #ef4444
<=80%:                     #f59e0b
>80%:                      #10b981
```

---

## 2. Layout Structure

### Main App Layout
```
display: flex
height: 100vh

Sidebar:
  width: 260px (expanded) | 68px (collapsed)
  minWidth: same as width
  background: #131c2e
  borderRight: 1px solid rgba(255,255,255,0.06)
  transition: all .3s cubic-bezier(.4,0,.2,1)
  flexDirection: column

Content area:
  flex: 1
  overflow: auto
```

### Sidebar Logo Area
```
padding: 20px 18px 16px (expanded) | 20px 14px 16px (collapsed)
borderBottom: 1px solid rgba(255,255,255,0.05)

Logo img:
  width: 38px (expanded) | 34px (collapsed)
  height: same
  borderRadius: 10px
  border: 2px solid rgba(255,255,255,0.5)
  boxShadow: 0 2px 12px rgba(0,0,0,0.4)
  background: #ffffff

"FLOWMATIX" text:
  fontWeight: 800
  fontSize: 16
  letterSpacing: 0.06em
  background: linear-gradient(135deg,#fff 30%,rgba(76,201,255,0.85) 100%)  [admin mode]
           or linear-gradient(135deg,#fff 30%,rgba(212,175,55,0.9) 100%)   [clinic mode]
  WebkitBackgroundClip: text
  WebkitTextFillColor: transparent
```

### Sidebar Collapse Button
```
position: absolute
top: 50%, right: -14px
transform: translateY(-50%)
width: 28px, height: 28px
borderRadius: 50%
background: #4cc9ff (admin) | #d4af37 (clinic)
border: 2px solid #131c2e
boxShadow: 0 2px 8px rgba(76,201,255,0.3)
```

### Sidebar Nav Item (injected by fm-cal)
```
display: flex
alignItems: center
gap: 12px
padding: 10px 14px
marginBottom: 3px
borderRadius: 10px
cursor: pointer
color: rgba(167,177,195,0.55)
borderLeft: 3px solid transparent
fontWeight: 500
fontSize: 14px
transition: all .2s cubic-bezier(.4,0,.2,1)
fontFamily: inherit
letterSpacing: 0

Active state:
  background: rgba(76,201,255,0.08)
  color: #fff
  borderLeft: 3px solid #4cc9ff
  fontWeight: 700
  letterSpacing: 0.01em
```

---

## 3. Pipeline Kanban View (React base: index-BdyAA222.js)

### Pipeline Container
```
padding: 20px 32px

Search input:
  width: 280px
  padding: 8px 14px
  marginBottom: 12px
  borderRadius: 8px
  border: 1px solid #2a2d35
  background: #13151d
  color: #e0e0e0
  fontSize: 13px
```

### Pipeline Grid
```
display: grid
gridTemplateColumns: repeat(4, 1fr)
gap: 16px
minHeight: calc(100vh - 100px)
```

### Pipeline Column
```
background: #162032
borderRadius: 14px
border: 1px solid rgba(255,255,255,0.06)
display: flex
flexDirection: column
borderTop: 3px solid {stageColor}
boxShadow: 0 -8px 24px -12px {stageColor}30
```

### Pipeline Column Header
```
padding: 14px 16px
borderBottom: 1px solid rgba(255,255,255,0.04)
display: flex
justifyContent: space-between
alignItems: center
background: linear-gradient(180deg, {stageColor}12 0%, transparent 100%)

Icon:
  color: {stageColor}
  fontSize: 15px

Label:
  fontWeight: 800
  fontSize: 14px
  color: {stageColor}

Count badge:
  background: {stageColor}15
  color: {stageColor}
  fontSize: 12px
  fontWeight: 800
  padding: 3px 10px
  borderRadius: 8px
```

### Pipeline Column Body
```
flex: 1
padding: 8px
display: flex
flexDirection: column
gap: 8px
overflowY: auto
```

### Pipeline Card
```
padding: 12px 12px 12px 15px
borderRadius: 12px
borderLeft: 3px solid {stageColor}
background: rgba(255,255,255,0.04)
border: 1px solid rgba(255,255,255,0.08)
cursor: pointer

Hover: borderColor → {stageColor}50

Patient name:
  fontWeight: 700
  fontSize: 14px
  marginBottom: 3px

Treatment:
  fontSize: 12px
  color: rgba(167,177,195,0.6)
  marginBottom: 6px

Country / time row:
  display: flex
  justifyContent: space-between
  alignItems: center
  fontSize: 11px
  marginBottom: 4px
  country color: rgba(167,177,195,0.4)
  time color: rgba(167,177,195,0.35), fontSize: 10px

Status badge row:
  display: flex
  justifyContent: space-between
  alignItems: center
  fontSize: 11px

Conversation status badge:
  padding: 2px 7px
  borderRadius: 5px
  fontSize: 10px
  fontWeight: 700
  background: {statusColor}15
  color: {statusColor}

Status indicator (bottom):
  display: flex, alignItems: center, gap: 6
  marginTop: 6, paddingTop: 6
  borderTop: 1px solid rgba(255,255,255,0.06)
  dot: fontSize 10, color: {statusColor}
  text: fontSize 10, fontWeight 700, color: {statusColor}
        textShadow: 0 0 8px {statusColor}60
```

### Pipeline Status Badge Colors
```
"Bot aktiv":           #4cc9ff
"Handover noetig":     #ef4444
"Arzt-Review":         #ff8a2a
"Antwort noetig":      #fbbf24
"Anzahlung ausstehend": #f59e0b
"Flug fehlt":          #3b82f6
"Hotel zuweisen":      #ec4899
"Fahrer zuweisen":     #8b5cf6
"Reise organisiert":   #fbbf24
"Abgeschlossen":       #10b981
```

### Pipeline Badge Pulse Animation
```css
@keyframes fm-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
.fm-badge-pulse { animation: fm-pulse 2s ease-in-out infinite; }
```

---

## 4. Calendar / Appointments View (fm-cal-v152.js)

### Doctor Filter Chips
```
Container (#fm-df):
  display: flex
  gap: 6px
  margin: 0 0 14px
  flexWrap: wrap
  alignItems: center

Chip button (generic / "All"):
  padding: 5px 14px
  borderRadius: 20px
  fontSize: 11px
  fontWeight: 600
  cursor: pointer
  fontFamily: inherit
  outline: none
  transition: all .15s

  Inactive: border: 1.5px solid rgba(167,177,195,0.2)
            background: transparent
            color: rgba(167,177,195,0.4)

  Active:   border: 1.5px solid rgba(167,177,195,0.6)
            background: rgba(167,177,195,0.15)
            color: rgba(167,177,195,0.9)

Chip button (doctor-specific):
  Inactive: border: 1.5px solid {docColor}
            background: transparent
            color: {docColor}

  Active:   border: 1.5px solid {docColor}
            background: {docColor}
            color: #fff

Capacity dot (prepended):
  display: inline-block
  width: 6px, height: 6px
  borderRadius: 50%
  background: {capColor}  (green/amber/red)
  marginRight: 5px
  flexShrink: 0

Doctor gear icon:
  padding: 3px 5px
  border: none
  background: transparent
  color: {docColor}
  fontSize: 16px
  cursor: pointer
  opacity: 0.5  (hover: 1)
  transition: opacity .15s
  marginLeft: -2px
```

### Calendar Operations Panel (#fm-ops)
```
display: grid
gridTemplateColumns: repeat(4, 1fr)
gap: 10px
margin: 0 0 16px
marginTop: 24px

Stat card:
  padding: 14px 16px
  borderRadius: 12px
  background: rgba(255,255,255,0.03)
  border: 1px solid rgba(255,255,255,0.06)

  Label:
    fontSize: 10px
    fontWeight: 600
    color: rgba(167,177,195,0.5)
    textTransform: uppercase
    letterSpacing: 0.5px

  Value:
    fontSize: 22px
    fontWeight: 800
    color: {color}  (e.g. #4cc9ff, #a78bfa, #fbbf24, #10b981/#f59e0b/#ef4444)
    marginTop: 4px

  Subtitle:
    fontSize: 10px
    color: rgba(167,177,195,0.4)
    marginTop: 2px
```

### Calendar Day Cell Enhancements

#### Graft Capacity Bar (.fm-gc)
```
Container: marginTop: 2px

Bar background:
  height: 3px
  borderRadius: 2px
  background: rgba(255,255,255,0.06)
  overflow: hidden

Bar fill:
  height: 100%
  borderRadius: 2px
  background: {capacityColor}
  width: {pct}%
  transition: width .3s

Label:
  fontSize: 7px
  color: {capacityColor}
  fontWeight: 700
  marginTop: 1px
  opacity: 0.8
  whiteSpace: nowrap
```

#### Day Summary (.fm-ds)
```
position: absolute
bottom: 2px
left: 4px, right: 4px
fontSize: 7px
fontWeight: 600
color: rgba(167,177,195,0.35)
textAlign: center
whiteSpace: nowrap
overflow: hidden
```

#### Day Capacity Header (.fm-dch)
```
position: absolute
top: 1px, right: 4px
fontSize: 7px
fontWeight: 700
display: flex
gap: 4px
alignItems: center

Room pill:
  padding: 1px 4px
  borderRadius: 3px
  background: {roomColor}18
  color: {roomColor}

OP count pill:
  padding: 1px 4px
  borderRadius: 3px
  background: rgba(76,201,255,0.12)
  color: #4cc9ff
```

#### Absence/Blocked Day Pill (.fm-abs)
```
Container:
  marginTop: 2px
  display: flex
  flexDirection: column
  gap: 1px

Pill:
  fontSize: 7px
  fontWeight: 700
  padding: 1px 4px
  borderRadius: 3px
  whiteSpace: nowrap
  overflow: hidden
  textOverflow: ellipsis
  background: {absenceColor}15
  color: {absenceColor}
  border: 1px solid {absenceColor}25
  display: flex
  alignItems: center
  gap: 2px

Blocked whole clinic:
  cell background: rgba(239,68,68,0.04)
  cell borderColor: rgba(239,68,68,0.08)
```

### Calendar Card Enhancements (month view)

#### Treatment Color Stripe (.fm-ts)
```
position: absolute
top: 0, right: 0
width: 3px
height: 100%
borderRadius: 0 3px 3px 0
background: {treatColor}
```

#### Card Info Line (.fm-ci)
```
fontSize: 8px
opacity: 0.45
marginTop: 1px
whiteSpace: nowrap
overflow: hidden
textOverflow: ellipsis
```

#### Patient Status Icons (.fm-ps)
```
position: absolute
top: 1px, right: 5px
fontSize: 7px
opacity: 0.6
```

#### Status Badge (.fm-stb)
```
position: absolute
bottom: 1px, right: 3px
fontSize: 6px
fontWeight: 700
padding: 1px 4px
borderRadius: 3px
background: {statusColor}20
color: {statusColor}
textTransform: uppercase
letterSpacing: 0.3px
```

### Today Badge (#fm-tb)
```
display: block
fontSize: 8px
fontWeight: 700
color: #4cc9ff
opacity: 0.7
marginTop: 1px
```

### Tooltip (#fm-tip)
```
position: fixed
zIndex: 10000
background: #1a1f2e
border: 1px solid rgba(255,255,255,0.12)
borderRadius: 10px
padding: 12px 16px
fontSize: 12px
color: #e8eefc
lineHeight: 1.7
pointerEvents: none
boxShadow: 0 8px 24px rgba(0,0,0,0.5)
maxWidth: 280px
```

### Tooltip CSS (.fm-hint / .fm-tip)
```css
.fm-hint {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 8px;
  background: rgba(76,201,255,0.12);
  color: #4cc9ff;
  font-size: 10px;
  font-weight: 800;
  cursor: help;
  position: relative;
  flex-shrink: 0;
  margin-left: 4px;
  font-family: inherit;
  vertical-align: middle;
}

.fm-tip {
  display: none;
  position: fixed;
  width: 300px;
  padding: 12px 14px;
  border-radius: 10px;
  background: #1a2438;
  border: 1px solid rgba(255,255,255,0.1);
  color: #cbd5e1;
  font-size: 11px;
  font-weight: 400;
  line-height: 1.6;
  box-shadow: 0 8px 30px rgba(0,0,0,0.4);
  z-index: 99999;
  pointer-events: none;
  white-space: normal;
  text-align: left;
}

.fm-tip::after {
  content: "";
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border: 6px solid transparent;
  border-top-color: #1a2438;
}
```

---

## 5. Week View (fm-cal)

### Week View Container (#fm-weekview)
```
order: 2
width: 100%
```

### Week Navigation Header
```
display: flex
alignItems: center
justifyContent: space-between
margin: 8px 0 12px

Prev/Next buttons:
  padding: 6px 12px
  borderRadius: 8px
  border: 1px solid rgba(255,255,255,0.1)
  background: transparent
  color: #e8eefc
  cursor: pointer
  fontSize: 16px

Week label:
  fontSize: 18px
  fontWeight: 700
  color: #e8eefc

Today button:
  padding: 4px 12px
  borderRadius: 8px
  border: 1px solid rgba(76,201,255,0.3)
  background: rgba(76,201,255,0.1)
  color: #4cc9ff
  cursor: pointer
  fontSize: 11px
  fontWeight: 600
```

### Week Column Headers
```
display: grid
gridTemplateColumns: 50px repeat(7, 1fr)
gap: 0

Day header:
  textAlign: center
  padding: 6px 0 8px
  borderBottom: 1px solid rgba(255,255,255,0.06)
  Today: background rgba(76,201,255,0.05)

  Day name:
    fontSize: 10px
    fontWeight: 600
    color: rgba(167,177,195,0.5)
    textTransform: uppercase

  Day number:
    fontSize: 16px
    fontWeight: 700
    color: #e8eefc (normal) | #4cc9ff (today)
    marginTop: 2px
```

### Week Time Grid (#fm-wk-grid)
```
display: grid
gridTemplateColumns: 50px repeat(7, 1fr)
gap: 0
position: relative
overflowY: auto
overflowX: hidden
maxHeight: calc(100vh - 320px)
scrollbarWidth: thin
scrollbarColor: rgba(255,255,255,0.15) transparent

Hour label:
  height: {HOUR_H}px
  borderBottom: 1px solid rgba(255,255,255,0.04)
  display: flex
  alignItems: flex-start
  justifyContent: flex-end
  padding: 2px 6px 0 0
  text: fontSize 9px, fontWeight 500, color rgba(167,177,195,0.35)

Cell (.fm-wk-cell):
  height: {HOUR_H}px
  borderBottom: 1px solid rgba(255,255,255,0.04)
  borderLeft: 1px solid rgba(255,255,255,0.04)
  position: relative
  Today: background rgba(76,201,255,0.02)
```

### Week Appointment Block (.fm-wk-appt)
```
position: absolute
left: 2px, right: 2px
top: {computed}px
height: {computed}px
background: {color}22
borderLeft: 3px solid {color}
borderRadius: 4px
padding: 3px 6px
overflow: hidden
cursor: pointer
zIndex: 2
transition: transform .1s

Hover: transform scale(1.02), zIndex 10

Title line:
  fontSize: 10px
  fontWeight: 700
  color: {color}
  whiteSpace: nowrap
  overflow: hidden
  textOverflow: ellipsis

Detail line (if height > 28px):
  fontSize: 9px
  color: rgba(167,177,195,0.6)

Duration line (if height > 48px):
  fontSize: 9px
  color: rgba(167,177,195,0.4)
```

### Blocked Day Overlay (week view, .fm-wk-blocked)
```
position: absolute
inset: 0
background: repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(239,68,68,0.06) 4px, rgba(239,68,68,0.06) 8px)
zIndex: 1
pointerEvents: none

Label (first hour only):
  fontSize: 8px
  color: rgba(239,68,68,0.5)
  padding: 2px 4px
```

---

## 6. Appointment Drawer (#fm-dr)

### Backdrop (#fm-bd)
```
position: fixed
inset: 0
background: rgba(0,0,0,0.5)
zIndex: 9998
backdropFilter: blur(3px)
```

### Drawer Panel
```
position: fixed
top: 0, right: 0
width: 420px
height: 100vh
background: #141820
borderLeft: 1px solid rgba(255,255,255,0.08)
zIndex: 9999
padding: 28px 24px
overflowY: auto
boxShadow: -10px 0 40px rgba(0,0,0,0.5)
animation: fmSlide .2s ease

@keyframes fmSlide {
  from { transform: translateX(100%) }
  to { transform: translateX(0) }
}
```

### Drawer Header
```
display: flex
justifyContent: space-between
alignItems: center
marginBottom: 24px

Title: fontSize 18px, fontWeight 800, margin 0
Close button: background none, border none, color rgba(167,177,195,0.5), fontSize 20px
```

### Status Indicator
```
display: flex, alignItems: center, gap: 8px, marginBottom: 20px

Status dot:
  display: inline-block
  width: 10px, height: 10px
  borderRadius: 50%
  background: {statusColor}

Status text:
  fontSize: 13px
  fontWeight: 700
  color: {statusColor}
```

### Patient Avatar
```
width: 56px, height: 56px
borderRadius: 50%
background: rgba(76,201,255,0.12)
border: 2px solid rgba(76,201,255,0.2)
display: flex
alignItems: center
justifyContent: center
fontSize: 18px
fontWeight: 700
color: #4cc9ff
flexShrink: 0
overflow: hidden
```

### Field Label (dfl helper)
```
Wrapper: marginBottom: 20px
Label:
  fontSize: 11px
  color: rgba(167,177,195,0.5)
  fontWeight: 600
  marginBottom: 4px (or 6px for patient)
```

### Status Badges (sbb helper)
```
display: flex
alignItems: center
gap: 4px
padding: 3px 8px
borderRadius: 6px
fontSize: 10px
fontWeight: 600

OK:   background rgba(16,185,129,0.1), border rgba(16,185,129,0.2), color #10b981
Bad:  background rgba(239,68,68,0.1), border rgba(239,68,68,0.2), color #ef4444
```

### Readiness Checklist
```
Section border: borderTop 1px solid rgba(255,255,255,0.06), paddingTop 16px, marginTop 16px

Check items:
  display: flex, alignItems: center, gap: 8px, padding: 4px 0

  Text (done): fontSize 12px, color rgba(232,238,252,0.7)
  Text (missing): fontSize 12px, color rgba(167,177,195,0.35), textDecoration: line-through

Progress bar:
  Container: flex 1, height 4px, borderRadius 2px, background rgba(255,255,255,0.06)
  Fill: height 100%, width {pct}%, background {pctColor}, borderRadius 2px, transition width .3s
  Label: fontSize 11px, fontWeight 700, color {pctColor}
```

### Action Buttons (abtn helper)
```
padding: 8px 16px
borderRadius: 10px
fontSize: 12px
fontWeight: 700
cursor: pointer
fontFamily: inherit
background: rgba({rgb},0.15)
border: 1px solid rgba({rgb},0.3)
color: rgb({rgb})

Confirm: rgb=167,129,250
Complete: rgb=16,185,129
Cancel:   rgb=239,68,68
```

### Room Badge
```
fontSize: 14px
fontWeight: 700
padding: 4px 12px
borderRadius: 8px
background: rgba(76,201,255,0.08)
border: 1px solid rgba(76,201,255,0.2)
color: #4cc9ff
```

### Grafts Display
```
Value: fontSize 20px, fontWeight 800, color #4cc9ff
Unit: fontSize 12px, color rgba(167,177,195,0.5), marginLeft 4px
```

---

## 7. Doctor Settings Modal (#fm-dset)

### Backdrop
```
position: fixed, inset: 0
background: rgba(0,0,0,0.6)
zIndex: 9998
backdropFilter: blur(4px)
```

### Modal
```
position: fixed
top: 50%, left: 50%
transform: translate(-50%,-50%)
width: 560px
maxHeight: 85vh
background: #141820
border: 1px solid rgba(255,255,255,0.1)
borderRadius: 18px
zIndex: 9999
padding: 0
boxShadow: 0 24px 80px rgba(0,0,0,0.6)
overflow: hidden
display: flex
flexDirection: column

animation: fmModalIn .2s ease
@keyframes fmModalIn {
  from { opacity: 0; transform: translate(-50%,-50%) scale(0.95) }
  to { opacity: 1; transform: translate(-50%,-50%) scale(1) }
}
```

### Modal Header
```
padding: 24px 28px 16px
borderBottom: 1px solid rgba(255,255,255,0.06)
display: flex
justifyContent: space-between
alignItems: center

Doctor color dot: width 12px, height 12px, borderRadius 50%
Title: fontSize 18px, fontWeight 800, margin 0
Close: background none, border none, color rgba(167,177,195,0.5), fontSize 20px
```

### Modal Body
```
padding: 20px 28px
overflowY: auto
flex: 1
```

### Section Title
```
fontSize: 13px
fontWeight: 700
marginBottom: 10-12px
color: rgba(232,238,252,0.9)
```

### Number Input
```
width: 60-80px
padding: 6px 10px
borderRadius: 8px
fontSize: 13px
background: rgba(255,255,255,0.04)
border: 1px solid rgba(255,255,255,0.1)
color: #e8eefc
fontFamily: inherit
outline: none
textAlign: center
```

### Toggle Buttons (treatment/room/workday)
```
Treatment:
  padding: 5px 12px
  borderRadius: 8px
  fontSize: 11px

Room:
  padding: 6px 14px
  borderRadius: 8px
  fontSize: 12px

Workday:
  width: 40px, height: 36px
  borderRadius: 8px
  fontSize: 11px

All toggles:
  fontWeight: 600-700
  cursor: pointer
  fontFamily: inherit
  transition: all .15s

  Selected (green): border rgba(16,185,129,0.3), bg rgba(16,185,129,0.12), color #10b981
  Selected (blue):  border rgba(76,201,255,0.3), bg rgba(76,201,255,0.12), color #4cc9ff
  Unselected:       border rgba(255,255,255,0.06-0.08), bg rgba(255,255,255,0.02-0.03), color rgba(167,177,195,0.3-0.5)
```

### Toggle Switch (auto-review)
```
Track: width 40px, height 22px, borderRadius 11px
  On: background #10b981
  Off: background rgba(255,255,255,0.1)

Knob: width 18px, height 18px, borderRadius 9px, background white
  On: left 20px
  Off: left 2px
  boxShadow: 0 1px 3px rgba(0,0,0,0.3)
  transition: left 0.2s
```

### Modal Footer
```
padding: 16px 28px
borderTop: 1px solid rgba(255,255,255,0.06)
display: flex
justifyContent: flex-end
gap: 10px

Cancel button:
  padding: 10px 20px
  borderRadius: 10px
  fontSize: 13px
  fontWeight: 700
  background: rgba(255,255,255,0.04)
  border: 1px solid rgba(255,255,255,0.08)
  color: rgba(167,177,195,0.7)

Save button:
  padding: 10px 24px
  borderRadius: 10px
  fontSize: 13px
  fontWeight: 700
  background: rgba(76,201,255,0.15)
  border: 1px solid rgba(76,201,255,0.3)
  color: #4cc9ff
```

---

## 8. OP-Vorbereitung Page

### Page Overlay (#fm-opprep-page)
```
position: fixed
top: 64px
left: {sidebarWidth}px
right: 0
bottom: 0
background: #0f1623
zIndex: 999
overflowY: auto
```

### Inner Container
```
padding: 32px 40px
maxWidth: 1400px
margin: 0 auto
```

### Page Header
```
display: flex
alignItems: center
justifyContent: space-between
marginBottom: 24px

Title: fontSize 28px, fontWeight 800, color #f1f5f9, margin 0, letterSpacing -0.03em
Subtitle: fontSize 14px, color #6b7280, margin 6px 0 0
```

### Stats Cards (#fm-opprep-stats)
```
display: flex, gap: 12px

Card:
  padding: 10px 18px
  borderRadius: 10px
  textAlign: center

  Appointments: background rgba(255,255,255,0.03), border rgba(255,255,255,0.06)
  Ready: background rgba(16,185,129,0.06), border rgba(16,185,129,0.12)
  Urgent: background rgba(239,68,68,0.06), border rgba(239,68,68,0.12)

  Number: fontSize 20px, fontWeight 800
  Label: fontSize 11px, color #6b7280
```

### Filter Buttons
```
Container: display flex, gap 8px, marginBottom 20px, flexWrap wrap

Button:
  padding: 8px 16px
  borderRadius: 8px
  fontSize: 13px
  fontWeight: 600
  cursor: pointer
  fontFamily: inherit
  transition: all 0.2s

  Active: border #ff8a2a, background rgba(255,138,42,0.1), color #ff8a2a
  Inactive: border rgba(255,255,255,0.08), background rgba(255,255,255,0.03), color #9ca3af
```

### Critical Patients Banner
```
marginBottom: 16px
borderRadius: 12px
background: rgba(239,68,68,0.06)
border: 1px solid rgba(239,68,68,0.18)
padding: 14px 18px

Row: display flex, alignItems center, gap 14px, padding 8px 0, cursor pointer

Urgent badge:
  fontSize: 13px
  fontWeight: 800
  color: #ef4444
  background: rgba(239,68,68,0.12)
  padding: 3px 10px
  borderRadius: 6px
  whiteSpace: nowrap

Patient name: fontSize 14px, fontWeight 700, color #f1f5f9
Missing: fontSize 12px, color #f59e0b, fontWeight 600
```

### Table Header
```
display: grid
gridTemplateColumns: 2fr 1fr 0.6fr 1.2fr 1fr 0.6fr 0.8fr 0.8fr
gap: 8px
padding: 10px 16px
borderRadius: 10px 10px 0 0
background: rgba(255,255,255,0.03)
border: 1px solid rgba(255,255,255,0.06)
fontSize: 11px
fontWeight: 700
textTransform: uppercase
letterSpacing: 0.05em
color: #6b7280
```

### Table Row
```
display: grid
gridTemplateColumns: (same as header)
gap: 8px
padding: 12px 16px
border: 1px solid {borderColor}
borderTop: none
background: {bgColor}
cursor: pointer
transition: background 0.15s
alignItems: center
fontSize: 13px
color: #cbd5e1

Last row: borderRadius 0 0 10px 10px

Urgent row: border rgba(239,68,68,0.15), background rgba(239,68,68,0.03)
Normal row: border rgba(255,255,255,0.04), background transparent

Hover: background rgba(255,255,255,0.03)

Patient name: fontWeight 700, color #f1f5f9
Days column: color {daysColor}, fontWeight 700
  <=1 day: #ef4444
  <=3 days: #f59e0b
  >3 days: #9ca3af

Progress bar:
  display: flex, alignItems: center, gap: 4px
  Bar: flex 1, height 6px, borderRadius 3px, background rgba(255,255,255,0.06)
  Fill: height 100%, borderRadius 3px, background {pctColor}
  Label: fontSize 10px, fontWeight 700, color {pctColor}
```

### Detail Overlay (#fm-opprep-detail)
```
position: fixed
top: 0, right: 0
width: 440px
height: 100vh
background: #131c2e
borderLeft: 1px solid rgba(255,255,255,0.08)
zIndex: 10000
overflowY: auto
boxShadow: -4px 0 30px rgba(0,0,0,0.5)
animation: fm-slide-in 0.2s ease
```

### Detail Header
```
Name: fontSize 22px, fontWeight 800, color #f1f5f9, letterSpacing -0.03em
Treatment: fontSize 13px, color #9ca3af, marginTop 4px
Close: background none, border none, color #6b7280, fontSize 24px
```

### Info Cards Grid
```
display: grid
gridTemplateColumns: 1fr 1fr
gap: 8px
marginBottom: 20px

Card:
  padding: 10px 12px
  borderRadius: 10px
  background: rgba(255,255,255,0.03)
  border: 1px solid rgba(255,255,255,0.06)

  Label: fontSize 10px, color #6b7280, textTransform uppercase, letterSpacing 0.05em
  Value: fontSize 13px, color #f1f5f9, fontWeight 600, marginTop 2px
  Sub: fontSize 11px, color #9ca3af
```

### Readiness Progress Bar
```
Section label: fontSize 12px, fontWeight 700, color #9ca3af, textTransform uppercase, letterSpacing 0.05em
Score: fontSize 14px, fontWeight 800, color {pctColor}

Bar:
  height: 8px
  borderRadius: 4px
  background: rgba(255,255,255,0.06)
  Fill: same but width {pct}%, background {pctColor}, transition width 0.3s
```

### Toggle Row (medical/logistics checklist)
```
display: flex
alignItems: center
gap: 10px
padding: 10px 12px
borderRadius: 10px
marginBottom: 5px
cursor: pointer
transition: all 0.2s

Checked:
  background: rgba(16,185,129,0.08)
  border: 1px solid rgba(16,185,129,0.15)

Unchecked:
  background: rgba(255,255,255,0.02)
  border: 1px solid rgba(255,255,255,0.06)

Toggle switch (smaller):
  width: 36px, height: 20px, borderRadius: 10px
  Knob: width 16px, height 16px, borderRadius 8px

Label: fontSize 12px, fontWeight 600

Request button:
  padding: 4px 10px
  borderRadius: 6px
  background: rgba(76,201,255,0.08)
  border: 1px solid rgba(76,201,255,0.2)
  color: #4cc9ff
  fontSize: 10px
  fontWeight: 700

Upload button:
  padding: 4px 10px
  borderRadius: 6px
  background: rgba(245,158,11,0.08)
  border: 1px solid rgba(245,158,11,0.2)
  color: #f59e0b
  fontSize: 10px
  fontWeight: 700

View files button:
  padding: 4px 10px
  borderRadius: 6px
  background: rgba(16,185,129,0.08)
  border: 1px solid rgba(16,185,129,0.15)
  color: #10b981
  fontSize: 10px
  fontWeight: 700
```

### Logistics Input Fields
```
padding: 6px 10px
borderRadius: 8px
background: rgba(255,255,255,0.04)
border: 1px solid rgba(255,255,255,0.08)
color: #f1f5f9
fontSize: 11px
fontFamily: inherit
```

### Confirmed Info Box
```
margin: 0 0 8px 48px
padding: 8px 12px
borderRadius: 8px
background: rgba(16,185,129,0.04)
border: 1px solid rgba(16,185,129,0.1)
fontSize: 11px
color: #cbd5e1
```

---

## 9. Waitlist Panel (#fm-wl)

```
marginTop: 20px
padding: 16px
borderRadius: 14px
background: rgba(255,255,255,0.02)
border: 1px solid rgba(255,255,255,0.06)

Header:
  display: flex
  justifyContent: space-between
  alignItems: center
  marginBottom: 12px

  Title: fontSize 13px, fontWeight 700
  Count badge:
    fontSize: 11px, fontWeight: 600
    padding: 2px 8px
    borderRadius: 10px
    background: rgba(251,191,36,0.1)
    color: #fbbf24

Item row:
  display: flex
  justifyContent: space-between
  alignItems: center
  padding: 10px 12px
  borderRadius: 10px
  background: rgba(255,255,255,0.02)
  marginBottom: 6px
  border: 1px solid rgba(255,255,255,0.04)

  Name: fontWeight 700, fontSize 12px
  Treatment pill:
    fontSize: 10px
    padding: 1px 6px
    borderRadius: 6px
    background: rgba(76,201,255,0.1)
    color: #4cc9ff
    fontWeight: 600

  Grafts: fontSize 10px, color rgba(167,177,195,0.4)
  Notes: fontSize 10px, color rgba(167,177,195,0.35), marginTop 3px

Action buttons:
  padding: 4px 8px
  borderRadius: 6px
  fontSize: 10px
  cursor: pointer
  fontWeight: 600
  fontFamily: inherit

  Schedule: border rgba(76,201,255,0.3), bg rgba(76,201,255,0.1), color #4cc9ff
  WhatsApp:  border rgba(16,185,129,0.3), bg rgba(16,185,129,0.1), color #10b981
  Priority:  border rgba(251,191,36,0.3), bg rgba(251,191,36,0.1), color #fbbf24
  Remove:    border rgba(239,68,68,0.3), bg rgba(239,68,68,0.1), color #ef4444
```

---

## 10. Smart Booking Modal (#fm-sb)

### Modal
```
Same as Doctor Settings modal but width: 680px
```

### Filter Section
```
padding: 16px 28px
borderBottom: 1px solid rgba(255,255,255,0.04)
display: flex
gap: 12px
flexWrap: wrap
alignItems: end

Label:
  fontSize: 10px
  fontWeight: 600
  color: rgba(167,177,195,0.5)
  display: block
  marginBottom: 4px

Select/Input:
  padding: 8px 12px
  borderRadius: 8px
  fontSize: 12px
  background: rgba(255,255,255,0.04)
  border: 1px solid rgba(255,255,255,0.1)
  color: #e8eefc

Search button:
  padding: 8px 20px
  borderRadius: 8px
  fontSize: 12px
  fontWeight: 700
  background: rgba(76,201,255,0.15)
  border: 1px solid rgba(76,201,255,0.3)
  color: #4cc9ff
```

### Slot Result Card
```
display: flex
alignItems: center
justifyContent: space-between
padding: 14px 16px
borderRadius: 12px
background: rgba(255,255,255,0.02)
border: 1px solid rgba(255,255,255,0.06)
marginBottom: 8px
cursor: pointer
transition: all .15s

Hover: borderColor rgba(76,201,255,0.3), background rgba(76,201,255,0.04)

Date: fontSize 14px, fontWeight 700, color #e8eefc
Time: fontSize 12px, color rgba(167,177,195,0.6), marginTop 3px

Doctor dot: width 8px, height 8px, borderRadius 50%, background {docColor}
Doctor name: fontSize 12px, fontWeight 600
Room info: fontSize 10px, color rgba(167,177,195,0.4), marginTop 2px

Book button:
  padding: 8px 16px
  borderRadius: 8px
  fontSize: 11px
  fontWeight: 700
  background: rgba(16,185,129,0.15)
  border: 1px solid rgba(16,185,129,0.3)
  color: #10b981
  whiteSpace: nowrap
```

---

## 11. Notification Panel (#fm-notif-panel)

```
position: fixed
top: 56px, right: 16px
width: 380px
maxHeight: 500px
background: #131c2e
border: 1px solid rgba(255,255,255,0.08)
borderRadius: 14px
boxShadow: 0 12px 40px rgba(0,0,0,0.5)
zIndex: 10001
overflow: hidden
animation: fm-slide-in 0.15s ease

Header:
  padding: 14px 16px
  borderBottom: 1px solid rgba(255,255,255,0.06)
  Title: fontSize 14px, fontWeight 800, color #f1f5f9
  Mark all read: color #4cc9ff, fontSize 11px, fontWeight 600

Notification item:
  padding: 12px 16px
  borderBottom: 1px solid rgba(255,255,255,0.03)
  background: transparent (read) | rgba(76,201,255,0.03) (unread)
  cursor: pointer
  display: flex
  gap: 10px
  alignItems: flex-start

  Icon: fontSize 16px, flexShrink 0, marginTop 2px
  Title: fontSize 12px, fontWeight 700
    Read: color #9ca3af
    Unread: color #f1f5f9
  Body: fontSize 11px, color #6b7280, marginTop 2px
  Time: fontSize 10px, color #4b5563, marginTop 3px
  Unread dot: width 8px, height 8px, borderRadius 4px, background #4cc9ff
```

---

## 12. Archive Page

### Page Overlay
```
Same as OP-Prep: position fixed, top 64px, left {sidebarW}px, right 0, bottom 0, background #0f1623, zIndex 999
```

### Search Input
```
width: 100%
maxWidth: 400px
padding: 10px 16px
borderRadius: 10px
border: 1px solid #1e293b
background: #0b111e
color: #e2e8f0
fontSize: 14px
outline: none
```

### Stats Cards
```
display: flex, gap: 16px, flexWrap: wrap

Card:
  background: #111827
  borderRadius: 12px
  padding: 16px 24px
  minWidth: 140px
  border: 1px solid #1e293b

  Label: fontSize 12px, color #6b7280, marginBottom 4px
  Value: fontSize 28px, fontWeight 700, color {statusColor}

Status colors:
  Lead: #3b82f6
  Active: #22c55e
  Treatment: #a855f7
  Aftercare: #f59e0b
  Archived: #6b7280
  Total: #f1f5f9
```

### Patient Row
```
background: #111827
borderRadius: 12px
padding: 20px 24px
border: 1px solid #1e293b
display: flex
alignItems: center
justifyContent: space-between

Avatar:
  width: 40px, height: 40px
  borderRadius: 50%
  background: #1e293b
  display: flex, alignItems: center, justifyContent: center
  color: #6b7280
  fontWeight: 700
  fontSize: 16px

Name: fontSize 15px, fontWeight 600, color #e2e8f0
Details: fontSize 13px, color #6b7280, marginTop 2px

Date labels: fontSize 12px, color #6b7280
Date values: fontSize 13px, color #94a3b8

Restore button:
  padding: 8px 16px
  borderRadius: 8px
  background: #1e40af
  color: #60a5fa
  border: none
  fontSize: 13px
  fontWeight: 600
  cursor: pointer
  transition: all .15s
```

---

## 13. Auto-Review Card Transformation (fm-cal)

### Auto-assign info box (.fm-auto-info)
```
display: flex
alignItems: center
gap: 8px
padding: 10px 14px
borderRadius: 10px
background: rgba(16,185,129,0.06)
border: 1px solid rgba(16,185,129,0.12)
marginTop: 10px

Pulse dot:
  width: 8px, height: 8px
  borderRadius: 4px
  background: #10b981
  flexShrink: 0
  animation: fm-pulse 2s infinite

Text: fontSize 12px, color #10b981, fontWeight 600
```

---

## 14. AI Support Bot Customization

### Orb Background
```
background: radial-gradient(circle at 30% 30%, rgba(76,201,255,0.25), rgba(10,37,64,0.6))
```

### Bot Emoji Overlay
```
position: absolute
top: 50%, left: 50%
transform: translate(-50%,-50%)
fontSize: 22px
lineHeight: 1
zIndex: 2
filter: drop-shadow(0 0 4px rgba(76,201,255,0.6))
```

---

## 15. Doctor Appointments Panel (within sidebar)

### Termine Tab
```
background: none
border: none
borderBottom: 2px solid transparent
color: #6b7280
padding: 12px 20px
fontSize: 14px
fontWeight: 600
cursor: pointer
fontFamily: inherit
transition: all 0.2s
```

### Appointment Panel
```
display: none (toggled to block)
maxWidth: 640px
margin: 0 auto
padding: 20px 16px
```

### Doctor Portal Hint
```
padding: 14px 16px
borderRadius: 12px
background: rgba(76,201,255,0.04)
border: 1px solid rgba(76,201,255,0.12)
marginBottom: 16px
```

---

## 16. Auto/Manual Mode Banner

```
display: flex
alignItems: center
gap: 10px
padding: 10px 14px
borderRadius: 10px
background: rgba(16,185,129,0.06)
border: 1px solid rgba(16,185,129,0.15)
marginBottom: 12px
```

---

## 17. Decision Helper (Patient Panel overlay)

```
position: fixed
top: {tabRect.top - 44}px
left: {tabRect.left}px
width: {tabRect.width}px
height: 42px
zIndex: 1001
background: #131c2e
borderBottom: 1px solid rgba({rgb},0.2)
display: flex
alignItems: center
padding: 0 24px
gap: 12px
```

---

## 18. Common Animations

```css
@keyframes fmSlide {
  from { transform: translateX(100%) }
  to { transform: translateX(0) }
}

@keyframes fmModalIn {
  from { opacity: 0; transform: translate(-50%,-50%) scale(0.95) }
  to { opacity: 1; transform: translate(-50%,-50%) scale(1) }
}

@keyframes fm-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3-0.4; }
}

@keyframes fm-slide-in {
  /* used for notification panel, detail overlays */
}

@keyframes fmDot {
  0%, 100% { opacity: 1 }
  50% { opacity: 0.3 }
}
```

---

## 19. CSS Class Injections

### Calendar Nav Fix
```css
[data-fm-nav="1"] {
  display: flex !important;
  flex-direction: row !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 16px !important;
  width: 100% !important;
}
```

### Week View Hide React Elements
```css
body.fm-week-active #fm-weekview ~ div:not([id^="fm-"]) { display: none !important; }
body.fm-week-active #fm-weekview ~ table { display: none !important; }
```

---

## 20. Z-Index Hierarchy

```
Tooltip:            99999
Notification panel: 10001
OP-Prep detail:     10000
Drawer/Modal:       9999
Backdrop:           9998
Decision helper:    1001
Page overlays:      999
Week appointments:  2 (hover: 10)
Blocked markers:    1
```

---

## 21. Common Style Patterns

### Standard Card
```
padding: 14px 16px (or 10px 12px for smaller)
borderRadius: 12px (or 10px for smaller)
background: rgba(255,255,255,0.03)
border: 1px solid rgba(255,255,255,0.06)
```

### Standard Button (primary/blue)
```
padding: 8px 16px
borderRadius: 8-10px
fontSize: 12-13px
fontWeight: 700
cursor: pointer
fontFamily: inherit
background: rgba(76,201,255,0.15)
border: 1px solid rgba(76,201,255,0.3)
color: #4cc9ff
```

### Standard Button (success/green)
```
Same structure but:
background: rgba(16,185,129,0.15)
border: 1px solid rgba(16,185,129,0.3)
color: #10b981
```

### Form Input
```
padding: 8-10px 12-14px
borderRadius: 8-10px
fontSize: 12-14px
background: rgba(255,255,255,0.04) | #1a1f2e
border: 1px solid rgba(255,255,255,0.1-0.12)
color: #e8eefc
fontFamily: inherit
outline: none
```

### Section Label
```
fontSize: 11px
color: rgba(167,177,195,0.5)
fontWeight: 600
marginBottom: 4-6px
```

### Section Title (uppercase)
```
fontSize: 10-11px
fontWeight: 700
color: #6b7280 | #9ca3af
textTransform: uppercase
letterSpacing: 0.05em
```
