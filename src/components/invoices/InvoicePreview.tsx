import React from 'react';
import type { Company, Invoice } from '../../../shared/types.ts';
import { numberToWords } from '../../../shared/schemas.ts';
import { formatCurrency, formatDate } from '../../lib/formatters.ts';

interface InvoicePreviewProps {
  invoice: Invoice;
  company: Company;
  className?: string;
}

export default function InvoicePreview({
  invoice,
  company,
  className = '',
}: InvoicePreviewProps) {
  const accent = company.accentColor || '#F26522';
  const titleEn =
    invoice.invoiceType === 'SIMPLIFIED_TAX'
      ? 'SIMPLIFIED TAX INVOICE'
      : invoice.invoiceType === 'DEBIT_NOTE'
        ? 'TAX DEBIT NOTE'
        : 'TAX INVOICE';
  const titleAr =
    invoice.invoiceType === 'SIMPLIFIED_TAX'
      ? 'فاتورة ضريبية مبسطة'
      : invoice.invoiceType === 'DEBIT_NOTE'
        ? 'إشعار مدين ضريبي'
        : 'فاتورة ضريبية';

  return (
    <div
      className={`printable-invoice bg-white border border-[#E7E5E4] rounded-xl shadow-sm overflow-hidden text-[#1C1917] ${className}`}
    >
      {/* Top accent strip */}
      <div className="h-1.5 w-full" style={{ backgroundColor: accent }} />

      <div className="p-6 sm:p-8 space-y-6">
        {/* Header: Seller + Bilingual Title */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 pb-6 border-b border-[#E7E5E4]">
          <div className="space-y-1.5">
            {company.logoUrl ? (
              <img
                src={company.logoUrl}
                alt={company.nameEn}
                referrerPolicy="no-referrer"
                className="h-11 w-auto object-contain mb-2"
              />
            ) : (
              <div
                className="inline-flex items-center justify-center w-10 h-10 rounded-lg text-white font-bold text-base mb-1"
                style={{ backgroundColor: accent }}
              >
                {company.nameEn.slice(0, 2).toUpperCase()}
              </div>
            )}
            <h3 className="text-base font-bold text-[#1C1917]">{company.nameEn}</h3>
            {company.nameAr && (
              <p className="font-arabic text-sm font-medium text-[#44403C]" dir="rtl">
                {company.nameAr}
              </p>
            )}
            <div className="text-xs text-[#78716C] space-y-0.5 pt-1">
              {company.trn && (
                <p className="font-medium text-[#44403C] tabular-nums">
                  TRN: {company.trn}
                </p>
              )}
              <p>
                {[company.addressLine1, company.addressLine2, company.city, company.emirate]
                  .filter(Boolean)
                  .join(', ')}
              </p>
              <p>
                {[company.poBox, 'United Arab Emirates'].filter(Boolean).join(' · ')}
              </p>
              <p>
                {[company.email, company.phone].filter(Boolean).join(' · ')}
              </p>
            </div>
          </div>

          <div className="sm:text-right space-y-1">
            <p className="text-lg font-bold tracking-tight" style={{ color: accent }}>
              {titleEn}
            </p>
            <p className="font-arabic text-base font-semibold text-[#44403C]" dir="rtl">
              {titleAr}
            </p>
            <div className="pt-2 text-xs space-y-1 tabular-nums">
              <p>
                <span className="text-[#78716C]">Invoice #: </span>
                <span className="font-semibold text-[#1C1917]">{invoice.invoiceNumber}</span>
              </p>
              <p>
                <span className="text-[#78716C]">Issue Date: </span>
                <span className="text-[#1C1917]">{formatDate(invoice.issueDate)}</span>
              </p>
              <p>
                <span className="text-[#78716C]">Due Date: </span>
                <span className="text-[#1C1917]">{formatDate(invoice.dueDate)}</span>
              </p>
              {invoice.purchaseOrderRef && (
                <p>
                  <span className="text-[#78716C]">P.O. Ref: </span>
                  <span className="text-[#1C1917]">{invoice.purchaseOrderRef}</span>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Bill To */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-[11px] font-semibold tracking-wider text-[#A8A29E] uppercase mb-1.5">
              Bill To
            </p>
            <p className="text-sm font-semibold text-[#1C1917]">
              {invoice.client?.nameEn || 'Select Client'}
            </p>
            {invoice.client?.nameAr && (
              <p className="font-arabic text-xs text-[#44403C] mt-0.5" dir="rtl">
                {invoice.client.nameAr}
              </p>
            )}
            <div className="text-xs text-[#78716C] space-y-0.5 mt-1">
              {invoice.client?.trn && (
                <p className="font-medium text-[#44403C] tabular-nums">
                  TRN: {invoice.client.trn}
                </p>
              )}
              <p>
                {[
                  invoice.client?.addressLine1,
                  invoice.client?.city,
                  invoice.client?.emirate,
                  invoice.client?.country || 'AE',
                ]
                  .filter(Boolean)
                  .join(', ')}
              </p>
              <p>
                {[invoice.client?.email, invoice.client?.phone].filter(Boolean).join(' · ')}
              </p>
            </div>
          </div>

          <div className="sm:text-right flex flex-col sm:items-end justify-end">
            <div className="bg-[#FAFAF9] border border-[#E7E5E4] rounded-lg px-4 py-3 inline-block text-left sm:text-right">
              <p className="text-[11px] font-medium text-[#78716C]">Amount Due</p>
              <p className="text-xl font-bold text-[#1C1917] tabular-nums mt-0.5">
                {formatCurrency(invoice.amountDue, invoice.currency)}
              </p>
              {invoice.currency !== 'AED' && (
                <p className="text-[11px] text-[#78716C] tabular-nums mt-0.5">
                  Tax Currency Equiv: {formatCurrency(invoice.grandTotal * invoice.exchangeRate, 'AED')}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="overflow-x-auto border border-[#E7E5E4] rounded-lg">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#FAFAF9] text-[#78716C] border-b border-[#E7E5E4]">
                <th className="py-2.5 px-3 font-medium w-8">#</th>
                <th className="py-2.5 px-3 font-medium">Description</th>
                <th className="py-2.5 px-3 font-medium text-right">Qty</th>
                <th className="py-2.5 px-3 font-medium">Unit</th>
                <th className="py-2.5 px-3 font-medium text-right">Price</th>
                <th className="py-2.5 px-3 font-medium text-right">Disc</th>
                <th className="py-2.5 px-3 font-medium text-right">VAT</th>
                <th className="py-2.5 px-3 font-medium text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0EEEC]">
              {invoice.lineItems.map((line) => (
                <tr key={line.id}>
                  <td className="py-2.5 px-3 text-[#78716C] tabular-nums">
                    {line.lineNumber}
                  </td>
                  <td className="py-2.5 px-3 font-medium text-[#1C1917]">
                    {line.description}
                  </td>
                  <td className="py-2.5 px-3 text-right tabular-nums">{line.quantity}</td>
                  <td className="py-2.5 px-3 text-[#78716C]">{line.unit}</td>
                  <td className="py-2.5 px-3 text-right tabular-nums">
                    {line.unitPrice.toLocaleString('en-AE', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-2.5 px-3 text-right tabular-nums text-[#78716C]">
                    {line.discountAmount > 0
                      ? `-${line.discountAmount.toLocaleString('en-AE', { minimumFractionDigits: 2 })}`
                      : '—'}
                  </td>
                  <td className="py-2.5 px-3 text-right tabular-nums text-[#78716C]">
                    {line.vatRate}%
                  </td>
                  <td className="py-2.5 px-3 text-right font-semibold tabular-nums">
                    {line.lineTotal.toLocaleString('en-AE', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals & Words */}
        <div className="flex flex-col sm:flex-row justify-between gap-6 pt-1">
          <div className="text-xs text-[#78716C] max-w-sm">
            <p className="font-medium text-[#44403C] mb-1">Amount in Words</p>
            <p className="italic">{numberToWords(invoice.grandTotal, invoice.currency)}</p>
            {invoice.notes && (
              <div className="mt-4">
                <p className="font-medium text-[#44403C] mb-1">Notes</p>
                <p>{invoice.notes}</p>
              </div>
            )}
          </div>

          <div className="w-full sm:w-64 space-y-2 text-xs tabular-nums">
            <div className="flex justify-between">
              <span className="text-[#78716C]">Subtotal</span>
              <span className="font-medium">
                {formatCurrency(invoice.subtotal, invoice.currency)}
              </span>
            </div>
            {invoice.totalDiscount > 0 && (
              <div className="flex justify-between">
                <span className="text-[#78716C]">Discount</span>
                <span className="font-medium text-[#DC2626]">
                  -{formatCurrency(invoice.totalDiscount, invoice.currency)}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-[#78716C]">Total Before VAT</span>
              <span className="font-medium">
                {formatCurrency(invoice.totalBeforeVat, invoice.currency)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#78716C]">VAT (5%)</span>
              <span className="font-medium">
                {formatCurrency(invoice.totalVat, invoice.currency)}
              </span>
            </div>
            <div className="flex justify-between pt-2.5 border-t border-[#E7E5E4] text-sm font-bold text-[#1C1917]">
              <span>Grand Total</span>
              <span>{formatCurrency(invoice.grandTotal, invoice.currency)}</span>
            </div>
            {invoice.amountPaid > 0 && (
              <>
                <div className="flex justify-between text-[#16A34A]">
                  <span>Amount Paid</span>
                  <span>-{formatCurrency(invoice.amountPaid, invoice.currency)}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Balance Due</span>
                  <span>{formatCurrency(invoice.amountDue, invoice.currency)}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Bank Details + QR Code */}
        <div className="pt-5 border-t border-[#E7E5E4] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="text-xs text-[#78716C] space-y-1">
            <p className="text-[11px] font-semibold tracking-wider text-[#44403C] uppercase mb-1">
              Payment Details
            </p>
            {company.bankName && <p>Bank: {company.bankName}</p>}
            {company.bankAccountName && <p>Account: {company.bankAccountName}</p>}
            {company.bankIban && (
              <p className="font-mono text-[11px] text-[#1C1917]">
                IBAN: {company.bankIban}
              </p>
            )}
            {company.bankSwift && <p>SWIFT/BIC: {company.bankSwift}</p>}
            {invoice.paymentTerms && <p>Terms: {invoice.paymentTerms}</p>}
          </div>

          <div className="flex items-center gap-4">
            {invoice.qrCodeImage ? (
              <img
                src={invoice.qrCodeImage}
                alt="FTA Compliant QR Code"
                className="w-24 h-24 rounded border border-[#E7E5E4] p-1 bg-white shrink-0"
              />
            ) : (
              <div className="w-24 h-24 rounded border border-dashed border-[#E7E5E4] bg-[#FAFAF9] flex items-center justify-center text-[10px] text-[#A8A29E] text-center p-2">
                FTA QR Generated on Save
              </div>
            )}
            <div className="max-w-[190px] text-[11px] text-[#78716C] leading-relaxed">
              <p className="font-medium text-[#44403C]">FTA E-Invoice Verified</p>
              <p className="mt-0.5">
                Issued in accordance with UAE Federal Tax Authority regulations (PINT-AE UBL 2.1).
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
