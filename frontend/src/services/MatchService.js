import apiClient, { handleApiError } from "./ApiClient";

class MatchService {
    // Cache for storing pet matches
    _matchesCache = {};
    _cacheTimeout = 60000; // 1 minute cache timeout
    _cacheTimestamps = {};

    // Clear cache for specific pet or all pets
    clearCache(petId = null) {
        if (petId) {
            delete this._matchesCache[petId];
            delete this._cacheTimestamps[petId];
        } else {
            this._matchesCache = {};
            this._cacheTimestamps = {};
        }
    }

    async getPotentialMatches(filters = {}, petId) {
        try {
            const response = await apiClient.get(
                `/matches/potential/${petId}`,
                { params: filters }
            );
            return response.data;
        } catch (error) {
            throw handleApiError(error);
        }
    }

    async likeProfile(petId, likedPetId) {
        try {
            const response = await apiClient.post("/matches/like", {
                petId,
                likedPetId,
                isLiked: true,
            });

            // Clear cache after liking to ensure fresh data
            this.clearCache(petId);

            return response.data;
        } catch (error) {
            throw handleApiError(error);
        }
    }

    async passProfile(petId, likedPetId) {
        try {
            const response = await apiClient.post("/matches/like", {
                petId,
                likedPetId,
                isLiked: false,
            });
            return response.data;
        } catch (error) {
            throw handleApiError(error);
        }
    }

    async unmatchPet(petId, unmatchedPetId) {
        try {
            const response = await apiClient.post("/matches/unmatch", {
                petId,
                unmatchedPetId
            });
            
            // Clear cache after unmatching to ensure fresh data
            this.clearCache(petId);
            
            return response.data;
        } catch (error) {
            throw handleApiError(error);
        }
    }

    async getUserMatches(petId) {
        try {
            // Check if we have a valid cached response
            const now = Date.now();
            if (
                this._matchesCache[petId] &&
                this._cacheTimestamps[petId] &&
                now - this._cacheTimestamps[petId] < this._cacheTimeout
            ) {
                console.log(`[API] Returning cached matches for pet ${petId}`);
                return this._matchesCache[petId];
            }

            console.log(`[API] Fetching fresh matches for pet ${petId}`);
            const response = await apiClient.get(`/matches/${petId}`);

            // Cache the response
            this._matchesCache[petId] = response.data;
            this._cacheTimestamps[petId] = now;

            return response.data;
        } catch (error) {
            throw handleApiError(error);
        }
    }

    // Method to preload matches for multiple pets in the background
    async preloadMatchesForPets(petIds) {
        if (!Array.isArray(petIds) || petIds.length === 0) return;

        console.log(`[API] Preloading matches for ${petIds.length} pets`);

        // Map each pet ID to a promise that will fetch its matches
        const fetchPromises = petIds.map((petId) =>
            this.getUserMatches(petId).catch((err) => {
                console.error(
                    `Failed to preload matches for pet ${petId}:`,
                    err
                );
                return null;
            })
        );

        // Wait for all preloads to complete
        await Promise.all(fetchPromises);
        console.log("[API] Preloading complete");
    }
}

export default new MatchService();
