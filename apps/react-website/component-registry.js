/**
 * PATCHWORK component registry (canonical source of truth).
 *
 * Maps every stable `data-patchwork-id` rendered by the website to the
 * source file / component that owns it. The backend resolves a browser-sent
 * component ID against a trusted copy of this data — the browser ID is only
 * a lookup key.
 *
 * Project conventions: React 18 + Vite 5, plain JSX (no TypeScript), no
 * router (single-page anchor sections on `/`). All routes are therefore `/`.
 *
 * Registry ownership: this file is canonical. `patchwork-registry.json` at
 * the repo root is generated from it via `npm run patchwork:manifest` and
 * is what gets shared with the backend developer. The backend should either
 * consume that JSON or copy the validated mappings into its own server-side
 * registry — never maintain a second hand-edited copy alongside this one.
 *
 * @typedef {"content" | "styles" | "component"} PatchworkEditableScope
 *
 * @typedef {object} PatchworkComponentEntry
 * @property {string} id - Exact `data-patchwork-id` value sent by the browser.
 * @property {string} filePath - Repo-relative path to the owning source file.
 * @property {string} componentName - Actual exported component/owner symbol.
 * @property {boolean} editable - Whether LLM editing is permitted.
 * @property {PatchworkEditableScope} editableScope - Edit breadth.
 * @property {string[]} allowedOperations - Supported edit types.
 * @property {string} description - Human context for the backend/LLM.
 * @property {string} [route] - Page on which the element appears.
 * @property {string} [dataSource] - Data file/object controlling the content,
 *   when the value is data-driven rather than inline JSX.
 * @property {string} [notes] - Constraints or dependencies worth knowing.
 */

