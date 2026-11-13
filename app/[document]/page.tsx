import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
const pages: Record<
  string,
  {
    title: string;
    intro: string;
    sections: { heading: string; body: string }[];
  }
> = {
  privacy: {
    title: "Privacy",
    intro:
      "This notice describes the new Civic Intelligence web workspace. The previous mobile community app is a separate service.",
    sections: [
      {
        heading: "Local exploration data",
        body: "Your navigation, map layers, comparison filters, saved investigations, notes and source-review decisions are stored in this browser’s local storage. Imported proposals are validated in the browser. Reports and investigation exports are downloaded to your device. This workspace has no account, advertising or analytics integration and does not request GPS location.",
      },
      {
        heading: "Assistant conversations",
        body: "When you send a message, the server receives your question, recent conversation history and current exploration context. With an API key configured, these are sent to OpenAI to produce a response. Requests use store: false. Provider processing remains subject to its applicable data policies. Without a key, the local guide processes the request on the application server. Chat messages are held in browser memory and are not written to the knowledge database.",
      },
      {
        heading: "Technical data",
        body: "The hosting provider may process IP addresses and request logs to operate the service. A configured rate limiter stores temporary request counters. This workspace does not control the provider’s infrastructure logging.",
      },
      {
        heading: "Your choices",
        body: "Clear this site’s browser storage to remove saved explorations and remembered navigation. Start a new conversation or reload the page to clear the displayed chat. Contact kitsomogale19@gmail.com for privacy questions.",
      },
    ],
  },
  terms: {
    title: "Terms of use",
    intro:
      "Civic Intelligence is an independent exploration tool. It is not affiliated with any government.",
    sections: [
      {
        heading: "Knowledge and coverage",
        body: "The workspace includes curated South African institutions, municipalities, mining and infrastructure examples, historical Census counts, and selected World Bank indicators for South Africa, Botswana and Namibia. Records and ownership disclosures may be incomplete or outdated; reporting dates and references identify their evidence. Geography is simplified for exploration. Do not treat AI explanations as authoritative advice.",
      },
      {
        heading: "Using the workspace",
        body: "Use the service lawfully. Do not attempt to bypass request limits, access secrets, interfere with infrastructure or submit content you are not entitled to share with the assistant provider.",
      },
      {
        heading: "Sources and exported material",
        body: "Source materials remain subject to their publishers’ terms. Reports and snapshots include references; they do not transfer rights to source publications. Natural Earth is public domain. Province boundaries retain geoBoundaries CC BY 4.0 and original OCHA/Municipal Demarcation Board CC BY 3.0 IGO attribution. World Bank indicators retain CC BY 4.0 attribution. Municipal directory information is attributed to National Treasury with its update date. No publisher endorsement is implied.",
      },
      {
        heading: "Availability and contact",
        body: "This is an early application. Features, coverage and availability may change. Questions and reports can be sent to kitsomogale19@gmail.com.",
      },
    ],
  },
  support: {
    title: "A little help exploring",
    intro:
      "Start with South Africa. Select a knowledge domain, open an entity, and follow its documented connections.",
    sections: [
      {
        heading: "How do I use the canvas?",
        body: "Switch between Map, Hierarchy, Relationships, System flow, Data, Compare and History. Map layers include provinces, Census overlays, cities, mining province locators and published station locators. Open an entity or connection to inspect evidence. Bookmarks preserve an investigation and its notes; the report icon exports a visual HTML report you can print to PDF.",
      },
      {
        heading: "Why does the assistant say Local guide?",
        body: "The local guide works without credentials and recognizes a small set of exploration requests. A server-side OpenAI API key enables open-ended responses and tool calling. Both paths use validated canvas commands.",
      },
      {
        heading: "What countries are covered?",
        body: "The map has worldwide country boundaries. Detailed institutional records focus on South Africa. Compare includes historical 2014–2024 World Bank population and GDP growth observations for South Africa, Botswana and Namibia, with matching years. Other countries have map coverage. Dated history records cover selected South African events.",
      },
      {
        heading: "Contact",
        body: "Report a problem, request a source correction, or ask a question at kitsomogale19@gmail.com.",
      },
    ],
  },
  "delete-account": {
    title: "Account and data deletion",
    intro:
      "The new web workspace does not create user accounts. Saved explorations and navigation live on this device.",
    sections: [
      {
        heading: "Clear web workspace data",
        body: "Clear this site’s browser storage to remove saved explorations and remembered navigation. Reloading clears the in-memory conversation. The web workspace has no account deletion form because it has no account system.",
      },
      {
        heading: "Previous Civic Intelligence mobile app",
        body: "For an account in the previous community mobile app, use Account → Delete account and type DELETE to confirm. This is a separate service. For help accessing that account or requesting deletion, email kitsomogale19@gmail.com from the address associated with it.",
      },
    ],
  },
};
export function generateStaticParams() {
  return Object.keys(pages).map((document) => ({ document }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ document: string }>;
}): Promise<Metadata> {
  const { document } = await params;
  return {
    title: (pages[document]?.title || "Not found") + " · Civic Intelligence",
  };
}
export default async function Document({
  params,
}: {
  params: Promise<{ document: string }>;
}) {
  const { document } = await params;
  const page = pages[document];
  if (!page) notFound();
  return (
    <main className="legal-shell">
      <nav>
        <Link href="/">← Back to workspace</Link>
        <Link href="/privacy">Privacy</Link>
        <Link href="/terms">Terms</Link>
        <Link href="/support">Support</Link>
      </nav>
      <span className="eyebrow">CIVIC INTELLIGENCE</span>
      <h1>{page.title}</h1>
      <p>{page.intro}</p>
      {page.sections.map((section) => (
        <section key={section.heading}>
          <h2>{section.heading}</h2>
          <p>{section.body}</p>
        </section>
      ))}
      <footer>
        Independent exploration. Source references are provided in the
        workspace. Updated 13 November 2026.
      </footer>
    </main>
  );
}
