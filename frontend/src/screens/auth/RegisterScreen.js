import React, { useState, useContext, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    Alert,
    ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native";
import { AuthContext } from "../../contexts/AuthContext";
import {
    validateName,
    validateEmail,
    validatePassword,
    validatePasswordMatch,
} from "../../utils/validation";
import InputField from "../../components/InputField";
import Button from "../../components/Button";
import GoogleAuthService from "../../services/GoogleAuthService";

const RegisterScreen = ({ navigation }) => {
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        password: "",
        confirmPassword: "",
    });
    const [touched, setTouched] = useState({
        name: false,
        email: false,
        password: false,
        confirmPassword: false,
    });
    const [errors, setErrors] = useState({
        name: null,
        email: null,
        password: null,
        confirmPassword: null,
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);

    const { register, loginWithGoogle } = useContext(AuthContext);

    // Validate form fields whenever formData changes
    useEffect(() => {
        validateField("name", formData.name);
        validateField("email", formData.email);
        validateField("password", formData.password);
        validateField(
            "confirmPassword",
            formData.confirmPassword,
            formData.password
        );
    }, [formData]);

    const validateField = (fieldName, value, compareValue = null) => {
        let error = null;

        switch (fieldName) {
            case "name":
                error = validateName(value);
                break;
            case "email":
                error = validateEmail(value);
                break;
            case "password":
                error = validatePassword(value);
                break;
            case "confirmPassword":
                error = validatePasswordMatch(compareValue, value);
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
            name: true,
            email: true,
            password: true,
            confirmPassword: true,
        };
        setTouched(allTouched);

        // Validate all fields
        const nameError = validateField("name", formData.name);
        const emailError = validateField("email", formData.email);
        const passwordError = validateField("password", formData.password);
        const confirmPasswordError = validateField(
            "confirmPassword",
            formData.confirmPassword,
            formData.password
        );

        return (
            !nameError && !emailError && !passwordError && !confirmPasswordError
        );
    };

    const handleRegister = async () => {
        if (!validateForm()) {
            return;
        }

        setIsSubmitting(true);
        try {
            const result = await register({
                name: formData.name,
                email: formData.email,
                password: formData.password,
            });

            if (result.success) {
                navigation.navigate("PetProfileSetup")
            }
        } catch (error) {
            Alert.alert(
                "Registration Failed",
                error.message || "Failed to register. Please try again."
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleGoogleSignup = async () => {
        try {
            setIsGoogleLoading(true);
            
            const result = await GoogleAuthService.signInWithGoogle();
            
            if (result.success) {
                // Use the token to log in via our backend
                const loginResult = await loginWithGoogle(result.accessToken);
                
                if (loginResult.success) {
                    Alert.alert(
                        "Registration Successful",
                        "Let's set up your pet profile!",
                        [
                            {
                                text: "Continue",
                                onPress: () =>
                                    navigation.navigate("PetProfileSetup"),
                            },
                        ],
                        { cancelable: false }
                    );
                }
            } else {
                Alert.alert("Authentication Failed", result.error);
            }
        } catch (error) {
            console.error("Google auth error:", error);
            Alert.alert(
                "Authentication Error",
                error.message || "Failed to authenticate with Google"
            );
        } finally {
            setIsGoogleLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContainer}>
                <KeyboardAvoidingView
                    style={styles.keyboardAvoidingView}
                    behavior={Platform.OS === "ios" ? "padding" : "height"}>
                    <View style={styles.headerContainer}>
                        <Text style={styles.headerText}>Create Account</Text>
                        <Text style={styles.subHeaderText}>
                            Register to find playmates for your pet
                        </Text>
                    </View>

                    <View style={styles.formContainer}>
                        <InputField
                            placeholder="Full Name"
                            value={formData.name}
                            onChangeText={(value) =>
                                handleChange("name", value)
                            }
                            autoCapitalize="words"
                            error={errors.name}
                            touched={touched.name}
                            onBlur={() => handleBlur("name")}
                            required
                        />

                        <InputField
                            placeholder="Email"
                            value={formData.email}
                            onChangeText={(value) =>
                                handleChange("email", value)
                            }
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

                        <InputField
                            placeholder="Confirm Password"
                            value={formData.confirmPassword}
                            onChangeText={(value) =>
                                handleChange("confirmPassword", value)
                            }
                            secureTextEntry
                            error={errors.confirmPassword}
                            touched={touched.confirmPassword}
                            onBlur={() => handleBlur("confirmPassword")}
                            required
                        />

                        <Button
                            title={
                                isSubmitting
                                    ? "Creating Account..."
                                    : "Register"
                            }
                            onPress={handleRegister}
                            disabled={isSubmitting}
                            loading={isSubmitting}
                        />
                        
                        <View style={styles.orContainer}>
                            <View style={styles.divider} />
                            <Text style={styles.orText}>OR</Text>
                            <View style={styles.divider} />
                        </View>
                        
                        <Button
                            title={isGoogleLoading ? "Connecting to Google..." : "Sign up with Google"}
                            onPress={handleGoogleSignup}
                            type="secondary"
                            style={styles.googleButton}
                            textStyle={styles.googleButtonText}
                            disabled={isGoogleLoading}
                            loading={isGoogleLoading}
                            icon="logo-google"
                            iconPosition="left"
                        />
                    </View>

                    <View style={styles.footerContainer}>
                        <Text style={styles.footerText}>
                            Already have an account?{" "}
                        </Text>
                        <Button
                            title="Login"
                            onPress={() => navigation.navigate("Login")}
                            type="secondary"
                            style={styles.textButton}
                            textStyle={styles.footerLink}
                        />
                    </View>
                </KeyboardAvoidingView>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#FFF",
    },
    scrollContainer: {
        flexGrow: 1,
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
    headerText: {
        fontSize: 28,
        fontWeight: "bold",
        marginBottom: 10,
        color: "#333",
    },
    subHeaderText: {
        fontSize: 16,
        color: "#666",
        textAlign: "center",
    },
    formContainer: {
        marginBottom: 30,
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
    googleButton: {
        backgroundColor: "#FFF",
        borderWidth: 1,
        borderColor: "#DDD",
    },
    googleButtonText: {
        color: "#333",
    },
    orContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 15,
    },
    divider: {
        flex: 1,
        height: 1,
        backgroundColor: '#DDDDDD',
    },
    orText: {
        marginHorizontal: 10,
        color: '#666666',
        fontSize: 14,
        fontWeight: '600',
    },
});

export default RegisterScreen;
