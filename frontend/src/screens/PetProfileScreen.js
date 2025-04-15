import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Image,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import PetService from "../services/PetService";
import Button from "../components/Button";

const PetProfileScreen = ({ route, navigation }) => {
    const { petId } = route.params;
    const [pet, setPet] = useState(null);
    const [loading, setLoading] = useState(true);
    const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

    useEffect(() => {
        const fetchPetData = async () => {
            try {
                const response = await PetService.getPetById(petId);
                setPet(response.pet);
            } catch (error) {
                console.error("Error fetching pet data:", error);
                Alert.alert(
                    "Error",
                    "Failed to load pet information. Please try again."
                );
            } finally {
                setLoading(false);
            }
        };

        fetchPetData();

        // Set up navigation header
        navigation.setOptions({
            headerShown: true,
            title: "",
            headerLeft: () => (
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
            ),
            headerRight: () => (
                <TouchableOpacity
                    style={styles.editButton}
                    onPress={() =>
                        navigation.navigate("EditPetProfile", { petId })
                    }>
                    <Ionicons name="create-outline" size={24} color="#FF6B6B" />
                </TouchableOpacity>
            ),
        });
    }, [petId, navigation]);

    const handleNextPhoto = () => {
        if (pet?.photos && currentPhotoIndex < pet.photos.length - 1) {
            setCurrentPhotoIndex(currentPhotoIndex + 1);
        }
    };

    const handlePreviousPhoto = () => {
        if (currentPhotoIndex > 0) {
            setCurrentPhotoIndex(currentPhotoIndex - 1);
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#FF6B6B" />
            </View>
        );
    }

    if (!pet) {
        return (
            <View style={styles.errorContainer}>
                <Ionicons
                    name="alert-circle-outline"
                    size={64}
                    color="#FF6B6B"
                />
                <Text style={styles.errorText}>Pet not found</Text>
                <Button
                    title="Go Back"
                    onPress={() => navigation.goBack()}
                    style={styles.goBackButton}
                    textStyle={styles.goBackButtonText}
                />
            </View>
        );
    }

    return (
        <ScrollView
            style={styles.container}
            showsVerticalScrollIndicator={false}>
            <View style={styles.photoContainer}>
                {pet.photos && pet.photos.length > 0 ? (
                    <>
                        <Image
                            source={{ uri: pet.photos[currentPhotoIndex] }}
                            style={styles.petImage}
                            resizeMode="cover"
                        />
                        {pet.photos.length > 1 && (
                            <View style={styles.photoNavContainer}>
                                <TouchableOpacity
                                    style={[
                                        styles.photoNavButton,
                                        currentPhotoIndex === 0 &&
                                            styles.photoNavButtonDisabled,
                                    ]}
                                    onPress={handlePreviousPhoto}
                                    disabled={currentPhotoIndex === 0}>
                                    <Ionicons
                                        name="chevron-back"
                                        size={20}
                                        color="#FFF"
                                    />
                                </TouchableOpacity>
                                <Text style={styles.photoCount}>
                                    {currentPhotoIndex + 1}/{pet.photos.length}
                                </Text>
                                <TouchableOpacity
                                    style={[
                                        styles.photoNavButton,
                                        currentPhotoIndex ===
                                            pet.photos.length - 1 &&
                                            styles.photoNavButtonDisabled,
                                    ]}
                                    onPress={handleNextPhoto}
                                    disabled={
                                        currentPhotoIndex ===
                                        pet.photos.length - 1
                                    }>
                                    <Ionicons
                                        name="chevron-forward"
                                        size={20}
                                        color="#FFF"
                                    />
                                </TouchableOpacity>
                            </View>
                        )}
                    </>
                ) : (
                    <View style={styles.noPhotoContainer}>
                        <Ionicons name="paw" size={64} color="#DDD" />
                        <Text style={styles.noPhotoText}>
                            No photos available
                        </Text>
                    </View>
                )}
            </View>

            <View style={styles.contentContainer}>
                <View style={styles.header}>
                    <View>
                        <Text style={styles.petName}>{pet.name}</Text>
                        <Text style={styles.petBreed}>{pet.breed}</Text>
                    </View>
                    <View style={styles.ageContainer}>
                        <Text style={styles.ageLabel}>Age</Text>
                        <Text style={styles.ageValue}>{pet.age}</Text>
                    </View>
                </View>

                <View style={styles.infoSection}>
                    <View style={styles.infoRow}>
                        <InfoItem
                            label="Gender"
                            value={pet.gender}
                            icon="male-female"
                        />
                        <InfoItem label="Size" value={pet.size} icon="resize" />
                    </View>
                    <View style={styles.infoRow}>
                        <InfoItem
                            label="Vaccinated"
                            value={pet.vaccinated === "yes" ? "Yes" : "No"}
                            icon="medkit"
                        />
                        <InfoItem
                            label="Activity"
                            value={pet.activityLevel}
                            icon="fitness"
                        />
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>About</Text>
                    <Text style={styles.descriptionText}>
                        {pet.description || "No description available."}
                    </Text>
                </View>

                {pet.temperament && pet.temperament.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Temperament</Text>
                        <View style={styles.tagsContainer}>
                            {pet.temperament.map((tag, index) => (
                                <View key={index} style={styles.tag}>
                                    <Text style={styles.tagText}>{tag}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {pet.preferredPlaymates &&
                    pet.preferredPlaymates.length > 0 && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>
                                Preferred Playmates
                            </Text>
                            <View style={styles.tagsContainer}>
                                {pet.preferredPlaymates.map(
                                    (playmate, index) => (
                                        <View key={index} style={styles.tag}>
                                            <Text style={styles.tagText}>
                                                {playmate}
                                            </Text>
                                        </View>
                                    )
                                )}
                            </View>
                        </View>
                    )}
            </View>
        </ScrollView>
    );
};

const InfoItem = ({ label, value, icon }) => (
    <View style={styles.infoItem}>
        <Ionicons
            name={icon}
            size={20}
            color="#FF6B6B"
            style={styles.infoIcon}
        />
        <View>
            <Text style={styles.infoLabel}>{label}</Text>
            <Text style={styles.infoValue}>{value}</Text>
        </View>
    </View>
);

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#FFF",
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    errorContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },
    errorText: {
        fontSize: 18,
        color: "#333",
        marginVertical: 20,
    },
    goBackButton: {
        backgroundColor: "#FF6B6B",
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 10,
    },
    goBackButtonText: {
        color: "#FFF",
        fontWeight: "bold",
    },
    backButton: {
        marginLeft: 10,
    },
    editButton: {
        marginRight: 10,
    },
    photoContainer: {
        position: "relative",
        width: "100%",
        height: 300,
    },
    petImage: {
        width: "100%",
        height: 300,
    },
    photoNavContainer: {
        flexDirection: "row",
        alignItems: "center",
        position: "absolute",
        bottom: 15,
        left: 0,
        right: 0,
        justifyContent: "center",
    },
    photoNavButton: {
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        width: 30,
        height: 30,
        borderRadius: 15,
        justifyContent: "center",
        alignItems: "center",
        marginHorizontal: 5,
    },
    photoNavButtonDisabled: {
        opacity: 0.5,
    },
    photoCount: {
        color: "#FFF",
        fontSize: 14,
        fontWeight: "bold",
        marginHorizontal: 10,
    },
    noPhotoContainer: {
        width: "100%",
        height: 300,
        backgroundColor: "#F5F5F5",
        justifyContent: "center",
        alignItems: "center",
    },
    noPhotoText: {
        fontSize: 16,
        color: "#999",
        marginTop: 10,
    },
    contentContainer: {
        padding: 20,
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 20,
    },
    petName: {
        fontSize: 28,
        fontWeight: "bold",
        color: "#333",
        marginBottom: 5,
    },
    petBreed: {
        fontSize: 16,
        color: "#666",
    },
    ageContainer: {
        backgroundColor: "#F9F9F9",
        borderRadius: 10,
        padding: 10,
        alignItems: "center",
    },
    ageLabel: {
        fontSize: 12,
        color: "#666",
    },
    ageValue: {
        fontSize: 16,
        fontWeight: "600",
        color: "#333",
    },
    infoSection: {
        marginBottom: 25,
    },
    infoRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 15,
    },
    infoItem: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
    },
    infoIcon: {
        marginRight: 10,
    },
    infoLabel: {
        fontSize: 12,
        color: "#999",
    },
    infoValue: {
        fontSize: 16,
        color: "#333",
        fontWeight: "500",
    },
    section: {
        marginBottom: 25,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#333",
        marginBottom: 10,
    },
    descriptionText: {
        fontSize: 16,
        lineHeight: 24,
        color: "#333",
    },
    tagsContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
    },
    tag: {
        backgroundColor: "#F0F0F0",
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 20,
        marginRight: 10,
        marginBottom: 10,
    },
    tagText: {
        fontSize: 14,
        color: "#666",
    },
});

export default PetProfileScreen;
