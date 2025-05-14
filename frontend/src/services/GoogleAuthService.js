import React, { useEffect, useState } from 'react';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { API_URL, GOOGLE_ANDROID_CLIENT_ID, GOOGLE_CLIENT_ID } from '../constants/apiConfig';
import * as AuthSession from 'expo-auth-session';

// Register for the WebBrowser redirect
WebBrowser.maybeCompleteAuthSession();

/**
 * Hook for Google authentication
 * This provides a simplified interface for Google OAuth authentication
 * that works in both development and production environments
 */
export const useGoogleAuth = () => {
  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: GOOGLE_ANDROID_CLIENT_ID,
    iosClientId: GOOGLE_ANDROID_CLIENT_ID,
    expoClientId: GOOGLE_CLIENT_ID,
    webClientId: GOOGLE_CLIENT_ID,
    scopes: ['profile', 'email'],
    redirectUri: AuthSession.makeRedirectUri({
      useProxy: false,
    }),
  });

  const [authResult, setAuthResult] = useState(null);

  // Warm up the browser to improve UX
  useEffect(() => {
    WebBrowser.warmUpAsync();
    return () => {
      WebBrowser.coolDownAsync();
    };
  }, []);

  // Handle the authentication response
  useEffect(() => {
    const handleAuthResponse = async () => {
      if (response?.type === 'success') {
        const { authentication } = response;
        if (!authentication || !authentication.accessToken) {
          console.error('Authentication object is null or missing accessToken');
          return;
        }

        const accessToken = authentication.accessToken;

        try {
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
            return;
          }

          const token = data.token;
          if (!token) {
            console.error('No token received from backend');
            return;
          }
          // Also store in AsyncStorage for compatibility with existing code
          await AsyncStorage.setItem('token', token);

          setAuthResult({ success: true, token });
        } catch (error) {
          console.error('Error during backend token exchange:', error);
        }
      } else if (response?.type === 'error') {
        console.error('Authentication error:', response.error);
      }
    };

    handleAuthResponse();
  }, [response]);

  /**
   * Initiates Google Sign-In flow
   */
  const signIn = async () => {
    try {
      console.log('Starting Google authentication flow');

      // Start OAuth flow
      await promptAsync();

      // The response will be handled in the useEffect above
      return { success: true };
    } catch (error) {
      console.error('Google authentication error:', error);
      return {
        success: false,
        error: error.message || 'Failed to authenticate with Google',
      };
    }
  };

  return {
    request,
    response,
    signIn,
    authResult,
    isLoading: !request,
  };
};

// For backward compatibility
export default { processTokenResponse: () => console.warn('Using deprecated GoogleAuthService class') };
