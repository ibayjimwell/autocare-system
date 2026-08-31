
# AutoCare System Design System (Responsive & macOS HIG)

## Core Philosophy

AutoCare System (Web) follows a **Responsive-First** approach layered with Apple's **macOS/iOS** Human Interface Guidelines (HIG) aesthetics. The UI must adapt fluidly across mobile, tablet, and PC.

On mobile devices, it behaves with touch-friendly ergonomics (larger hit areas, stacked layouts, bottom sheets). On desktop screens, it scales into a high-density, pointer-optimized macOS environment utilizing windowing, persistent sidebars, and spatial depth via *Vibrancy*.

The primary brand color remains **#C1272D** (Red). Use this color strictly to indicate primary actions, selected states, and active focus rings.

## Guidelines for AI Models Generating Code

When generating React, Next.js, and Tailwind CSS (Shadcn) components for AutoCare System, adhere strictly to these mapping rules:

### 1. Responsive Layouts & Navigation

Always use Tailwind's mobile-first breakpoints (`sm:`, `md:`, `lg:`).

* **Mobile (< 768px)**: Default to 100% width stacked layouts. Use collapsible hamburger menus, bottom navigation bars, or swipeable drawers instead of persistent sidebars.
* **Tablet (≥ 768px - `md:`)**: Introduce split-views, grid layouts, and slide-over sidebars.
* **Desktop (≥ 1024px - `lg:`)**: Utilize persistent sidebars (`w-64`), multi-column layouts, and complex data tables. Use generous padding (`lg:p-8`).

### 2. Color Semantics & Materials

* **Backgrounds (`bg-background`)**: Use the standard background for the main canvas.
* **Content Cards (`bg-card`)**: Use pure white (`#FFFFFF` in light mode) for distinct content blocks, tables, and settings panels.
* **macOS Vibrancy (Glassmorphism)**:
  * **Permitted Usage**: Top Header/Title bars, Context Menus, Popovers, and bottom mobile navigation.
  * **Implementation**: Combine `backdrop-blur-xl` or `backdrop-blur-md` with `bg-background/70` (or `bg-white/70`), a delicate border (`border-border/50`), and `shadow-md`.
  * **Forbidden Usage**: Do NOT apply glassmorphism to primary CTA buttons, form inputs, or standard content cards.
* **Primary Actions (`bg-primary text-primary-foreground`)**: Use for the main Call-To-Action (e.g., "Save", "Submit").
* **Secondary Actions (`bg-secondary text-secondary-foreground`)**: Use for alternative actions.

### 3. Typography (Responsive System Font)

Mobile typography must be large enough to be legible at arm's length, while desktop typography tightens for data density.

* **Page Titles**: `text-2xl md:text-xl lg:text-2xl font-semibold tracking-tight text-foreground`.
* **Section Headers**: `text-sm font-semibold text-muted-foreground uppercase tracking-wider`.
* **Body (Responsive Size)**: `text-base md:text-sm font-normal text-foreground`. *Note: Inputs MUST be at least `text-base` (16px) on mobile to prevent iOS Safari from aggressively auto-zooming on focus.*
* **Footnote/Caption**: `text-xs font-normal text-muted-foreground`.

### 4. Sizing, Spacing, and Pointer Targets

Interactive elements must scale based on the user's input device (Touch vs. Mouse).

* **Touch/Pointer Targets**:
  * **Mobile**: Controls must meet the 44px minimum touch target standard. Use `h-10` or `h-11`.
  * **Desktop**: Controls shrink for pointer precision. Use `md:h-9` or `md:h-8`.
* **Padding**: Shift from tight mobile padding to generous desktop padding (e.g., `p-4 md:p-6 lg:p-8`).
* **Border Radius (Apple Squarcles)**:
  * **Controls (Inputs/Buttons)**: `rounded-md` (approx. 6px).
  * **Popovers/Dropdowns**: `rounded-lg` (approx. 8px).
  * **Cards/Modals**: `rounded-xl` (approx. 12px). On mobile, full-screen modals can have `rounded-none`.

### 5. Focus Rings and Accessibility

* **Keyboard Navigation**: All interactive elements must have a distinct focus ring. Shadcn handles this via `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`. Do not remove focus outlines.

### 6. Component Blueprints (React / Web)

Notice the use of responsive prefixes (`md:`) to shift from mobile-friendly heights/text sizes to desktop density.

* **Responsive Primary Button**:
  `<button className="inline-flex items-center justify-center rounded-md text-base md:text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring bg-primary text-primary-foreground shadow hover:bg-primary/90 h-11 md:h-9 px-4 md:px-4 py-2 w-full md:w-auto">`
* **Responsive Text Input**:
  `<input className="flex h-11 md:h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base md:text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />`
* **Responsive Glass Header**:
  `<header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl px-4 md:px-6 h-14 md:h-12 flex items-center">`
* **Responsive Card**:
  `<div className="rounded-xl border border-border bg-card text-card-foreground shadow-sm p-4 md:p-6">`
