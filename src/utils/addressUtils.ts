/**
 * Utilities for parsing delivery addresses and extracting fulfillment methods
 * (e.g. Store Pickup, Home Delivery) and special notes/instructions.
 */

export interface ParsedDeliveryInfo {
  rawAddress: string;
  cleanAddress: string;
  fulfillmentType: 'store_pickup' | 'home_delivery' | null;
  fulfillmentLabel: string | null; // e.g. "Store Pickup" | "Home Delivery"
  specialNotes: string[];
}

/**
 * Parses raw address strings that may contain special fulfillment indicators like:
 * "[Special Notes: [Fullfillment: Store Pickup]]" or "[Special Note: [Fullfilment: Home Delivery]]"
 * along with optional customer address text and extra delivery instructions.
 */
export function parseDeliveryInfo(raw?: string | null): ParsedDeliveryInfo {
  if (!raw || typeof raw !== 'string') {
    return {
      rawAddress: '',
      cleanAddress: 'Standard Delivery',
      fulfillmentType: null,
      fulfillmentLabel: null,
      specialNotes: [],
    };
  }

  const rawTrimmed = raw.trim();
  let text = rawTrimmed;
  let fulfillmentType: 'store_pickup' | 'home_delivery' | null = null;
  let fulfillmentLabel: string | null = null;
  const specialNotes: string[] = [];

  // Detect fulfillment type anywhere in text
  if (/store\s*pickup/i.test(text)) {
    fulfillmentType = 'store_pickup';
    fulfillmentLabel = 'Store Pickup';
  } else if (/home\s*delivery/i.test(text)) {
    fulfillmentType = 'home_delivery';
    fulfillmentLabel = 'Home Delivery';
  }

  // 1. Remove double-nested brackets e.g. [Special Notes?: [...]]
  text = text.replace(
    /\[\s*Special\s*Notes?\s*:\s*\[\s*([^\]]+)\s*\]\s*\]/gi,
    (_match, inner) => {
      const trimmed = (inner || '').trim();
      const cleanInner = trimmed.replace(/^fullfill?ment\s*:\s*/i, '').trim();
      if (
        !/store\s*pickup/i.test(cleanInner) &&
        !/home\s*delivery/i.test(cleanInner) &&
        cleanInner
      ) {
        specialNotes.push(cleanInner);
      }
      return '';
    }
  );

  // 2. Remove single-bracket special notes e.g. [Special Notes?: ...]
  text = text.replace(
    /\[\s*Special\s*Notes?\s*:\s*([^\]]+)\s*\]/gi,
    (_match, inner) => {
      const trimmed = (inner || '').trim();
      const cleanInner = trimmed.replace(/^fullfill?ment\s*:\s*/i, '').trim();
      if (
        !/store\s*pickup/i.test(cleanInner) &&
        !/home\s*delivery/i.test(cleanInner) &&
        cleanInner
      ) {
        specialNotes.push(cleanInner);
      }
      return '';
    }
  );

  // 3. Remove standalone fulfillment brackets e.g. [Fullfillment: Store Pickup]
  text = text.replace(/\[\s*Fullfill?ment\s*:\s*([^\]]+)\s*\]/gi, '');

  // 4. Strip redundant remaining standalone phrases if the whole text was just "Store Pickup" or "Home Delivery"
  let clean = text
    .replace(/^[\s,;:\-–—\n\r]+/, '')
    .replace(/[\s,;:\-–—\n\r]+$/, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (/^(store\s*pickup|home\s*delivery)$/i.test(clean)) {
    clean = '';
  }

  if (!clean) {
    if (fulfillmentType === 'store_pickup') {
      clean = 'Showroom Collection (Radical Engineering Showroom, Kishoreganj)';
    } else if (fulfillmentType === 'home_delivery') {
      clean = 'Home Delivery (Customer Address)';
    } else {
      clean = 'Standard Delivery';
    }
  }

  return {
    rawAddress: rawTrimmed,
    cleanAddress: clean,
    fulfillmentType,
    fulfillmentLabel,
    specialNotes,
  };
}

