import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { APP_CONFIG } from '../constants/config';
import { RADICAL_LOGO_SVG } from '../constants/logoSvg';
import { Order } from '../types';
import { normalizeExtraCharges } from './ordersApi';
import { parseDeliveryInfo } from '../utils/addressUtils';

/**
 * Formats a clean, safe filename for an order invoice: "customername-orderid.pdf"
 */
export const formatInvoiceFileName = (order: Order): string => {
  const rawCustomer = (order.name || 'Customer').trim();
  const rawOrderId = (order.order_id || order.id || 'Order').trim();

  const cleanCustomer = rawCustomer
    .replace(/[\/\\:*?"<>|]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

  const cleanOrderId = rawOrderId
    .replace(/[\/\\:*?"<>|]/g, '')
    .replace(/\s+/g, '-');

  return `${cleanCustomer}-${cleanOrderId}.pdf`;
};

export const invoiceService = {
  /**
   * Builds high quality printable HTML for an order invoice reflecting
   * official Radical Engineering branding (matching quotationPdf.ts).
   */
  buildInvoiceHtml(order: Order): string {
    let dateFormatted = '';
    try {
      dateFormatted = order.placed_at
        ? new Date(order.placed_at).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })
        : new Date().toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          });
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

    const totalItemsQty = rawItems.reduce(
      (sum: number, it: any) => sum + (Number(it.quantity) || 1),
      0
    );

    // Vector logo scaled for print
    const formattedLogoSvg = RADICAL_LOGO_SVG.replace(
      /<svg\s+width="1497"\s+height="259"/i,
      '<svg width="220" height="38" style="display: block; border-radius: 4px;"'
    );

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

              const metaParts: string[] = [];
              if (prod?.sku) metaParts.push(`SKU: ${prod.sku}`);
              if (prod?.weight) {
                const wStr = String(prod.weight).trim();
                const formattedW = /^[0-9]+(\.[0-9]+)?$/.test(wStr)
                  ? `${wStr} kg`
                  : wStr;
                metaParts.push(`Weight: ${formattedW}`);
              }
              const metaSub =
                metaParts.length > 0
                  ? `<div style="font-size: 10.5px; color: #6C5348; margin-top: 2px;">${metaParts.join(
                      ' | '
                    )}</div>`
                  : '';

              return `
              <tr style="background-color: ${index % 2 === 0 ? '#ffffff' : '#FAF7F5'};">
                <td style="padding: 10px 12px; border-bottom: 1px solid #E8DFD8; text-align: center; color: #6C5348; font-weight: 600;">
                  ${index + 1}
                </td>
                <td style="padding: 10px 12px; border-bottom: 1px solid #E8DFD8;">
                  <div style="font-weight: 700; color: #260B00; font-size: 12.5px;">${name}</div>
                  ${metaSub}
                </td>
                <td style="padding: 10px 12px; border-bottom: 1px solid #E8DFD8; text-align: right; color: #6C5348;">
                  ৳ ${isNaN(price) ? '0' : price.toLocaleString()}
                </td>
                <td style="padding: 10px 12px; border-bottom: 1px solid #E8DFD8; text-align: center; font-weight: 700; color: #3C1100;">
                  ${qty}
                </td>
                <td style="padding: 10px 12px; border-bottom: 1px solid #E8DFD8; text-align: right; font-weight: 800; color: #3C1100;">
                  ৳ ${isNaN(lineTotal) ? '0' : lineTotal.toLocaleString()}
                </td>
              </tr>
            `;
            })
            .join('')
        : `
          <tr style="background-color: #ffffff;">
            <td colspan="5" style="padding: 14px 12px; border-bottom: 1px solid #E8DFD8; text-align: center; color: #6C5348;">
              Standard Solar Order (#${order.order_id || order.id})
            </td>
          </tr>
        `;

    const extraCharges = normalizeExtraCharges(
      order.extra_charges,
      order.total,
      rawItems
    );

    const itemsSubtotal = rawItems.reduce((sum: number, it: any) => {
      const price = it.product?.discounted_price
        ? Number(it.product.discounted_price)
        : Number(it.product?.price || it.price || 0);
      return sum + (isNaN(price) ? 0 : price) * Number(it.quantity || 1);
    }, 0);

    const positiveExtra = extraCharges
      .filter((c: any) => Number(c.cost || 0) > 0)
      .reduce((sum: number, c: any) => sum + Number(c.cost || 0), 0);

    const negativeExtra = extraCharges
      .filter((c: any) => Number(c.cost || 0) < 0)
      .reduce((sum: number, c: any) => sum + Math.abs(Number(c.cost || 0)), 0);

    const extraChargesHtml = extraCharges
      .map((ch: any) => {
        const cost = Number(ch.cost || 0);
        const isDiscount = cost < 0;
        const absCost = Math.abs(cost);
        return `
        <tr style="background-color: ${isDiscount ? '#F0FDF4' : '#FFFDF9'};">
          <td style="padding: 10px 12px; border-bottom: 1px solid #E8DFD8; text-align: center; color: ${
            isDiscount ? '#059669' : '#D97706'
          }; font-weight: 800;">
            ${isDiscount ? '−' : '+'}
          </td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #E8DFD8;">
            <div style="font-weight: 700; color: ${
              isDiscount ? '#065F46' : '#92400E'
            }; font-size: 12px;">
              ${ch.name || (isDiscount ? 'Special Discount' : 'Extra Service / Charge')}
            </div>
            <div style="font-size: 10px; color: ${
              isDiscount ? '#059669' : '#B45309'
            }; margin-top: 1px;">
              ${isDiscount ? 'Adjustment / Deduction' : 'Adjustment / Extra Fee'}
            </div>
          </td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #E8DFD8; text-align: right; color: ${
            isDiscount ? '#065F46' : '#92400E'
          };">
            ${isDiscount ? '−' : ''}৳ ${isNaN(absCost) ? '0' : absCost.toLocaleString()}
          </td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #E8DFD8; text-align: center; font-weight: 700; color: ${
            isDiscount ? '#065F46' : '#92400E'
          };">
            1
          </td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #E8DFD8; text-align: right; font-weight: 800; color: ${
            isDiscount ? '#059669' : '#92400E'
          };">
            ${isDiscount ? '− ৳ ' : '+ ৳ '}${isNaN(absCost) ? '0' : absCost.toLocaleString()}
          </td>
        </tr>
      `;
      })
      .join('');

    const totalNumber = Number(order.total || 0);
    const statusLabel = (order.status || 'pending').toUpperCase();
    const deliveryInfo = parseDeliveryInfo(order.address);

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${formatInvoiceFileName(order).replace(/\.pdf$/i, '')}</title>
  <!-- Plus Jakarta Sans: Matches Radical Engineering brand typography -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    @page {
      size: A4;
      margin: 12mm 14mm 14mm 14mm;
    }
    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #260B00;
      background-color: #ffffff;
      margin: 0;
      padding: 0;
      font-size: 11.5px;
      line-height: 1.45;
    }
    .header-table {
      width: 100%;
      border-bottom: 3px solid #3C1100;
      padding-bottom: 14px;
      margin-bottom: 4px;
    }
    .header-gold-line {
      height: 3px;
      background-color: #FCB974;
      margin-bottom: 16px;
      border-radius: 2px;
    }
    .brand-logo-wrap {
      margin-bottom: 8px;
    }
    .brand-sub {
      font-size: 11px;
      font-weight: 700;
      color: #3C1100;
      letter-spacing: 0.3px;
      margin-top: 2px;
      margin-bottom: 6px;
    }
    .company-details {
      font-size: 10.5px;
      color: #523A30;
      line-height: 1.4;
    }
    .company-details strong {
      color: #3C1100;
    }
    .badge-doc {
      display: inline-block;
      background: #3C1100;
      color: #FCB974;
      border: 1.5px solid #FCB974;
      font-weight: 800;
      font-size: 11px;
      padding: 5px 12px;
      border-radius: 6px;
      letter-spacing: 0.6px;
      text-transform: uppercase;
      margin-bottom: 8px;
    }
    .meta-item {
      font-size: 11px;
      color: #523A30;
      margin-bottom: 3px;
    }
    .meta-item strong {
      color: #3C1100;
    }
    .status-badge {
      display: inline-block;
      background: #F5EBE6;
      color: #3C1100;
      border: 1px solid #FCB974;
      padding: 2px 7px;
      border-radius: 4px;
      font-weight: 800;
      font-size: 10.5px;
      text-transform: uppercase;
    }
    .summary-grid {
      display: table;
      width: 100%;
      margin-bottom: 16px;
    }
    .summary-col {
      display: table-cell;
      width: 25%;
      padding: 10px 12px;
      background: #FAF7F5;
      border: 1px solid #E8DFD8;
      border-right: none;
      box-sizing: border-box;
    }
    .summary-col:last-child {
      border-right: 1px solid #3C1100;
      background: #F5EBE6;
      border-color: #3C1100;
    }
    .summary-label {
      font-size: 9.5px;
      font-weight: 800;
      color: #6C5348;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      margin-bottom: 4px;
    }
    .summary-val {
      font-size: 13.5px;
      font-weight: 800;
      color: #260B00;
    }
    .summary-val.highlight {
      color: #3C1100;
      font-size: 15.5px;
    }
    .section-title {
      font-size: 12.5px;
      font-weight: 800;
      color: #3C1100;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-top: 14px;
      margin-bottom: 8px;
      border-left: 4px solid #FCB974;
      padding-left: 8px;
    }
    .customer-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 16px;
    }
    .data-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 14px;
      border: 1px solid #E8DFD8;
    }
    .data-table th {
      background-color: #3C1100;
      color: #F6F2ED;
      font-weight: 700;
      font-size: 10.5px;
      padding: 9px 12px;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      border-bottom: 2px solid #FCB974;
    }
    .store-banner {
      background: linear-gradient(135deg, #F5EBE6 0%, #FFF8F3 100%);
      border: 2px solid #3C1100;
      border-radius: 8px;
      padding: 14px 16px;
      margin-top: 14px;
      margin-bottom: 16px;
    }
    .store-banner-title {
      font-size: 13.5px;
      font-weight: 900;
      color: #3C1100;
      margin-bottom: 4px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .store-banner-desc {
      font-size: 11.5px;
      font-weight: 600;
      color: #523A30;
      line-height: 1.45;
      margin-bottom: 8px;
    }
    .store-meta-grid {
      display: table;
      width: 100%;
      border-top: 1px dashed #FCB974;
      padding-top: 6px;
    }
    .store-meta-col {
      display: table-cell;
      width: 50%;
      font-size: 10.5px;
      color: #3C1100;
    }
    .footer-table {
      width: 100%;
      margin-top: 18px;
      border-top: 1px solid #E8DFD8;
      padding-top: 12px;
      font-size: 10px;
      color: #6C5348;
    }
    .sign-box {
      text-align: right;
      padding-top: 28px;
    }
    .sign-line {
      display: inline-block;
      width: 180px;
      border-top: 1.5px solid #3C1100;
      text-align: center;
      font-weight: 700;
      color: #3C1100;
      font-size: 10.5px;
      padding-top: 4px;
    }
  </style>
</head>
<body>

  <!-- BRAND HEADER -->
  <table class="header-table">
    <tr>
      <td style="vertical-align: top; width: 62%;">
        <div class="brand-logo-wrap">
          ${formattedLogoSvg}
        </div>
        <div class="brand-sub">${APP_CONFIG.tagline}</div>
        <div class="company-details">
          <div><strong>Address:</strong> ${APP_CONFIG.address}</div>
          <div><strong>Hotlines:</strong> ${APP_CONFIG.hotline1} · ${APP_CONFIG.hotline2}</div>
          <div><strong>WhatsApp:</strong> ${APP_CONFIG.whatsappNumber} &nbsp;|&nbsp; <strong>Email:</strong> ${APP_CONFIG.email}</div>
          <div><strong>Website:</strong> radicalengineering.com.bd</div>
        </div>
      </td>
      <td style="vertical-align: top; width: 38%; text-align: right;">
        <div class="badge-doc">OFFICIAL ORDER INVOICE</div>
        <div class="meta-item"><strong>Invoice Ref:</strong> #${order.order_id || order.id}</div>
        <div class="meta-item"><strong>Date:</strong> ${dateFormatted}</div>
        ${
          deliveryInfo.fulfillmentLabel
            ? `
        <div class="meta-item">
          <strong>Fulfillment:</strong>
          <span class="status-badge" style="background: ${
            deliveryInfo.fulfillmentType === 'store_pickup'
              ? '#FFEDD5'
              : '#D1FAE5'
          }; color: ${
            deliveryInfo.fulfillmentType === 'store_pickup'
              ? '#9A3412'
              : '#065F46'
          }; border-color: ${
            deliveryInfo.fulfillmentType === 'store_pickup'
              ? '#FDBA74'
              : '#6EE7B7'
          };">${deliveryInfo.fulfillmentLabel.toUpperCase()}</span>
        </div>`
            : ''
        }
        <div class="meta-item">
          <strong>Order Status:</strong>
          <span class="status-badge">${statusLabel}</span>
        </div>
      </td>
    </tr>
  </table>
  <div class="header-gold-line"></div>

  <!-- TOP SUMMARY METRICS -->
  <div class="summary-grid">
    <div class="summary-col">
      <div class="summary-label">Order Ref</div>
      <div class="summary-val">#${order.order_id || order.id}</div>
    </div>
    <div class="summary-col">
      <div class="summary-label">Order Date</div>
      <div class="summary-val">${dateFormatted}</div>
    </div>
    <div class="summary-col">
      <div class="summary-label">Total Items</div>
      <div class="summary-val">${totalItemsQty} Pcs</div>
    </div>
    <div class="summary-col">
      <div class="summary-label">Payable Total</div>
      <div class="summary-val highlight">৳ ${totalNumber.toLocaleString()}</div>
    </div>
  </div>

  <!-- CUSTOMER & DELIVERY SITE -->
  <div class="section-title">Customer & Delivery Information</div>
  <table class="customer-table">
    <tr>
      <td style="width: 50%; vertical-align: top; padding: 10px 14px; background: #FAF7F5; border: 1px solid #E8DFD8; border-right: none;">
        <div class="summary-label">Bill To / Customer</div>
        <div style="font-size: 13.5px; font-weight: 800; color: #260B00;">${order.name || 'Valued Customer'}</div>
        <div style="font-size: 11.5px; color: #523A30; margin-top: 4px;">
          <strong>Phone:</strong> ${order.phone || 'N/A'}
        </div>
      </td>
      <td style="width: 50%; vertical-align: top; padding: 10px 14px; background: #FAF7F5; border: 1px solid #E8DFD8;">
        <div class="summary-label">
          ${deliveryInfo.fulfillmentType === 'store_pickup' ? 'Fulfillment & Collection Site' : 'Delivery & Installation Site'}
        </div>
        ${
          deliveryInfo.fulfillmentLabel
            ? `
        <div style="margin-bottom: 5px;">
          <span style="display: inline-block; background: ${
            deliveryInfo.fulfillmentType === 'store_pickup'
              ? '#3C1100'
              : '#065F46'
          }; color: ${
            deliveryInfo.fulfillmentType === 'store_pickup'
              ? '#FCB974'
              : '#FFFFFF'
          }; border: 1px solid ${
            deliveryInfo.fulfillmentType === 'store_pickup'
              ? '#FCB974'
              : '#047857'
          }; font-size: 10px; font-weight: 800; padding: 2px 8px; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.5px;">
            ${deliveryInfo.fulfillmentType === 'store_pickup' ? '🏬 STORE PICKUP' : '🚚 HOME DELIVERY'}
          </span>
        </div>`
            : ''
        }
        <div style="font-size: 12px; font-weight: 600; color: #3C1100; line-height: 1.45;">
          ${deliveryInfo.cleanAddress}
        </div>
        ${
          deliveryInfo.specialNotes.length > 0
            ? `
        <div style="margin-top: 6px; padding: 5px 8px; background: #FFFBEB; border: 1px solid #FDE68A; border-radius: 4px; font-size: 10.5px; color: #92400E; font-weight: 600; line-height: 1.4;">
          <strong>📝 Special Instructions:</strong> ${deliveryInfo.specialNotes.join(' • ')}
        </div>`
            : ''
        }
      </td>
    </tr>
  </table>

  <!-- SECTION: ORDERED PRODUCTS & CHARGES -->
  <div class="section-title">Ordered Products & Extra Services</div>
  <table class="data-table">
    <thead>
      <tr>
        <th style="width: 35px; text-align: center;">#</th>
        <th style="text-align: left;">Product / Service Description</th>
        <th style="width: 100px; text-align: right;">Unit Price</th>
        <th style="width: 50px; text-align: center;">Qty</th>
        <th style="width: 120px; text-align: right;">Total Price</th>
      </tr>
    </thead>
    <tbody>
      ${itemsHtml}
      ${extraChargesHtml}
    </tbody>
  </table>

  <!-- SUMMARY & FINANCIAL TOTALS -->
  <table style="width: 100%; border-collapse: collapse; margin-top: 4px; margin-bottom: 16px;">
    <tr>
      <td style="width: 52%; vertical-align: top; padding-right: 18px;">
        <div style="background: #FAF7F5; border: 1px solid #E8DFD8; border-left: 4px solid #3C1100; border-radius: 6px; padding: 12px 14px; font-size: 11px; color: #523A30;">
          <div style="font-weight: 800; color: #3C1100; margin-bottom: 5px; font-size: 11.5px; text-transform: uppercase; letter-spacing: 0.4px;">
            Official Guarantee & Warranty
          </div>
          <div style="margin-bottom: 3px;">• 100% brand-new, genuine components verified by Radical Engineering.</div>
          <div style="margin-bottom: 3px;">• Covered by official manufacturer brand warranty from delivery date.</div>
          <div>• Please retain this invoice for receiving priority warranty & after-sales support.</div>
        </div>
      </td>
      <td style="width: 48%; vertical-align: top;">
        <div style="background: #FAF7F5; border: 1.5px solid #E8DFD8; border-radius: 6px; padding: 12px 16px;">
          <table style="width: 100%; border-collapse: collapse; font-size: 11.5px;">
            <tr>
              <td style="padding: 4px 0; color: #6C5348; font-weight: 600;">Items Subtotal:</td>
              <td style="padding: 4px 0; text-align: right; font-weight: 700; color: #260B00;">
                ৳ ${itemsSubtotal.toLocaleString()}
              </td>
            </tr>
            ${
              positiveExtra > 0
                ? `
            <tr>
              <td style="padding: 4px 0; color: #92400E; font-weight: 600;">Extra Charges & Delivery:</td>
              <td style="padding: 4px 0; text-align: right; font-weight: 700; color: #92400E;">
                + ৳ ${positiveExtra.toLocaleString()}
              </td>
            </tr>`
                : ''
            }
            ${
              negativeExtra > 0
                ? `
            <tr>
              <td style="padding: 4px 0; color: #059669; font-weight: 600;">Special Discount:</td>
              <td style="padding: 4px 0; text-align: right; font-weight: 700; color: #059669;">
                − ৳ ${negativeExtra.toLocaleString()}
              </td>
            </tr>`
                : ''
            }
            <tr style="border-top: 2px solid #3C1100;">
              <td style="padding: 8px 0 2px 0; font-size: 13px; font-weight: 800; color: #3C1100; text-transform: uppercase;">
                Payable Grand Total:
              </td>
              <td style="padding: 8px 0 2px 0; text-align: right; font-size: 15.5px; font-weight: 900; color: #3C1100;">
                ৳ ${totalNumber.toLocaleString()}
              </td>
            </tr>
          </table>
        </div>
      </td>
    </tr>
  </table>

  <!-- STORE VISIT INVITATION BANNER -->
  <div class="store-banner">
    <div class="store-banner-title">Come at our store to choose the best for you!</div>
    <div class="store-banner-desc">
      We invite you to visit our official showroom and engineering center in Kishoreganj. Test live working demonstrations, compare different inverter & battery brands side-by-side, and consult with our certified renewable energy engineers to customize the most reliable and cost-effective system for your home or enterprise.
    </div>
    <div class="store-meta-grid">
      <div class="store-meta-col">
        <strong>📍 Store Location:</strong> 1400, Hazi Hasen Ali Market, Station Road (opposite Medilab), Kishoreganj
      </div>
      <div class="store-meta-col" style="text-align: right;">
        <strong>🕒 Visiting Hours:</strong> Saturday – Thursday: 9:00 AM – 8:00 PM<br>
        <strong>📞 Hotline & WhatsApp:</strong> ${APP_CONFIG.hotline1} / ${APP_CONFIG.hotline2}
      </div>
    </div>
  </div>

  <!-- FOOTER & SIGNATURE -->
  <table class="footer-table">
    <tr>
      <td style="vertical-align: top; width: 60%;">
        <div>• 100% genuine components backed by official brand warranties.</div>
        <div>• Thank you for choosing Radical Engineering! Authorized solar & power backup partner.</div>
        <div>• Generated via Radical Engineering System • radicalengineering.com.bd</div>
      </td>
      <td style="vertical-align: top; width: 40%; text-align: right;">
        <div class="sign-box">
          <div class="sign-line">Authorized Signatory<br>Radical Engineering</div>
        </div>
      </td>
    </tr>
  </table>

</body>
</html>
    `;
  },

  /**
   * Generates a PDF file with customername-orderid naming and returns its URI
   */
  async generatePdf(order: Order): Promise<string> {
    const html = this.buildInvoiceHtml(order);
    const fileName = formatInvoiceFileName(order);
    const { uri, base64 } = await Print.printToFileAsync({
      html,
      base64: true,
    });

    try {
      if (FileSystem.cacheDirectory) {
        const destPath = `${FileSystem.cacheDirectory}${fileName}`;
        if (base64) {
          await FileSystem.writeAsStringAsync(destPath, base64, {
            encoding: FileSystem.EncodingType.Base64,
          });
          return destPath;
        } else {
          await FileSystem.deleteAsync(destPath, { idempotent: true }).catch(() => {});
          await FileSystem.copyAsync({
            from: uri,
            to: destPath,
          });
          return destPath;
        }
      }
    } catch (writeErr) {
      console.warn('Could not write PDF with custom filename, using temp URI:', writeErr);
    }

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
   * Generates PDF with "customername-orderid.pdf" filename and opens the native OS Share dialog (WhatsApp, email, drive)
   * With automatic fallback to system Print / Save as PDF if direct file sharing is restricted (e.g. Expo Go sandbox)
   */
  async shareInvoice(order: Order): Promise<boolean> {
    const html = this.buildInvoiceHtml(order);
    const fileName = formatInvoiceFileName(order);
    const baseName = fileName.replace(/\.pdf$/i, '');

    // 1. Attempt native file sharing with named PDF (works on standalone APK / physical device)
    try {
      const isAvailable = await Sharing.isAvailableAsync().catch(() => false);
      if (isAvailable) {
        const { uri, base64 } = await Print.printToFileAsync({
          html,
          base64: true,
        });

        let targetUri = uri;
        try {
          if (FileSystem.cacheDirectory) {
            const destPath = `${FileSystem.cacheDirectory}${fileName}`;
            if (base64) {
              // Writing base64 directly into the scoped cache directory bypasses Expo Go's unreadable Print/ cache limitation
              await FileSystem.writeAsStringAsync(destPath, base64, {
                encoding: FileSystem.EncodingType.Base64,
              });
              targetUri = destPath;
            } else {
              await FileSystem.deleteAsync(destPath, { idempotent: true }).catch(() => {});
              await FileSystem.copyAsync({
                from: uri,
                to: destPath,
              });
              targetUri = destPath;
            }
          }
        } catch (fileErr) {
          console.warn('Could not write custom filename for sharing, using temp URI:', fileErr);
        }

        await Sharing.shareAsync(targetUri, {
          UTI: 'com.adobe.pdf',
          mimeType: 'application/pdf',
          dialogTitle: `${baseName}.pdf`,
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
