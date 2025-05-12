import React, { useEffect } from 'react';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { API_URL, GOOGLE_ANDROID_CLIENT_ID, GOOGLE_CLIENT_ID } from '../constants/apiConfig';

// Register for the WebBrowser redirect
WebBrowser.maybeCompleteAuthSession();

// Auth token storage key
const AUTH_TOKEN_KEY = 'authToken';

/**
 * Hook for Google authentication
 * This provides a simplified interface for Google OAuth authentication
 * that works in both development and production environments
 */
export const useGoogleAuth = () => {
  // Google authentication configuration from environment variables
  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: GOOGLE_ANDROID_CLIENT_ID,
    iosClientId: GOOGLE_ANDROID_CLIENT_ID,
    expoClientId: GOOGLE_CLIENT_ID,
    webClientId: GOOGLE_CLIENT_ID,
    scopes: ['profile', 'email']
  });

  // Warm up the browser to improve UX
  useEffect(() => {
    WebBrowser.warmUpAsync();
    return () => {
      WebBrowser.coolDownAsync();
    };
  }, []);

  /**
   * Initiates Google Sign-In flow
   */
  const signIn = async () => {
    try {
      console.log('Starting Google authentication flow');
      
      // Start OAuth flow
      const result = await promptAsync();
      
      if (result.type !== 'success') {
        console.warn('Google sign in was not successful:', result.type);
        return {
          success: false,
          error: 'Authentication was cancelled or failed'
        };
      }

      // Get authentication token
      const { authentication } = result;
      const accessToken = authentication.accessToken;
      
      console.log('Successfully obtained Google access token');
      
      // Exchange Google token for our app token via backend
      const backendResponse = await fetch(`${API_URL}/auth/google/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ accessToken }),
      });

      const data = await backendResponse.json();

      if (!backendResponse.ok) {
        console.error('Backend verification failed:', data);
        return {
          success: false,
          error: data.message || 'Failed to verify with backend'
        };
      }

      // Store the JWT token securely
      const token = data.token;
      if (!token) {
        console.error('No token received from backend');
        return {
          success: false,
          error: 'No authentication token received from server'
        };
      }

      // Store token securely on native platforms, or in AsyncStorage on web
      if (Platform.OS !== 'web') {
        await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token);
      } else {
        await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
      }
      
      // Also store in AsyncStorage for compatibility with existing code
      await AsyncStorage.setItem('token', token);
      
      console.log('Successfully authenticated with backend and stored token');
      return { success: true, token };
    } catch (error) {
      console.error('Google authentication error:', error);
      return {
        success: false,
        error: error.message || 'Failed to authenticate with Google'
      };
    }
  };

  return {
    request,
    response,
    signIn,
    isLoading: !request
  };
};

// For backward compatibility
export default { processTokenResponse: () => console.warn('Using deprecated GoogleAuthService class') };