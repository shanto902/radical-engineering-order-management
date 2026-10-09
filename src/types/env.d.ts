declare global {
  namespace NodeJS {
    interface ProcessEnv {
      EXPO_PUBLIC_SITE_URL?: string;
      EXPO_PUBLIC_API_URL?: string;
      EXPO_PUBLIC_ASSETS_URL?: string;
    }
  }
}

export {};

