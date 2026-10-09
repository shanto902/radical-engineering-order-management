const rawApiUrl =
  process.env.EXPO_PUBLIC_API_URL || 'https://admin.atiar.com.bd';

const apiBaseUrl = rawApiUrl.replace(/\/+$/, '');

const rawAssetsUrl =
  process.env.EXPO_PUBLIC_ASSETS_URL || `${apiBaseUrl}/assets`;

const assetsBaseUrl = rawAssetsUrl.replace(/\/+$/, '');

const accessToken =
  process.env.EXPO_PUBLIC_ACCESS_TOKEN || 'tlaoVoH-cJOVcNpAadhVFGQzHmAO3W5y';

export const APP_CONFIG = {
  companyName: 'Radical Engineering',
  tagline: 'Solar & Power Backup Solutions',
  siteUrl:
    process.env.EXPO_PUBLIC_SITE_URL || 'https://radicalengineering.com.bd',
  apiBaseUrl,
  assetsBaseUrl,
  accessToken,
  hotline1: '+880 1760195100',
  hotline1Raw: '+8801760195100',
  hotline2: '+880 1787224460',
  hotline2Raw: '+8801787224460',
  whatsappNumber: '+8801760195100',
  email: 'radicalengineeringbd@gmail.com',
  address:
    '1400, Hazi Hasen Ali Market, Station Road (opposite Medilab), Kishoreganj, Bangladesh',
  currency: '৳',
  currencyCode: 'BDT',
  // Order polling frequency in ms (active)
  orderPollIntervalMs: 25000,
};
