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
    SectionList,
    Image,
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
    const [filteredOptions, setFilteredOptions] = useState([]);
    const slideAnim = useRef(new Animated.Value(0)).current;
    const inputRef = useRef(null);
    const listRef = useRef(null);

    // Find the selected option's label for display
    const selectedOption = breedOptions.find(
        (option) => option.value === selectedValue
    );

    // Group breeds by first letter for better organization
    const groupBreeds = (breeds) => {
        if (!breeds || breeds.length === 0) return [];
        
        const groupedData = {};
        
        breeds.forEach(breed => {
            const firstLetter = breed.label[0].toUpperCase();
            if (!groupedData[firstLetter]) {
                groupedData[firstLetter] = [];
            }
            groupedData[firstLetter].push(breed);
        });
        
        return Object.keys(groupedData)
            .sort()
            .map(title => ({
                title,
                data: groupedData[title].sort((a, b) => 
                    a.label.localeCompare(b.label)
                )
            }));
    };

    // Process breeds for display based on search query
    useEffect(() => {
        if (!searchQuery.trim()) {
            // When no search, show alphabetically grouped breeds
            setFilteredOptions(groupBreeds(breedOptions));
        } else {
            // When searching, filter breeds and group results
            const filtered = breedOptions.filter(option =>
                option.label.toLowerCase().includes(searchQuery.toLowerCase())
            );
            setFilteredOptions(groupBreeds(filtered));
        }
    }, [searchQuery, breedOptions]);

    useEffect(() => {
        if (modalVisible) {
            // Slide up animation when modal opens
            Animated.timing(slideAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }).start();

            // Focus the input field when modal opens with a delay
            setTimeout(() => {
                if (inputRef.current) {
                    inputRef.current.focus();
                }
            }, 300);
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

    // Handle outside click to close modal
    const handleOutsideClick = () => {
        handleClose();
    };

    const modalTranslateY = slideAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [300, 0],
    });

    // Handle search clear
    const clearSearch = () => {
        setSearchQuery("");
        inputRef.current?.focus();
    };

    // Check if there are any results after filtering
    const hasNoResults = filteredOptions.length === 0 || 
        filteredOptions.every(section => section.data.length === 0);

    return (
        <View style={[styles.container, containerStyle]}>
            {/* Label with required indicator */}
            {label && (
                <Text style={styles.label} accessibilityRole="text">
                    {label}{" "}
                    {required && <Text style={styles.requiredMark}>*</Text>}
                </Text>
            )}

            {/* Selector Button */}
            <TouchableOpacity
                style={[
                    styles.selectorButton,
                    error && touched && styles.errorSelector,
                    style,
                ]}
                onPress={() => setModalVisible(true)}
                activeOpacity={0.7}
                accessible={true}
                accessibilityLabel={`${label || "Breed"} selector, ${selectedOption ? selectedOption.label + " selected" : "no selection"}`}
                accessibilityRole="button"
                accessibilityHint="Opens breed selection modal">
                {/* Selected breed display */}
                <View style={styles.selectedDisplay}>
                    <Text
                        style={[
                            styles.selectorButtonText,
                            !selectedOption && styles.placeholderText,
                        ]}
                        numberOfLines={1}
                        ellipsizeMode="tail">
                        {selectedOption ? selectedOption.label : "Select breed"}
                    </Text>
                </View>
                
                {/* Dropdown icon */}
                <View style={styles.iconContainer}>
                    <Ionicons
                        name="chevron-down"
                        size={18}
                        color={theme.colors.icon}
                    />
                </View>
            </TouchableOpacity>

            {/* Error message */}
            {touched && error && <Text style={styles.errorText}>{error}</Text>}

            {/* Breed Selection Modal */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={modalVisible}
                onRequestClose={handleClose}
                supportedOrientations={['portrait', 'landscape']}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    style={styles.keyboardAvoidingView}
                >
                    <TouchableWithoutFeedback onPress={handleOutsideClick}>
                        <View style={styles.modalOverlay}>
                            <TouchableWithoutFeedback
                                onPress={(e) => e.stopPropagation()}>
                                <Animated.View
                                    style={[
                                        styles.modalContent,
                                        {
                                            transform: [
                                                { translateY: modalTranslateY },
                                            ],
                                        },
                                    ]}>
                                    {/* Modal Header */}
                                    <View style={styles.modalHeader}>
                                        <Text 
                                            style={styles.modalHeaderText}
                                            accessibilityRole="header">
                                            {label || `Select ${petType} Breed`}
                                        </Text>
                                        <TouchableOpacity 
                                            onPress={handleClose}
                                            accessibilityLabel="Close modal"
                                            accessibilityRole="button"
                                            style={styles.closeButton}
                                            accessibilityHint="Closes the breed selection modal">
                                            <Ionicons
                                                name="close"
                                                size={24}
                                                color={theme.colors.textPrimary}
                                            />
                                        </TouchableOpacity>
                                    </View>

                                    {/* Search Box */}
                                    <View style={styles.searchContainer}>
                                        <Ionicons
                                            name="search"
                                            size={20}
                                            color={theme.colors.textSecondary}
                                            style={styles.searchIcon}
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
                                            autoCapitalize="none"
                                            autoCorrect={false}
                                            returnKeyType="search"
                                            accessibilityLabel="Search breeds"
                                            accessibilityHint="Type to filter the list of breeds"
                                            blurOnSubmit={false}
                                        />
                                        {searchQuery ? (
                                            <TouchableOpacity
                                                onPress={clearSearch}
                                                accessibilityLabel="Clear search"
                                                accessibilityRole="button"
                                                style={styles.clearButton}>
                                                <Ionicons
                                                    name="close-circle"
                                                    size={20}
                                                    color={theme.colors.textSecondary}
                                                />
                                            </TouchableOpacity>
                                        ) : null}
                                    </View>

                                    {/* Empty State */}
                                    {hasNoResults ? (
                                        <View style={styles.noResultsContainer}>
                                            <Ionicons 
                                                name="search-outline" 
                                                size={40} 
                                                color={theme.colors.textSecondary} 
                                            />
                                            <Text 
                                                style={styles.noResultsText}
                                                accessibilityLabel="No breeds found">
                                                No breeds found
                                            </Text>
                                            <Text style={styles.noResultsSubText}>
                                                Try a different search term
                                            </Text>
                                            <TouchableOpacity
                                                style={styles.resetButton}
                                                onPress={clearSearch}>
                                                <Text style={styles.resetButtonText}>
                                                    Clear Search
                                                </Text>
                                            </TouchableOpacity>
                                        </View>
                                    ) : (
                                        /* Breed List */
                                        <SectionList
                                            ref={listRef}
                                            sections={filteredOptions}
                                            keyExtractor={(item) => item.value}
                                            initialNumToRender={15}
                                            stickySectionHeadersEnabled={true}
                                            renderItem={({ item }) => {
                                                const isSelected = selectedValue === item.value;
                                                
                                                return (
                                                    <TouchableOpacity
                                                        style={[
                                                            styles.optionItem,
                                                            isSelected && styles.selectedOption,
                                                        ]}
                                                        onPress={() => handleSelect(item)}
                                                        accessible={true}
                                                        accessibilityLabel={`${item.label}${isSelected ? ", selected" : ""}`}
                                                        accessibilityRole="button"
                                                        accessibilityState={{ selected: isSelected }}>
                                                        <Text
                                                            style={[
                                                                styles.optionText,
                                                                isSelected && styles.selectedOptionText,
                                                            ]}
                                                            numberOfLines={1}
                                                            ellipsizeMode="tail">
                                                            {item.label}
                                                        </Text>
                                                        {isSelected && (
                                                            <Ionicons
                                                                name="checkmark"
                                                                size={20}
                                                                color={theme.colors.onPrimary}
                                                            />
                                                        )}
                                                    </TouchableOpacity>
                                                );
                                            }}
                                            renderSectionHeader={({ section: { title } }) => (
                                                <View style={styles.sectionHeader}>
                                                    <Text style={styles.sectionHeaderText}>
                                                        {title}
                                                    </Text>
                                                </View>
                                            )}
                                            ListHeaderComponent={
                                                <View style={styles.listHeaderComponent}>
                                                    <Text style={styles.resultsCountText}>
                                                        {filteredOptions.reduce((count, section) => 
                                                            count + section.data.length, 0)} breeds found
                                                    </Text>
                                                    {selectedOption && (
                                                        <View style={styles.currentSelectionBadge}>
                                                            <Text style={styles.currentSelectionText}>
                                                                Current: {selectedOption.label}
                                                            </Text>
                                                        </View>
                                                    )}
                                                </View>
                                            }
                                            keyboardShouldPersistTaps="always"
                                            showsVerticalScrollIndicator={true}
                                            contentContainerStyle={styles.sectionListContent}
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
        overflow: "hidden",
    },
    errorSelector: {
        borderColor: theme.colors.error,
        borderWidth: 1,
    },
    selectorButtonText: {
        fontSize: theme.typography.fontSize.md,
        color: theme.colors.textPrimary,
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
        paddingBottom: Platform.OS === "ios" ? 20 : 20,
        maxHeight: "80%",
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: theme.spacing.lg,
        paddingHorizontal: theme.spacing.xl,
    },
    modalHeaderText: {
        fontSize: theme.typography.fontSize.xl,
        fontWeight: theme.typography.fontWeight.bold,
        color: theme.colors.textPrimary,
    },
    closeButton: {
        padding: theme.spacing.xs,
    },
    searchContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: theme.spacing.md,
        marginHorizontal: theme.spacing.xl,
        paddingVertical: Platform.OS === "ios" ? theme.spacing.sm : 0,
    },
    searchIcon: {
        marginRight: theme.spacing.sm,
    },
    searchInput: {
        flex: 1,
        fontSize: theme.typography.fontSize.md,
        color: theme.colors.textPrimary,
        paddingVertical: theme.spacing.sm,
    },
    clearButton: {
        padding: theme.spacing.xs,
    },
    sectionHeader: {
        backgroundColor: theme.colors.background,
        paddingVertical: theme.spacing.sm,
        paddingHorizontal: theme.spacing.xl,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.divider,
    },
    sectionHeaderText: {
        fontSize: theme.typography.fontSize.lg,
        fontWeight: theme.typography.fontWeight.bold,
        color: theme.colors.primary,
    },
    optionItem: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: theme.spacing.md,
        paddingHorizontal: theme.spacing.xl,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.divider,
    },
    selectedOption: {
        backgroundColor: theme.colors.primary,
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
    errorText: {
        color: theme.colors.error,
        fontSize: theme.typography.fontSize.xs,
        marginTop: theme.spacing.xs,
        marginLeft: theme.spacing.xs,
    },
    noResultsContainer: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: theme.spacing.xxxl,
        paddingHorizontal: theme.spacing.xl,
    },
    noResultsText: {
        fontSize: theme.typography.fontSize.lg,
        fontWeight: theme.typography.fontWeight.medium,
        color: theme.colors.textPrimary,
        marginTop: theme.spacing.md,
    },
    noResultsSubText: {
        fontSize: theme.typography.fontSize.md,
        color: theme.colors.textSecondary,
        marginTop: theme.spacing.xs,
    },
    resetButton: {
        marginTop: theme.spacing.xl,
        paddingVertical: theme.spacing.sm,
        paddingHorizontal: theme.spacing.xl,
        backgroundColor: theme.colors.primary,
        borderRadius: theme.borderRadius.md,
    },
    resetButtonText: {
        color: theme.colors.onPrimary,
        fontWeight: theme.typography.fontWeight.medium,
    },
    listHeaderComponent: {
        paddingHorizontal: theme.spacing.xl,
        paddingVertical: theme.spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.divider,
    },
    resultsCountText: {
        fontSize: theme.typography.fontSize.sm,
        color: theme.colors.textSecondary,
    },
    currentSelectionBadge: {
        backgroundColor: theme.colors.primaryLight,
        paddingVertical: theme.spacing.xs,
        paddingHorizontal: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        alignSelf: "flex-start",
        marginTop: theme.spacing.sm,
    },
    currentSelectionText: {
        fontSize: theme.typography.fontSize.sm,
        color: theme.colors.primary,
        fontWeight: theme.typography.fontWeight.medium,
    },
    sectionListContent: {
        paddingBottom: theme.spacing.xxl,
    },
});

export default BreedSelector;