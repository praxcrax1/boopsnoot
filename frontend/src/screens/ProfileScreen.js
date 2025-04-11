import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../contexts/AuthContext';
import { petService } from '../api/api';
import { Button } from '../components';

const ProfileScreen = ({ navigation }) => {
  const { user, logout } = useContext(AuthContext);
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserPets = async () => {
      if (!user) return;

      try {
        const response = await petService.getUserPets(user.id);
        setPets(response.pets || []);
      } catch (error) {
        console.error('Error fetching user pets:', error);
        Alert.alert('Error', 'Failed to load your pets. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchUserPets();
  }, [user]);

  const handleAddPet = () => {
    navigation.navigate('PetProfileSetup');
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          onPress: () => {
            logout();
          },
        },
      ]
    );
  };

  if (!user) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Please login to view your profile</Text>
        <Button 
          title="Login" 
          onPress={() => navigation.navigate('Login')} 
        />
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B6B" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
        <TouchableOpacity onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color="#FF6B6B" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.userInfoSection}>
          <View style={styles.userInfoHeader}>
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </Text>
            </View>
            <View style={styles.userDetails}>
              <Text style={styles.userName}>{user.name}</Text>
              <Text style={styles.userEmail}>{user.email}</Text>
            </View>
          </View>
          <Button
            title="Edit Profile"
            onPress={() => Alert.alert('Info', 'Edit profile functionality would be implemented here.')}
            type="secondary"
            icon="create-outline"
            style={styles.editProfileButton}
          />
        </View>

        <View style={styles.petSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Your Pets</Text>
            <Button
              title="Add Pet"
              onPress={handleAddPet}
              type="secondary"
              icon="add"
              style={styles.addPetButton}
              textStyle={styles.addPetButtonText}
            />
          </View>

          {pets.length > 0 ? (
            pets.map((pet) => (
              <TouchableOpacity
                key={pet._id}
                style={styles.petCard}
                onPress={() => navigation.navigate('PetProfile', { petId: pet._id })}
              >
                <Image
                  source={
                    pet.photos && pet.photos.length > 0
                      ? { uri: pet.photos[0] }
                      : require('../assets/default-pet.png')
                  }
                  style={styles.petImage}
                />
                <View style={styles.petInfo}>
                  <Text style={styles.petName}>{pet.name}</Text>
                  <Text style={styles.petBreed}>{pet.breed}</Text>
                  <Text style={styles.petDetails}>
                    {pet.age} • {pet.gender} • {pet.size}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color="#DDD" />
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.noPetsContainer}>
              <Ionicons name="paw" size={48} color="#DDD" />
              <Text style={styles.noPetsText}>You haven't added any pets yet</Text>
              <Button
                title="Add Your First Pet"
                onPress={handleAddPet}
                icon="add-circle"
              />
            </View>
          )}
        </View>

        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>Settings</Text>
          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => Alert.alert('Info', 'Notifications settings would be implemented here.')}
          >
            <Ionicons name="notifications-outline" size={24} color="#666" />
            <Text style={styles.settingText}>Notifications</Text>
            <Ionicons name="chevron-forward" size={20} color="#DDD" style={styles.settingChevron} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => Alert.alert('Info', 'Privacy settings would be implemented here.')}
          >
            <Ionicons name="shield-outline" size={24} color="#666" />
            <Text style={styles.settingText}>Privacy</Text>
            <Ionicons name="chevron-forward" size={20} color="#DDD" style={styles.settingChevron} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => Alert.alert('Info', 'Help center would be implemented here.')}
          >
            <Ionicons name="help-circle-outline" size={24} color="#666" />
            <Text style={styles.settingText}>Help & Support</Text>
            <Ionicons name="chevron-forward" size={20} color="#DDD" style={styles.settingChevron} />
          </TouchableOpacity>
        </View>
      </ScrollView>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  content: {
    flex: 1,
  },
  userInfoSection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  userInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
  },
  userDetails: {
    marginLeft: 15,
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  userEmail: {
    color: '#666',
    fontSize: 14,
    marginTop: 3,
  },
  editProfileButton: {
    marginTop: 15,
  },
  petSection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  addPetButton: {
    height: 32,
    paddingHorizontal: 12,
    paddingVertical: 0,
    marginBottom: 0,
  },
  addPetButtonText: {
    fontWeight: '500',
  },
  loader: {
    marginVertical: 30,
  },
  petCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9F9F9',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  petImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  petInfo: {
    flex: 1,
    marginLeft: 15,
  },
  petName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  petBreed: {
    fontSize: 14,
    color: '#666',
  },
  petDetails: {
    fontSize: 12,
    color: '#999',
    marginTop: 3,
  },
  noPetsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
  },
  noPetsText: {
    color: '#666',
    marginVertical: 10,
  },
  settingsSection: {
    padding: 20,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  settingText: {
    marginLeft: 15,
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  settingChevron: {
    marginLeft: 'auto',
  },
});

export default ProfileScreen;