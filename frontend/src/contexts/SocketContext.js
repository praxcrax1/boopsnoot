/**
 * Socket Context - Provides socket connection and methods to the app
 * Manages socket lifecycle and isolates socket functionality
 */
import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthContext } from './AuthContext';
import socketService from '../services/SocketService';
import { useUnreadMessages } from '../hooks/useUnreadMessages';

// Create the context
export const SocketContext = createContext(null);

/**
 * Socket Provider Component
 * Manages socket connection lifecycle and provides socket methods to children
 */
export const SocketProvider = ({ children }) => {
    // Track connection state
    const [isConnected, setIsConnected] = useState(false);
    // Track currently active chat (if any)
    const [activeChatId, setActiveChatId] = useState(null);
    
    // Get authenticated user from AuthContext
    const { user, isAuthenticated } = useContext(AuthContext);
    
    // Get unread messages functions
    const { checkAndUpdateUnreadMessages } = useUnreadMessages();

    /**
     * Update unread messages when a new message is received
     * @param {Object} message - The received message
     */
    const handleNewMessage = useCallback(async (message) => {
        if (!message || !message.chatId || !user) return;
        
        try {
            // Don't mark messages as unread if the user is currently viewing that chat
            if (activeChatId === message.chatId) {
                return;
            }
            
            // Don't mark own messages as unread
            if (message.senderId === user._id || 
                message.senderUserId === user._id ||
                (message.sender && message.sender._id === user._id)) {
                return;
            }
            
            // Update unread messages in AsyncStorage
            const unreadDataJson = await AsyncStorage.getItem('unreadChats');
            let unreadChats = unreadDataJson ? JSON.parse(unreadDataJson) : {};
            
            // Update or add the chat to the unread list
            unreadChats[message.chatId] = {
                lastMessage: message.text || 'New message',
                timestamp: new Date().toISOString(),
                count: (unreadChats[message.chatId]?.count || 0) + 1,
            };
            
            // Save updated unread messages
            await AsyncStorage.setItem('unreadChats', JSON.stringify(unreadChats));
            await AsyncStorage.setItem('hasUnreadChats', JSON.stringify(true));
            
            console.log('SocketProvider: Updated unread messages for chat', message.chatId);
        } catch (error) {
            console.error('SocketProvider: Error updating unread messages:', error);
        }
    }, [user, activeChatId]);
    
    useEffect(() => {
        let socketCleanup;

        if (isAuthenticated && user?._id) {
            console.log('SocketProvider: User authenticated, connecting socket');
            
            // Connect to socket server
            socketService.connect(user._id)
                .then(() => {
                    setIsConnected(true);
                    console.log('SocketProvider: Socket connected successfully');
                })
                .catch(error => {
                    console.error('SocketProvider: Socket connection error:', error);
                    setIsConnected(false);
                });
                
            // Setup connection status listener
            const handleConnect = () => setIsConnected(true);
            const handleDisconnect = () => setIsConnected(false);
            
            // Setup message listener at the top level
            socketService.on('receive_message', handleNewMessage);
            
            socketService.on('connect', handleConnect);
            socketService.on('disconnect', handleDisconnect);
            
            // Cleanup function
            socketCleanup = () => {
                socketService.off('receive_message', handleNewMessage);
                socketService.off('connect', handleConnect);
                socketService.off('disconnect', handleDisconnect);
            };
        } else if (!isAuthenticated || !user) {
            // Disconnect socket when user logs out
            console.log('SocketProvider: User not authenticated, disconnecting socket');
            socketService.disconnect();
            setIsConnected(false);
        }
        
        // Cleanup socket listeners on unmount or auth change
        return () => {
            if (socketCleanup) socketCleanup();
        };
    }, [isAuthenticated, user, handleNewMessage]);

    // Expose emit method
    const emit = useCallback((event, payload) => {
        if (!isConnected) {
            console.warn('SocketProvider: Cannot emit, socket not connected');
            return;
        }
        socketService.emit(event, payload);
    }, [isConnected]);
    
    // Expose on method (for adding listeners)
    const on = useCallback((event, callback) => {
        socketService.on(event, callback);
    }, []);
    
    // Expose off method (for removing listeners)
    const off = useCallback((event, callback) => {
        socketService.off(event, callback);
    }, []);    /**
     * Set the active chat ID to prevent marking messages as unread
     * when user is actively viewing a chat
     * @param {string|null} chatId - The active chat ID or null
     */
    const setActiveChat = useCallback((chatId) => {
        console.log('SocketProvider: Setting active chat ID to', chatId);
        setActiveChatId(chatId);
    }, []);

    // Context value
    const contextValue = {
        isConnected,
        userId: user?._id,
        emit,
        on,
        off,
        activeChatId,
        setActiveChat
    };

    return (
        <SocketContext.Provider value={contextValue}>
            {children}
        </SocketContext.Provider>
    );
};

export default SocketContext;
