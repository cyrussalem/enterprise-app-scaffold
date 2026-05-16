# PRD: Frontend Design System & UI Overhaul

**Status:** Draft  
**Date:** 2026-05-11  
**Owner:** Engineering  
**Scope:** `web/src/` — all pages, components, and theme configuration

---

## 1. Problem Statement

The current frontend is functional but visually generic. It uses Material-UI defaults with minimal theming: a flat top navigation bar, plain cards, no motion, no hierarchy in color, and no visual identity beyond a dark background. A user landing on the Fleet Overview page for the first time would see it as an internal CRUD tool, not as a premium IoT intelligence platform.

The goal of this PRD is to define every design decision needed to transform this into a UI that stops people in their tracks — something that reads as premium, purposeful, and technically confident at first glance.

---

## 2. Design Vision

**Aesthetic target:** Precision industrial control room translated into modern web glass. Dark, layered, signal-dense. Not a generic SaaS dashboard — an instrument panel built for operators who trust it with real infrastructure. Every design decision must earn its place. Influences: aerospace avionics UI, SCADA control panels, and the precision of Swiss editorial design — not developer tooling.

**The one unforgettable thing:** A live radar-sweep ring animation on the Fleet Overview map. A translucent arc pulses outward from the map center every 4 seconds — matching the status glow color of the most critical active alert — then fades. Pure CSS, zero JS, no performance cost. Visitors remember it.

**Three first-impression moments:**
1. On the Fleet Overview map: a radar-sweep ring pulses outward from the centroid of active devices every 4 seconds in the dominant alert severity color — CSS `@keyframes` only
2. KPI numbers count up from 0 on page load with a spring easing, the display font's distinct character shapes making the numbers feel designed rather than rendered
3. On hover over any GlassCard, a 1px hairline border traces around the card edge using a conic-gradient mask — the "border-shimmer" effect (CSS only, `@property` animated)

---

## 3. Design Principles

| Principle | Implementation rule |
|-----------|-------------------|
| **Depth over flatness** | Every surface layer has its own translucency, blur, and shadow stack — background → panel → card → elevated card |
| **Color is data** | Hue always carries meaning (indigo = primary action, emerald = healthy, amber = warning, rose = critical). Never use color purely decoratively |
| **Motion is feedback** | Every state change (load, update, navigate, hover) has a transition. Nothing pops in. Nothing snaps |
| **Density without clutter** | Compact spacing on data-heavy pages; generous whitespace on auth pages. Line-height and letter-spacing vary by type role |
| **Glow as status** | Health, status, and alert severity are communicated through ambient box-shadow glow colors, not just icons or text labels |

---

## 4. Design Tokens

### 4.1 Color Palette

The palette is extended into a full semantic token system. All existing hardcoded hex values scattered across page files must be replaced with theme tokens.

#### Base Scales (do not use directly in components)

```
Slate:   50→950  (background layers)
Indigo:  50→950  (primary brand)
Violet:  50→950  (accent / gradient terminus)
Emerald: 50→950  (success / online)
Amber:   50→950  (warning)
Rose:    50→950  (error / critical)
Sky:     50→950  (info / telemetry)
```

#### Semantic Tokens (use in all components)

**Backgrounds (layered depth model)**
| Token | Value | Usage |
|-------|-------|-------|
| `bg.canvas` | `#060b18` | Page background, deepest layer |
| `bg.surface` | `#0d1526` | Sidebar, sheet backgrounds |
| `bg.panel` | `#111d35` | Card background |
| `bg.elevated` | `#162040` | Hover states, dropdowns, tooltips |
| `bg.overlay` | `rgba(16,26,52,0.85)` | Glassmorphism card base with `backdrop-filter: blur(12px)` |

**Canvas atmosphere (applied once in `GlobalStyles`, never a solid flat color):**

The canvas background is `bg.canvas` plus two layered effects rendered via CSS pseudo-elements on `body`:
1. **Noise texture overlay** — a 200×200px seamlessly repeating SVG noise pattern at `opacity: 0.035`, `mix-blend-mode: overlay`. Encoded as an inline `data:` URI to avoid a network request.
2. **Ambient radial gradient** — a single large radial gradient centered top-right: `radial-gradient(ellipse 80% 60% at 75% -10%, rgba(99,102,241,0.07) 0%, transparent 70%)`. Adds depth without visual noise.

```css
body::before {
  content: '';
  position: fixed;
  inset: 0;
  background-image: url("data:image/svg+xml,..."); /* noise SVG */
  opacity: 0.035;
  mix-blend-mode: overlay;
  pointer-events: none;
  z-index: 0;
}
body::after {
  content: '';
  position: fixed;
  inset: 0;
  background: radial-gradient(ellipse 80% 60% at 75% -10%, rgba(99,102,241,0.07) 0%, transparent 70%);
  pointer-events: none;
  z-index: 0;
}
```

