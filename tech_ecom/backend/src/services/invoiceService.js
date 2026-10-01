/**
 * ============================================================================
 * INVOICE SERVICE — Server-side PDF generation with PDFKit
 * ============================================================================
 */
import PDFDocument from 'pdfkit';

/**
 * Generate invoice PDF and pipe to response stream
 * @param {Object} order - Populated order document
 * @param {Object} user - User document
 * @param {Object} res - Express response object
 */
export function generateInvoicePDF(order, user, res) {
  const doc = new PDFDocument({ margin: 50, size: 'A4' });

  // Set response headers
  const invoiceId = order._id.toString().slice(-8).toUpperCase();
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=TechVault-Invoice-${invoiceId}.pdf`);

  doc.pipe(res);

  // ─── Header ──────────────────────────────────────────────────────────
  doc.fontSize(26).font('Helvetica-Bold').text('The Tech Vault', 50, 45);
  doc.fontSize(10).font('Helvetica').fillColor('#666')
    .text('Premium Electronics & Tech Gear', 50, 75);

  // Invoice info (right side)
  doc.fontSize(10).fillColor('#333')
    .text(`Invoice #${invoiceId}`, 400, 45, { align: 'right' })
    .text(`Date: ${new Date(order.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, 400, 60, { align: 'right' })
    .text(`Status: ${order.paymentResult?.status?.toUpperCase() || 'PENDING'}`, 400, 75, { align: 'right' });

  // Divider
  doc.moveTo(50, 100).lineTo(545, 100).strokeColor('#e0e0e0').stroke();

  // ─── Customer Info ───────────────────────────────────────────────────
  doc.fontSize(11).fillColor('#333').font('Helvetica-Bold')
    .text('Bill To:', 50, 115);
  doc.fontSize(10).font('Helvetica').fillColor('#555')
    .text(user.name, 50, 132)
    .text(user.email, 50, 146);

  doc.fontSize(11).fillColor('#333').font('Helvetica-Bold')
    .text('Ship To:', 300, 115);
  const addr = order.shippingAddress;
  doc.fontSize(10).font('Helvetica').fillColor('#555')
    .text(addr.fullName, 300, 132)
    .text(addr.street, 300, 146)
    .text(`${addr.city}, ${addr.state} ${addr.zipCode}`, 300, 160)
    .text(addr.country, 300, 174)
    .text(`Phone: ${addr.phone}`, 300, 188);

  // ─── Order Items Table ───────────────────────────────────────────────
  let y = 220;

  // Table header
  doc.rect(50, y, 495, 22).fillColor('#1a1a2e').fill();
  doc.fontSize(9).fillColor('#ffffff').font('Helvetica-Bold')
    .text('PRODUCT', 55, y + 6)
    .text('QTY', 340, y + 6, { width: 50, align: 'center' })
    .text('UNIT PRICE', 390, y + 6, { width: 70, align: 'right' })
    .text('TOTAL', 465, y + 6, { width: 75, align: 'right' });

  y += 22;

  // Table rows
  order.orderItems.forEach((item, i) => {
    const rowColor = i % 2 === 0 ? '#f8f9fa' : '#ffffff';
    doc.rect(50, y, 495, 22).fillColor(rowColor).fill();

    doc.fontSize(9).fillColor('#333').font('Helvetica')
      .text(item.title.substring(0, 45), 55, y + 6, { width: 280 })
      .text(item.quantity.toString(), 340, y + 6, { width: 50, align: 'center' })
      .text(`$${item.unitPrice.toFixed(2)}`, 390, y + 6, { width: 70, align: 'right' })
      .text(`$${(item.unitPrice * item.quantity).toFixed(2)}`, 465, y + 6, { width: 75, align: 'right' });

    y += 22;
  });

  // ─── Pricing Summary ─────────────────────────────────────────────────
  y += 15;
  const summaryX = 380;

  const addSummaryRow = (label, value, bold = false) => {
    doc.fontSize(10)
      .font(bold ? 'Helvetica-Bold' : 'Helvetica')
      .fillColor(bold ? '#1a1a2e' : '#555')
      .text(label, summaryX, y)
      .text(value, summaryX + 80, y, { width: 85, align: 'right' });
    y += 18;
  };

  addSummaryRow('Subtotal:', `$${order.pricing.subtotal.toFixed(2)}`);
  addSummaryRow('Shipping:', order.pricing.shippingCost === 0 ? 'FREE' : `$${order.pricing.shippingCost.toFixed(2)}`);
  addSummaryRow('Tax:', `$${order.pricing.tax.toFixed(2)}`);
  if (order.pricing.discount > 0) {
    addSummaryRow('Discount:', `-$${order.pricing.discount.toFixed(2)}`);
  }

  // Total line
  doc.moveTo(summaryX, y).lineTo(545, y).strokeColor('#1a1a2e').lineWidth(2).stroke();
  y += 8;
  addSummaryRow('TOTAL:', `$${order.pricing.total.toFixed(2)}`, true);

  // ─── Payment Method ──────────────────────────────────────────────────
  y += 20;
  doc.fontSize(10).fillColor('#555').font('Helvetica')
    .text(`Payment Method: ${(order.paymentResult?.method || 'stripe').toUpperCase()}`, 50, y);

  if (order.paymentResult?.transactionId) {
    y += 15;
    doc.text(`Transaction ID: ${order.paymentResult.transactionId}`, 50, y);
  }

  // ─── Footer ──────────────────────────────────────────────────────────
  doc.fontSize(8).fillColor('#999').font('Helvetica')
    .text('Thank you for shopping with The Tech Vault!', 50, 750, { align: 'center', width: 495 })
    .text('This is a computer-generated invoice. No signature required.', 50, 762, { align: 'center', width: 495 });

  doc.end();
}
