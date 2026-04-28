# Amazon Seller Scraper — Frontend & UI Design Specification
> **Aesthetic Direction:** Dark Intelligence Tool — Bloomberg Terminal × Linear.app  
> **Tone:** Authoritative, data-forward, premium SaaS  
> **Framework:** React 18 (functional components + hooks)  
> **What makes it unforgettable:** The split-panel layout with a glowing live feed and surgical typography

---

## 1. Design Philosophy

This is not a form. It is a **professional data extraction cockpit**.

Every design decision should reinforce the feeling that the user is operating something powerful and precise. The UI must look like it belongs next to tools like Ahrefs, Semrush, or a trading terminal — not a weekend side project.

**Three design pillars:**
1. **Clarity** — Data is the hero. Typography and layout serve legibility above all.
2. **Trust** — Dark backgrounds, tight grids, and monospaced data fields signal professionalism.
3. **Feedback** — Every action has an immediate, satisfying visual response.

---

## 2. Typography

```css
/* Import in <head> */
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:wght@300;400;500&family=JetBrains+Mono:wght@400;500&display=swap');
```

| Role | Font | Weight | Size | Use |
|---|---|---|---|---|
| App Title / Hero | `Syne` | 800 | 28px | App name, section titles |
| UI Labels / Body | `DM Sans` | 400/500 | 13–15px | All UI text, descriptions |
| Data / ASINs / IDs | `JetBrains Mono` | 400/500 | 12–13px | ASINs, seller IDs, CSV values |
| Status badges | `DM Sans` | 500 | 11px | Caps, letter-spacing: 0.08em |

**Typography rules:**
- Headings use `Syne` — it has a sharp geometric energy that feels editorial and serious
- All data values (ASINs, IDs, addresses) render in `JetBrains Mono` — monospace creates visual alignment and legibility in dense data contexts
- Never use `Inter`, `Roboto`, or `Arial`
- Body text line-height: `1.6`; data rows line-height: `1.4`

---

## 3. Color System

```css
:root {
  /* Backgrounds */
  --bg-void:        #0A0B0E;   /* Page background — near-black with blue tint */
  --bg-base:        #0F1117;   /* Panel backgrounds */
  --bg-surface:     #161B27;   /* Cards, input fields */
  --bg-elevated:    #1E2535;   /* Hovered rows, focused states */
  --bg-overlay:     #252D3D;   /* Tooltips, dropdowns */

  /* Borders */
  --border-subtle:  #1F2737;   /* Dividers, field outlines at rest */
  --border-default: #2C3650;   /* Default card borders */
  --border-active:  #3D5A8A;   /* Focused inputs, active panels */

  /* Text */
  --text-primary:   #E8EDF5;   /* Main readable text */
  --text-secondary: #8A95A8;   /* Labels, hints */
  --text-muted:     #4A5568;   /* Placeholder, disabled */
  --text-inverse:   #0A0B0E;   /* Text on bright backgrounds */

  /* Accent — Amber Gold (elevated Amazon orange) */
  --accent:         #F5A623;   /* Primary CTA, highlights */
  --accent-dim:     #C47D0E;   /* Hover on accent */
  --accent-glow:    rgba(245, 166, 35, 0.15);  /* Glow effect bg */
  --accent-subtle:  rgba(245, 166, 35, 0.08);  /* Subtle accent tint */

  /* Status */
  --status-success: #22C77A;
  --status-success-bg: rgba(34, 199, 122, 0.08);
  --status-error:   #F5564A;
  --status-error-bg: rgba(245, 86, 74, 0.08);
  --status-pending: #6B8CFF;
  --status-pending-bg: rgba(107, 140, 255, 0.08);
  --status-warning: #F5A623;
  --status-warning-bg: rgba(245, 166, 35, 0.08);

  /* Spacing scale */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 24px;
  --space-6: 32px;
  --space-7: 48px;
  --space-8: 64px;

  /* Radius */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;

  /* Shadows */
  --shadow-card: 0 1px 3px rgba(0,0,0,0.4), 0 4px 16px rgba(0,0,0,0.3);
  --shadow-elevated: 0 8px 32px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.4);
  --shadow-accent: 0 0 24px rgba(245, 166, 35, 0.2);
  --shadow-glow-success: 0 0 12px rgba(34, 199, 122, 0.3);
}
```

