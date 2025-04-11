import React from 'react';
import { View, Text, StyleSheet, Image, Animated, Dimensions, Pressable, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import DetailBadge from './DetailBadge';

const { width, height } = Dimensions.get('window');
const CARD_WIDTH = width * 0.92;
const CARD_HEIGHT = height * 0.60;

const PetCard = ({ 
  pet, 
  position, 
  swipeDirection, 
  panHandlers, 
  isActive, 
  cardStyle, 
  nextCardStyle,
  onCardPress 
}) => {
  // Active card with swipe animations
  if (isActive) {
    const rotate = position.x.interpolate({
      inputRange: [-width / 2, 0, width / 2],
      outputRange: ['-10deg', '0deg', '10deg'],
      extrapolate: 'clamp',
    });
    
    const likeOpacity = swipeDirection.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1],
    });
    
    const dislikeOpacity = swipeDirection.interpolate({
      inputRange: [-1, 0],
      outputRange: [1, 0],
    });

    // Scale effect for when card moves in either direction
    const scale = position.x.interpolate({
      inputRange: [-width / 2, 0, width / 2],
      outputRange: [0.98, 1, 0.98],
      extrapolate: 'clamp',
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
              zIndex: 1,
            },
            cardStyle
          ]}
          {...panHandlers}
        >
          <Animated.View style={[styles.likeContainer, { opacity: likeOpacity }]}>
            <BlurView intensity={90} tint="light" style={styles.likeBlur}>
              <Text style={styles.likeText}>LIKE</Text>
            </BlurView>
          </Animated.View>
          
          <Animated.View style={[styles.dislikeContainer, { opacity: dislikeOpacity }]}>
            <BlurView intensity={90} tint="light" style={styles.dislikeBlur}>
              <Text style={styles.dislikeText}>NOPE</Text>
            </BlurView>
          </Animated.View>
          
          <Image
            source={
              pet.photos && pet.photos.length > 0
                ? { uri: pet.photos[0] }
                : require('../../assets/default-pet.png')
            }
            style={styles.cardImage}
            resizeMode="cover"
          />
          
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.7)']}
            style={styles.gradient}
          />
          
          <View style={styles.cardContent}>
            <View style={styles.nameRow}>
              <Text style={styles.petName}>{pet.name}</Text>
              <View style={styles.distanceBadge}>
                <Ionicons name="location" size={14} color="#FFFFFF" />
                <Text style={styles.petDistance}>
                  {pet.distance ? `${pet.distance.toFixed(1)} mi` : 'Nearby'}
                </Text>
              </View>
            </View>
            
            <Text style={styles.petBreed}>{pet.breed}</Text>
            
            <View style={styles.detailsRow}>
              <DetailBadge label="Age" value={pet.age} />
              <DetailBadge label="Size" value={pet.size} />
              <DetailBadge 
                label="Vaccinated" 
                value={pet.vaccinated === 'yes' ? 'Yes' : 'No'} 
              />
            </View>
            
            {pet.temperament && pet.temperament.length > 0 && (
              <View style={styles.tagsContainer}>
                {pet.temperament.map((tag, index) => (
                  <View key={index} style={styles.tag}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            )}
            
            <Text style={styles.petDescription} numberOfLines={3}>
              {pet.description}
            </Text>
            
            <View style={styles.actionHint}>
              <Text style={styles.actionHintText}>Swipe right to like • Swipe left to pass</Text>
            </View>
          </View>
        </Animated.View>
      </Pressable>
    );
  }
  
  // Next card with scale effect
  return (
    <Animated.View
      style={[
        styles.card,
        {
          ...Platform.select({
            ios: {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.1,
              shadowRadius: 10,
            },
            android: {
              elevation: 4,
            },
          }),
        },
        nextCardStyle,
      ]}
    >
      <Image
        source={
          pet.photos && pet.photos.length > 0
            ? { uri: pet.photos[0] }
            : require('../../assets/default-pet.png')
        }
        style={styles.cardImage}
        resizeMode="cover"
      />
      
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.7)']}
        style={styles.gradient}
      />
      
      <View style={styles.cardContent}>
        <View style={styles.nameRow}>
          <Text style={styles.petName}>{pet.name}</Text>
          <View style={styles.distanceBadge}>
            <Ionicons name="location" size={14} color="#FFFFFF" />
            <Text style={styles.petDistance}>
              {pet.distance ? `${pet.distance.toFixed(1)} mi` : 'Nearby'}
            </Text>
          </View>
        </View>
        
        <Text style={styles.petBreed}>{pet.breed}</Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    overflow: 'hidden',
    marginLeft: -CARD_WIDTH / 2,
    marginTop: -CARD_HEIGHT / 2 + 20
  },
  cardImage: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '55%',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  cardContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  petName: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
  },
  petDistance: {
    fontSize: 14,
    color: '#FFFFFF',
    marginLeft: 4,
    fontWeight: '500',
  },
  petBreed: {
    fontSize: 18,
    color: '#F0F0F0',
    marginBottom: 16,
  },
  detailsRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  tag: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 14,
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  petDescription: {
    fontSize: 16,
    color: '#F0F0F0',
    lineHeight: 22,
    marginBottom: 16,
  },
  likeContainer: {
    position: 'absolute',
    top: 50,
    right: 40,
    zIndex: 1,
    transform: [{ rotate: '15deg' }],
  },
  likeBlur: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: '#4CAF50',
  },
  likeText: {
    color: '#4CAF50',
    fontSize: 32,
    fontWeight: '800',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  dislikeContainer: {
    position: 'absolute',
    top: 50,
    left: 40,
    zIndex: 1,
    transform: [{ rotate: '-15deg' }],
  },
  dislikeBlur: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: '#FF5252',
  },
  dislikeText: {
    color: '#FF5252',
    fontSize: 32,
    fontWeight: '800',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  actionHint: {
    alignItems: 'center',
    marginTop: 8,
  },
  actionHintText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    fontWeight: '500',
  }
});

export default PetCard;