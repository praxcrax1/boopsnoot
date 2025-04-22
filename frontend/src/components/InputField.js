import React from "react";
import { TextInput, StyleSheet, View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import theme from '../styles/theme';

const InputField = ({
    label,
    value,
    onChangeText,
    placeholder,
    secureTextEntry = false,
    keyboardType = "default",
    multiline = false,
    numberOfLines,
    textAlignVertical,
    autoCapitalize = "none",
    style,
    required = false,
    error = null,
    touched = false,
    onBlur = () => {},
    isNumeric = false,
}) => {
    // Set the keyboard type to numeric when isNumeric is true
    const inputKeyboardType = isNumeric ? "numeric" : keyboardType;
    
    // Handle numeric input conversion
    const handleChangeText = (text) => {
        if (isNumeric) {
            // For numeric fields, either pass the number or empty string
            const numericValue = text.trim() === '' ? '' : text;
            onChangeText(numericValue);
        } else {
            // For non-numeric fields, pass the text as-is
            onChangeText(text);
        }
    };
    
    return (
        <View style={styles.container}>
            {label && (
                <Text style={styles.label}>
                    {label}{" "}
                    {required && <Text style={styles.requiredMark}>*</Text>}
                </Text>
            )}
            <View
                style={[
                    styles.inputContainer,
                    error && touched && styles.errorInput,
                    style,
                ]}>
                <TextInput
                    style={[styles.input, multiline && styles.textArea]}
                    placeholder={placeholder}
                    placeholderTextColor={theme.colors.placeholder}
                    value={String(value)} // Convert to string to ensure compatibility
                    onChangeText={handleChangeText}
                    secureTextEntry={secureTextEntry}
                    keyboardType={inputKeyboardType}
                    multiline={multiline}
                    numberOfLines={numberOfLines}
                    textAlignVertical={textAlignVertical}
                    autoCapitalize={autoCapitalize}
                    onBlur={onBlur}
                />
                {touched && error && (
                    <Ionicons
                        name="alert-circle"
                        size={20}
                        color={theme.colors.error}
                        style={styles.errorIcon}
                    />
                )}
            </View>
            {touched && error && <Text style={styles.errorText}>{error}</Text>}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: theme.spacing.xl,
    },
    label: {
        fontSize: theme.typography.fontSize.md,
        fontWeight: theme.typography.fontWeight.medium,
        color: theme.colors.textPrimary,
        marginBottom: theme.spacing.sm,
    },
    requiredMark: {
        color: theme.colors.primary,
    },
    inputContainer: {
        backgroundColor: theme.colors.backgroundVariant,
        borderRadius: theme.borderRadius.sm,
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1,
        borderColor: "transparent",
    },
    input: {
        flex: 1,
        padding: theme.spacing.md,
        fontSize: theme.typography.fontSize.md,
        borderWidth: 1,
        borderColor: theme.colors.inputBorder,
        borderRadius: theme.borderRadius.sm,
        color: theme.colors.textPrimary,
    },
    textArea: {
        height: 100,
        textAlignVertical: "top",
    },
    errorInput: {
        borderColor: theme.colors.error,
        borderWidth: 1,
    },
    errorText: {
        color: theme.colors.error,
        fontSize: theme.typography.fontSize.xs,
        marginTop: theme.spacing.xs,
        marginLeft: theme.spacing.xs,
    },
    errorIcon: {
        marginRight: theme.spacing.md,
    },
});

export default InputField;
