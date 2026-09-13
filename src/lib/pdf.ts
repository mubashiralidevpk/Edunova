import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const SCHOOL = 'Ammar Khan Shaheed Model School For Boys';

function header(doc: jsPDF, title: string) {
  doc.setFontSize(16); doc.setFont('helvetica', 'bold');
  doc.text(SCHOOL, 14, 16);
  doc.setFontSize(11); doc.setFont('helvetica', 'normal');
  doc.text(title, 14, 24);
  doc.setDrawColor(0); doc.line(14, 28, 196, 28);
}

export function generateReceiptPDF(opts: {
  receiptNumber: string;
  studentName: string;
  studentRoll?: string;
  invoiceNumber: string;
  description: string;
  amount: number;
  method: string;
  paidOn: string;
  reference?: string | null;
  voided?: boolean;
}) {
  const doc = new jsPDF();
  header(doc, `Payment Receipt — ${opts.receiptNumber}`);
  if (opts.voided) {
    doc.setTextColor(220, 0, 0); doc.setFontSize(40);
    doc.text('VOIDED', 105, 140, { angle: 30, align: 'center' });
    doc.setTextColor(0, 0, 0); doc.setFontSize(11);
  }
  autoTable(doc, {
    startY: 34,
    theme: 'plain',
    body: [
      ['Receipt #', opts.receiptNumber],
      ['Invoice #', opts.invoiceNumber],
      ['Student', `${opts.studentName}${opts.studentRoll ? ` (Roll ${opts.studentRoll})` : ''}`],
      ['Description', opts.description],
      ['Payment Method', opts.method],
      ['Reference', opts.reference || '—'],
      ['Paid On', opts.paidOn],
      ['Amount Paid', `Rs. ${Number(opts.amount).toLocaleString()}`],
    ],
    styles: { fontSize: 10, cellPadding: 2 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 } },
  });
  doc.setFontSize(9);
  doc.text('This is a computer-generated receipt. No signature required.', 14, 280);
  doc.save(`receipt-${opts.receiptNumber}.pdf`);
}

export function generateInvoicePDF(opts: {
  invoiceNumber: string;
  studentName: string;
  studentRoll?: string;
  description: string;
  amount: number;
  amountPaid: number;
  dueDate: string;
  status: string;
  periodLabel?: string | null;
}) {
  const doc = new jsPDF();
  header(doc, `Invoice — ${opts.invoiceNumber}`);
  autoTable(doc, {
    startY: 34, theme: 'plain',
    body: [
      ['Invoice #', opts.invoiceNumber],
      ['Student', `${opts.studentName}${opts.studentRoll ? ` (Roll ${opts.studentRoll})` : ''}`],
      ['Description', opts.description],
      ['Period', opts.periodLabel || '—'],
      ['Due Date', opts.dueDate],
      ['Status', opts.status.toUpperCase()],
    ],
    styles: { fontSize: 10, cellPadding: 2 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 } },
  });
  autoTable(doc, {
    head: [['Total Amount', 'Paid', 'Balance Due']],
    body: [[
      `Rs. ${Number(opts.amount).toLocaleString()}`,
      `Rs. ${Number(opts.amountPaid).toLocaleString()}`,
      `Rs. ${(Number(opts.amount) - Number(opts.amountPaid)).toLocaleString()}`,
    ]],
    styles: { fontSize: 11 }, headStyles: { fillColor: [40, 40, 40] },
  });
  doc.save(`invoice-${opts.invoiceNumber}.pdf`);
}

export function generateReportCardPDF(opts: {
  studentName: string;
  studentRoll: string;
  className?: string;
  termName?: string;
  results: { subject: string; obtained_marks: number; total_marks: number; grade?: string | null; remarks?: string | null }[];
  attendancePct?: number;
}) {
  const doc = new jsPDF();
  header(doc, `Report Card${opts.termName ? ` — ${opts.termName}` : ''}`);
  autoTable(doc, {
    startY: 34, theme: 'plain',
    body: [
      ['Student', opts.studentName],
      ['Roll Number', opts.studentRoll],
      ['Class', opts.className || '—'],
      ['Attendance', opts.attendancePct != null ? `${opts.attendancePct}%` : '—'],
    ],
    styles: { fontSize: 10, cellPadding: 2 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 } },
  });
  if (opts.results.length > 0) {
    const total = opts.results.reduce((s, r) => s + Number(r.total_marks || 0), 0);
    const got = opts.results.reduce((s, r) => s + Number(r.obtained_marks || 0), 0);
    autoTable(doc, {
      head: [['Subject', 'Marks', 'Total', 'Grade', 'Remarks']],
      body: opts.results.map(r => [
        r.subject, String(r.obtained_marks), String(r.total_marks), r.grade || '-', r.remarks || '-',
      ]),
      foot: [['Total', String(got), String(total), total > 0 ? `${Math.round((got / total) * 100)}%` : '-', '']],
      headStyles: { fillColor: [40, 40, 40] },
      footStyles: { fillColor: [220, 220, 220], textColor: 20, fontStyle: 'bold' },
      styles: { fontSize: 10 },
    });
  } else {
    doc.text('No published results yet.', 14, 90);
  }
  doc.save(`report-card-${opts.studentRoll}.pdf`);
}
