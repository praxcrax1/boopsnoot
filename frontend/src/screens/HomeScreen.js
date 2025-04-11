import React, { useState, useEffect, useContext, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Animated,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../contexts/AuthContext';
import { petService, matchService, chatService } from '../api/api';

const HomeScreen = ({ navigation, route }) => {
  const { user } = useContext(AuthContext);
  const [initialLoading, setInitialLoading] = useState(true);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [pets, setPets] = useState([]);
  const [matches, setMatches] = useState([]);
  const [selectedPetId, setSelectedPetId] = useState(null);
  
  // Animation value for the matches section
  const matchesOpacity = new Animated.Value(1);

  const fetchUserData = useCallback(async () => {
    setInitialLoading(true);
    try {
      // Fetch user's pets
      const petsResponse = await petService.getUserPets();
      const petsList = petsResponse.pets || [];
      setPets(petsList);

      // Set the first pet as the selected pet if available
      if (petsList.length > 0) {
        setSelectedPetId(petsList[0]._id);
        
        // Fetch matches for the selected pet
        const matchesResponse = await matchService.getUserMatches(petsList[0]._id);
        setMatches(matchesResponse.matches || []);
        
        // Preload matches for other pets in the background to make switching smoother
        if (petsList.length > 1) {
          const otherPetIds = petsList
            .slice(1)
            .map(pet => pet._id);
          
          // Run preloading in the background without awaiting it
          setTimeout(() => {
            matchService.preloadMatchesForPets(otherPetIds)
              .catch(err => console.error('Error preloading pet matches:', err));
          }, 1000);
        }
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setInitialLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  // Listen for route.params changes to refresh data
  useEffect(() => {
    if (route.params?.refresh) {
      // Clear the parameter so it doesn't trigger multiple refreshes
      navigation.setParams({ refresh: undefined });
      // Refresh data
      fetchUserData();
    }
  }, [route.params, fetchUserData]);

  // Function to handle pet selection change with smooth transitions
  const handlePetChange = useCallback(async (petId) => {
    if (petId === selectedPetId) return;
    
    setSelectedPetId(petId);
    setMatchesLoading(true);
    
    // Fade out the matches section
    Animated.timing(matchesOpacity, {
      toValue: 0.3,
      duration: 200,
      useNativeDriver: true
    }).start();
    
    try {
      const matchesResponse = await matchService.getUserMatches(petId);
      
      // Fade in the new matches
      Animated.timing(matchesOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true
      }).start();
      
      setMatches(matchesResponse.matches || []);
    } catch (error) {
      console.error('Error fetching matches for pet:', error);
      
      // Fade back in even if there's an error
      Animated.timing(matchesOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true
      }).start();
    } finally {
      setMatchesLoading(false);
    }
  }, [selectedPetId]);

  // Memoize the selected pet to avoid unnecessary calculations
  const selectedPet = useMemo(() => {
    return pets.find(pet => pet._id === selectedPetId) || (pets.length > 0 ? pets[0] : null);
  }, [pets, selectedPetId]);

  if (initialLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B6B" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.welcomeText}>
          Welcome, {user?.name || 'Pet Lover'}!
        </Text>
        {selectedPet && (
          <Text style={styles.petWelcome}>
            & {selectedPet.name}
          </Text>
        )}
      </View>

      {/* Pet Selection Tabs (Only show if user has multiple pets) */}
      {pets.length > 1 && (
        <View style={styles.petTabsWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.petTabsContainer}
            contentContainerStyle={styles.petTabsContent}
          >
            {pets.map(pet => (
              <TouchableOpacity
                key={pet._id}
                style={[
                  styles.petTab,
                  selectedPetId === pet._id && styles.activePetTab
                ]}
                onPress={() => handlePetChange(pet._id)}
              >
                <Image
                  source={pet.photos && pet.photos.length > 0
                    ? { uri: pet.photos[0] }
                    : require('../assets/default-pet.png')
                  }
                  style={styles.petTabImage}
                />
                <Text style={[
                  styles.petTabName,
                  selectedPetId === pet._id && styles.activePetTabName
                ]}>
                  {pet.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <ScrollView style={styles.scrollContainer}>
        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsContainer}>
            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={() => navigation.navigate('Finder')}
            >
              <View style={styles.quickActionIconContainer}>
                <Ionicons name="paw" size={24} color="#FFF" />
              </View>
              <Text style={styles.quickActionText}>Find Playmates</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={() => navigation.navigate('Chats')}
            >
              <View style={styles.quickActionIconContainer}>
                <Ionicons name="chatbubble" size={24} color="#FFF" />
              </View>
              <Text style={styles.quickActionText}>Messages</Text>
            </TouchableOpacity>

            {pets.length > 0 ? (
              <TouchableOpacity
                style={styles.quickActionButton}
                onPress={() => navigation.navigate('Profile')}
              >
                <View style={styles.quickActionIconContainer}>
                  <Ionicons name="settings" size={24} color="#FFF" />
                </View>
                <Text style={styles.quickActionText}>Edit Profile</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.quickActionButton}
                onPress={() => navigation.navigate('PetProfileSetup')}
              >
                <View style={styles.quickActionIconContainer}>
                  <Ionicons name="add" size={24} color="#FFF" />
                </View>
                <Text style={styles.quickActionText}>Add Pet</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Recent Matches */}
        <View style={styles.section}>
          <View style={styles.sectionTitleContainer}>
            <Text style={styles.sectionTitle}>Recent Matches</Text>
            {matches.length > 0 && (
              <TouchableOpacity onPress={() => navigation.navigate('Chats')}>
                <Text style={styles.viewAllText}>View All</Text>
              </TouchableOpacity>
            )}
          </View>
          
          {/* Animated matches container */}
          <Animated.View style={{ opacity: matchesOpacity }}>
            {matchesLoading && (
              <View style={styles.matchesLoadingContainer}>
                <ActivityIndicator size="small" color="#FF6B6B" />
              </View>
            )}
            
            {!matchesLoading && matches.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {matches.map((match) => (
                  <TouchableOpacity
                    key={match.matchId}
                    style={styles.matchCard}
                    onPress={async () => {
                      try {
                        // Show loading indicator for better UX
                        setMatchesLoading(true);
                        
                        // Get or create chat for this match
                        const chatResponse = await chatService.getOrCreateChatForMatch(match.matchId);
                        
                        if (chatResponse.success && chatResponse.chat) {
                          // Navigate to the chat with the returned chat ID
                          navigation.navigate('Chat', { chatId: chatResponse.chat._id });
                        } else {
                          console.error('Failed to get or create chat:', chatResponse);
                          // Fallback to direct navigation with match ID (though this likely won't work)
                          navigation.navigate('Chat', { chatId: match.matchId });
                        }
                      } catch (error) {
                        console.error('Error navigating to chat:', error);
                        Alert.alert(
                          'Error',
                          'Failed to open chat. Please try again.'
                        );
                      } finally {
                        setMatchesLoading(false);
                      }
                    }}
                  >
                    <Image
                      source={
                        match.pet.photos && match.pet.photos.length
                          ? { uri: match.pet.photos[0] }
                          : require('../assets/default-pet.png')
                      }
                      style={styles.matchImage}
                    />
                    <Text style={styles.matchName}>{match.pet.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : !matchesLoading && (
              <View style={styles.emptyStateContainer}>
                <Text style={styles.emptyStateText}>No matches yet</Text>
                <TouchableOpacity
                  style={styles.emptyStateButton}
                  onPress={() => navigation.navigate('Finder')}
                >
                  <Text style={styles.emptyStateButtonText}>Find Matches Now</Text>
                </TouchableOpacity>
              </View>
            )}
          </Animated.View>
        </View>

        {/* App Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Activity</Text>
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{matches.length || 0}</Text>
              <Text style={styles.statLabel}>Matches</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{pets.length || 0}</Text>
              <Text style={styles.statLabel}>Pets</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>0</Text>
              <Text style={styles.statLabel}>Playdates</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  matchesLoadingContainer: {
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 5, // Reduced from 15 to 5
    borderBottomWidth: 0, // Removed border
    borderBottomColor: '#F0F0F0',
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  petWelcome: {
    fontSize: 18,
    color: '#666',
    marginTop: 5,
  },
  petTabsWrapper: {
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  petTabsContainer: {
    backgroundColor: '#F8F8F8',
    paddingVertical: 5, // Reduced from 10 to 5
    paddingHorizontal: 15,
  },
  petTabsContent: {
    alignItems: 'center',
  },
  petTab: {
    alignItems: 'center',
    marginRight: 10, // Reduced from 15 to 10
    paddingHorizontal: 5,
    paddingVertical: 5, // Reduced from 8 to 5
    borderRadius: 15, // Changed from 20 to 15
    flexDirection: 'row', // Changed to row to make it more compact
  },
  activePetTab: {
    backgroundColor: '#FFE9E9',
  },
  petTabImage: {
    width: 30, // Reduced from 40 to 30
    height: 30, // Reduced from 40 to 30
    borderRadius: 15, // Adjusted for new size
    marginRight: 5, // Add margin to separate from text
    borderWidth: 2,
    borderColor: '#FFF',
  },
  petTabName: {
    fontSize: 12,
    color: '#666',
  },
  activePetTabName: {
    fontWeight: '600',
    color: '#FF6B6B',
  },
  scrollContainer: {
    flex: 1,
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  viewAllText: {
    fontSize: 14,
    color: '#FF6B6B',
  },
  quickActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickActionButton: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  quickActionIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
  },
  matchCard: {
    marginRight: 15,
    alignItems: 'center',
    width: 100,
  },
  matchImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 8,
  },
  matchName: {
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
  },
  emptyStateContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  emptyStateButton: {
    backgroundColor: '#FF6B6B',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 5,
  },
  emptyStateButtonText: {
    color: '#FFF',
    fontWeight: '500',
  },
  nearbyPetsCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    padding: 15,
    borderRadius: 10,
  },
  nearbyPetsText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 10,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF6B6B',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
});

export default HomeScreen;