import React, { createContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Create the chat notification context
export const ChatNotificationContext = createContext();

export const ChatNotificationProvider = ({ children }) => {
    const [hasUnreadChats, setHasUnreadChats] = useState(false);

    // Load unread state from AsyncStorage on mount
    useEffect(() => {
        const loadUnreadState = async () => {
            try {
                const unreadData = await AsyncStorage.getItem('unreadChats');
                if (unreadData) {
                    const unreadChats = JSON.parse(unreadData);
                    // If any unread chats exist, set the flag to true
                    setHasUnreadChats(Object.keys(unreadChats).length > 0);
                }
            } catch (error) {
                console.error("Error loading unread chat state:", error);
            }
        };

        loadUnreadState();
    }, []);

    // Method to update the unread status
    const updateUnreadStatus = (hasUnread) => {
        setHasUnreadChats(hasUnread);
    };

    // Value object to be provided
    const contextValue = {
        hasUnreadChats,
        updateUnreadStatus,
    };

    return (
        <ChatNotificationContext.Provider value={contextValue}>
            {children}
        </ChatNotificationContext.Provider>
    );
};

export default ChatNotificationProvider;