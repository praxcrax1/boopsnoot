import React from "react";
import {
    TouchableOpacity,
    Text,
    StyleSheet,
    ActivityIndicator,
    View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import theme from '../styles/theme';

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

    const iconColor = type === "secondary" ? theme.colors.textPrimary : theme.colors.onPrimary;

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
                        color={type === "secondary" ? theme.colors.textPrimary : theme.colors.onPrimary} 
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
        padding: theme.spacing.lg,
        borderRadius: theme.borderRadius.md,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        marginBottom: theme.spacing.lg,
    },
    primaryButton: {
        backgroundColor: theme.colors.buttonPrimary,
    },
    secondaryButton: {
        backgroundColor: theme.colors.buttonSecondary,
    },
    dangerButton: {
        backgroundColor: theme.colors.buttonDanger,
    },
    disabledButton: {
        opacity: 0.5,
    },
    buttonText: {
        fontSize: theme.typography.fontSize.md,
        fontWeight: theme.typography.fontWeight.bold,
    },
    primaryButtonText: {
        color: theme.colors.onPrimary,
    },
    secondaryButtonText: {
        color: theme.colors.textPrimary,
    },
    dangerButtonText: {
        color: theme.colors.onPrimary,
    },
    disabledButtonText: {
        color: theme.colors.onPrimary,
    },
    leftIcon: {
        marginRight: theme.spacing.sm,
    },
    rightIcon: {
        marginLeft: theme.spacing.sm,
    },
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingText: {
        marginLeft: theme.spacing.sm,
    }
});

export default Button;
