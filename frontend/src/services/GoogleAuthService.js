import React from "react";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
    GOOGLE_ANDROID_CLIENT_ID,
    GOOGLE_CLIENT_ID,
} from "../constants/apiConfig";
import * as AuthSession from "expo-auth-session";
import AuthService from "./AuthService";

WebBrowser.maybeCompleteAuthSession();

export const useGoogleAuth = () => {
    const [request, response, promptAsync] = Google.useAuthRequest({
        androidClientId: GOOGLE_ANDROID_CLIENT_ID,
        iosClientId: GOOGLE_ANDROID_CLIENT_ID,
        expoClientId: GOOGLE_CLIENT_ID,
        webClientId: GOOGLE_CLIENT_ID,
        scopes: ["profile", "email"],
        redirectUri: AuthSession.makeRedirectUri({
            useProxy: false,
        }),
    });

    const signIn = async () => {
        try {
            console.log("Starting Google authentication flow");

            const result = await promptAsync();

            if (result.type !== "success") {
                console.error("Authentication was not successful");
                return { success: false, error: "Authentication failed" };
            }

            const { authentication } = result;
            if (!authentication || !authentication.accessToken) {
                console.error(
                    "Authentication object is null or missing accessToken"
                );
                return { success: false, error: "Missing access token" };
            }

            const accessToken = authentication.accessToken;

            const backendResponse = await AuthService.loginWithGoogle(
                accessToken
            );

            if (!backendResponse.success) {
                console.error("Backend verification failed:", backendResponse);
                return { success: false, error: "Backend verification failed" };
            }

            const token = backendResponse.token;
            if (!token) {
                console.error("No token received from backend");
                return {
                    success: false,
                    error: "No token received from backend",
                };
            }

            await AsyncStorage.setItem("token", token);

            return { success: true };
        } catch (error) {
            console.error("Google authentication error:", error);
            return {
                success: false,
                error: error.message || "Failed to authenticate with Google",
            };
        }
    };

    return {
        signIn,
    };
};
