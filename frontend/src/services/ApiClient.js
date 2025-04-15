import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from "../constants/apiConfig";

// Create axios instance with default config
const apiClient = axios.create({
    baseURL: API_URL,
    headers: {
        "Content-Type": "application/json",
    },
});

// Add token to all requests
apiClient.interceptors.request.use(
    async (config) => {
        const token = await AsyncStorage.getItem("token");
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Helper function to standardize error handling
export function handleApiError(error) {
    let errorMessage = "An unexpected error occurred";

    if (error.response) {
        // Server responded with a status code outside the 2xx range
        const serverError = error.response.data;
        errorMessage = serverError.message || String(serverError);

        // Log additional details for debugging
        console.error("API Error:", {
            status: error.response.status,
            data: error.response.data,
            url: error.config?.url,
        });
    } else if (error.request) {
        // Request was made but no response received
        errorMessage =
            "No response from server. Please check your internet connection.";
        console.error("API No Response:", error.request);
    } else {
        // Request setup error
        errorMessage = error.message;
        console.error("API Setup Error:", error.message);
    }

    return new Error(errorMessage);
}

export default apiClient;
