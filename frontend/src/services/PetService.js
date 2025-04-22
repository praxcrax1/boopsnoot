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

    // Updated method to handle image uploads that works with any image service provider
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

            // The backend now handles the upload provider internally
            const response = await apiClient.post('/pets/upload', formData, config);
            
            // Check if response has the expected format
            if (!response.data || !response.data.imageUrl) {
                throw new Error('Invalid image upload response');
            }
            
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
