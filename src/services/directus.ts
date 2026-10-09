import { createDirectus, rest, staticToken } from '@directus/sdk';
import { APP_CONFIG } from '../constants/config';

export const directus = createDirectus(APP_CONFIG.apiBaseUrl)
  .with(staticToken(APP_CONFIG.accessToken))
  .with(rest());
