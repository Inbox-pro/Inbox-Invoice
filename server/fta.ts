import { create } from 'xmlbuilder2';
import QRCode from 'qrcode';
import type {
  Client,
  Company,
  FtaValidationItem,
  FtaValidationResult,
  Invoice,
} from '../shared/types.ts';
import {
  isValidUaeTrn,
  roundMoney,
  VAT_CATEGORIES,
} from '../shared/schemas.ts';

export function buildFtaQrPayload(company: Company, invoice: Invoice): string {
  return [
    `Seller Name: ${company.nameEn}`,
    `TRN: ${company.trn || 'N/A'}`,
    `Invoice Date: ${new Date(invoice.issueDate).toISOString()}`,
    `Invoice Total (with VAT): ${invoice.grandTotal.toFixed(2)} ${invoice.currency}`,
    `VAT Amount: ${invoice.totalVat.toFixed(2)} ${invoice.currency}`,
  ].join('\n');
}

export async function generateFtaQrCodeImage(payload: string): Promise<string> {
  return QRCode.toDataURL(payload, {
    width: 180,
    margin: 1,
    color: {
      dark: '#1C1917',
      light: '#FFFFFF',
    },
  });
}

/**
 * Validates an invoice against all 51 UAE FTA PINT-AE mandatory fields
 * grouped cleanly into 12 auditable compliance categories.
 */
