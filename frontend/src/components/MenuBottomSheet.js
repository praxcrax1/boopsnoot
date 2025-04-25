import React, { useEffect, useRef } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    Animated,
    FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import theme from "../styles/theme";

const MenuBottomSheet = ({ visible, onClose, options, title = "Options" }) => {
    const slideAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
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
    }, [visible]);

    const modalTranslateY = slideAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [300, 0],
    });

    const handleSelectOption = (option) => {
        onClose();
        if (option.onPress) {
            option.onPress();
        }
    };

    return (
        <Modal
            animationType="fade"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}>
            <TouchableOpacity 
                style={styles.modalOverlay} 
                activeOpacity={1} 
                onPress={onClose}>
                <Animated.View
                    style={[
                        styles.modalContent,
                        { transform: [{ translateY: modalTranslateY }] },
                    ]}>
                    <TouchableOpacity activeOpacity={1} onPress={e => e.stopPropagation()}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalHeaderText}>{title}</Text>
                            <TouchableOpacity onPress={onClose}>
                                <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
                            </TouchableOpacity>
                        </View>

                        <FlatList
                            data={options}
                            keyExtractor={(item, index) => `menu-option-${index}`}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={styles.optionItem}
                                    onPress={() => handleSelectOption(item)}>
                                    <View style={styles.optionContent}>
                                        {item.icon && (
                                            <Ionicons
                                                name={item.icon}
                                                size={20}
                                                color={theme.colors.textPrimary}
                                                style={styles.optionIcon}
                                            />
                                        )}
                                        <Text style={styles.optionText}>{item.label}</Text>
                                    </View>
                                </TouchableOpacity>
                            )}
                        />
                    </TouchableOpacity>
                </Animated.View>
            </TouchableOpacity>
        </Modal>
    );
};

const styles = StyleSheet.create({
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
        maxHeight: "50%",
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
    optionContent: {
        flexDirection: "row",
        alignItems: "center",
    },
    optionIcon: {
        marginRight: theme.spacing.md,
    },
    optionText: {
        fontSize: theme.typography.fontSize.md,
        color: theme.colors.textPrimary,
    },
});

export default MenuBottomSheet;