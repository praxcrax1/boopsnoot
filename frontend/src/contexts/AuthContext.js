import React, { createContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from 'expo-location';
import AuthService from "../services/AuthService";
import PetService from "../services/PetService";
import SocketService from "../services/SocketService";

// Create the auth context
export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [authError, setAuthError] = useState(null);
    const [locationPermissionStatus, setLocationPermissionStatus] = useState(null);
    const [hasPets, setHasPets] = useState(false);
    const [checkingPetStatus, setCheckingPetStatus] = useState(true);
    const [transitioningToPetSetup, setTransitioningToPetSetup] = useState(false);

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
                        setCheckingPetStatus(false);
                    }
                } else {
                    setIsAuthenticated(false);
                    setUser(null);
                    setCheckingPetStatus(false);
                }
            } catch (error) {
                console.error("Error loading user:", error);
                setAuthError(error.message);
                setIsAuthenticated(false);
                setUser(null);
                setCheckingPetStatus(false);
            } finally {
                // Add slight delay before removing the loading state
                // to ensure smoother transitions
                setTimeout(() => {
                    setIsLoading(false);
                }, 300);
            }
        };

        loadUser();
    }, []);
    
    // Check if user has pets with a smooth transition
    const checkUserPets = async () => {
        try {
            setCheckingPetStatus(true);
            const petsResponse = await PetService.getUserPets();
            const hasUserPets = petsResponse.pets && petsResponse.pets.length > 0;
            
            // Use a slight delay to make transition smoother
            if (!hasUserPets) {
                setTransitioningToPetSetup(true);
            }

            setTimeout(() => {
                setHasPets(hasUserPets);
                setCheckingPetStatus(false);
            }, 300);
            
        } catch (error) {
            console.error("Error checking pet status:", error);
            setHasPets(false);
            setCheckingPetStatus(false);
        }
    };

    // Request location permission and update user location
    const requestAndUpdateLocation = async () => {
        try {
            setIsLoading(true);
            
            // Request permissions first
            const { status } = await Location.requestForegroundPermissionsAsync();
            setLocationPermissionStatus(status);
            
            if (status !== 'granted') {
                console.log('Location permission denied');
                return false;
            }
            
            // Get current position
            const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
            });
            
            // Update user with location information
            if (location && location.coords) {
                const { latitude, longitude } = location.coords;
                
                // Get address information
                const [addressInfo] = await Location.reverseGeocodeAsync({
                    latitude,
                    longitude
                });
                
                // Prepare location data with proper GeoJSON format
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
                
                // Update user in backend
                const response = await AuthService.updateUserLocation(locationData);
                
                if (response.success) {
                    // Update local user state
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

    // Register user
    const register = async (userData) => {
        setIsLoading(true);
        setAuthError(null);

        try {
            const response = await AuthService.register(userData);
            setUser(response.user);
            setIsAuthenticated(true);
            
            // Set initial pet status to false for new user with a transition
            setTransitioningToPetSetup(true);
            setTimeout(() => {
                setHasPets(false);
                setCheckingPetStatus(false);
            }, 300);
            
            // After successful registration, request location
            requestAndUpdateLocation();
            
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
            
            // Check if user has pets after login with smooth transition
            checkUserPets();
            
            // Check if we need to request location after login
            if (!response.user.location || 
                (!response.user.location.coordinates || 
                 (response.user.location.coordinates[0] === 0 && 
                  response.user.location.coordinates[1] === 0))) {
                requestAndUpdateLocation();
            }
            
            // Check for unread messages that arrived while offline
            try {
                // Fetch chats to update unread status
                const chatService = require("../services/ChatService").default;
                await chatService.getChats();
            } catch (error) {
                console.error("Error checking for unread messages after login:", error);
            }
            
            return { success: true, user: response.user };
        } catch (error) {
            console.error("Login error:", error);
            setAuthError(error.message);
            return { success: false, error: error.message };
        } finally {
            setIsLoading(false);
        }
    };

    // Login with Google
    const loginWithGoogle = async (accessToken) => {
        setIsLoading(true);
        setAuthError(null);

        try {
            const response = await AuthService.loginWithGoogle(accessToken);
            setUser(response.user);
            setIsAuthenticated(true);
            
            // Check if user has pets after Google login with smooth transition
            checkUserPets();
            
            // Check if we need to request location after Google login
            if (!response.user.location || 
                (!response.user.location.coordinates || 
                 (response.user.location.coordinates[0] === 0 && 
                  response.user.location.coordinates[1] === 0))) {
                requestAndUpdateLocation();
            }
            
            // Check for unread messages that arrived while offline
            try {
                // Fetch chats to update unread status
                const chatService = require("../services/ChatService").default;
                await chatService.getChats();
            } catch (error) {
                console.error("Error checking for unread messages after Google login:", error);
            }
            
            return { success: true, user: response.user };
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
            setCheckingPetStatus(false);
            
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
        // First set transitions
        if (hasUserPets) {
            setTransitioningToPetSetup(false);
        }
        
        // Then update the pet status after a slight delay
        setTimeout(() => {
            setHasPets(hasUserPets);
            setCheckingPetStatus(false);
        }, 300);
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
                checkingPetStatus,
                updatePetStatus,
                checkUserPets,
                transitioningToPetSetup
            }}>
            {children}
        </AuthContext.Provider>
    );
};
