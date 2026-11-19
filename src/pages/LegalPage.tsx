import { useEffect } from 'react';
import { Link } from 'react-router-dom';

const UPDATED = '19 November 2026';
const CONTACT = 'privacy@velospherecrm.com';

type Block = {
  id?: string;
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
};

type LegalDoc = {
  path: string;
  title: string;
  kicker: string;
  summary: string;
  blocks: Block[];
};

const DOCS: Record<string, LegalDoc> = {
  privacy: {
    path: '/privacy',
    title: 'Privacy policy',
    kicker: 'Legal',
    summary:
      'How VeloSphere handles account data, customer records, and the Android and iOS apps.',
    blocks: [
      {
        heading: 'Who we are',
        paragraphs: [
          'VeloSphere is a real-estate lead CRM for sales teams, available at velospherecrm.com and as the VeloSphere mobile app (Android package name in.veloind.crm). This policy covers the website, the signed-in web application, and the mobile apps.',
          'Workspaces are created for a customer organization. That organization decides who has a login and what business records go into the workspace. VeloSphere hosts and processes that data to provide the service.',
        ],
      },
      {
        heading: 'Information we process',
        paragraphs: [
          'Account data. Name, work email, optional phone number, role, team, a hashed password, and session tokens used to keep you signed in.',
          'Records your organization puts in the workspace. Leads (name, phone numbers, email, city, requirement, budget, source, notes), follow-ups, meetings, attendance, leave, payroll, employee documents, and the company profile (including PAN, GST, and RERA when your admin stores them).',
          'App activity. In-app notifications, and follow-up reminders scheduled on the device. The apps do not collect precise location, contacts, photos, or microphone audio. Opening the phone dialer, email, or WhatsApp from a lead hands that action to the other app.',
          'Technical data. Standard server logs such as IP address, time, and browser or app version, used to run and protect the service.',
        ],
      },
      {
        heading: 'How we use it',
        bullets: [
          'To sign you in and show the leads, attendance, and reports your role is allowed to see.',
          'To assign work, send in-app notifications, and schedule on-device follow-up reminders.',
          'To operate, secure, and support the workspace, including imports, exports, and password resets requested by an administrator.',
          'To bill the organization for its subscription. The mobile apps do not sell anything inside the app.',
        ],
      },
      {
        heading: 'Who we share it with',
        paragraphs: [
          'We do not sell personal information. People in your organization see data according to their role. Administrators can export workspace records.',
          'We use infrastructure and email providers to host the service and send messages such as password resets. Those providers process data only to perform that work. We also disclose information when the law requires it.',
        ],
      },
      {
        heading: 'How long we keep it',
        paragraphs: [
          'Workspace data stays for as long as the organization’s subscription is active. When a workspace is closed, we delete or return that data within 30 days, except where we must keep a record for accounting, security, or a legal duty. Backups are overwritten on their normal cycle.',
          'Passwords are stored only as hashes. Session tokens expire and can be revoked.',
        ],
      },
      {
        heading: 'Security',
        paragraphs: [
          'Traffic uses HTTPS. Each organization’s data is separated by tenant. Access inside a workspace follows role. No method of storage or transmission is perfect; if we learn of a breach that affects your workspace, we will tell the organization administrator.',
        ],
      },
      {
        id: 'your-requests',
        heading: 'Access, correction, and deletion',
        paragraphs: [
          'Ask your organization administrator to correct or remove your user account, or to correct a lead or HR record the company holds. You can also write to us at the address below. We will confirm the request with the organization that owns the workspace, because employee and lead records belong to that organization.',
          `To delete an account, follow the steps at velospherecrm.com/account-deletion or email ${CONTACT}.`,
        ],
      },
      {
        heading: 'Children',
        paragraphs: [
          'VeloSphere is a workplace tool. It is not directed at anyone under 18, and we do not knowingly create accounts for children.',
        ],
      },
      {
        heading: 'Changes',
        paragraphs: [
          'When this policy changes, we update the date at the top of this page. Continued use of the service after the new date means the updated policy applies.',
        ],
      },
    ],
  },
  terms: {
    path: '/terms',
    title: 'Terms of service',
    kicker: 'Legal',
    summary: 'The rules for using the VeloSphere website, web application, and mobile apps.',
    blocks: [
      {
        heading: 'The service',
        paragraphs: [
          'VeloSphere provides a hosted CRM for a customer organization: leads, assignment, attendance, HR records, and reporting. The public site describes the product. The signed-in application and the mobile apps are the product.',
          'Your organization administrator creates user accounts. You need a work login from that organization. There is no public self-signup.',
        ],
      },
      {
        heading: 'Your account',
        paragraphs: [
          'Keep your password to yourself. You are responsible for activity under your login. Tell your administrator if you think someone else is using it. We may suspend a login that is unused, compromised, or used in a way that breaks these terms.',
        ],
      },
      {
        heading: 'Customer data',
        paragraphs: [
          'The organization owns the business records it stores in VeloSphere. You may only enter and use data you are allowed to handle. Do not upload data you have no right to store, and do not use the service to spam, scrape, or break into another system.',
          'We process that data to provide the service, as described in the privacy policy.',
        ],
      },
      {
        heading: 'Plans and payment',
        paragraphs: [
          'Subscriptions are sold to the organization, priced in Indian rupees, and billed outside the mobile app stores. The prices on the website are list prices. A written order or invoice controls if it differs. The Android and iOS apps do not offer in-app purchases.',
          'Seat and lead limits follow the plan the organization is on. We may suspend a workspace that is unpaid after notice to the administrator.',
        ],
      },
      {
        heading: 'Availability',
        paragraphs: [
          'We work to keep VeloSphere available and will schedule maintenance when we can do so without disrupting a working day. We do not promise uninterrupted service. Features can change as the product improves.',
        ],
      },
      {
        heading: 'Liability',
        paragraphs: [
          'The service is provided as a business tool. To the extent the law allows, VeloSphere is not liable for lost profits, lost leads, or indirect damages, and total liability in a month is limited to the fees the organization paid for that month. Nothing in these terms limits liability that cannot be limited under Indian law.',
        ],
      },
      {
        heading: 'Law',
        paragraphs: [
          'These terms are governed by the laws of India. Disputes are subject to the courts of India.',
        ],
      },
    ],
  },
  refund: {
    path: '/refund',
    title: 'Refund policy',
    kicker: 'Legal',
    summary: 'How organization subscriptions are cancelled and when a charge is refunded.',
    blocks: [
      {
        heading: 'What is billed',
        paragraphs: [
          'VeloSphere is billed to the customer organization as a subscription. The mobile apps do not charge you and do not use Google Play billing or Apple in-app purchases. A refund request is about an invoice or payment made to VeloSphere, not a store purchase.',
        ],
      },
      {
        heading: 'Cancellation',
        paragraphs: [
          'An organization administrator can cancel by emailing us. Access continues through the period already paid. Cancelling stops the next renewal. It does not by itself erase the workspace; deletion is covered in the privacy policy and on the account deletion page.',
        ],
      },
      {
        heading: 'Refunds',
        paragraphs: [
          'Write to us within 7 days of a charge if it was duplicated, taken in error, or the workspace was never made available. We refund those charges to the original payment method.',
          'Fees for a period you have already used are not refunded, including after a mid-cycle cancellation. If a written order says something more specific, that order applies.',
        ],
      },
    ],
  },
  deletion: {
    path: '/account-deletion',
    title: 'Delete your account',
    kicker: 'Privacy',
    summary:
      'How to ask VeloSphere to delete a user login or an entire organization workspace.',
    blocks: [
      {
        heading: 'Delete a user login',
        paragraphs: [
          'VeloSphere accounts are created by your company, not by a public sign-up form. To remove your login:',
        ],
        bullets: [
          'Ask your organization administrator to deactivate or delete your user in User Management. That is the fastest path.',
          `Or email ${CONTACT} from the work address on the account. Include your name, that email, and the company name on the workspace.`,
          'We confirm the request with the organization administrator, then delete or deactivate the user login and its session tokens.',
        ],
      },
      {
        heading: 'What is deleted',
        paragraphs: [
          'Your login, password hash, and sessions are removed or disabled. Lead, attendance, and payroll records the company created stay in the company workspace, because those are the company’s business records. Your name may remain on historical activity the company needs for its own audit.',
          'To remove a specific lead or document, the organization administrator deletes it inside the workspace, or includes it in the email request.',
        ],
      },
      {
        heading: 'Delete a whole workspace',
        paragraphs: [
          `Only the organization owner can close the tenant. Email ${CONTACT} with the company name and the owner’s work email. We delete the workspace data within 30 days of confirming the request, aside from records we must keep for accounting, security, or a legal duty.`,
        ],
      },
    ],
  },
};

