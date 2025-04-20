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
    useWindowDimensions,
} from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import DetailBadge from "./DetailBadge";

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
    const { width: windowWidth, height: windowHeight } = useWindowDimensions();
    
    // Dynamic card dimensions based on screen size
    const CARD_WIDTH = Math.min(windowWidth * 0.92, 400);
    const CARD_HEIGHT = Math.min(windowHeight * 0.68, 600);

    const formatDistance = (distance) => {
        if (!distance && distance !== 0) return "Nearby";
        if (typeof distance === "number") {
            if (distance < 1) return `${(distance * 1000).toFixed(0)}m`;
            if (distance < 10) return `${distance.toFixed(1)}km`;
            return `${Math.round(distance)}km`;
        }
        return "Nearby";
    };

    const renderActiveCard = () => {
        const rotate = position.x.interpolate({
            inputRange: [-windowWidth / 2, 0, windowWidth / 2],
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
            inputRange: [-windowWidth / 2, 0, windowWidth / 2],
            outputRange: [0.985, 1, 0.985],
            extrapolate: "clamp",
        });

        return (
            <Pressable onPress={onCardPress}>
                <Animated.View
                    style={[
                        styles.card(CARD_WIDTH, CARD_HEIGHT),
                        {
                            transform: [{ rotate }, { scale }, ...position.getTranslateTransform()],
                            zIndex: 10,
                            opacity: 1,
                        },
                        cardStyle,
                    ]}
                    {...panHandlers}>
                    <Animated.View style={[styles.likeContainer, { opacity: likeOpacity }]}>
                        <BlurView intensity={60} tint="light" style={styles.likeBlur}>
                            <Text style={styles.likeText}>LIKE</Text>
                        </BlurView>
                    </Animated.View>

                    <Animated.View style={[styles.dislikeContainer, { opacity: dislikeOpacity }]}>
                        <BlurView intensity={60} tint="light" style={styles.dislikeBlur}>
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
                        colors={["transparent", "rgba(0,0,0,0.9)"]}
                        style={styles.gradient}
                    />

                    <View style={styles.cardContent}>
                        <View style={styles.nameRow}>
                            <Text style={styles.petName}>{pet.name}</Text>
                            <View style={styles.distanceBadge}>
                                <Ionicons name="location" size={14} color="#FFFFFF" />
                                <Text style={styles.petDistance}>{formatDistance(pet.distance)}</Text>
                            </View>
                        </View>

                        <Text style={styles.petBreed}>{pet.breed}</Text>

                        <View style={styles.detailsRow}>
                            <DetailBadge label="Age" value={pet.age} />
                            <DetailBadge label="Size" value={pet.size} />
                            <DetailBadge label="Vaccinated" value={pet.vaccinated === "yes" ? "Yes" : "No"} />
                        </View>

                        {pet.temperament && pet.temperament.length > 0 && (
                            <View style={styles.tagsContainer}>
                                {pet.temperament.slice(0, 3).map((tag, index) => (
                                    <View key={index} style={styles.tag}>
                                        <Text style={styles.tagText}>{tag}</Text>
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
    };

    if (isActive) {
        return renderActiveCard();
    }

    return (
        <Animated.View
            style={[
                styles.card(CARD_WIDTH, CARD_HEIGHT),
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
                colors={["transparent", "rgba(0,0,0,0.9)"]}
                style={styles.gradient}
            />

            <View style={styles.cardContent}>
                <View style={styles.nameRow}>
                    <Text style={styles.petName}>{pet.name}</Text>
                    <View style={styles.distanceBadge}>
                        <Ionicons name="location" size={14} color="#FFFFFF" />
                        <Text style={styles.petDistance}>{formatDistance(pet.distance)}</Text>
                    </View>
                </View>

                <Text style={styles.petBreed}>{pet.breed}</Text>

                <View style={styles.detailsRow}>
                    <DetailBadge label="Age" value={pet.age} />
                    <DetailBadge label="Size" value={pet.size} />
                    <DetailBadge label="Vaccinated" value={pet.vaccinated === "yes" ? "Yes" : "No"} />
                </View>
            </View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    card: (width, height) => ({
        position: "absolute",
        width,
        height,
        borderRadius: 24,
        backgroundColor: "#FFFFFF",
        overflow: "hidden",
        marginLeft: -width / 2,
        marginTop: -height / 2,
        top: "50%",
        left: "50%",
        ...Platform.select({
            ios: {
                shadowColor: "#000000",
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.2,
                shadowRadius: 15,
            },
            android: {
                elevation: 12,
            },
        }),
    }),
    cardImage: {
        width: "100%",
        height: "100%",
        borderRadius: 24,
    },
    gradient: {
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        height: "60%",
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
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
        marginBottom: 8,
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
        backgroundColor: "rgba(255, 255, 255, 0.15)",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        backdropFilter: "blur(10px)",
    },
    petDistance: {
        fontSize: 14,
        color: "#FFFFFF",
        marginLeft: 4,
        fontWeight: "600",
    },
    petBreed: {
        fontSize: 18,
        color: "#F0F0F0",
        marginBottom: 16,
        fontWeight: "500",
    },
    detailsRow: {
        flexDirection: "row",
        marginBottom: 16,
        gap: 8,
    },
    tagsContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
        marginBottom: 16,
        gap: 8,
    },
    tag: {
        backgroundColor: "rgba(255, 255, 255, 0.15)",
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 14,
    },
    tagText: {
        fontSize: 14,
        color: "#FFFFFF",
        fontWeight: "500",
    },
    petDescription: {
        fontSize: 15,
        color: "rgba(255, 255, 255, 0.9)",
        lineHeight: 22,
    },
    likeContainer: {
        position: "absolute",
        top: "15%",
        right: "10%",
        zIndex: 1,
        transform: [{ rotate: "15deg" }],
    },
    likeBlur: {
        borderRadius: 12,
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
        top: "15%",
        left: "10%",
        zIndex: 1,
        transform: [{ rotate: "-15deg" }],
    },
    dislikeBlur: {
        borderRadius: 12,
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
