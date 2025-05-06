import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { API_URL, GOOGLE_CLIENT_ID, GOOGLE_ANDROID_CLIENT_ID } from '../constants/apiConfig';

// Register for the WebBrowser redirect
WebBrowser.maybeCompleteAuthSession();

// Get the app's URL scheme from manifest
const appScheme = Constants.manifest?.scheme || 'boopsnoot';

// Determine if we're running in a standalone app (production build) vs Expo Go
const isStandalone = Constants.executionEnvironment === "standalone";

// Create URL that the backend can redirect to after successful auth
const createRedirectUrl = () => {
    if (Platform.OS === 'web') {
        return window.location.origin;
    }
    
    // For standalone apps (APK/IPA), use the direct app scheme
    if (isStandalone) {
        return `${appScheme}://auth/google-callback`;
    }
    
    // For Expo Go, use the expo-auth-session proxy
    const redirectUrl = Linking.createURL('auth/google-callback', {
        // Use preferredScheme to specify the scheme
        preferredScheme: appScheme,
    });
    
    console.log('Created redirect URL:', redirectUrl);
    return redirectUrl;
};

class GoogleAuthService {
    async signInWithGoogle() {
        try {
            // Get the redirect URL for our app
            const redirectUrl = createRedirectUrl();
            console.log('Using redirect URL:', redirectUrl);
            console.log('Is standalone build:', isStandalone);
            console.log('Platform:', Platform.OS);
            
            // Create a URL for our backend's Google OAuth endpoint
            const authUrl = `${API_URL}/auth/google?redirect_url=${encodeURIComponent(redirectUrl)}`;
            console.log('Starting OAuth flow with backend URL:', authUrl);
            
            // Open the auth URL in a browser
            const result = await WebBrowser.openAuthSessionAsync(
                authUrl,
                redirectUrl
            );
            
            console.log('Auth result type:', result.type);
            
            if (result.type === 'success') {
                // Parse the URL to extract our token
                const responseUrl = result.url;
                const urlParams = new URLSearchParams(responseUrl.split('?')[1]);
                const token = urlParams.get('token');
                
                if (!token) {
                    console.warn('No token received in the response URL');
                    return { 
                        success: false, 
                        error: 'Authentication successful but no token received' 
                    };
                }
                
                // Store the token
                await AsyncStorage.setItem('token', token);
                console.log('Successfully extracted and stored token');
                
                return { success: true, token };
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
    
    // Legacy method for backward compatibility
    async signInWithGoogleLegacy() {
        try {
            // This uses the legacy direct-to-Google OAuth flow
            // Implementation details preserved here as a fallback
            console.log('Using legacy Google OAuth flow (direct)');
            
            // Import legacy Google OAuth components as needed
            const { makeRedirectUri, AuthRequest } = await import('expo-auth-session');
            
            // Get platform-specific client ID based on constants
            const clientId = Platform.OS === 'android' 
                ? GOOGLE_ANDROID_CLIENT_ID 
                : GOOGLE_CLIENT_ID;
            
            // For standalone builds, use the direct app scheme
            // For Expo Go, use the auth proxy
            const redirectUri = makeRedirectUri({
                useProxy: !isStandalone && Constants.appOwnership === 'expo',
                native: isStandalone ? `${appScheme}://oauth2redirect/google` : undefined
            });
            
            console.log(`Using clientId: ${clientId}`);
            console.log(`Using redirectUri: ${redirectUri}`);
            
            const scopes = ['profile', 'email'];

            // Define Google OAuth discovery for direct requests
            const googleAuthDiscovery = {
                authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
                tokenEndpoint: 'https://oauth2.googleapis.com/token',
            };

            // Configure auth request
            const config = {
                clientId,
                scopes,
                redirectUri,
                responseType: 'token',
                usePKCE: false,
            };

            // For Expo Go, we need to use the authentication proxy
            // Don't use proxy for standalone builds
            if (!isStandalone && Constants.appOwnership === 'expo') {
                config.useProxy = true;
            }
            
            // Create and load the request
            const request = new AuthRequest(config);

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