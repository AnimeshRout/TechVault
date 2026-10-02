// CRON JOBS SERVICE — Scheduled background tasks
import cron from 'node-cron';
import StockReservation from '../models/StockReservation.js';
import StockNotification from '../models/StockNotification.js';
import Product from '../models/Product.js';
import { sendEmail, backInStockEmail } from '../services/emailService.js';

const LOW_STOCK_THRESHOLD = 5;

export function initCronJobs() {
  console.log('⏰ Cron jobs initialized');

  // ─── Every 5 min: Clean expired stock reservations (backup to TTL) ──
  cron.schedule('*/5 * * * *', async () => {
    try {
      const result = await StockReservation.deleteMany({
        expiresAt: { $lt: new Date() },
      });
      if (result.deletedCount > 0) {
        console.log(`🔄 Cleaned ${result.deletedCount} expired stock reservations`);
      }
    } catch (err) {
      console.error('❌ Stock reservation cleanup failed:', err.message);
    }
  });

  // ─── Every 15 min: Back-in-stock notifications ─────────────────────
  cron.schedule('*/15 * * * *', async () => {
    try {
      // Find un-notified subscriptions where product is now in stock
      const notifications = await StockNotification.find({ notified: false })
        .populate('product', 'title slug images price stock');

      for (const notif of notifications) {
        if (notif.product && notif.product.stock > 0) {
          await sendEmail({
            to: notif.email,
            subject: `🔔 ${notif.product.title} is back in stock!`,
            html: backInStockEmail({ name: '', email: notif.email }, notif.product),
          });

          notif.notified = true;
          notif.notifiedAt = new Date();
          await notif.save();
        }
      }
    } catch (err) {
      console.error('❌ Back-in-stock notification cron failed:', err.message);
    }
  });

  // ─── Daily at 9 AM: Low-stock admin alerts ─────────────────────────
  cron.schedule('0 9 * * *', async () => {
    try {
      const lowStockProducts = await Product.find({
        stock: { $gt: 0, $lte: LOW_STOCK_THRESHOLD },
      }).select('title stock category').lean();

      if (lowStockProducts.length === 0) return;

      const adminEmail = process.env.ADMIN_ALERT_EMAIL || process.env.SMTP_USER;
      if (!adminEmail) return;

      const itemsList = lowStockProducts
        .map((p) => `• ${p.title} — ${p.stock} left (${p.category})`)
        .join('\n');

      await sendEmail({
        to: adminEmail,
        subject: `⚠️ TechVault: ${lowStockProducts.length} products running low on stock`,
        html: `
          <div style="font-family:sans-serif;padding:20px;">
            <h2>Low Stock Alert</h2>
            <p>${lowStockProducts.length} products have stock at or below ${LOW_STOCK_THRESHOLD} units:</p>
            <pre style="background:#f5f5f5;padding:12px;border-radius:8px;">${itemsList}</pre>
            <p><a href="${process.env.ADMIN_URL}/products">View in Admin Dashboard →</a></p>
          </div>
        `,
      });

      console.log(`📦 Low-stock alert sent for ${lowStockProducts.length} products`);
    } catch (err) {
      console.error('❌ Low-stock alert cron failed:', err.message);
    }
  });
}
