import { format, formatDistanceToNow, isValid, parseISO } from 'date-fns';
import { jsPDF } from 'jspdf';
import type { Company, Invoice } from '../../shared/types.ts';
import { numberToWords } from '../../shared/schemas.ts';

export function formatCurrency(amount: number, currency = 'AED'): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  try {
    const formatted = new Intl.NumberFormat('en-AE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(safe);
    return `${currency} ${formatted}`;
  } catch {
    return `${currency} ${safe.toFixed(2)}`;
  }
}

export function formatCompactCurrency(amount: number, currency = 'AED'): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  if (Math.abs(safe) >= 1_000_000) {
    return `${currency} ${(safe / 1_000_000).toFixed(2)}M`;
  }
  if (Math.abs(safe) >= 10_000) {
    return `${currency} ${(safe / 1_000).toFixed(1)}K`;
  }
  return formatCurrency(safe, currency);
}

export function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '—';
  const parsed = parseISO(dateStr);
  if (!isValid(parsed)) {
    const d = new Date(dateStr);
    return isValid(d) ? format(d, 'dd MMM yyyy') : dateStr;
  }
  return format(parsed, 'dd MMM yyyy');
}

export function formatRelativeTime(dateStr?: string | null): string {
  if (!dateStr) return '';
  const parsed = parseISO(dateStr);
  if (!isValid(parsed)) return '';
  return formatDistanceToNow(parsed, { addSuffix: true });
}

