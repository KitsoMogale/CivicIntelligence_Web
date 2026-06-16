# Civic Intelligence — Marketing Website Guide

A build spec for the public website (separate React repo). Covers what to
include, the theme, copy direction, and the legal pages (Privacy, Terms).

> This site is **marketing + legal only**. It does NOT touch the app's
> Firebase/data. It's a static, fast, SEO-friendly site that explains the app
> and links to the stores.

---

## 0. Source of truth (pulled from the app)

| Thing | Value |
|---|---|
| App name | **Civic Intelligence** |
| Tagline (working) | "Understand how your country works." |
| Bundle id (iOS) | `com.civicintelligence.app` |
| Package (Android) | `com.civicintelligence.app` |
| Deep-link scheme | `civicintelligence://` |
| Platforms | iOS + Android (Expo / React Native) |
| Contact email | `kitsomogale19@gmail.com` |
| Company/legal entity | _(set: registered name + country)_ |

Keep these in a single `src/config.js` so they're never hard-coded twice.

---

## 1. What the app actually is (so copy is honest)

Civic Intelligence is a **collaborative, country-scoped civic knowledge app**.
Verified locals in a country co-author and peer-review plain-language explainers
of how their country works.

**Core concepts to communicate:**
- **Country-scoped.** You verify your location once; you contribute to *your*
  country's knowledge base. Content is organized per country.
- **Collaborative + governed.** Anyone verified can write articles or group them
  into **collections (folders)**. Submissions go through a **community vote**
  (approve/reject with reasons) before they're embedded. Edits are suggested,
  reviewed, and versioned (full history + "what changed" diffs).
- **Categories.** Content covers: **Systems** (tax, healthcare, education,
  justice, electricity…), **Institutions** (govt depts, agencies, courts,
  regulators), **Companies**, **Policies** (laws, regulations, treaties), and
  **Resources**.
- **Local Lens.** A visual layer — locals post photos/videos documenting things
  on the ground (a "visual census"), at country and city level.
- **Reputation (coming).** A per-country contribution score next to your name.

**Tone:** civic, trustworthy, optimistic, neutral (non-partisan). Think
"Wikipedia meets a local lens," not a political/news brand. Avoid anything that
reads as advocacy for a party or position.

---

## 2. Site map (pages)

1. **Landing / Home** (`/`) — the marketing page.
2. **Privacy Policy** (`/privacy`) — required by App Store + Google Play.
3. **Terms of Use** (`/terms`) — required (UGC platform → strong terms needed).
4. _(optional)_ **Support / Contact** (`/support`) — a Play/App Store deep-link
   target is good to have; even a simple email + FAQ.
5. **Account / Data deletion** (`/delete-account`) — **required by Google Play**:
   a public URL describing account + data deletion. Full page copy + React
   component in §7.

Footer links Privacy / Terms / Support / Delete account on every page.

---

## 3. Landing page — sections (in order)

1. **Nav bar** — logo + name left; links (How it works, Privacy, Terms) + a
   primary "Get the app" button right. Sticky, translucent-on-scroll.
2. **Hero** —
   - H1: short, bold value prop (e.g. *"Understand how your country works."*).
   - Sub: 1–2 lines on collaborative, verified, plain-language civic knowledge.
   - Two CTAs: **App Store** + **Google Play** badges (use official badge SVGs).
   - Right side / below: a phone mockup (screenshot of the home or an article).
   - Small trust line: "Free · Verified locals · Community-reviewed."
3. **What it is (3–4 feature cards)** — icon + title + one line each:
   - 📚 *Plain-language explainers* — how systems, institutions, policies work.
   - 🗳️ *Community-reviewed* — submissions are voted on before they go live.
   - 📁 *Collections* — group related articles into browsable folders.
   - 📷 *Local Lens* — locals document the country in photos & video.
4. **How it works (3 steps)** — numbered:
   1. Verify your country (and city) once.
   2. Read, write, or improve articles & collections.
   3. The community votes; approved work gets embedded and versioned.
5. **Categories strip** — the emoji + label set (Systems / Institutions /
   Companies / Policies / Resources) as chips, to show breadth.
6. **Local Lens showcase** — a small gallery/strip of the visual layer (use
   placeholder imagery; no real user content without consent).
7. **Trust & safety** — short block: country verification, community moderation,
   versioned history, reporting tools. Builds credibility for a civic product.
8. **Final CTA band** — repeat the store badges on a colored background.
9. **Footer** — logo, short blurb, link columns (Product / Legal / Support),
   copyright, the legal entity name, contact email.

