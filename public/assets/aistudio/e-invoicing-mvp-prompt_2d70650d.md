# COMPLETE MVP PROMPT — UAE E-INVOICING PLATFORM ("Fatoora")

## PRODUCT OVERVIEW

Build a complete, production-ready MVP for **"Fatoora"** (فاتورة) — a modern, cloud-based e-invoicing and accounting platform built specifically for UAE businesses to comply with the Federal Tax Authority (FTA) e-invoicing mandate (Ministerial Decisions 243 & 244 of 2025). The platform helps small and medium businesses in the UAE create, manage, validate, send, and archive FTA-compliant electronic invoices using the PINT-AE UBL 2.1 XML standard over the Peppol 5-corner model.

**Think of it as:** Zoho Books e-invoicing meets Linear's design quality — but built exclusively for the UAE market with full FTA/Peppol compliance baked in.

**Target users:** UAE-based SMBs (freelancers, agencies, trading companies, consultancies, contractors) who currently use Excel/Word/PDF invoices and need to transition to FTA-compliant e-invoicing before the January 2027 mandate.

---

## TECH STACK

- **Frontend:** React 18+ with TypeScript, Vite as bundler
- **Styling:** Tailwind CSS 3.4+ (utility-first, no component library like MUI/Ant — everything custom)
- **State Management:** Zustand for global state, React Query (TanStack Query) for server state
- **Routing:** React Router v6 with nested layouts
- **Forms:** React Hook Form + Zod for validation
- **Charts:** Recharts for dashboard analytics
- **Tables:** TanStack Table (React Table v8) for invoice lists with sorting, filtering, pagination
- **Icons:** Lucide React (clean, minimal line icons)
- **Date handling:** date-fns
- **PDF Generation:** @react-pdf/renderer for invoice PDF export
- **Toasts/Notifications:** Sonner
- **Backend:** Node.js + Express.js + TypeScript
- **Database:** PostgreSQL with Prisma ORM
- **Auth:** JWT (access + refresh tokens) with bcrypt password hashing
- **File uploads:** Multer (for company logos)
- **XML Generation:** xmlbuilder2 (for PINT-AE UBL 2.1 XML export)
- **QR Code:** qrcode library (for FTA-compliant QR codes on invoices)
- **Email:** Nodemailer (for sending invoices via email)
- **Validation:** Zod on both frontend and backend (shared schemas)

---

## DESIGN SYSTEM (CRITICAL — FOLLOW EXACTLY)

### Philosophy
The design is **warm, clean, minimal, and professional** — inspired by modern SaaS tools like Linear, Vercel, and Marquee Studio. NOT cold corporate blue. NOT cluttered enterprise software. Think: generous whitespace, confident typography, one signature accent color, and a feeling of calm professionalism.

### Color Palette

```
/* Core */
--color-bg:              #FFFFFF          /* Main background */
--color-bg-secondary:    #FAFAFA          /* Secondary bg (sidebar, cards) */
--color-bg-tertiary:     #F5F5F4          /* Tertiary bg (hover states, table rows) */
--color-border:          #E7E5E4          /* Borders, dividers — warm stone gray */
--color-border-light:    #F0EEEC          /* Lighter borders */

/* Text */
--color-text-primary:    #1C1917          /* Headlines, primary text — near-black warm */
--color-text-secondary:  #78716C          /* Body text, descriptions — warm gray */
--color-text-tertiary:   #A8A29E          /* Muted text, placeholders, timestamps */
--color-text-inverse:    #FFFFFF          /* Text on dark/accent backgrounds */

/* Accent — Warm Orange (Signature Brand Color) */
--color-accent:          #F26522          /* Primary accent — buttons, links, active states */
--color-accent-hover:    #E05A1B          /* Accent hover state */
--color-accent-light:    #FFF3ED          /* Accent tinted bg (badges, highlights) */
--color-accent-muted:    #FDBA74          /* Softer accent for secondary elements */

/* Status Colors */
--color-success:         #16A34A          /* Paid, Delivered, Active */
--color-success-light:   #F0FDF4          /* Success badge bg */
--color-warning:         #F59E0B          /* Pending, Processing */
--color-warning-light:   #FFFBEB          /* Warning badge bg */
--color-error:           #DC2626          /* Overdue, Error, Failed */
--color-error-light:     #FEF2F2          /* Error badge bg */
--color-info:            #2563EB          /* Info, Draft */
--color-info-light:      #EFF6FF          /* Info badge bg */

/* Sidebar */
--color-sidebar-bg:      #FAFAF9          /* Sidebar background */
--color-sidebar-active:  #F26522          /* Active nav item accent */
--color-sidebar-active-bg: #FFF3ED       /* Active nav item background */
--color-sidebar-text:    #44403C          /* Sidebar text */
--color-sidebar-muted:   #A8A29E          /* Sidebar section labels */
```

### Typography

```
/* Font Family */
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;

/* For Arabic text on invoices */
font-family-arabic: 'IBM Plex Sans Arabic', 'Noto Sans Arabic', sans-serif;

/* Scale */
text-xs:    12px / 16px   — timestamps, fine print, table secondary
text-sm:    14px / 20px   — body text, table cells, form labels
text-base:  16px / 24px   — main body, descriptions
text-lg:    18px / 28px   — section titles, card titles
text-xl:    20px / 28px   — page section headings
text-2xl:   24px / 32px   — page titles
text-3xl:   30px / 36px   — dashboard stat numbers
text-4xl:   36px / 40px   — landing page sub-headings
text-5xl:   48px / 48px   — landing page hero headline
text-6xl:   60px / 60px   — landing page big numbers

/* Weights */
font-normal:   400   — body, descriptions
font-medium:   500   — labels, nav items, table headers
font-semibold: 600   — card titles, section headings, stat numbers
font-bold:     700   — page titles, hero headlines
```

### Spacing & Layout

```
/* Border Radius */
rounded-sm:  6px    — small elements (badges, tags)
rounded-md:  8px    — buttons, inputs, cards
rounded-lg:  12px   — larger cards, modals
rounded-xl:  16px   — hero sections, feature cards
rounded-full: 9999px — avatars, circular icons

/* Shadows */
shadow-sm:   0 1px 2px rgba(0,0,0,0.05)                          — subtle lift
shadow-md:   0 4px 6px -1px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.05)  — cards
shadow-lg:   0 10px 15px -3px rgba(0,0,0,0.08), 0 4px 6px rgba(0,0,0,0.04) — dropdowns, modals
shadow-xl:   0 20px 25px -5px rgba(0,0,0,0.08), 0 8px 10px rgba(0,0,0,0.04) — floating cards

/* Layout */
sidebar-width:     260px
content-max-width: 1200px
page-padding:      32px
card-padding:      24px
table-row-height:  52px
```

### Component Patterns

**Buttons:**
- Primary: `bg-[#F26522] text-white rounded-md px-4 py-2.5 font-medium text-sm hover:bg-[#E05A1B] transition-colors`
- Secondary: `bg-white text-[#1C1917] border border-[#E7E5E4] rounded-md px-4 py-2.5 font-medium text-sm hover:bg-[#F5F5F4] transition-colors`
- Ghost: `bg-transparent text-[#78716C] rounded-md px-4 py-2.5 font-medium text-sm hover:bg-[#F5F5F4] transition-colors`
- Danger: `bg-[#DC2626] text-white rounded-md px-4 py-2.5 font-medium text-sm hover:bg-[#B91C1C] transition-colors`
- Button heights: 36px (sm), 40px (md), 44px (lg)
- Always have subtle transition on hover (150ms)
- Icon + text buttons: icon on the left, 8px gap

