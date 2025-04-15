import apiClient, { handleApiError } from "./ApiClient";

class ChatService {
    async getChats() {
        try {
            const response = await apiClient.get("/chats");
            return response.data;
        } catch (error) {
            throw handleApiError(error);
        }
    }

    async getChatById(chatId) {
        try {
            const response = await apiClient.get(`/chats/${chatId}`);
            return response.data;
        } catch (error) {
            throw handleApiError(error);
        }
    }

    async getMessages(chatId, params = {}) {
        try {
            // Use the same endpoint as getChatById since it already includes messages
            const response = await apiClient.get(`/chats/${chatId}`, {
                params: {
                    limit: params.limit || 30,
                    before: params.before,
                },
            });
            return response.data;
        } catch (error) {
            throw handleApiError(error);
        }
    }

    async sendMessage(chatId, content) {
        try {
            const response = await apiClient.post(`/chats/${chatId}/messages`, {
                content,
            });
            return response.data;
        } catch (error) {
            throw handleApiError(error);
        }
    }

    async getOrCreateChatForMatch(matchId) {
        try {
            // First try to find an existing chat for this match
            const response = await apiClient.post("/chats/for-match", {
                matchId,
            });
            return response.data;
        } catch (error) {
            throw handleApiError(error);
        }
    }
}

export default new ChatService();
