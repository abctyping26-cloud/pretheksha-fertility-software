# UI Design System & Cumulative Style Rules

## 1. Core Visual Identity: Strict Monochrome (White & Black)
* **Color Philosophy**: The entire application strictly follows a minimalist, high-contrast **White and Black** aesthetic.
* **Palette Tokens**:
  * Canvas and Card backgrounds: Pure white or clean light neutrals.
  * Typography: Crisp deep black for primary text, neutral zinc/slate grays for secondary labels and metadata.
  * Borders and Dividers: Fine, subtle hairline borders for boundaries and structure; solid black for strong focus/active states.
  * Interactive Elements: Solid black for primary action buttons, active navigation states, and selected pills; inverted pure white text/icons.
  * Neutral Accents: Subtle light neutral fills for hover states, muted banners, and input backgrounds.
* **Color Restrictions**: Do not introduce colored accents (such as blues, purples, or greens) without explicit instructions. Keep the interface disciplined, modern, and clinical.

## 2. Dynamic Source of Truth (Cumulative Reference)
* **Living Codebase Reference**: Never rely on hardcoded code snippets in documentation. Always inspect the live source files before creating or modifying any new view, component, or form:
  * Primary style tokens and base controls: `src/App.css`
  * Layout, header structure, card framing, and spacing: `src/components/Dashboard.tsx`
  * Navigation patterns, brand badges, and status pills: `src/components/Sidebar.tsx`
  * Window shell and view switching: `src/App.tsx`
* **Cumulative Consistency**: Whenever a new feature, input form, settings view, or report is generated, inspect the current state of the main dashboard first. Mirror its latest:
  * Title and subtitle placement and typography hierarchy.
  * Container padding, gap spacing, and card border radiuses.
  * Input field sizing, border weights, and focus indicators.
  * Button hierarchies (primary solid black vs. secondary outlined white).
  * Status badges and icon framing.

## 3. Layout & Structure Guidelines
* **Application Shell**: Two-column desktop layout with a fixed-width left navigation sidebar and a scrollable main viewport.
* **Content Hierarchy**:
  1. Top Page Header: Prominent page title with a clean hairline border line directly beneath it (no subtitle). Optional action buttons on the top right.
  2. Content Body: Composed of structured cards or multi-column grids separated by standard gap spacing.
  3. Cards: Clean white containers wrapped with hairline borders and subtle elevation, containing a clear title and isolated content section.
* **Responsive Desktop Behavior**: Maintain clean full-window responsiveness across standard desktop resolutions without horizontal scrollbars.
