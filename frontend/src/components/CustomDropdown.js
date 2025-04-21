import React, { useState, useRef, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    FlatList,
    Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import theme from '../styles/theme';

const CustomDropdown = ({
    label,
    options,
    selectedValue,
    onValueChange,
    required = false,
    error = null,
    touched = false,
    onBlur = () => {},
    style,
    containerStyle,
}) => {
    const [modalVisible, setModalVisible] = useState(false);
    const slideAnim = useRef(new Animated.Value(0)).current;

    // Find the selected option's label
    const selectedOption = options.find(
        (option) => option.value === selectedValue
    );

    useEffect(() => {
        if (modalVisible) {
            // Slide up animation when modal opens
            Animated.timing(slideAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }).start();
        } else {
            // Reset animation value when modal closes
            slideAnim.setValue(0);
        }
    }, [modalVisible]);

    const handleClose = () => {
        setModalVisible(false);
        onBlur();
    };

    const modalTranslateY = slideAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [300, 0],
    });

    return (
        <View style={[styles.container, containerStyle]}>
            {label && (
                <Text style={styles.label}>
                    {label}{" "}
                    {required && <Text style={styles.requiredMark}>*</Text>}
                </Text>
            )}
            <TouchableOpacity
                style={[
                    styles.dropdownButton,
                    error && touched && styles.errorDropdown,
                    style,
                ]}
                onPress={() => setModalVisible(true)}>
                <Text style={styles.dropdownButtonText}>
                    {selectedOption ? selectedOption.label : "Select option"}
                </Text>
                <Ionicons name="chevron-down" size={18} color={theme.colors.icon} />
            </TouchableOpacity>

            {touched && error && <Text style={styles.errorText}>{error}</Text>}

            <Modal
                animationType="fade"
                transparent={true}
                visible={modalVisible}
                onRequestClose={handleClose}>
                <View style={styles.modalOverlay}>
                    <Animated.View
                        style={[
                            styles.modalContent,
                            { transform: [{ translateY: modalTranslateY }] },
                        ]}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalHeaderText}>{label}</Text>
                            <TouchableOpacity onPress={handleClose}>
                                <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
                            </TouchableOpacity>
                        </View>

                        <FlatList
                            data={options}
                            keyExtractor={(item) => item.value}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={[
                                        styles.optionItem,
                                        selectedValue === item.value &&
                                            styles.selectedOption,
                                    ]}
                                    onPress={() => {
                                        onValueChange(item.value);
                                        handleClose();
                                    }}>
                                    <Text
                                        style={[
                                            styles.optionText,
                                            selectedValue === item.value &&
                                                styles.selectedOptionText,
                                        ]}>
                                        {item.label}
                                    </Text>
                                </TouchableOpacity>
                            )}
                        />
                    </Animated.View>
                </View>
            </Modal>
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
    dropdownButton: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        borderWidth: 1,
        borderColor: theme.colors.inputBorder,
        borderRadius: theme.borderRadius.sm,
        backgroundColor: theme.colors.backgroundVariant,
        height: 48, // Match the InputField height
        paddingHorizontal: theme.spacing.md,
    },
    errorDropdown: {
        borderColor: theme.colors.error,
        borderWidth: 1,
    },
    dropdownButtonText: {
        fontSize: theme.typography.fontSize.md,
        color: theme.colors.textPrimary,
        flex: 1, // Take up available space
    },
    modalOverlay: {
        flex: 1,
        justifyContent: "flex-end",
        backgroundColor: "rgba(0,0,0,0.5)",
    },
    modalContent: {
        backgroundColor: theme.colors.background,
        borderTopLeftRadius: theme.borderRadius.xl,
        borderTopRightRadius: theme.borderRadius.xl,
        padding: theme.spacing.xl,
        paddingBottom: theme.spacing.xxxl,
        maxHeight: "70%",
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: theme.spacing.xl,
    },
    modalHeaderText: {
        fontSize: theme.typography.fontSize.lg,
        fontWeight: theme.typography.fontWeight.bold,
        color: theme.colors.textPrimary,
    },
    optionItem: {
        borderWidth: 1,
        borderColor: theme.colors.divider,
        borderRadius: theme.borderRadius.md,
        paddingVertical: theme.spacing.md,
        paddingHorizontal: theme.spacing.lg,
        margin: theme.spacing.xs,
    },
    selectedOption: {
        backgroundColor: theme.colors.primary,
        borderColor: theme.colors.primary,
    },
    optionText: {
        color: theme.colors.textPrimary,
    },
    selectedOptionText: {
        color: theme.colors.onPrimary,
    },
    errorText: {
        color: theme.colors.error,
        fontSize: theme.typography.fontSize.xs,
        marginTop: theme.spacing.xs,
        marginLeft: theme.spacing.xs,
    },
});

export default CustomDropdown;
