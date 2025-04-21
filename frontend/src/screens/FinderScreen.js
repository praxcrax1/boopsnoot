import React, { useState, useEffect, useRef, useContext } from "react";
import {
    View,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
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

            <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
                <Header
                    title="Find Playmates"
                    selectedPet={selectedPet}
                    onFilterPress={() => setFilterVisible(true)}
                    onPetSelectorPress={() => setPetSelectorVisible(true)}
                />

                <View style={styles.contentContainer}>
                    {loading && !initialLoading ? (
                        <SkeletonLoader />
                    ) : potentialMatches.length === 0 || currentIndex >= potentialMatches.length ? (
                        <EmptyState onRefresh={() => fetchPotentialMatches(true)} />
                    ) : (
                        <PetCard
                            pet={potentialMatches[currentIndex]}
                            onCardPress={() =>
                                navigation.navigate("PetProfileScreen", {
                                    petId: potentialMatches[currentIndex]._id,
                                })
                            }
                        />
                    )}
                </View>

                {potentialMatches.length > 0 &&
                    currentIndex < potentialMatches.length &&
                    !loading && (
                        <View style={styles.actionsContainer}>
                            <TouchableOpacity
                                style={[styles.actionButton, styles.passButton]}
                                onPress={handlePass}>
                                <Ionicons name="close" size={32} color="#fff" />
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.actionButton, styles.likeButton]}
                                onPress={handleLike}>
                                <Ionicons name="heart" size={32} color="#fff" />
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
            </Animated.View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F8F9FA",
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
        bottom: 24,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 20,
        paddingHorizontal: 20,
    },
    actionButton: {
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        ...Platform.select({
            ios: {
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.25,
                shadowRadius: 8,
            },
            android: {
                elevation: 6,
            },
        }),
    },
    likeButton: {
        backgroundColor: theme.colors.secondary,
    },
    passButton: {
        backgroundColor: theme.colors.primary,
    },
});

export default FinderScreen;
