import React, { useEffect } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import { Ionicons } from "@expo/vector-icons";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const ActionAnimation = ({ type, animationValues, onAnimationComplete }) => {
  const { scale, opacity, position } = animationValues;
  
  useEffect(() => {
    // Animation sequence: faster rise from bottom to center while scaling up, then fade out
    Animated.sequence([
      Animated.parallel([
        // Move up from bottom to center (faster)
        Animated.timing(position, {
          toValue: -SCREEN_HEIGHT / 4, // Move up to center from bottom
          duration: 400, // Reduced from 600
          useNativeDriver: true,
        }),
        // Scale up (faster)
        Animated.timing(scale, {
          toValue: 1,
          duration: 400, // Reduced from 600
          useNativeDriver: true,
        }),
        // Fade in (faster)
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300, // Reduced from 400
          useNativeDriver: true,
        }),
      ]),
      // Shorter hold time
      Animated.delay(100), // Reduced from 200
      // Fade out (faster)
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200, // Reduced from 300
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

  // Render minimalist icons based on action type
  const renderIcon = () => {
    if (type === 'like') {
      return (
        <View style={styles.iconContainer}>
          <View style={styles.heartContainer}>
            <Ionicons name="heart" size={80} color="#FF6B6B" style={styles.heartIcon} />
          </View>
        </View>
      );
    } else {
      return (
        <View style={styles.iconContainer}>
          <View style={styles.passContainer}>
            <Ionicons name="close" size={80} color="#666" style={styles.passIcon} />
          </View>
        </View>
      );
    }
  };

  return (
    <View style={styles.container} pointerEvents="none">
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
        {renderIcon()}
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
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  heartContainer: {
    padding: 10,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
  },
  heartIcon: {
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  passContainer: {
    padding: 10,
    borderRadius: 50,
    backgroundColor: 'rgba(200, 200, 200, 0.1)',
  },
  passIcon: {
    shadowColor: '#666',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  }
});

export default ActionAnimation;