---

## 4. Layout Architecture

### Overall Structure

```
┌──────────────────────────────────────────────────────────────────────────┐
│  TOPBAR  [logo + title]                        [status pill] [docs link] │
├────────────────────────┬─────────────────────────────────────────────────┤
│                        │                                                  │
│   LEFT PANEL           │   RIGHT PANEL                                   │
│   (380px fixed)        │   (flexible, scrollable)                        │
│                        │                                                  │
│   • Marketplace tabs   │   [Empty state / Progress feed / Results table] │
│   • ASIN input area    │                                                  │
│   • ASIN chip list     │                                                  │
│   • Options accordion  │                                                  │
│   • Scrape CTA         │                                                  │
│                        │                                                  │
├────────────────────────┴─────────────────────────────────────────────────┤
│  STATUSBAR  [run count] [last run time] [records found]                  │
└──────────────────────────────────────────────────────────────────────────┘
```

### CSS Grid Setup

```css
body {
  background: var(--bg-void);
  color: var(--text-primary);
  font-family: 'DM Sans', sans-serif;
  margin: 0;
  height: 100vh;
  overflow: hidden;
  display: grid;
  grid-template-rows: 52px 1fr 36px;
  grid-template-columns: 1fr;
}

.app-layout {
  display: grid;
  grid-template-columns: 380px 1fr;
  grid-template-rows: 1fr;
  overflow: hidden;
}
```

---

## 5. Component Specifications

### 5.1 Topbar

**Height:** 52px  
**Background:** `var(--bg-base)` with a `1px` bottom border in `var(--border-subtle)`  
**Layout:** `display: flex; align-items: center; padding: 0 24px; justify-content: space-between;`

**Left section:**
```
[🔶 icon] Amazon Seller Intel
```
- Icon: 20px SVG square with rounded corners, filled `var(--accent)`, white "A" letter inside
- Title: `Syne 700 18px` in `var(--text-primary)`
- Subtitle next to title: `DM Sans 400 12px` in `var(--text-muted)` — `"Seller Intelligence Extractor"`

**Right section:**
- Status pill: small pill badge
  - Idle: `●  Ready` — dot color `var(--status-success)`, text `var(--text-secondary)`
  - Running: `●  Running` — dot animated pulse, amber color
  - CSS for pulse dot:
    ```css
    .pulse-dot {
      width: 6px; height: 6px;
      border-radius: 50%;
      background: var(--accent);
      animation: pulse 1.4s ease-in-out infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(0.7); }
    }
    ```
- Docs link: `DM Sans 400 13px` `var(--text-secondary)` — `"API Docs ↗"` with hover underline

---

### 5.2 Left Panel

**Width:** 380px  
**Background:** `var(--bg-base)`  
**Right border:** `1px solid var(--border-subtle)`  
**Padding:** `24px`  
**Overflow:** `auto` (scrollable if content overflows)

#### A. Section Header Pattern (reused)

```css
.section-label {
  font-family: 'DM Sans', sans-serif;
  font-size: 10px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--text-muted);
  margin-bottom: 10px;
}
```

#### B. Marketplace Selector

Visual: Two adjacent tab buttons, full-width combined.

```
┌──────────────────┬──────────────────┐
│  🇪🇸  Amazon.es  │  🇬🇧  Amazon.co.uk│
└──────────────────┴──────────────────┘
```

- Each tab: `height: 40px`, `flex: 1`, `border: 1px solid var(--border-default)`, `border-radius: var(--radius-md)` (outer corners only)
- **Inactive:** `background: var(--bg-surface)`, `color: var(--text-secondary)`, `font-size: 13px`
- **Active:** `background: var(--accent-subtle)`, `border-color: var(--accent)`, `color: var(--accent)`, `font-weight: 500`
- Both can be active simultaneously (multi-select)
- Transition: `all 0.15s ease`