const RELATED = [
  { to: '/privacy', label: 'Privacy policy' },
  { to: '/terms', label: 'Terms of service' },
  { to: '/refund', label: 'Refund policy' },
  { to: '/account-deletion', label: 'Delete account' },
];

function LegalDocument({ doc }: { doc: LegalDoc }) {
  useEffect(() => {
    const previous = document.title;
    document.title = `${doc.title} · VeloSphere`;
    return () => {
      document.title = previous;
    };
  }, [doc.title]);

  return (
    <div className="min-h-screen bg-[#f4f6f8] text-[#1c1f26]">
      <header className="border-b border-[#d5dae1] bg-[#1c1f26]">
        <div className="mx-auto flex h-16 max-w-[840px] items-center justify-between px-6">
          <Link to="/" aria-label="VeloSphere" className="inline-flex items-center">
            <img src="/velo-logo.png" alt="" className="h-10 w-auto object-contain" />
          </Link>
          <Link to="/login" className="text-[13px] font-medium text-white/80 hover:text-white">
            Sign in
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-[840px] px-6 py-12">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#3D5A80]">
          {doc.kicker}
        </p>
        <h1 className="m-0 text-[clamp(32px,4vw,44px)] font-semibold leading-tight tracking-tight">
          {doc.title}
        </h1>
        <p className="mt-4 max-w-[62ch] text-[16px] leading-relaxed text-[#4b5563]">{doc.summary}</p>
        <p className="mt-3 font-mono text-[12px] text-[#6b7280]">Updated {UPDATED}</p>

        <article className="mt-10 space-y-9 border-t border-[#d5dae1] pt-10">
          {doc.blocks.map((block) => (
            <section key={block.heading} id={block.id}>
              <h2 className="m-0 text-[18px] font-semibold tracking-tight">{block.heading}</h2>
              {block.paragraphs?.map((paragraph) => (
                <p key={paragraph} className="mt-3 max-w-[68ch] text-[15px] leading-7 text-[#374151]">
                  {paragraph}
                </p>
              ))}
              {block.bullets ? (
                <ul className="mt-3 max-w-[68ch] list-disc space-y-2 pl-5 text-[15px] leading-7 text-[#374151]">
                  {block.bullets.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}
        </article>

        <aside className="mt-12 rounded-xl border border-[#d5dae1] bg-white p-6">
          <h2 className="m-0 text-[15px] font-semibold">Contact</h2>
          <p className="mt-2 text-[14.5px] leading-7 text-[#374151]">
            VeloSphere ·{' '}
            <a className="text-[#3D5A80] underline" href={`mailto:${CONTACT}`}>
              {CONTACT}
            </a>
          </p>
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[13.5px]">
            {RELATED.filter((item) => item.to !== doc.path).map((item) => (
              <Link key={item.to} to={item.to} className="text-[#3D5A80] underline">
                {item.label}
              </Link>
            ))}
          </div>
        </aside>
      </main>
    </div>
  );
}

export function PrivacyPage() {
  return <LegalDocument doc={DOCS.privacy} />;
}

export function TermsPage() {
  return <LegalDocument doc={DOCS.terms} />;
}

export function RefundPage() {
  return <LegalDocument doc={DOCS.refund} />;
}

export function AccountDeletionPage() {
  return <LegalDocument doc={DOCS.deletion} />;
}
