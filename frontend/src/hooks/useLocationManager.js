/**
 * Custom hook for managing user location functionality
 * Handles location permissions, fetching, and updating
 */
import { useState } from 'react';
import * as Location from 'expo-location';
import AuthService from '../services/AuthService';

/**
 * Hook to manage location permissions and updates
 * @param {Object} user - Current user object
 * @param {Function} setUser - Function to update user state
 * @returns {Object} Location management functions and state
 */
export const useLocationManager = (user, setUser) => {
    const [locationPermissionStatus, setLocationPermissionStatus] = useState(null);
    const [isUpdatingLocation, setIsUpdatingLocation] = useState(false);

    /**
     * Request location permission and update user's location
     * @returns {Promise<boolean>} Success status
     */
    const requestAndUpdateLocation = async () => {
        if (isUpdatingLocation) return false;
        
        try {
            setIsUpdatingLocation(true);

            // Request permission
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
            
            if (!location?.coords) {
                return false;
            }
                
            const { latitude, longitude } = location.coords;
            
            // Get address information
            const [addressInfo] = await Location.reverseGeocodeAsync({
                latitude,
                longitude
            });
            
            // Format location data for API
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
            
            // Update user location on server
            const response = await AuthService.updateUserLocation(locationData);
            
            if (response.success) {
                // Update local user state with new location
                setUser(prevUser => ({
                    ...prevUser,
                    ...locationData
                }));
                
                console.log('Location updated successfully');
                return true;
            }
            
            return false;
        } catch (error) {
            console.error('Error updating location:', error);
            return false;
        } finally {
            setIsUpdatingLocation(false);
        }
    };

    return {
        locationPermissionStatus,
        requestAndUpdateLocation,
        isUpdatingLocation
    };
};
