/**
 * Authentication Context - Manages user authentication state and operations
 * This modular implementation separates concerns and improves readability
 */
import React, { createContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as WebBrowser from 'expo-web-browser';
import AuthService from "../services/AuthService";
import { useGoogleAuth } from "../services/GoogleAuthService";
import { useLocationManager } from "../hooks/useLocationManager";
import { useUnreadMessages } from "../hooks/useUnreadMessages";

// Initialize WebBrowser for OAuth flows
WebBrowser.maybeCompleteAuthSession();

/**
 * Authentication Context for managing user authentication state
 * @type {React.Context}
 */
export const AuthContext = createContext();

/**
 * Authentication Provider Component
 * Handles user authentication state and operations across the application
 */
export const AuthProvider = ({ children }) => {
    // Core authentication state
    const [user, setUser] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [authError, setAuthError] = useState(null);
    
    // External hooks for location, messages and Google authentication
    const { 
        locationPermissionStatus, 
        requestAndUpdateLocation 
    } = useLocationManager(user, setUser);
    
    const { checkAndUpdateUnreadMessages } = useUnreadMessages();
    const { signIn: googleSignIn } = useGoogleAuth();

    /**
     * Load user data from persistent storage on mount
     */
    useEffect(() => {
        loadUserData();
    }, []);

    /**
     * Load user data from storage and validate authentication
     */
    const loadUserData = async () => {
        try {
            setIsLoading(true);
            const isAuth = await AuthService.isAuthenticated();

            if (isAuth) {
                const userData = await AuthService.getCurrentUser();
                if (userData?.user) {
                    setUser(userData.user);
                    setIsAuthenticated(true);
                    
                    // Check if location update is needed
                    const needsLocationUpdate = !userData.user.location || 
                        !userData.user.location.coordinates ||
                        (userData.user.location.coordinates[0] === 0 && 
                         userData.user.location.coordinates[1] === 0);
                    
                    if (needsLocationUpdate) {
                        requestAndUpdateLocation();
                    }
                } else {
                    // Invalid or expired token
                    await handleLogout(false);
                }
            } else {
                await handleLogout(false);
            }
        } catch (error) {
            console.error("Error loading user:", error);
            setAuthError(error.message);
            await handleLogout(false);
        } finally {
            // Small delay for UI smoothness
            setTimeout(() => {
                setIsLoading(false);
            }, 300);
        }
    };

    /**
     * Register a new user
     * @param {Object} userData - User registration data
     * @returns {Promise<Object>} Result object with success flag and user data or error
     */
    const register = async (userData) => {
        setIsLoading(true);
        setAuthError(null);

        try {
            const response = await AuthService.register(userData);
            setUser(response.user);
            await requestAndUpdateLocation();
            
            setIsAuthenticated(true);
            
            return { success: true, user: response.user };
        } catch (error) {
            console.error("Registration error:", error);
            setAuthError(error.message);
            return { success: false, error: error.message };
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * Login with email and password
     * @param {string} email - User email
     * @param {string} password - User password
     * @returns {Promise<Object>} Result object with success flag and user data
     */
    const login = async (email, password) => {
        setIsLoading(true);
        setAuthError(null);

        try {
            const response = await AuthService.login(email, password);
            setUser(response.user);
            
            // Check if location update is needed
            const needsLocationUpdate = !response.user.location || 
                !response.user.location.coordinates ||
                (response.user.location.coordinates[0] === 0 && 
                 response.user.location.coordinates[1] === 0);
            
            if (needsLocationUpdate) {
                await requestAndUpdateLocation();
            }
            
            // Check for unread messages
            await checkAndUpdateUnreadMessages();
            
            setIsAuthenticated(true);
            
            return { success: true, user: response.user };
        } catch (error) {
            console.error("Login error:", error);
            setAuthError(error.message);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * Login with Google OAuth
     * @returns {Promise<Object>} Result object with success flag and user data or error
     */
    const loginWithGoogle = async () => {
        setIsLoading(true);
        setAuthError(null);

        try {
            // Use Google authentication flow
            const response = await googleSignIn();
            
            if (!response.success) {
                throw new Error(response.error || "Google authentication failed");
            }
            
            // Get user data from backend using the stored token
            const userData = await AuthService.getCurrentUser();
            
            if (!userData?.user) {
                throw new Error("Failed to get user data after Google authentication");
            }
            
            setUser(userData.user);
            
            // Check if location update is needed
            const needsLocationUpdate = !userData.user.location || 
                !userData.user.location.coordinates ||
                (userData.user.location.coordinates[0] === 0 && 
                 userData.user.location.coordinates[1] === 0);
            
            if (needsLocationUpdate) {
                await requestAndUpdateLocation();
            }
            
            // Check for unread messages
            await checkAndUpdateUnreadMessages();
            
            setIsAuthenticated(true);
            
            return { success: true, user: userData.user };
        } catch (error) {
            console.error("Google login error:", error);
            setAuthError(error.message);
            return { success: false, error: error.message };
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * Logout the current user
     * @param {boolean} callService - Whether to call the backend logout service
     * @returns {Promise<Object>} Result object with success flag
     */
    const handleLogout = async (callService = true) => {
        setIsLoading(true);

        try {
            // Only call logout service if explicitly requested
            if (callService) {
                await AuthService.logout();
            }
            
            // Reset state
            setUser(null);
            setIsAuthenticated(false);
            
            // Clear unread chat data
            await AsyncStorage.removeItem('unreadChats');
            await AsyncStorage.removeItem('hasUnreadChats');
            
            return { success: true };
        } catch (error) {
            console.error("Logout error:", error);
            setAuthError(error.message);
            return { success: false, error: error.message };
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * Update user profile information
     * @param {Object} userData - Updated user data
     */
    const updateUser = (userData) => {
        setUser(prevUser => ({
            ...prevUser,
            ...userData,
        }));
    };

    /**
     * Clear any authentication errors
     */
    const clearAuthError = () => {
        setAuthError(null);
    };

    // Auth context value to be provided
    const contextValue = {
        user,
        isAuthenticated,
        isLoading,
        authError,
        register,
        login,
        logout: () => handleLogout(true),
        loginWithGoogle,
        updateUser,
        clearAuthError,
        requestAndUpdateLocation,
        locationPermissionStatus,
    };

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    );
};