**Inputs:**
- `bg-white border border-[#E7E5E4] rounded-md px-3 py-2.5 text-sm text-[#1C1917] placeholder:text-[#A8A29E] focus:outline-none focus:ring-2 focus:ring-[#F26522]/20 focus:border-[#F26522] transition-all`
- Height: 40px
- Labels above inputs, font-medium text-sm text-[#44403C] mb-1.5
- Error state: `border-[#DC2626] focus:ring-[#DC2626]/20`
- Helper text below: text-xs text-[#A8A29E] mt-1

**Cards:**
- `bg-white rounded-lg border border-[#E7E5E4] p-6` (no shadow by default, shadow-sm on hover if interactive)
- Or: `bg-white rounded-xl shadow-sm p-6` for elevated cards

**Badges / Status Pills:**
- `inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium`
- Paid: `bg-[#F0FDF4] text-[#16A34A]`
- Pending: `bg-[#FFFBEB] text-[#F59E0B]`
- Overdue: `bg-[#FEF2F2] text-[#DC2626]`
- Draft: `bg-[#EFF6FF] text-[#2563EB]`
- Sent: `bg-[#FFF3ED] text-[#F26522]`

**Tables:**
- Header row: `bg-[#FAFAF9] text-[#78716C] text-xs font-medium uppercase tracking-wider`
- Body rows: `border-b border-[#F0EEEC] hover:bg-[#FAFAF9] transition-colors`
- Row height: 52px with vertical centering
- Zebra striping: NO (just hover state)
- Rounded corners on the table wrapper, not individual cells

**Sidebar Navigation:**
- Fixed left sidebar, 260px wide, full height
- Logo at top with company name
- Nav items: `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-[#44403C] hover:bg-[#F5F5F4] transition-colors`
- Active nav item: `bg-[#FFF3ED] text-[#F26522]` with a 3px left border accent
- Section labels: `text-[11px] font-semibold uppercase tracking-wider text-[#A8A29E] px-3 mb-2 mt-6`
- Bottom: User avatar + name + settings gear icon

**Modals:**
- Centered overlay with `bg-black/50` backdrop
- Modal card: `bg-white rounded-xl shadow-xl max-w-lg w-full p-6`
- Title: text-lg font-semibold
- Close button: X icon in top-right corner
- Actions at bottom-right: Cancel (secondary) + Confirm (primary)

**Empty States:**
- Centered illustration/icon (use a simple SVG or Lucide icon at 48px)
- Title: text-lg font-semibold text-[#1C1917]
- Description: text-sm text-[#78716C] max-w-sm mx-auto
- CTA button below

---

## DATABASE SCHEMA (Prisma)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ==================== AUTH & USERS ====================

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  passwordHash  String
  firstName     String
  lastName      String
  role          UserRole  @default(OWNER)
  avatarUrl     String?
  isActive      Boolean   @default(true)
  lastLoginAt   DateTime?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  companyId     String
  company       Company   @relation(fields: [companyId], references: [id])

  invoicesCreated  Invoice[]  @relation("InvoiceCreator")
  activitiesLog    Activity[]

  @@index([companyId])
  @@index([email])
}

enum UserRole {
  OWNER
  ADMIN
  ACCOUNTANT
  VIEWER
}

// ==================== COMPANY ====================

model Company {
  id                String   @id @default(cuid())
  nameEn            String                          // English name (required)
  nameAr            String?                         // Arabic name (optional)
  trn               String?  @unique                // Tax Registration Number (15 digits)
  tin               String?  @unique                // Tax Identification Number (Peppol participant ID)
  licenseNumber     String?                         // Trade license number
  
  // Address
  addressLine1      String?
  addressLine2      String?
  city              String?  @default("Dubai")
  emirate           String?  @default("Dubai")
  poBox             String?
  country           String   @default("AE")
  
  // Contact
  email             String
  phone             String?
  website           String?
  
  // Branding
  logoUrl           String?
  accentColor       String?  @default("#F26522")
  
  // Invoice Settings
  invoicePrefix     String   @default("INV")
  invoiceNextNumber Int      @default(1)
  creditNotePrefix  String   @default("CN")
  creditNoteNextNum Int      @default(1)
  defaultPaymentTermsDays Int @default(30)
  defaultCurrency   String   @default("AED")
  
  // Bank Details
  bankName          String?
  bankAccountName   String?
  bankAccountNumber String?
  bankIban          String?
  bankSwift         String?
  
  // Status
  isOnboarded       Boolean  @default(false)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  users             User[]
  clients           Client[]
  products          Product[]
  invoices          Invoice[]
  creditNotes       CreditNote[]
  activities        Activity[]

  @@index([trn])
}

// ==================== CLIENTS (BUYERS) ====================

model Client {
  id            String   @id @default(cuid())
  nameEn        String                              // English name
  nameAr        String?                             // Arabic name
  trn           String?                             // Buyer's TRN
  tin           String?                             // Buyer's TIN
  
  // Contact
  email         String?
  phone         String?
  contactPerson String?
  
  // Address
  addressLine1  String?
  addressLine2  String?
  city          String?
  emirate       String?
  poBox         String?
  country       String   @default("AE")
  
  // Settings
  defaultPaymentTermsDays Int?
  notes         String?
  isActive      Boolean  @default(true)
  
  companyId     String
  company       Company  @relation(fields: [companyId], references: [id])
  
  invoices      Invoice[]
  creditNotes   CreditNote[]
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@index([companyId])
  @@index([companyId, nameEn])
}

// ==================== PRODUCTS / SERVICES ====================

model Product {
  id            String       @id @default(cuid())
  name          String
  description   String?
  unitPrice     Decimal      @db.Decimal(12, 2)
  unit          String       @default("UNIT")       // UNIT, HOUR, DAY, KG, METER, etc.
  vatCategory   VatCategory  @default(STANDARD)
  vatRate       Decimal      @db.Decimal(5, 2) @default(5.00)
  hsnCode       String?                              // HS Code (optional for now)
  isActive      Boolean      @default(true)
  
  companyId     String
  company       Company      @relation(fields: [companyId], references: [id])
  
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt

  @@index([companyId])
}

enum VatCategory {
  STANDARD          // 5% VAT
  ZERO_RATED        // 0% VAT (exports, international transport, etc.)
  EXEMPT            // VAT exempt (certain financial services, residential rent, etc.)
  REVERSE_CHARGE    // Buyer accounts for VAT
  OUT_OF_SCOPE      // Not subject to VAT
}

// ==================== INVOICES ====================

model Invoice {
  id                String        @id @default(cuid())
  invoiceNumber     String                            // e.g., "INV-00001"
  
  // Type
  invoiceType       InvoiceType   @default(STANDARD_TAX)
  
  // Dates
  issueDate         DateTime      @default(now())
  dueDate           DateTime
  
  // References
  purchaseOrderRef  String?
  projectRef        String?
  notes             String?                           // Remarks for buyer
  internalNotes     String?                           // Internal notes (not on PDF)
  
  // Currency
  currency          String        @default("AED")
  exchangeRate      Decimal       @db.Decimal(10, 6) @default(1.000000)
  
  // Totals (all in invoice currency)
  subtotal          Decimal       @db.Decimal(12, 2) @default(0)
  totalDiscount     Decimal       @db.Decimal(12, 2) @default(0)
  totalBeforeVat    Decimal       @db.Decimal(12, 2) @default(0)
  totalVat          Decimal       @db.Decimal(12, 2) @default(0)
  grandTotal        Decimal       @db.Decimal(12, 2) @default(0)
  amountPaid        Decimal       @db.Decimal(12, 2) @default(0)
  amountDue         Decimal       @db.Decimal(12, 2) @default(0)
  
  // Status
  status            InvoiceStatus @default(DRAFT)
  
  // Payment
  paymentTerms      String?
  paymentMethod     String?                           // BANK_TRANSFER, CASH, CHEQUE, CARD
  paidAt            DateTime?
  
  // FTA Compliance
  qrCodeData        String?                           // QR code content string
  xmlGenerated      Boolean       @default(false)
  xmlGeneratedAt    DateTime?
  
  // Relations
  companyId         String
  company           Company       @relation(fields: [companyId], references: [id])
  
  clientId          String
  client            Client        @relation(fields: [clientId], references: [id])
  
  createdById       String
  createdBy         User          @relation("InvoiceCreator", fields: [createdById], references: [id])
  
  lineItems         InvoiceLineItem[]
  creditNotes       CreditNote[]
  activities        Activity[]
  
  createdAt         DateTime      @default(now())
  updatedAt         DateTime      @updatedAt
  sentAt            DateTime?
  
  @@unique([companyId, invoiceNumber])
  @@index([companyId, status])
  @@index([companyId, clientId])
  @@index([companyId, issueDate])
  @@index([dueDate])
}

enum InvoiceType {
  STANDARD_TAX          // Standard tax invoice (B2B)
  SIMPLIFIED_TAX        // Simplified tax invoice (B2C, below AED 10,000)
  DEBIT_NOTE            // Debit note
}

enum InvoiceStatus {
  DRAFT
  SENT
  DELIVERED
  PARTIALLY_PAID
  PAID
  OVERDUE
  CANCELLED
  VOID
}

// ==================== INVOICE LINE ITEMS ====================

model InvoiceLineItem {
  id              String       @id @default(cuid())
  lineNumber      Int                                 // Sequential line number
  
  // Item details
  description     String
  quantity        Decimal      @db.Decimal(10, 3)
  unit            String       @default("UNIT")
  unitPrice       Decimal      @db.Decimal(12, 2)
  
  // Discount
  discountType    DiscountType @default(NONE)
  discountValue   Decimal      @db.Decimal(12, 2) @default(0)
  discountAmount  Decimal      @db.Decimal(12, 2) @default(0)   // Calculated
  
  // Tax
  vatCategory     VatCategory  @default(STANDARD)
  vatRate         Decimal      @db.Decimal(5, 2) @default(5.00)
  vatAmount       Decimal      @db.Decimal(12, 2) @default(0)   // Calculated
  
  // Totals
  lineSubtotal    Decimal      @db.Decimal(12, 2) @default(0)   // qty * unitPrice
  lineTotalBeforeVat Decimal   @db.Decimal(12, 2) @default(0)   // subtotal - discount
  lineTotal       Decimal      @db.Decimal(12, 2) @default(0)   // totalBeforeVat + vat
  
  // Classification (optional for MVP)
  hsnCode         String?
  
  invoiceId       String
  invoice         Invoice      @relation(fields: [invoiceId], references: [id], onDelete: Cascade)
  
  @@index([invoiceId])
}

enum DiscountType {
  NONE
  PERCENTAGE
  FIXED
}

// ==================== CREDIT NOTES ====================

model CreditNote {
  id                String          @id @default(cuid())
  creditNoteNumber  String                            // e.g., "CN-00001"
  
  // Dates
  issueDate         DateTime        @default(now())
  
  // Reason
  reason            CreditNoteReason
  reasonDetail      String?
  
  // Totals
  subtotal          Decimal         @db.Decimal(12, 2) @default(0)
  totalVat          Decimal         @db.Decimal(12, 2) @default(0)
  grandTotal        Decimal         @db.Decimal(12, 2) @default(0)
  
  // Status
  status            CreditNoteStatus @default(DRAFT)
  
  // Relations
  companyId         String
  company           Company         @relation(fields: [companyId], references: [id])
  
  clientId          String
  client            Client          @relation(fields: [clientId], references: [id])
  
  invoiceId         String
  invoice           Invoice         @relation(fields: [invoiceId], references: [id])
  
  lineItems         CreditNoteLineItem[]
  
  createdAt         DateTime        @default(now())
  updatedAt         DateTime        @updatedAt

  @@unique([companyId, creditNoteNumber])
  @@index([companyId])
  @@index([invoiceId])
}

enum CreditNoteReason {
  CANCELLATION
  REFUND
  ADJUSTMENT
  CORRECTION
  RETURN
  OTHER
}

enum CreditNoteStatus {
  DRAFT
  ISSUED
  VOID
}

model CreditNoteLineItem {
  id              String       @id @default(cuid())
  lineNumber      Int
  description     String
  quantity        Decimal      @db.Decimal(10, 3)
  unit            String       @default("UNIT")
  unitPrice       Decimal      @db.Decimal(12, 2)
  vatCategory     VatCategory  @default(STANDARD)
  vatRate         Decimal      @db.Decimal(5, 2) @default(5.00)
  vatAmount       Decimal      @db.Decimal(12, 2) @default(0)
  lineTotal       Decimal      @db.Decimal(12, 2) @default(0)
  
  creditNoteId    String
  creditNote      CreditNote   @relation(fields: [creditNoteId], references: [id], onDelete: Cascade)
  
  @@index([creditNoteId])
}

// ==================== ACTIVITY LOG ====================

model Activity {
  id          String       @id @default(cuid())
  action      String                                 // "invoice.created", "invoice.sent", "payment.recorded"
  entityType  String                                 // "invoice", "credit_note", "client"
  entityId    String
  metadata    Json?                                  // Additional context (e.g., old status -> new status)
  
  companyId   String
  company     Company      @relation(fields: [companyId], references: [id])
  
  userId      String?
  user        User?        @relation(fields: [userId], references: [id])
  
  invoiceId   String?
  invoice     Invoice?     @relation(fields: [invoiceId], references: [id])
  
  createdAt   DateTime     @default(now())

  @@index([companyId, createdAt])
  @@index([entityType, entityId])
}
```

---

## PAGES & SCREENS — DETAILED SPECIFICATIONS

### PAGE 1: LANDING PAGE (Marketing / Public)

**Route:** `/`

**Purpose:** The first thing the client sees. This is the product pitch page. Must be absolutely stunning — this sells the product.

**Layout:** Full-width, no sidebar. Sticky top navigation.

**Sections (in order):**

1. **Navbar:**
   - Left: Fatoora logo (a minimal geometric icon + "Fatoora" text in font-semibold)
   - Center: Links — Features, Pricing, FAQ
   - Right: "Sign in" text link + "Get Started" primary button (orange)
   - Sticky on scroll with subtle border-bottom and backdrop blur

2. **Hero Section:**
   - Full width, white background
   - Small badge/pill at top: "🇦🇪 Built for UAE businesses" with orange accent bg
   - Huge headline (text-5xl font-bold): "E-invoicing that just works." with one word in lighter gray to create that Marquee Studio style typography contrast — e.g., "E-invoicing that **just** works." where "just" is in text-[#A8A29E]
   - Subheading (text-lg text-secondary max-w-2xl): "Create FTA-compliant invoices in minutes. Validate against all 51 mandatory fields. Generate PINT-AE XML with one click. Be ready for the January 2027 mandate — today."
   - Two buttons: "Start Free" (primary orange) + "Watch Demo" (secondary with play icon)
   - Below buttons: small muted text: "Free for up to 50 invoices/month · No credit card required"
   - Below: A large, beautiful screenshot/mockup of the dashboard inside a subtle browser chrome frame with rounded corners and soft shadow. Show the actual dashboard UI.

3. **Logo Cloud:**
   - Muted text above: "Trusted by 500+ UAE businesses"
   - Row of 6 grayscale company logos (use placeholder logos — generic shapes)
   - Subtle separator line above and below

4. **Features Section:**
   - Section badge pill: "Features" in orange
   - Headline: "Everything you need to invoice with confidence."
   - Subheading: "From creation to compliance, Fatoora handles it all — so you can focus on growing your business."
   - 3-column grid of feature cards (6 total, 2 rows):
     
     Card 1: **Smart Invoice Builder**
     - Icon: FileText
     - "Create professional invoices in under 2 minutes. Auto-calculate VAT, apply discounts, and validate all 51 FTA mandatory fields before sending."
     
     Card 2: **FTA Compliance Engine**
     - Icon: ShieldCheck
     - "Built-in validation against PINT-AE UBL 2.1 standard. QR codes, TRN verification, and XML generation — compliance on autopilot."
     
     Card 3: **Real-Time Dashboard**
     - Icon: BarChart3
     - "Track revenue, outstanding payments, and VAT summaries at a glance. Know your numbers without touching a spreadsheet."
     
     Card 4: **Client Management**
     - Icon: Users
     - "Maintain a directory of all your buyers with TRN, contact details, and complete invoice history. One click to create a new invoice."
     
     Card 5: **Multi-Currency Support**
     - Icon: Coins
     - "Invoice in AED, USD, EUR, GBP, or SAR. Automatic exchange rate handling with AED as the tax currency."
     
     Card 6: **Credit Notes & Adjustments**
     - Icon: ReceiptText
     - "Issue credit notes linked to original invoices. Handle refunds, corrections, and cancellations per FTA guidelines."
   
   - Each card: white bg, subtle border, rounded-xl, p-6, icon in an orange-tinted circle at top

5. **How It Works Section:**
   - Headline: "Up and running in 5 minutes."
   - 4 steps in a horizontal row with connecting lines/arrows between them:
     - Step 1: "Set up your company" — "Add your TRN, logo, and bank details once. We handle the rest."
     - Step 2: "Add your clients" — "Import your buyers or add them as you go. TRN validation built in."
     - Step 3: "Create & send invoices" — "Build invoices with our smart form. Auto-VAT, auto-validation, auto-numbering."
     - Step 4: "Stay compliant" — "Generate PINT-AE XML, download PDFs with QR codes, and archive for 7 years."
   - Each step: number in an orange circle, title bold, description in secondary text

6. **Dashboard Preview Section (Bento Grid):**
   - Headline: "Built for how you actually work."
   - A bento-style grid showing 4 cards with mini screenshots/mockups of different features:
     - Large card (spans 2 cols): Dashboard overview screenshot
     - Card: Invoice PDF preview with QR code
     - Card: VAT summary report
     - Card: Invoice status pipeline
   - Each card has rounded-xl, subtle shadow, overflow-hidden with the screenshot filling the card

7. **Pricing Section:**
   - Section badge: "Pricing"
   - Headline: "Simple pricing. No surprises."
   - 3 pricing cards side by side:
   
     **Starter — Free**
     - Up to 50 invoices/month
     - 1 user
     - Invoice PDF export
     - VAT calculations
     - Client directory
     - Button: "Get Started" (secondary/outlined)
     
     **Business — AED 99/month** (highlighted with orange border, "Most Popular" badge)
     - Unlimited invoices
     - Up to 5 users
     - Everything in Starter
     - Credit notes
     - PINT-AE XML export
     - Custom branding
     - Priority support
     - Button: "Start Free Trial" (primary orange, filled)
     
     **Enterprise — Custom**
     - Unlimited everything
     - Unlimited users
     - Everything in Business
     - API access
     - ASP integration (coming soon)
     - Dedicated account manager
     - SLA guarantee
     - Button: "Contact Sales" (secondary/outlined)

8. **FAQ Section:**
   - Headline: "Frequently asked questions"
   - Accordion-style FAQ items (6-8 questions):
     - "What is UAE e-invoicing?"
     - "Is Fatoora FTA-compliant?"
     - "When does e-invoicing become mandatory?"
     - "Do I need an ASP to use Fatoora?"
     - "Can I use Fatoora for free?"
     - "Does Fatoora support Arabic invoices?"
     - "How secure is my data?"
     - "Can I import existing invoices?"

9. **CTA Section:**
   - Full-width with subtle warm gradient or light orange tinted background
   - Headline: "Ready to simplify your invoicing?"
   - Subheading: "Join 500+ UAE businesses already using Fatoora."
   - "Get Started Free" button (primary)

10. **Footer:**
    - 4-column layout:
      - Column 1: Fatoora logo + short tagline + social icons
      - Column 2: Product — Features, Pricing, FAQ, Changelog
      - Column 3: Company — About, Blog, Careers, Contact
      - Column 4: Legal — Privacy Policy, Terms of Service, Security
    - Bottom bar: "© 2026 Fatoora. All rights reserved." + "Built in 🇦🇪 Dubai"

---

### PAGE 2: AUTH PAGES

**Routes:** `/login`, `/register`, `/forgot-password`

**Layout:** Split-screen. Left side: form. Right side: decorative panel with orange gradient and testimonial/feature highlight.

**Register Page:**
- Left side:
  - Fatoora logo at top
  - "Create your account" headline
  - Form fields: Full Name, Email, Password, Company Name, Emirate (dropdown), Phone
  - "Create Account" primary button
  - "Already have an account? Sign in" link
  - Google OAuth button (secondary style): "Continue with Google"
  
- Right side:
  - Warm gradient background (subtle orange to peach)
  - Large quote or feature highlight
  - "Trusted by 500+ businesses across the UAE"

**Login Page:**
- Left side:
  - Fatoora logo at top
  - "Welcome back" headline
  - Email + Password fields
  - "Forgot password?" link (right-aligned under password)
  - "Sign In" primary button
  - "Don't have an account? Register" link

---

### PAGE 3: ONBOARDING (Post-Registration)

**Route:** `/onboarding`

**Purpose:** Collect company details needed for invoicing. Must feel quick and painless. 3-step wizard.

**Step 1 — Company Details:**
- Company Name (English) — required
- Company Name (Arabic) — optional
- TRN (Tax Registration Number) — with validation (15 digits)
- Trade License Number — optional
- Emirate — dropdown (Dubai, Abu Dhabi, Sharjah, Ajman, Fujairah, RAK, UAQ)
- City — text input
- Address — text area

**Step 2 — Branding & Bank Details:**
- Upload company logo (drag-and-drop zone)
- Bank Name — text
- Account Name — text
- IBAN — with validation
- SWIFT/BIC — text

**Step 3 — Invoice Settings:**
- Invoice number prefix (default: "INV")
- Starting invoice number (default: 1)
- Default payment terms (dropdown: Net 15, Net 30, Net 45, Net 60, Due on Receipt)
- Default currency (dropdown: AED, USD, EUR, GBP, SAR)

**UI:** 
- Progress stepper at top showing 3 steps with current step highlighted in orange
- "Back" and "Continue" buttons at bottom
- "Skip for now" text link (optional fields can be skipped)
- Clean card layout centered on page, no sidebar

---

### PAGE 4: DASHBOARD (Main App Home)

**Route:** `/dashboard`

**Layout:** Sidebar + main content area

**Sidebar Navigation:**
```
[Fatoora Logo]
[Company Name]

MAIN
  📊 Dashboard          (active)
  📄 Invoices
  📋 Credit Notes
  👥 Clients
  📦 Products & Services

FINANCE
  📈 Reports
  🧾 VAT Summary

SETTINGS
  ⚙️ Company Settings
  👤 My Account
  👥 Team Members
```

(Use Lucide icons, not emoji. The emoji above is just for readability.)

**Main Content:**

Row 1 — **Stat Cards** (4 across):
- **Total Revenue** (this month): AED amount + % change from last month (green up or red down arrow)
- **Outstanding**: AED amount of unpaid invoices
- **Overdue**: AED amount + count of overdue invoices (red text if > 0)
- **Invoices This Month**: count + small sparkline

Each card: white bg, border, rounded-lg, p-5. Big number in text-3xl font-semibold. Label in text-sm text-secondary above. Change indicator in text-xs with colored arrow.

Row 2 — **Revenue Chart + Recent Activity** (2 columns, 60/40 split):
- Left: **Revenue Over Time** — Area/line chart (Recharts) showing monthly revenue for last 6 months. Orange fill gradient under the line. X-axis: months, Y-axis: AED amounts. Title: "Revenue Overview" with period selector tabs (Week / Month / Quarter).
- Right: **Recent Activity** — Vertical list of recent actions:
  - "Invoice INV-00042 sent to Al Noor Trading" — 2 hours ago
  - "Payment received for INV-00039" — 5 hours ago  
  - "New client added: Horizon Tech LLC" — yesterday
  - Each item: icon + description + relative timestamp
  - "View all activity" link at bottom

Row 3 — **Outstanding Invoices + Quick Actions** (2 columns, 60/40 split):
- Left: **Outstanding Invoices** — Mini table showing top 5 unpaid invoices:
  - Columns: Invoice #, Client, Amount, Due Date, Status badge
  - "View all invoices" link at bottom
- Right: **Quick Actions** — Grid of 4 action cards:
  - "New Invoice" (primary, with + icon)
  - "New Client" (secondary)
  - "New Credit Note" (secondary)  
  - "Generate VAT Report" (secondary)
  - Each card: icon + label, hover effect

---

### PAGE 5: INVOICES LIST

**Route:** `/invoices`

**Top Bar:**
- Page title: "Invoices" (text-2xl font-bold)
- Right side: "Export" button (secondary) + "New Invoice" button (primary with + icon)

**Filters Bar:**
- Status filter tabs: All | Draft | Sent | Paid | Overdue | Cancelled (horizontal pills, active one has orange bg)
- Search input: "Search by invoice number, client, or amount..."
- Date range picker (From — To)
- Sort dropdown: Newest First, Oldest First, Amount High-Low, Amount Low-High

**Invoice Table:**
| Invoice # | Client | Issue Date | Due Date | Amount | VAT | Total | Status | Actions |
|-----------|--------|------------|----------|--------|-----|-------|--------|---------|
| INV-00042 | Al Noor Trading LLC | 15 Nov 2026 | 15 Dec 2026 | AED 10,000 | AED 500 | AED 10,500 | Sent (badge) | ⋯ menu |

- **Actions dropdown (⋯):** View, Edit, Duplicate, Download PDF, Send Email, Generate XML, Record Payment, Void, Delete
- **Row click:** navigates to invoice detail page
- **Pagination:** "Showing 1-20 of 156 invoices" + Previous/Next buttons
- **Empty state** (no invoices yet): Illustration + "Create your first invoice" CTA

---

### PAGE 6: CREATE / EDIT INVOICE

**Route:** `/invoices/new` or `/invoices/:id/edit`

**Layout:** Full-width form (no sidebar compression — the sidebar collapses or the form uses a focused layout with back button)

**Structure:**

**Top Bar:**
- Back arrow + "New Invoice" title (or "Edit Invoice #INV-00042")
- Right side: "Save as Draft" (secondary) + "Save & Send" (primary)

**Form Sections:**

**Section 1 — Invoice Details (compact row):**
- Invoice Number: auto-generated, editable (text input with prefix shown)
- Invoice Type: dropdown (Standard Tax Invoice, Simplified Tax Invoice)
- Issue Date: date picker (defaults to today)
- Due Date: date picker (auto-calculated from payment terms, editable)
- Purchase Order Reference: optional text input

**Section 2 — Parties (two columns):**
- Left column — **From (Seller):** Pre-filled from company settings. Shows: Company name, TRN, address, email. "Edit in settings" link.
- Right column — **To (Buyer):** Client selector dropdown with search. Shows selected client's details. "Add new client" button (opens a slide-over panel to quickly add a client without leaving the page).

**Section 3 — Line Items (the main table):**
- Table with columns: # | Description | Qty | Unit | Unit Price | Discount | VAT % | Amount
- Each row is editable inline
- Description: text input (with autocomplete from product catalog)
- Qty: number input (default 1)
- Unit: dropdown (Unit, Hour, Day, Kg, Meter, Box, etc.)
- Unit Price: number input with AED prefix
- Discount: toggle between % and fixed amount, number input
- VAT: dropdown (5% Standard, 0% Zero-Rated, Exempt, Reverse Charge)
- Amount: auto-calculated, read-only
- "Add Line Item" button at bottom (orange ghost/text button with + icon)
- "Add from Catalog" button (secondary, opens product selector modal)
- Drag handle on left of each row for reordering
- Delete (trash) icon on right of each row

**Section 4 — Totals (right-aligned summary panel):**
```
Subtotal                    AED 10,000.00
Discount                   -AED    500.00
                           ──────────────
Total Before VAT            AED  9,500.00
VAT (5%)                    AED    475.00
                           ──────────────
Grand Total                 AED  9,975.00
```
- Each line: label on left (text-sm text-secondary), amount on right (text-sm font-medium)
- Grand Total: text-lg font-bold, with a top border separator
- Currency shown with every amount

**Section 5 — Additional Details:**
- Payment Terms: dropdown (Net 15/30/45/60, Due on Receipt, Custom)
- Payment Method: dropdown (Bank Transfer, Cash, Cheque, Card)
- Notes to Buyer: textarea (appears on invoice PDF)
- Internal Notes: textarea (does NOT appear on PDF, only visible to team)

**Section 6 — Attachment (optional):**
- Drag-and-drop zone for attaching supporting documents (PDF, images)

**Bottom Actions Bar (sticky at bottom):**
- Left: "Delete" button (danger ghost, only on edit mode)
- Right: "Preview PDF" (secondary) + "Save as Draft" (secondary) + "Save & Send" (primary)

**Validation:**
- Real-time validation as user types
- Before save/send: validate all 51 FTA mandatory fields
- Show validation summary panel if errors exist: "3 issues found" with list of issues and links to the relevant field
- Block "Send" if validation fails; allow "Save as Draft" with warnings

---

### PAGE 7: INVOICE DETAIL / PREVIEW

**Route:** `/invoices/:id`

**Layout:** Two sections — info panel + invoice preview

**Top Bar:**
- Back arrow + "Invoice #INV-00042"
- Status badge
- Right: "Edit" + "More Actions" dropdown (Duplicate, Download PDF, Download XML, Send Email, Record Payment, Print, Void)

**Left Panel (Info & Actions) — 40% width:**
- **Status Section:**
  - Current status badge (large)
  - Status timeline/history:
    - Created: 10 Nov 2026, 2:30 PM by John
    - Sent: 10 Nov 2026, 3:00 PM to client@email.com
    - Viewed: 11 Nov 2026, 9:15 AM
    - (Paid: not yet)
  
- **Payment Section:**
  - Amount Due: AED 10,500
  - "Record Payment" button
  - Payment history if partially paid

- **Quick Details:**
  - Client: Al Noor Trading LLC
  - Issue Date: 15 Nov 2026
  - Due Date: 15 Dec 2026
  - Payment Terms: Net 30

- **Compliance:**
  - FTA Validation: ✅ All 51 fields valid
  - XML: "Generate PINT-AE XML" button (or "✅ Generated" if already done)
  - QR Code: ✅ Embedded in PDF

**Right Panel (Invoice Preview) — 60% width:**
- Rendered invoice as it would appear on PDF, inside a subtle card with shadow
- Shows the full invoice template (see Invoice PDF Template section below)
- "Download PDF" and "Print" buttons above the preview

---

### PAGE 8: CLIENTS LIST

**Route:** `/clients`

**Top Bar:**
- "Clients" title
- Right: "Import" (secondary) + "Add Client" (primary)

**Search & Filters:**
- Search: "Search by name, TRN, or email..."
- Filter: Active / Inactive toggle

**Client Cards or Table (switchable view):**

Table view:
| Name | TRN | Email | Phone | Invoices | Outstanding | Actions |
|------|-----|-------|-------|----------|-------------|---------|
| Al Noor Trading LLC | 100123456789012 | info@alnoor.ae | +971 4 123 4567 | 12 | AED 15,000 | ⋯ |

Card view: Grid of client cards, each showing name, TRN, email, invoice count, outstanding amount, with "View" and "New Invoice" actions.

---

### PAGE 9: CLIENT DETAIL

**Route:** `/clients/:id`

**Top Bar:**
- Back arrow + Client name
- Right: "Edit" + "New Invoice for this Client" (primary)

**Client Info Card:**
- Name (English + Arabic), TRN, TIN, Address, Email, Phone, Contact Person
- "Edit" button

**Tabs below:**
- **Invoices** — Table of all invoices for this client (same columns as invoices list)
- **Credit Notes** — Table of credit notes for this client
- **Activity** — Timeline of all actions related to this client
- **Notes** — Internal notes about this client

**Summary Stats:**
- Total Billed: AED X
- Total Paid: AED X
- Outstanding: AED X
- Average Payment Time: X days

---

### PAGE 10: PRODUCTS & SERVICES

**Route:** `/products`

**Top Bar:**
- "Products & Services" title
- Right: "Add Product" (primary)

**Table:**
| Name | Description | Unit Price | Unit | VAT Category | Status | Actions |
|------|-------------|------------|------|-------------|--------|---------|
| Web Development | Monthly retainer | AED 5,000 | Month | Standard 5% | Active | ⋯ |

**Add/Edit Product: Slide-over panel (not a full page):**
- Name, Description, Unit Price, Unit (dropdown), VAT Category (dropdown), HSN Code (optional)
- "Save" primary button

---

### PAGE 11: REPORTS

**Route:** `/reports`

**Sub-pages (tabs or sub-routes):**

**Revenue Report** (`/reports/revenue`):
- Period selector: This Month / Quarter / Year / Custom Range
- Bar chart: Monthly revenue breakdown
- Summary: Total Revenue, Total VAT Collected, Net Revenue
- Table: Monthly breakdown with download option

**VAT Summary** (`/reports/vat`):
- Period: Monthly or Quarterly
- Summary card:
  - Output VAT (collected from customers): AED X
  - Input VAT (paid to suppliers — future feature, show as "coming soon"): AED X  
  - Net VAT Payable: AED X
- Breakdown by VAT category: Standard, Zero-Rated, Exempt, Reverse Charge
- "Export for VAT Return" button (downloads a summary PDF matching FTA VAT 201 form format)

**Accounts Receivable Aging** (`/reports/aging`):
- Aging buckets: Current | 1-30 days | 31-60 days | 61-90 days | 90+ days
- Stacked bar chart
- Table: Client | Current | 1-30 | 31-60 | 61-90 | 90+ | Total

**Top Clients** (`/reports/clients`):
- Bar chart: Top 10 clients by revenue
- Table with client name, invoice count, total billed, total paid, outstanding

---

### PAGE 12: COMPANY SETTINGS

**Route:** `/settings`

**Tabs:**

**Company Profile:**
- All company fields from onboarding, editable
- Logo upload
- Save button

**Invoice Settings:**
- Invoice prefix + next number
- Credit note prefix + next number
- Default payment terms
- Default currency
- Default notes template

**Bank Details:**
- Bank name, account name, IBAN, SWIFT
- Support for multiple bank accounts

**Branding:**
- Logo preview
- Accent color picker
- Invoice template preview

**Team Members:**
- List of team members with roles
- Invite new member (email + role dropdown)
- Remove member

**My Account:**
- Name, email, password change
- 2FA toggle (future)
- Notification preferences

---

## INVOICE PDF TEMPLATE

The PDF template must be professional, clean, bilingual (English + Arabic), and include all FTA-required elements.

**Layout:**

```
┌──────────────────────────────────────────────────────────────┐
│  [COMPANY LOGO]            TAX INVOICE  /  فاتورة ضريبية      │
│  Company Name En                              Invoice #: INV-00042  │
│  Company Name Ar                              Date: 15 Nov 2026     │
│  TRN: 100123456789012                         Due: 15 Dec 2026      │
│  Address line 1, City                         P.O. Ref: PO-2024-15  │
│  Emirate, PO Box, UAE                                                │
│  Email | Phone                                                       │
├──────────────────────────────────────────────────────────────┤
│  BILL TO:                                                            │
│  Client Name En / Ar                                                 │
│  TRN: 100987654321098                                                │
│  Address                                                             │
│  Email | Phone                                                       │
├──────────────────────────────────────────────────────────────┤
│  # │ Description      │ Qty │ Unit │ Price   │ Disc  │ VAT% │ Total │
│  1 │ Web Development  │  1  │ Month│ 5,000   │  0    │  5%  │ 5,250 │
│  2 │ Hosting Service  │  1  │ Month│ 500     │  0    │  5%  │   525 │
│  3 │ Design Work      │ 10  │ Hour │ 200     │ 10%   │  5%  │ 1,890 │
├──────────────────────────────────────────────────────────────┤
│                                        Subtotal:   AED  7,500.00    │
│                                        Discount:  -AED    200.00    │
│                                        Before VAT: AED  7,300.00    │
│                                        VAT (5%):   AED    365.00    │
│                                        ─────────────────────────    │
│                                        TOTAL:      AED  7,665.00    │
│                                                                      │
│  Amount in words: Seven thousand six hundred sixty-five AED          │
├──────────────────────────────────────────────────────────────┤
│  PAYMENT DETAILS                                                     │
│  Bank: Emirates NBD                                                  │
│  Account: Fatoora Tech LLC                                           │
│  IBAN: AE070331234567890123456                                       │
│  SWIFT: EABORAEAXXX                                                  │
│  Payment Terms: Net 30                                               │
├──────────────────────────────────────────────────────────────┤
│  Notes: Thank you for your business.                                 │
│                                                                      │
│  [QR CODE]     This is a tax invoice issued in accordance            │
│                with UAE Federal Tax Authority regulations.            │
│                                                                      │
│  Powered by Fatoora                                                  │
└──────────────────────────────────────────────────────────────┘
```

**QR Code Content (FTA requirement):**
```
Seller Name: {company.nameEn}
TRN: {company.trn}
Invoice Date: {invoice.issueDate in ISO format}
Invoice Total (with VAT): {invoice.grandTotal}
VAT Amount: {invoice.totalVat}
```

---

## API ENDPOINTS (Backend Routes)

### Auth
```
POST   /api/auth/register          — Register new user + company
POST   /api/auth/login             — Login, returns JWT tokens
POST   /api/auth/refresh           — Refresh access token
POST   /api/auth/forgot-password   — Send password reset email
POST   /api/auth/reset-password    — Reset password with token
GET    /api/auth/me                — Get current user profile
```

### Company
```
GET    /api/company                — Get current company details
PUT    /api/company                — Update company details
POST   /api/company/logo           — Upload company logo
DELETE /api/company/logo           — Remove company logo
```

### Clients
```
GET    /api/clients                — List clients (with search, pagination, filters)
GET    /api/clients/:id            — Get single client with stats
POST   /api/clients                — Create client
PUT    /api/clients/:id            — Update client
DELETE /api/clients/:id            — Soft-delete client
GET    /api/clients/:id/invoices   — Get client's invoices
GET    /api/clients/:id/stats      — Get client's financial stats
```

### Products
```
GET    /api/products               — List products (with search, pagination)
GET    /api/products/:id           — Get single product
POST   /api/products               — Create product
PUT    /api/products/:id           — Update product
DELETE /api/products/:id           — Soft-delete product
```

### Invoices
```
GET    /api/invoices               — List invoices (with search, filters, pagination, sorting)
GET    /api/invoices/:id           — Get single invoice with line items, client, activity
GET    /api/invoices/stats         — Get invoice statistics (for dashboard)
GET    /api/invoices/next-number   — Get next invoice number
POST   /api/invoices               — Create invoice (with line items)
PUT    /api/invoices/:id           — Update invoice (with line items)
DELETE /api/invoices/:id           — Delete invoice (only drafts)

POST   /api/invoices/:id/send      — Mark as sent + send email to client
POST   /api/invoices/:id/payment   — Record a payment
POST   /api/invoices/:id/void      — Void an invoice
POST   /api/invoices/:id/duplicate — Duplicate an invoice as new draft

GET    /api/invoices/:id/pdf       — Generate and download PDF
GET    /api/invoices/:id/xml       — Generate and download PINT-AE XML
POST   /api/invoices/:id/validate  — Validate against 51 FTA mandatory fields
```

### Credit Notes
```
GET    /api/credit-notes           — List credit notes
GET    /api/credit-notes/:id       — Get single credit note
POST   /api/credit-notes           — Create credit note (linked to invoice)
PUT    /api/credit-notes/:id       — Update credit note
DELETE /api/credit-notes/:id       — Delete credit note (only drafts)
POST   /api/credit-notes/:id/issue — Mark as issued
GET    /api/credit-notes/:id/pdf   — Generate PDF
```

### Reports
```
GET    /api/reports/revenue        — Revenue report (with period params)
GET    /api/reports/vat-summary    — VAT summary report (with period params)
GET    /api/reports/aging          — Accounts receivable aging report
GET    /api/reports/top-clients    — Top clients by revenue
GET    /api/reports/dashboard      — Dashboard summary stats
```

### Activity
```
GET    /api/activities             — List recent activities (with pagination)
```

### Team
```
GET    /api/team                   — List team members
POST   /api/team/invite            — Invite new member
PUT    /api/team/:id/role          — Change member role
DELETE /api/team/:id               — Remove team member
```

---

## BUSINESS LOGIC RULES

### Invoice Numbering
- Format: `{prefix}-{number padded to 5 digits}` → "INV-00001"
- Auto-increment per company
- Prefix configurable in settings
- Cannot be reused — deleted draft numbers are skipped

### VAT Calculation
- Standard rate: 5%
- Calculation: Per line item, NOT on total
- Line VAT = (unitPrice × quantity - discount) × vatRate / 100
- Total VAT = sum of all line VAT amounts
- Round to 2 decimal places per line, then sum
- Support for: Standard (5%), Zero-Rated (0%), Exempt (no VAT), Reverse Charge (buyer accounts), Out of Scope

### Invoice Status Transitions
```
DRAFT → SENT (on send action)
DRAFT → CANCELLED (on cancel)
SENT → DELIVERED (when client views — future feature)
SENT → PAID (on full payment recording)
SENT → PARTIALLY_PAID (on partial payment)
SENT → OVERDUE (automatic, when dueDate passes)
SENT → VOID (on void action — cannot be undone)
PARTIALLY_PAID → PAID (on remaining payment)
PARTIALLY_PAID → OVERDUE (when dueDate passes)
OVERDUE → PAID (on full payment)
OVERDUE → PARTIALLY_PAID (on partial payment)
CANCELLED, VOID, PAID → terminal states (no further transitions)
```

### Credit Note Rules
- Must be linked to an existing invoice
- Cannot exceed original invoice amount
- Adjusts the invoice's outstanding amount
- Has its own numbering sequence (CN-00001)

### FTA Validation (51 Mandatory Fields Check)
Before an invoice can be "Sent", validate:
1. Invoice number exists and is unique
2. Issue date is present
3. Invoice type code is valid
4. Currency code is AED (or valid ISO 4217)
5. Seller name, TRN, address are complete
6. Buyer name, TRN (for B2B), address are complete
7. At least one line item exists
8. Each line has description, quantity > 0, unit price >= 0
9. VAT category and rate are set per line
10. All totals are correctly calculated
11. VAT amounts match the applied rates
12. QR code data is generated

Show validation results as a checklist with ✅ / ❌ for each field group.

### Overdue Detection
- Run a check on every dashboard/list load
- Any SENT invoice where dueDate < today and status is SENT → auto-update to OVERDUE
- Also run as a scheduled task (cron) if backend supports it

---

## SEED DATA (for demo)

Pre-populate the demo with realistic UAE business data:

**Company:** 
- Name: "Nexus Digital Solutions LLC"
- TRN: 100345678901234
- Address: Office 1205, Business Bay Tower, Dubai, UAE
- Emirate: Dubai

**Clients (5):**
1. Al Noor Trading LLC — TRN: 100123456789012 — Dubai
2. Horizon Technology FZE — TRN: 100234567890123 — JAFZA, Dubai
3. Gulf Star Consulting — TRN: 100345678901234 — Abu Dhabi
4. Emirates Fresh Foods Co. — TRN: 100456789012345 — Sharjah
5. Coral Bay Properties — TRN: 100567890123456 — Dubai

**Products (6):**
1. Web Development — AED 5,000/month — Standard 5%
2. UI/UX Design — AED 200/hour — Standard 5%
3. Cloud Hosting — AED 500/month — Standard 5%
4. SEO Services — AED 3,000/month — Standard 5%
5. Mobile App Development — AED 8,000/month — Standard 5%
6. IT Consultation — AED 350/hour — Standard 5%

**Invoices (15-20):** Mix of DRAFT, SENT, PAID, OVERDUE, PARTIALLY_PAID across the last 3 months with realistic amounts and line items.

**Credit Notes (2-3):** Linked to some invoices.

---

## FOLDER STRUCTURE

```
fatoora/
├── client/                          # React frontend
│   ├── public/
│   │   └── favicon.svg
│   ├── src/
│   │   ├── assets/                  # Static assets (logo SVGs, images)
│   │   ├── components/
│   │   │   ├── ui/                  # Reusable UI primitives
│   │   │   │   ├── Button.tsx
│   │   │   │   ├── Input.tsx
│   │   │   │   ├── Select.tsx
│   │   │   │   ├── Badge.tsx
│   │   │   │   ├── Card.tsx
│   │   │   │   ├── Table.tsx
│   │   │   │   ├── Modal.tsx
│   │   │   │   ├── SlideOver.tsx
│   │   │   │   ├── Dropdown.tsx
│   │   │   │   ├── DatePicker.tsx
│   │   │   │   ├── Tabs.tsx
│   │   │   │   ├── Stepper.tsx
│   │   │   │   ├── EmptyState.tsx
│   │   │   │   ├── Spinner.tsx
│   │   │   │   └── Tooltip.tsx
│   │   │   ├── layout/
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   ├── TopBar.tsx
│   │   │   │   ├── AppLayout.tsx     # Sidebar + content wrapper
│   │   │   │   └── AuthLayout.tsx    # Split-screen auth layout
│   │   │   ├── invoices/
│   │   │   │   ├── InvoiceForm.tsx
│   │   │   │   ├── LineItemsTable.tsx
│   │   │   │   ├── InvoiceTotals.tsx
│   │   │   │   ├── InvoicePreview.tsx
│   │   │   │   ├── InvoicePDF.tsx
│   │   │   │   ├── StatusBadge.tsx
│   │   │   │   ├── ValidationPanel.tsx
│   │   │   │   └── ClientSelector.tsx
│   │   │   ├── dashboard/
│   │   │   │   ├── StatCard.tsx
│   │   │   │   ├── RevenueChart.tsx
│   │   │   │   ├── RecentActivity.tsx
│   │   │   │   └── OutstandingTable.tsx
│   │   │   ├── clients/
│   │   │   │   ├── ClientForm.tsx
│   │   │   │   └── ClientStats.tsx
│   │   │   ├── reports/
│   │   │   │   ├── RevenueReport.tsx
│   │   │   │   ├── VatSummary.tsx
│   │   │   │   ├── AgingReport.tsx
│   │   │   │   └── TopClientsChart.tsx
│   │   │   └── landing/
│   │   │       ├── Hero.tsx
│   │   │       ├── Features.tsx
│   │   │       ├── HowItWorks.tsx
│   │   │       ├── Pricing.tsx
│   │   │       ├── FAQ.tsx
│   │   │       └── Footer.tsx
│   │   ├── pages/
│   │   │   ├── Landing.tsx
│   │   │   ├── Login.tsx
│   │   │   ├── Register.tsx
│   │   │   ├── ForgotPassword.tsx
│   │   │   ├── Onboarding.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   ├── InvoicesList.tsx
│   │   │   ├── InvoiceCreate.tsx
│   │   │   ├── InvoiceDetail.tsx
│   │   │   ├── CreditNotesList.tsx
│   │   │   ├── CreditNoteCreate.tsx
│   │   │   ├── ClientsList.tsx
│   │   │   ├── ClientDetail.tsx
│   │   │   ├── ProductsList.tsx
│   │   │   ├── Reports.tsx
│   │   │   ├── VatSummary.tsx
│   │   │   ├── Settings.tsx
│   │   │   └── NotFound.tsx
│   │   ├── hooks/
│   │   │   ├── useAuth.ts
│   │   │   ├── useInvoices.ts
│   │   │   ├── useClients.ts
│   │   │   ├── useProducts.ts
│   │   │   ├── useReports.ts
│   │   │   └── useCompany.ts
│   │   ├── services/
│   │   │   ├── api.ts               # Axios instance with interceptors
│   │   │   ├── auth.service.ts
│   │   │   ├── invoice.service.ts
│   │   │   ├── client.service.ts
│   │   │   ├── product.service.ts
│   │   │   ├── report.service.ts
│   │   │   └── company.service.ts
│   │   ├── stores/
│   │   │   ├── authStore.ts          # Zustand auth store
│   │   │   └── uiStore.ts           # Sidebar state, theme, etc.
│   │   ├── lib/
│   │   │   ├── constants.ts          # Emirates list, VAT categories, units, etc.
│   │   │   ├── formatters.ts         # Currency, date, number formatters
│   │   │   ├── validators.ts         # Shared Zod schemas
│   │   │   └── utils.ts
│   │   ├── types/
│   │   │   └── index.ts              # All TypeScript interfaces/types
│   │   ├── App.tsx
│   │   ├── Router.tsx
│   │   ├── main.tsx
│   │   └── index.css                 # Tailwind directives + custom CSS
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── package.json
│
├── server/                           # Express backend
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── seed.ts                   # Seed data
│   │   └── migrations/
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.ts
│   │   │   ├── env.ts
│   │   │   └── cors.ts
│   │   ├── middleware/
│   │   │   ├── auth.ts               # JWT verification
│   │   │   ├── validate.ts           # Zod validation middleware
│   │   │   ├── errorHandler.ts
│   │   │   └── rateLimiter.ts
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   │   ├── auth.controller.ts
│   │   │   │   ├── auth.service.ts
│   │   │   │   ├── auth.routes.ts
│   │   │   │   └── auth.schema.ts
│   │   │   ├── company/
│   │   │   │   ├── company.controller.ts
│   │   │   │   ├── company.service.ts
│   │   │   │   ├── company.routes.ts
│   │   │   │   └── company.schema.ts
│   │   │   ├── clients/
│   │   │   │   ├── client.controller.ts
│   │   │   │   ├── client.service.ts
│   │   │   │   ├── client.routes.ts
│   │   │   │   └── client.schema.ts
│   │   │   ├── products/
│   │   │   │   ├── product.controller.ts
│   │   │   │   ├── product.service.ts
│   │   │   │   ├── product.routes.ts
│   │   │   │   └── product.schema.ts
│   │   │   ├── invoices/
│   │   │   │   ├── invoice.controller.ts
│   │   │   │   ├── invoice.service.ts
│   │   │   │   ├── invoice.routes.ts
│   │   │   │   ├── invoice.schema.ts
│   │   │   │   ├── invoice.pdf.ts     # PDF generation logic
│   │   │   │   ├── invoice.xml.ts     # PINT-AE XML generation
│   │   │   │   └── invoice.validator.ts # 51-field FTA validation
│   │   │   ├── credit-notes/
│   │   │   │   ├── creditNote.controller.ts
│   │   │   │   ├── creditNote.service.ts
│   │   │   │   ├── creditNote.routes.ts
│   │   │   │   └── creditNote.schema.ts
│   │   │   ├── reports/
│   │   │   │   ├── report.controller.ts
│   │   │   │   ├── report.service.ts
│   │   │   │   └── report.routes.ts
│   │   │   └── activities/
│   │   │       ├── activity.controller.ts
│   │   │       ├── activity.service.ts
│   │   │       └── activity.routes.ts
│   │   ├── utils/
│   │   │   ├── jwt.ts
│   │   │   ├── hash.ts
│   │   │   ├── email.ts
│   │   │   ├── qrcode.ts
│   │   │   └── formatters.ts
│   │   ├── app.ts                    # Express app setup
│   │   └── server.ts                 # Entry point
│   ├── tsconfig.json
│   └── package.json
│
├── shared/                           # Shared types & schemas
│   ├── types.ts
│   └── schemas.ts                    # Shared Zod schemas
│
├── .env.example
├── docker-compose.yml                # PostgreSQL + app
├── README.md
└── package.json                      # Root workspace config
```

---

## CRITICAL IMPLEMENTATION NOTES

1. **Design quality is paramount.** The client's Dubai market expects premium, polished UI. Every pixel matters. Follow the design system exactly. No default MUI/Bootstrap look. Everything custom-styled with Tailwind.

2. **Mobile responsive.** The app must work on tablets (1024px) and mobile (375px). Sidebar collapses to hamburger menu on mobile. Tables become card layouts on mobile.

3. **Performance.** Use React Query for caching. Paginate all lists (20 items per page). Lazy load routes with React.lazy() and Suspense.

4. **Security.**
   - Passwords: bcrypt with 12 salt rounds
   - JWT: 15-minute access token, 7-day refresh token
   - All API routes behind auth middleware except auth routes and landing page
   - Company-scoped queries: Every query filters by companyId to prevent cross-tenant data access
   - Input sanitization: Zod validation on all inputs
   - Rate limiting: 100 requests/minute per IP on auth routes

5. **Error handling.** 
   - Backend: Global error handler middleware. Consistent error response format: `{ success: false, error: { code, message, details } }`
   - Frontend: React Error Boundaries. Toast notifications for API errors. Form-level validation errors inline.

6. **Loading states.** Every data-fetching component must show a skeleton loader (not a spinner). Tables show skeleton rows. Cards show skeleton blocks. Use Tailwind's `animate-pulse` for skeleton placeholders.

7. **Empty states.** Every list page must have a meaningful empty state with an illustration, title, description, and CTA.

8. **Transitions.** Smooth page transitions. Sidebar hover effects (150ms). Button press feedback. Modal fade-in. Slide-over panels slide from right.

9. **Arabic support on invoices.** The PDF template supports Arabic text for company name and client name. Use IBM Plex Sans Arabic or Noto Sans Arabic font. Text direction for Arabic names is RTL but the invoice layout stays LTR (English-primary with Arabic as secondary).

10. **Numbers formatting.** All currency amounts displayed as: "AED 10,500.00" (comma thousands separator, 2 decimal places). Use `Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED' })`.

11. **Date formatting.** Display dates as: "15 Nov 2026" or "15/11/2026". Use `date-fns` with `format(date, 'dd MMM yyyy')`.

12. **TRN validation.** UAE TRN is exactly 15 digits, starts with "100". Validate on input.

---

## WHAT SUCCESS LOOKS LIKE

When the client opens this MVP, they should see:

1. A stunning landing page that looks like it belongs to a funded startup
2. A smooth auth flow that takes 30 seconds to register
3. A quick onboarding wizard that feels effortless
4. A dashboard that makes them go "wow, this looks like a real product"
5. An invoice creation flow that's faster and cleaner than anything they've used
6. A generated PDF that looks professional and bilingual
7. Reports that give instant financial clarity
8. An overall feeling of: "This team knows what they're doing. This is ready to ship."

The bar is Zoho Books quality with Linear's design polish, built specifically for the UAE market.
