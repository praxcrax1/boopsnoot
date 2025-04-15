import React, { useState, useContext, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    Alert,
    Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AuthContext } from "../../contexts/AuthContext";
import { validateEmail, validatePassword } from "../../utils/validation";
import InputField from "../../components/InputField";
import Button from "../../components/Button";

const LoginScreen = ({ navigation }) => {
    const [formData, setFormData] = useState({
        email: "",
        password: "",
    });
    const [touched, setTouched] = useState({
        email: false,
        password: false,
    });
    const [errors, setErrors] = useState({
        email: null,
        password: null,
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { login } = useContext(AuthContext);

    // Validate form fields when they change
    useEffect(() => {
        validateField("email", formData.email);
        validateField("password", formData.password);
    }, [formData]);

    const validateField = (fieldName, value) => {
        let error = null;

        switch (fieldName) {
            case "email":
                error = validateEmail(value);
                break;
            case "password":
                error = validatePassword(value);
                break;
            default:
                break;
        }

        setErrors((prev) => ({ ...prev, [fieldName]: error }));
        return error;
    };

    const handleChange = (field, value) => {
        setFormData({
            ...formData,
            [field]: value,
        });
    };

    const handleBlur = (field) => {
        setTouched({
            ...touched,
            [field]: true,
        });
    };

    const validateForm = () => {
        // Mark all fields as touched to show errors
        const allTouched = {
            email: true,
            password: true,
        };
        setTouched(allTouched);

        // Check if there are any errors
        const emailError = validateField("email", formData.email);
        const passwordError = validateField("password", formData.password);

        return !emailError && !passwordError;
    };

    const handleLogin = async () => {
        if (!validateForm()) {
            return;
        }

        setIsSubmitting(true);
        try {
            await login(formData.email, formData.password);
            // Success - AuthContext will update user state and navigator will switch to app stack
        } catch (error) {
            Alert.alert(
                "Login Failed",
                error.message || "Failed to login. Please try again."
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleGoogleLogin = async () => {
        Alert.alert("Info", "Google login would be implemented here.");
        // Implementation would require expo-auth-session or react-native-google-signin
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                style={styles.keyboardAvoidingView}
                behavior={Platform.OS === "ios" ? "padding" : "height"}>
                <View style={styles.headerContainer}>
                    <Image
                        source={require("../../assets/splash-icon.png")}
                        style={styles.logo}
                        resizeMode="contain"
                    />
                    <Text style={styles.headerText}>Welcome Back!</Text>
                    <Text style={styles.subHeaderText}>Login to continue</Text>
                </View>

                <View style={styles.formContainer}>
                    <InputField
                        placeholder="Email"
                        value={formData.email}
                        onChangeText={(value) => handleChange("email", value)}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        error={errors.email}
                        touched={touched.email}
                        onBlur={() => handleBlur("email")}
                        required
                    />

                    <InputField
                        placeholder="Password"
                        value={formData.password}
                        onChangeText={(value) =>
                            handleChange("password", value)
                        }
                        secureTextEntry
                        error={errors.password}
                        touched={touched.password}
                        onBlur={() => handleBlur("password")}
                        required
                    />

                    <Button
                        title={isSubmitting ? "Logging in..." : "Login"}
                        onPress={handleLogin}
                        disabled={isSubmitting}
                        loading={isSubmitting}
                    />

                    <Button
                        title="Continue with Google"
                        onPress={handleGoogleLogin}
                        type="secondary"
                        style={styles.googleButton}
                        textStyle={styles.googleButtonText}
                    />
                </View>

                <View style={styles.footerContainer}>
                    <Text style={styles.footerText}>
                        Don't have an account?{" "}
                    </Text>
                    <Button
                        title="Register"
                        onPress={() => navigation.navigate("Register")}
                        type="secondary"
                        style={styles.textButton}
                        textStyle={styles.footerLink}
                    />
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#FFF",
    },
    keyboardAvoidingView: {
        flex: 1,
        padding: 20,
        justifyContent: "center",
    },
    headerContainer: {
        alignItems: "center",
        marginBottom: 40,
    },
    logo: {
        width: 100,
        height: 100,
        marginBottom: 20,
    },
    headerText: {
        fontSize: 28,
        fontWeight: "bold",
        marginBottom: 10,
        color: "#333",
    },
    subHeaderText: {
        fontSize: 16,
        color: "#666",
    },
    formContainer: {
        marginBottom: 30,
    },
    googleButton: {
        backgroundColor: "#FFF",
        borderWidth: 1,
        borderColor: "#DDD",
    },
    googleButtonText: {
        color: "#333",
    },
    footerContainer: {
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
    },
    footerText: {
        fontSize: 16,
        color: "#666",
    },
    footerLink: {
        fontSize: 16,
        color: "#FF6B6B",
        fontWeight: "bold",
    },
    textButton: {
        backgroundColor: "transparent",
        padding: 0,
        marginBottom: 0,
        height: 20,
    },
});

export default LoginScreen;