All page content sits at `z-index: 1` or above. The SVG noise data URI is generated once in `src/lib/noiseTexture.ts` and imported into `GlobalStyles`.

**Brand**
| Token | Value | Usage |
|-------|-------|-------|
| `brand.primary` | `#6366f1` | Primary actions, active nav items |
| `brand.primaryGlow` | `rgba(99,102,241,0.35)` | Box-shadow for primary elements |
| `brand.gradient` | `linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)` | Buttons, active indicators, logo |
| `brand.secondary` | `#f59e0b` | Secondary actions |

**Status (used for chips, glow, indicators)**
| Token | Value | Glow value |
|-------|-------|-----------|
| `status.online` | `#10b981` | `rgba(16,185,129,0.3)` |
| `status.warning` | `#f59e0b` | `rgba(245,158,11,0.3)` |
| `status.offline` | `#f43f5e` | `rgba(244,63,94,0.3)` |
| `status.unknown` | `#64748b` | `rgba(100,116,139,0.2)` |

**Text**
| Token | Value |
|-------|-------|
| `text.primary` | `#f1f5f9` |
| `text.secondary` | `#94a3b8` |
| `text.tertiary` | `#475569` |
| `text.disabled` | `#334155` |
| `text.gradient` | `linear-gradient(135deg, #e0e7ff, #c4b5fd)` (applied via `background-clip: text`) |

**Borders**
| Token | Value |
|-------|-------|
| `border.subtle` | `rgba(148,163,184,0.08)` |
| `border.default` | `rgba(148,163,184,0.14)` |
| `border.strong` | `rgba(148,163,184,0.25)` |
| `border.brand` | `rgba(99,102,241,0.5)` |

### 4.2 Typography System

**Three-font system — pairing a geometric display font with a refined body font and a purposeful monospace for data:**

| Role | Family | Rationale |
|------|--------|-----------|
| Display / headings | **Syne** | Geometric variable display font with distinctive, slightly condensed forms. Feels architectural and precise — not generic SaaS. Weights 400–800 all on a single axis. |
| Body / UI | **Manrope** | Modern geometric sans-serif. Warmer than Inter, better for dense data UIs at small sizes. Distinct enough to register as a design decision. |
| Data / code | **JetBrains Mono** | Purpose-built for displaying identifiers, numbers, and telemetry. The rounded curves soften what would otherwise feel cold. |

Import all three from Bunny Fonts (GDPR-friendly CDN, drop Google Fonts). Replace `index.html` Roboto import with:
```html
<link rel="preconnect" href="https://fonts.bunny.net">
<link href="https://fonts.bunny.net/css?family=syne:400,500,600,700,800;manrope:400,500,600,700;jetbrains-mono:400,500&display=swap" rel="stylesheet">
```

| Role | Family | Size | Weight | Line height | Letter spacing | Usage |
|------|--------|------|--------|-------------|----------------|-------|
| `display` | Syne | 48px | 800 | 1.1 | -0.03em | Hero numbers, login headline |
| `h1` | Syne | 32px | 700 | 1.2 | -0.02em | Page titles |
| `h2` | Syne | 24px | 600 | 1.3 | -0.015em | Section headers |
| `h3` | Syne | 18px | 600 | 1.4 | -0.01em | Card titles |
| `body1` | Manrope | 14px | 400 | 1.6 | 0 | Body copy |
| `body2` | Manrope | 13px | 400 | 1.6 | 0 | Secondary body, table cells |
| `caption` | Manrope | 11px | 500 | 1.4 | 0.05em | Labels, timestamps, chips |
| `mono` | JetBrains Mono | 13px | 400 | 1.5 | 0 | Serial numbers, IDs, telemetry |

KPI values use `display` size (Syne 800) with gradient text treatment. Serial numbers, IP addresses, device IDs, and all raw data values use JetBrains Mono — this contrast between display headings and data values is a signature of the design.

### 4.3 Spacing & Layout

- Base unit: `4px` (MUI default — keep)
- Content max-width: `1440px` (up from `lg = 1200px`)
- Sidebar width (expanded): `240px`
- Sidebar width (collapsed): `64px`
- Page content padding: `32px` horizontal, `24px` top (below page header)
- Card padding: `20px`
- Card gap (grid): `16px`

### 4.4 Elevation & Shadow System

Replace MUI's default shadow scale with custom glow-aware shadows:

```typescript
shadows: [
  'none',
  '0 1px 3px rgba(0,0,0,0.4)',                              // 1 – subtle lift
  '0 2px 8px rgba(0,0,0,0.5)',                              // 2 – card default
  '0 4px 16px rgba(0,0,0,0.5), 0 0 0 1px rgba(148,163,184,0.08)', // 3 – card hover
  '0 8px 32px rgba(0,0,0,0.6)',                              // 4 – modal
  '0 16px 48px rgba(0,0,0,0.7)',                             // 5 – top sheet
  // 6-24: brand glow variants (applied manually via sx)
]
```

