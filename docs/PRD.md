# Project Requirements Document (PRD): AliveSVG

## 1. Product Overview
AliveSVG is a comprehensive platform for animated SVG icons. It serves two main purposes:
1.  **Library**: A vast collection of pre-made, high-quality animated SVG icons ready for use in web projects.
2.  **Studio (Custom Animation)**: A tool empowering users (specifically front-end developers) to upload their own static SVGs and apply animation presets or customize animations using a visual interface, exporting ready-to-use code.

## 2. Target Audience
*   **Primary**: Front-end Developers and UI Engineers who want to add polish to their applications without spending hours on custom animation code.
*   **Secondary**: UI/UX Designers who want to prototype animations or hand off animation specs to developers.

## 3. Core Features & User Stories

### 3.1. The Library (Pre-made Icons)
*   **Search & Filter**: Users can search for icons by keywords (e.g., "menu", "arrow", "loading") and filter by style (outline, solid).
*   **Preview**: Users can hover over icons in the grid to see the animation in action.
*   **Customization**: Users can customize basic properties before export (Color, Stroke Width, Size).
*   **Export**: Users can copy the React/Framer Motion code snippet or download the animated SVG file.

### 3.2. The Studio (Custom Animation Tool)
*   **Upload**: User uploads a static SVG file.
*   **Analyze & Group**: The system parses the SVG and attempts to group elements logically (or allows manual selection).
*   **Contextual Intelligence (Future/Smart MVP)**:
    *   If the system detects an "arrow", it suggests "Slide" or "Bounce" animations.
    *   If it detects a "loader" or circular path, it suggests "Spin".
*   **Animation Presets (MVP)**:
    *   **Entrance**: Fade In, Scale Up, Slide In.
    *   **Loop**: Spin, Pulse, Bounce.
    *   **Interaction**: Hover effects (Scale on hover, Color shift).
*   **Fine-tuning**: Users can adjust duration, delay, and easing curves (Spring vs. Linear).
*   **Export**: Generates a clean React component using `framer-motion`.

## 4. Technical Requirements

### 4.1. Tech Stack
*   **Framework**: Next.js (React)
*   **Animation Library**: `framer-motion`
*   **Styling**: Vanilla CSS / Tailwind CSS (as per user preference, defaulting to Tailwind for speed if acceptable, otherwise Vanilla).
*   **State Management**: React Context or lightweight store for the Studio.

### 4.2. Animation Implementation (Framer Motion)
*   Leverage `<motion.path>` for drawing effects (`pathLength`).
*   Use `variants` to manage states (e.g., `initial`, `animate`, `hover`).
*   Allow "Contextual" animations by mapping keywords or shapes to specific motion variants.

### 4.3. Data Strategy
*   **Icon Sources**: Curate high-quality open-source sets:
    *   *Lucide Icons* (Clean, consistent strokes - easy to animate).
    *   *SVG Repo* (Vast variety).
    *   *Iconoir*.
*   **Storage**: Icons stored as optimized SVG strings or efficiently served files.

## 5. MVP Scope

| Feature | MVP (Phase 1) | Future (Phase 2+) |
| :--- | :--- | :--- |
| **Library** | ~500 curated icons from Lucide/Heroicons | 10k+ icons from multiple sources |
| **Upload** | Single file upload | Batch upload, Figma plugin |
| **Animation** | Global presets (Fade, Spin, Bounce) applied to whole SVG | Path-level selection, Timeline editor |
| **Context** | Basic naming matching (if name="arrow", suggest slide) | Shape analysis / AI detection |
| **Export** | React + Framer Motion Component | Lottie, CSS-only, Gif |

## 6. Success Metrics
*   Integration speed: How fast can a developer go from landing on the site to having an icon working in their app?
*   Export Rate: % of Studio sessions that result in a copied code snippet.
