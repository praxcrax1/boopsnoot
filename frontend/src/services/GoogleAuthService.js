import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { 
  GOOGLE_CLIENT_ID, 
  GOOGLE_ANDROID_CLIENT_ID, 
  GOOGLE_REDIRECT_URI,
  GOOGLE_ANDROID_REDIRECT_URI 
} from '../constants/apiConfig';

// Register for the AuthSession redirect
WebBrowser.maybeCompleteAuthSession();

// Determine if we're running in a production environment
const isProduction = !__DEV__;

// Generate and log our effective redirect URI for debugging
const effectiveRedirectUri = Platform.OS === 'android'
    ? GOOGLE_ANDROID_REDIRECT_URI
    : GOOGLE_REDIRECT_URI;

console.log('Auth Session redirect URL:', effectiveRedirectUri);
console.log('Environment:', isProduction ? 'Production' : 'Development');
console.log('Expo Constants.appOwnership:', Constants.appOwnership || 'Not available');
console.log('App manifest name:', Constants.manifest?.name || 'Not available');

// Google OAuth configuration
const googleAuthDiscovery = {
    authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenEndpoint: 'https://oauth2.googleapis.com/token',
};

class GoogleAuthService {
    async signInWithGoogle() {
        try {
            // Select platform-specific configuration
            const clientId = Platform.OS === 'android' 
                ? GOOGLE_ANDROID_CLIENT_ID 
                : GOOGLE_CLIENT_ID;
            
            // Determine the correct redirect URI based on platform and environment
            let redirectUri;
            
            if (Platform.OS === 'android') {
                // For Android, use the Expo proxy URL in production builds
                redirectUri = GOOGLE_ANDROID_REDIRECT_URI;
            } else {
                // For other platforms, use the default redirect URI
                redirectUri = GOOGLE_REDIRECT_URI;
            }
            
            console.log(`Using clientId: ${clientId}`);
            console.log(`Using redirectUri: ${redirectUri}`);
            
            const scopes = ['profile', 'email'];

            // Create and load the request
            const request = new AuthSession.AuthRequest({
                clientId,
                scopes,
                redirectUri,
                usePKCE: false,
                responseType: 'token',
            });

            const result = await request.promptAsync(googleAuthDiscovery);
            console.log('Auth result type:', result.type);
            
            if (result.type === 'success') {
                // Extract the access token from the response
                const { access_token } = result.params;
                console.log('Successfully obtained access token');
                return { success: true, accessToken: access_token };
            } else {
                console.warn('Google sign in was not successful:', result.type);
                // User cancelled or auth failed
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
    }
}

export default new GoogleAuthService();