# UI Design System & Cumulative Style Rules

## 0. Component Architecture: shadcn/ui Standard
* **Design Philosophy**: The application is standardized on the **shadcn/ui** design system (Zinc monochrome theme, Radix UI accessibility primitives, Lucide icons, and semantic CSS variables).
* **Component Primitives**: Component structure, variants, and behavior adhere to shadcn primitives (`Card`, `Button`, `Input`, `Dialog`, `Badge`, `Select`, `Textarea`, `Tabs`, `Separator`).
* **Design Preservation**: Migration to shadcn must preserve 100% of existing visual styling, padding (`20px 24px` card standard), box geometries, and live MongoDB persistence.

## 1. Core Visual Identity: Strict Monochrome (White & Black)
* **Color Philosophy**: The entire application strictly follows a minimalist, high-contrast **White and Black** aesthetic.
* **Palette Tokens**:
  * Canvas and Card backgrounds: Pure white or clean light neutrals (`#ffffff`, `#f4f4f5`).
  * Typography: Crisp deep black (`#09090b` / `#000000`) for primary text, neutral zinc/slate grays (`#52525b`, `#71717a`) for secondary labels and metadata.
  * Borders and Dividers: Fine, subtle hairline borders (`#e4e4e7`) for boundaries and structure; solid black for strong focus/active states.
  * Interactive Elements: Solid black for primary action buttons, active navigation states, and selected boxes; inverted pure white text/icons.
  * Neutral Accents: Subtle light neutral fills for hover states, muted banners, and input backgrounds.
* **Color Restrictions**: Do not introduce colored accents (such as blues, purples, or greens) without explicit instructions. Keep the interface disciplined, modern, and clinical.

## 2. Geometric Theme: Structured Boxes with Subtle Curve (Strictly NO Circles or Round Pills)
* **Box Theme Everywhere**: The entire software design language is built on structured rectangular boxes with a subtle, premium curve.
* **Prohibition of Circles & Round Pills**:
  * Circular buttons (`border-radius: 50%`) are strictly prohibited (except for spinning loading indicators).
  * Rounded pill capsules (`border-radius: 999px`) are strictly prohibited throughout the application.
  * All search bars, notification bell buttons, quick-action add buttons, user profile containers, staff avatars, status tags, badges, and action buttons must be structured boxes.
* **Corner Radius Hierarchy (Subtle Curve / Premium Solid)**:
  * Micro elements (staff avatars, step markers, icons, badges, indicators): `4px` (`--radius-xs`).
  * Interactive controls (search input, icon buttons, profile boxes, select dropdowns, action buttons, table rows): `6px` (`--radius-sm`).
  * Containers & Cards (dashboard cards, dossier cards, modal dialogs, telemetry blocks): `8px` (`--radius-md`).
  * Splash Screen Logo: Subtle curve `8px` (`border-radius: var(--radius-md)`); loader bar `2px`–`4px`.
* **Mandatory Living Inspection**: Always inspect `src/components/Dashboard.tsx` and `src/App.css` first. Mirror their exact box geometry, borders, and radius tokens across every new view and modal.

## 3. Layout & Structure Guidelines
* **Application Shell**: Two-column desktop layout with a fixed-width left navigation sidebar (`260px`) and an isolated, scrollable main viewport.
* **Continuous Header Baseline (72px Alignment)**:
  * The sidebar brand header container (`.sidebar-brand`) and the main top header bar (`.app-top-header`) MUST have an identical height of exactly `72px` (`--header-height: 72px;`).
  * Both must carry `border-bottom: 1px solid var(--border-color);` with `box-sizing: border-box;` and zero top margin/padding offsets.
  * This guarantees a continuous, pixel-perfect dividing line across the entire window from left to right.
* **Sidebar Navigation Inset & Padding**:
  * The scrollable navigation container (`.sidebar-scrollable-nav`) must maintain comfortable horizontal padding (`14px`–`16px` on both left and right).
  * Navigation items (`.nav-item`) must never stick or cling to the left window edge or the right sidebar border wall. They must sit comfortably inset as floating structured boxes with generous breathing room.
* **Single Canonical Page Title (No Content Duplicates)**:
  * The page title lives exclusively in `TopHeader.tsx` (rendered on the top left of the main viewport).
  * Never duplicate `<h1>` or `<header className="content-header">` titles inside page components (`PatientsManager.tsx`, `Dashboard.tsx`, etc.). The content body immediately starts with its action bars, filters, and cards.
