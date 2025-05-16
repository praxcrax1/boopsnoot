import React, { useEffect, useRef } from "react";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as AuthSession from "expo-auth-session";
import {
    API_URL,
    GOOGLE_ANDROID_CLIENT_ID,
    GOOGLE_CLIENT_ID,
} from "../constants/apiConfig";
import AuthService from "./AuthService";

WebBrowser.maybeCompleteAuthSession();

export const useGoogleAuth = () => {
    const accessTokenRef = useRef(null);
    const resolverRef = useRef(null);

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

    // Listen to the auth response after the redirect
    useEffect(() => {
        const handleResponse = async () => {
            if (response?.type === "success") {
                const { authentication } = response;
                if (authentication?.accessToken) {
                    accessTokenRef.current = authentication.accessToken;

                    // Resolve the promise waiting in signIn()
                    if (resolverRef.current) {
                        resolverRef.current({
                            success: true,
                            accessToken: authentication.accessToken,
                        });
                        resolverRef.current = null;
                    }
                } else {
                    console.error(
                        "Access token missing in authentication object"
                    );
                    if (resolverRef.current) {
                        resolverRef.current({
                            success: false,
                            error: "Missing access token",
                        });
                        resolverRef.current = null;
                    }
                }
            } else if (response?.type === "error") {
                console.error("Google auth error:", response.error);
                if (resolverRef.current) {
                    resolverRef.current({
                        success: false,
                        error: "Authentication error",
                    });
                    resolverRef.current = null;
                }
            }
        };

        handleResponse();
    }, [response]);

    const signIn = async () => {
        try {
            const promptResult = await promptAsync();

            return await new Promise((resolve) => {
                resolverRef.current = async ({
                    success,
                    accessToken,
                    error,
                }) => {
                    if (!success) {
                        return resolve({ success: false, error });
                    }

                    try {
                        const backendResponse = await AuthService.loginWithGoogle(accessToken)

                        if (!backendResponse.token) {
                            return resolve({
                                success: false,
                                error:
                                    backendResponse?.error ||
                                    "Backend authentication failed",
                            });
                        }

                        await AsyncStorage.setItem("token", backendResponse.token);
                        resolve({ success: true });
                    } catch (err) {
                        console.error("Backend auth error:", err);
                        resolve({
                            success: false,
                            error: err.message || "Network error",
                        });
                    }
                };
            });
        } catch (err) {
            console.error("Google login error:", err);
            return { success: false, error: err.message || "Unknown error" };
        }
    };

    return {
        signIn,
    };
};
