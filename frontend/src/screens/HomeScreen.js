import React, {
    useState,
    useEffect,
    useContext,
    useMemo,
    useCallback,
} from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    Animated,
    Alert,
    StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { AuthContext } from "../contexts/AuthContext";
import PetService from "../services/PetService";
import MatchService from "../services/MatchService";
import ChatService from "../services/ChatService";
import theme, { withOpacity } from "../styles/theme";

const HomeScreen = ({ navigation, route }) => {
    const { user } = useContext(AuthContext);
    const [initialLoading, setInitialLoading] = useState(true);
    const [matchesLoading, setMatchesLoading] = useState(false);
    const [pets, setPets] = useState([]);
    const [matches, setMatches] = useState([]);
    const [selectedPetId, setSelectedPetId] = useState(null);

    // Animation value for the matches section
    const matchesOpacity = new Animated.Value(1);

    const fetchUserData = useCallback(async () => {
        setInitialLoading(true);
        try {
            // Fetch user's pets
            const petsResponse = await PetService.getUserPets();
            const petsList = petsResponse.pets || [];
            setPets(petsList);

            // Set the first pet as the selected pet if available
            if (petsList.length > 0) {
                setSelectedPetId(petsList[0]._id);

                // Fetch matches for the selected pet
                const matchesResponse = await MatchService.getUserMatches(
                    petsList[0]._id
                );
                setMatches(matchesResponse.matches || []);

                // Preload matches for other pets in the background to make switching smoother
                if (petsList.length > 1) {
                    const otherPetIds = petsList.slice(1).map((pet) => pet._id);

                    // Run preloading in the background without awaiting it
                    setTimeout(() => {
                        MatchService
                            .preloadMatchesForPets(otherPetIds)
                            .catch((err) =>
                                console.error(
                                    "Error preloading pet matches:",
                                    err
                                )
                            );
                    }, 1000);
                }
            }
        } catch (error) {
            console.error("Error fetching user data:", error);
        } finally {
            setInitialLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUserData();
    }, [fetchUserData]);

    // Listen for route.params changes to refresh data
    useEffect(() => {
        if (route.params?.refresh) {
            // Clear the parameter so it doesn't trigger multiple refreshes
            navigation.setParams({ refresh: undefined });
            // Refresh data
            fetchUserData();
        }
    }, [route.params, fetchUserData]);

    // Function to handle pet selection change with smooth transitions
    const handlePetChange = useCallback(
        async (petId) => {
            if (petId === selectedPetId) return;

            setSelectedPetId(petId);
            setMatchesLoading(true);

            // Fade out the matches section
            Animated.timing(matchesOpacity, {
                toValue: 0.3,
                duration: 200,
                useNativeDriver: true,
            }).start();

            try {
                const matchesResponse = await MatchService.getUserMatches(
                    petId
                );

                // Fade in the new matches
                Animated.timing(matchesOpacity, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }).start();

                setMatches(matchesResponse.matches || []);
            } catch (error) {
                console.error("Error fetching matches for pet:", error);

                // Fade back in even if there's an error
                Animated.timing(matchesOpacity, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }).start();
            } finally {
                setMatchesLoading(false);
            }
        },
        [selectedPetId]
    );

    // Function to navigate to a chat with a matched pet
    const navigateToMatchChat = useCallback(async (matchId) => {
        try {
            // Show loading indicator for better UX
            setMatchesLoading(true);

            // Get or create chat for this match
            const chatResponse = await ChatService.getOrCreateChatForMatch(matchId);

            if (chatResponse.success && chatResponse.chat) {
                // Navigate to the chat with the returned chat ID
                navigation.navigate("Chat", {
                    chatId: chatResponse.chat._id,
                });
            } else {
                console.error("Failed to get or create chat:", chatResponse);
                // Fallback to direct navigation with match ID (though this likely won't work)
                navigation.navigate("Chat", {
                    chatId: matchId,
                });
            }
        } catch (error) {
            console.error("Error navigating to chat:", error);
            Alert.alert("Error", "Failed to open chat. Please try again.");
        } finally {
            setMatchesLoading(false);
        }
    }, [navigation]);

    // Memoize the selected pet to avoid unnecessary calculations
    const selectedPet = useMemo(() => {
        return (
            pets.find((pet) => pet._id === selectedPetId) ||
            (pets.length > 0 ? pets[0] : null)
        );
    }, [pets, selectedPetId]);

    if (initialLoading) {
        return (
            <View style={styles.loadingContainer}>
                <StatusBar backgroundColor={theme.colors.background} barStyle="dark-content" />
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar backgroundColor={theme.colors.background} barStyle="dark-content" />
            
            <View style={styles.header}>
                <View>
                    <Text style={styles.welcomeText}>
                        Welcome, {user?.name || "Pet Lover"}!
                    </Text>
                    {selectedPet && (
                        <Text style={styles.petWelcome}>& {selectedPet?.name}</Text>
                    )}
                </View>
            </View>

            {/* Pet Selection Tabs (Only show if user has multiple pets) */}
            {pets.length > 1 && (
                <View style={styles.petTabsWrapper}>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.petTabsContainer}
                        contentContainerStyle={styles.petTabsContent}>
                        {pets.map((pet) => (
                            <TouchableOpacity
                                key={pet._id}
                                style={[
                                    styles.petTab,
                                    selectedPetId === pet._id &&
                                        styles.activePetTab,
                                ]}
                                onPress={() => handlePetChange(pet._id)}>
                                <Image
                                    source={
                                        pet.photos && pet.photos.length > 0
                                            ? { uri: pet.photos[0] }
                                            : require("../assets/default-pet.png")
                                    }
                                    style={[
                                        styles.petTabImage,
                                        selectedPetId === pet._id &&
                                            styles.activePetTabImage
                                    ]}
                                />
                                <Text
                                    style={[
                                        styles.petTabName,
                                        selectedPetId === pet._id &&
                                            styles.activePetTabName,
                                    ]}>
                                    {pet?.name}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            )}

            <ScrollView 
                style={styles.scrollContainer}
                showsVerticalScrollIndicator={false}
            >
                {/* Quick Actions */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Quick Actions</Text>
                    <View style={styles.quickActionsContainer}>
                        <TouchableOpacity
                            style={styles.quickActionButton}
                            onPress={() => navigation.navigate("Finder")}>
                            <View style={styles.quickActionIconContainer}>
                                <Ionicons name="paw" size={24} color={theme.colors.onPrimary} />
                            </View>
                            <Text style={styles.quickActionText}>
                                Find Playmates
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.quickActionButton}
                            onPress={() => navigation.navigate("Chats")}>
                            <View style={[
                                styles.quickActionIconContainer,
                                { backgroundColor: theme.colors.secondary }
                            ]}>
                                <Ionicons
                                    name="chatbubble"
                                    size={24}
                                    color={theme.colors.onSecondary}
                                />
                            </View>
                            <Text style={styles.quickActionText}>Messages</Text>
                        </TouchableOpacity>

                        {pets.length > 0 ? (
                            <TouchableOpacity
                                style={styles.quickActionButton}
                                onPress={() => navigation.navigate("Profile")}>
                                <View style={[
                                    styles.quickActionIconContainer,
                                    { backgroundColor: theme.colors.info }
                                ]}>
                                    <Ionicons
                                        name="settings"
                                        size={24}
                                        color="#FFF"
                                    />
                                </View>
                                <Text style={styles.quickActionText}>
                                    Edit Profile
                                </Text>
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity
                                style={styles.quickActionButton}
                                onPress={() =>
                                    navigation.navigate("PetProfileSetup")
                                }>
                                <View style={[
                                    styles.quickActionIconContainer,
                                    { backgroundColor: theme.colors.success }
                                ]}>
                                    <Ionicons
                                        name="add"
                                        size={24}
                                        color="#FFF"
                                    />
                                </View>
                                <Text style={styles.quickActionText}>
                                    Add Pet
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {/* Recent Matches */}
                <View style={styles.section}>
                    <View style={styles.sectionTitleContainer}>
                        <Text style={styles.sectionTitle}>Recent Matches</Text>
                        {matches.length > 0 && (
                            <TouchableOpacity
                                onPress={() => navigation.navigate("Chats")}>
                                <Text style={styles.viewAllText}>View All</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Animated matches container */}
                    <Animated.View style={{ opacity: matchesOpacity }}>
                        {matchesLoading && (
                            <View style={styles.matchesLoadingContainer}>
                                <ActivityIndicator
                                    size="small"
                                    color={theme.colors.primary}
                                />
                            </View>
                        )}

                        {!matchesLoading && matches.length > 0 ? (
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.matchesContainer}>
                                {matches.map((match) => (
                                    <TouchableOpacity
                                        key={match.matchId}
                                        style={styles.matchCard}
                                        onPress={() =>
                                            navigateToMatchChat(match.matchId)
                                        }>
                                        <Image
                                            source={
                                                match?.pet?.photos &&
                                                match?.pet?.photos.length
                                                    ? {
                                                          uri: match.pet
                                                              .photos[0],
                                                      }
                                                    : require("../assets/default-pet.png")
                                            }
                                            style={styles.matchImage}
                                        />
                                        <Text style={styles.matchName}>
                                            {match.pet?.name}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        ) : (
                            !matchesLoading && (
                                <View style={styles.emptyStateContainer}>
                                    <Ionicons name="paw-outline" size={48} color={withOpacity(theme.colors.primary, 0.6)} />
                                    <Text style={styles.emptyStateText}>
                                        No matches yet
                                    </Text>
                                    <TouchableOpacity
                                        style={styles.emptyStateButton}
                                        onPress={() =>
                                            navigation.navigate("Finder")
                                        }>
                                        <Text
                                            style={styles.emptyStateButtonText}>
                                            Find Matches Now
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            )
                        )}
                    </Animated.View>
                </View>

                {/* App Stats */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Your Activity</Text>
                    <View style={styles.statsContainer}>
                        <View style={styles.statItem}>
                            <View style={styles.statCircle}>
                                <Text style={styles.statNumber}>
                                    {matches.length || 0}
                                </Text>
                            </View>
                            <Text style={styles.statLabel}>Matches</Text>
                        </View>
                        <View style={styles.statItem}>
                            <View style={[styles.statCircle, styles.petStatCircle]}>
                                <Text style={styles.statNumber}>
                                    {pets.length || 0}
                                </Text>
                            </View>
                            <Text style={styles.statLabel}>Pets</Text>
                        </View>
                        <View style={styles.statItem}>
                            <View style={[styles.statCircle, styles.playdateStatCircle]}>
                                <Text style={styles.statNumber}>0</Text>
                            </View>
                            <Text style={styles.statLabel}>Playdates</Text>
                        </View>
                    </View>
                </View>
                
                {/* Extra padding at bottom for comfortable scrolling */}
                <View style={styles.bottomPadding} />
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    matchesLoadingContainer: {
        height: 120,
        justifyContent: "center",
        alignItems: "center",
    },
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
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.xl,
        paddingTop: theme.spacing.lg,
        paddingBottom: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.divider,
    },
    headerIcon: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: theme.borderRadius.circle,
        backgroundColor: withOpacity(theme.colors.primary, 0.1),
    },
    welcomeText: {
        fontSize: theme.typography.fontSize.xl,
        fontWeight: theme.typography.fontWeight.bold,
        color: theme.colors.textPrimary,
    },
    petWelcome: {
        fontSize: theme.typography.fontSize.md,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
    petTabsWrapper: {
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.divider,
        backgroundColor: theme.colors.backgroundVariant,
    },
    petTabsContainer: {
        paddingVertical: theme.spacing.xs,
        paddingHorizontal: theme.spacing.md,
    },
    petTabsContent: {
        alignItems: "center",
        paddingVertical: theme.spacing.xs,
    },
    petTab: {
        alignItems: "center",
        marginHorizontal: theme.spacing.xs,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        borderRadius: theme.borderRadius.lg,
        flexDirection: "row",
    },
    activePetTab: {
        backgroundColor: withOpacity(theme.colors.primary, 0.15),
    },
    petTabImage: {
        width: 32,
        height: 32,
        borderRadius: 16,
        marginRight: theme.spacing.xs,
        borderWidth: 2,
        borderColor: theme.colors.background,
    },
    activePetTabImage: {
        borderColor: theme.colors.primary,
    },
    petTabName: {
        fontSize: theme.typography.fontSize.sm,
        color: theme.colors.textSecondary,
        fontWeight: theme.typography.fontWeight.medium,
    },
    activePetTabName: {
        fontWeight: theme.typography.fontWeight.bold,
        color: theme.colors.primary,
    },
    scrollContainer: {
        flex: 1,
    },
    section: {
        padding: theme.spacing.xl,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.divider,
    },
    sectionTitleContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: theme.spacing.lg,
    },
    sectionTitle: {
        fontSize: theme.typography.fontSize.lg,
        fontWeight: theme.typography.fontWeight.semiBold,
        color: theme.colors.textPrimary,
        marginBottom: theme.spacing.lg,
    },
    viewAllText: {
        fontSize: theme.typography.fontSize.sm,
        fontWeight: theme.typography.fontWeight.medium,
        color: theme.colors.primary,
    },
    quickActionsContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
    },
    quickActionButton: {
        flex: 1,
        alignItems: "center",
        marginHorizontal: theme.spacing.xs,
    },
    quickActionIconContainer: {
        width: 60,
        height: 60,
        borderRadius: theme.borderRadius.circle,
        backgroundColor: theme.colors.primary,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: theme.spacing.md,
        ...theme.shadows.medium,
    },
    quickActionText: {
        fontSize: theme.typography.fontSize.sm,
        fontWeight: theme.typography.fontWeight.medium,
        color: theme.colors.textPrimary,
        textAlign: "center",
    },
    matchesContainer: {
        paddingVertical: theme.spacing.sm,
    },
    matchCard: {
        marginRight: theme.spacing.lg,
        alignItems: "center",
        width: 100,
    },
    matchImage: {
        width: 80,
        height: 80,
        borderRadius: 40,
        marginBottom: theme.spacing.sm,
        borderWidth: 2,
        borderColor: theme.colors.primary,
        ...theme.shadows.small,
    },
    matchName: {
        fontSize: theme.typography.fontSize.sm,
        fontWeight: theme.typography.fontWeight.medium,
        color: theme.colors.textPrimary,
        textAlign: "center",
    },
    emptyStateContainer: {
        padding: theme.spacing.xl,
        alignItems: "center",
        backgroundColor: theme.colors.backgroundVariant,
        borderRadius: theme.borderRadius.lg,
        margin: theme.spacing.sm,
    },
    emptyStateText: {
        fontSize: theme.typography.fontSize.md,
        color: theme.colors.textSecondary,
        marginVertical: theme.spacing.md,
    },
    emptyStateButton: {
        backgroundColor: theme.colors.primary,
        paddingVertical: theme.spacing.md,
        paddingHorizontal: theme.spacing.lg,
        borderRadius: theme.borderRadius.md,
        ...theme.shadows.small,
    },
    emptyStateButtonText: {
        color: theme.colors.onPrimary,
        fontWeight: theme.typography.fontWeight.semiBold,
        fontSize: theme.typography.fontSize.sm,
    },
    statsContainer: {
        flexDirection: "row",
        justifyContent: "space-around",
        padding: theme.spacing.md,
    },
    statItem: {
        alignItems: "center",
    },
    statCircle: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: withOpacity(theme.colors.primary, 0.15),
        justifyContent: "center",
        alignItems: "center",
        marginBottom: theme.spacing.sm,
        ...theme.shadows.small,
    },
    petStatCircle: {
        backgroundColor: withOpacity(theme.colors.secondary, 0.15),
    },
    playdateStatCircle: {
        backgroundColor: withOpacity(theme.colors.info, 0.15),
    },
    statNumber: {
        fontSize: theme.typography.fontSize.xl,
        fontWeight: theme.typography.fontWeight.bold,
        color: theme.colors.primary,
    },
    statLabel: {
        fontSize: theme.typography.fontSize.sm,
        fontWeight: theme.typography.fontWeight.medium,
        color: theme.colors.textSecondary,
        marginTop: theme.spacing.xs,
    },
    bottomPadding: {
        height: theme.spacing.xxxl,
    }
});

export default HomeScreen;
