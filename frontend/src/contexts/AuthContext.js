import React, { createContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import AuthService from "../services/AuthService";

// Create the auth context
export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [authError, setAuthError] = useState(null);

    // Check for existing token and load user data on app start
    useEffect(() => {
        const loadUser = async () => {
            try {
                const isAuth = await AuthService.isAuthenticated();

                if (isAuth) {
                    const userData = await AuthService.getCurrentUser();
                    if (userData && userData.user) {
                        setUser(userData.user);
                        setIsAuthenticated(true);
                    } else {
                        // Invalid or expired token
                        await AsyncStorage.removeItem("token");
                        setIsAuthenticated(false);
                        setUser(null);
                    }
                } else {
                    setIsAuthenticated(false);
                    setUser(null);
                }
            } catch (error) {
                console.error("Error loading user:", error);
                setAuthError(error.message);
                setIsAuthenticated(false);
                setUser(null);
            } finally {
                setIsLoading(false);
            }
        };

        loadUser();
    }, []);

    // Register user
    const register = async (userData) => {
        setIsLoading(true);
        setAuthError(null);

        try {
            const response = await AuthService.register(userData);
            setUser(response.user);
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

    // Login user
    const login = async (email, password) => {
        setIsLoading(true);
        setAuthError(null);

        try {
            const response = await AuthService.login(email, password);
            setUser(response.user);
            setIsAuthenticated(true);
            return { success: true, user: response.user };
        } catch (error) {
            console.error("Login error:", error);
            setAuthError(error.message);
            return { success: false, error: error.message };
        } finally {
            setIsLoading(false);
        }
    };

    // Logout user
    const logout = async () => {
        setIsLoading(true);

        try {
            await AuthService.logout();
            setUser(null);
            setIsAuthenticated(false);
            return { success: true };
        } catch (error) {
            console.error("Logout error:", error);
            setAuthError(error.message);
            return { success: false, error: error.message };
        } finally {
            setIsLoading(false);
        }
    };

    // Update user information
    const updateUser = async (userData) => {
        setUser({
            ...user,
            ...userData,
        });
    };

    // Clear any auth errors
    const clearAuthError = () => {
        setAuthError(null);
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                isAuthenticated,
                isLoading,
                authError,
                register,
                login,
                logout,
                updateUser,
                clearAuthError,
            }}>
            {children}
        </AuthContext.Provider>
    );
};