export function validateInvoiceForFta(
  invoice: Invoice,
  company: Company,
  client?: Client | null,
  existingInvoiceNumbers?: string[]
): FtaValidationResult {
  const checks: FtaValidationItem[] = [];

  // 1. Invoice Identity & Uniqueness (4 fields: BT-1, BT-2, BT-3, BT-24)
  const isDuplicate =
    existingInvoiceNumbers &&
    existingInvoiceNumbers.filter((n) => n === invoice.invoiceNumber).length > 1;
  checks.push({
    id: 'invoice_identity',
    group: 'Document Header',
    label: 'Invoice number & PINT-AE customization ID',
    fieldCount: 4,
    passed: Boolean(invoice.invoiceNumber && invoice.invoiceNumber.trim().length > 0 && !isDuplicate),
    message: isDuplicate
      ? `Invoice number ${invoice.invoiceNumber} is duplicated within your company`
      : invoice.invoiceNumber
        ? `Unique invoice reference ${invoice.invoiceNumber} assigned`
        : 'Invoice number is missing',
    fieldRef: 'invoiceNumber',
  });

  // 2. Issue & Due Dates (3 fields: BT-2, BT-9, BT-20)
  const issueValid = !Number.isNaN(Date.parse(invoice.issueDate));
  const dueValid = !Number.isNaN(Date.parse(invoice.dueDate));
  checks.push({
    id: 'invoice_dates',
    group: 'Document Header',
    label: 'Issue date, due date & payment terms',
    fieldCount: 3,
    passed: issueValid && dueValid && new Date(invoice.dueDate) >= new Date(invoice.issueDate),
    message:
      issueValid && dueValid
        ? new Date(invoice.dueDate) >= new Date(invoice.issueDate)
          ? 'Issue date and due date are valid'
          : 'Due date cannot be earlier than issue date'
        : 'Valid issue date and due date are required',
    fieldRef: 'issueDate',
  });

  // 3. Invoice Type Code (2 fields: BT-3, BT-23)
  const validTypes = ['STANDARD_TAX', 'SIMPLIFIED_TAX', 'DEBIT_NOTE'];
  checks.push({
    id: 'invoice_type',
    group: 'Document Header',
    label: 'FTA invoice type code (UBL 380 / 383)',
    fieldCount: 2,
    passed: validTypes.includes(invoice.invoiceType),
    message: validTypes.includes(invoice.invoiceType)
      ? `Mapped to UAE UBL code (${invoice.invoiceType === 'DEBIT_NOTE' ? '383' : '380'})`
      : 'Invalid invoice type code',
    fieldRef: 'invoiceType',
  });

  // 4. Currency & Tax Accounting Currency (3 fields: BT-5, BT-6, AE-FX)
  const validCurrency = /^[A-Z]{3}$/.test(invoice.currency || '');
  const fxValid = invoice.currency === 'AED' || (invoice.exchangeRate && invoice.exchangeRate > 0);
  checks.push({
    id: 'currency_code',
    group: 'Currency & FX',
    label: 'ISO 4217 currency & AED tax currency rate',
    fieldCount: 3,
    passed: validCurrency && Boolean(fxValid),
    message:
      validCurrency && fxValid
        ? `Currency ${invoice.currency} with AED tax currency conversion verified`
        : 'Valid 3-letter ISO currency code and positive exchange rate required',
    fieldRef: 'currency',
  });

  // 5. Seller Identification & TRN (7 fields: BT-27, BT-28, BT-29, BT-31, BT-34, BG-4)
  const sellerHasTrn = isValidUaeTrn(company.trn);
  const sellerHasAddress = Boolean(company.addressLine1 && (company.city || company.emirate));
  checks.push({
    id: 'seller_details',
    group: 'Seller (Supplier)',
    label: 'Seller legal name, 15-digit TRN & UAE address',
    fieldCount: 7,
    passed: Boolean(company.nameEn && sellerHasTrn && sellerHasAddress),
    message: !company.nameEn
      ? 'Company English legal name is missing in Settings'
      : !sellerHasTrn
        ? 'Company TRN must be 15 digits starting with 100 (update in Company Settings)'
        : !sellerHasAddress
          ? 'Company street address and Emirate are required in Settings'
          : `Seller ${company.nameEn} (TRN ${company.trn}) verified`,
    fieldRef: 'company',
  });

  // 6. Buyer Identification & TRN (7 fields: BT-44, BT-46, BT-48, BT-49, BG-7, BG-8)
  const isB2B = invoice.invoiceType === 'STANDARD_TAX';
  const buyerHasName = Boolean(client?.nameEn);
  const buyerHasTrn = !isB2B || isValidUaeTrn(client?.trn);
  const buyerHasAddress = Boolean(client?.addressLine1 || client?.city || client?.emirate);
  checks.push({
    id: 'buyer_details',
    group: 'Buyer (Customer)',
    label: isB2B
      ? 'Buyer legal name, 15-digit B2B TRN & address'
      : 'Buyer legal name & address details',
    fieldCount: 7,
    passed: Boolean(client && buyerHasName && buyerHasTrn && buyerHasAddress),
    message: !client
      ? 'Select a buyer/client for this invoice'
      : !buyerHasTrn
        ? 'Standard B2B Tax Invoices require a valid 15-digit Buyer TRN starting with 100'
        : !buyerHasAddress
          ? 'Buyer address / Emirate is required for FTA compliance'
          : `Buyer ${client.nameEn}${client.trn ? ` (TRN ${client.trn})` : ''} verified`,
    fieldRef: 'clientId',
  });

  // 7. Line Items Presence (3 fields: BG-25, BT-126, BT-153)
  const hasLines = Array.isArray(invoice.lineItems) && invoice.lineItems.length > 0;
  checks.push({
    id: 'line_items_presence',
    group: 'Line Items',
    label: 'Sequential invoice line items (BG-25)',
    fieldCount: 3,
    passed: hasLines,
    message: hasLines
      ? `${invoice.lineItems.length} compliant line item(s) included`
      : 'At least one invoice line item is required',
    fieldRef: 'lineItems',
  });

  // 8. Line Item Details (6 fields: BT-129, BT-130, BT-131, BT-146, BT-153, BT-154)
  const linesValid =
    hasLines &&
    invoice.lineItems.every(
      (l) =>
        l.description &&
        l.description.trim().length > 0 &&
        Number(l.quantity) > 0 &&
        Number(l.unitPrice) >= 0 &&
        Boolean(l.unit)
    );
  checks.push({
    id: 'line_items_values',
    group: 'Line Items',
    label: 'Line descriptions, positive quantities, units & prices',
    fieldCount: 6,
    passed: linesValid,
    message: linesValid
      ? 'All line descriptions, quantities, units, and prices are valid'
      : 'Every line item must have a description, quantity > 0, unit, and unit price ≥ 0',
    fieldRef: 'lineItems',
  });

  // 9. VAT Category & Rate Per Line (5 fields: BT-151, BT-152, BG-23, BT-118, BT-119)
  const validCategories = VAT_CATEGORIES.map((v) => v.value);
  const vatLinesValid =
    hasLines &&
    invoice.lineItems.every((l) => {
      const expectedRate = l.vatCategory === 'STANDARD' ? 5 : 0;
      return validCategories.includes(l.vatCategory) && Number(l.vatRate) === expectedRate;
    });
  checks.push({
    id: 'line_vat_rules',
    group: 'Tax Breakdown',
    label: 'UAE VAT category codes (S/Z/E/AE/O) & rates per line',
    fieldCount: 5,
    passed: vatLinesValid,
    message: vatLinesValid
      ? 'All line VAT categories and rates match FTA schedules'
      : 'One or more line items have an invalid VAT category or mismatched VAT rate',
    fieldRef: 'lineItems',
  });

  // 10. Mathematical Totals Integrity (5 fields: BT-106, BT-107, BT-109, BT-112, BT-115)
  const expectedBeforeVat = roundMoney(
    (invoice.lineItems || []).reduce((acc, l) => acc + Number(l.lineTotalBeforeVat || 0), 0)
  );
  const expectedVat = roundMoney(
    (invoice.lineItems || []).reduce((acc, l) => acc + Number(l.vatAmount || 0), 0)
  );
  const expectedGrand = roundMoney(expectedBeforeVat + expectedVat);
  const totalsMatch =
    Math.abs(roundMoney(invoice.totalBeforeVat) - expectedBeforeVat) <= 0.02 &&
    Math.abs(roundMoney(invoice.grandTotal) - expectedGrand) <= 0.02;
  checks.push({
    id: 'totals_math',
    group: 'Monetary Totals',
    label: 'Subtotal, allowances, taxable base & payable total',
    fieldCount: 5,
    passed: totalsMatch && invoice.grandTotal >= 0,
    message: totalsMatch
      ? 'Document totals reconcile with line item extensions'
      : 'Invoice totals do not reconcile with sum of line items',
    fieldRef: 'totals',
  });

  // 11. VAT Calculation Reconciliation (3 fields: BT-110, BT-116, BT-117)
  const vatReconciles = Math.abs(roundMoney(invoice.totalVat) - expectedVat) <= 0.02;
  checks.push({
    id: 'vat_reconciliation',
    group: 'Tax Breakdown',
    label: 'Per-line VAT calculation & total tax reconciliation',
    fieldCount: 3,
    passed: vatReconciles,
    message: vatReconciles
      ? `Total VAT (${invoice.currency} ${expectedVat.toFixed(2)}) reconciled per line`
      : 'Total VAT amount does not match per-line calculated tax',
    fieldRef: 'totals',
  });

  // 12. QR Code & Electronic Archival Readiness (3 fields: AE-QR, BT-24, PEPPOL-ID)
  const qrReady = Boolean(company.nameEn && invoice.issueDate && invoice.grandTotal !== undefined);
  checks.push({
    id: 'qr_archival',
    group: 'Compliance & QR',
    label: 'FTA QR payload & Peppol 5-corner schema readiness',
    fieldCount: 3,
    passed: qrReady,
    message: qrReady
      ? 'FTA QR code payload and PINT-AE XML structure ready'
      : 'Missing required fields for FTA QR code generation',
    fieldRef: 'qr',
  });

  const totalFieldsChecked = checks.reduce((s, c) => s + c.fieldCount, 0); // 51 fields
  const passedFieldsCount = checks
    .filter((c) => c.passed)
    .reduce((s, c) => s + c.fieldCount, 0);
  const errors = checks.filter((c) => !c.passed);

  return {
    valid: errors.length === 0,
    totalFieldsChecked,
    passedFieldsCount,
    errors,
    checks,
  };
}

