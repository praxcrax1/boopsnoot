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
            return response.data;
        } catch (error) {
            throw handleApiError(error);
        }
    }

    async register(userData) {
        try {
            const response = await apiClient.post("/auth/register", userData);
            await AsyncStorage.setItem("token", response.data.token);
            return response.data;
        } catch (error) {
            throw handleApiError(error);
        }
    }

    async logout() {
        try {
            await AsyncStorage.removeItem("token");
            return true;
        } catch (error) {
            console.error("Logout error:", error);
            throw new Error("Failed to logout");
        }
    }

    async getCurrentUser() {
        try {
            const response = await apiClient.get("/auth/me");
            return response.data;
        } catch (error) {
            throw handleApiError(error);
        }
    }

    async isAuthenticated() {
        const token = await AsyncStorage.getItem("token");
        return !!token;
    }
}

export default new AuthService();
