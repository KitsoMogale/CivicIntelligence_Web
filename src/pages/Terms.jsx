import config from '../config.js'
import LegalPage from '../components/LegalPage.jsx'

// Terms of Use — full copy covering guide §8 (1–14).
// Bracketed [..] placeholders are deliberate decisions to make before publishing.
const SECTIONS = [
  {
    heading: 'Acceptance & eligibility',
    blocks: [
      { p: 'By downloading, accessing, or using {appName} (the "app" or "service"), you agree to these Terms of Use. If you do not agree, do not use the app.' },
      { p: 'You must be at least {minAge} years old to use {appName}. By using the app you confirm that you meet this age requirement.' },
    ],
  },
  {
    heading: 'The service',
    blocks: [
      { p: '{appName} is a collaborative, country-scoped civic knowledge platform. Verified locals co-author and review plain-language explainers of how their country works — its systems, institutions, companies, policies, and resources — and can document the country visually through Local Lens.' },
      { note: 'Content on {appName} is contributed and reviewed by the community. It is not official government information, and we do not warrant that it is accurate, complete, or up to date. Do not rely on it as a substitute for official sources or professional advice.' },
    ],
  },
  {
    heading: 'Accounts',
    blocks: [
      { p: 'You sign in with Google and are responsible for activity on your account and for keeping access to it secure. You may hold one account. Tell us promptly at {contactEmail} if you suspect unauthorized use of your account.' },
    ],
  },
  {
    heading: 'Location verification',
    blocks: [
      { p: 'To contribute, you verify the country and city where you live. You agree to verify only a location where you genuinely live. Falsifying your location, or attempting to bypass verification, may result in removal of your contributions or your account.' },
    ],
  },
  {
    heading: 'User-generated content',
    blocks: [
      { p: 'You keep ownership of the content you create. To operate the platform, you grant {legalEntity} a worldwide, non-exclusive, royalty-free license to host, store, reproduce, display, distribute, and — because contributions are collaboratively maintained — to allow the community to edit, version, adapt, and translate your contributions within the service.' },
      { p: 'You are responsible for everything you post. You represent that you have the rights to the content and media you upload — including the photos and videos you post to Local Lens — and that posting it does not violate anyone’s rights or any law.' },
      { p: 'Community content is not released under an open or Creative Commons license. All rights are reserved: aside from the license you grant us above to operate the platform, you may not copy, redistribute, or reuse content from {appName} outside the app without permission from the rights holders.' },
    ],
  },
  {
    heading: 'Acceptable use & prohibited content',
    blocks: [
      { p: 'You agree not to post or do any of the following:' },
      { list: [
        'Illegal content, or content that promotes illegal activity.',
        'Hate speech, harassment, threats, or doxxing.',
        'Misinformation presented as fact, or deliberately deceptive content.',
        'Spam, advertising, or repetitive low-quality submissions.',
        'Impersonation of any person, organization, or official body.',
        'Content that infringes copyright, trademarks, or other rights.',
        'Attempts to manipulate or game voting, reviews, or reputation.',
        'Interfering with, scraping, or attacking the service or its security.',
      ] },
    ],
  },
  {
    heading: 'Community review & moderation',
    blocks: [
      { p: 'Submissions and edits are reviewed by the community through voting. We and the community may reject, edit, roll back, hide (including in response to reports), or remove content that violates these Terms or our guidelines, at our discretion. You can report content for review using the in-app tools.' },
    ],
  },
  {
    heading: 'Intellectual property',
    blocks: [
      { p: 'The {appName} name, logo, app, and the design and selection of the platform are owned by {legalEntity} and protected by intellectual-property laws. These Terms do not grant you any right to our brand or software except as needed to use the app normally.' },
      { p: 'Community-contributed content is governed by the content license described in Section 5.' },
    ],
  },
  {
    heading: 'Privacy',
    blocks: [
      { p: 'Our handling of your personal data is described in our Privacy Policy, which forms part of these Terms. Please read it to understand what we collect and how we use it.' },
    ],
  },
  {
    heading: 'Termination',
    blocks: [
      { p: 'You may stop using {appName} at any time and may delete your account (see our Delete Account page). We may suspend or terminate your access if you violate these Terms or to protect the service and its users. Sections that by their nature should survive termination (such as content license, disclaimers, limitation of liability, and indemnification) will continue to apply.' },
    ],
  },
  {
    heading: 'Disclaimers & limitation of liability',
    blocks: [
      { p: 'The service and all content are provided "as is" and "as available", without warranties of any kind, whether express or implied, including accuracy, fitness for a particular purpose, or non-infringement.' },
      { p: 'To the maximum extent permitted by law, {legalEntity} is not liable for any indirect, incidental, special, or consequential damages, or for any decisions you make based on content in the app, which may be incomplete, outdated, or incorrect.' },
    ],
  },
  {
    heading: 'Indemnification',
    blocks: [
      { p: 'You agree to indemnify and hold harmless {legalEntity} and its operators from any claims, damages, losses, and expenses (including reasonable legal fees) arising out of your content, your use of the app, or your violation of these Terms or any law or third-party right.' },
    ],
  },
  {
    heading: 'Governing law & dispute resolution',
    blocks: [
      { p: 'These Terms are governed by the laws of {governingLaw}, without regard to its conflict-of-laws rules. Any disputes will be subject to the courts of {governingLaw}.' },
    ],
  },
  {
    heading: 'Changes to these Terms',
    blocks: [
      { p: 'We may update these Terms from time to time. When we make material changes, we will update the "Last updated" date above and, where appropriate, notify you in the app. Your continued use of {appName} after changes take effect means you accept the updated Terms.' },
    ],
  },
]

export default function Terms() {
  return (
    <LegalPage
      title="Terms of Use"
      lastUpdated={config.lastUpdated}
      intro="These Terms govern your use of {appName}. Please read them carefully — by using the app, you agree to them."
      sections={SECTIONS}
      crossLink={{ text: 'To learn how we handle your data, see our', to: '/privacy', label: 'Privacy Policy' }}
      vars={{
        appName: config.appName,
        contactEmail: config.contactEmail,
        legalEntity: config.legalEntity || '[your registered legal entity]',
        governingLaw: config.governingLaw || '[your jurisdiction]',
        minAge: config.minAge,
      }}
    />
  )
}
