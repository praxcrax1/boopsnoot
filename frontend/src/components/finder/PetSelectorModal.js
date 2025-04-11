import React from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, StyleSheet, Image, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

const { width, height } = Dimensions.get('window');

const PetSelectorModal = ({ visible, pets, selectedPetId, onClose, onSelectPet }) => (
  <Modal
    visible={visible}
    transparent={true}
    animationType="fade"
    onRequestClose={onClose}
  >
    <BlurView intensity={80} style={styles.modalOverlay}>
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Your Pets</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={20} color="#333" />
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.petList}>
          {pets.map((pet) => (
            <TouchableOpacity
              key={pet._id}
              style={[
                styles.petItem,
                selectedPetId === pet._id && styles.selectedPetItem
              ]}
              onPress={() => onSelectPet(pet._id)}
            >
              <Image
                source={
                  pet.photos && pet.photos.length > 0
                    ? { uri: pet.photos[0] }
                    : require('../../assets/default-pet.png')
                }
                style={styles.petItemImage}
              />
              <View style={styles.petItemInfo}>
                <Text style={styles.petItemName}>{pet.name}</Text>
                <Text style={styles.petItemBreed}>{pet.breed}</Text>
              </View>
              {selectedPetId === pet._id && (
                <Ionicons name="checkmark-circle" size={20} color="#FF6B6B" />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </BlurView>
  </Modal>
);

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    width: width * 0.85,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  petList: {
    maxHeight: height * 0.5,
  },
  petItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  selectedPetItem: {
    backgroundColor: '#FFF8F8',
  },
  petItemImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  petItemInfo: {
    flex: 1,
    marginLeft: 12,
  },
  petItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },
  petItemBreed: {
    fontSize: 14,
    color: '#666666',
  },
});

export default PetSelectorModal;