**Don't include (yet):** pricing (it's free), testimonials you don't have, fake
user counts, or country-specific political claims.

---

## 4. Theme (match the app exactly)

Use the app's real palette so the site and app feel like one product.

### Colors (CSS variables)
```css
:root {
  /* Brand / accent */
  --blue:        #4F8EF7;   /* primary action, links */
  --blue-deep:   #3B5BB8;   /* hovered/pressed blue, emphasis */
  --blue-tint:   #EEF2FE;   /* light blue surfaces/callouts */

  /* State colors (used by the app's governance) */
  --green:       #3BCB7C;   /* approved / embedded / positive */
  --green-deep:  #1A6B3D;
  --amber:       #F5A623;   /* pending / under review */
  --red:         #D9534F;   /* rejected / destructive */
  --red-deep:    #9C2222;

  /* Neutrals */
  --ink:         #0B0B0F;   /* near-black headings */
  --text:        #111111;
  --text-muted:  #666666;
  --line:        #EEF0F3;   /* hairline borders */
  --surface-2:   #F7F8FA;   /* section backgrounds */
  --surface-3:   #F2F4F7;
  --white:       #FFFFFF;
}
```
- **Primary brand accent:** `--blue (#4F8EF7)`. CTAs, links, highlights.
- **Backgrounds:** white with alternating `--surface-2` section bands (this is
  exactly how the app reads — clean, full-width, light).
- Use green/amber/red sparingly — only where you reference the review states
  (e.g. a little "Pending → Embedded" diagram). Don't make them brand colors.

### Typography
- Clean sans-serif. Recommended: **Inter** (free, on Google Fonts) — matches the
  app's heavy, slightly tight-tracked headings.
- Headings: bold/extra-bold (700–900), tight letter-spacing (`-0.02em`).
- Body: 16–18px, line-height ~1.6, `--text` on white, `--text-muted` for subs.

### Shape & feel
- Rounded corners: **12–16px** on cards/buttons (the app uses 12–14).
- Soft hairline borders (`1px solid var(--line)`) instead of heavy shadows;
  subtle shadows only on the hero mockup.
- Generous whitespace; full-width bands; centered max-width content (~1100px).
- Emoji are part of the app's visual language (category icons) — fine to reuse.

### Motion
- Subtle: fade/slide-up on scroll (e.g. `framer-motion` or CSS
  `@media (prefers-reduced-motion)` respected). Nothing flashy.

---

## 5. Tech stack (recommended for the React repo)

- **Framework:** Next.js (App Router) — gives SSG/SEO, easy routing for
  `/privacy` `/terms`, and image optimization. (Plain Vite + React Router works
  too, but Next is better for SEO on a marketing/legal site.)
- **Styling:** Tailwind CSS (fastest) with the CSS variables above mapped into
  `tailwind.config`, OR CSS Modules. Either is fine.
- **Animation:** framer-motion (optional).
- **Hosting:** Vercel or Netlify (free tier, custom domain, HTTPS).
- **Analytics:** privacy-friendly (Plausible / Vercel Analytics) — and disclose
  it in the Privacy Policy if you add it.
- **Assets:** export real app screenshots (home, an article, Local Lens) into a
  device frame. Keep an SVG logo + favicon + OG image.

### SEO essentials
- Per-page `<title>` + meta description.
- Open Graph + Twitter card image (1200×630) for nice link previews.
- `sitemap.xml`, `robots.txt`, semantic headings, alt text on images.
- Mobile-first responsive; Lighthouse 90+.

---

## 6. Privacy Policy — what it MUST cover

> The app collects real personal data (Google account, **GPS location**,
> photos/videos, user content). A thorough policy is mandatory for both stores.
> **Have a lawyer review before publishing.** This is a checklist, not legal
> advice.

Sections to include:

1. **Who we are** — legal entity, contact email, country of operation.
2. **What we collect**
   - **Account:** Google Sign-In → name, email, profile photo, Google user id.
   - **Location:** GPS coordinates used **once** to verify your country and city
     (within ~30km). State whether you store coordinates or only the
     verified country/city result. (App stores `countryCode`, `cityId`,
     `cityName`, `regionName`, `cityVerifiedAt`.)
   - **User content:** articles, collections, edits, comments, votes, ratings,
     and **Local Lens photos/videos** you upload.
   - **Usage/device data:** standard app/diagnostic data via Firebase
     (and analytics if added).
3. **How we use it** — authenticate you, scope content to your country/city,
   run community review/voting, display your contributions and display name,
   prevent abuse, and operate the service.
4. **Legal basis** (if serving EU/UK users): consent + legitimate interest +
   contract performance.
