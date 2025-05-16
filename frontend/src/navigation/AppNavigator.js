import React, { useContext, useState, useEffect } from "react"; // Added useState, useEffect
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { View } from "react-native";
import { AuthContext } from "../contexts/AuthContext";
import { ChatNotificationContext } from "../contexts/ChatNotificationContext";
import { navigationRef } from '../../App';
import useNotifications from "../hooks/useNotifications"; // Import the custom hook
import theme from "../styles/theme";

// Auth screens
import SplashScreen from "../screens/auth/SplashScreen";
import LoginScreen from "../screens/auth/LoginScreen";
import RegisterScreen from "../screens/auth/RegisterScreen";
import PetProfileSetupScreen from "../screens/auth/PetProfileSetupScreen";

// Main app screens
import HomeScreen from "../screens/HomeScreen";
import FinderScreen from "../screens/FinderScreen";
import ChatListScreen from "../screens/ChatListScreen";
import ChatScreen from "../screens/ChatScreen";
import ProfileScreen from "../screens/ProfileScreen";
import PetProfileScreen from "../screens/PetProfileScreen";
import EditPetProfileScreen from "../screens/EditPetProfileScreen";
import SettingsScreen from "../screens/SettingsScreen";

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();


const AuthStack = () => {
    const { authError } = useContext(AuthContext);
    
    return (
        <Stack.Navigator 
            screenOptions={{ headerShown: false }}
            initialRouteName={authError ? "Login" : "Splash"}>
            <Stack.Screen name="Splash" component={SplashScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
        </Stack.Navigator>
    );
};


const MainTabs = () => {

    const { hasUnreadChats } = useContext(ChatNotificationContext);
    
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                tabBarIcon: ({ focused, color, size }) => {
                    let iconName;

                    if (route.name === "Home") {
                        iconName = focused ? "home" : "home-outline";
                    } else if (route.name === "Finder") {
                        iconName = focused ? "search" : "search-outline";
                    } else if (route.name === "Chats") {
                        iconName = focused ? "chatbubbles" : "chatbubbles-outline";
                    } else if (route.name === "Profile") {
                        iconName = focused ? "person" : "person-outline";
                    }

                    return <Ionicons name={iconName} size={size} color={color} />;
                },
                tabBarActiveTintColor: "#FF6B6B",
                tabBarInactiveTintColor: "gray",
                headerShown: false,
            })}>
            <Tab.Screen name="Home" component={HomeScreen} />
            <Tab.Screen name="Finder" component={FinderScreen} />
            <Tab.Screen 
                name="Chats" 
                component={ChatListScreen} 
                options={{
                    tabBarIcon: ({ focused, color, size }) => {
                        return (
                            <View style={{ width: 24, height: 24, justifyContent: 'center', alignItems: 'center' }}>
                                <Ionicons 
                                    name={focused ? "chatbubbles" : "chatbubbles-outline"} 
                                    size={size} 
                                    color={color} 
                                />
                                {hasUnreadChats && (
                                    <View 
                                        style={{
                                            position: 'absolute',
                                            top: 0,
                                            right: -6,
                                            width: 8,
                                            height: 8,
                                            borderRadius: 4,
                                            backgroundColor: theme.colors.primary,
                                        }}
                                    />
                                )}
                            </View>
                        );
                    },
                }}
            />
            <Tab.Screen name="Profile" component={ProfileScreen} />
        </Tab.Navigator>
    );
};


const MainStack = () => {
    const { hasPets } = useContext(AuthContext);
    
    return (
        <Stack.Navigator 
            initialRouteName={hasPets ? "MainTabs" : "PetProfileSetup"}
            screenOptions={{ headerShown: false }}
        >
            <Stack.Screen name="MainTabs" component={MainTabs} />
            <Stack.Screen
                name="Chat"
                component={ChatScreen}
                options={{ headerShown: true }}
            />
            <Stack.Screen
                name="PetProfile"
                component={PetProfileScreen}
                options={{ headerShown: false }}
            />
            <Stack.Screen
                name="EditPetProfile"
                component={EditPetProfileScreen}
                options={{ headerShown: false }}
            />
            <Stack.Screen
                name="PetProfileSetup"
                component={PetProfileSetupScreen}
                options={{ headerShown: false }}
            />
            <Stack.Screen
                name="Settings"
                component={SettingsScreen}
                options={{ headerShown: false }}
            />
        </Stack.Navigator>
    );
};


const AppNavigator = () => {
    const { isAuthenticated, isLoading } = useContext(AuthContext);
    const [initialLoad, setInitialLoad] = useState(true);
    
    useEffect(() => {
        if (!isLoading && initialLoad) {
            setInitialLoad(false);
        }
    }, [isLoading]);

    useNotifications(isAuthenticated); 

    if (isLoading && initialLoad) {
        return <SplashScreen />;
    }

    return (
        <NavigationContainer ref={navigationRef}>
            {isAuthenticated ? (
                <MainStack />
            ) : (
                <AuthStack />
            )}
        </NavigationContainer>
    );
};

export default AppNavigator;
