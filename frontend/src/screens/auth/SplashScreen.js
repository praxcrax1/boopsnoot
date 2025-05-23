import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform } from "react-native";
import { SafeAreaView } from "react-native";
import theme from '../../styles/theme';

const SplashScreen = ({ navigation }) => {
    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                <View style={styles.logoContainer}>
                    <Image
                        source={require("../../assets/boopsnoot.png")}
                        style={styles.logo}
                        resizeMode="contain"
                    />
                    <Text style={styles.appName}>BoopSnoot</Text>
                    <Text style={styles.tagline}>
                        Find playmates for your pets!
                    </Text>
                </View>

                <View style={styles.buttonContainer}>
                    <TouchableOpacity
                        style={styles.button}
                        onPress={() => navigation.navigate("Login")}>
                        <Text style={styles.buttonText}>Get Started</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: theme.colors.background,
        // Apply different padding for iOS to handle notch and bottom area
        ...Platform.select({
            ios: {
                paddingTop: 50,
                paddingBottom: 34,
            },
        }),
    },
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
        justifyContent: "space-between",
        padding: theme.spacing.xl,
    },
    logoContainer: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    logo: {
        width: 200,
        height: 200,
        marginBottom: theme.spacing.xl,
    },
    appName: {
        fontSize: theme.typography.fontSize.display,
        fontWeight: theme.typography.fontWeight.bold,
        color: theme.colors.textPrimary,
        marginBottom: theme.spacing.md,
    },
    tagline: {
        fontSize: theme.typography.fontSize.lg,
        color: theme.colors.textSecondary,
    },
    buttonContainer: {
        width: "100%",
        paddingBottom: Platform.OS === 'ios' ? 0 : theme.spacing.xl,
    },
    button: {
        backgroundColor: theme.colors.primary,
        padding: theme.spacing.lg,
        borderRadius: theme.borderRadius.md,
        alignItems: "center",
    },
    buttonText: {
        color: theme.colors.onPrimary,
        fontSize: theme.typography.fontSize.lg,
        fontWeight: theme.typography.fontWeight.bold,
    },
});

export default SplashScreen;
