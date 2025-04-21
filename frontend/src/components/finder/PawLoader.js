import React, { useEffect } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { Ionicons } from "@expo/vector-icons";

const PawLoader = () => {
    const pawAnimation = new Animated.Value(0);

    useEffect(() => {
        const animate = () => {
            Animated.sequence([
                Animated.timing(pawAnimation, {
                    toValue: 1,
                    duration: 600,
                    useNativeDriver: true,
                    easing: Easing.out(Easing.cubic),
                }),
                Animated.timing(pawAnimation, {
                    toValue: 0,
                    duration: 600,
                    useNativeDriver: true,
                    easing: Easing.in(Easing.cubic),
                })
            ]).start(() => animate());
        };

        animate();
    }, []);

    const scaleInterpolation = pawAnimation.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 1.2]
    });

    const opacityInterpolation = pawAnimation.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [0.3, 1, 0.3]
    });

    return (
        <View style={styles.container}>
            <Animated.View style={[
                styles.iconContainer,
                {
                    transform: [{ scale: scaleInterpolation }],
                    opacity: opacityInterpolation
                }
            ]}>
                <Ionicons name="paw" size={48} color="#FF6B6B" />
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconContainer: {
        width: 80,
        height: 80,
        justifyContent: 'center',
        alignItems: 'center',
    }
});

export default PawLoader;