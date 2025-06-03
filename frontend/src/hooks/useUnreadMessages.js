/**
 * Custom hook for managing unread messages functionality
 * Handles checking and updating unread message status
 */
import { useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Hook to manage unread message functionality
 * @returns {Object} Message management functions
 */
export const useUnreadMessages = () => {
    /**
     * Check for unread messages and update status
     * @returns {Promise<void>}
     */
    const checkAndUpdateUnreadMessages = useCallback(async () => {
        try {
            // Dynamic import to avoid circular dependencies
            const chatService = require("../services/ChatService").default;
            
            // Fetch latest chats
            await chatService.getChats();
            
            // Check for unread messages
            const unreadData = await AsyncStorage.getItem('unreadChats');
            if (unreadData) {
                const unreadChats = JSON.parse(unreadData);
                const hasUnreadMessages = Object.keys(unreadChats).length > 0;
                
                // Update unread status in storage
                await AsyncStorage.setItem('hasUnreadChats', JSON.stringify(hasUnreadMessages));
            }
        } catch (error) {
            console.error("Error checking for unread messages:", error);
        }
    }, []);

    /**
     * Clear all unread message data
     * @returns {Promise<void>}
     */
    const clearUnreadMessages = useCallback(async () => {
        try {
            await AsyncStorage.removeItem('unreadChats');
            await AsyncStorage.setItem('hasUnreadChats', JSON.stringify(false));
        } catch (error) {
            console.error("Error clearing unread messages:", error);
        }
    }, []);

    return {
        checkAndUpdateUnreadMessages,
        clearUnreadMessages
    };
};
