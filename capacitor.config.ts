import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.kaizen.staff',
  appName: 'Kaizen Staff',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
