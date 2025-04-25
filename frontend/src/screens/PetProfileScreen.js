import React, { useState, useEffect, useRef } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Image,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Animated,
    Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import PetService from "../services/PetService";
import Button from "../components/Button";
import { DISPLAY_VALUES } from "../constants/petConstants";
import theme, { withOpacity } from "../styles/theme";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width } = Dimensions.get("window");
const PHOTO_HEIGHT = 350;

const PetProfileScreen = ({ route, navigation }) => {
    const { petId } = route.params;
    const [pet, setPet] = useState(null);
    const [loading, setLoading] = useState(true);
    const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
    const [isCurrentUserPet, setIsCurrentUserPet] = useState(false);

    const scrollX = useRef(new Animated.Value(0)).current;
    const photoScrollRef = useRef(null);

    useEffect(() => {
        const fetchPetData = async () => {
            try {
                const response = await PetService.getPetById(petId);
                setPet(response.pet);
                
                // Check if this pet belongs to the current user
                const userData = await AsyncStorage.getItem("user");
                if (userData && response.pet) {
                    const user = JSON.parse(userData);
                    const userId = user.id || user._id;
                    setIsCurrentUserPet(response.pet.owner === userId);
                }
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

        navigation.setOptions({
            headerShown: true,
            title: "",
            headerShadowVisible: false,
            headerTransparent: true,
            headerLeft: () => (
                <></>
            ),
            headerRight: () => (
                isCurrentUserPet ? (
                    <TouchableOpacity
                        style={styles.editButton}
                        onPress={() =>
                            navigation.navigate("EditPetProfile", { petId })
                        }>
                        <Ionicons name="create-outline" size={24} color={theme.colors.primary} />
                    </TouchableOpacity>
                ) : null
            ),
        });
    }, [petId, navigation, isCurrentUserPet]);

    const handlePhotoChange = (event) => {
        const contentOffsetX = event.nativeEvent.contentOffset.x;
        const newIndex = Math.round(contentOffsetX / width);

        if (pet?.photos && newIndex >= 0 && newIndex < pet.photos.length) {
            setCurrentPhotoIndex(newIndex);
        }
    };

    const scrollToPhoto = (index) => {
        if (photoScrollRef.current && pet?.photos?.length > 0) {
            photoScrollRef.current.scrollTo({
                x: index * width,
                animated: true,
            });
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    if (!pet) {
        return (
            <View style={styles.errorContainer}>
                <Ionicons
                    name="alert-circle-outline"
                    size={64}
                    color={theme.colors.error}
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
            showsVerticalScrollIndicator={false}
            bounces={false}
        >
            <View style={styles.photoContainer}>
                {pet.photos && pet.photos.length > 0 ? (
                    <>
                        <Animated.ScrollView
                            ref={photoScrollRef}
                            horizontal
                            pagingEnabled
                            showsHorizontalScrollIndicator={false}
                            onScroll={Animated.event(
                                [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                                { useNativeDriver: false, listener: handlePhotoChange }
                            )}
                            scrollEventThrottle={16}>
                            {pet.photos.map((photo, index) => (
                                <Image
                                    key={index}
                                    source={{ uri: photo }}
                                    style={styles.petImage}
                                    resizeMode="cover"
                                />
                            ))}
                        </Animated.ScrollView>
                        
                        {pet.photos.length > 1 && (
                            <View style={styles.paginationDots}>
                                {pet.photos.map((_, index) => (
                                    <TouchableOpacity 
                                        key={index}
                                        onPress={() => scrollToPhoto(index)}>
                                        <View
                                            style={[
                                                styles.paginationDot,
                                                currentPhotoIndex === index && styles.paginationDotActive
                                            ]}
                                        />
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                    </>
                ) : (
                    <View style={styles.noPhotoContainer}>
                        <Ionicons name="paw" size={64} color={theme.colors.textDisabled} />
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

                <View style={styles.infoCardsContainer}>
                    <InfoCard
                        label="Gender"
                        value={DISPLAY_VALUES.GENDER[pet.gender] || pet.gender}
                        icon="male-female"
                    />
                    <InfoCard 
                        label="Size" 
                        value={DISPLAY_VALUES.SIZE[pet.size] || pet.size} 
                        icon="resize" 
                    />
                    <InfoCard
                        label="Vaccinated"
                        value={pet.vaccinated === "yes" ? "Yes" : "No"}
                        icon="medkit"
                    />
                    <InfoCard
                        label="Activity"
                        value={DISPLAY_VALUES.ACTIVITY[pet.activityLevel] || pet.activityLevel}
                        icon="fitness"
                    />
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

const InfoCard = ({ label, value, icon }) => (
    <View style={styles.infoCard}>
        <View style={styles.infoIconContainer}>
            <Ionicons
                name={icon}
                size={18}
                color={theme.colors.primary}
            />
        </View>
        <View style={styles.infoTextContainer}>
            <Text style={styles.infoLabel}>{label}</Text>
            <Text style={styles.infoValue}>{value}</Text>
        </View>
    </View>
);

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: theme.colors.background,
    },
    errorContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: theme.spacing.xl,
        backgroundColor: theme.colors.background,
    },
    errorText: {
        fontSize: theme.typography.fontSize.lg,
        color: theme.colors.textPrimary,
        marginVertical: theme.spacing.lg,
    },
    goBackButton: {
        backgroundColor: theme.colors.primary,
        paddingVertical: theme.spacing.md,
        paddingHorizontal: theme.spacing.xl,
        borderRadius: theme.borderRadius.md,
        marginTop: theme.spacing.lg,
    },
    goBackButtonText: {
        color: theme.colors.onPrimary,
        fontWeight: theme.typography.fontWeight.bold,
    },
    backButton: {
        marginLeft: theme.spacing.md,
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: withOpacity("#000000", 0.3),
        justifyContent: "center",
        alignItems: "center",
    },
    editButton: {
        marginRight: theme.spacing.md,
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: withOpacity("#FFFFFF", 0.8),
        justifyContent: "center",
        alignItems: "center",
    },
    photoContainer: {
        width: "100%",
        height: PHOTO_HEIGHT,
    },
    petImage: {
        width,
        height: PHOTO_HEIGHT,
    },
    paginationDots: {
        flexDirection: 'row',
        position: 'absolute',
        bottom: theme.spacing.lg,
        alignSelf: 'center',
    },
    paginationDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: 'rgba(255, 255, 255, 0.5)',
        marginHorizontal: 4,
    },
    paginationDotActive: {
        backgroundColor: '#FFFFFF',
    },
    noPhotoContainer: {
        width: "100%",
        height: PHOTO_HEIGHT,
        backgroundColor: theme.colors.backgroundVariant,
        justifyContent: "center",
        alignItems: "center",
    },
    noPhotoText: {
        fontSize: theme.typography.fontSize.md,
        color: theme.colors.textDisabled,
        marginTop: theme.spacing.md,
    },
    contentContainer: {
        padding: theme.spacing.xl,
        marginTop: -theme.spacing.xxl,
        backgroundColor: theme.colors.background,
        borderTopLeftRadius: theme.borderRadius.xl,
        borderTopRightRadius: theme.borderRadius.xl,
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: theme.spacing.xl,
    },
    petName: {
        fontSize: theme.typography.fontSize.xxl,
        fontWeight: theme.typography.fontWeight.bold,
        color: theme.colors.textPrimary,
        marginBottom: theme.spacing.xs,
    },
    petBreed: {
        fontSize: theme.typography.fontSize.md,
        color: theme.colors.textSecondary,
    },
    ageContainer: {
        backgroundColor: theme.colors.backgroundVariant,
        borderRadius: theme.borderRadius.md,
        paddingVertical: theme.spacing.sm,
        paddingHorizontal: theme.spacing.md,
        alignItems: "center",
        ...theme.shadows.small,
    },
    ageLabel: {
        fontSize: theme.typography.fontSize.sm,
        color: theme.colors.textSecondary,
    },
    ageValue: {
        fontSize: theme.typography.fontSize.lg,
        fontWeight: theme.typography.fontWeight.semiBold,
        color: theme.colors.textPrimary,
    },
    infoCardsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: theme.spacing.xl,
    },
    infoCard: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '48%',
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.md,
        ...theme.shadows.small,
    },
    infoIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: withOpacity(theme.colors.primary, 0.1),
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: theme.spacing.md,
    },
    infoTextContainer: {
        flex: 1,
    },
    infoLabel: {
        fontSize: theme.typography.fontSize.xs,
        color: theme.colors.textSecondary,
        marginBottom: 2,
    },
    infoValue: {
        fontSize: theme.typography.fontSize.md,
        fontWeight: theme.typography.fontWeight.medium,
        color: theme.colors.textPrimary,
    },
    section: {
        marginBottom: theme.spacing.xl,
    },
    sectionTitle: {
        fontSize: theme.typography.fontSize.lg,
        fontWeight: theme.typography.fontWeight.semiBold,
        color: theme.colors.textPrimary,
        marginBottom: theme.spacing.md,
    },
    descriptionText: {
        fontSize: theme.typography.fontSize.md,
        lineHeight: theme.typography.lineHeight.normal * theme.typography.fontSize.md,
        color: theme.colors.textPrimary,
    },
    tagsContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
    },
    tag: {
        backgroundColor: theme.colors.backgroundVariant,
        paddingVertical: theme.spacing.xs,
        paddingHorizontal: theme.spacing.md,
        borderRadius: theme.borderRadius.xl,
        marginRight: theme.spacing.sm,
        marginBottom: theme.spacing.sm,
        borderWidth: 1,
        borderColor: theme.colors.divider,
    },
    tagText: {
        fontSize: theme.typography.fontSize.sm,
        color: theme.colors.textSecondary,
    },
});

export default PetProfileScreen;
