import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.kakoei.chat',
  appName: 'Kakoei',
  // Server mode: point to the deployed production URL
  // Capacitor WebView loads this URL directly (required for Next.js API routes)
  server: {
    url: process.env.CAPACITOR_SERVER_URL || 'https://www.kakoei.com',
    cleartext: true, // Allow HTTP for local development
  },
  android: {
    allowMixedContent: true,
    backgroundColor: '#111111',
  },
  ios: {
    backgroundColor: '#111111',
    contentInset: 'always',
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 1500,
      backgroundColor: '#111111',
      showSpinner: false,
    },
  },
};

export default config;
