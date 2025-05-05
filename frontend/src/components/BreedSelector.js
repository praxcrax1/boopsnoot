import React, { useState, useRef, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    FlatList,
    TextInput,
    Animated,
    Keyboard,
    TouchableWithoutFeedback,
    KeyboardAvoidingView,
    Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import theme from "../styles/theme";
import { DOG_BREEDS, CAT_BREEDS } from "../constants/petBreeds";

const BreedSelector = ({
    label,
    options,
    selectedValue,
    onValueChange,
    petType = "dog", // Default to dog breeds
    required = false,
    error = null,
    touched = false,
    onBlur = () => {},
    placeholder = "Search breeds...",
    style,
    containerStyle,
}) => {
    // If options not provided, use appropriate breeds based on petType
    const breedOptions =
        options || (petType === "cat" ? CAT_BREEDS : DOG_BREEDS);

    const [modalVisible, setModalVisible] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [filteredOptions, setFilteredOptions] = useState(breedOptions);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const slideAnim = useRef(new Animated.Value(0)).current;
    const inputRef = useRef(null);
    const flatListRef = useRef(null);

    // Find the selected option's label for display
    const selectedOption = breedOptions.find(
        (option) => option.value === selectedValue
    );

    useEffect(() => {
        // Filter options based on search query
        const filtered = breedOptions.filter((option) =>
            option.label.toLowerCase().includes(searchQuery.toLowerCase())
        );
        setFilteredOptions(filtered);

        // Reset selected index when search query changes
        setSelectedIndex(-1);
    }, [searchQuery, breedOptions]);

    useEffect(() => {
        if (modalVisible) {
            // Slide up animation when modal opens
            Animated.timing(slideAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }).start();

            // Focus the input field when modal opens
            setTimeout(() => {
                if (inputRef.current) {
                    inputRef.current.focus();
                }
            }, 100);
        } else {
            // Reset search query when modal closes
            setSearchQuery("");
            // Reset animation value
            slideAnim.setValue(0);
        }
    }, [modalVisible]);

    const handleClose = () => {
        setModalVisible(false);
        onBlur();
        Keyboard.dismiss();
    };

    const handleSelect = (item) => {
        onValueChange(item.value);
        handleClose();
    };

    const handleKeyPress = ({ nativeEvent }) => {
        // Handle keyboard navigation
        if (nativeEvent.key === "ArrowDown") {
            setSelectedIndex((prev) =>
                prev < filteredOptions.length - 1 ? prev + 1 : prev
            );
            // Scroll to the selected item
            if (selectedIndex >= 0 && flatListRef.current) {
                flatListRef.current.scrollToIndex({
                    index: selectedIndex + 1,
                    viewPosition: 0.5,
                });
            }
        } else if (nativeEvent.key === "ArrowUp") {
            setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
            // Scroll to the selected item
            if (selectedIndex > 0 && flatListRef.current) {
                flatListRef.current.scrollToIndex({
                    index: selectedIndex - 1,
                    viewPosition: 0.5,
                });
            }
        } else if (nativeEvent.key === "Enter" && selectedIndex >= 0) {
            // Select the currently highlighted item
            handleSelect(filteredOptions[selectedIndex]);
        }
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
                    styles.selectorButton,
                    error && touched && styles.errorSelector,
                    style,
                ]}
                onPress={() => setModalVisible(true)}
                activeOpacity={0.7}>
                <Text
                    style={[
                        styles.selectorButtonText,
                        !selectedOption && styles.placeholderText,
                    ]}
                    numberOfLines={1}
                    ellipsizeMode="tail">
                    {selectedOption ? selectedOption.label : "Select breed"}
                </Text>
                <Ionicons
                    name="chevron-down"
                    size={18}
                    color={theme.colors.icon}
                />
            </TouchableOpacity>

            {touched && error && <Text style={styles.errorText}>{error}</Text>}

            <Modal
                animationType="fade"
                transparent={true}
                visible={modalVisible}
                onRequestClose={handleClose}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    style={styles.keyboardAvoidingView}
                    keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}>
                    <TouchableWithoutFeedback onPress={handleClose}>
                        <View style={styles.modalOverlay}>
                            <TouchableWithoutFeedback
                                onPress={Keyboard.dismiss}>
                                <Animated.View
                                    style={[
                                        styles.modalContent,
                                        {
                                            transform: [
                                                { translateY: modalTranslateY },
                                            ],
                                        },
                                    ]}>
                                    <View style={styles.modalHeader}>
                                        <Text style={styles.modalHeaderText}>
                                            {label || `Select ${petType} Breed`}
                                        </Text>
                                        <TouchableOpacity onPress={handleClose}>
                                            <Ionicons
                                                name="close"
                                                size={24}
                                                color={theme.colors.textPrimary}
                                            />
                                        </TouchableOpacity>
                                    </View>

                                    <View style={styles.searchContainer}>
                                        <Ionicons
                                            name="search"
                                            size={20}
                                            color={theme.colors.textSecondary}
                                        />
                                        <TextInput
                                            ref={inputRef}
                                            style={styles.searchInput}
                                            placeholder={placeholder}
                                            placeholderTextColor={
                                                theme.colors.textSecondary
                                            }
                                            value={searchQuery}
                                            onChangeText={setSearchQuery}
                                            onKeyPress={handleKeyPress}
                                            autoCapitalize="none"
                                            autoCorrect={false}
                                        />
                                        {searchQuery ? (
                                            <TouchableOpacity
                                                onPress={() =>
                                                    setSearchQuery("")
                                                }>
                                                <Ionicons
                                                    name="close-circle"
                                                    size={20}
                                                    color={
                                                        theme.colors
                                                            .textSecondary
                                                    }
                                                />
                                            </TouchableOpacity>
                                        ) : null}
                                    </View>

                                    {filteredOptions.length === 0 ? (
                                        <View style={styles.noResultsContainer}>
                                            <Text style={styles.noResultsText}>
                                                No breeds found
                                            </Text>
                                        </View>
                                    ) : (
                                        <FlatList
                                            ref={flatListRef}
                                            data={filteredOptions}
                                            keyExtractor={(item) => item.value}
                                            renderItem={({ item, index }) => (
                                                <TouchableOpacity
                                                    style={[
                                                        styles.optionItem,
                                                        selectedValue ===
                                                            item.value &&
                                                            styles.selectedOption,
                                                        selectedIndex ===
                                                            index &&
                                                            styles.highlightedOption,
                                                    ]}
                                                    onPress={() =>
                                                        handleSelect(item)
                                                    }>
                                                    <Text
                                                        style={[
                                                            styles.optionText,
                                                            selectedValue ===
                                                                item.value &&
                                                                styles.selectedOptionText,
                                                            selectedIndex ===
                                                                index &&
                                                                styles.highlightedOptionText,
                                                        ]}
                                                        numberOfLines={1}
                                                        ellipsizeMode="tail">
                                                        {item.label}
                                                    </Text>
                                                    {selectedValue ===
                                                        item.value && (
                                                        <Ionicons
                                                            name="checkmark"
                                                            size={18}
                                                            color={
                                                                theme.colors
                                                                    .onPrimary
                                                            }
                                                        />
                                                    )}
                                                </TouchableOpacity>
                                            )}
                                            keyboardShouldPersistTaps="handled"
                                            keyboardDismissMode="on-drag"
                                            onScrollToIndexFailed={(info) => {
                                                // Handle scroll to index failure
                                                setTimeout(() => {
                                                    if (flatListRef.current) {
                                                        flatListRef.current.scrollToOffset(
                                                            {
                                                                offset:
                                                                    info.averageItemLength *
                                                                    info.index,
                                                                animated: true,
                                                            }
                                                        );
                                                    }
                                                }, 100);
                                            }}
                                            showsVerticalScrollIndicator={true}
                                            contentContainerStyle={
                                                styles.listContentContainer
                                            }
                                        />
                                    )}
                                </Animated.View>
                            </TouchableWithoutFeedback>
                        </View>
                    </TouchableWithoutFeedback>
                </KeyboardAvoidingView>
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
    selectorButton: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: theme.spacing.md,
        backgroundColor: theme.colors.backgroundVariant,
        paddingVertical: theme.spacing.md,
        borderRadius: theme.borderRadius.sm,
    },
    errorSelector: {
        borderColor: theme.colors.error,
        borderWidth: 1,
    },
    selectorButtonText: {
        fontSize: theme.typography.fontSize.md,
        color: theme.colors.textPrimary,
        flex: 1,
    },
    placeholderText: {
        color: theme.colors.textSecondary,
    },
    modalOverlay: {
        flex: 1,
        justifyContent: "flex-end",
        backgroundColor: "rgba(0,0,0,0.5)",
    },
    keyboardAvoidingView: {
        flex: 1,
        width: "100%",
        justifyContent: "flex-end",
    },
    modalContent: {
        backgroundColor: theme.colors.background,
        borderTopLeftRadius: theme.borderRadius.xl,
        borderTopRightRadius: theme.borderRadius.xl,
        paddingTop: theme.spacing.xl,
        paddingHorizontal: theme.spacing.xl,
        paddingBottom: Platform.OS === "ios" ? 40 : 20,
        maxHeight: "65%",
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: theme.spacing.lg,
    },
    modalHeaderText: {
        fontSize: theme.typography.fontSize.lg,
        fontWeight: theme.typography.fontWeight.bold,
        color: theme.colors.textPrimary,
    },
    searchContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: theme.colors.surfaceVariant,
        borderRadius: theme.borderRadius.md,
        marginBottom: theme.spacing.lg,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: Platform.OS === "ios" ? theme.spacing.md : 0,
    },
    searchInput: {
        flex: 1,
        fontSize: theme.typography.fontSize.md,
        color: theme.colors.textPrimary,
        paddingVertical: theme.spacing.sm,
        paddingHorizontal: theme.spacing.sm,
    },
    optionItem: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        borderWidth: 1,
        borderColor: theme.colors.divider,
        borderRadius: theme.borderRadius.md,
        paddingVertical: theme.spacing.md,
        paddingHorizontal: theme.spacing.lg,
        marginVertical: theme.spacing.xs,
    },
    selectedOption: {
        backgroundColor: theme.colors.primary,
        borderColor: theme.colors.primary,
    },
    highlightedOption: {
        backgroundColor: theme.colors.primaryLight,
        borderColor: theme.colors.primary,
    },
    optionText: {
        flex: 1,
        color: theme.colors.textPrimary,
        fontSize: theme.typography.fontSize.md,
    },
    selectedOptionText: {
        color: theme.colors.onPrimary,
        fontWeight: theme.typography.fontWeight.medium,
    },
    highlightedOptionText: {
        fontWeight: theme.typography.fontWeight.medium,
    },
    errorText: {
        color: theme.colors.error,
        fontSize: theme.typography.fontSize.xs,
        marginTop: theme.spacing.xs,
        marginLeft: theme.spacing.xs,
    },
    noResultsContainer: {
        alignItems: "center",
        paddingVertical: theme.spacing.xl,
    },
    noResultsText: {
        fontSize: theme.typography.fontSize.md,
        color: theme.colors.textSecondary,
    },
    listContentContainer: {
        paddingBottom: theme.spacing.xxl,
    },
});

export default BreedSelector;
