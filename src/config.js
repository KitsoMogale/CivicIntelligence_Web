// Single source of truth for brand strings (guide §0).
// Keep every name, URL, and contact here — never hard-code twice.

export const config = {
  appName: "Civic Intelligence",
  tagline: "Understand how your country works.",

  // Platform identifiers (from the app)
  bundleId: "com.civicintelligence.app", // iOS
  androidPackage: "com.civicintelligence.app",
  deepLinkScheme: "civicintelligence://",

  // TODO: set these before publishing (guide §0)
  contactEmail: "kitsomogale19@gmail.com",
  privacyEmail: "kitsomogale19@gmail.com",
  legalEntity: "Civic Intelligence", // registered name + country (update when registered)
  governingLaw: "the Republic of South Africa", // jurisdiction for Terms
  minAge: 13, // minimum age for legal pages (guide §6.9 / §8.1 — set 13 or 16)

  // Store URLs — placeholders until listings exist (guide §11)
  appStoreUrl: "#",
  playStoreUrl: "#",

  // Legal dates (guide §6/§8 — "last updated")
  lastUpdated: "2026-06-11",
};

// Landing-page content (guide §3) — kept here so copy lives in one place.

// §3.3 — what it is
export const features = [
  { icon: "📚", title: "Plain-language explainers", body: "How systems, institutions, and policies actually work." },
  { icon: "🗳️", title: "Community-reviewed", body: "Submissions are voted on before they go live." },
  { icon: "📁", title: "Collections", body: "Group related articles into browsable folders." },
  { icon: "📷", title: "Local Lens", body: "Locals document the country in photos & video." },
];

// §3.4 — how it works
export const steps = [
  { n: 1, title: "Verify your country", body: "Confirm your country (and city) once — it scopes everything you contribute." },
  { n: 2, title: "Read, write, or improve", body: "Browse explainers, write new ones, or suggest edits to articles and collections." },
  { n: 3, title: "The community decides", body: "Submissions are voted on; approved work gets embedded and versioned with full history." },
];

// §3.5 — categories strip
export const categories = [
  { icon: "🏛️", label: "Systems" },
  { icon: "🏢", label: "Institutions" },
  { icon: "🏭", label: "Companies" },
  { icon: "📜", label: "Policies" },
  { icon: "🔗", label: "Resources" },
];

// §3.7 — trust & safety
export const trust = [
  { icon: "📍", title: "Country verification", body: "Contributors verify where they live, so knowledge comes from locals." },
  { icon: "🗳️", title: "Community moderation", body: "Submissions and edits are voted on; reported content can be hidden or removed." },
  { icon: "🕓", title: "Versioned history", body: "Every change is tracked with full history and “what changed” diffs." },
  { icon: "🚩", title: "Reporting tools", body: "Anyone can flag content for review, mirroring the in-app moderation." },
];

export default config;
