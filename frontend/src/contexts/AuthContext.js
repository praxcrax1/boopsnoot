import React, { createContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from 'expo-location';
import * as WebBrowser from 'expo-web-browser';
import AuthService from "../services/AuthService";
import PetService from "../services/PetService";
import SocketService from "../services/SocketService";
import { useGoogleAuth } from "../services/GoogleAuthService";

WebBrowser.maybeCompleteAuthSession();

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [authError, setAuthError] = useState(null);
    const [locationPermissionStatus, setLocationPermissionStatus] = useState(null);
    const [hasPets, setHasPets] = useState(false);
    
    const { signIn: googleSignIn } = useGoogleAuth();

    useEffect(() => {
        const loadUser = async () => {
            try {
                const isAuth = await AuthService.isAuthenticated();

                if (isAuth) {
                    const userData = await AuthService.getCurrentUser();
                    if (userData && userData.user) {
                        setUser(userData.user);
                        setIsAuthenticated(true);
                        
                        // Check if user has pets
                        checkUserPets();
                        
                        // Check if we need to request location
                        if (!userData.user.location || 
                            (!userData.user.location.coordinates || 
                             (userData.user.location.coordinates[0] === 0 && 
                              userData.user.location.coordinates[1] === 0))) {
                            requestAndUpdateLocation();
                        }
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
                setTimeout(() => {
                    setIsLoading(false);
                }, 300);
            }
        };

        loadUser();
    }, []);
    
    const checkUserPets = async () => {
        try {
            const petsResponse = await PetService.getUserPets();
            const hasUserPets = petsResponse.pets && petsResponse.pets.length > 0;
            setHasPets(hasUserPets);
            
        } catch (error) {
            console.error("Error checking pet status:", error);
            setHasPets(false);
            return false;
        }
    };

    const requestAndUpdateLocation = async () => {
        try {
            setIsLoading(true);

            const { status } = await Location.requestForegroundPermissionsAsync();
            setLocationPermissionStatus(status);
            
            if (status !== 'granted') {
                console.log('Location permission denied');
                return false;
            }
            
            const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
            });
            
            if (location && location.coords) {
                const { latitude, longitude } = location.coords;
                

                const [addressInfo] = await Location.reverseGeocodeAsync({
                    latitude,
                    longitude
                });
                
                const locationData = {
                    location: {
                        type: 'Point', // Required for GeoJSON
                        coordinates: [longitude, latitude], // MongoDB uses [long, lat] format
                        address: addressInfo ? 
                            `${addressInfo.street || ''}, ${addressInfo.city || ''}` : 
                            'Unknown location',
                        city: addressInfo ? addressInfo.city : ''
                    }
                };
                

                const response = await AuthService.updateUserLocation(locationData);
                
                if (response.success) {
                    setUser(prevUser => ({
                        ...prevUser,
                        ...locationData
                    }));
                    
                    console.log('Location updated successfully');
                    return true;
                }
            }
            
            return false;
        } catch (error) {
            console.error('Error updating location:', error);
            return false;
        } finally {
            setIsLoading(false);
        }
    };

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

    const login = async (email, password) => {
        setIsLoading(true);
        setAuthError(null);

        try {
            const response = await AuthService.login(email, password);
            // Store user data but DON'T set isAuthenticated yet
            setUser(response.user);
            
            // Check if user has pets after login - AWAIT for the status check to complete
            await checkUserPets();
            
            // Check if we need to request location after login
            if (!response.user.location || 
                (!response.user.location.coordinates || 
                 (response.user.location.coordinates[0] === 0 && 
                  response.user.location.coordinates[1] === 0))) {
                await requestAndUpdateLocation();
            }
            
            // Check for unread messages that arrived while offline
            try {
                // Fetch chats to update unread status
                const chatService = require("../services/ChatService").default;
                await chatService.getChats();
                
                // Directly check if there are unread messages after login
                const unreadData = await AsyncStorage.getItem('unreadChats');
                if (unreadData) {
                    const unreadChats = JSON.parse(unreadData);
                    const hasUnreadMessages = Object.keys(unreadChats).length > 0;
                    
                    // Directly set the flag in AsyncStorage to trigger notification badge
                    await AsyncStorage.setItem('hasUnreadChats', JSON.stringify(hasUnreadMessages));
                }
            } catch (error) {
                console.error("Error checking for unread messages after login:", error);
            }
            
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

    const loginWithGoogle = async () => {
        setIsLoading(true);
        setAuthError(null);

        try {
            // Call our simplified Google Auth flow
            const response = await googleSignIn();
            
            if (!response.success) {
                throw new Error(response.error || "Google authentication failed");
            }
            
            // Get the user data from our backend using the token that was stored during signIn
            const userData = await AuthService.getCurrentUser();
            
            if (!userData || !userData.user) {
                throw new Error("Failed to get user data after Google authentication");
            }
            
            // Store user data
            setUser(userData.user);
            
            // Check if user has pets
            await checkUserPets();
            
            // Check if we need to request location
            if (!userData.user.location || 
                (!userData.user.location.coordinates || 
                 (userData.user.location.coordinates[0] === 0 && 
                  userData.user.location.coordinates[1] === 0))) {
                await requestAndUpdateLocation();
            }
            
            // Check for unread messages
            try {
                const chatService = require("../services/ChatService").default;
                await chatService.getChats();
                
                const unreadData = await AsyncStorage.getItem('unreadChats');
                if (unreadData) {
                    const unreadChats = JSON.parse(unreadData);
                    const hasUnreadMessages = Object.keys(unreadChats).length > 0;
                    await AsyncStorage.setItem('hasUnreadChats', JSON.stringify(hasUnreadMessages));
                }
            } catch (error) {
                console.error("Error checking for unread messages after Google login:", error);
            }
            
            // Set authenticated after all checks are complete
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

    // Logout user
    const logout = async () => {
        setIsLoading(true);

        try {
            // Log out from the auth service
            await AuthService.logout();
            
            // Clean up socket connections and listeners
            SocketService.cleanup();
            
            // Reset state
            setUser(null);
            setIsAuthenticated(false);
            setHasPets(false);
            
            // Clear any unread chat data
            await AsyncStorage.removeItem('unreadChats');
            
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

    // Update pets status after creating a new pet with a smooth transition
    const updatePetStatus = (hasUserPets = true) => {
        setHasPets(hasUserPets);
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
                loginWithGoogle,
                updateUser,
                clearAuthError,
                requestAndUpdateLocation,
                locationPermissionStatus,
                hasPets,
                updatePetStatus,
                checkUserPets,
            }}>
            {children}
        </AuthContext.Provider>
    );
};
