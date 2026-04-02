import type { CapacitorConfig } from "@capacitor/cli";
import { KeyboardResize } from "@capacitor/keyboard";

const remoteServerUrl = process.env.CAPACITOR_SERVER_URL || "https://www.kakoei.com";

const config: CapacitorConfig = {
  appId: "com.kakoei.chat",
  appName: "Kakoei",
  webDir: "public",
  server: {
    url: remoteServerUrl,
    cleartext: true,
    errorPath: "native-offline.html",
    allowNavigation: [
      "www.kakoei.com",
      "kakoei.com",
      "*.kakoei.com",
      "localhost",
      "10.0.2.2",
    ],
  },
  android: {
    allowMixedContent: true,
    backgroundColor: "#111111",
  },
  ios: {
    backgroundColor: "#111111",
    contentInset: "always",
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 1500,
      backgroundColor: "#111111",
      showSpinner: false,
    },
    Keyboard: {
      resize: KeyboardResize.Body,
      resizeOnFullScreen: true,
    },
  },
};

export default config;
