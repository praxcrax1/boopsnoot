import React, { useState, useEffect, useRef, useCallback, useContext } from "react";
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
import * as Haptics from "expo-haptics";
import MatchService from "../services/MatchService";
import PetService from "../services/PetService";
import ChatService from "../services/ChatService";
import { AuthContext } from "../contexts/AuthContext";

// Import extracted components
import Header from "../components/finder/Header";
import EmptyState from "../components/finder/EmptyState";
import FilterModal from "../components/finder/FilterModal";
import PetSelectorModal from "../components/finder/PetSelectorModal";
import PetCard from "../components/finder/PetCard";
import SkeletonLoader from "../components/finder/SkeletonLoader";
import { BlurView } from "expo-blur"; // Ensure expo-blur is installed

const { width, height } = Dimensions.get("window");
const SWIPE_THRESHOLD = width * 0.3; // Increased threshold for more deliberate swipes

const FinderScreen = ({ navigation }) => {
    const [loading, setLoading] = useState(true);
    const [initialLoading, setInitialLoading] = useState(true);
    const [potentialMatches, setPotentialMatches] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [filterVisible, setFilterVisible] = useState(false);
    const [activeFilters, setActiveFilters] = useState({
        maxDistance: 25, // Default 25km radius
    });
    const [tempFilters, setTempFilters] = useState({
        maxDistance: 25, // Default 25km radius
    });
    const [userPets, setUserPets] = useState([]);
    const [selectedPetId, setSelectedPetId] = useState(null);
    const [selectedPet, setSelectedPet] = useState(null);
    const [petSelectorVisible, setPetSelectorVisible] = useState(false);
    const [page, setPage] = useState(0);
    const [hasMorePets, setHasMorePets] = useState(true);
    const [swipingEnabled, setSwipingEnabled] = useState(true);
    const [isSwipingBack, setIsSwipingBack] = useState(false);
    const { requestAndUpdateLocation } = useContext(AuthContext);

    const position = useRef(new Animated.ValueXY()).current;
    const swipeDirection = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const cardOpacity = useRef(new Animated.Value(1)).current;
    const contentOpacity = useRef(new Animated.Value(0)).current;
    const buttonScale = useRef(new Animated.Value(1)).current;

    const swipeProgress = position.x.interpolate({
        inputRange: [-width / 2, 0, width / 2],
        outputRange: [1, 0, 1],
        extrapolate: "clamp",
    });

    const likeButtonScale = position.x.interpolate({
        inputRange: [0, width / 4],
        outputRange: [1, 1.15],
        extrapolate: "clamp",
    });

    const dislikeButtonScale = position.x.interpolate({
        inputRange: [-width / 4, 0],
        outputRange: [1.15, 1],
        extrapolate: "clamp",
    });

    const nextCardOpacity = position.x.interpolate({
        inputRange: [-width / 2, 0, width / 2],
        outputRange: [1, 0.65, 1],
        extrapolate: "clamp",
    });

    const nextCardScale = position.x.interpolate({
        inputRange: [-width / 2, 0, width / 2],
        outputRange: [1, 0.85, 1],
        extrapolate: "clamp",
    });

    const nextCardTranslateY = position.x.interpolate({
        inputRange: [-width / 2, 0, width / 2],
        outputRange: [0, 20, 0],
        extrapolate: "clamp",
    });

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (_, gesture) => {
                return swipingEnabled && Math.abs(gesture.dx) > Math.abs(gesture.dy * 2);
            },
            onPanResponderGrant: () => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

                position.setOffset({
                    x: position.x._value,
                    y: position.y._value,
                });
                position.setValue({ x: 0, y: 0 });

                Animated.spring(buttonScale, {
                    toValue: 1.1,
                    friction: 5,
                    tension: 40,
                    useNativeDriver: true,
                }).start();
            },
            onPanResponderMove: (_, gesture) => {
                if (!swipingEnabled) return;

                position.setValue({ x: gesture.dx, y: gesture.dy * 0.15 });

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

                const thresholdDxPositive = Math.round(SWIPE_THRESHOLD * 0.9);
                const thresholdDxNegative = -Math.round(SWIPE_THRESHOLD * 0.9);

                if (
                    Math.abs(gesture.dx) >= thresholdDxPositive &&
                    Math.abs(gesture.dx) <= thresholdDxPositive + 5
                ) {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                }

                if (
                    Math.abs(gesture.dx) >= Math.abs(thresholdDxNegative) &&
                    Math.abs(gesture.dx) <= Math.abs(thresholdDxNegative) + 5
                ) {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                }
            },
            onPanResponderRelease: (_, gesture) => {
                if (!swipingEnabled) return;

                position.flattenOffset();
                Animated.spring(buttonScale, {
                    toValue: 1,
                    friction: 5,
                    tension: 40,
                    useNativeDriver: true,
                }).start();

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
                Animated.spring(buttonScale, {
                    toValue: 1,
                    friction: 5,
                    tension: 40,
                    useNativeDriver: true,
                }).start();
            },
        })
    ).current;

    useEffect(() => {
        StatusBar.setBarStyle("dark-content");
        fetchUserPets();

        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 750,
            useNativeDriver: true,
            delay: 100,
        }).start();

        return () => {
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
    }, [selectedPetId, activeFilters]);

    useEffect(() => {
        if (selectedPetId && userPets.length > 0) {
            const pet = userPets.find((pet) => pet._id === selectedPetId);
            setSelectedPet(pet);
        }
    }, [selectedPetId, userPets]);

    useEffect(() => {
        if (!initialLoading && potentialMatches.length > 0) {
            Animated.timing(contentOpacity, {
                toValue: 1,
                duration: 600,
                useNativeDriver: true,
            }).start();
        }
    }, [initialLoading, potentialMatches]);

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

        Animated.spring(position, {
            toValue: { x: width + 100, y: 30 },
            friction: 6,
            tension: 40,
            velocity: 5,
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

        Animated.spring(position, {
            toValue: { x: -width - 100, y: 30 },
            friction: 6,
            tension: 40,
            velocity: 5,
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
            friction: 6,
            tension: 60,
            useNativeDriver: false,
        }).start();

        Animated.spring(swipeDirection, {
            toValue: 0,
            friction: 6,
            tension: 60,
            useNativeDriver: false,
        }).start();
    };

    const swipeBack = () => {
        if (currentIndex === 0 || isSwipingBack) return;

        setIsSwipingBack(true);
        setSwipingEnabled(false);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        Animated.timing(cardOpacity, {
            toValue: 0,
            duration: 150,
            useNativeDriver: true,
        }).start(() => {
            setCurrentIndex(currentIndex - 1);
            position.setValue({ x: -width, y: 0 });

            cardOpacity.setValue(1);

            Animated.spring(position, {
                toValue: { x: 0, y: 0 },
                friction: 6,
                tension: 60,
                velocity: 3,
                useNativeDriver: false,
            }).start(() => {
                setIsSwipingBack(false);
                setSwipingEnabled(true);
            });
        });
    };

    const navigateToMatchChat = useCallback(
        async (matchId) => {
            try {
                setLoading(true);

                const chatResponse = await ChatService.getOrCreateChatForMatch(matchId);

                if (chatResponse.success && chatResponse.chat) {
                    navigation.navigate("Chat", {
                        chatId: chatResponse.chat._id,
                    });
                } else {
                    console.error("Failed to get or create chat:", chatResponse);
                    navigation.navigate("Chat", {
                        chatId: matchId,
                    });
                }
            } catch (error) {
                console.error("Error navigating to chat:", error);
                Alert.alert("Error", "Failed to open chat. Please try again.");
            } finally {
                setLoading(false);
            }
        },
        [navigation]
    );

    const handleLike = async () => {
        if (currentIndex >= potentialMatches.length) return;

        const pet = potentialMatches[currentIndex];
        const currentPetIndex = currentIndex;

        goToNextPet();

        try {
            const response = await MatchService.likeProfile(
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
            setCurrentIndex(currentPetIndex);
        }
    };

    const handlePass = async () => {
        if (currentIndex >= potentialMatches.length) return;

        const pet = potentialMatches[currentIndex];
        const currentPetIndex = currentIndex;

        goToNextPet();

        try {
            await MatchService.passProfile(selectedPetId, pet._id);
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
        setTempFilters({
            ...tempFilters,
            [name]: value,
        });
    };

    const applyFilters = () => {
        setActiveFilters(tempFilters);
        setFilterVisible(false);
    };

    const handleOpenFilterModal = () => {
        setTempFilters({ ...activeFilters });
        setFilterVisible(true);
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
                        <Animated.View
                            key={pet._id}
                            style={{
                                zIndex: 10,
                                opacity: cardOpacity,
                            }}>
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
                                transform: [
                                    { scale: nextCardScale },
                                    { translateY: nextCardTranslateY },
                                ],
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
                    onFilterPress={handleOpenFilterModal}
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
                        <Animated.View
                            style={[
                                styles.actionsContainer,
                                { opacity: contentOpacity },
                            ]}>
                                <View style={styles.buttonsContainer}>
                                    <Animated.View
                                        style={{
                                            transform: [
                                                { scale: dislikeButtonScale },
                                            ],
                                        }}>
                                        <TouchableOpacity
                                            style={[
                                                styles.button,
                                                styles.passButton,
                                            ]}
                                            onPress={swipeLeft}
                                            disabled={!swipingEnabled}>
                                            <Ionicons
                                                name="close"
                                                size={32}
                                                color="#fff"
                                            />
                                        </TouchableOpacity>
                                    </Animated.View>

                                    <Animated.View
                                        style={{
                                            transform: [
                                                { scale: likeButtonScale },
                                            ],
                                        }}>
                                        <TouchableOpacity
                                            style={[
                                                styles.button,
                                                styles.likeButton,
                                            ]}
                                            onPress={swipeRight}
                                            disabled={!swipingEnabled}>
                                            <Ionicons
                                                name="heart"
                                                size={32}
                                                color="#fff"
                                            />
                                        </TouchableOpacity>
                                    </Animated.View>
                                </View>
                        </Animated.View>
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
        paddingBottom: height * 0.15, // Use percentage of screen height instead of fixed value
    },
    actionsContainer: {
        position: "absolute",
        bottom: 0, // Position from bottom based on screen height
        left: 0,
        right: 0,
        height: height * 0.15, // Explicitly set height to 15% of screen height
        alignItems: "center",
        justifyContent: "center",
    },
    actionsBlur: {
        borderRadius: 30,
        overflow: "hidden",
        width: "70%",
        ...Platform.select({
            ios: {
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.2,
                shadowRadius: 8,
            },
            android: {
                elevation: 6,
            },
        }),
    },
    buttonsContainer: {
        flexDirection: "row",
        justifyContent: "space-around",
        alignItems: "center",
        paddingVertical: 16,
        paddingHorizontal: 24,
        width: "100%",
    },
    button: {
        width: 70,
        height: 70,
        borderRadius: 35,
        justifyContent: "center",
        alignItems: "center",
        ...Platform.select({
            ios: {
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.16,
                shadowRadius: 6,
            },
            android: {
                elevation: 8,
            },
        }),
    },
    passButton: {
        backgroundColor: "#FF5252",
    },
    likeButton: {
        backgroundColor: "#4CAF50",
    },
});

export default FinderScreen;
