import React, { useState, useEffect, useRef, useContext, useCallback } from "react";
import {
    View,
    StyleSheet,
    TouchableOpacity,
    StatusBar,
    Platform,
    Animated,
    Alert,
    Easing,
    Dimensions,
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
import ActionAnimation from "../components/finder/ActionAnimation";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

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
    
    // Current visible pet state - to handle clean transitions
    const [currentVisiblePet, setCurrentVisiblePet] = useState(null);
    const [isCardVisible, setIsCardVisible] = useState(true);
    
    // Animation refs
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const contentOpacity = useRef(new Animated.Value(0)).current;
    const cardScale = useRef(new Animated.Value(1)).current;
    const cardOpacity = useRef(new Animated.Value(1)).current;
    const cardPosition = useRef(new Animated.Value(50)).current; // Start position for entrance animation
    const nextCardOpacity = useRef(new Animated.Value(0)).current;
    
    // Heart/X animation references
    const actionIconScale = useRef(new Animated.Value(0)).current;
    const actionIconOpacity = useRef(new Animated.Value(0)).current;
    const actionIconPosition = useRef(new Animated.Value(100)).current;
    const [currentAction, setCurrentAction] = useState(null); // 'like' or 'pass'
    const [isTransitioning, setIsTransitioning] = useState(false);
    
    // Prefetching logic
    const [petQueue, setPetQueue] = useState([]);
    const [prefetchingInProgress, setPrefetchingInProgress] = useState(false);
    const prefetchThreshold = 3; // Start prefetching when we have this many pets left

    // Navigate to chat when there's a match
    const navigateToMatchChat = async (matchId) => {
        try {
            const chatResponse = await ChatService.getOrCreateChatForMatch(matchId);
            if (chatResponse && chatResponse.chat) {
                navigation.navigate("ChatScreen", {
                    chatId: chatResponse.chat._id,
                    matchId,
                });
            }
        } catch (error) {
            console.error("Error navigating to match chat:", error);
        }
    };

    useEffect(() => {
        StatusBar.setBarStyle(Platform.OS === 'ios' ? "dark-content" : "light-content");
        fetchUserPets();

        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 750,
            useNativeDriver: true,
            delay: 100,
        }).start();
        
        return () => {
            // Cleanup animations
            actionIconScale.setValue(0);
            actionIconOpacity.setValue(0);
            actionIconPosition.setValue(100);
        };
    }, []);

    useEffect(() => {
        if (selectedPetId) {
            setPage(0);
            setHasMorePets(true);
            setPetQueue([]);
            fetchPotentialMatches(true);
        }
    }, [selectedPetId, activeFilters]);

    useEffect(() => {
        if (selectedPetId && userPets.length > 0) {
            const pet = userPets.find((pet) => pet._id === selectedPetId);
            setSelectedPet(pet);
        }
    }, [selectedPetId, userPets]);
    
    // Update current visible pet when currentIndex changes or potentialMatches updates
    useEffect(() => {
        if (potentialMatches.length > 0 && currentIndex < potentialMatches.length) {
            setCurrentVisiblePet(potentialMatches[currentIndex]);
            
            // Reset position for entrance animation
            cardPosition.setValue(50); // Start from 50 points below
            
            // Animate the card entry
            Animated.parallel([
                // Fade in the card
                Animated.timing(cardOpacity, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
                // Move up from bottom
                Animated.timing(cardPosition, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                    easing: Easing.out(Easing.cubic),
                })
            ]).start();
        } else {
            setCurrentVisiblePet(null);
        }
    }, [currentIndex, potentialMatches]);
    
    // Prefetch logic - monitor when we need more pets
    useEffect(() => {
        const remainingPets = potentialMatches.length - currentIndex;
        
        // If we're running low on pets and not currently prefetching, prefetch more
        if (remainingPets <= prefetchThreshold && hasMorePets && !prefetchingInProgress) {
            prefetchMorePets();
        }
    }, [currentIndex, potentialMatches, hasMorePets, prefetchingInProgress]);
    
    // Merge prefetched pets into the main list when ready
    useEffect(() => {
        if (petQueue.length > 0 && !prefetchingInProgress) {
            // Add prefetched pets to the main list
            setPotentialMatches(prev => {
                const existingIds = new Set(prev.map(pet => pet._id));
                const uniquePets = petQueue.filter(pet => !existingIds.has(pet._id));
                return [...prev, ...uniquePets];
            });
            
            // Clear the queue
            setPetQueue([]);
        }
    }, [petQueue, prefetchingInProgress]);

    const fetchUserPets = async () => {
        setLoading(true);
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

            setHasMorePets(newPets.length === 10); // If we got less than requested, there are no more
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
        }
    };
    
    // Prefetch more pets in the background
    const prefetchMorePets = async () => {
        if (!hasMorePets || prefetchingInProgress || !selectedPetId) return;
        
        setPrefetchingInProgress(true);
        
        try {
            const apiFilters = {
                ...activeFilters,
                skip: page * 10,
                limit: 10,
            };

            const response = await MatchService.getPotentialMatches(
                apiFilters,
                selectedPetId
            );
            const newPets = response.pets || [];
            
            if (newPets.length > 0) {
                setPetQueue(newPets);
                setPage(page + 1);
            }
            
            setHasMorePets(newPets.length === 10);
        } catch (error) {
            console.error("Error prefetching potential matches:", error);
        } finally {
            setPrefetchingInProgress(false);
        }
    };

    const handleLikeAction = useCallback(async () => {
        if (currentIndex >= potentialMatches.length || isTransitioning) return;
        
        const pet = potentialMatches[currentIndex];
        setCurrentAction('like');
        setIsTransitioning(true);
        setIsCardVisible(false); // Hide card immediately to prevent old data from showing

        // Start the card fade animation
        Animated.parallel([
            // Scale the card up slightly then down to 0
            Animated.timing(cardScale, {
                toValue: 0.8,
                duration: 300,
                useNativeDriver: true,
            }),
            // Fade out the card
            Animated.timing(cardOpacity, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }),
        ]).start();
        
        try {
            const response = await MatchService.likeProfile(
                selectedPetId,
                pet._id
            );

            if (response.isMatch) {
                // Schedule match notification to appear after animation completes
                setTimeout(() => {
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
                }, 1200); // Time to allow animation to finish
            }
        } catch (error) {
            console.error("Error liking profile:", error);
            // Still show error but after animation is complete
            setTimeout(() => {
                Alert.alert("Error", "Failed to like profile. Please try again.");
            }, 1200);
        }
    }, [currentIndex, potentialMatches, isTransitioning, selectedPetId]);

    const handlePassAction = useCallback(async () => {
        if (currentIndex >= potentialMatches.length || isTransitioning) return;
        
        const pet = potentialMatches[currentIndex];
        setCurrentAction('pass');
        setIsTransitioning(true);
        setIsCardVisible(false); // Hide card immediately to prevent old data from showing

        // Start the card fade animation
        Animated.parallel([
            // Scale the card down
            Animated.timing(cardScale, {
                toValue: 0.8,
                duration: 300,
                useNativeDriver: true,
            }),
            // Fade out the card
            Animated.timing(cardOpacity, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }),
        ]).start();
        
        try {
            await MatchService.passProfile(selectedPetId, pet._id);
        } catch (error) {
            console.error("Error passing profile:", error);
            // Still show error but after animation is complete
            setTimeout(() => {
                Alert.alert("Error", "Failed to pass profile. Please try again.");
            }, 1200);
        }
    }, [currentIndex, potentialMatches, isTransitioning, selectedPetId]);

    const onActionComplete = useCallback(() => {
        // Move to next pet first, so the data is cleared
        const nextIndex = currentIndex + 1;
        setCurrentIndex(nextIndex);
        
        // Then reset animation values for next use
        cardScale.setValue(1);
        cardOpacity.setValue(1);
        
        // Reset transition state after a slight delay to ensure new data is loaded
        setTimeout(() => {
            setIsCardVisible(true);
            setIsTransitioning(false);
            setCurrentAction(null);
        }, 100);
    }, [currentIndex]);

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

    const renderActionAnimation = () => {
        if (currentAction) {
            const animationValues = {
                scale: actionIconScale,
                opacity: actionIconOpacity,
                position: actionIconPosition,
            };
            
            return (
                <ActionAnimation 
                    type={currentAction}
                    animationValues={animationValues}
                    onAnimationComplete={onActionComplete}
                />
            );
        }
        return null;
    };

    const renderCurrentCard = () => {
        if (loading && !initialLoading) {
            return <PawLoader />;
        }
        
        if (potentialMatches.length === 0 || currentIndex >= potentialMatches.length) {
            return <EmptyState onRefresh={() => fetchPotentialMatches(true)} />;
        }

        // Only render card when it's not transitioning
        return (
            <>
                {isCardVisible && currentIndex < potentialMatches.length - 1 && (
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
                {isCardVisible && currentVisiblePet && (
                    <Animated.View style={[
                        styles.currentCardContainer,
                        {
                            transform: [
                                { scale: cardScale },
                                { translateY: cardPosition }
                            ],
                            opacity: cardOpacity,
                        }
                    ]}>
                        <PetCard
                            key={`pet-${currentVisiblePet._id}`} // Force re-render on pet change
                            pet={currentVisiblePet}
                            onCardPress={() =>
                                navigation.navigate("PetProfileScreen", {
                                    petId: currentVisiblePet._id,
                                })
                            }
                        />
                    </Animated.View>
                )}
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
                    {renderActionAnimation()}
                </View>

                {potentialMatches.length > 0 &&
                    currentIndex < potentialMatches.length &&
                    !loading &&
                    !isTransitioning && (
                        <View style={styles.actionsContainer}>
                            <TouchableOpacity
                                style={[styles.actionButton, styles.passButton]}
                                onPress={handlePassAction}
                                disabled={isTransitioning}>
                                <Ionicons name="close" size={32} color="#FF6B6B" />
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.actionButton, styles.likeButton]}
                                onPress={handleLikeAction}
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
        paddingHorizontal: 48,
    },
    actionButton: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
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