#### C. ASIN Input Area

**Label:** `SECTION LABEL` → `"INPUT ASINS"`

**Textarea:**
```css
.asin-textarea {
  width: 100%;
  min-height: 120px;
  background: var(--bg-surface);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  padding: 12px 14px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  color: var(--text-primary);
  resize: vertical;
  box-sizing: border-box;
  outline: none;
  transition: border-color 0.15s ease;
  line-height: 1.7;
}
.asin-textarea::placeholder {
  color: var(--text-muted);
  font-family: 'DM Sans', sans-serif;
  font-size: 13px;
}
.asin-textarea:focus {
  border-color: var(--border-active);
  box-shadow: 0 0 0 3px rgba(61, 90, 138, 0.2);
}
```

Placeholder text:
```
B0CLQ6P3BS
B09XYZ1234
B08ABC5678

Paste ASINs, one per line
```

**Below textarea — helper row:**
```
[12 ASINs detected]                    [Clear ✕]
```
- Left: `DM Sans 12px var(--text-muted)` — live count as user types
- Right: `Clear ✕` — `DM Sans 12px var(--accent)` — hover: underline

#### D. ASIN Chip List

Displayed below the textarea as parsed ASINs are detected.

```
[B0CLQ6P3BS ✕]  [B09XYZ1234 ✕]  [B08ABC5678 ✕]
[INVALID_X ✕]   ...
```

**Chip base styles:**
```css
.asin-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px 4px 8px;
  background: var(--bg-elevated);
  border: 1px solid var(--border-default);
  border-radius: 20px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: var(--text-secondary);
  margin: 3px;
  transition: all 0.12s ease;
}
.asin-chip:hover {
  border-color: var(--border-active);
  color: var(--text-primary);
}
.asin-chip.valid {
  border-color: rgba(34, 199, 122, 0.3);
  color: var(--status-success);
  background: var(--status-success-bg);
}
.asin-chip.invalid {
  border-color: rgba(245, 86, 74, 0.3);
  color: var(--status-error);
  background: var(--status-error-bg);
  text-decoration: line-through;
}
.chip-remove {
  color: var(--text-muted);
  cursor: pointer;
  font-size: 10px;
  line-height: 1;
}
.chip-remove:hover { color: var(--status-error); }
```

#### E. Options Accordion

Collapsed by default, expands on click.

```
⚙  Advanced Options                              [▾]
─────────────────────────────────────────────────────
  Request delay        [▬▬▬○──────────] 500ms
  Proxy                [●] Residential  [○] Datacenter
  Retry on failure     [toggle ON]
  Language override    [en ▾]
```

**Toggle component:**
```css
.toggle {
  width: 36px; height: 20px;
  background: var(--bg-overlay);
  border-radius: 10px;
  border: 1px solid var(--border-default);
  position: relative;
  cursor: pointer;
  transition: background 0.2s ease;
}
.toggle.on { background: var(--accent); border-color: var(--accent); }
.toggle-thumb {
  width: 14px; height: 14px;
  background: var(--text-muted);
  border-radius: 50%;
  position: absolute;
  top: 2px; left: 2px;
  transition: transform 0.2s ease, background 0.2s ease;
}
.toggle.on .toggle-thumb {
  transform: translateX(16px);
  background: var(--text-inverse);
}
```

**Range slider:**
```css
input[type=range] {
  -webkit-appearance: none;
  width: 100%;
  height: 4px;
  background: var(--bg-overlay);
  border-radius: 2px;
  outline: none;
}
input[type=range]::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 14px; height: 14px;
  border-radius: 50%;
  background: var(--accent);
  cursor: pointer;
  box-shadow: 0 0 6px rgba(245,166,35,0.5);
}
```

#### F. Primary CTA Button

