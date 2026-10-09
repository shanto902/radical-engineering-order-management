import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { APP_CONFIG } from '../constants/config';
import { Order } from '../types';

export const invoiceService = {
  /**
   * Builds high quality printable HTML for an order invoice
   */
  buildInvoiceHtml(order: Order): string {
    let dateFormatted = '';
    try {
      dateFormatted = order.placed_at
        ? new Date(order.placed_at).toLocaleString('en-US', {
            dateStyle: 'medium',
            timeStyle: 'short',
          })
        : new Date().toLocaleDateString('en-US');
    } catch {
      dateFormatted = String(order.placed_at || '');
    }

    let rawItems: any[] = [];
    if (Array.isArray(order.order_items)) {
      rawItems = order.order_items;
    } else if (
      typeof order.order_items === 'string' &&
      (order.order_items as string).trim()
    ) {
      try {
        rawItems = JSON.parse(order.order_items);
      } catch {
        rawItems = [];
      }
    }

    const itemsHtml =
      rawItems.length > 0
        ? rawItems
            .map((item: any, index: number) => {
              const prod =
                typeof item.product === 'object' && item.product
                  ? item.product
                  : {};
              const name = prod?.name || item.name || 'Solar / Electrical Item';
              const price = prod?.discounted_price
                ? Number(prod.discounted_price)
                : Number(prod?.price || item.price || 0);
              const qty = Number(item.quantity || 1);
              const lineTotal = price * qty;

              return `
              <tr style="border-bottom: 1px solid #E2E8F0;">
                <td style="padding: 10px 12px; text-align: center; color: #64748B;">${index + 1}</td>
                <td style="padding: 10px 12px; font-weight: 600; color: #0F172A;">${name}</td>
                <td style="padding: 10px 12px; text-align: right; color: #334155;">৳${isNaN(price) ? '0' : price.toLocaleString()}</td>
                <td style="padding: 10px 12px; text-align: center; font-weight: 600; color: #0F172A;">${qty}</td>
                <td style="padding: 10px 12px; text-align: right; font-weight: 700; color: #3C1100;">৳${isNaN(lineTotal) ? '0' : lineTotal.toLocaleString()}</td>
              </tr>
            `;
            })
            .join('')
        : `
          <tr style="border-bottom: 1px solid #E2E8F0;">
            <td colspan="5" style="padding: 14px 12px; text-align: center; color: #64748B;">Standard Solar Order (${order.order_id || order.id})</td>
          </tr>
        `;

    let rawExtraCharges: any[] = [];
    if (Array.isArray(order.extra_charges)) {
      rawExtraCharges = order.extra_charges;
    } else if (
      typeof order.extra_charges === 'string' &&
      (order.extra_charges as string).trim()
    ) {
      try {
        rawExtraCharges = JSON.parse(order.extra_charges);
      } catch {
        rawExtraCharges = [];
      }
    }

    const extraChargesHtml = rawExtraCharges
      .map((ch: any) => {
        const cost = Number(ch.cost || 0);
        return `
        <tr style="border-bottom: 1px solid #E2E8F0; background: #FFFBEB;">
          <td style="padding: 10px 12px; text-align: center; color: #D97706;">+</td>
          <td style="padding: 10px 12px; color: #92400E; font-weight: 500;">${ch.name || 'Extra Service'} (Service / Delivery)</td>
          <td style="padding: 10px 12px; text-align: right; color: #92400E;">৳${isNaN(cost) ? '0' : cost.toLocaleString()}</td>
          <td style="padding: 10px 12px; text-align: center; color: #92400E;">1</td>
          <td style="padding: 10px 12px; text-align: right; font-weight: 700; color: #92400E;">৳${isNaN(cost) ? '0' : cost.toLocaleString()}</td>
        </tr>
      `;
      })
      .join('');

    const totalNumber = Number(order.total || 0);

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
          <style>
            * { box-sizing: border-box; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
              color: #0F172A;
              margin: 0;
              padding: 24px;
              background-color: #FFFFFF;
              font-size: 13px;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              border-bottom: 3px solid #3C1100;
              padding-bottom: 16px;
            }
            .brand-title {
              font-size: 22px;
              font-weight: 800;
              color: #3C1100;
              letter-spacing: 0.5px;
              margin: 0;
            }
            .brand-sub {
              font-size: 11px;
              color: #64748B;
              margin: 4px 0 0 0;
            }
            .company-info {
              margin-top: 8px;
              font-size: 11px;
              color: #334155;
              line-height: 1.4;
            }
            .invoice-tag {
              text-align: right;
            }
            .invoice-badge {
              display: inline-block;
              background: #3C1100;
              color: #FCB974;
              font-size: 14px;
              font-weight: 800;
              padding: 6px 14px;
              border-radius: 6px;
              letter-spacing: 1px;
            }
            .order-meta {
              margin-top: 8px;
              font-size: 12px;
              color: #334155;
            }
            .customer-card {
              margin: 20px 0;
              padding: 14px;
              background-color: #F8FAFC;
              border: 1px solid #E2E8F0;
              border-radius: 8px;
              display: flex;
              justify-content: space-between;
            }
            .customer-col {
              width: 48%;
            }
            .section-label {
              font-size: 10px;
              text-transform: uppercase;
              font-weight: 700;
              color: #64748B;
              letter-spacing: 0.5px;
              margin-bottom: 6px;
            }
            .customer-val {
              font-size: 13px;
              font-weight: 600;
              color: #0F172A;
              margin: 2px 0;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 16px;
            }
            th {
              background-color: #3C1100;
              color: #FFFFFF;
              padding: 10px 12px;
              font-size: 11px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .total-section {
              margin-top: 24px;
              display: flex;
              justify-content: flex-end;
            }
            .total-box {
              width: 280px;
              background: #F8FAFC;
              border: 1px solid #E2E8F0;
              border-radius: 8px;
              padding: 12px 16px;
            }
            .total-row {
              display: flex;
              justify-content: space-between;
              padding: 4px 0;
              font-size: 12px;
              color: #475569;
            }
            .total-grand {
              display: flex;
              justify-content: space-between;
              padding-top: 8px;
              margin-top: 6px;
              border-top: 2px solid #3C1100;
              font-size: 16px;
              font-weight: 800;
              color: #3C1100;
            }
            .footer {
              margin-top: 40px;
              padding-top: 16px;
              border-top: 1px dashed #CBD5E1;
              text-align: center;
              font-size: 11px;
              color: #64748B;
              line-height: 1.5;
            }
            .status-stamp {
              display: inline-block;
              padding: 3px 10px;
              border-radius: 9999px;
              font-size: 11px;
              font-weight: 700;
              text-transform: uppercase;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1 class="brand-title">RADICAL ENGINEERING</h1>
              <p class="brand-sub">Powering Trusted Solar & Battery Solutions</p>
              <div class="company-info">
                <div>📍 1400, Hazi Hasen Ali Market, Station Road, Kishoreganj</div>
                <div>📞 Hotline: +880 1760195100 | +880 1787224460</div>
                <div>🌐 radicalengineering.com.bd</div>
              </div>
            </div>
            <div class="invoice-tag">
              <div class="invoice-badge">INVOICE</div>
              <div class="order-meta">
                <div><strong>Order ID:</strong> #${order.order_id || order.id}</div>
                <div><strong>Date:</strong> ${dateFormatted}</div>
                <div style="margin-top: 4px;">
                  <strong>Status:</strong>
                  <span class="status-stamp" style="background:#FEF3C7; color:#B45309;">${order.status.toUpperCase()}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="customer-card">
            <div class="customer-col">
              <div class="section-label">Bill To / Customer</div>
              <div class="customer-val">${order.name || 'Valued Customer'}</div>
              <div style="color: #475569; margin: 3px 0;">📞 ${order.phone}</div>
            </div>
            <div class="customer-col">
              <div class="section-label">Delivery & Installation Site</div>
              <div style="color: #334155; line-height: 1.4;">${order.address || 'Standard Delivery'}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 40px; text-align: center;">#</th>
                <th style="text-align: left;">Product Description</th>
                <th style="width: 90px; text-align: right;">Unit Price</th>
                <th style="width: 50px; text-align: center;">Qty</th>
                <th style="width: 100px; text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
              ${extraChargesHtml}
            </tbody>
          </table>

          <div class="total-section">
            <div class="total-box">
              <div class="total-row">
                <span>Items Subtotal:</span>
                <span>৳${totalNumber.toLocaleString()}</span>
              </div>
              <div class="total-grand">
                <span>Grand Total:</span>
                <span>৳${totalNumber.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div class="footer">
            <p>Thank you for choosing <strong>Radical Engineering</strong>! Authorized solar partner across Kishoreganj & Bangladesh.</p>
            <p>For technical support or warranty inquiry, contact our helpline at <strong>+880 1760195100</strong>.</p>
          </div>
        </body>
      </html>
    `;
  },

  /**
   * Generates a PDF file and returns its URI
   */
  async generatePdf(order: Order): Promise<string> {
    const html = this.buildInvoiceHtml(order);
    const { uri } = await Print.printToFileAsync({
      html,
      base64: false,
    });
    return uri;
  },

  /**
   * Directly prints to wireless or connected printer
   */
  async printDirect(order: Order): Promise<void> {
    const html = this.buildInvoiceHtml(order);
    await Print.printAsync({ html });
  },

  /**
   * Generates PDF and opens the native OS Share dialog (WhatsApp, email, drive)
   * With automatic fallback to system Print / Save as PDF if direct file sharing is restricted (e.g. Expo Go sandbox)
   */
  async shareInvoice(order: Order): Promise<boolean> {
    const html = this.buildInvoiceHtml(order);

    // 1. Attempt native file sharing (works on standalone APK build)
    try {
      const isAvailable = await Sharing.isAvailableAsync().catch(() => false);
      if (isAvailable) {
        const { uri } = await Print.printToFileAsync({
          html,
          base64: false,
        });

        await Sharing.shareAsync(uri, {
          UTI: 'com.adobe.pdf',
          mimeType: 'application/pdf',
          dialogTitle: `Radical Engineering Invoice #${order.order_id || order.id}`,
        });
        return true;
      }
    } catch (shareErr: any) {
      // In Expo Go, scoped sandbox restricts sharing Print cache files directly,
      // so it seamlessly opens the system Print / Save as PDF viewer.
      // In the built APK, direct file sharing works natively.
      console.log(
        '[Invoice] Direct sharing restricted in Expo Go, opening system Print / Save as PDF.'
      );
    }

    // 2. Reliable Fallback: Open system Print / Save as PDF preview dialog
    try {
      await Print.printAsync({ html });
      return true;
    } catch (printErr: any) {
      console.error('Print preview fallback failed:', printErr);
      throw new Error(
        printErr?.message || 'Could not open invoice preview on this device'
      );
    }
  },
};

