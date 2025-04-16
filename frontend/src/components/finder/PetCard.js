import React from "react";
import {
    View,
    Text,
    StyleSheet,
    Image,
    Animated,
    Dimensions,
    Pressable,
    Platform,
} from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import DetailBadge from "./DetailBadge";

const { width, height } = Dimensions.get("window");
// Reduced card height even further to allow more space at bottom
const CARD_WIDTH = width * 0.94;
const CARD_HEIGHT = height * 0.55; // Reduced from 60% to 55% of screen height

const PetCard = ({
    pet,
    position,
    swipeDirection,
    panHandlers,
    isActive,
    cardStyle,
    nextCardStyle,
    onCardPress,
}) => {
    const formatDistance = (distance) => {
        if (!distance && distance !== 0) return "Nearby";

        if (typeof distance === "number") {
            if (distance < 1) {
                return `${(distance * 1000).toFixed(0)}m`;
            } else if (distance < 10) {
                return `${distance.toFixed(1)}km`;
            } else {
                return `${Math.round(distance)}km`;
            }
        }

        return "Nearby";
    };

    if (isActive) {
        const rotate = position.x.interpolate({
            inputRange: [-width / 2, 0, width / 2],
            outputRange: ["-8deg", "0deg", "8deg"],
            extrapolate: "clamp",
        });

        const likeOpacity = swipeDirection.interpolate({
            inputRange: [0, 0.5, 1],
            outputRange: [0, 0.8, 1],
            extrapolate: "clamp",
        });

        const dislikeOpacity = swipeDirection.interpolate({
            inputRange: [-1, -0.5, 0],
            outputRange: [1, 0.8, 0],
            extrapolate: "clamp",
        });

        const scale = position.x.interpolate({
            inputRange: [-width / 2, 0, width / 2],
            outputRange: [0.985, 1, 0.985],
            extrapolate: "clamp",
        });

        return (
            <Pressable onPress={onCardPress}>
                <Animated.View
                    style={[
                        styles.card,
                        {
                            transform: [
                                { rotate },
                                { scale },
                                ...position.getTranslateTransform(),
                            ],
                            zIndex: 10,
                            opacity: 1,
                        },
                        cardStyle,
                    ]}
                    {...panHandlers}>
                    <Animated.View
                        style={[
                            styles.likeContainer,
                            { opacity: likeOpacity },
                        ]}>
                        <BlurView
                            intensity={60}
                            tint="light"
                            style={styles.likeBlur}>
                            <Text style={styles.likeText}>LIKE</Text>
                        </BlurView>
                    </Animated.View>

                    <Animated.View
                        style={[
                            styles.dislikeContainer,
                            { opacity: dislikeOpacity },
                        ]}>
                        <BlurView
                            intensity={60}
                            tint="light"
                            style={styles.dislikeBlur}>
                            <Text style={styles.dislikeText}>NOPE</Text>
                        </BlurView>
                    </Animated.View>

                    <Image
                        source={
                            pet.photos && pet.photos.length > 0
                                ? { uri: pet.photos[0] }
                                : require("../../assets/default-pet.png")
                        }
                        style={styles.cardImage}
                        resizeMode="cover"
                    />

                    <LinearGradient
                        colors={["transparent", "rgba(0,0,0,0.8)"]}
                        style={styles.gradient}
                    />

                    <View style={styles.cardContent}>
                        <View style={styles.nameRow}>
                            <Text style={styles.petName}>{pet.name}</Text>
                            <View style={styles.distanceBadge}>
                                <Ionicons
                                    name="location"
                                    size={14}
                                    color="#FFFFFF"
                                />
                                <Text style={styles.petDistance}>
                                    {formatDistance(pet.distance)}
                                </Text>
                            </View>
                        </View>

                        <Text style={styles.petBreed}>{pet.breed}</Text>

                        <View style={styles.detailsRow}>
                            <DetailBadge label="Age" value={pet.age} />
                            <DetailBadge label="Size" value={pet.size} />
                            <DetailBadge
                                label="Vaccinated"
                                value={pet.vaccinated === "yes" ? "Yes" : "No"}
                            />
                        </View>

                        {pet.temperament && pet.temperament.length > 0 && (
                            <View style={styles.tagsContainer}>
                                {pet.temperament.slice(0, 3).map((tag, index) => (
                                    <View key={index} style={styles.tag}>
                                        <Text style={styles.tagText}>
                                            {tag}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        )}

                        {pet.description && (
                            <Text style={styles.petDescription} numberOfLines={2}>
                                {pet.description}
                            </Text>
                        )}
                    </View>
                </Animated.View>
            </Pressable>
        );
    }

    return (
        <Animated.View
            style={[
                styles.card,
                {
                    ...Platform.select({
                        ios: {
                            shadowColor: "#000",
                            shadowOffset: { width: 0, height: 5 },
                            shadowOpacity: 0.15,
                            shadowRadius: 12,
                        },
                        android: {
                            elevation: 8,
                        },
                    }),
                    zIndex: 5,
                },
                nextCardStyle,
            ]}>
            <Image
                source={
                    pet.photos && pet.photos.length > 0
                        ? { uri: pet.photos[0] }
                        : require("../../assets/default-pet.png")
                }
                style={styles.cardImage}
                resizeMode="cover"
            />

            <LinearGradient
                colors={["transparent", "rgba(0,0,0,0.8)"]}
                style={styles.gradient}
            />

            <View style={styles.cardContent}>
                <View style={styles.nameRow}>
                    <Text style={styles.petName}>{pet.name}</Text>
                    <View style={styles.distanceBadge}>
                        <Ionicons name="location" size={14} color="#FFFFFF" />
                        <Text style={styles.petDistance}>
                            {formatDistance(pet.distance)}
                        </Text>
                    </View>
                </View>

                <Text style={styles.petBreed}>{pet.breed}</Text>

                <View style={styles.detailsRow}>
                    <DetailBadge label="Age" value={pet.age} />
                    <DetailBadge label="Size" value={pet.size} />
                    <DetailBadge
                        label="Vaccinated"
                        value={pet.vaccinated === "yes" ? "Yes" : "No"}
                    />
                </View>
            </View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    card: {
        position: "absolute",
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        borderRadius: 20,
        backgroundColor: "#FFFFFF",
        overflow: "hidden",
        marginLeft: -CARD_WIDTH / 2,
        marginTop: -CARD_HEIGHT / 2, // Move card higher on screen
        top: "50%", // Position card higher (from 50% to 45%)
        left: "50%",
        ...Platform.select({
            ios: {
                shadowColor: "#000000",
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.15,
                shadowRadius: 12,
            },
            android: {
                elevation: 8,
            },
        }),
    },
    cardImage: {
        width: "100%",
        height: "100%",
        borderRadius: 20,
    },
    gradient: {
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        height: "50%",
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
    },
    cardContent: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        padding: 24,
    },
    nameRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 4,
    },
    petName: {
        fontSize: 32,
        fontWeight: "700",
        color: "#FFFFFF",
        textShadowColor: "rgba(0, 0, 0, 0.4)",
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
    },
    distanceBadge: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(0, 0, 0, 0.3)",
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 14,
    },
    petDistance: {
        fontSize: 14,
        color: "#FFFFFF",
        marginLeft: 4,
        fontWeight: "500",
    },
    petBreed: {
        fontSize: 18,
        color: "#F0F0F0",
        marginBottom: 16,
    },
    detailsRow: {
        flexDirection: "row",
        marginBottom: 16,
    },
    tagsContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
        marginBottom: 16,
    },
    tag: {
        backgroundColor: "rgba(255, 255, 255, 0.2)",
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 14,
        marginRight: 8,
        marginBottom: 8,
    },
    tagText: {
        fontSize: 14,
        color: "#FFFFFF",
        fontWeight: "500",
    },
    petDescription: {
        fontSize: 15,
        color: "rgba(255, 255, 255, 0.9)",
        lineHeight: 21,
        marginBottom: 8,
    },
    likeContainer: {
        position: "absolute",
        top: 60,
        right: 40,
        zIndex: 1,
        transform: [{ rotate: "15deg" }],
    },
    likeBlur: {
        borderRadius: 10,
        overflow: "hidden",
        borderWidth: 2,
        borderColor: "#4CAF50",
    },
    likeText: {
        color: "#4CAF50",
        fontSize: 28,
        fontWeight: "800",
        paddingVertical: 8,
        paddingHorizontal: 16,
    },
    dislikeContainer: {
        position: "absolute",
        top: 60,
        left: 40,
        zIndex: 1,
        transform: [{ rotate: "-15deg" }],
    },
    dislikeBlur: {
        borderRadius: 10,
        overflow: "hidden",
        borderWidth: 2,
        borderColor: "#FF5252",
    },
    dislikeText: {
        color: "#FF5252",
        fontSize: 28,
        fontWeight: "800",
        paddingVertical: 8,
        paddingHorizontal: 16,
    },
});

export default PetCard;
