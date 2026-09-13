import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.4c7b60ff529c48ac8a6541dd2172220d',
  appName: 'Edunova',
  webDir: 'dist',
  backgroundColor: '#0C0E14',
  server: {
    url: 'https://aksmsb.lovable.app',
    cleartext: true,
  },
  android: {
    backgroundColor: '#0C0E14',
    allowMixedContent: true,
  },
};

export default config;
