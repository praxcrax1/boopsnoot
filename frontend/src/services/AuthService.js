import AsyncStorage from "@react-native-async-storage/async-storage";
import apiClient, { handleApiError } from "./ApiClient";

class AuthService {
    async login(email, password) {
        try {
            const response = await apiClient.post("/auth/login", {
                email,
                password,
            });
            await AsyncStorage.setItem("token", response.data.token);
            await AsyncStorage.setItem("user", JSON.stringify(response.data.user));
            return response.data;
        } catch (error) {
            throw handleApiError(error);
        }
    }

    async register(userData) {
        try {
            const response = await apiClient.post("/auth/register", userData);
            await AsyncStorage.setItem("token", response.data.token);
            await AsyncStorage.setItem("user", JSON.stringify(response.data.user));
            return response.data;
        } catch (error) {
            throw handleApiError(error);
        }
    }

    async logout() {
        try {
            await AsyncStorage.removeItem("token");
            await AsyncStorage.removeItem("user");
            return true;
        } catch (error) {
            console.error("Logout error:", error);
            throw new Error("Failed to logout");
        }
    }

    async getCurrentUser() {
        try {
            const response = await apiClient.get("/auth/me");
            if (response.data && response.data.user) {
                await AsyncStorage.setItem("user", JSON.stringify(response.data.user));
            }
            return response.data;
        } catch (error) {
            throw handleApiError(error);
        }
    }

    async isAuthenticated() {
        try {
            const token = await AsyncStorage.getItem("token");
            return !!token;
        } catch (error) {
            console.error("Auth check error:", error);
            return false;
        }
    }
    
    async updateUserLocation(locationData) {
        try {
            const response = await apiClient.put("/auth/update-location", locationData);
            if (response.data && response.data.user) {
                await AsyncStorage.setItem("user", JSON.stringify(response.data.user));
            }
            return response.data;
        } catch (error) {
            console.error("Location update error:", error);
            throw handleApiError(error);
        }
    }

    async storePushToken(token) {
        try {
            const response = await apiClient.post("/auth/push-token", { token });
            return response.data;
        } catch (error) {
            console.error("Push token storage error:", error);
            throw handleApiError(error);
        }
    }

    async loginWithGoogle(accessToken) {
        try {
            const response = await apiClient.post("/auth/google", {
                accessToken
            });
            await AsyncStorage.setItem("token", response.data.token);
            await AsyncStorage.setItem("user", JSON.stringify(response.data.user));
            return response.data;
        } catch (error) {
            throw handleApiError(error);
        }
    }
}

export default new AuthService();
