import React from 'react';
import { TouchableOpacity, Text, Image, StyleSheet, Animated } from 'react-native';
import theme, { withOpacity } from '../../styles/theme';

/**
 * FilterChip component for the ChatListScreen
 * Displays a selectable pill/chip with pet avatar and name
 */
const FilterChip = ({ pet, isSelected, onSelect }) => {
  // Animation for selection effect
  const [scaleAnim] = React.useState(new Animated.Value(1));
  
  React.useEffect(() => {
    if (isSelected) {
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.05,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isSelected]);
  
  // If this is the "All Pets" option
  if (!pet) {
    return (
      <Animated.View style={[{ transform: [{ scale: scaleAnim }] }]}>
        <TouchableOpacity
          style={[
            styles.chip,
            isSelected ? styles.chipSelected : styles.chipUnselected,
          ]}
          onPress={() => onSelect(null)}
          activeOpacity={0.7}
        >
          <Text style={[
            styles.label, 
            isSelected ? styles.labelSelected : styles.labelUnselected
          ]}>
            All Chats
          </Text>
        </TouchableOpacity>
      </Animated.View>
    );
  }
  
  // Regular pet chip
  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity
        style={[
          styles.chip,
          isSelected ? styles.chipSelected : styles.chipUnselected,
        ]}
        onPress={() => onSelect(pet._id)}
        activeOpacity={0.7}
      >
        <Image
          source={
            pet.photos && pet.photos.length > 0
              ? { uri: pet.photos[0] }
              : require("../../assets/default-pet.png")
          }
          style={styles.avatar}
        />
        <Text style={[
          styles.label, 
          isSelected ? styles.labelSelected : styles.labelUnselected
        ]}>
          {pet.name}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
  },
  chipSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  chipUnselected: {
    backgroundColor: 'transparent',
    borderColor: withOpacity(theme.colors.textSecondary, 0.3),
  },
  avatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 6,
  },
  label: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
  },
  labelSelected: {
    color: theme.colors.onPrimary,
  },
  labelUnselected: {
    color: theme.colors.textPrimary,
  },
});

export default FilterChip;