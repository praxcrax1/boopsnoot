import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Alert,
  Modal,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { matchService, petService } from '../api/api';
import { PET_TYPES_ARRAY } from '../constants/petConstants';

const { width } = Dimensions.get('window');
const cardWidth = width * 0.85;

const FinderScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [potentialMatches, setPotentialMatches] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [filterVisible, setFilterVisible] = useState(false);
  const [filters, setFilters] = useState({
    maxDistance: 10, // in miles
  });
  const [userPets, setUserPets] = useState([]);
  const [selectedPetId, setSelectedPetId] = useState(null);
  const [selectedPet, setSelectedPet] = useState(null);
  const [petSelectorVisible, setPetSelectorVisible] = useState(false);
  const [page, setPage] = useState(0); // For pagination
  const [hasMorePets, setHasMorePets] = useState(true);

  useEffect(() => {
    fetchUserPets();
  }, []);
  
  useEffect(() => {
    if (selectedPetId) {
      setPage(0);
      setHasMorePets(true);
      fetchPotentialMatches(true);
    }
  }, [selectedPetId, filters]);

  useEffect(() => {
    if (selectedPetId && userPets.length > 0) {
      const pet = userPets.find(pet => pet._id === selectedPetId);
      setSelectedPet(pet);
    }
  }, [selectedPetId, userPets]);

  const fetchUserPets = async () => {
    setLoading(true);
    try {
      const response = await petService.getUserPets();
      if (response.pets && response.pets.length > 0) {
        setUserPets(response.pets);
        setSelectedPetId(response.pets[0]._id);
      } else {
        Alert.alert(
          'No Pets Found',
          'You need to add a pet before you can find matches.',
          [
            {
              text: 'Add Pet',
              onPress: () => navigation.navigate('PetProfileSetup'),
            },
            {
              text: 'Cancel',
              onPress: () => navigation.goBack(),
              style: 'cancel',
            },
          ]
        );
      }
    } catch (error) {
      console.error('Error fetching user pets:', error);
      Alert.alert('Error', 'Failed to fetch your pets. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchPotentialMatches = async (reset = false) => {
    if (!selectedPetId) return;

    setLoading(true);
    try {
      const apiFilters = {
        ...filters,
        skip: reset ? 0 : page * 10,
        limit: 10
      };

      const response = await matchService.getPotentialMatches(apiFilters, selectedPetId);

      if (reset) {
        setPotentialMatches(response.pets || []);
        setCurrentIndex(0);
      } else {
        // Ensure no duplicate pets are added to the list
        const newPets = response.pets || [];
        setPotentialMatches(prev => {
          const existingIds = new Set(prev.map(pet => pet._id));
          const uniquePets = newPets.filter(pet => !existingIds.has(pet._id));
          return [...prev, ...uniquePets];
        });
      }

      setHasMorePets((response.pets || []).length > 0);
      if (response.pets && response.pets.length > 0) {
        setPage(reset ? 1 : page + 1);
      }
    } catch (error) {
      console.error('Error fetching potential matches:', error);
      Alert.alert('Error', 'Failed to fetch potential matches. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async () => {
    if (currentIndex >= potentialMatches.length) {
      return;
    }

    const pet = potentialMatches[currentIndex];
    const currentPetIndex = currentIndex;
    
    // Update UI immediately to show the next pet
    goToNextPet();
    
    try {
      const response = await matchService.likeProfile(selectedPetId, pet._id);
      
      if (response.isMatch) {
        Alert.alert(
          'New Match!',
          `You matched with ${pet.name}!`,
          [
            {
              text: 'Send Message',
              onPress: () => navigation.navigate('Chat', { chatId: response.match._id }),
            },
            {
              text: 'Continue Browsing',
              style: 'cancel',
            },
          ],
        );
      }
    } catch (error) {
      console.error('Error liking profile:', error);
      Alert.alert('Error', 'Failed to like profile. Please try again.');
      // In case of error, revert the UI change
      setCurrentIndex(currentPetIndex);
    }
  };

  const handlePass = async () => {
    if (currentIndex >= potentialMatches.length) {
      return;
    }

    const pet = potentialMatches[currentIndex];
    const currentPetIndex = currentIndex;
    
    // Update UI immediately to show the next pet
    goToNextPet();
    
    try {
      await matchService.passProfile(selectedPetId, pet._id);
    } catch (error) {
      console.error('Error passing profile:', error);
      Alert.alert('Error', 'Failed to pass profile. Please try again.');
      // In case of error, revert the UI change
      setCurrentIndex(currentPetIndex);
    }
  };
  
  const goToNextPet = () => {
    const nextIndex = currentIndex + 1;
    setCurrentIndex(nextIndex);
    
    if (hasMorePets && nextIndex >= potentialMatches.length - 2) {
      fetchPotentialMatches(false);
    }
  };

  const handleFilterChange = (name, value) => {
    setFilters({
      ...filters,
      [name]: value,
    });
  };

  const renderFilters = () => {
    return (
      <Modal
        visible={filterVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setFilterVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.filterModal}>
            <View style={styles.filterHeader}>
              <Text style={styles.filterTitle}>Filter Pets</Text>
              <TouchableOpacity onPress={() => setFilterVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.filterContent}>
              <Text style={styles.filterLabel}>Maximum Distance</Text>
              <Text style={styles.filterValue}>{filters.maxDistance} miles</Text>
              <Slider
                style={styles.slider}
                minimumValue={1}
                maximumValue={50}
                step={1}
                value={filters.maxDistance}
                onValueChange={(value) => handleFilterChange('maxDistance', value)}
                minimumTrackTintColor="#FF6B6B"
                maximumTrackTintColor="#D1D1D1"
                thumbTintColor="#FF6B6B"
              />
              
              <TouchableOpacity
                style={styles.applyButton}
                onPress={() => setFilterVisible(false)}
              >
                <Text style={styles.applyButtonText}>Apply Filters</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  const renderPetSelector = () => {
    return (
      <Modal
        visible={petSelectorVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setPetSelectorVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.filterModal}>
            <View style={styles.filterHeader}>
              <Text style={styles.filterTitle}>Select Pet</Text>
              <TouchableOpacity onPress={() => setPetSelectorVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.filterContent}>
              {userPets.map((pet) => (
                <TouchableOpacity
                  key={pet._id}
                  style={[
                    styles.petSelectItem,
                  ]}
                  onPress={() => {
                    setSelectedPetId(pet._id);
                    setPetSelectorVisible(false);
                  }}
                >
                  <Image
                    source={
                      pet.photos && pet.photos.length > 0
                        ? { uri: pet.photos[0] }
                        : require('../assets/default-pet.png')
                    }
                    style={styles.petSelectorImage}
                  />
                  <View style={styles.petSelectorInfo}>
                    <Text style={styles.petSelectorName}>{pet.name}</Text>
                    <Text style={styles.petSelectorBreed}>{pet.breed}</Text>
                    <Text style={styles.petSelectorType}>{pet.type}</Text>
                  </View>
                  {selectedPetId === pet._id && (
                    <Ionicons name="checkmark-circle" size={24} color="#FF6B6B" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  if (loading && !potentialMatches.length) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B6B" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Find Playmates</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.petSwitchButton}
            onPress={() => setPetSelectorVisible(true)}
          >
            {selectedPet && (
              <View style={styles.selectedPetPreview}>
                <View style={styles.selectedPetPreviewContent}>
                  <Image
                    source={
                      selectedPet.photos && selectedPet.photos.length > 0
                        ? { uri: selectedPet.photos[0] }
                        : require('../assets/default-pet.png')
                    }
                    style={styles.selectedPetImage}
                  />
                  <Text style={styles.selectedPetName}>{selectedPet.name}</Text>
                  <Ionicons name="chevron-down" size={14} color="#666" />
                </View>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setFilterVisible(true)}
          >
            <Ionicons name="options" size={24} color="#333" />
          </TouchableOpacity>
        </View>
      </View>

      {potentialMatches.length > 0 && currentIndex < potentialMatches.length ? (
        <View style={styles.cardContainer}>
          <View style={styles.card}>
            <Image
              source={
                potentialMatches[currentIndex].photos && 
                potentialMatches[currentIndex].photos.length > 0
                  ? { uri: potentialMatches[currentIndex].photos[0] }
                  : require('../assets/default-pet.png')
              }
              style={styles.petImage}
            />
            <View style={styles.petInfoContainer}>
              <View style={styles.nameRow}>
                <Text style={styles.petName}>{potentialMatches[currentIndex].name}</Text>
                <Text style={styles.petDistance}>
                  {potentialMatches[currentIndex].distance ? 
                    `${potentialMatches[currentIndex].distance.toFixed(1)} mi away` : 
                    'Nearby'}
                </Text>
              </View>
              <Text style={styles.petBreed}>{potentialMatches[currentIndex].breed}</Text>
              <Text style={styles.petDescription}>{potentialMatches[currentIndex].description}</Text>
              
              <View style={styles.detailsRow}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Age</Text>
                  <Text style={styles.detailValue}>{potentialMatches[currentIndex].age}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Size</Text>
                  <Text style={styles.detailValue}>{potentialMatches[currentIndex].size}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Vaccinated</Text>
                  <Text style={styles.detailValue}>{potentialMatches[currentIndex].vaccinated === 'yes' ? 'Yes' : 'No'}</Text>
                </View>
              </View>
              
              {potentialMatches[currentIndex].temperament && potentialMatches[currentIndex].temperament.length > 0 && (
                <View style={styles.tagsContainer}>
                  {potentialMatches[currentIndex].temperament.map((tag, index) => (
                    <View key={index} style={styles.tag}>
                      <Text style={styles.tagText}>{tag}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
          
          <View style={styles.actionsContainer}>
            <TouchableOpacity style={styles.actionButton} onPress={handlePass}>
              <Ionicons name="close-circle" size={64} color="#E74C3C" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={handleLike}>
              <Ionicons name="heart-circle" size={64} color="#FF6B6B" />
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="paw" size={64} color="#DDD" />
          <Text style={styles.emptyTitle}>No more pets</Text>
          <Text style={styles.emptyDescription}>
            Try adjusting your filters or check back later for new matches
          </Text>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={() => fetchPotentialMatches(true)}
          >
            <Text style={styles.refreshButtonText}>Refresh</Text>
          </TouchableOpacity>
        </View>
      )}

      {renderFilters()}
      {renderPetSelector()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterButton: {
    padding: 8,
  },
  petSwitchButton: {
    marginRight: 10,
  },
  selectedPetPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    borderRadius: 20,
    paddingVertical: 5,
    paddingHorizontal: 6,
  },
  selectedPetPreviewContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 5,
  },
  selectedPetImage: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 5,
  },
  selectedPetName: {
    fontSize: 14,
    color: '#333',
  },
  cardContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 20,
  },
  card: {
    width: cardWidth,
    backgroundColor: '#FFF',
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 5,
  },
  petImage: {
    width: '100%',
    height: 300,
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
  },
  petInfoContainer: {
    padding: 15,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  petName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  petDistance: {
    fontSize: 14,
    color: '#666',
  },
  petBreed: {
    fontSize: 16,
    color: '#666',
    marginBottom: 10,
  },
  petDescription: {
    fontSize: 14,
    color: '#333',
    marginBottom: 15,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  detailItem: {
    alignItems: 'center',
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 3,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tag: {
    backgroundColor: '#F0F0F0',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 15,
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: {
    fontSize: 12,
    color: '#666',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 20,
  },
  actionButton: {
    padding: 10,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  emptyDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  refreshButton: {
    backgroundColor: '#FF6B6B',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 10,
  },
  refreshButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  filterModal: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '70%',
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  filterTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  filterContent: {
    maxHeight: '90%',
    paddingBottom: 20,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  filterValue: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  slider: {
    width: '100%',
    height: 40,
    marginBottom: 20,
  },
  applyButton: {
    backgroundColor: '#FF6B6B',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  applyButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  petSelectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  petSelectorImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  petSelectorInfo: {
    marginLeft: 15,
    flex: 1,
  },
  petSelectorName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  petSelectorBreed: {
    fontSize: 14,
    color: '#666',
  },
  petSelectorType: {
    fontSize: 12,
    color: '#888',
  },
});

export default FinderScreen;