export function downloadTextFile(filename: string, content: string, mime = 'text/plain'): void {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportToCsv(filename: string, headers: string[], rows: (string | number)[][]): void {
  const escapeCell = (cell: string | number) => {
    const str = String(cell ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  const csv = [headers.map(escapeCell).join(','), ...rows.map((r) => r.map(escapeCell).join(','))].join('\n');
  downloadTextFile(filename, csv, 'text/csv');
}

/**
 * Generates and downloads a clean, FTA-compliant Tax Invoice PDF with embedded QR code.
 */
export function downloadInvoicePdf(invoice: Invoice, company: Company): void {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 42;
  let y = 46;

  const accentHex = company.accentColor || '#F26522';

  // Top accent bar
  doc.setFillColor(accentHex);
  doc.rect(0, 0, pageWidth, 6, 'F');

  // Seller header (left)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor('#1C1917');
  doc.text(company.nameEn || 'Company Name', margin, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor('#78716C');
  y += 16;
  if (company.trn) {
    doc.text(`TRN: ${company.trn}`, margin, y);
    y += 13;
  }
  const sellerAddr = [company.addressLine1, company.city, company.emirate, 'UAE']
    .filter(Boolean)
    .join(', ');
  if (sellerAddr) {
    doc.text(sellerAddr, margin, y);
    y += 13;
  }
  doc.text([company.email, company.phone].filter(Boolean).join('  |  '), margin, y);

  // Invoice Meta (right)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(accentHex);
  const titleLabel =
    invoice.invoiceType === 'SIMPLIFIED_TAX'
      ? 'SIMPLIFIED TAX INVOICE'
      : invoice.invoiceType === 'DEBIT_NOTE'
        ? 'TAX DEBIT NOTE'
        : 'TAX INVOICE';
  doc.text(titleLabel, pageWidth - margin, 48, { align: 'right' });

  doc.setFontSize(9.5);
  doc.setTextColor('#1C1917');
  doc.setFont('helvetica', 'bold');
  doc.text(`Invoice #: ${invoice.invoiceNumber}`, pageWidth - margin, 68, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setTextColor('#78716C');
  doc.text(`Issue Date: ${formatDate(invoice.issueDate)}`, pageWidth - margin, 82, { align: 'right' });
  doc.text(`Due Date: ${formatDate(invoice.dueDate)}`, pageWidth - margin, 96, { align: 'right' });
  if (invoice.purchaseOrderRef) {
    doc.text(`P.O. Ref: ${invoice.purchaseOrderRef}`, pageWidth - margin, 110, { align: 'right' });
  }

  // Divider
  y = Math.max(y + 20, 126);
  doc.setDrawColor('#E7E5E4');
  doc.line(margin, y, pageWidth - margin, y);
  y += 20;

  // Bill To block
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor('#A8A29E');
  doc.text('BILL TO', margin, y);
  y += 14;
  doc.setFontSize(11);
  doc.setTextColor('#1C1917');
  doc.text(invoice.client?.nameEn || 'Client', margin, y);
  y += 14;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor('#78716C');
  if (invoice.client?.trn) {
    doc.text(`TRN: ${invoice.client.trn}`, margin, y);
    y += 13;
  }
  const clientAddr = [
    invoice.client?.addressLine1,
    invoice.client?.city,
    invoice.client?.emirate,
    invoice.client?.country || 'AE',
  ]
    .filter(Boolean)
    .join(', ');
  if (clientAddr) {
    doc.text(clientAddr, margin, y);
    y += 13;
  }
  if (invoice.client?.email || invoice.client?.phone) {
    doc.text(
      [invoice.client?.email, invoice.client?.phone].filter(Boolean).join('  |  '),
      margin,
      y
    );
    y += 14;
  }

  y += 14;

  // Line Items Table Header
  doc.setFillColor('#FAFAF9');
  doc.rect(margin, y, pageWidth - margin * 2, 24, 'F');
  doc.setDrawColor('#E7E5E4');
  doc.line(margin, y, pageWidth - margin, y);
  doc.line(margin, y + 24, pageWidth - margin, y + 24);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor('#78716C');
  const colX = {
    idx: margin + 6,
    desc: margin + 26,
    qty: 280,
    unit: 320,
    price: 385,
    disc: 432,
    vat: 472,
    total: pageWidth - margin - 6,
  };
  doc.text('#', colX.idx, y + 15);
  doc.text('DESCRIPTION', colX.desc, y + 15);
  doc.text('QTY', colX.qty, y + 15, { align: 'right' });
  doc.text('UNIT', colX.unit, y + 15);
  doc.text('PRICE', colX.price, y + 15, { align: 'right' });
  doc.text('DISC', colX.disc, y + 15, { align: 'right' });
  doc.text('VAT', colX.vat, y + 15, { align: 'right' });
  doc.text('TOTAL', colX.total, y + 15, { align: 'right' });

  y += 24;

  // Table Rows
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  for (const line of invoice.lineItems) {
    y += 20;
    doc.setTextColor('#78716C');
    doc.text(String(line.lineNumber), colX.idx, y);
    doc.setTextColor('#1C1917');
    const truncatedDesc =
      line.description.length > 42
        ? `${line.description.slice(0, 40)}...`
        : line.description;
    doc.text(truncatedDesc, colX.desc, y);
    doc.text(String(line.quantity), colX.qty, y, { align: 'right' });
    doc.setTextColor('#78716C');
    doc.text(line.unit, colX.unit, y);
    doc.setTextColor('#1C1917');
    doc.text(line.unitPrice.toFixed(2), colX.price, y, { align: 'right' });
    doc.text(line.discountAmount > 0 ? `-${line.discountAmount.toFixed(2)}` : '0.00', colX.disc, y, {
      align: 'right',
    });
    doc.text(`${line.vatRate}%`, colX.vat, y, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.text(line.lineTotal.toFixed(2), colX.total, y, { align: 'right' });
    doc.setFont('helvetica', 'normal');

    doc.setDrawColor('#F0EEEC');
    doc.line(margin, y + 7, pageWidth - margin, y + 7);
  }

  y += 26;

  // Totals Summary (Right)
  const totalsLeft = pageWidth - margin - 210;
  const drawTotalRow = (label: string, val: string, bold = false) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(bold ? 11 : 9.5);
    doc.setTextColor(bold ? '#1C1917' : '#78716C');
    doc.text(label, totalsLeft, y);
    doc.setTextColor('#1C1917');
    doc.text(val, pageWidth - margin, y, { align: 'right' });
    y += bold ? 20 : 16;
  };

  drawTotalRow('Subtotal', formatCurrency(invoice.subtotal, invoice.currency));
  if (invoice.totalDiscount > 0) {
    drawTotalRow('Discount', `-${formatCurrency(invoice.totalDiscount, invoice.currency)}`);
  }
  drawTotalRow('Total Before VAT', formatCurrency(invoice.totalBeforeVat, invoice.currency));
  drawTotalRow('VAT (5%)', formatCurrency(invoice.totalVat, invoice.currency));

  doc.setDrawColor('#E7E5E4');
  doc.line(totalsLeft, y - 6, pageWidth - margin, y - 6);
  y += 6;
  drawTotalRow('GRAND TOTAL', formatCurrency(invoice.grandTotal, invoice.currency), true);

  // Amount in words
  y += 6;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8.5);
  doc.setTextColor('#78716C');
  doc.text(`Amount in words: ${numberToWords(invoice.grandTotal, invoice.currency)}`, margin, y);

  // Payment details + QR Code
  y += 26;
  doc.setDrawColor('#E7E5E4');
  doc.line(margin, y, pageWidth - margin, y);
  y += 18;

  const bankStartY = y;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor('#1C1917');
  doc.text('PAYMENT DETAILS', margin, y);
  y += 14;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor('#78716C');
  if (company.bankName) {
    doc.text(`Bank: ${company.bankName}`, margin, y);
    y += 12;
  }
  if (company.bankAccountName) {
    doc.text(`Account Name: ${company.bankAccountName}`, margin, y);
    y += 12;
  }
  if (company.bankIban) {
    doc.text(`IBAN: ${company.bankIban}`, margin, y);
    y += 12;
  }
  if (company.bankSwift) {
    doc.text(`SWIFT/BIC: ${company.bankSwift}`, margin, y);
    y += 12;
  }
  if (invoice.paymentTerms) {
    doc.text(`Payment Terms: ${invoice.paymentTerms}`, margin, y);
    y += 12;
  }

  if (invoice.qrCodeImage) {
    try {
      doc.addImage(invoice.qrCodeImage, 'PNG', pageWidth - margin - 84, bankStartY - 4, 84, 84);
    } catch {
      // QR optional fallback
    }
  }

  // Footer compliance notice
  const footerY = doc.internal.pageSize.getHeight() - 48;
  doc.setDrawColor('#F0EEEC');
  doc.line(margin, footerY - 12, pageWidth - margin, footerY - 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor('#A8A29E');
  doc.text(
    'This is a tax invoice issued in accordance with UAE Federal Tax Authority regulations (PINT-AE UBL 2.1).',
    margin,
    footerY
  );
  doc.text('Generated with Inbox Invoice · Inbox Infotech', pageWidth - margin, footerY, { align: 'right' });

  doc.save(`${invoice.invoiceNumber}.pdf`);
}

export function downloadVatReturnPdf(
  company: Company,
  summary: {
    periodStart: string;
    periodEnd: string;
    outputVat: number;
    grossOutputVat: number;
    creditNoteVatAdjustment: number;
    inputVat: number;
    netVatPayable: number;
    categories: { label: string; taxableAmount: number; vatAmount: number }[];
  }
): void {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 42;
  let y = 48;

  doc.setFillColor('#F26522');
  doc.rect(0, 0, pageWidth, 6, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor('#1C1917');
  doc.text('UAE FTA VAT 201 Return Summary', margin, y);

  y += 20;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor('#78716C');
  doc.text(`${company.nameEn}  |  TRN: ${company.trn || 'Not Set'}`, margin, y);
  y += 14;
  doc.text(
    `Tax Period: ${formatDate(summary.periodStart)} to ${formatDate(summary.periodEnd)}`,
    margin,
    y
  );

  y += 26;
  doc.setDrawColor('#E7E5E4');
  doc.line(margin, y, pageWidth - margin, y);
  y += 22;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor('#1C1917');
  doc.text('VAT on Sales and All Other Outputs', margin, y);
  y += 18;

  doc.setFillColor('#FAFAF9');
  doc.rect(margin, y, pageWidth - margin * 2, 24, 'F');
  doc.setFontSize(8.5);
  doc.setTextColor('#78716C');
  doc.text('SUPPLY CATEGORY', margin + 8, y + 15);
  doc.text('TAXABLE AMOUNT (AED)', 380, y + 15, { align: 'right' });
  doc.text('VAT AMOUNT (AED)', pageWidth - margin - 8, y + 15, { align: 'right' });
  y += 24;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  for (const row of summary.categories) {
    y += 22;
    doc.setTextColor('#1C1917');
    doc.text(row.label, margin + 8, y);
    doc.text(formatCurrency(row.taxableAmount), 380, y, { align: 'right' });
    doc.text(formatCurrency(row.vatAmount), pageWidth - margin - 8, y, { align: 'right' });
    doc.setDrawColor('#F0EEEC');
    doc.line(margin, y + 7, pageWidth - margin, y + 7);
  }

  y += 32;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor('#1C1917');
  doc.text('Net VAT Due Calculation', margin, y);
  y += 22;

  const drawBoxRow = (label: string, value: string, highlight = false) => {
    doc.setFont('helvetica', highlight ? 'bold' : 'normal');
    doc.setFontSize(highlight ? 11.5 : 10);
    doc.setTextColor(highlight ? '#F26522' : '#44403C');
    doc.text(label, margin, y);
    doc.text(value, pageWidth - margin, y, { align: 'right' });
    y += 20;
  };

  drawBoxRow('Total Output VAT on Sales', formatCurrency(summary.grossOutputVat));
  drawBoxRow('Less: Credit Note VAT Adjustments', `-${formatCurrency(summary.creditNoteVatAdjustment)}`);
  drawBoxRow('Net Output VAT', formatCurrency(summary.outputVat));
  drawBoxRow('Recoverable Input VAT (Purchases)', formatCurrency(summary.inputVat));
  doc.setDrawColor('#E7E5E4');
  doc.line(margin, y - 8, pageWidth - margin, y - 8);
  y += 6;
  drawBoxRow('NET VAT PAYABLE TO FTA', formatCurrency(summary.netVatPayable), true);

  doc.save(`FTA-VAT-201-Summary-${summary.periodEnd}.pdf`);
}
