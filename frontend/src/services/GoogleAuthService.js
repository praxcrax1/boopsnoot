import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { GOOGLE_CLIENT_ID, GOOGLE_ANDROID_CLIENT_ID, API_URL } from '../constants/apiConfig';
// Register for the WebBrowser redirect
WebBrowser.maybeCompleteAuthSession();

// Configuration for Google Authentication
const googleConfig = {
  expoClientId: GOOGLE_CLIENT_ID,
  androidClientId: GOOGLE_ANDROID_CLIENT_ID,
  iosClientId: GOOGLE_CLIENT_ID,
  // iOS client ID would go here if you have one
  // iosClientId: GOOGLE_IOS_CLIENT_ID,
  // webClientId: GOOGLE_WEB_CLIENT_ID,
  scopes: ['profile', 'email']
};

// This hook must be used inside React components
export const useGoogleAuth = () => {
  // Using the Google auth hook properly inside a React component
  const [request, response, promptAsync] = Google.useAuthRequest(googleConfig);
  
  const signIn = async () => {
    try {
      console.log('Starting Google auth flow');
      console.log('Platform:', Platform.OS);
      console.log('Is standalone build:', Constants.executionEnvironment === 'standalone');
      
      // Start the auth flow
      const result = await promptAsync();
      console.log('Auth result type:', result.type);
      
      if (result.type === 'success') {
        // Get the access token from the response
        const { authentication } = result;
        const accessToken = authentication.accessToken;
        
        console.log('Successfully obtained Google access token');
        
        // Send the token to your backend for verification and user creation/login
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
        
        // Store the JWT token from our backend
        const token = data.token;
        await AsyncStorage.setItem('token', token);
        console.log('Successfully authenticated with backend');
        
        return { success: true, token };
      } else {
        console.warn('Google sign in was not successful:', result.type);
        return { 
          success: false, 
          error: 'Google sign in was cancelled or failed',
          details: result 
        };
      }
    } catch (error) {
      console.error('Google auth error:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to authenticate with Google' 
      };
    }
  };
  
  return {
    request,
    response,
    signIn
  };
};

// This is a singleton class for non-hook based access
// It will need to be used alongside components that use the hooks
class GoogleAuthService {
  // For any methods that don't need hooks
  async processTokenResponse(accessToken) {
    try {
      // Send the token to your backend for verification and user creation/login
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
      
      // Store the JWT token from our backend
      const token = data.token;
      await AsyncStorage.setItem('token', token);
      console.log('Successfully authenticated with backend');
      
      return { success: true, token };
    } catch (error) {
      console.error('Backend verification error:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to verify with backend' 
      };
    }
  }
}

export default new GoogleAuthService();