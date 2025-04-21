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

    // New method to handle image uploads
    async uploadPetImage(imageUri) {
        try {
            // Create form data
            const formData = new FormData();
            
            // Get file name and type from URI
            const uriParts = imageUri.split('.');
            const fileType = uriParts[uriParts.length - 1];
            
            formData.append('image', {
                uri: imageUri,
                name: `pet_image.${fileType}`,
                type: `image/${fileType}`
            });

            // Set special headers for file upload
            const config = {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            };

            const response = await apiClient.post('/pets/upload', formData, config);
            return response.data;
        } catch (error) {
            throw handleApiError(error);
        }
    }

    // New method to add image URL to pet profile
    async addImageToPet(petId, imageUrl) {
        try {
            const response = await apiClient.post(`/pets/${petId}/image`, { imageUrl });
            return response.data;
        } catch (error) {
            throw handleApiError(error);
        }
    }

    // Combined method to upload and add an image to a pet profile
    async uploadAndAddPetImage(petId, imageUri) {
        try {
            // First upload the image
            const uploadResponse = await this.uploadPetImage(imageUri);
            
            if (!uploadResponse.success || !uploadResponse.imageUrl) {
                throw new Error('Image upload failed');
            }
            
            // Then add the image URL to the pet profile
            const addImageResponse = await this.addImageToPet(petId, uploadResponse.imageUrl);
            return addImageResponse;
        } catch (error) {
            throw handleApiError(error);
        }
    }
}

export default new PetService();
