import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.actionanand.arflix.app',
  appName: 'ARFlix',
  webDir: 'dist/arflix/browser',
  server: {
    androidScheme: 'https',
  },
  android: {
    backgroundColor: '#07080c',
  },
};

export default config;
