import React from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Platform,
    Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as IntentLauncher from 'expo-intent-launcher';
import theme from "../../styles/theme";

const LocationPermissionRequest = () => {
    const openSettings = async () => {
        if (Platform.OS === 'ios') {
            await Linking.openURL('app-settings:');
        } else {
            await IntentLauncher.startActivityAsync(
                IntentLauncher.ActivityAction.LOCATION_SOURCE_SETTINGS
            );
        }
    };

    return (
        <View style={styles.container}>
            <Ionicons 
                name="location-outline" 
                size={70} 
                color={theme.colors.primary} 
                style={styles.icon} 
            />
            
            <Text style={styles.title}>Location Access Required</Text>
            
            <Text style={styles.description}>
                We need access to your location to find playmates nearby for your pet.
                Please enable location services to continue.
            </Text>
            
            <TouchableOpacity 
                style={styles.button}
                onPress={openSettings}
            >
                <Text style={styles.buttonText}>Open Settings</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: theme.spacing.xxl,
        backgroundColor: theme.colors.backgroundVariant,
    },
    icon: {
        marginBottom: theme.spacing.xxl,
    },
    title: {
        fontSize: theme.typography.fontSize.xxl,
        fontWeight: theme.typography.fontWeight.bold,
        marginBottom: theme.spacing.md,
        color: theme.colors.textPrimary,
        textAlign: "center",
    },
    description: {
        fontSize: theme.typography.fontSize.md,
        textAlign: "center",
        marginBottom: theme.spacing.xxl,
        color: theme.colors.textSecondary,
        lineHeight: theme.typography.lineHeight.normal * theme.typography.fontSize.md,
        maxWidth: "80%",
    },
    button: {
        backgroundColor: theme.colors.primary,
        paddingVertical: theme.spacing.md,
        paddingHorizontal: theme.spacing.xxl,
        borderRadius: theme.borderRadius.md,
        ...theme.shadows.medium,
    },
    buttonText: {
        color: theme.colors.onPrimary,
        fontSize: theme.typography.fontSize.md,
        fontWeight: theme.typography.fontWeight.semiBold,
    },
});

export default LocationPermissionRequest;