Brand-glow shadow (applied on hover or active state):
```
0 0 0 1px rgba(99,102,241,0.4), 0 4px 24px rgba(99,102,241,0.2)
```

Status-glow shadow (applied on status chips / indicator rings):
```
0 0 12px {status.{color}Glow}
```

### 4.5 Border Radius

| Scale | Value | Usage |
|-------|-------|-------|
| `sm` | `6px` | Chips, badges, small buttons |
| `md` | `10px` | Cards, inputs (default) |
| `lg` | `14px` | Modal sheets, sidebar |
| `xl` | `20px` | Feature cards, login panel |
| `full` | `9999px` | Pills, avatar rings |

### 4.6 Motion System

**Library:** Framer Motion (add `framer-motion` dependency)

| Token | Duration | Easing | Usage |
|-------|----------|--------|-------|
| `fast` | `120ms` | `easeOut` | Hover color/shadow transitions |
| `base` | `200ms` | `easeInOut` | Button press, chip toggle |
| `smooth` | `300ms` | `cubic-bezier(0.4,0,0.2,1)` | Card entry, tab switch |
| `spring` | `spring(stiffness=300, damping=30)` | n/a | Sidebar collapse, number count-up |
| `page` | `250ms` | `easeOut` | Route transition (fade+slide up 8px) |

**Shared animation variants (define in `src/motion/variants.ts`):**
```typescript
export const fadeUpIn = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' } },
};

export const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};

export const scaleIn = {
  hidden: { opacity: 0, scale: 0.94 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.2, ease: 'easeOut' } },
};
```

**Respect `prefers-reduced-motion`:** wrap all Framer Motion components with a `useReducedMotion()` check and fall back to instant transitions.

---

## 5. Component Specifications

### 5.1 AppShell — Full Redesign

**Current:** Flat top AppBar with two text buttons.  
**Target:** Persistent collapsible sidebar with icon navigation and a minimal top bar.

**Sidebar layout:**
```
┌─────────────────────┐
│  ⬡ Logo mark   ◀   │  ← collapse toggle (icon only on collapse)
├─────────────────────┤
│  ◉ Dashboard        │  ← active item: brand gradient left border + bg highlight
│  ◉ Fleet            │
│  ◉ Devices          │  (future)
│  ◉ Alerts           │  (future)
│  ◉ Settings         │  (future)
├─────────────────────┤
│  ——————————————     │
│  [avatar] user@…    │  ← bottom: avatar + email + logout icon
│  [↪ Logout]         │
└─────────────────────┘
```

**Sidebar states:**
- **Expanded (240px):** icon + label, logo wordmark visible
- **Collapsed (64px):** icon only, tooltip on hover shows label, logo mark only
- Collapse toggle: arrow icon in top-right corner of sidebar, spring animation
- State persisted in `localStorage`

**Mobile sidebar (breakpoint: `<768px`):**
- Sidebar does NOT render as a persistent rail on mobile
- Replaced by a hamburger icon button in the top-left of the TopBar
- Tapping opens the sidebar as a full-height `Drawer` (MUI) that overlays the content with a backdrop
- Drawer width: `280px`, slides in from the left with Framer Motion spring
- Backdrop: `rgba(6,11,24,0.7)` with `backdrop-filter: blur(4px)`, tapping it closes the drawer
- No collapsed state on mobile — drawer is either open or closed
- Auto-closes on navigation (route change)

**Sidebar item treatment (active):**
- Left border: `3px solid` brand gradient
- Background: `rgba(99,102,241,0.12)`
- Icon color: `brand.primary`
- Text: `text.primary`, weight 600

**Sidebar item treatment (hover):**
- Background: `rgba(148,163,184,0.06)`
- Transition: `fast`

**Top bar (slim, 52px height):**
- Left: page title (h2 weight) + breadcrumb trail
- Right: global search icon, notification bell with badge count, user avatar
- Background: `bg.surface` with `border-bottom: 1px solid border.subtle`
- No logo in top bar (lives in sidebar)

**Main content area:**
- Left margin equals sidebar width (animates with sidebar)
- Top padding accounts for top bar height
- Background: `bg.canvas`

**New file:** `src/components/Sidebar.tsx`, `src/components/TopBar.tsx`  
**Refactor:** `AppShell.tsx` becomes a layout orchestrator using both.

---

### 5.2 KPI Card — Redesign

**Current:** Plain card with large number and label.  
**Target:** Glassmorphism card with animated count-up, trend indicator, and status glow.

