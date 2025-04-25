import * as Location from 'expo-location';

class LocationService {
    // Cache for storing location names to reduce API calls
    _locationCache = {};
    
    /**
     * Get locality name from coordinates
     * @param {number} lat - Latitude
     * @param {number} long - Longitude
     * @returns {Promise<string>} - Locality name
     */
    async getLocalityFromCoordinates(lat, long) {
        if (!lat || !long) return "Unknown location";
        
        // Create a cache key from coordinates (rounded to 4 decimal places for better caching)
        const cacheKey = `${parseFloat(lat).toFixed(4)},${parseFloat(long).toFixed(4)}`;
        
        // Check cache first
        if (this._locationCache[cacheKey]) {
            return this._locationCache[cacheKey];
        }
        
        try {
            // Use expo-location to reverse geocode
            const locations = await Location.reverseGeocodeAsync({
                latitude: lat,
                longitude: long
            });
            
            if (locations && locations.length > 0) {
                const location = locations[0];
                // Try to get the most specific location name available
                const locality = this._getBestLocalityName(location);
                
                // Store in cache
                this._locationCache[cacheKey] = locality;
                
                return locality;
            }
            
            return "Unknown location";
        } catch (error) {
            console.error("Error getting locality from coordinates:", error);
            return "Unknown location";
        }
    }
    
    /**
     * Format distance for display
     * @param {number} distance - Distance in kilometers
     * @returns {string} - Formatted distance string
     */
    formatDistance(distance) {
        if (!distance && distance !== 0) return "";
        if (typeof distance !== 'number') return "";
        
        if (distance < 1) {
            // Convert to meters and round
            const meters = Math.round(distance * 1000);
            return `${meters}m`;
        } else {
            // Round to 1 decimal place
            return `${distance.toFixed(1)}km`;
        }
    }
    
    /**
     * Extract the most meaningful locality name from geocoding result
     * Returns the most specific name available in this priority order
     */
    _getBestLocalityName(location) {
        // Priority order for location names
        if (location.name) return location.name;
        if (location.district) return location.district;
        if (location.subregion) return location.subregion;
        if (location.street) return location.street;
        if (location.neighborhood) return location.neighborhood;
        if (location.postalCode) return location.postalCode;
        if (location.city) return location.city;
        if (location.region) return location.region;
        return "Unknown location";
    }
    
    /**
     * Clear location cache
     */
    clearCache() {
        this._locationCache = {};
    }
}

export default new LocationService();