/** @type {PatchworkComponentEntry[]} */
export const patchworkComponentRegistry = [
  {
    id: "navbar-brand",
    filePath: "src/components/Navbar.jsx",
    componentName: "Navbar",
    editable: true,
    editableScope: "content",
    allowedOperations: ["text", "styling"],
    description: "Restaurant brand link in the header (mark + name + strapline).",
    route: "/",
  },
  {
    id: "navbar-cta",
    filePath: "src/components/Navbar.jsx",
    componentName: "Navbar",
    editable: true,
    editableScope: "content",
    allowedOperations: ["text", "styling"],
    description: "Header 'Book a Table' call-to-action link.",
    route: "/",
  },
  {
    id: "hero-heading",
    filePath: "src/components/Hero.jsx",
    componentName: "Hero",
    editable: true,
    editableScope: "content",
    allowedOperations: ["text", "typography", "styling"],
    description: "Main hero H1: restaurant name.",
    route: "/",
  },
  {
    id: "hero-tagline",
    filePath: "src/components/Hero.jsx",
    componentName: "Hero",
    editable: true,
    editableScope: "content",
    allowedOperations: ["text", "typography", "styling"],
    description: "Hero tagline beneath the title.",
    route: "/",
  },
  {
    id: "hero-description",
    filePath: "src/components/Hero.jsx",
    componentName: "Hero",
    editable: true,
    editableScope: "content",
    allowedOperations: ["text", "typography", "styling"],
    description: "Hero supporting paragraph (lead text).",
    route: "/",
  },
  {
    id: "hero-reservation-cta",
    filePath: "src/components/Hero.jsx",
    componentName: "Hero",
    editable: true,
    editableScope: "content",
    allowedOperations: ["text", "styling"],
    description: "Hero primary 'Book a Table' button (anchor to #contact).",
    route: "/",
    notes:
      "Anchor navigation target (#contact) must be preserved when editing text.",
  },
  {
    id: "about-heading",
    filePath: "src/components/About.jsx",
    componentName: "About",
    editable: true,
    editableScope: "content",
    allowedOperations: ["text", "typography", "styling"],
    description: "Restaurant introduction section heading.",
    route: "/",
  },
  {
    id: "about-description",
    filePath: "src/components/About.jsx",
    componentName: "About",
    editable: true,
    editableScope: "content",
    allowedOperations: ["text", "typography", "styling"],
    description: "First paragraph of the restaurant story.",
    route: "/",
  },
  {
    id: "menu-section-heading",
    filePath: "src/components/SignatureDishes.jsx",
    componentName: "SignatureDishes",
    editable: true,
    editableScope: "content",
    allowedOperations: ["text", "typography", "styling"],
    description: "Signature dishes / menu section heading.",
    route: "/",
  },
  {
    id: "menu-butter-chicken-darbari-name",
    filePath: "src/components/SignatureDishes.jsx",
    componentName: "SignatureDishes",
    editable: true,
    editableScope: "content",
    allowedOperations: ["text", "typography", "styling"],
    description: "Dish name for Butter Chicken Darbari.",
    route: "/",
    dataSource:
      "DISHES array in src/components/SignatureDishes.jsx (edit the data object, not just the JSX).",
  },
  {
    id: "menu-butter-chicken-darbari-price",
    filePath: "src/components/SignatureDishes.jsx",
    componentName: "SignatureDishes",
    editable: true,
    editableScope: "content",
    allowedOperations: ["text", "styling"],
    description: "Dish price for Butter Chicken Darbari.",
    route: "/",
    dataSource:
      "DISHES array in src/components/SignatureDishes.jsx (edit the data object, not just the JSX).",
  },
  {
    id: "menu-dragon-chilli-prawns-name",
    filePath: "src/components/SignatureDishes.jsx",
    componentName: "SignatureDishes",
    editable: true,
    editableScope: "content",
    allowedOperations: ["text", "typography", "styling"],
    description: "Dish name for Dragon Chilli Prawns.",
    route: "/",
    dataSource:
      "DISHES array in src/components/SignatureDishes.jsx (edit the data object, not just the JSX).",
  },
  {
    id: "menu-dragon-chilli-prawns-price",
    filePath: "src/components/SignatureDishes.jsx",
    componentName: "SignatureDishes",
    editable: true,
    editableScope: "content",
    allowedOperations: ["text", "styling"],
    description: "Dish price for Dragon Chilli Prawns.",
    route: "/",
    dataSource:
      "DISHES array in src/components/SignatureDishes.jsx (edit the data object, not just the JSX).",
  },
  {
    id: "menu-murgh-dum-biryani-name",
    filePath: "src/components/SignatureDishes.jsx",
    componentName: "SignatureDishes",
    editable: true,
    editableScope: "content",
    allowedOperations: ["text", "typography", "styling"],
    description: "Dish name for Murgh Dum Biryani.",
    route: "/",
    dataSource:
      "DISHES array in src/components/SignatureDishes.jsx (edit the data object, not just the JSX).",
  },
  {
    id: "menu-murgh-dum-biryani-price",
    filePath: "src/components/SignatureDishes.jsx",
    componentName: "SignatureDishes",
    editable: true,
    editableScope: "content",
    allowedOperations: ["text", "styling"],
    description: "Dish price for Murgh Dum Biryani.",
    route: "/",
    dataSource:
      "DISHES array in src/components/SignatureDishes.jsx (edit the data object, not just the JSX).",
  },
  {
    id: "menu-hakka-noodles-supreme-name",
    filePath: "src/components/SignatureDishes.jsx",
    componentName: "SignatureDishes",
    editable: true,
    editableScope: "content",
    allowedOperations: ["text", "typography", "styling"],
    description: "Dish name for Hakka Noodles Supreme.",
    route: "/",
    dataSource:
      "DISHES array in src/components/SignatureDishes.jsx (edit the data object, not just the JSX).",
  },
  {
    id: "menu-hakka-noodles-supreme-price",
    filePath: "src/components/SignatureDishes.jsx",
    componentName: "SignatureDishes",
    editable: true,
    editableScope: "content",
    allowedOperations: ["text", "styling"],
    description: "Dish price for Hakka Noodles Supreme.",
    route: "/",
    dataSource:
      "DISHES array in src/components/SignatureDishes.jsx (edit the data object, not just the JSX).",
  },
  {
    id: "chef-special-heading",
    filePath: "src/components/ChefSpecial.jsx",
    componentName: "ChefSpecial",
    editable: true,
    editableScope: "content",
    allowedOperations: ["text", "typography", "styling"],
    description: "Chef's recommendation dish name heading.",
    route: "/",
  },
  {
    id: "chef-special-description",
    filePath: "src/components/ChefSpecial.jsx",
    componentName: "ChefSpecial",
    editable: true,
    editableScope: "content",
    allowedOperations: ["text", "typography", "styling"],
    description: "Chef's special description paragraph.",
    route: "/",
  },
  {
    id: "chef-special-price",
    filePath: "src/components/ChefSpecial.jsx",
    componentName: "ChefSpecial",
    editable: true,
    editableScope: "content",
    allowedOperations: ["text", "styling"],
    description: "Chef's special price value.",
    route: "/",
  },
  {
    id: "reservation-heading",
    filePath: "src/components/Reservation.jsx",
    componentName: "Reservation",
    editable: true,
    editableScope: "content",
    allowedOperations: ["text", "typography", "styling"],
    description: "Reservation section heading.",
    route: "/",
  },
  {
    id: "reservation-submit",
    filePath: "src/components/Reservation.jsx",
    componentName: "Reservation",
    editable: true,
    editableScope: "content",
    allowedOperations: ["text", "styling"],
    description: "Reservation form submit button label.",
    route: "/",
    notes:
      "Text-only edits. Must remain type=submit inside the reservation form; do not rewire the submit handler.",
  },
  {
    id: "contact-phone",
    filePath: "src/components/Reservation.jsx",
    componentName: "Reservation",
    editable: true,
    editableScope: "content",
    allowedOperations: ["text", "styling"],
    description: "Contact phone number in the reservation info list.",
    route: "/",
    dataSource:
      "INFO array in src/components/Reservation.jsx (edit the data object, not just the JSX).",
    notes:
      "Display text only; the tel: link lives in Footer.jsx and must be updated separately if the number changes.",
  },
  {
    id: "opening-hours-text",
    filePath: "src/components/Reservation.jsx",
    componentName: "Reservation",
    editable: true,
    editableScope: "content",
    allowedOperations: ["text", "styling"],
    description: "Opening-hours line in the reservation info list.",
    route: "/",
    dataSource:
      "INFO array in src/components/Reservation.jsx (edit the data object, not just the JSX).",
    notes:
      "Detailed per-day hours live in Footer.jsx and must be updated separately if hours change.",
  },
  {
    id: "footer-about",
    filePath: "src/components/Footer.jsx",
    componentName: "Footer",
    editable: true,
    editableScope: "content",
    allowedOperations: ["text", "typography", "styling"],
    description: "Footer description paragraph.",
    route: "/",
  },
];