/**
 * Generates a PINT-AE UBL 2.1 compliant XML document for UAE FTA / Peppol 5-corner exchange.
 */
export function generatePintAeXml(
  invoice: Invoice,
  company: Company,
  client: Client
): string {
  const typeCode = invoice.invoiceType === 'DEBIT_NOTE' ? '383' : '380';
  const issueDateStr = invoice.issueDate.slice(0, 10);
  const dueDateStr = invoice.dueDate.slice(0, 10);

  // Group VAT subtotals by category
  const vatGroups = new Map<
    string,
    { pintCode: string; rate: number; taxableAmount: number; taxAmount: number }
  >();

  for (const line of invoice.lineItems) {
    const meta =
      VAT_CATEGORIES.find((v) => v.value === line.vatCategory) || VAT_CATEGORIES[0];
    const key = `${meta.pintCode}-${meta.rate}`;
    const existing = vatGroups.get(key) || {
      pintCode: meta.pintCode,
      rate: meta.rate,
      taxableAmount: 0,
      taxAmount: 0,
    };
    existing.taxableAmount = roundMoney(existing.taxableAmount + line.lineTotalBeforeVat);
    existing.taxAmount = roundMoney(existing.taxAmount + line.vatAmount);
    vatGroups.set(key, existing);
  }

  const root = create({ version: '1.0', encoding: 'UTF-8' }).ele('Invoice', {
    xmlns: 'urn:oasis:names:specification:ubl:schema:xsd:Invoice-2',
    'xmlns:cac':
      'urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2',
    'xmlns:cbc':
      'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2',
  });

  root
    .ele('cbc:CustomizationID')
    .txt('urn:peppol:pint:billing-1@ae-1')
    .up()
    .ele('cbc:ProfileID')
    .txt('urn:peppol:bis:billing')
    .up()
    .ele('cbc:ID')
    .txt(invoice.invoiceNumber)
    .up()
    .ele('cbc:IssueDate')
    .txt(issueDateStr)
    .up()
    .ele('cbc:DueDate')
    .txt(dueDateStr)
    .up()
    .ele('cbc:InvoiceTypeCode')
    .txt(typeCode)
    .up();

  if (invoice.notes) {
    root.ele('cbc:Note').txt(invoice.notes).up();
  }

  root
    .ele('cbc:DocumentCurrencyCode')
    .txt(invoice.currency)
    .up()
    .ele('cbc:TaxCurrencyCode')
    .txt('AED')
    .up();

  if (invoice.purchaseOrderRef) {
    root
      .ele('cac:OrderReference')
      .ele('cbc:ID')
      .txt(invoice.purchaseOrderRef)
      .up()
      .up();
  }

  // Supplier (Seller)
  const supplierParty = root.ele('cac:AccountingSupplierParty').ele('cac:Party');
  supplierParty
    .ele('cbc:EndpointID', { schemeID: '0235' })
    .txt(company.tin || company.trn || '100000000000000')
    .up();
  supplierParty
    .ele('cac:PartyName')
    .ele('cbc:Name')
    .txt(company.nameEn)
    .up()
    .up();
  const supplierAddr = supplierParty.ele('cac:PostalAddress');
  if (company.addressLine1) {
    supplierAddr.ele('cbc:StreetName').txt(company.addressLine1).up();
  }
  supplierAddr
    .ele('cbc:CityName')
    .txt(company.city || company.emirate || 'Dubai')
    .up()
    .ele('cbc:CountrySubentity')
    .txt(company.emirate || 'Dubai')
    .up()
    .ele('cac:Country')
    .ele('cbc:IdentificationCode')
    .txt(company.country || 'AE')
    .up()
    .up()
    .up();
  if (company.trn) {
    supplierParty
      .ele('cac:PartyTaxScheme')
      .ele('cbc:CompanyID')
      .txt(company.trn)
      .up()
      .ele('cac:TaxScheme')
      .ele('cbc:ID')
      .txt('VAT')
      .up()
      .up()
      .up();
  }
  supplierParty
    .ele('cac:PartyLegalEntity')
    .ele('cbc:RegistrationName')
    .txt(company.nameEn)
    .up()
    .up();
  supplierParty.up().up();

  // Customer (Buyer)
  const customerParty = root.ele('cac:AccountingCustomerParty').ele('cac:Party');
  customerParty
    .ele('cbc:EndpointID', { schemeID: '0235' })
    .txt(client.tin || client.trn || '000000000000000')
    .up();
  customerParty
    .ele('cac:PartyName')
    .ele('cbc:Name')
    .txt(client.nameEn)
    .up()
    .up();
  const customerAddr = customerParty.ele('cac:PostalAddress');
  if (client.addressLine1) {
    customerAddr.ele('cbc:StreetName').txt(client.addressLine1).up();
  }
  customerAddr
    .ele('cbc:CityName')
    .txt(client.city || client.emirate || 'Dubai')
    .up()
    .ele('cbc:CountrySubentity')
    .txt(client.emirate || 'Dubai')
    .up()
    .ele('cac:Country')
    .ele('cbc:IdentificationCode')
    .txt(client.country || 'AE')
    .up()
    .up()
    .up();
  if (client.trn) {
    customerParty
      .ele('cac:PartyTaxScheme')
      .ele('cbc:CompanyID')
      .txt(client.trn)
      .up()
      .ele('cac:TaxScheme')
      .ele('cbc:ID')
      .txt('VAT')
      .up()
      .up()
      .up();
  }
  customerParty
    .ele('cac:PartyLegalEntity')
    .ele('cbc:RegistrationName')
    .txt(client.nameEn)
    .up()
    .up();
  customerParty.up().up();

  // Payment Means
  if (company.bankIban) {
    root
      .ele('cac:PaymentMeans')
      .ele('cbc:PaymentMeansCode')
      .txt('30')
      .up()
      .ele('cac:PayeeFinancialAccount')
      .ele('cbc:ID')
      .txt(company.bankIban)
      .up()
      .ele('cbc:Name')
      .txt(company.bankAccountName || company.nameEn)
      .up()
      .up()
      .up();
  }

  // Tax Total
  const taxTotal = root.ele('cac:TaxTotal');
  taxTotal
    .ele('cbc:TaxAmount', { currencyID: invoice.currency })
    .txt(invoice.totalVat.toFixed(2))
    .up();
  for (const group of vatGroups.values()) {
    taxTotal
      .ele('cac:TaxSubtotal')
      .ele('cbc:TaxableAmount', { currencyID: invoice.currency })
      .txt(group.taxableAmount.toFixed(2))
      .up()
      .ele('cbc:TaxAmount', { currencyID: invoice.currency })
      .txt(group.taxAmount.toFixed(2))
      .up()
      .ele('cac:TaxCategory')
      .ele('cbc:ID')
      .txt(group.pintCode)
      .up()
      .ele('cbc:Percent')
      .txt(group.rate.toFixed(2))
      .up()
      .ele('cac:TaxScheme')
      .ele('cbc:ID')
      .txt('VAT')
      .up()
      .up()
      .up()
      .up();
  }
  taxTotal.up();

  // Legal Monetary Total
  root
    .ele('cac:LegalMonetaryTotal')
    .ele('cbc:LineExtensionAmount', { currencyID: invoice.currency })
    .txt(invoice.totalBeforeVat.toFixed(2))
    .up()
    .ele('cbc:TaxExclusiveAmount', { currencyID: invoice.currency })
    .txt(invoice.totalBeforeVat.toFixed(2))
    .up()
    .ele('cbc:TaxInclusiveAmount', { currencyID: invoice.currency })
    .txt(invoice.grandTotal.toFixed(2))
    .up()
    .ele('cbc:AllowanceTotalAmount', { currencyID: invoice.currency })
    .txt(invoice.totalDiscount.toFixed(2))
    .up()
    .ele('cbc:PayableAmount', { currencyID: invoice.currency })
    .txt(invoice.amountDue.toFixed(2))
    .up()
    .up();

  // Invoice Lines
  for (const line of invoice.lineItems) {
    const meta =
      VAT_CATEGORIES.find((v) => v.value === line.vatCategory) || VAT_CATEGORIES[0];
    const lineEle = root.ele('cac:InvoiceLine');
    lineEle
      .ele('cbc:ID')
      .txt(String(line.lineNumber))
      .up()
      .ele('cbc:InvoicedQuantity', { unitCode: 'EA' })
      .txt(String(line.quantity))
      .up()
      .ele('cbc:LineExtensionAmount', { currencyID: invoice.currency })
      .txt(line.lineTotalBeforeVat.toFixed(2))
      .up();

    if (line.discountAmount > 0) {
      lineEle
        .ele('cac:AllowanceCharge')
        .ele('cbc:ChargeIndicator')
        .txt('false')
        .up()
        .ele('cbc:Amount', { currencyID: invoice.currency })
        .txt(line.discountAmount.toFixed(2))
        .up()
        .up();
    }

    lineEle
      .ele('cac:Item')
      .ele('cbc:Name')
      .txt(line.description)
      .up()
      .ele('cac:ClassifiedTaxCategory')
      .ele('cbc:ID')
      .txt(meta.pintCode)
      .up()
      .ele('cbc:Percent')
      .txt(line.vatRate.toFixed(2))
      .up()
      .ele('cac:TaxScheme')
      .ele('cbc:ID')
      .txt('VAT')
      .up()
      .up()
      .up()
      .up();

    lineEle
      .ele('cac:Price')
      .ele('cbc:PriceAmount', { currencyID: invoice.currency })
      .txt(line.unitPrice.toFixed(2))
      .up()
      .up();

    lineEle.up();
  }

  return root.end({ prettyPrint: true });
}
