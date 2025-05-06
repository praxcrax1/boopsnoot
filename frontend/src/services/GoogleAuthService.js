import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { GOOGLE_CLIENT_ID, GOOGLE_ANDROID_CLIENT_ID, API_URL } from '../constants/apiConfig';

// Register for the WebBrowser redirect
WebBrowser.maybeCompleteAuthSession();

class GoogleAuthService {
  constructor() {
    // Initialize Google auth request
    const [request, response, promptAsync] = Google.useAuthRequest({
      expoClientId: GOOGLE_CLIENT_ID,
      androidClientId: GOOGLE_ANDROID_CLIENT_ID,
      // iOS client ID would go here if you have one
      // iosClientId: GOOGLE_IOS_CLIENT_ID,
      // Web client ID if you support web
      // webClientId: GOOGLE_WEB_CLIENT_ID,
      scopes: ['profile', 'email'],
    });
    
    this.request = request;
    this.response = response;
    this.promptAsync = promptAsync;
  }

  async signInWithGoogle() {
    try {
      // This is a class method but we're using React hooks in the constructor
      // So we need to create a new instance each time this method is called
      const [request, _, promptAsync] = Google.useAuthRequest({
        expoClientId: GOOGLE_CLIENT_ID,
        androidClientId: GOOGLE_ANDROID_CLIENT_ID,
        // iOS client ID would go here if you have one
        // iosClientId: GOOGLE_IOS_CLIENT_ID,
        scopes: ['profile', 'email'],
      });

      console.log('Starting Google auth flow');
      console.log('Platform:', Platform.OS);
      console.log('Is standalone build:', Constants.executionEnvironment === 'standalone');
      
      // Start the auth flow
      const response = await promptAsync();
      console.log('Auth result type:', response.type);
      
      if (response.type === 'success') {
        // Get the access token from the response
        const { authentication } = response;
        const accessToken = authentication.accessToken;
        
        console.log('Successfully obtained Google access token');
        
        // Send the token to your backend for verification and user creation/login
        const backendResponse = await fetch(`${API_URL}/auth/google-token`, {
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
        
        // Store the JWT token from our backend
        const token = data.token;
        await AsyncStorage.setItem('token', token);
        console.log('Successfully authenticated with backend');
        
        return { success: true, token };
      } else {
        console.warn('Google sign in was not successful:', response.type);
        return { 
          success: false, 
          error: 'Google sign in was cancelled or failed',
          details: response 
        };
      }
    } catch (error) {
      console.error('Google auth error:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to authenticate with Google' 
      };
    }
  }
}

export default new GoogleAuthService();