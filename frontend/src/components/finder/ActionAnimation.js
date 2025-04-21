import React, { useEffect } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import { Ionicons } from "@expo/vector-icons";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const ActionAnimation = ({ type, animationValues, onAnimationComplete }) => {
  const { scale, opacity, position } = animationValues;
  
  useEffect(() => {
    // Animation sequence: rise from bottom to center while scaling up, then fade out
    Animated.sequence([
      Animated.parallel([
        // Move up from bottom to center
        Animated.timing(position, {
          toValue: -SCREEN_HEIGHT / 4, // Move up to center from bottom
          duration: 600,
          useNativeDriver: true,
        }),
        // Scale up
        Animated.timing(scale, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        // Fade in
        Animated.timing(opacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
      // Hold briefly at center
      Animated.delay(200),
      // Fade out
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Reset animation values
      scale.setValue(0);
      opacity.setValue(0);
      position.setValue(100);
      
      // Trigger callback when animation completes
      if (onAnimationComplete) {
        onAnimationComplete();
      }
    });
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.animatedContainer,
          {
            opacity,
            transform: [
              { translateY: position },
              { scale },
            ],
          },
        ]}
      >
        {type === 'like' ? (
          <Ionicons name="heart" size={100} color="#FF6B6B" />
        ) : (
          <Ionicons name="close" size={100} color="#666" />
        )}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  animatedContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ActionAnimation;