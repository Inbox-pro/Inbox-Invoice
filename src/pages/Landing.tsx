import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  Check,
  ChevronDown,
  Coins,
  FileText,
  Play,
  ReceiptText,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../services/api.ts';
import { useAuthStore } from '../stores/authStore.ts';
import { Button, FatooraLogo } from '../components/ui/Primitives.tsx';
import type { Company, User } from '../../shared/types.ts';

const FEATURES = [
  {
    icon: FileText,
    title: 'Smart Invoice Builder',
    desc: 'Create bilingual UAE tax invoices in under two minutes. Auto-calculate 5% VAT per line, apply discounts, and check all 51 FTA mandatory fields before sending.',
  },
  {
    icon: ShieldCheck,
    title: 'FTA Compliance Engine',
    desc: 'Built-in validation against the PINT-AE UBL 2.1 standard. Embedded QR codes, 15-digit TRN verification, and one-click XML generation.',
  },
  {
    icon: BarChart3,
    title: 'Real-Time Dashboard',
    desc: 'Track monthly revenue, overdue receivables, and quarterly VAT summaries at a glance without touching a spreadsheet.',
  },
  {
    icon: Users,
    title: 'Client Directory',
    desc: 'Maintain every buyer with TRN, Peppol TIN, Emirate address, payment terms, and complete invoice history in one place.',
  },
  {
    icon: Coins,
    title: 'Multi-Currency Support',
    desc: 'Invoice international clients in AED, USD, EUR, GBP, or SAR with automatic AED tax currency conversion.',
  },
  {
    icon: ReceiptText,
    title: 'Credit Notes & Adjustments',
    desc: 'Issue FTA-compliant tax credit notes linked directly to original invoices to handle refunds, returns, and adjustments cleanly.',
  },
];

const STEPS = [
  {
    num: '01',
    title: 'Set up your company',
    desc: 'Add your 15-digit UAE TRN, logo, and Emirates bank IBAN once. We apply them to every tax document.',
  },
  {
    num: '02',
    title: 'Add your clients',
    desc: 'Store UAE B2B and free zone buyers with built-in TRN validation and custom Net payment terms.',
  },
  {
    num: '03',
    title: 'Create & send invoices',
    desc: 'Build invoices with catalog autocomplete, per-line VAT calculation, and instant 51-field compliance checks.',
  },
  {
    num: '04',
    title: 'Stay FTA compliant',
    desc: 'Download PINT-AE UBL 2.1 XML, export bilingual PDFs with QR codes, and prepare VAT 201 summaries.',
  },
];

const FAQS = [
  {
    q: 'What is UAE e-invoicing?',
    a: 'Under Ministerial Decisions 243 & 244 of 2025, the UAE Federal Tax Authority requires businesses to exchange structured electronic invoices in PINT-AE UBL 2.1 XML format rather than unstructured PDFs or Word documents.',
  },
  {
    q: 'Is Inbox E-invoicing FTA-compliant?',
    a: 'Yes. Every invoice is validated against all 51 mandatory PINT-AE data fields before sending, calculates VAT per line item according to UAE schedules, embeds a compliant QR code, and exports valid PINT-AE UBL 2.1 XML.',
  },
  {
    q: 'When does e-invoicing become mandatory?',
    a: 'Phased mandatory rollout begins in January 2027 following the 2026 pilot program. Transitioning your invoicing workflow now ensures clean TRN records and zero disruption.',
  },
  {
    q: 'Do I need an Accredited Service Provider (ASP) to use Inbox E-invoicing?',
    a: 'You can start using Inbox E-invoicing immediately to standardize invoicing, TRN records, and PINT-AE XML generation. Direct Peppol 5-corner ASP transmission connects seamlessly as the FTA pilot opens.',
  },
  {
    q: 'How much does Inbox E-invoicing cost?',
    a: 'Pricing is tailored to your business — invoice volume, legal entities, and integrations. Contact our sales team for a quote, or explore the full product first in the free live demo workspace.',
  },
  {
    q: 'Does Inbox E-invoicing support Arabic invoices?',
    a: 'Yes. Every Tax Invoice includes bilingual English and Arabic headers ("TAX INVOICE / فاتورة ضريبية") plus RTL Arabic company and client legal names.',
  },
  {
    q: 'How secure is my financial data?',
    a: 'All passwords are protected with bcrypt hashing, API routes enforce authenticated company-scoped isolation, and session tokens stay strictly in memory.',
  },
  {
    q: 'Can I issue credit notes against existing invoices?',
    a: 'Yes. Inbox E-invoicing links credit notes directly to original tax invoices with automatic sequential numbering (CN-00001), balance adjustments, and VAT return reflection.',
  },
];

