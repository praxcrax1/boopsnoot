import React from "react";
import {
    TouchableOpacity,
    Text,
    StyleSheet,
    ActivityIndicator,
    View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const Button = ({
    title,
    onPress,
    type = "primary",
    disabled = false,
    loading = false,
    icon = null,
    iconPosition = "left",
    style,
    textStyle,
}) => {
    const buttonStyles = [
        styles.button,
        type === "primary" && styles.primaryButton,
        type === "secondary" && styles.secondaryButton,
        type === "danger" && styles.dangerButton,
        disabled && styles.disabledButton,
        style,
    ];

    const textStyles = [
        styles.buttonText,
        type === "primary" && styles.primaryButtonText,
        type === "secondary" && styles.secondaryButtonText,
        type === "danger" && styles.dangerButtonText,
        disabled && styles.disabledButtonText,
        textStyle,
    ];

    const iconColor = type === "secondary" ? "#333" : "#FFF";

    const renderIcon = () => {
        if (!icon) return null;

        return (
            <Ionicons
                name={icon}
                size={20}
                color={iconColor}
                style={
                    iconPosition === "left" ? styles.leftIcon : styles.rightIcon
                }
            />
        );
    };

    return (
        <TouchableOpacity
            style={buttonStyles}
            onPress={onPress}
            disabled={disabled || loading}>
            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator 
                        size="small" 
                        color={type === "secondary" ? "#333" : "#FFF"} 
                    />
                    {/* Keep title visible during loading state */}
                    {icon === "logo-google" && (
                        <Text style={[textStyles, styles.loadingText]}>
                            {title.includes("Google") ? "Connecting..." : "Loading..."}
                        </Text>
                    )}
                </View>
            ) : (
                <>
                    {icon && iconPosition === "left" && renderIcon()}
                    <Text style={textStyles}>{title}</Text>
                    {icon && iconPosition === "right" && renderIcon()}
                </>
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    button: {
        padding: 15,
        borderRadius: 10,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        marginBottom: 15,
    },
    primaryButton: {
        backgroundColor: "#FF6B6B",
    },
    secondaryButton: {
        backgroundColor: "#FFF",
    },
    dangerButton: {
        backgroundColor: "#E74C3C",
    },
    disabledButton: {
        opacity: 0.5,
    },
    buttonText: {
        fontSize: 16,
        fontWeight: "bold",
    },
    primaryButtonText: {
        color: "#FFF",
    },
    secondaryButtonText: {
        color: "#333",
    },
    dangerButtonText: {
        color: "#FFF",
    },
    disabledButtonText: {
        color: "#FFF",
    },
    leftIcon: {
        marginRight: 8,
    },
    rightIcon: {
        marginLeft: 8,
    },
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingText: {
        marginLeft: 8,
    }
});

export default Button;