```css
.btn-scrape {
  width: 100%;
  height: 48px;
  background: var(--accent);
  color: var(--text-inverse);
  font-family: 'DM Sans', sans-serif;
  font-weight: 600;
  font-size: 15px;
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 20px;
  transition: background 0.15s ease, box-shadow 0.15s ease, transform 0.1s ease;
  letter-spacing: 0.01em;
}
.btn-scrape:hover:not(:disabled) {
  background: var(--accent-dim);
  box-shadow: var(--shadow-accent);
  transform: translateY(-1px);
}
.btn-scrape:active:not(:disabled) {
  transform: translateY(0);
}
.btn-scrape:disabled {
  background: var(--bg-elevated);
  color: var(--text-muted);
  cursor: not-allowed;
  box-shadow: none;
}
.btn-scrape.running {
  background: var(--bg-elevated);
  color: var(--accent);
  border: 1px solid var(--accent);
  cursor: not-allowed;
}
```

**Button states:**
- **Idle:** Amber fill — `🔍 Scrape Seller Info`
- **Disabled (no input):** Gray muted — `Scrape Seller Info` (icon omitted)
- **Running:** Dark with amber border — `⏳ Running... (3 / 8)`
- **Done:** Brief success state for 1.5s — `✓ Complete — 8 records found` (green)

---

### 5.3 Right Panel

**Background:** `var(--bg-void)`  
**Overflow:** `auto`  
**Padding:** `32px`

This panel has **three distinct states** which swap via React conditional rendering:

---

#### State 1: Empty / Idle

Centered vertically and horizontally in the panel.

```
        ╔═══════════════════════════╗
        ║                           ║
        ║   [large grid icon SVG]   ║
        ║                           ║
        ║   No data yet             ║
        ║   Add ASINs and press     ║
        ║   Scrape to get started   ║
        ║                           ║
        ║   [—— or try an example ——]║
        ║   [B0CLQ6P3BS] [B09XYZ]  ║
        ╚═══════════════════════════╝
```

```css
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 12px;
  text-align: center;
}
.empty-icon {
  width: 64px; height: 64px;
  opacity: 0.12;
  /* SVG: 8x8 dot grid, amber fill */
}
.empty-title {
  font-family: 'Syne', sans-serif;
  font-size: 20px;
  color: var(--text-primary);
  opacity: 0.5;
}
.empty-sub {
  font-size: 13px;
  color: var(--text-muted);
  max-width: 280px;
  line-height: 1.6;
}
.example-chips {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}
.example-chip {
  padding: 6px 14px;
  background: var(--bg-surface);
  border: 1px dashed var(--border-default);
  border-radius: 20px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.15s ease;
}
.example-chip:hover {
  border-color: var(--accent);
  color: var(--accent);
  background: var(--accent-subtle);
}
```

---

#### State 2: Running — Live Feed

Displayed as soon as the run starts.

**Top: Progress Header**
```
Extracting seller intelligence...               3 / 8 ASINs
[████████████████░░░░░░░░░░░░░░░░░░░░]  37%   ~42s remaining
```

```css
.progress-bar-track {
  width: 100%;
  height: 6px;
  background: var(--bg-elevated);
  border-radius: 3px;
  margin: 12px 0 8px;
  overflow: hidden;
}
.progress-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--accent-dim), var(--accent));
  border-radius: 3px;
  transition: width 0.4s ease;
  box-shadow: 0 0 10px rgba(245, 166, 35, 0.4);
}
```

**Live Log Feed:**

Each ASIN gets a log row. New rows animate in from below.

```
┌──────────────────────────────────────────────────────────┐
│ ✅  B0CLQ6P3BS   •  Amazon.es   "ACME Electronics SL"   │
│     Seller ID: AXAQHT7DI1XVN  •  Found 8/10 fields      │
├──────────────────────────────────────────────────────────┤
│ ✅  B09XYZ1234   •  Amazon.co.uk  "TechStore Ltd"        │
│     Seller ID: B3K72DP9A1XM1  •  Found 10/10 fields     │
├──────────────────────────────────────────────────────────┤
│ ⏳  B08ABC5678   •  Amazon.es    Fetching seller page... │
│     Seller ID: discovered ✓  •  Loading /sp? ...        │
├──────────────────────────────────────────────────────────┤
│ ○   B07DEF9012   Queued                                  │
│ ○   B06GHI3456   Queued                                  │
└──────────────────────────────────────────────────────────┘
```

