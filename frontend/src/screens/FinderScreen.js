import React, { useState, useEffect, useRef, useContext } from "react";
import {
    View,
    StyleSheet,
    TouchableOpacity,
    StatusBar,
    Platform,
    Animated,
    Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import MatchService from "../services/MatchService";
import PetService from "../services/PetService";
import theme from "../styles/theme";
import ChatService from "../services/ChatService";
import { AuthContext } from "../contexts/AuthContext";

// Import extracted components
import Header from "../components/finder/Header";
import EmptyState from "../components/finder/EmptyState";
import FilterModal from "../components/finder/FilterModal";
import PetSelectorModal from "../components/finder/PetSelectorModal";
import PetCard from "../components/finder/PetCard";
import SkeletonLoader from "../components/finder/SkeletonLoader";
import PawLoader from "../components/finder/PawLoader";

const FinderScreen = ({ navigation }) => {
    const [loading, setLoading] = useState(true);
    const [initialLoading, setInitialLoading] = useState(true);
    const [potentialMatches, setPotentialMatches] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [filterVisible, setFilterVisible] = useState(false);
    const [activeFilters, setActiveFilters] = useState({
        maxDistance: 25,
    });
    const [tempFilters, setTempFilters] = useState({
        maxDistance: 25,
    });
    const [userPets, setUserPets] = useState([]);
    const [selectedPetId, setSelectedPetId] = useState(null);
    const [selectedPet, setSelectedPet] = useState(null);
    const [petSelectorVisible, setPetSelectorVisible] = useState(false);
    const [page, setPage] = useState(0);
    const [hasMorePets, setHasMorePets] = useState(true);
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const contentOpacity = useRef(new Animated.Value(0)).current;
    const cardAnimation = useRef(new Animated.Value(1)).current;
    const cardScale = useRef(new Animated.Value(1)).current;
    const cardOpacity = useRef(new Animated.Value(1)).current;
    const nextCardOpacity = useRef(new Animated.Value(0)).current;
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [dataLoading, setDataLoading] = useState(true);

    useEffect(() => {
        StatusBar.setBarStyle(Platform.OS === 'ios' ? "dark-content" : "light-content");
        fetchUserPets();

        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 750,
            useNativeDriver: true,
            delay: 100,
        }).start();
    }, []);

    useEffect(() => {
        if (selectedPetId) {
            setPage(0);
            setHasMorePets(true);
            fetchPotentialMatches(true);
        }
    }, [selectedPetId, activeFilters]);

    useEffect(() => {
        if (selectedPetId && userPets.length > 0) {
            const pet = userPets.find((pet) => pet._id === selectedPetId);
            setSelectedPet(pet);
        }
    }, [selectedPetId, userPets]);

    const fetchUserPets = async () => {
        setLoading(true);
        setDataLoading(true);
        try {
            const response = await PetService.getUserPets();
            if (response.pets && response.pets.length > 0) {
                setUserPets(response.pets);
                setSelectedPetId(response.pets[0]._id);
            } else {
                Alert.alert(
                    "No Pets Found",
                    "You need to add a pet before you can find matches.",
                    [
                        {
                            text: "Add Pet",
                            onPress: () =>
                                navigation.navigate("PetProfileSetup"),
                        },
                        {
                            text: "Cancel",
                            onPress: () => navigation.goBack(),
                            style: "cancel",
                        },
                    ]
                );
            }
        } catch (error) {
            console.error("Error fetching user pets:", error);
            Alert.alert(
                "Error",
                "Failed to fetch your pets. Please try again."
            );
        } finally {
            setLoading(false);
        }
    };

    const fetchPotentialMatches = async (reset = false) => {
        if (!selectedPetId) return;

        setLoading(true);
        setDataLoading(true);
        try {
            const apiFilters = {
                ...activeFilters,
                skip: reset ? 0 : page * 10,
                limit: 10,
            };

            const response = await MatchService.getPotentialMatches(
                apiFilters,
                selectedPetId
            );
            const newPets = response.pets || [];

            if (reset) {
                Animated.sequence([
                    Animated.timing(contentOpacity, {
                        toValue: 0,
                        duration: 200,
                        useNativeDriver: true,
                    }),
                    Animated.timing(contentOpacity, {
                        toValue: 1,
                        duration: 500,
                        useNativeDriver: true,
                        delay: 100,
                    }),
                ]).start();

                setPotentialMatches(newPets);
                setCurrentIndex(0);
            } else {
                setPotentialMatches((prev) => {
                    const existingIds = new Set(prev.map((pet) => pet._id));
                    const uniquePets = newPets.filter(
                        (pet) => !existingIds.has(pet._id)
                    );
                    return [...prev, ...uniquePets];
                });
            }

            setHasMorePets(newPets.length > 0);
            if (newPets.length > 0) {
                setPage(reset ? 1 : page + 1);
            }
        } catch (error) {
            console.error("Error fetching potential matches:", error);
            Alert.alert(
                "Error",
                "Failed to fetch potential matches. Please try again."
            );
        } finally {
            setLoading(false);
            setInitialLoading(false);
            setDataLoading(false);
        }
    };

    const animateCardTransition = (isLike) => {
        setIsTransitioning(true);
        
        // Animation for center outward effect (scaling + opacity)
        Animated.parallel([
            // Scale the card up slightly then down to 0
            Animated.sequence([
                Animated.timing(cardScale, {
                    toValue: 1.05,
                    duration: 100,
                    useNativeDriver: true,
                }),
                Animated.timing(cardScale, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]),
            // Fade out the card
            Animated.timing(cardOpacity, {
                toValue: 0,
                duration: 250,
                useNativeDriver: true,
            }),
            // Prepare next card to appear
            Animated.timing(nextCardOpacity, {
                toValue: 1,
                duration: 200,
                delay: 150,
                useNativeDriver: true,
            }),
        ]).start(() => {
            // Reset animation values
            cardScale.setValue(1);
            cardOpacity.setValue(1);
            nextCardOpacity.setValue(0);
            setIsTransitioning(false);
            goToNextPet();
        });
    };

    const handleLike = async () => {
        if (currentIndex >= potentialMatches.length || isTransitioning) return;

        const pet = potentialMatches[currentIndex];
        animateCardTransition(true);

        try {
            const response = await MatchService.likeProfile(
                selectedPetId,
                pet._id
            );

            if (response.isMatch) {
                Alert.alert("New Match!", `You matched with ${pet.name}!`, [
                    {
                        text: "Send Message",
                        onPress: () => navigateToMatchChat(response.match._id),
                    },
                    {
                        text: "Continue Browsing",
                        style: "cancel",
                    },
                ]);
            }
        } catch (error) {
            console.error("Error liking profile:", error);
            Alert.alert("Error", "Failed to like profile. Please try again.");
        }
    };

    const handlePass = async () => {
        if (currentIndex >= potentialMatches.length || isTransitioning) return;

        const pet = potentialMatches[currentIndex];
        animateCardTransition(false);

        try {
            await MatchService.passProfile(selectedPetId, pet._id);
        } catch (error) {
            console.error("Error passing profile:", error);
            Alert.alert("Error", "Failed to pass profile. Please try again.");
        }
    };

    const goToNextPet = () => {
        const nextIndex = currentIndex + 1;
        setCurrentIndex(nextIndex);

        if (hasMorePets && nextIndex >= potentialMatches.length - 2) {
            fetchPotentialMatches(false);
        }
    };

    const handleFilterChange = (name, value) => {
        setTempFilters({
            ...tempFilters,
            [name]: value,
        });
    };

    const applyFilters = () => {
        setActiveFilters(tempFilters);
        setFilterVisible(false);
    };

    const renderCurrentCard = () => {
        if (loading && !initialLoading) {
            return <PawLoader />;
        }
        
        if (dataLoading) {
            return <PawLoader />;
        }

        if (potentialMatches.length === 0 || currentIndex >= potentialMatches.length) {
            return <EmptyState onRefresh={() => fetchPotentialMatches(true)} />;
        }

        return (
            <>
                {currentIndex < potentialMatches.length - 1 && (
                    <Animated.View style={[
                        styles.nextCardContainer,
                        { opacity: nextCardOpacity }
                    ]}>
                        <PetCard
                            pet={potentialMatches[currentIndex + 1]}
                            onCardPress={() => {}}
                        />
                    </Animated.View>
                )}
                <Animated.View style={[
                    styles.currentCardContainer,
                    {
                        transform: [
                            { scale: cardScale }
                        ],
                        opacity: cardOpacity,
                    }
                ]}>
                    <PetCard
                        pet={potentialMatches[currentIndex]}
                        onCardPress={() =>
                            navigation.navigate("PetProfileScreen", {
                                petId: potentialMatches[currentIndex]._id,
                            })
                        }
                    />
                </Animated.View>
            </>
        );
    };

    if (initialLoading) {
        return (
            <SafeAreaView style={styles.container}>
                <Header
                    title="Find Playmates"
                    selectedPet={selectedPet}
                    onFilterPress={() => {}}
                    onPetSelectorPress={() => {}}
                />
                <SkeletonLoader />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={["top"]}>
            <StatusBar 
                barStyle={Platform.OS === 'ios' ? "dark-content" : "light-content"}
                backgroundColor="#F8F9FA" 
            />

            <View style={styles.mainContainer}>
                <Header
                    title="Find Playmates"
                    selectedPet={selectedPet}
                    onFilterPress={() => setFilterVisible(true)}
                    onPetSelectorPress={() => setPetSelectorVisible(true)}
                />

                <View style={styles.contentContainer}>
                    {renderCurrentCard()}
                </View>

                {potentialMatches.length > 0 &&
                    currentIndex < potentialMatches.length &&
                    !loading &&
                    !dataLoading && (
                        <View style={styles.actionsContainer}>
                            <TouchableOpacity
                                style={[styles.actionButton, styles.passButton]}
                                onPress={handlePass}
                                disabled={isTransitioning}>
                                <Ionicons name="close" size={32} color="#FF6B6B" />
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.actionButton, styles.likeButton]}
                                onPress={handleLike}
                                disabled={isTransitioning}>
                                <Ionicons name="heart" size={32} color="#FFFFFF" />
                            </TouchableOpacity>
                        </View>
                    )}

                <FilterModal
                    visible={filterVisible}
                    filters={tempFilters}
                    onClose={() => setFilterVisible(false)}
                    onFilterChange={handleFilterChange}
                    onApply={applyFilters}
                />

                <PetSelectorModal
                    visible={petSelectorVisible}
                    pets={userPets}
                    selectedPetId={selectedPetId}
                    onClose={() => setPetSelectorVisible(false)}
                    onSelectPet={(id) => {
                        setSelectedPetId(id);
                        setPetSelectorVisible(false);
                    }}
                />
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F8F9FA",
    },
    mainContainer: {
        flex: 1,
        position: 'relative',
    },
    contentContainer: {
        flex: 1,
        position: 'relative',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionsContainer: {
        position: 'absolute',
        bottom: 32,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 100,
    },
    actionButton: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: 16,
        ...Platform.select({
            ios: {
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.2,
                shadowRadius: 8,
            },
            android: {
                elevation: 8,
            },
        }),
    },
    likeButton: {
        backgroundColor: '#FF6B6B',
    },
    passButton: {
        backgroundColor: '#FFFFFF',
    },
    nextCardContainer: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 1,
    },
    currentCardContainer: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 2,
    },
});

export default FinderScreen;
