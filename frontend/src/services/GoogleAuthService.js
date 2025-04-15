import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { GOOGLE_CLIENT_ID, GOOGLE_REDIRECT_URI } from '../constants/apiConfig';

// Register for the AuthSession redirect
WebBrowser.maybeCompleteAuthSession();

// Google OAuth configuration
const googleAuthDiscovery = {
    authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenEndpoint: 'https://oauth2.googleapis.com/token',
};

class GoogleAuthService {
    async signInWithGoogle() {
        try {
            // Configure OAuth request
            const clientId = GOOGLE_CLIENT_ID;
            // Use the exact URI that was registered in Google console
            const redirectUri = GOOGLE_REDIRECT_URI;
            
            const scopes = ['profile', 'email'];

            // Create and load the request
            const request = new AuthSession.AuthRequest({
                clientId,
                scopes,
                redirectUri,
                usePKCE: false, // Google requires PKCE to be disabled for mobile
                responseType: 'token',
            });

            const result = await request.promptAsync(googleAuthDiscovery);
            
            if (result.type === 'success') {
                // Extract the access token from the response
                const { access_token } = result.params;
                return { success: true, accessToken: access_token };
            } else {
                // User cancelled or auth failed
                return { 
                    success: false, 
                    error: 'Google sign in was cancelled or failed' 
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