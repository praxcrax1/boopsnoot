import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const Header = ({ title, selectedPet, onFilterPress, onPetSelectorPress }) => (
  <View style={styles.header}>
    <Text style={styles.headerTitle}>{title}</Text>
    <View style={styles.headerButtons}>
      <TouchableOpacity
        style={styles.petSwitchButton}
        onPress={onPetSelectorPress}
      >
        {selectedPet && (
          <View style={styles.selectedPetPreview}>
            <Image
              source={
                selectedPet.photos && selectedPet.photos.length > 0
                  ? { uri: selectedPet.photos[0] }
                  : require('../../assets/default-pet.png')
              }
              style={styles.selectedPetImage}
            />
            <Text style={styles.selectedPetName}>{selectedPet.name}</Text>
            <Ionicons name="chevron-down" size={14} color="#666" />
          </View>
        )}
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.filterButton}
        onPress={onFilterPress}
      >
        <Ionicons name="options-outline" size={20} color="#333" />
      </TouchableOpacity>
    </View>
  </View>
);

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  petSwitchButton: {
    marginRight: 12,
  },
  selectedPetPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  selectedPetImage: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 6,
  },
  selectedPetName: {
    fontSize: 14,
    color: '#333333',
    marginRight: 4,
  },
  filterButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default Header;