5. **Sharing / processors** — **Google Firebase** (Auth, Firestore, Storage,
   Cloud Functions, Hosting) as the backend/processor; Google Sign-In;
   Google Maps (if used on web); analytics provider (if any). Link their
   privacy terms.
6. **Public content notice** — clearly state that articles, collections,
   comments, votes, your **display name**, and Lens posts are **publicly
   visible** to others (especially within your country). This is essential for a
   UGC app.
7. **Data retention** — how long content/account data is kept; what happens on
   deletion.
8. **Your rights** — access, correction, deletion, data export; how to exercise
   them (email + the in-app/website delete-account flow).
9. **Children** — minimum age (e.g. 13+ or 16+ per your stores/region). Civic
   apps usually set 13+ or 16+.
10. **Security** — encryption in transit, access controls, Firebase security
    rules (you have strict Firestore/Storage rules — mention safeguards
    generally, not specifics).
11. **International transfers** — data processed by Google may be stored outside
    the user's country.
12. **Changes to this policy** — how you'll notify.
13. **Effective date / last updated.**

---

## 7. Account & data deletion page (`/delete-account`) — REQUIRED for Google Play

Google Play requires a **public URL** (no app install needed to read it) that
explains how to delete your account + data and what is removed vs kept. The app
already has **in-app deletion** (Account → Delete account, backed by a Cloud
Function), so this page just **documents** that flow — **no form or email inbox
is required.** Paste this page's URL into **Play Console → App content → Data
safety → Account deletion**.

> This copy mirrors exactly what the app's `deleteAccount` function does. Keep
> the two in sync if the deletion policy changes. Support email:
> `kitsomogale19@gmail.com` (make sure this inbox is monitored).

### 7.1 Ready-to-publish page copy

```
# Delete your Civic Intelligence account

You can permanently delete your account and personal data at any time, directly
in the app. Deletion is immediate and can’t be undone.

## How to delete your account
1. Open the Civic Intelligence app.
2. Go to the Account tab.
3. Tap “Delete account”.
4. Type DELETE to confirm.

Your account and data are removed right away.

## What gets deleted
- Your account and sign-in (Google or email/password).
- Your profile: name, email, and location verification (country/city).
- Your Local Lens posts and any photos or videos you uploaded.

## What gets anonymized (kept, but no longer linked to you)
Civic Intelligence is a collaborative knowledge base — articles and collections
are written and improved by many people. To avoid erasing shared community
knowledge:
- Articles and collections you wrote stay published, but your name is removed
  from them (shown as “Anonymous”).
- Your comments are removed and shown as “[deleted]”.

## Can’t access the app?
If you can’t sign in to delete your account yourself, email us at
kitsomogale19@gmail.com from the address on your account and we’ll delete it for
you, typically within 30 days.

Last updated: June 15, 2026
```

### 7.2 React component (drop into the website repo)

Minimal, accessible, SEO-friendly. Next.js App Router shown; adapt for Vite +
React Router by wrapping in your route element instead of exporting `metadata`.

```jsx
// app/delete-account/page.jsx
// SUPPORT_EMAIL is "kitsomogale19@gmail.com"; APP_NAME is "Civic Intelligence".
// Keep these in @/config so they're defined once across the site.
import { SUPPORT_EMAIL, APP_NAME } from "@/config";

export const metadata = {
  title: `Delete your account · ${APP_NAME}`,
  description:
    "How to permanently delete your Civic Intelligence account and data, and what is removed vs anonymized.",
  alternates: { canonical: "/delete-account" },
};

export default function DeleteAccountPage() {
  return (
    <main className="prose mx-auto max-w-2xl px-5 py-16">
      <h1>Delete your {APP_NAME} account</h1>
      <p>
        You can permanently delete your account and personal data at any time,
        directly in the app. Deletion is immediate and can’t be undone.
      </p>

      <h2>How to delete your account</h2>
      <ol>
        <li>Open the {APP_NAME} app.</li>
        <li>Go to the <strong>Account</strong> tab.</li>
        <li>Tap <strong>“Delete account”</strong>.</li>
        <li>Type <code>DELETE</code> to confirm.</li>
      </ol>
      <p>Your account and data are removed right away.</p>

      <h2>What gets deleted</h2>
      <ul>
        <li>Your account and sign-in (Google or email/password).</li>
        <li>Your profile: name, email, and location verification (country/city).</li>
        <li>Your Local Lens posts and any photos or videos you uploaded.</li>
      </ul>

      <h2>What gets anonymized</h2>
      <p>
        {APP_NAME} is a collaborative knowledge base — articles and collections
        are written and improved by many people. To avoid erasing shared
        community knowledge:
      </p>
      <ul>
        <li>
          Articles and collections you wrote stay published, but your name is
          removed (shown as “Anonymous”).
        </li>
        <li>Your comments are removed and shown as “[deleted]”.</li>
      </ul>

      <h2>Can’t access the app?</h2>
      <p>
        If you can’t sign in to delete your account yourself, email{" "}
        <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> from the address
        on your account and we’ll delete it for you, typically within 30 days.
      </p>
    </main>
  );
}
```

