import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Configuration Expo dynamique.
 * Les variables EXPO_PUBLIC_* sont lues depuis .env (voir .env.example).
 */
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'UMETUM',
  slug: 'umetum',
  version: '0.1.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'umetum',
  userInterfaceStyle: 'automatic',
  ios: {
    bundleIdentifier: 'app.umetum',
    supportsTablet: true,
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    package: 'app.umetum',
    adaptiveIcon: {
      backgroundColor: '#1B2A4A',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    permissions: [
      'android.permission.CAMERA',
      'android.permission.RECORD_AUDIO',
      'android.permission.MODIFY_AUDIO_SETTINGS',
      'android.permission.BLUETOOTH_CONNECT',
    ],
    predictiveBackGestureEnabled: false,
  },
  web: {
    // "single" : l'app web est une SPA (la session Supabase vit dans le navigateur).
    output: 'single',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    [
      'expo-localization',
      { supportsRTL: true, supportedLocales: ['fr', 'en', 'he', 'yi', 'ru', 'es', 'pt', 'it', 'de'] },
    ],
    [
      'expo-splash-screen',
      {
        backgroundColor: '#1B2A4A',
        image: './assets/images/splash-icon.png',
        imageWidth: 96,
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission: 'UMETUM accède à vos photos pour choisir une photo de profil.',
        cameraPermission:
          'UMETUM utilise la caméra pour les cours en visioconférence et pour ta photo de profil.',
        microphonePermission: 'UMETUM utilise le micro pour les cours en visioconférence.',
      },
    ],
    '@livekit/react-native-expo-plugin',
    '@config-plugins/react-native-webrtc',
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    eas: {
      projectId: process.env.EAS_PROJECT_ID,
    },
  },
});