```css
.log-feed {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-top: 20px;
}
.log-row {
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  padding: 12px 16px;
  display: grid;
  grid-template-columns: 20px 1fr;
  gap: 12px;
  align-items: start;
  animation: slideUp 0.25s ease forwards;
  opacity: 0;
}
@keyframes slideUp {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}
.log-row.success { border-left: 3px solid var(--status-success); }
.log-row.running { border-left: 3px solid var(--accent); }
.log-row.error   { border-left: 3px solid var(--status-error); }
.log-row.queued  { border-left: 3px solid var(--border-subtle); opacity: 0.5; }

.log-asin {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-primary);
}
.log-marketplace-badge {
  font-size: 10px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding: 2px 7px;
  border-radius: 4px;
  background: var(--bg-overlay);
  color: var(--text-secondary);
  margin-left: 8px;
}
.log-seller-name {
  font-family: 'DM Sans', sans-serif;
  font-size: 13px;
  font-weight: 500;
  color: var(--accent);
  margin-left: 8px;
}
.log-meta {
  font-size: 11px;
  color: var(--text-muted);
  font-family: 'JetBrains Mono', monospace;
  margin-top: 4px;
}
.log-status-spinner {
  width: 14px; height: 14px;
  border: 2px solid var(--bg-overlay);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
```

---

#### State 3: Results — Data Table

**Results toolbar:**
```
8 sellers extracted  ·  Amazon.es × 5  ·  Amazon.co.uk × 3
[Search / filter...]                     [⬇ Download CSV]  [⬇ JSON]
```

```css
.results-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  gap: 12px;
}
.results-count {
  font-size: 13px;
  color: var(--text-secondary);
  white-space: nowrap;
}
.results-count strong {
  color: var(--text-primary);
  font-weight: 600;
}
.search-input {
  flex: 1;
  max-width: 280px;
  height: 34px;
  background: var(--bg-surface);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  padding: 0 12px;
  font-family: 'DM Sans', sans-serif;
  font-size: 13px;
  color: var(--text-primary);
  outline: none;
  transition: border-color 0.15s ease;
}
.search-input:focus { border-color: var(--border-active); }
.search-input::placeholder { color: var(--text-muted); }
```

**Download Button:**
```css
.btn-download {
  height: 34px;
  padding: 0 16px;
  background: var(--accent);
  color: var(--text-inverse);
  font-family: 'DM Sans', sans-serif;
  font-weight: 600;
  font-size: 13px;
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: background 0.15s ease, box-shadow 0.15s ease;
}
.btn-download:hover {
  background: var(--accent-dim);
  box-shadow: 0 0 16px rgba(245, 166, 35, 0.25);
}
.btn-download-secondary {
  height: 34px;
  padding: 0 14px;
  background: transparent;
  color: var(--text-secondary);
  font-size: 13px;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.15s ease;
}
.btn-download-secondary:hover {
  border-color: var(--border-active);
  color: var(--text-primary);
}
```

**Data Table:**

```css
.data-table-wrapper {
  width: 100%;
  overflow-x: auto;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
}
.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  min-width: 900px;
}
.data-table thead tr {
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border-default);
}
.data-table th {
  padding: 10px 16px;
  text-align: left;
  font-family: 'DM Sans', sans-serif;
  font-size: 10px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--text-muted);
  white-space: nowrap;
  user-select: none;
  cursor: pointer;
}
.data-table th:hover { color: var(--text-secondary); }
.data-table th.sorted { color: var(--accent); }

.data-table tbody tr {
  border-bottom: 1px solid var(--border-subtle);
  transition: background 0.1s ease;
  animation: rowIn 0.2s ease forwards;
  opacity: 0;
}
.data-table tbody tr:nth-child(n) { animation-delay: calc(n * 30ms); }
@keyframes rowIn {
  from { opacity: 0; transform: translateX(-4px); }
  to   { opacity: 1; transform: translateX(0); }
}
.data-table tbody tr:hover { background: var(--bg-elevated); }
.data-table tbody tr:last-child { border-bottom: none; }

.data-table td {
  padding: 12px 16px;
  color: var(--text-secondary);
  vertical-align: top;
  max-width: 200px;
}
.data-table td.monospace {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  color: var(--text-primary);
}
.data-table td.empty { color: var(--text-muted); font-style: italic; }
```

