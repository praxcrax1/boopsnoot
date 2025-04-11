import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.92;

const SkeletonLoader = () => {
  const fadeAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0.8,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0.3,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.card, { opacity: fadeAnim }]}>
        <View style={styles.imageArea}></View>
        <View style={styles.contentArea}>
          <Animated.View style={[styles.nameBar, { opacity: fadeAnim }]} />
          <Animated.View style={[styles.shortBar, { opacity: fadeAnim }]} />
          <View style={styles.detailsRow}>
            <Animated.View style={[styles.badge, { opacity: fadeAnim }]} />
            <Animated.View style={[styles.badge, { opacity: fadeAnim }]} />
            <Animated.View style={[styles.badge, { opacity: fadeAnim }]} />
          </View>
          <Animated.View style={[styles.longBar, { opacity: fadeAnim }]} />
          <Animated.View style={[styles.longBar, { opacity: fadeAnim, width: '65%' }]} />
        </View>
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
  card: {
    width: CARD_WIDTH,
    height: '90%',
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    overflow: 'hidden',
  },
  imageArea: {
    width: '100%',
    height: '65%',
    backgroundColor: '#E0E0E0',
  },
  contentArea: {
    padding: 20,
  },
  nameBar: {
    width: '60%',
    height: 28,
    backgroundColor: '#E0E0E0',
    borderRadius: 14,
    marginBottom: 12,
  },
  shortBar: {
    width: '40%',
    height: 16,
    backgroundColor: '#E0E0E0',
    borderRadius: 8,
    marginBottom: 20,
  },
  detailsRow: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  badge: {
    width: 80,
    height: 40,
    backgroundColor: '#E0E0E0',
    borderRadius: 8,
    marginRight: 10,
  },
  longBar: {
    width: '90%',
    height: 12,
    backgroundColor: '#E0E0E0',
    borderRadius: 6,
    marginBottom: 10,
  },
});

export default SkeletonLoader;