const UAE_LOGOS = [
  'Al Noor Trading',
  'Horizon FZE',
  'Gulf Star Advisory',
  'Emirates Fresh',
  'Coral Bay Properties',
  'Desert Ridge Logistics',
];

export default function Landing() {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [demoLoading, setDemoLoading] = useState(false);

  const handleLaunchDemo = async () => {
    setDemoLoading(true);
    try {
      const res = await api.post<{
        success: boolean;
        data: { accessToken: string; refreshToken: string; user: User; company: Company };
      }>('/api/auth/demo');
      setSession(res.data);
      toast.success('Signed into Nexus Digital Solutions LLC demo workspace');
      navigate('/dashboard');
    } catch {
      toast.error('Unable to start demo workspace. Please try signing in.');
      navigate('/login');
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-[#1C1917]">
      {/* Sticky 3-Zone Top Navbar */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-[#E7E5E4]">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
          <Link to="/" className="whitespace-nowrap shrink-0">
            <FatooraLogo size="md" />
          </Link>

          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-[#78716C]">
            <a href="#features" className="hover:text-[#1C1917] transition-colors whitespace-nowrap shrink-0">
              Features
            </a>
            <a href="#how-it-works" className="hover:text-[#1C1917] transition-colors whitespace-nowrap shrink-0">
              How it works
            </a>
            <a href="#pricing" className="hover:text-[#1C1917] transition-colors whitespace-nowrap shrink-0">
              Pricing
            </a>
            <a href="#faq" className="hover:text-[#1C1917] transition-colors whitespace-nowrap shrink-0">
              FAQ
            </a>
          </nav>

          <div className="flex items-center gap-4 shrink-0">
            <Link
              to="/login"
              className="text-sm font-medium text-[#44403C] hover:text-[#1C1917] transition-colors whitespace-nowrap shrink-0"
            >
              Sign in
            </Link>
            <Button size="sm" onClick={() => navigate('/register')}>
              Get Started
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-16 pb-20 sm:pt-24 sm:pb-28 px-4 sm:px-6">
        <div className="max-w-[1200px] mx-auto text-center">
          <p className="text-xs font-semibold tracking-wide text-[#F26522] mb-5">
            E-Invoicing Software · GST e-invoicing System · Inbox Infotech
          </p>

          <h1
            className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-[#1C1917] max-w-3xl mx-auto leading-[1.08]"
            style={{ textWrap: 'balance' }}
          >
            E-invoicing that <span className="text-[#A8A29E]">just</span> works.
          </h1>

          <p className="mt-6 text-base sm:text-lg text-[#78716C] max-w-2xl mx-auto leading-relaxed">
            Simplify the transition to e-invoicing with Inbox Infotech E-invoicing. Generate &amp;
            manage e-invoices with ease using GST e-invoicing software. Try the best e-invoicing
            system now!
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button size="lg" onClick={() => navigate('/register')}>
              Get Started
              <ArrowRight className="w-4 h-4" />
            </Button>
            <Button
              size="lg"
              variant="secondary"
              loading={demoLoading}
              onClick={handleLaunchDemo}
            >
              <Play className="w-3.5 h-3.5 fill-current text-[#F26522]" />
              Try Live Demo
            </Button>
          </div>

          <p className="mt-4 text-xs text-[#A8A29E]">
            Full live demo workspace · No sign-up or credit card required · Custom pricing for your business
          </p>

          {/* Browser Chrome Product Showcase */}
          <div className="mt-14 max-w-5xl mx-auto rounded-2xl border border-[#E7E5E4] bg-[#FAFAF9] shadow-xl overflow-hidden text-left">
            <div className="h-10 px-4 border-b border-[#E7E5E4] bg-white flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#E7E5E4]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#E7E5E4]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#E7E5E4]" />
              </div>
              <div className="text-[11px] font-mono text-[#A8A29E] bg-[#FAFAF9] border border-[#F0EEEC] rounded px-3 py-0.5">
                app.inboxinvoice.com/dashboard
              </div>
              <div className="w-12" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[380px]">
              {/* Mini Sidebar */}
              <div className="hidden lg:flex lg:col-span-3 flex-col border-r border-[#E7E5E4] bg-[#FAFAF9] p-4">
                <div className="mb-4">
                  <FatooraLogo size="sm" />
                  <p className="text-[11px] text-[#78716C] mt-1.5">
                    Nexus Digital Solutions LLC
                  </p>
                </div>
                <div className="space-y-1 text-xs font-medium">
                  <div className="px-2.5 py-2 rounded-md bg-[#FFF3ED] text-[#F26522]">
                    Dashboard
                  </div>
                  <div className="px-2.5 py-2 rounded-md text-[#44403C]">Invoices</div>
                  <div className="px-2.5 py-2 rounded-md text-[#44403C]">Credit Notes</div>
                  <div className="px-2.5 py-2 rounded-md text-[#44403C]">Clients</div>
                  <div className="px-2.5 py-2 rounded-md text-[#44403C]">VAT Summary</div>
                </div>
              </div>

              {/* Mini Dashboard Main */}
              <div className="lg:col-span-9 bg-white p-5 sm:p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-[#1C1917]">Financial Overview</p>
                    <p className="text-xs text-[#78716C]">TRN 100345678901234 · Dubai, UAE</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleLaunchDemo}
                    className="px-3 py-1.5 rounded-md bg-[#F26522] text-white text-xs font-medium hover:bg-[#E05A1B] transition-colors cursor-pointer"
                  >
                    + New Invoice
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'Monthly Revenue', val: 'AED 68,425', note: '+14% vs last mo', color: 'text-[#16A34A]' },
                    { label: 'Outstanding', val: 'AED 41,890', note: '5 open invoices', color: 'text-[#78716C]' },
                    { label: 'Overdue', val: 'AED 14,500', note: '2 invoices overdue', color: 'text-[#DC2626]' },
                    { label: 'FTA Validated', val: '100%', note: '51/51 fields passed', color: 'text-[#F26522]' },
                  ].map((s) => (
                    <div key={s.label} className="p-3.5 rounded-lg border border-[#E7E5E4] bg-white">
                      <p className="text-[11px] text-[#78716C]">{s.label}</p>
                      <p className="text-base sm:text-lg font-bold text-[#1C1917] tabular-nums mt-1">
                        {s.val}
                      </p>
                      <p className={`text-[11px] mt-0.5 ${s.color}`}>{s.note}</p>
                    </div>
                  ))}
                </div>

                {/* Mini Invoice Table Preview */}
                <div className="border border-[#E7E5E4] rounded-lg overflow-hidden">
                  <div className="bg-[#FAFAF9] px-4 py-2 text-[11px] font-medium text-[#78716C] grid grid-cols-12">
                    <span className="col-span-3">INVOICE</span>
                    <span className="col-span-4">CLIENT</span>
                    <span className="col-span-3 text-right">TOTAL (AED)</span>
                    <span className="col-span-2 text-right">STATUS</span>
                  </div>
                  <div className="divide-y divide-[#F0EEEC] text-xs">
                    {[
                      { num: 'INV-00017', client: 'Horizon Technology FZE', total: '12,600.00', status: 'Sent', cls: 'bg-[#FFF3ED] text-[#F26522]' },
                      { num: 'INV-00014', client: 'Al Noor Trading LLC', total: '9,555.00', status: 'Paid', cls: 'bg-[#F0FDF4] text-[#16A34A]' },
                      { num: 'INV-00010', client: 'Al Noor Trading LLC', total: '15,225.00', status: 'Overdue', cls: 'bg-[#FEF2F2] text-[#DC2626]' },
                    ].map((row) => (
                      <div key={row.num} className="px-4 py-2.5 grid grid-cols-12 items-center">
                        <span className="col-span-3 font-mono font-medium text-[#1C1917]">{row.num}</span>
                        <span className="col-span-4 text-[#44403C] truncate">{row.client}</span>
                        <span className="col-span-3 text-right font-medium tabular-nums">AED {row.total}</span>
                        <span className="col-span-2 text-right">
                          <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium ${row.cls}`}>
                            {row.status}
                          </span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Logo Cloud */}
      <section className="border-y border-[#E7E5E4] bg-[#FAFAF9] py-10 px-4 sm:px-6">
        <div className="max-w-[1200px] mx-auto text-center">
          <p className="text-xs font-medium text-[#78716C] mb-6">
            Trusted by 500+ UAE businesses across Dubai, Abu Dhabi, and Sharjah
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6 items-center">
            {UAE_LOGOS.map((name) => (
              <div
                key={name}
                className="flex items-center justify-center gap-2 text-sm font-semibold text-[#A8A29E] tracking-tight"
              >
                <span className="w-2.5 h-2.5 rounded-sm bg-[#D6D3D1] shrink-0" />
                <span className="truncate">{name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 sm:py-24 px-4 sm:px-6">
        <div className="max-w-[1200px] mx-auto">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold text-[#F26522] mb-2">Features</p>
            <h2
              className="text-3xl sm:text-4xl font-bold tracking-tight text-[#1C1917]"
              style={{ textWrap: 'balance' }}
            >
              Everything you need to invoice with confidence.
            </h2>
            <p className="mt-3 text-base text-[#78716C]">
              From bilingual creation to PINT-AE validation, Inbox E-invoicing handles compliance so you can focus on growing your business.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((feat) => {
              const Icon = feat.icon;
              return (
                <div
                  key={feat.title}
                  className="bg-white border border-[#E7E5E4] rounded-xl p-6 hover:border-[#D6D3D1] transition-colors"
                >
                  <div className="w-10 h-10 rounded-lg bg-[#FFF3ED] text-[#F26522] flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-semibold text-[#1C1917]">{feat.title}</h3>
                  <p className="mt-2 text-sm text-[#78716C] leading-relaxed">{feat.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 sm:py-24 px-4 sm:px-6 bg-[#FAFAF9] border-y border-[#E7E5E4]">
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center max-w-xl mx-auto">
            <p className="text-xs font-semibold text-[#F26522] mb-2">Workflow</p>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#1C1917]">
              Up and running in 5 minutes.
            </h2>
          </div>

          <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {STEPS.map((step, i) => (
              <div key={step.num} className="relative">
                <div className="flex items-center gap-3 mb-4">
                  <span className="w-9 h-9 rounded-full bg-[#F26522] text-white text-xs font-bold flex items-center justify-center shrink-0 tabular-nums">
                    {step.num}
                  </span>
                  {i < STEPS.length - 1 && (
                    <div className="hidden lg:block h-px flex-1 bg-[#E7E5E4]" />
                  )}
                </div>
                <h3 className="text-base font-semibold text-[#1C1917]">{step.title}</h3>
                <p className="mt-2 text-sm text-[#78716C] leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bento Grid Preview */}
      <section className="py-20 sm:py-24 px-4 sm:px-6">
        <div className="max-w-[1200px] mx-auto">
          <div className="max-w-xl mb-12">
            <p className="text-xs font-semibold text-[#F26522] mb-2">Workspace</p>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#1C1917]">
              Built for how UAE finance teams actually work.
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Wide Card */}
            <div className="lg:col-span-2 rounded-xl border border-[#E7E5E4] bg-white p-6 flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-semibold text-[#1C1917]">
                  51-Field FTA Validation &amp; PINT-AE XML
                </h3>
                <p className="text-sm text-[#78716C] mt-1 max-w-lg">
                  Every invoice is checked in real time against UAE UBL 2.1 rules before it reaches your buyer.
                </p>
              </div>
              <div className="mt-6 rounded-lg border border-[#E7E5E4] bg-[#FAFAF9] p-4 font-mono text-xs text-[#44403C] overflow-x-auto">
                <p className="text-[#F26522]">&lt;cbc:CustomizationID&gt;urn:peppol:pint:billing-1@ae-1&lt;/cbc:CustomizationID&gt;</p>
                <p className="mt-1">&lt;cbc:DocumentCurrencyCode&gt;AED&lt;/cbc:DocumentCurrencyCode&gt;</p>
                <p className="mt-1">&lt;cbc:TaxCurrencyCode&gt;AED&lt;/cbc:TaxCurrencyCode&gt;</p>
                <p className="mt-1 text-[#16A34A]">&lt;cbc:CompanyID&gt;100345678901234&lt;/cbc:CompanyID&gt;</p>
              </div>
            </div>

            {/* Bilingual PDF Card */}
            <div className="rounded-xl border border-[#E7E5E4] bg-white p-6 flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-semibold text-[#1C1917]">Bilingual PDF + QR</h3>
                <p className="text-sm text-[#78716C] mt-1">
                  English &amp; Arabic legal headers with embedded FTA QR code.
                </p>
              </div>
              <div className="mt-6 rounded-lg border border-[#E7E5E4] p-4 bg-[#FAFAF9] space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-[#F26522]">TAX INVOICE</span>
                  <span className="font-arabic text-xs font-semibold text-[#1C1917]">
                    فاتورة ضريبية
                  </span>
                </div>
                <div className="h-px bg-[#E7E5E4]" />
                <div className="flex justify-between text-xs tabular-nums">
                  <span className="text-[#78716C]">VAT (5%)</span>
                  <span className="font-medium">AED 475.00</span>
                </div>
                <div className="flex justify-between text-xs font-bold tabular-nums">
                  <span>Grand Total</span>
                  <span>AED 9,975.00</span>
                </div>
              </div>
            </div>

            {/* VAT Summary Card */}
            <div className="rounded-xl border border-[#E7E5E4] bg-white p-6">
              <h3 className="text-lg font-semibold text-[#1C1917]">VAT 201 Ready</h3>
              <p className="text-sm text-[#78716C] mt-1">
                Output VAT grouped by Standard 5%, Zero-Rated, Exempt, and Reverse Charge.
              </p>
              <div className="mt-5 space-y-2.5 text-xs tabular-nums">
                <div className="flex justify-between py-1.5 border-b border-[#F0EEEC]">
                  <span className="text-[#78716C]">Standard Rated (5%)</span>
                  <span className="font-semibold">AED 8,420.00</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[#F0EEEC]">
                  <span className="text-[#78716C]">Zero-Rated Exports</span>
                  <span className="font-semibold">AED 0.00</span>
                </div>
                <div className="flex justify-between py-1.5 text-[#F26522] font-semibold">
                  <span>Net VAT Payable</span>
                  <span>AED 8,282.50</span>
                </div>
              </div>
            </div>

            {/* Status Pipeline Card */}
            <div className="lg:col-span-2 rounded-xl border border-[#E7E5E4] bg-white p-6">
              <h3 className="text-lg font-semibold text-[#1C1917]">
                Automated Receivables &amp; Overdue Detection
              </h3>
              <p className="text-sm text-[#78716C] mt-1">
                Track every invoice from Draft to Sent, Partially Paid, Paid, or Overdue with automatic aging buckets.
              </p>
              <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                {[
                  { label: 'Draft', count: '1', bg: 'bg-[#EFF6FF] text-[#2563EB]' },
                  { label: 'Sent', count: '3', bg: 'bg-[#FFF3ED] text-[#F26522]' },
                  { label: 'Paid', count: '11', bg: 'bg-[#F0FDF4] text-[#16A34A]' },
                  { label: 'Overdue', count: '2', bg: 'bg-[#FEF2F2] text-[#DC2626]' },
                ].map((b) => (
                  <div key={b.label} className={`rounded-lg p-3.5 ${b.bg}`}>
                    <p className="text-2xl font-bold tabular-nums">{b.count}</p>
                    <p className="text-xs font-medium mt-0.5">{b.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 sm:py-24 px-4 sm:px-6 bg-[#FAFAF9] border-y border-[#E7E5E4]">
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center max-w-xl mx-auto">
            <p className="text-xs font-semibold text-[#F26522] mb-2">Pricing</p>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#1C1917]">
              Simple pricing. No surprises.
            </h2>
            <p className="mt-3 text-base text-[#78716C]">
              One plan, tailored to your invoice volume, entities, and integrations.
            </p>
          </div>

          <div className="mt-12 max-w-md mx-auto">
            {/* Custom plan */}
            <div className="bg-white rounded-xl border-2 border-[#F26522] p-7 flex flex-col shadow-md">
              <p className="text-sm font-semibold text-[#1C1917]">Enterprise</p>
              <p className="text-xs text-[#78716C] mt-1">
                For growing SMBs, multi-entity groups &amp; ERP teams
              </p>
              <p className="mt-5 text-4xl font-bold">Custom</p>
              <p className="text-xs text-[#A8A29E] mt-1">Annual billing &amp; SLA</p>
              <ul className="mt-6 space-y-3 text-sm text-[#44403C] flex-1">
                {[
                  'Unlimited invoices & entities',
                  'Unlimited team members',
                  'Bilingual PDF export with FTA QR code',
                  'UAE VAT calculations & VAT 201 summaries',
                  'Credit notes & adjustments',
                  'PINT-AE UBL 2.1 XML export',
                  'Custom company branding & logo',
                  'REST API & webhook access',
                  'Peppol ASP integration ready',
                  'Dedicated UAE account manager',
                ].map((f) => (
                  <li key={f} className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-[#F26522] shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Button className="w-full mt-7" onClick={() => navigate('/register')}>
                Contact Sales
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20 sm:py-24 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold text-[#F26522] mb-2">FAQ</p>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#1C1917]">
              Frequently asked questions
            </h2>
          </div>

          <div className="divide-y divide-[#E7E5E4] border-y border-[#E7E5E4]">
            {FAQS.map((item, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div key={item.q} className="py-4">
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full flex items-center justify-between gap-4 text-left cursor-pointer"
                  >
                    <span className="text-sm sm:text-base font-medium text-[#1C1917]">
                      {item.q}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-[#78716C] shrink-0 transition-transform duration-150 ${
                        isOpen ? 'rotate-180 text-[#F26522]' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <p className="mt-2.5 text-sm text-[#78716C] leading-relaxed pr-8">
                      {item.a}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="px-4 sm:px-6 pb-20">
        <div className="max-w-[1200px] mx-auto rounded-2xl bg-[#FFF3ED] border border-[#FDBA74]/50 px-6 py-14 sm:px-12 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#1C1917]">
            Ready to simplify your UAE invoicing?
          </h2>
          <p className="mt-3 text-base text-[#78716C] max-w-xl mx-auto">
            Join 500+ businesses simplifying e-invoicing compliance with Inbox E-invoicing by Inbox Infotech.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <Button size="lg" onClick={() => navigate('/register')}>
              Get Started
              <ArrowRight className="w-4 h-4" />
            </Button>
            <Button size="lg" variant="secondary" loading={demoLoading} onClick={handleLaunchDemo}>
              Explore Demo Workspace
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#E7E5E4] bg-[#FAFAF9] py-14 px-4 sm:px-6">
        <div className="max-w-[1200px] mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 pb-10 border-b border-[#E7E5E4]">
            <div className="col-span-2 md:col-span-1">
              <FatooraLogo size="sm" />
              <p className="mt-3 text-xs font-medium text-[#44403C]">
                E-Invoicing Software | GST e-invoicing System | Inbox Infotech
              </p>
              <p className="mt-1.5 text-xs text-[#78716C] leading-relaxed max-w-xs">
                Simplify the transition to e-invoicing with Inbox Infotech E-invoicing. Generate &amp; manage e-invoices with ease.
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-[#1C1917] mb-3">Product</p>
              <ul className="space-y-2 text-xs text-[#78716C]">
                <li><a href="#features" className="hover:text-[#1C1917]">Features</a></li>
                <li><a href="#pricing" className="hover:text-[#1C1917]">Pricing</a></li>
                <li><a href="#faq" className="hover:text-[#1C1917]">FAQ</a></li>
                <li><Link to="/login" className="hover:text-[#1C1917]">Sign in</Link></li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold text-[#1C1917] mb-3">Compliance</p>
              <ul className="space-y-2 text-xs text-[#78716C]">
                <li><span>PINT-AE UBL 2.1</span></li>
                <li><span>GST &amp; VAT E-Invoicing</span></li>
                <li><span>UAE VAT 201 Reports</span></li>
                <li><span>7-Year Archival</span></li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold text-[#1C1917] mb-3">Company</p>
              <ul className="space-y-2 text-xs text-[#78716C]">
                <li><span>Inbox Infotech</span></li>
                <li><span>support@inboxinfotech.com</span></li>
                <li><span>Privacy Policy</span></li>
                <li><span>Terms of Service</span></li>
              </ul>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[#A8A29E]">
            <p>© 2026 Inbox Infotech — Inbox E-invoicing. All rights reserved.</p>
            <p>E-Invoicing Software | GST e-invoicing System</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