### 7.3 Checklist for this page
- [ ] Reachable at a stable public URL (e.g. `https://<domain>/delete-account`).
- [ ] Linked in the site footer + from the Privacy Policy.
- [ ] `SUPPORT_EMAIL` set; that inbox is monitored.
- [ ] URL pasted into Play Console → Data safety → Account deletion.
- [ ] Wording matches the app's actual `deleteAccount` behavior (delete vs
      anonymize) — update both together if it ever changes.

---

## 8. Terms of Use — what it MUST cover

> Critical for a community/UGC platform. **Lawyer review required.** Checklist:

1. **Acceptance & eligibility** — by using the app you agree; minimum age.
2. **The service** — what Civic Intelligence is; that it's
   community-contributed and **not official government information**; no
   warranty of accuracy.
3. **Accounts** — you're responsible for your account; one account; Google
   Sign-In.
4. **Location verification** — you confirm you genuinely live in the country/city
   you verify; misuse may lead to removal.
5. **User-generated content**
   - You retain ownership but grant the platform a **license** to host, display,
     distribute, and let the community **edit/version/translate** your
     contributions (articles are collaboratively edited — this is key).
   - You're responsible for what you post; you have the rights to any media you
     upload (photos/videos in Local Lens).
6. **Acceptable use / prohibited content** — no illegal content, hate speech,
   harassment, doxxing, misinformation presented as fact, spam, impersonation,
   copyright infringement, or attempts to game voting. (Mirror your in-app
   reporting + moderation.)
7. **Community review & moderation** — submissions are voted on; content may be
   rejected, edited, rolled back, hidden by reports, or removed at the platform's
   discretion.
8. **Intellectual property** — the app, brand, and aggregate content; an open
   license note if you intend articles to be shareable (decide: e.g.
   Creative Commons for article text? — pick deliberately).
9. **Privacy** — reference the Privacy Policy.
10. **Termination** — you can stop using/delete; we can suspend for violations.
11. **Disclaimers & limitation of liability** — "as is," no liability for
    decisions made based on content, civic info may be wrong/outdated.
12. **Indemnification.**
13. **Governing law & dispute resolution** — your jurisdiction.
14. **Changes to terms** + effective date.

---

## 9. Copy direction (voice)

- Plain, confident, non-partisan. Short sentences.
- Lead with the *benefit* ("understand how your country works"), then the *how*
  (community-written, verified, reviewed).
- Avoid jargon ("decentralized", "blockchain" — none of that applies).
- Civic and inclusive; never align with a political side.

**Hero candidates:**
- "Understand how your country works."
- "Civic knowledge, written by the people who live it."
- "Your country, explained — by verified locals."

---

## 10. Build checklist

- [ ] Set brand constants in one config (name, emails, store URLs, entity).
- [ ] Landing page with the sections in §3.
- [ ] Real app screenshots in device frames (home, article, Local Lens).
- [ ] Official App Store + Google Play badge assets, linked to store listings.
- [ ] Theme: Inter font + CSS variables from §4; white + `--surface-2` bands.
- [ ] `/privacy` and `/terms` pages (lawyer-reviewed) with last-updated dates.
- [ ] `/delete-account` (or support) page for the deletion flow.
- [ ] SEO: titles, meta, OG image, sitemap, robots, favicon.
- [ ] Responsive + accessible (alt text, contrast, reduced-motion).
- [ ] Deploy to Vercel/Netlify with a custom domain + HTTPS.
- [ ] Link Privacy/Terms URLs back into the App Store & Play Console listings.

---

## 11. Deliverables to hand the website repo

So the other repo can start immediately, hand over:
1. **Logo** (SVG, light + dark variants) + favicon + OG image.
2. **App screenshots** (PNG, high-res) — home, an embedded article, the
   pending/voting view, a collection, Local Lens.
3. **This palette** (§4) and the **Inter** font choice.
4. **Final brand strings** — exact app name, tagline, support email, legal
   entity, governing-law jurisdiction.
5. **Store URLs** once the listings exist (or placeholders).
