import React, { createRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/contexts/AuthContext';
import ChatNotificationProvider from './src/contexts/ChatNotificationContext';
import AppNavigator from './src/navigation/AppNavigator';

// Create a navigation reference
export const navigationRef = createRef();

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
