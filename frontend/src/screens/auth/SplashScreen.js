import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const SplashScreen = ({ navigation }) => {
    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.logoContainer}>
                <Image
                    source={require("../../assets/splash-icon.png")}
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
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#FFF",
        justifyContent: "space-between",
        padding: 20,
    },
    logoContainer: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    logo: {
        width: 200,
        height: 200,
        marginBottom: 20,
    },
    appName: {
        fontSize: 36,
        fontWeight: "bold",
        color: "#FF6B6B",
        marginBottom: 10,
    },
    tagline: {
        fontSize: 18,
        color: "#666",
    },
    buttonContainer: {
        width: "100%",
        paddingBottom: 20,
    },
    button: {
        backgroundColor: "#FF6B6B",
        padding: 15,
        borderRadius: 10,
        alignItems: "center",
    },
    buttonText: {
        color: "#FFF",
        fontSize: 18,
        fontWeight: "bold",
    },
});

export default SplashScreen;
