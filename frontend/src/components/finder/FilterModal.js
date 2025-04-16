import React from "react";
import {
    View,
    Text,
    Modal,
    TouchableOpacity,
    StyleSheet,
    Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import { BlurView } from "expo-blur";

const { width } = Dimensions.get("window");

const FilterModal = ({ visible, filters, onClose, onFilterChange, onApply }) => (
    <Modal
        visible={visible}
        transparent={true}
        animationType="fade"
        onRequestClose={onClose}>
        <BlurView intensity={80} style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
                <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Filters</Text>
                    <TouchableOpacity
                        onPress={onClose}
                        style={styles.closeButton}>
                        <Ionicons name="close" size={20} color="#333" />
                    </TouchableOpacity>
                </View>

                <View style={styles.modalContent}>
                    <Text style={styles.filterLabel}>Maximum Distance</Text>
                    <View style={styles.sliderContainer}>
                        <Text style={styles.sliderValue}>
                            {filters.maxDistance} km
                        </Text>
                        <Slider
                            style={styles.slider}
                            minimumValue={1}
                            maximumValue={100}
                            step={1}
                            value={filters.maxDistance}
                            onValueChange={(value) =>
                                onFilterChange("maxDistance", value)
                            }
                            minimumTrackTintColor="#FF6B6B"
                            maximumTrackTintColor="#E0E0E0"
                            thumbTintColor="#FF6B6B"
                        />
                        <View style={styles.sliderLabels}>
                            <Text style={styles.sliderMinLabel}>1 km</Text>
                            <Text style={styles.sliderMaxLabel}>100 km</Text>
                        </View>
                    </View>

                    <View style={styles.infoContainer}>
                        <Text style={styles.infoText}>
                            Distance is calculated from your current location.
                            Matching with pets farther away might reduce available
                            matches.
                        </Text>
                    </View>

                    <TouchableOpacity
                        style={styles.applyButton}
                        onPress={onApply}>
                        <Text style={styles.applyButtonText}>Apply</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </BlurView>
    </Modal>
);

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(0, 0, 0, 0.5)",
    },
    modalContainer: {
        width: width * 0.85,
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        overflow: "hidden",
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#F0F0F0",
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: "#333333",
    },
    closeButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: "#F5F5F5",
        alignItems: "center",
        justifyContent: "center",
    },
    modalContent: {
        padding: 16,
    },
    filterLabel: {
        fontSize: 16,
        fontWeight: "600",
        color: "#333333",
        marginBottom: 12,
    },
    sliderContainer: {
        marginBottom: 24,
    },
    sliderValue: {
        fontSize: 14,
        color: "#666666",
        marginBottom: 8,
        textAlign: "center",
    },
    slider: {
        width: "100%",
        height: 40,
    },
    sliderLabels: {
        flex: 1,
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: -8,
    },
    sliderMinLabel: {
        fontSize: 12,
        color: "#999999",
    },
    sliderMaxLabel: {
        fontSize: 12,
        color: "#999999",
    },
    infoContainer: {
        flexDirection: "row",
        alignItems: "flex-start",
        marginBottom: 24,
        backgroundColor: "#F8F8F8",
        padding: 12,
        borderRadius: 8,
    },
    infoIcon: {
        marginRight: 8,
        marginTop: 2,
    },
    infoText: {
        flex: 1,
        fontSize: 12,
        color: "#666666",
        lineHeight: 18,
    },
    applyButton: {
        backgroundColor: "#FF6B6B",
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: "center",
    },
    applyButtonText: {
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: "600",
    },
});

export default FilterModal;