**Visual spec:**
```
┌──────────────────────────────────┐  ← border: 1px solid border.default
│                      ↑ +12.3%   │  ← trend badge (green arrow + %)
│  247                             │  ← display-size, gradient text, count-up animation
│  Total Devices                   │  ← caption, text.secondary
│  ▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬    │  ← sparkline (7-day trend, 32px tall)
└──────────────────────────────────┘
  bg: bg.panel, backdrop-filter: blur(8px)
  hover: shadow escalates to shadow[3] + border.brand glow
```

**Count-up animation:** Number animates from 0 to final value over 800ms with `easeOut` easing on first mount. Re-triggers when value changes by >5%.

**Trend badge:** Only shown when historical data is available. `+` in emerald, `-` in rose, neutral in text.secondary.

**Sparkline:** 32px tall ApexChart sparkline (no axes, no labels) showing 7-day trend. Optional — renders only when `trend` data prop is provided.

**Props:**
```typescript
interface KpiCardProps {
  label: string;
  value: number;
  color?: 'primary' | 'online' | 'warning' | 'offline';
  trend?: number;       // % change, positive or negative
  sparkline?: number[]; // 7 data points
  icon?: ReactNode;
}
```

---

### 5.3 Status Badge — New Component

Replace bare `Chip` usage with a purposeful `StatusBadge` component.

**Visual:** Pill shape, colored dot on left (pulsing animation for `online` status), text label.

```typescript
type StatusBadgeProps = {
  status: 'online' | 'offline' | 'warning' | 'unknown';
  size?: 'sm' | 'md';
  pulse?: boolean; // pulsing dot animation, default true for 'online'
};
```

**Pulse animation:** CSS keyframe animation that scales the dot from 1x to 1.6x and fades opacity 1→0 on a 2s loop. Implemented as a `@keyframes` block in MUI's `GlobalStyles`.

---

### 5.4 PageHeader — New Component

Standardizes page title + action area across all pages.

```
┌──────────────────────────────────────────────────────┐
│  Fleet Overview                    [↺ Refresh]  [+]  │
│  Real-time monitoring across 247 devices              │
└──────────────────────────────────────────────────────┘
```

**Props:**
```typescript
interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}
```

Title uses `h1` typography. Left side has a 2px-wide gradient vertical accent bar (`brand.gradient`). Applied as a `::before` pseudo-element with `border-left` technique.

---

### 5.5 GlassCard — New Component

Base card component used throughout — replaces bare MUI `Card` usage.

```typescript
interface GlassCardProps {
  children: ReactNode;
  glow?: 'none' | 'brand' | 'online' | 'warning' | 'offline';
  interactive?: boolean; // adds hover lift + border glow
  padding?: number | string;
}
```

**Base styles:**
```css
background: bg.panel
border: 1px solid border.default
border-radius: 14px
backdrop-filter: blur(8px)
transition: box-shadow 200ms easeInOut, border-color 200ms
```

**`glow="brand"` adds:**
```css
box-shadow: 0 0 0 1px rgba(99,102,241,0.3), 0 4px 24px rgba(99,102,241,0.15)
border-color: rgba(99,102,241,0.4)
```

**`interactive` adds on hover:**
```css
box-shadow: 0 4px 24px rgba(0,0,0,0.4), 0 0 0 1px rgba(148,163,184,0.18)
transform: translateY(-1px)
```

---

### 5.6 MetricGauge — Redesign

**Current:** Plain `radialBar` ApexChart in a Card.  
**Target:** Custom SVG gauge with ambient glow matching value threshold color.

**Visual:** Semi-circle gauge (180° arc), thick stroke, rounded caps, colored glow matching score tier, large centered value with label below.

The three device-detail gauges (battery, temperature, uptime) stack horizontally in a GlassCard with a `border-left` divider between them on desktop, stacked on mobile.