**Column definitions & widths:**

| Column | Width | Cell Style |
|---|---|---|
| ASIN | 120px | `JetBrains Mono` amber color |
| Marketplace | 90px | Flag emoji + badge |
| Business Name | 180px | `DM Sans 500` primary text |
| Email | 180px | `JetBrains Mono` link styled |
| Phone | 130px | `JetBrains Mono` |
| Customer Service Address | 200px | `DM Sans` muted, 2-line clamp |
| Business Address | 200px | `DM Sans` muted, 2-line clamp |
| VAT Number | 130px | `JetBrains Mono` |
| Rating | 80px | Star badge (see below) |

**ASIN cell:**
```css
.cell-asin {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  font-weight: 500;
  color: var(--accent);
  letter-spacing: 0.04em;
}
```

**Marketplace badge:**
```css
.badge-marketplace {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
.badge-es { background: rgba(255,196,0,0.1); color: #FFB800; }
.badge-uk { background: rgba(107,140,255,0.1); color: var(--status-pending); }
```

**Rating cell:**
```css
.rating-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
}
.rating-high { background: var(--status-success-bg); color: var(--status-success); }  /* ≥90% */
.rating-mid  { background: var(--status-warning-bg); color: var(--status-warning); }  /* 70–89% */
.rating-low  { background: var(--status-error-bg);   color: var(--status-error);   }  /* <70% */
```

---

### 5.4 Status Bar

**Height:** 36px  
**Background:** `var(--bg-base)`  
**Top border:** `1px solid var(--border-subtle)`  
**Padding:** `0 24px`

```
Total runs: 3  ·  Last run: 2 min ago  ·  Records extracted: 24  ·  Powered by Apify
```

All text: `DM Sans 11px var(--text-muted)`  
Separators: `·` in `var(--border-default)`  
"Powered by Apify" has amber color hover

---

## 6. Micro-interactions & Animations

### Page Load
Stagger the two panels in on mount:
```css
.left-panel  { animation: fadeSlideIn 0.3s ease 0.05s forwards; opacity: 0; }
.right-panel { animation: fadeSlideIn 0.3s ease 0.15s forwards; opacity: 0; }
@keyframes fadeSlideIn {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
```

### ASIN Chip Entry
New chips pop in with scale:
```css
.asin-chip { animation: chipPop 0.15s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
@keyframes chipPop {
  from { opacity: 0; transform: scale(0.7); }
  to   { opacity: 1; transform: scale(1); }
}
```

### CTA Button Click
Visual ripple on click using `::after` pseudo-element radial gradient animation.

### Completed Run
After all ASINs finish, flash the results panel with a brief green border pulse:
```css
@keyframes successPulse {
  0%   { box-shadow: 0 0 0 0 rgba(34,199,122,0.4); }
  70%  { box-shadow: 0 0 0 12px rgba(34,199,122,0); }
  100% { box-shadow: none; }
}
```

### Table Row Hover
Rows lift slightly on hover using box-shadow — no layout shift:
```css
.data-table tbody tr:hover {
  background: var(--bg-elevated);
  box-shadow: inset 3px 0 0 var(--accent);  /* Left accent stripe on hover */
}
```

---

## 7. Responsive Behavior

### Desktop (≥1200px)
Default split layout — left panel 380px, right panel fills remainder.

### Tablet (768–1199px)
Stack layout — left panel becomes full-width top section (collapsed by default), right panel below. Toggle button to expand/collapse input section.

### Mobile (<768px)
- Left panel = bottom drawer (slide up)
- Results table replaced by **card list**:
```
┌───────────────────────────────────┐
│ B0CLQ6P3BS          🇪🇸  Amazon.es │
│ ACME Electronics SL               │
│ ─────────────────────────────     │
│ 📧  info@acme.es                  │
│ 📞  +34 912 345 678               │
│ 📍  Calle Gran Vía 28, Madrid     │
│ 🏢  ESB12345678                   │
│ ⭐  96%                     [↓]  │
└───────────────────────────────────┘
```
- Each card has a `▾` expand toggle to show all fields

