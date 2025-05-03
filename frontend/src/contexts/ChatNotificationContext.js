import React, { createContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState } from 'react-native';

// Create the chat notification context
export const ChatNotificationContext = createContext();

export const ChatNotificationProvider = ({ children }) => {
    const [hasUnreadChats, setHasUnreadChats] = useState(false);
    
    // Function to check unread status from AsyncStorage
    const checkUnreadStatus = async () => {
        try {
            // Check the dedicated hasUnreadChats flag first (faster)
            const hasUnreadFlag = await AsyncStorage.getItem('hasUnreadChats');
            if (hasUnreadFlag) {
                const hasUnread = JSON.parse(hasUnreadFlag);
                setHasUnreadChats(hasUnread);
                return;
            }
            
            // Fallback: Check unread chats directly if flag is not set
            const unreadData = await AsyncStorage.getItem('unreadChats');
            if (unreadData) {
                const unreadChats = JSON.parse(unreadData);
                // If any unread chats exist, set the flag to true
                setHasUnreadChats(Object.keys(unreadChats).length > 0);
            }
        } catch (error) {
            console.error("Error checking unread chat state:", error);
        }
    };

    // Method to update the unread status
    const updateUnreadStatus = async (hasUnread) => {
        setHasUnreadChats(hasUnread);
        // Also update the AsyncStorage flag to keep it in sync
        try {
            await AsyncStorage.setItem('hasUnreadChats', JSON.stringify(hasUnread));
        } catch (error) {
            console.error("Error updating hasUnreadChats in AsyncStorage:", error);
        }
    };
    
    // Load unread state when component mounts
    useEffect(() => {
        checkUnreadStatus();
        
        // Set up app state listener to check for unread messages when app comes to foreground
        const subscription = AppState.addEventListener('change', nextAppState => {
            if (nextAppState === 'active') {
                // Check unread status when app becomes active
                checkUnreadStatus();
            }
        });
        
        // Set up an interval to periodically check for unread status
        // This ensures the badge updates even if other mechanisms fail
        const intervalId = setInterval(checkUnreadStatus, 2000);
        
        return () => {
            subscription.remove();
            clearInterval(intervalId);
        };
    }, []);

    return (
        <ChatNotificationContext.Provider 
            value={{
                hasUnreadChats,
                updateUnreadStatus,
                checkUnreadStatus
            }}>
            {children}
        </ChatNotificationContext.Provider>
    );
};

export default ChatNotificationProvider;