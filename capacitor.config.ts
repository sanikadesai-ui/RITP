import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.kaizen.coordinator',
  appName: 'Kaizen Coordinator',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
