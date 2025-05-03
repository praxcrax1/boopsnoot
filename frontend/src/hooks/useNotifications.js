import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { AppState, Platform } from 'react-native';
import { navigationRef } from '../../App';
import AuthService from '../services/AuthService';

// --- Notification Handler Setup (runs once when the module is loaded) ---
Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
        const appState = AppState.currentState;
        const currentRoute = navigationRef.current?.getCurrentRoute?.();
        const notificationData = notification.request.content.data;
        const notificationType = notificationData?.type || 'chat';
        const notificationChatId = notificationData?.chatId;

        // Different handling based on notification type
        if (notificationType === 'match') {
            // For match notifications, always show alerts
            return {
                shouldShowAlert: true,
                shouldPlaySound: true,
                shouldSetBadge: true,
            };
        } else {
            // For chat notifications, only show if not already in that specific chat
            const isOnRelevantChatScreen = 
                appState === 'active' && 
                currentRoute?.name === 'Chat' && 
                currentRoute.params?.chatId === notificationChatId;

            console.log(`[NotificationHandler] AppState: ${appState}, CurrentRoute: ${currentRoute?.name}, NotificationChatId: ${notificationChatId}, IsOnRelevantChat: ${isOnRelevantChatScreen}`);

            return {
                shouldShowAlert: !isOnRelevantChatScreen, 
                shouldPlaySound: !isOnRelevantChatScreen,
                shouldSetBadge: true,
            };
        }
    },
});

// --- Helper Function for Registration ---
async function registerForPushNotificationsAsync() {
    let token;
    
    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF231F7C',
        });
    }

    // Check for existing permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    // Request permission if not already granted
    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }
    
    // Return null if permission was denied
    if (finalStatus !== 'granted') {
        console.log('[useNotifications] Failed to get push token permission!');
        return null;
    }
    
    try {
        // Get the token
        const response = await Notifications.getExpoPushTokenAsync({
            projectId: undefined, // Replace with your actual project ID if needed
        });
        token = response.data;
        
        console.log("[useNotifications] Expo Push Token:", token);
        
        // Send the token to the backend server using AuthService
        try {
            await AuthService.storePushToken(token);
            console.log("[useNotifications] Token sent to backend successfully");
        } catch (apiError) {
            console.error("[useNotifications] Failed to send token to backend:", apiError);
        }
    } catch (error) {
        console.error("[useNotifications] Error getting push token:", error);
        return null;
    }

    return token;
}

// Helper function to clear all notifications 
async function clearAllNotifications() {
    try {
        await Notifications.cancelAllScheduledNotificationsAsync();
        await Notifications.dismissAllNotificationsAsync();
        await Notifications.setBadgeCountAsync(0);
        console.log("[useNotifications] All notifications cleared");
    } catch (error) {
        console.error("[useNotifications] Error clearing notifications:", error);
    }
}

// --- The Custom Hook ---
const useNotifications = (isAuthenticated) => {
    const notificationListener = useRef();
    const responseListener = useRef();
    const prevAuthState = useRef(isAuthenticated);

    useEffect(() => {
        // Only proceed with notification setup if authenticated
        if (isAuthenticated) {
            console.log("[useNotifications] User authenticated, running setup.");
            
            // Register for push notifications and handle the token
            registerForPushNotificationsAsync().catch(error => {
                console.error("[useNotifications] Error in registration:", error);
            });

            // Listener for notification responses (taps)
            responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
                console.log('[useNotifications] Notification tapped:', response);
                const data = response.notification.request.content.data;
                
                // Only process notification taps if the user is authenticated
                if (isAuthenticated) {
                    if (data.type === 'match') {
                        // Handle match notification tap
                        console.log('[useNotifications] Match notification tapped:', data);
                        if (navigationRef.current && navigationRef.current.isReady()) {
                            // Navigate to the chat screen with the matched pet
                            navigationRef.current.navigate('Chat', { chatId: data.chatId, isNewMatch: true });
                        }
                    } else if (data.chatId) {
                        // Handle regular chat notification tap
                        console.log('[useNotifications] Chat notification tapped:', data.chatId);
                        if (navigationRef.current && navigationRef.current.isReady()) {
                            navigationRef.current.navigate('Chat', { chatId: data.chatId });
                        }
                    }
                } else {
                    console.log('[useNotifications] Ignoring notification tap because user is not authenticated');
                }
            });

            // Optional: Listener for notifications received while app is foregrounded
            notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
                console.log('[useNotifications] Notification received while app foregrounded:', notification.request.content);
                // You could potentially trigger a local state update here if needed
            });
        } else if (prevAuthState.current && !isAuthenticated) {
            // User just logged out (auth state changed from true to false)
            console.log("[useNotifications] User logged out, cleaning up notifications");
            
            // Clear all notifications when user logs out
            clearAllNotifications();
            
            // Clean up listeners if they exist
            if (notificationListener.current) {
                Notifications.removeNotificationSubscription(notificationListener.current);
                notificationListener.current = null;
            }
            
            if (responseListener.current) {
                Notifications.removeNotificationSubscription(responseListener.current);
                responseListener.current = null;
            }
        } else {
            console.log("[useNotifications] User not authenticated, skipping setup.");
        }
        
        // Update previous auth state for next render
        prevAuthState.current = isAuthenticated;

        // Cleanup listeners on hook unmount or when auth state changes
        return () => {
            console.log("[useNotifications] Cleaning up notification listeners.");
            if (notificationListener.current) {
                Notifications.removeNotificationSubscription(notificationListener.current);
                notificationListener.current = null;
            }
            if (responseListener.current) {
                Notifications.removeNotificationSubscription(responseListener.current);
                responseListener.current = null;
            }
        };
    }, [isAuthenticated]); // Re-run effect if authentication state changes
};

export default useNotifications;
