import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { AppState, Platform } from 'react-native';
import { navigationRef } from '../../App';
import ApiClient from '../services/ApiClient';

// Create API client instance
const apiClient = new ApiClient();

// --- Notification Handler Setup (runs once when the module is loaded) ---
Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
        const appState = AppState.currentState;
        const currentRoute = navigationRef.current?.getCurrentRoute?.();
        const notificationChatId = notification.request.content.data?.chatId;

        // Check if app is active AND user is on the specific chat screen for the notification
        const isOnRelevantChatScreen = 
            appState === 'active' && 
            currentRoute?.name === 'Chat' && 
            currentRoute.params?.chatId === notificationChatId;

        console.log(`[NotificationHandler] AppState: ${appState}, CurrentRoute: ${currentRoute?.name}, NotificationChatId: ${notificationChatId}, IsOnRelevantChat: ${isOnRelevantChatScreen}`);

        return {
            shouldShowAlert: !isOnRelevantChatScreen, // Show alert unless on the specific chat screen
            shouldPlaySound: !isOnRelevantChatScreen, // Play sound unless on the specific chat screen
            shouldSetBadge: true, // Always allow badge update
        };
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
        
        // Send the token to your backend server
        try {
            await apiClient.post('/users/push-token', { token });
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

// --- The Custom Hook ---
const useNotifications = (isAuthenticated) => {
    const notificationListener = useRef();
    const responseListener = useRef();

    useEffect(() => {
        // Only run setup if authenticated
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
                
                if (data.chatId && navigationRef.current && navigationRef.current.isReady()) {
                    console.log('[useNotifications] Navigating to chat from notification:', data.chatId);
                    navigationRef.current.navigate('Chat', { chatId: data.chatId });
                }
            });

            // Optional: Listener for notifications received while app is foregrounded
            notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
                console.log('[useNotifications] Notification received while app foregrounded:', notification.request.content);
                // You could potentially trigger a local state update here if needed
            });

            // Cleanup listeners on hook unmount or when auth state changes to false
            return () => {
                console.log("[useNotifications] Cleaning up notification listeners.");
                if (notificationListener.current) {
                    Notifications.removeNotificationSubscription(notificationListener.current);
                }
                if (responseListener.current) {
                    Notifications.removeNotificationSubscription(responseListener.current);
                }
            };
        } else {
            console.log("[useNotifications] User not authenticated, skipping setup.");
            // Ensure cleanup runs if auth state changes from true to false
            return () => {};
        }
    }, [isAuthenticated]); // Re-run effect if authentication state changes

    // The hook doesn't need to return anything for this use case
};

export default useNotifications;
