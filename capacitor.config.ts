import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.Temwise.dailyplanner',
  appName: 'Temwise Daily Planner',
  webDir: 'dist',
  server: {
    url: 'https://b29fefc5-ce5e-4160-9f39-c30ba0397ffa.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    }
  }
};

export default config;
