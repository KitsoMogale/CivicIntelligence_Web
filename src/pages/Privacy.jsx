import config from '../config.js'
import LegalPage from '../components/LegalPage.jsx'

// Privacy Policy — full copy covering guide §6 (1–13).
// Bracketed [..] placeholders are deliberate: set them before publishing.
const SECTIONS = [
  {
    heading: 'Who we are',
    blocks: [
      { p: '{appName} ("we", "us", "our") is operated by {legalEntity}. This Privacy Policy explains what personal data we collect when you use the {appName} mobile app, how we use it, and the rights you have over it.' },
      { p: 'If you have any questions about this policy or your data, contact us at {privacyEmail}.' },
    ],
  },
  {
    heading: 'What we collect',
    blocks: [
      { sub: 'Account information' },
      { p: 'When you sign in with Google, we receive your name, email address, profile photo, and Google user ID. We use these to create and secure your account and to display your contributor name.' },
      { sub: 'Location' },
      { p: 'We use your device’s GPS coordinates once, at the moment you verify, to determine the country and city you live in (accurate to roughly 30 km). We do not track your location in the background or build a location history.' },
      { p: 'From that verification we store only the result — your countryCode, cityId, cityName, regionName, and the date you verified (cityVerifiedAt). We discard the raw GPS coordinates once verification is complete; we do not keep your precise location.' },
      { sub: 'User content' },
      { p: 'We store the content you create: articles, collections, edits and edit suggestions, comments, votes, ratings, and the photos and videos you upload to Local Lens.' },
      { sub: 'Usage and device data' },
      { p: 'We collect standard app and diagnostic data (such as device type, app version, crash reports, and basic usage events) through Google Firebase, to keep the service running and improve it.' },
    ],
  },
  {
    heading: 'How we use your data',
    blocks: [
      { p: 'We use the data described above to:' },
      { list: [
        'Authenticate you and keep your account secure.',
        'Verify your country and city and scope content to your location.',
        'Operate community review — submissions, voting, edits, and versioning.',
        'Display your contributions and your display name to other users.',
        'Detect, prevent, and respond to abuse, spam, and policy violations.',
        'Operate, maintain, debug, and improve the service.',
      ] },
    ],
  },
  {
    heading: 'Legal basis (EU/UK users)',
    blocks: [
      { p: 'If you are in the EU or UK, we process your personal data on these legal bases: your consent (for example, for location verification and any optional analytics), performance of our contract with you (to provide the app and your account), and our legitimate interests (to keep the service secure, prevent abuse, and improve it).' },
      { p: 'You can withdraw consent at any time; see "Your rights" below.' },
    ],
  },
  {
    heading: 'Sharing and processors',
    blocks: [
      { p: 'We do not sell your personal data. We share it only with service providers ("processors") that help us run the app:' },
      { list: [
        'Google Firebase (Authentication, Firestore, Cloud Storage, Cloud Functions, Hosting) — our backend and data storage. See Google’s Privacy Policy and the Firebase data terms.',
        'Google Sign-In — for account authentication.',
      ] },
      { p: 'We may also disclose data where required by law, or to protect the rights, safety, and security of our users and the service.' },
    ],
  },
  {
    heading: 'Public content notice',
    blocks: [
      { note: 'Important: {appName} is a public, community knowledge platform. The articles, collections, edits, comments, votes, and Local Lens posts you create — along with your display name — are visible to other users, especially within your country.' },
      { p: 'Do not include personal information you don’t want to be public in the content you post. Because contributions are collaboratively edited and versioned, your earlier versions remain part of the article’s history.' },
    ],
  },
  {
    heading: 'Data retention',
    blocks: [
      { p: 'We keep your account data for as long as your account is active. When you delete your account, we delete your profile, your Local Lens uploads, and your comments.' },
      { p: 'Because articles are co-authored by the community, embedded articles you contributed to may remain as part of the shared knowledge base after you leave; where this happens, we anonymize your authorship. We may also retain limited data where required for legal, security, or abuse-prevention reasons.' },
      { p: 'You can request deletion at any time — see our Account & Data Deletion page.' },
    ],
  },
  {
    heading: 'Your rights',
    blocks: [
      { p: 'Depending on where you live, you may have the right to access, correct, delete, or export your personal data, and to object to or restrict certain processing.' },
      { p: 'To exercise these rights, email {privacyEmail} or use the account deletion flow in the app or on our Delete Account page. We will respond within the time required by applicable law (and in any case within 30 days).' },
    ],
  },
  {
    heading: 'Children',
    blocks: [
      { p: '{appName} is not directed to children. You must be at least {minAge} years old to use the app. If we learn that we have collected personal data from someone under {minAge}, we will delete it.' },
    ],
  },
  {
    heading: 'Security',
    blocks: [
      { p: 'We protect your data with encryption in transit, access controls, and server-side security rules that restrict who can read and write data. No system is perfectly secure, but we work to safeguard your information and respond promptly to any issues.' },
    ],
  },
  {
    heading: 'International transfers',
    blocks: [
      { p: 'Your data is processed by Google (Firebase) and may be stored or processed in countries outside your own, including where Google operates its infrastructure. Where required, we rely on appropriate safeguards (such as standard contractual clauses) for these transfers.' },
    ],
  },
  {
    heading: 'Changes to this policy',
    blocks: [
      { p: 'We may update this Privacy Policy from time to time. When we make material changes, we will update the "Last updated" date above and, where appropriate, notify you in the app. Your continued use of {appName} after changes take effect means you accept the updated policy.' },
    ],
  },
  {
    heading: 'Effective date',
    blocks: [
      { p: 'This policy is effective as of the "Last updated" date shown at the top of this page.' },
    ],
  },
]

export default function Privacy() {
  return (
    <LegalPage
      title="Privacy Policy"
      lastUpdated={config.lastUpdated}
      intro="This policy describes the personal data {appName} collects, how we use it, who we share it with, and the choices and rights you have."
      sections={SECTIONS}
      crossLink={{ text: 'For the rules that govern using the app, see our', to: '/terms', label: 'Terms of Use' }}
      vars={{
        appName: config.appName,
        privacyEmail: config.privacyEmail,
        contactEmail: config.contactEmail,
        legalEntity: config.legalEntity || '[your registered legal entity and country]',
        minAge: config.minAge,
      }}
    />
  )
}
