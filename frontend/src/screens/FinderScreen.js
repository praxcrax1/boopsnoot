import React, { useState, useEffect, useRef } from "react";
import {
    View,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Dimensions,
    Alert,
    Animated,
    PanResponder,
    StatusBar,
    Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { matchService, petService } from "../api/api";
import * as Haptics from "expo-haptics";

// Import extracted components
import Header from "../components/finder/Header";
import EmptyState from "../components/finder/EmptyState";
import FilterModal from "../components/finder/FilterModal";
import PetSelectorModal from "../components/finder/PetSelectorModal";
import PetCard from "../components/finder/PetCard";
import SkeletonLoader from "../components/finder/SkeletonLoader";

const { width } = Dimensions.get("window");
const SWIPE_THRESHOLD = width * 0.25;

const FinderScreen = ({ navigation }) => {
    const [loading, setLoading] = useState(true);
    const [initialLoading, setInitialLoading] = useState(true);
    const [potentialMatches, setPotentialMatches] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [filterVisible, setFilterVisible] = useState(false);
    const [filters, setFilters] = useState({
        maxDistance: 10, // in miles
    });
    const [userPets, setUserPets] = useState([]);
    const [selectedPetId, setSelectedPetId] = useState(null);
    const [selectedPet, setSelectedPet] = useState(null);
    const [petSelectorVisible, setPetSelectorVisible] = useState(false);
    const [page, setPage] = useState(0);
    const [hasMorePets, setHasMorePets] = useState(true);
    const [swipingEnabled, setSwipingEnabled] = useState(true);
    const [isSwipingBack, setIsSwipingBack] = useState(false);

    // Animation values
    const position = useRef(new Animated.ValueXY()).current;
    const swipeDirection = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    // Additional animation values for smoothness
    const cardOpacity = useRef(new Animated.Value(1)).current;
    const contentOpacity = useRef(new Animated.Value(0)).current;

    const nextCardOpacity = position.x.interpolate({
        inputRange: [-width / 2, 0, width / 2],
        outputRange: [1, 0.5, 1],
        extrapolate: "clamp",
    });

    const nextCardScale = position.x.interpolate({
        inputRange: [-width / 2, 0, width / 2],
        outputRange: [1, 0.5, 1],
        extrapolate: "clamp",
    });

    // Improved Pan responder for swipe gestures
    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => swipingEnabled,
            onPanResponderGrant: () => {
                position.setOffset({
                    x: position.x._value,
                    y: position.y._value,
                });
                position.setValue({ x: 0, y: 0 });
            },
            onPanResponderMove: (_, gesture) => {
                if (!swipingEnabled) return;

                position.setValue({ x: gesture.dx, y: gesture.dy * 0.2 }); // Reduce vertical movement

                // Update swipe direction indicator
                if (gesture.dx > 0) {
                    swipeDirection.setValue(
                        gesture.dx / SWIPE_THRESHOLD > 1
                            ? 1
                            : gesture.dx / SWIPE_THRESHOLD
                    );
                } else {
                    swipeDirection.setValue(
                        gesture.dx / SWIPE_THRESHOLD < -1
                            ? -1
                            : gesture.dx / SWIPE_THRESHOLD
                    );
                }

                // Provide haptic feedback when crossing the threshold
                if (Math.abs(gesture.dx) === Math.round(SWIPE_THRESHOLD)) {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
            },
            onPanResponderRelease: (_, gesture) => {
                if (!swipingEnabled) return;

                position.flattenOffset();

                if (gesture.dx > SWIPE_THRESHOLD) {
                    swipeRight();
                } else if (gesture.dx < -SWIPE_THRESHOLD) {
                    swipeLeft();
                } else {
                    resetPosition();
                }
            },
            onPanResponderTerminate: () => {
                resetPosition();
            },
        })
    ).current;

    useEffect(() => {
        StatusBar.setBarStyle("dark-content");
        fetchUserPets();

        // Fade in content when the component mounts
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
            delay: 100,
        }).start();

        return () => {
            // Reset any animation when component unmounts
            position.setValue({ x: 0, y: 0 });
            swipeDirection.setValue(0);
        };
    }, []);

    useEffect(() => {
        if (selectedPetId) {
            setPage(0);
            setHasMorePets(true);
            fetchPotentialMatches(true);
        }
    }, [selectedPetId, filters]);

    useEffect(() => {
        if (selectedPetId && userPets.length > 0) {
            const pet = userPets.find((pet) => pet._id === selectedPetId);
            setSelectedPet(pet);
        }
    }, [selectedPetId, userPets]);

    // Animate content opacity when new cards are shown
    useEffect(() => {
        if (!initialLoading && potentialMatches.length > 0) {
            Animated.timing(contentOpacity, {
                toValue: 1,
                duration: 500,
                useNativeDriver: true,
            }).start();
        }
    }, [initialLoading, potentialMatches]);

    const fetchUserPets = async () => {
        setLoading(true);
        try {
            const response = await petService.getUserPets();
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
                ...filters,
                skip: reset ? 0 : page * 10,
                limit: 10,
            };

            const response = await matchService.getPotentialMatches(
                apiFilters,
                selectedPetId
            );
            const newPets = response.pets || [];

            if (reset) {
                // Fade out and in for smoother transitions when resetting
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
        }
    };

    const swipeRight = () => {
        setSwipingEnabled(false);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        Animated.timing(position, {
            toValue: { x: width + 100, y: 0 },
            duration: 300,
            useNativeDriver: false,
        }).start(() => {
            handleLike();
            position.setValue({ x: 0, y: 0 });
            swipeDirection.setValue(0);
            setSwipingEnabled(true);
        });
    };

    const swipeLeft = () => {
        setSwipingEnabled(false);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        Animated.timing(position, {
            toValue: { x: -width - 100, y: 0 },
            duration: 300,
            useNativeDriver: false,
        }).start(() => {
            handlePass();
            position.setValue({ x: 0, y: 0 });
            swipeDirection.setValue(0);
            setSwipingEnabled(true);
        });
    };

    const resetPosition = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        Animated.spring(position, {
            toValue: { x: 0, y: 0 },
            friction: 5,
            tension: 40,
            useNativeDriver: false,
        }).start();

        Animated.spring(swipeDirection, {
            toValue: 0,
            friction: 5,
            tension: 40,
            useNativeDriver: false,
        }).start();
    };

    // Swipe back to previous pet
    const swipeBack = () => {
        if (currentIndex === 0 || isSwipingBack) return;

        setIsSwipingBack(true);
        setSwipingEnabled(false);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        // First fade out current card
        Animated.timing(cardOpacity, {
            toValue: 0,
            duration: 150,
            useNativeDriver: true,
        }).start(() => {
            // Go to previous card
            setCurrentIndex(currentIndex - 1);
            position.setValue({ x: -width, y: 0 });

            // Immediate reset of opacity
            cardOpacity.setValue(1);

            // Animate the card back in from the left
            Animated.spring(position, {
                toValue: { x: 0, y: 0 },
                friction: 5,
                tension: 40,
                useNativeDriver: false,
            }).start(() => {
                setIsSwipingBack(false);
                setSwipingEnabled(true);
            });
        });
    };

    const handleLike = async () => {
        if (currentIndex >= potentialMatches.length) return;

        const pet = potentialMatches[currentIndex];
        const currentPetIndex = currentIndex;

        goToNextPet();

        try {
            const response = await matchService.likeProfile(
                selectedPetId,
                pet._id
            );

            if (response.isMatch) {
                Haptics.notificationAsync(
                    Haptics.NotificationFeedbackType.Success
                );

                Alert.alert("New Match!", `You matched with ${pet.name}!`, [
                    {
                        text: "Send Message",
                        onPress: () =>
                            navigation.navigate("Chat", {
                                chatId: response.match._id,
                            }),
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
            setCurrentIndex(currentPetIndex);
        }
    };

    const handlePass = async () => {
        if (currentIndex >= potentialMatches.length) return;

        const pet = potentialMatches[currentIndex];
        const currentPetIndex = currentIndex;

        goToNextPet();

        try {
            await matchService.passProfile(selectedPetId, pet._id);
        } catch (error) {
            console.error("Error passing profile:", error);
            Alert.alert("Error", "Failed to pass profile. Please try again.");
            setCurrentIndex(currentPetIndex);
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
        setFilters({
            ...filters,
            [name]: value,
        });
    };

    const renderCards = () => {
        if (
            potentialMatches.length === 0 ||
            currentIndex >= potentialMatches.length
        ) {
            return <EmptyState onRefresh={() => fetchPotentialMatches(true)} />;
        }

        return potentialMatches
            .map((pet, i) => {
                if (i < currentIndex) return null;

                if (i === currentIndex) {
                    return (
                        <Animated.View key={pet._id} style={{ zIndex: 10 }}>
                            <PetCard
                                pet={pet}
                                position={position}
                                swipeDirection={swipeDirection}
                                panHandlers={panResponder.panHandlers}
                                isActive={true}
                                cardStyle={{ zIndex: 10 }}
                                onCardPress={() =>
                                    navigation.navigate("PetProfileScreen", {
                                        petId: pet._id,
                                    })
                                }
                            />
                        </Animated.View>
                    );
                }

                if (i === currentIndex + 1) {
                    return (
                        <PetCard
                            key={pet._id}
                            pet={pet}
                            isActive={false}
                            nextCardStyle={{
                                opacity: nextCardOpacity,
                                transform: [{ scale: nextCardScale }],
                                zIndex: 1,
                            }}
                        />
                    );
                }

                return null;
            })
            .reverse();
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
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#F8F9FA" />

            <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
                <Header
                    title="Find Playmates"
                    selectedPet={selectedPet}
                    onFilterPress={() => setFilterVisible(true)}
                    onPetSelectorPress={() => setPetSelectorVisible(true)}
                />

                <Animated.View
                    style={[
                        styles.cardsContainer,
                        { opacity: contentOpacity },
                    ]}>
                    {loading && !initialLoading && currentIndex === 0 ? (
                        <SkeletonLoader />
                    ) : (
                        renderCards()
                    )}
                </Animated.View>

                {potentialMatches.length > 0 &&
                    currentIndex < potentialMatches.length &&
                    !loading && (
                        <View style={styles.buttonsContainer}>
                            <TouchableOpacity
                                style={[styles.roundButton, styles.undoButton]}
                                onPress={swipeBack}
                                disabled={currentIndex === 0 || isSwipingBack}>
                                <Ionicons
                                    name="arrow-undo"
                                    size={22}
                                    color={
                                        currentIndex === 0 ? "#CCCCCC" : "#666"
                                    }
                                />
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.button, styles.passButton]}
                                onPress={swipeLeft}
                                disabled={!swipingEnabled}>
                                <Ionicons name="close" size={28} color="#fff" />
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.button, styles.likeButton]}
                                onPress={swipeRight}
                                disabled={!swipingEnabled}>
                                <Ionicons name="heart" size={28} color="#fff" />
                            </TouchableOpacity>
                        </View>
                    )}

                <FilterModal
                    visible={filterVisible}
                    filters={filters}
                    onClose={() => setFilterVisible(false)}
                    onFilterChange={handleFilterChange}
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
            </Animated.View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F8F9FA",
    },
    cardsContainer: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    buttonsContainer: {
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        paddingBottom: 24,
        paddingTop: 12,
        top: 30,
    },
    button: {
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#000000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        elevation: 4,
        marginHorizontal: 16,
        ...Platform.select({
            ios: {
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.16,
                shadowRadius: 6,
            },
            android: {
                elevation: 6,
            },
        }),
    },
    roundButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: "center",
        alignItems: "center",
        marginHorizontal: 10,
        backgroundColor: "#F0F0F0",
        ...Platform.select({
            ios: {
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.1,
                shadowRadius: 3,
            },
            android: {
                elevation: 2,
            },
        }),
    },
    undoButton: {
        position: "absolute",
        left: 20,
    },
    passButton: {
        backgroundColor: "#FF5252",
    },
    likeButton: {
        backgroundColor: "#4CAF50",
    },
});

export default FinderScreen;