---

## 8. Scrollbar Styling

```css
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: var(--bg-void); }
::-webkit-scrollbar-thumb {
  background: var(--bg-overlay);
  border-radius: 3px;
}
::-webkit-scrollbar-thumb:hover { background: var(--border-active); }
```

---

## 9. Error States

### ASIN Validation Error (inline)
```
⚠  "BADASIN" is not a valid ASIN format (must be 10 alphanumeric characters)
```
Shown as a small `DM Sans 11px var(--status-error)` line below the textarea.

### Scrape Failure (row-level)
Log row shows:
```
❌  B0CLQ6P3BS  •  Amazon.es  —  Failed after 2 retries
    Error: Seller page returned 503. ASIN may be unavailable in this market.
```

### Global Error Banner
If the Apify API itself fails:
```css
.error-banner {
  background: var(--status-error-bg);
  border: 1px solid rgba(245, 86, 74, 0.3);
  border-radius: var(--radius-md);
  padding: 12px 16px;
  color: var(--status-error);
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 10px;
}
```

---

## 10. Prompt for Minimax M2.5

Use this exact prompt to generate the frontend code:

```
You are an expert frontend engineer specializing in dark-themed professional SaaS tools.

Build a complete, single-file React application (App.jsx) for an "Amazon Seller Info Scraper" tool. 

STRICT DESIGN REQUIREMENTS:
- Dark theme throughout — background #0A0B0E, surfaces #161B27
- Fonts: Syne (headings, 700/800), DM Sans (UI text, 300/400/500), JetBrains Mono (all data/ASINs/IDs)
- Accent color: #F5A623 (amber gold) — used ONLY for CTAs, active states, and data highlights
- No white backgrounds anywhere. No purple gradients. No generic AI aesthetics.
- All CSS written as a <style> block inside the JSX file using CSS variables

LAYOUT: Fixed split — 380px left panel (input) + flexible right panel (results).
TOP BAR: 52px. STATUS BAR: 36px at bottom.

LEFT PANEL must include:
1. Marketplace toggle tabs (Amazon.es 🇪🇸 and Amazon.co.uk 🇬🇧) — both selectable
2. Multi-line ASIN textarea with JetBrains Mono font + live validation
3. ASIN chip list (each chip removable, green if valid, red if invalid 10-char format)
4. Collapsible Advanced Options (delay slider, proxy toggle, retry toggle)
5. Primary CTA button with idle/running/done states

RIGHT PANEL must include:
1. Empty state — centered, minimal, with example ASIN chips that auto-fill the input
2. Running state — animated progress bar + live log feed (one row per ASIN with status icons)
3. Results state — data table with columns: ASIN, Marketplace badge, Business Name, Email, Phone, Customer Service Address, Business Address, VAT Number, Rating badge
4. Download CSV button and search/filter input in the toolbar above table

ANIMATIONS:
- Page load: stagger left + right panel fadeSlideIn
- ASIN chips: chipPop scale animation on entry
- Log rows: slideUp animation with staggered delay
- Table rows: rowIn animation on reveal
- CTA button: translateY(-1px) on hover + amber glow

Use mock data for the results state so the component is demonstrable immediately. 
The CSV download must convert the mock data to a real downloadable .csv file in the browser.
Use React useState and useEffect hooks — no external libraries.

Output: a single App.jsx file with all CSS in a <style> tag, all fonts loaded from Google Fonts via a useEffect that injects a <link> tag. Make it stunning.
```

---

## 11. File Structure

```
/src
  App.jsx          ← Single file: all components + all CSS-in-style-tag
  main.jsx         ← ReactDOM.createRoot mount only
  
/public
  index.html       ← Minimal, dark background (#0A0B0E) on body
```

`index.html` body style:
```html
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #0A0B0E; overflow: hidden; }
</style>
```
