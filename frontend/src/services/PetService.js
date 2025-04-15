import apiClient, { handleApiError } from "./ApiClient";

class PetService {
    async createPet(petData) {
        try {
            const response = await apiClient.post("/pets", petData);
            return response.data;
        } catch (error) {
            throw handleApiError(error);
        }
    }

    async getUserPets() {
        try {
            const response = await apiClient.get("/pets");
            return response.data;
        } catch (error) {
            throw handleApiError(error);
        }
    }

    async getPetById(petId) {
        try {
            const response = await apiClient.get(`/pets/${petId}`);
            return response.data;
        } catch (error) {
            throw handleApiError(error);
        }
    }

    async updatePet(petId, petData) {
        try {
            const response = await apiClient.put(`/pets/${petId}`, petData);
            return response.data;
        } catch (error) {
            throw handleApiError(error);
        }
    }

    async deletePet(petId) {
        try {
            const response = await apiClient.delete(`/pets/${petId}`);
            return response.data;
        } catch (error) {
            throw handleApiError(error);
        }
    }
}

export default new PetService();
