import React, { useContext } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { AuthContext } from "../contexts/AuthContext";

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

// Authentication stack navigator
const AuthStack = () => (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen
            name="PetProfileSetup"
            component={PetProfileSetupScreen}
        />
    </Stack.Navigator>
);

// Main tab navigator for the app
const MainTabs = () => (
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
        <Tab.Screen name="Chats" component={ChatListScreen} />
        <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
);

// Main stack navigator including the tab navigator
const MainStack = () => (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
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
            options={{ headerShown: false}}
        />
        <Stack.Screen
            name="Settings"
            component={SettingsScreen}
            options={{ headerShown: false }}
        />
    </Stack.Navigator>
);

// Root navigator that handles auth state
const AppNavigator = () => {
    const { isAuthenticated, isLoading } = useContext(AuthContext);

    // If still checking auth state, show nothing or a loading screen
    if (isLoading) {
        return <SplashScreen />;
    }

    return (
        <NavigationContainer>
            {isAuthenticated ? <MainStack /> : <AuthStack />}
        </NavigationContainer>
    );
};

export default AppNavigator;
