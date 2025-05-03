import apiClient, { handleApiError } from "./ApiClient";
import AsyncStorage from "@react-native-async-storage/async-storage";

class ChatService {
    async getChats() {
        try {
            const response = await apiClient.get("/chats");
            
            // Update unread chats in AsyncStorage based on API response
            if (response.data.chats) {
                this.updateUnreadChatsStorage(response.data.chats);
            }
            
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
    
    // Helper method to update unread chats in AsyncStorage
    async updateUnreadChatsStorage(chats) {
        try {
            // Get existing unread state
            const existingUnreadData = await AsyncStorage.getItem('unreadChats');
            const existingUnread = existingUnreadData ? JSON.parse(existingUnreadData) : {};
            
            // Update unread status based on API response
            let updatedUnread = { ...existingUnread };
            let hasAnyUnread = false;
            
            chats.forEach(chat => {
                if (chat.lastMessage && chat.lastMessage.unread) {
                    updatedUnread[chat._id] = true;
                    hasAnyUnread = true;
                } else {
                    // Keep chat as unread if it was already marked as such, unless API explicitly says it's read
                    if (existingUnread[chat._id]) {
                        hasAnyUnread = true;
                    } else {
                        delete updatedUnread[chat._id];
                    }
                }
            });
            
            // Save updated unread state
            await AsyncStorage.setItem('unreadChats', JSON.stringify(updatedUnread));
            
            // Also set a separate flag for unread status (used by tab indicator)
            await AsyncStorage.setItem('hasUnreadChats', JSON.stringify(hasAnyUnread));
            
            return updatedUnread;
        } catch (error) {
            console.error("Error updating unread chats storage:", error);
            return {};
        }
    }
}

export default new ChatService();