* **Scroll Isolation**: The top header stays permanently pinned at the top. Only `.main-content-scrollable` scrolls vertically.
* **Modal Dialog Architecture (Clean Seamless Canvas)**:
  * Single Unified Canvas: Modals must maintain a clean pure white background without heavy horizontal slice/dividing lines (no header bottom divider, no section dividers, no footer divider line).
  * Direct Mode Selection (No Redundant Titles): The segmented switcher (e.g. `[ Couple | Solo ]`) replaces redundant modal titles ("Register Patient") directly at the top of the modal.
  * No Redundant Close Icons: Do not render redundant `✕` close icons when an explicit `Cancel` button already exists in the form actions.
  * Seamless Form Actions: Action buttons (`Cancel`, `Submit`) flow directly at the bottom right of the form without separating border lines.

## 4. Header Bar Components
* **Single Global Search Bar**:
  * The search bar lives exclusively in `TopHeader.tsx`.
  * Structured box with subtle curve (`border-radius: 6px; height: 38px`), muted fill, and clean keyboard shortcut badge (`⌘ F`).
  * Never render duplicate or in-content search bars inside view pages (such as `PatientsManager.tsx`). View pages receive search queries directly from the global header state.
* **Icon Buttons**: Square boxes with subtle curve (`38px x 38px`, `border-radius: 6px`).
* **Staff Profile**: Rectangular box (`border-radius: 6px`) containing a square initial avatar (`28px x 28px`, `border-radius: 4px`) and staff name.
* **Strict Prohibition of Profile Subtitles**: Never display "● Online" or status captions beneath user names in the top header. Keep only the crisp, concise name.

## 5. Typography & Cleanliness: Strict Prohibition of Redundant Subtitles
* **No Annoying Explanatory Subtitles**: NEVER generate patronizing, cluttered, or obvious subtitles, helper captions, or descriptive microcopy under buttons, titles, cards, switches, checkboxes, or radio options (e.g., do NOT add descriptions like "Forward incoming customer messages to staff inboxes", "Sends an alert for each incoming customer message", "Dispatches a real-time sample alert", etc.).
* **Crisp, Self-Explanatory Labels**: All buttons, modal titles, radio options, and switches must be concise, crisp, and self-explanatory on their own.
* **Clean High-Density Layout**: Maintain high information density and minimalist elegance without visual clutter or repetitive explanatory text.

## 6. Patient Clinical Dossier & Alignment Architecture
* **Two-Column High-Density Grid**: The dossier layout features a main left column (`1fr`) and a wide right column (`390px`) for telemetry and clinical notes.
* **Balanced Padding Token (`20px 24px`) Across All Cards**:
  * All dossier cards (Patient Info, Partner Info, Clinical Profile, Appointments, Documents, Cycle Telemetry, and Medical Notes) strictly share the same `padding: 20px 24px;`.
  * Vertical breathing room equals the left wall inset for avatars and content blocks.
* **Patient & Partner Side-by-Side Subgrid**:
  * Patient Card: Initials box (`54px x 54px`), patient full name without base32 ID underneath, and 6×1 / 7×1 vertical details list with small 13px line icons.
  * Partner Card: Symmetrical card displaying spouse details or centered empty state ("No partner details added" + `+ Add Partner`) with zero bottom empty void.
* **Clinical Profile Box (No Nested Wrapper Boxes)**:
  * Compact header with a 26px square pencil icon button (`.clinical-edit-icon-btn`) to toggle editing.
  * Free of heavy nested border boxes around fields:
    * Row 1: Inline `Blood Group: [group badge/select]` and `Protocol: [protocol badge/input]`.
    * Row 2: Inline `Allergies: [input field]`.
* **Appointments & Documents Uniformity**:
  * Both cards mirror the Clinical Profile structured block layout (`.dossier-structured-item`), with crisp metadata and status badges (`Completed`, `Today`) / action buttons (`View`).
* **Right Column Telemetry & Medical Notes (390px Width)**:
  * Top Card: Cycle Telemetry with `padding: 20px 24px;`, follicle count, ovarian response headline, avg/min/max millimeter vitals triad, and scatter growth trend with generous horizontal breathing room.
  * Bottom Card: Medical History & Clinical Notes textarea (editable anytime).
* **Real-Time Popup Save**: An animated "Save Changes" button immediately pops up upon modifying any clinical field (Allergies, Medical History, Blood Group, Protocol) and persists updates to MongoDB via `PATCH /api/v1/clinic/patients/:id`.

