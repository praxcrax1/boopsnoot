import React, { createRef, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/contexts/AuthContext';
import ChatNotificationProvider from './src/contexts/ChatNotificationContext';
import AppNavigator from './src/navigation/AppNavigator';
import * as WebBrowser from 'expo-web-browser';

// Create a navigation reference
export const navigationRef = createRef();

// Ensure auth session is properly initialized
WebBrowser.maybeCompleteAuthSession();

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ChatNotificationProvider>
          <StatusBar style="auto" />
          <AppNavigator />
        </ChatNotificationProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
