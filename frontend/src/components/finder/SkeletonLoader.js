import React, { useEffect, useRef } from "react";
import { View, Animated, StyleSheet, Dimensions } from "react-native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const SkeletonLoader = () => {
    const shimmerAnim = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Fade in the skeleton
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
        }).start();

        // Start shimmer animation
        Animated.loop(
            Animated.sequence([
                Animated.timing(shimmerAnim, {
                    toValue: 1,
                    duration: 1200,
                    useNativeDriver: true,
                }),
                Animated.timing(shimmerAnim, {
                    toValue: 0,
                    duration: 1200,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    }, []);

    const getShimmerStyle = (width = "100%") => {
        const translateX = shimmerAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [-SCREEN_WIDTH, SCREEN_WIDTH],
        });

        return {
            width,
            opacity: 0.7,
            backgroundColor: "#E0E0E0",
            overflow: "hidden",
            position: "relative",
        };
    };

    const renderImageDots = () => {
        return (
            <View style={styles.paginationDots}>
                {[0, 1, 2, 3].map((_, index) => (
                    <View key={index} style={styles.paginationDot} />
                ))}
            </View>
        );
    };

    const ShimmerEffect = ({ children, style }) => (
        <Animated.View style={[style, { opacity: fadeAnim }]}>
            {children}
            <Animated.View
                style={[
                    StyleSheet.absoluteFill,
                    {
                        transform: [{ translateX: shimmerAnim }],
                        backgroundColor: "#FFFFFF",
                        opacity: 0.3,
                    },
                ]}
            />
        </Animated.View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.card}>
                <View style={styles.imageContainer}>
                    <ShimmerEffect style={styles.imageArea} />
                    {renderImageDots()}
                </View>

                <View style={styles.contentContainer}>
                    <View style={styles.headerSection}>
                        <View style={styles.nameContainer}>
                            <ShimmerEffect style={[styles.shimmerBlock, { width: "60%", height: 32 }]} />
                            <ShimmerEffect style={[styles.shimmerBlock, { width: 100, height: 32, borderRadius: 16 }]} />
                        </View>
                        <ShimmerEffect style={[styles.shimmerBlock, { width: "40%", height: 24, marginTop: 8 }]} />
                    </View>

                    <View style={styles.detailsRow}>
                        {[1, 2, 3].map((_, index) => (
                            <ShimmerEffect
                                key={index}
                                style={[styles.detailBadge]}
                            />
                        ))}
                    </View>

                    <View style={styles.section}>
                        <ShimmerEffect style={[styles.shimmerBlock, { width: "40%", height: 24, marginBottom: 16 }]} />
                        <View style={styles.tagsContainer}>
                            {[1, 2, 3, 4].map((_, index) => (
                                <ShimmerEffect
                                    key={index}
                                    style={[styles.tag]}
                                />
                            ))}
                        </View>
                    </View>

                    <View style={styles.section}>
                        <ShimmerEffect style={[styles.shimmerBlock, { width: "30%", height: 24, marginBottom: 16 }]} />
                        <ShimmerEffect style={[styles.shimmerBlock, { width: "100%", height: 16, marginBottom: 8 }]} />
                        <ShimmerEffect style={[styles.shimmerBlock, { width: "90%", height: 16, marginBottom: 8 }]} />
                        <ShimmerEffect style={[styles.shimmerBlock, { width: "95%", height: 16, marginBottom: 8 }]} />
                    </View>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#FFFFFF",
    },
    card: {
        flex: 1,
    },
    imageContainer: {
        height: SCREEN_WIDTH,
        backgroundColor: "#f0f0f0",
        position: "relative",
    },
    imageArea: {
        width: "100%",
        height: "100%",
        backgroundColor: "#E0E0E0",
    },
    paginationDots: {
        position: "absolute",
        bottom: 16,
        left: 0,
        right: 0,
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        gap: 8,
    },
    paginationDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: "rgba(255, 255, 255, 0.5)",
    },
    contentContainer: {
        padding: 20,
    },
    headerSection: {
        marginBottom: 24,
    },
    nameContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    detailsRow: {
        flexDirection: "row",
        gap: 12,
        marginBottom: 24,
    },
    detailBadge: {
        flex: 1,
        height: 64,
        backgroundColor: "#E0E0E0",
        borderRadius: 12,
    },
    section: {
        marginBottom: 24,
    },
    tagsContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
    },
    tag: {
        width: 80,
        height: 36,
        backgroundColor: "#E0E0E0",
        borderRadius: 18,
    },
    shimmerBlock: {
        backgroundColor: "#E0E0E0",
        borderRadius: 8,
    },
});

export default SkeletonLoader;
