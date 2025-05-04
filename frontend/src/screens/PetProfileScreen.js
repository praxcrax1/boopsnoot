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
    StatusBar,
    Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import PetService from "../services/PetService";
import Button from "../components/Button";
import { DISPLAY_VALUES } from "../constants/petConstants";
import theme, { withOpacity } from "../styles/theme";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width } = Dimensions.get("window");
const PHOTO_HEIGHT = 400; // Increased for better visual impact

const PetProfileScreen = ({ route, navigation }) => {
    const { petId } = route.params;
    const [pet, setPet] = useState(null);
    const [loading, setLoading] = useState(true);
    const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
    const [isCurrentUserPet, setIsCurrentUserPet] = useState(false);

    const scrollX = useRef(new Animated.Value(0)).current;
    const photoScrollRef = useRef(null);
    
    // Animated values for subtle animations
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(50)).current;

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
                
                // Trigger entrance animations
                Animated.parallel([
                    Animated.timing(fadeAnim, {
                        toValue: 1,
                        duration: 600,
                        useNativeDriver: true,
                    }),
                    Animated.timing(slideAnim, {
                        toValue: 0,
                        duration: 500,
                        useNativeDriver: true,
                    })
                ]).start();
                
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

        // Hide default header - we'll use our custom header
        navigation.setOptions({
            headerShown: false,
        });
    }, [petId, navigation, fadeAnim, slideAnim]);

    // Handle back button press
    const handleBackPress = () => {
        navigation.goBack();
    };

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

    // Generate background style for tags based on type
    const getTagStyle = (type, index) => {
        const baseStyle = [styles.tag];
        let colorStyle;
        
        switch (type) {
            case 'temperament':
                const hueRotation = (index * 30) % 360;
                colorStyle = {
                    backgroundColor: withOpacity(theme.colors.primary, 0.15),
                    borderColor: withOpacity(theme.colors.primary, 0.3)
                };
                break;
            case 'playmate':
                colorStyle = {
                    backgroundColor: withOpacity(theme.colors.secondary, 0.15),
                    borderColor: withOpacity(theme.colors.secondary, 0.3)
                };
                break;
            default:
                colorStyle = {};
        }
        
        return [...baseStyle, colorStyle];
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={styles.loadingText}>Loading pet profile...</Text>
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
        <SafeAreaView style={styles.safeArea} edges={['top']}>
            <StatusBar 
                translucent 
                backgroundColor="transparent" 
                barStyle="dark-content" 
            />
            
            {/* Custom header */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={handleBackPress}>
                    <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Pet Profile</Text>
                <View style={styles.headerRight}>
                    {isCurrentUserPet && (
                        <TouchableOpacity
                            style={styles.editButtonHeader}
                            onPress={() => navigation.navigate("EditPetProfile", { petId })}>
                            <Text style={styles.editButtonText}>Edit</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
            
            <ScrollView
                style={styles.container}
                showsVerticalScrollIndicator={false}
                bounces={false}
            >
                {/* Photo Gallery */}
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
                                    <View key={index} style={styles.photoWrapper}>
                                        <Image
                                            source={{ uri: photo }}
                                            style={styles.petImage}
                                            resizeMode="cover"
                                        />
                                        <LinearGradient
                                            colors={['rgba(0,0,0,0.6)', 'transparent', 'transparent', 'rgba(0,0,0,0.3)']}
                                            style={styles.photoGradient}
                                            locations={[0, 0.25, 0.8, 1]}
                                        />
                                    </View>
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

                <Animated.View 
                    style={[
                        styles.contentContainer,
                        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
                    ]}
                >
                    <View style={styles.contentHeader}>
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
                        <View style={styles.descriptionContainer}>
                            <Text style={styles.descriptionText}>
                                {pet.description || "No description available."}
                            </Text>
                        </View>
                    </View>

                    {pet.temperament && pet.temperament.length > 0 && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Temperament</Text>
                            <View style={styles.tagsContainer}>
                                {pet.temperament.map((tag, index) => (
                                    <View key={index} style={getTagStyle('temperament', index)}>
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
                                            <View key={index} style={getTagStyle('playmate', index)}>
                                                <Text style={styles.tagText}>
                                                    {playmate}
                                                </Text>
                                            </View>
                                        )
                                    )}
                                </View>
                            </View>
                        )}
                </Animated.View>
            </ScrollView>
        </SafeAreaView>
    );
};

const InfoCard = ({ label, value, icon }) => (
    <View style={styles.infoCard}>
        <View style={styles.infoIconContainer}>
            <Ionicons
                name={icon}
                size={20}
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
    safeArea: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    // Custom header styles
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        backgroundColor: theme.colors.background,
        position: 'relative', // Add position relative for absolute positioning of title
        ...Platform.select({
            ios: {
                height: 56,
            },
            android: {
                height: 80,
                paddingTop: 25, // Add extra padding for Android status bar
            },
        }),
    },
    headerTitle: {
        fontSize: theme.typography.fontSize.lg,
        fontWeight: theme.typography.fontWeight.semiBold,
        color: theme.colors.textPrimary,
        position: 'absolute', // Position absolutely to center regardless of other elements
        left: 0,
        right: 0,
        textAlign: 'center', // Center the text
        ...Platform.select({
            ios: {
                top: 18, // Center vertically in iOS header
            },
            android: {
                top: 40, // Center vertically in Android header accounting for status bar padding
            },
        }),
    },
    backButton: {
        padding: 8,
        zIndex: 1, // Ensure buttons are above the centered title
    },
    headerRight: {
        width: 60,
        alignItems: 'flex-end',
        zIndex: 1, // Ensure buttons are above the centered title
    },
    editButtonHeader: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: theme.borderRadius.md,
        backgroundColor: theme.colors.primary + '10',
    },
    editButtonText: {
        color: theme.colors.primary,
        fontWeight: theme.typography.fontWeight.semiBold,
        fontSize: theme.typography.fontSize.sm,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: theme.colors.background,
    },
    loadingText: {
        marginTop: theme.spacing.md,
        fontSize: theme.typography.fontSize.md,
        color: theme.colors.textSecondary,
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
    photoContainer: {
        width: "100%",
        height: PHOTO_HEIGHT,
    },
    photoWrapper: {
        width,
        height: PHOTO_HEIGHT,
        position: 'relative',
    },
    photoGradient: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    petImage: {
        width,
        height: PHOTO_HEIGHT,
    },
    paginationDots: {
        flexDirection: 'row',
        alignSelf: 'center',
        position: 'absolute',
        bottom: 50,
        zIndex: 50,
        backgroundColor: 'rgba(0, 0, 0, 0.25)',
        borderRadius: 20,
        paddingVertical: 8,
        paddingHorizontal: 12,
    },
    paginationDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: 'rgba(255, 255, 255, 0.5)',
        marginHorizontal: 4,
    },
    paginationDotActive: {
        width: 24,
        backgroundColor: '#FFFFFF',
    },
    noPhotoContainer: {
        width: "100%",
        height: PHOTO_HEIGHT,
        backgroundColor: withOpacity(theme.colors.primary, 0.1),
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
        marginTop: -theme.spacing.xxxl,
        backgroundColor: theme.colors.background,
        borderTopLeftRadius: theme.borderRadius.xxl,
        borderTopRightRadius: theme.borderRadius.xxl,
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
        backgroundColor: theme.colors.primary + '15',
        borderRadius: theme.borderRadius.md,
        paddingVertical: theme.spacing.sm,
        paddingHorizontal: theme.spacing.md,
        alignItems: "center",
        borderWidth: 1,
        borderColor: theme.colors.primary + '30',
    },
    ageLabel: {
        fontSize: theme.typography.fontSize.xs,
        color: theme.colors.textSecondary,
        fontWeight: theme.typography.fontWeight.medium,
    },
    ageValue: {
        fontSize: theme.typography.fontSize.xl,
        fontWeight: theme.typography.fontWeight.bold,
        color: theme.colors.primary,
    },
    infoCardsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: theme.spacing.xxl,
    },
    infoCard: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '48%',
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.md,
        borderWidth: 1,
        borderColor: theme.colors.divider,
    },
    infoIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
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
        fontWeight: '500',
    },
    infoValue: {
        fontSize: theme.typography.fontSize.md,
        fontWeight: theme.typography.fontWeight.semiBold,
        color: theme.colors.textPrimary,
    },
    section: {
        marginBottom: theme.spacing.xxl,
    },
    sectionTitle: {
        fontSize: theme.typography.fontSize.lg,
        fontWeight: theme.typography.fontWeight.bold,
        color: theme.colors.textPrimary,
        marginBottom: theme.spacing.md,
        paddingBottom: theme.spacing.xs,
        borderBottomWidth: 2,
        borderBottomColor: withOpacity(theme.colors.primary, 0.2),
        alignSelf: 'flex-start',
    },
    descriptionContainer: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.lg,
        borderWidth: 1,
        borderColor: theme.colors.divider,
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
        paddingVertical: theme.spacing.xs,
        paddingHorizontal: theme.spacing.md,
        borderRadius: theme.borderRadius.xl,
        marginRight: theme.spacing.sm,
        marginBottom: theme.spacing.sm,
        borderWidth: 1,
        backgroundColor: theme.colors.backgroundVariant,
        borderColor: theme.colors.divider,
    },
    tagText: {
        fontSize: theme.typography.fontSize.sm,
        color: theme.colors.textPrimary,
        fontWeight: theme.typography.fontWeight.medium,
    },
});

export default PetProfileScreen;
