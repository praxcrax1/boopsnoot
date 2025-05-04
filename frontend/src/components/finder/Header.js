import React from "react";
import { View, Text, TouchableOpacity, Image, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import theme from "../../styles/theme";

const Header = ({ title, selectedPet, onFilterPress, onPetSelectorPress, showFilter }) => (
    <View style={styles.header}>
        <Text style={styles.headerTitle}>{title}</Text>
        {showFilter && <View style={styles.headerButtons}>
            <TouchableOpacity
                style={styles.petSwitchButton}
                onPress={onPetSelectorPress}>
                {selectedPet && (
                    <View style={styles.selectedPetPreview}>
                        <Image
                            source={
                                selectedPet.photos &&
                                selectedPet.photos.length > 0
                                    ? { uri: selectedPet.photos[0] }
                                    : require("../../assets/default-pet.png")
                            }
                            style={styles.selectedPetImage}
                        />
                        <Text style={styles.selectedPetName}>
                            {selectedPet.name}
                        </Text>
                        <Ionicons name="chevron-down" size={14} color="#666" />
                    </View>
                )}
            </TouchableOpacity>
            <TouchableOpacity
                style={styles.filterButton}
                onPress={onFilterPress}>
                <Ionicons name="options-outline" size={20} color="#333" />
            </TouchableOpacity>
        </View>}
    </View>
);

const styles = StyleSheet.create({
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: "transparent",
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: "700",
        color: theme.colors.textPrimary,
    },
    headerButtons: {
        flexDirection: "row",
        alignItems: "center",
    },
    petSwitchButton: {
        marginRight: 12,
    },
    selectedPetPreview: {
        flexDirection: "row",
        alignItems: "center",
        borderRadius: 20,
        paddingVertical: 6,
        paddingHorizontal: 10,
    },
    selectedPetImage: {
        width: 24,
        height: 24,
        borderRadius: 12,
        marginRight: 6,
        borderWidth: 1,
        borderColor: theme.colors.primary,
    },
    selectedPetName: {
        fontSize: 14,
        color: "#333333",
        marginRight: 4,
        fontWeight: "500",
    },
    filterButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: "center",
        justifyContent: "center",
    },
});

export default Header;