Gauge color thresholds:
- ≥80: `status.online` (#10b981)
- ≥50: `status.warning` (#f59e0b)
- <50: `status.offline` (#f43f5e)

Value animates from 0 to target on mount.

---

### 5.7 DataTable — New Component

Wraps MUI `Table` with:
- Sticky header with subtle gradient background
- Row hover: `bg.elevated` with `fast` transition
- Alternating row shading (very subtle: `rgba(148,163,184,0.03)`)
- Clickable rows: cursor pointer + `→` icon appears on hover at end of row
- Pagination controls styled as icon buttons
- Empty state: centered illustration placeholder + message

---

### 5.8 AlertTimelineItem — New Component

Used in the alerts feed on FleetOverview and as the AlertTimeline on DeviceDetail.

```
┌─────────────────────────────────────────────────────┐
│ ◉  [OFFLINE]  Sensor-Gamma-7    Austin, TX  3m ago  │
│    ← colored left border (3px, status color)        │
│    ← pulsing dot indicator                          │
└─────────────────────────────────────────────────────┘
```

Left border color matches status glow color. Clicking navigates to device detail.

### 5.9 Toast / Notification System

**Library:** `sonner` (add dependency) — lightweight, accessible, zero-config toasts that match custom theming.

**Placement:** Bottom-right, `32px` from edges. Stack up to 3 toasts; older ones compress into a stack behind the newest.

**Visual treatment:**
```
background: bg.elevated
border: 1px solid border.default
border-radius: 10px
box-shadow: 0 8px 32px rgba(0,0,0,0.5)
font-family: Manrope
```

**Variants:**
| Variant | Left accent color | Icon |
|---------|------------------|------|
| `success` | `status.online` | checkmark |
| `error` | `status.offline` | x-circle |
| `warning` | `status.warning` | alert-triangle |
| `info` | `brand.primary` | info-circle |

Configure the `<Toaster>` in `App.tsx` once. All pages call `toast.success()`, `toast.error()` etc. — no per-page alert components.

The login error message currently described as "toast-style alert" in §6.1 should use this system directly.

**New file:** `src/lib/toast.ts` — re-exports `toast` from sonner with typed wrappers.

---

### 5.10 Custom Scrollbar

Applied globally via `GlobalStyles`. Scrollbars must match the dark theme — browser defaults are jarring on dark UIs.

```css
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb {
  background: rgba(148,163,184,0.15);
  border-radius: 9999px;
}
::-webkit-scrollbar-thumb:hover { background: rgba(148,163,184,0.28); }
```

Firefox: `scrollbar-width: thin; scrollbar-color: rgba(148,163,184,0.15) transparent;` on `html`.

---

### 5.11 Page-Level Error States

When a page's primary data fetch fails (network error, 4xx/5xx), the content area does not silently empty. Each page renders a centered error card:

```
┌─────────────────────────────────────┐
│  ⚠  Could not load fleet data       │
│     Check your connection and retry  │
│  [↺ Try again]                       │
└─────────────────────────────────────┘
```

- `GlassCard` with `glow="offline"`
- Error message text in `text.secondary`, error detail (status code) in `mono` font
- "Try again" button triggers the same data fetch
- Empty state (zero results, not an error): illustration placeholder + message, no glow

**New file:** `src/components/ErrorCard.tsx` — shared error state card.

---

## 6. Page Specifications

### 6.1 Login Page

**Current:** Centered form on dark background. Generic.  
**Target:** Full-viewport split layout.

**Left panel (60% on desktop, full on mobile):**
- Background: subtle animated mesh gradient (CSS, no JS — slow-moving radial gradients in `@keyframes`)
- Large headline in gradient text: "Monitor your fleet. Act on what matters."
- Sub-copy: 2 lines describing the platform
- Decorative: floating translucent cards showing mock KPI data (position: absolute, slight rotation, blurred — pure CSS decoration, not interactive)

**Right panel (40% on desktop):**
- Background: `bg.surface` with `border-left: 1px solid border.subtle`
- Logo mark at top
- "Welcome back" heading
- Email + password inputs with floating labels (MUI `outlined` variant with custom border colors)
- "Sign in" button: full-width, gradient background, 44px height, slight glow on hover
- "Don't have an account?" link below
- Error state: toast-style alert slides in from top (Framer Motion, not inline Alert)

**Input field treatment:**
- Focused border: `brand.primary` with `box-shadow: 0 0 0 3px rgba(99,102,241,0.2)`
- Default border: `border.default`
- Filled-in border: `border.strong`

---

### 6.2 Register Page

Same split-panel layout as login. The right panel hosts a **3-step stepper:**

Step indicator: horizontal pill stepper (custom, not MUI Stepper) showing 3 dots that fill in with gradient as steps complete, connected by lines.

Step 1 — Create account: email + password + password strength meter
Step 2 — Verify email: single-row 6-digit code input (individual digit boxes, auto-advance on input, paste support)
Step 3 — Done: animated checkmark SVG + CTA to login

**Password strength meter:** 4-segment bar below password field. Color transitions `offline → warning → online` as strength increases. Calculated client-side from character class coverage.

---

### 6.3 Home / Dashboard Page

**Current:** Welcome message + health check JSON card. Nearly empty.  
**Target:** True landing dashboard with status summary.

**Layout:**
```
┌──────────────────────────────────────────────────────┐
│  PAGE HEADER: "Dashboard"  subtitle: "Good morning, …" │
├──────────────────────────────────────────────────────┤
│  [KPI: Total] [KPI: Online] [KPI: Offline] [KPI: ⚠]  │
├──────────────────────────────────────────────────────┤
│  [Fleet Health Gauge — large, center]                 │
│  [System Status card: API health + uptime]            │
├──────────────────────────────────────────────────────┤
│  [Recent Alerts feed — top 5]    [Quick links card]   │
└──────────────────────────────────────────────────────┘
```

Fleet Health Gauge replaces the existing plain health check JSON display. The health check API is still called; the response timestamp and status are shown in the System Status card as a human-readable uptime indicator.

Greeting in the page subtitle is time-aware: "Good morning/afternoon/evening, {firstName}."

---

### 6.4 Fleet Overview Page

**Current:** 4 KPI cards, 3 charts, map, alert feed. Functional but flat.  
**Target:** Same data with full visual treatment.

**Layout changes:**
- KPI cards: apply `KpiCard` redesign with count-up and glow color per status
- Chart cards: all charts get dark-mode ApexCharts theme overrides (see §7)
- Map card: Leaflet tile layer switches to `CartoDB.DarkMatter` (dark themed tiles)
- Map marker clusters: grouped markers at low zoom with count badge
- Alert feed: replace flat list with `AlertTimelineItem` components
- Page header: `PageHeader` component with "↺ Refresh" action button

**Grid:** 2-column layout on tablet (≥768px), 4-column on desktop (≥1280px), single-column on mobile.

**Data loading:** Replace `CircularProgress` spinner with animated skeleton screens — GlassCard containers with shimmer gradient animation at their expected height.

---

### 6.5 Device Detail Page

**Current:** Multiple sections (InfoCard, HealthGauges, TelemetryChart, ReadingsTable, AlertTimeline).  
**Target:** Same sections, dramatically elevated presentation.

**Top section — hero row:**
```
┌──────────────────────────────────────────────────────┐
│  ◉ [ONLINE]  Sensor-Alpha-1          [Edit] [Delete] │
│  Serial: SN-001 · Model: TempSensor · Austin, TX     │
│  Last seen: 2 minutes ago                            │
└──────────────────────────────────────────────────────┘
```
Background: GlassCard with `glow` matching device status color.

**Health gauges:** Horizontal trio using redesigned `MetricGauge` SVG component. Values animate in on mount.

**Telemetry chart:**
- Full-width GlassCard
- Time range selector: pill-style toggle buttons (1h / 24h / 7d) in top-right of card header
- Metric selector: dropdown in top-left of card header
- Chart: ApexChart area chart with gradient fill from `brand.primary` → transparent, smooth curve
- Crosshair tooltip: custom styled dark tooltip

**Info grid:** 2-column grid of label/value pairs, mono font for values like serial numbers and IPs.

**Readings table:** Apply `DataTable` component with sortable columns.

**Alert timeline:** Vertical timeline with `AlertTimelineItem` components. Colored dots on a vertical line. Each item shows severity, message, timestamp, duration.

---

## 7. ApexCharts Dark Theme Overrides

Create `src/lib/apexTheme.ts` exporting a base `ApexOptions` object that all charts merge:

```typescript
export const darkChartBase: ApexOptions = {
  chart: {
    background: 'transparent',
    foreColor: '#94a3b8',
    toolbar: { show: false },
    animations: {
      enabled: true,
      easing: 'easeinout',
      speed: 400,
    },
  },
  grid: {
    borderColor: 'rgba(148,163,184,0.08)',
    strokeDashArray: 4,
  },
  tooltip: {
    theme: 'dark',
    style: { fontSize: '12px', fontFamily: 'Manrope, sans-serif' },
  },
  legend: {
    fontFamily: 'Manrope, sans-serif',
    fontSize: '12px',
    labels: { colors: '#94a3b8' },
  },
  xaxis: {
    labels: { style: { colors: '#64748b', fontFamily: 'Manrope, sans-serif' } },
    axisBorder: { color: 'rgba(148,163,184,0.12)' },
    axisTicks: { color: 'rgba(148,163,184,0.12)' },
  },
  yaxis: {
    labels: { style: { colors: '#64748b', fontFamily: 'Manrope, sans-serif' } },
  },
};
```

**Per-chart enhancements:**

- **Donut (Status):** gradient fill per slice, custom center label showing total count
- **Bar (Device Types):** single gradient fill (indigo→violet), rounded tops (borderRadius: 6)
- **Area (Telemetry):** gradient fill from brand color to transparent, smooth curve (curve: 'smooth'), no markers except on hover
- **Radial (Health Gauge):** replaced by custom SVG component (§5.6)

---

## 8. Leaflet Map Theming

**Tile layer switch:**
```typescript
<TileLayer
  url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
  attribution="© OpenStreetMap contributors © CARTO"
/>
```

**Custom marker treatment:**
- Replace default circle markers with custom `L.divIcon` components
- Icon: colored ring (outer ring = status glow color at 40% opacity, inner ring = solid status color, center dot = white)
- Pulsing animation via CSS injected through Leaflet's icon HTML

**Map container:**
- Border-radius `14px` on the map wrapper
- Height: `400px` on fleet overview, `240px` on device detail
- No light-mode tile bleed (force `background: bg.canvas` on the `.leaflet-container`)

---

## 9. MUI Theme Configuration Updates

`theme.ts` must be expanded substantially:

```typescript
export const theme = createTheme({
  palette: {
    mode: 'dark',
    primary:    { main: '#6366f1', light: '#818cf8', dark: '#4f46e5' },
    secondary:  { main: '#f59e0b', light: '#fbbf24', dark: '#d97706' },
    success:    { main: '#10b981', light: '#34d399', dark: '#059669' },
    warning:    { main: '#f59e0b', light: '#fbbf24', dark: '#d97706' },
    error:      { main: '#f43f5e', light: '#fb7185', dark: '#e11d48' },
    info:       { main: '#38bdf8', light: '#7dd3fc', dark: '#0284c7' },
    background: { default: '#060b18', paper: '#111d35' },
    text:       { primary: '#f1f5f9', secondary: '#94a3b8', disabled: '#475569' },
    divider:    'rgba(148,163,184,0.10)',
  },
  shape: { borderRadius: 10 },
  typography: {
    // Body/UI font — Manrope as the default. Headings override to Syne below.
    fontFamily: 'Manrope, system-ui, Arial, sans-serif',
    h1: { fontFamily: 'Syne, sans-serif', fontSize: '2rem', fontWeight: 700, letterSpacing: '-0.02em' },
    h2: { fontFamily: 'Syne, sans-serif', fontSize: '1.5rem', fontWeight: 600, letterSpacing: '-0.015em' },
    h3: { fontFamily: 'Syne, sans-serif', fontSize: '1.125rem', fontWeight: 600, letterSpacing: '-0.01em' },
    body1: { fontSize: '0.875rem', lineHeight: 1.6 },
    body2: { fontSize: '0.8125rem', lineHeight: 1.6 },
    caption: { fontSize: '0.6875rem', fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase' },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { textTransform: 'none', fontWeight: 600, borderRadius: 8 },
        containedPrimary: {
          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
          boxShadow: '0 0 0 0 rgba(99,102,241,0)',
          transition: 'box-shadow 200ms, transform 120ms',
          '&:hover': {
            boxShadow: '0 0 20px rgba(99,102,241,0.4)',
            transform: 'translateY(-1px)',
          },
          '&:active': { transform: 'translateY(0)' },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: '#111d35',
          border: '1px solid rgba(148,163,184,0.10)',
          borderRadius: 14,
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          '& fieldset': { borderColor: 'rgba(148,163,184,0.20)' },
          '&:hover fieldset': { borderColor: 'rgba(148,163,184,0.35)' },
          '&.Mui-focused fieldset': {
            borderColor: '#6366f1',
            boxShadow: '0 0 0 3px rgba(99,102,241,0.2)',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 6, fontWeight: 600, fontSize: '0.6875rem' },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: { fontWeight: 600, color: '#94a3b8', fontSize: '0.6875rem', letterSpacing: '0.04em', textTransform: 'uppercase' },
        body: { borderColor: 'rgba(148,163,184,0.08)' },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: '#162040',
          border: '1px solid rgba(148,163,184,0.14)',
          fontSize: '0.75rem',
          borderRadius: 8,
        },
      },
    },
  },
});
```

---

## 10. New Dependencies

| Package | Version | Reason |
|---------|---------|--------|
| `framer-motion` | `^11` | Page transitions, card entry animations, count-up spring |
| `sonner` | `^1` | Toast/notification system (§5.9) — lightweight, accessible, themeable |

**Not needed:**
- `@mui/lab` — MUI core covers all required components
- Any additional chart or map library — ApexCharts and Leaflet already present and sufficient
- Any icon library beyond what is already installed — inventory current icon set before adding

**Font loading:** Syne, Manrope, and JetBrains Mono are loaded from Bunny Fonts via `<link>` in `index.html`. No npm package required.

---

## 11. File Structure Changes

```
web/src/
├── motion/
│   └── variants.ts           ← shared Framer Motion animation variants
├── lib/
│   ├── apexTheme.ts          ← shared ApexCharts dark theme base (Manrope fonts)
│   ├── noiseTexture.ts       ← inline SVG noise data URI for canvas atmosphere
│   └── toast.ts              ← typed re-export of sonner's toast
├── components/
│   ├── AppShell.tsx           ← refactored orchestrator
│   ├── Sidebar.tsx            ← new sidebar navigation (desktop persistent + mobile drawer)
│   ├── TopBar.tsx             ← new slim top bar (hamburger on mobile)
│   ├── GlassCard.tsx          ← new base card component
│   ├── KpiCard.tsx            ← redesigned (extract from FleetOverview)
│   ├── StatusBadge.tsx        ← new status chip replacement
│   ├── PageHeader.tsx         ← new page header component
│   ├── MetricGauge.tsx        ← new SVG gauge (extract from DeviceDetail)
│   ├── DataTable.tsx          ← new table wrapper
│   ├── AlertTimelineItem.tsx  ← new alert row component
│   ├── SkeletonCard.tsx       ← loading skeleton replacement
│   ├── ErrorCard.tsx          ← page-level error state card (§5.11)
│   └── DeviceMap.tsx          ← tile layer + marker redesign + radar-sweep CSS
├── pages/                     ← existing pages, all updated in-place
└── theme.ts                   ← substantially expanded (Syne headings, Manrope body, GlobalStyles)
```

**`theme.ts` also exports a `GlobalStyles` component** (MUI `GlobalStyles`) that applies: canvas noise + ambient gradient (§4.1), custom scrollbar (§5.10), pulse keyframes for `StatusBadge` (§5.3), and radar-sweep keyframes for the Fleet map (§2).

---

## 12. Accessibility Requirements

- All interactive elements must have `aria-label` or visible text
- Keyboard navigation: sidebar items, form inputs, table rows all focusable with correct tab order
- Focus rings: replace browser default with `box-shadow: 0 0 0 2px bg.canvas, 0 0 0 4px brand.primary`
- Color is never the sole differentiator: status always includes icon + text label alongside color
- `prefers-reduced-motion`: all Framer Motion animations degrade to instant transitions

---

## 13. Implementation Phases

### Phase 1 — Foundation (no visible pages change)
1. Expand `theme.ts` with full token set, component overrides
2. Add `framer-motion` dependency
3. Create `src/motion/variants.ts`
4. Create `src/lib/apexTheme.ts`
5. Update `index.html` font import to Inter Variable via Bunny Fonts

### Phase 2 — Shell & Navigation
6. Build `Sidebar.tsx` (expanded/collapsed state, spring animation, localStorage persistence)
7. Build `TopBar.tsx` (page title, actions slot)
8. Refactor `AppShell.tsx` to use both; wire up all existing pages

### Phase 3 — Shared Components
9. Build `GlassCard.tsx`
10. Build `StatusBadge.tsx` with pulse animation
11. Build `PageHeader.tsx`
12. Build `KpiCard.tsx` with count-up and sparkline
13. Build `MetricGauge.tsx` (SVG semi-circle)
14. Build `AlertTimelineItem.tsx`
15. Build `SkeletonCard.tsx`

### Phase 4 — Page Redesigns
16. Fleet Overview: wire all new components, chart theme overrides, map tile layer
17. Device Detail: hero row, redesigned gauges, area chart, data table
18. Home / Dashboard: proper KPI grid + fleet health + recent alerts
19. Login Page: split layout, animated background, redesigned form
20. Register Page: split layout, step indicator, digit-box code input, password strength meter

### Phase 5 — Polish
21. Page transition animations (Framer Motion AnimatePresence in App.tsx)
22. Leaflet marker redesign (custom divIcon with glow ring)
23. Skeleton screen loading states across all pages
24. Accessibility audit: focus rings, aria-labels, reduced-motion

---

## 14. Success Criteria

**Design quality**
- [ ] A first-time viewer describes the UI as "premium" or "professional" without prompting
- [ ] The radar-sweep animation on the Fleet map is visible and matches the active alert severity color
- [ ] The GlassCard border-shimmer hover effect is visible in Chrome and Safari
- [ ] KPI count-up animation fires on page load and re-fires when value changes by >5%
- [ ] Syne is rendering for all headings and display numbers — verify in DevTools computed styles
- [ ] JetBrains Mono is rendering for all serial numbers, IDs, and telemetry values

**Code consistency**
- [ ] All pages use GlassCard, never bare MUI Card
- [ ] No hardcoded hex color values outside `theme.ts` or semantic token constants
- [ ] All status representations use StatusBadge (color + dot + text), never plain Chip
- [ ] All error/failed-fetch states render ErrorCard, never an empty content area
- [ ] All user-facing feedback (login error, save success, refresh result) uses `sonner` toast

**Performance**
- [ ] Lighthouse Performance score ≥90 on production build
- [ ] Fonts load via Bunny Fonts `<link>` with `display=swap` — no invisible-text flash on slow connections
- [ ] No layout shift from sidebar animation (CLS = 0)

**Accessibility**
- [ ] `prefers-reduced-motion`: all Framer Motion animations degrade to instant transitions, no layout shift
- [ ] All 5 pages pass keyboard-only navigation test (tab order, visible focus rings)
- [ ] Color is never the sole status differentiator: every StatusBadge includes icon + text

**Cross-device**
- [ ] Mobile sidebar drawer opens/closes correctly via hamburger icon on screens narrower than 768px
- [ ] Fleet Overview map radar-sweep visible on mobile (touch scroll does not break animation)
- [ ] Tested in Chrome, Firefox, and Safari (backdrop-filter and `@property` support verified)
