import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
  Platform,
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'react-native-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { petService } from '../../api/api';
import { 
  PET_TYPES, 
  GENDER_OPTIONS, 
  SIZE_OPTIONS, 
  ACTIVITY_LEVELS, 
  VACCINATION_STATUS, 
  TEMPERAMENTS,
  DOG_PLAYMATE_PREFERENCES,
  CAT_PLAYMATE_PREFERENCES
} from '../../constants/petConstants';
import CustomDropdown from '../../components/CustomDropdown';

const PetProfileSetupScreen = ({ navigation }) => {
  const [petData, setPetData] = useState({
    name: '',
    breed: '',
    type: PET_TYPES.DOG, // Default type is dog
    age: '',
    gender: GENDER_OPTIONS.MALE,
    size: SIZE_OPTIONS.MEDIUM,
    vaccinated: VACCINATION_STATUS.YES,
    photos: [],
    description: '',
    activityLevel: ACTIVITY_LEVELS.MODERATE,
    temperament: [],
    preferredPlaymates: [],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get the appropriate playmate preferences based on pet type
  const getPlaymateOptions = () => {
    return petData.type === PET_TYPES.DOG
      ? DOG_PLAYMATE_PREFERENCES
      : CAT_PLAYMATE_PREFERENCES;
  };

  const handleInputChange = (field, value) => {
    const updatedData = {
      ...petData,
      [field]: value,
    };

    // If pet type changes, reset the preferredPlaymates array
    if (field === 'type') {
      updatedData.preferredPlaymates = [];
    }
    
    setPetData(updatedData);
  };

  const pickImage = async () => {
    const options = {
      mediaType: 'photo',
      includeBase64: false,
      maxHeight: 800,
      maxWidth: 800,
    };

    try {
      const result = await ImagePicker.launchImageLibrary(options);
      if (!result.didCancel && !result.errorCode) {
        const newPhotos = [...petData.photos, result.assets[0].uri];
        setPetData({ ...petData, photos: newPhotos });
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const removeImage = (index) => {
    const newPhotos = [...petData.photos];
    newPhotos.splice(index, 1);
    setPetData({ ...petData, photos: newPhotos });
  };

  const handleSubmit = async () => {
    if (!petData.name || !petData.breed || !petData.age) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      await petService.createPet(petData);
      Alert.alert(
        'Success',
        'Pet profile created successfully!',
        [
          {
            text: 'Continue',
            onPress: () => {
              // Check if we're in auth flow or main flow
              const routeName = navigation.getState().routes[0].name;
              if (routeName === 'Splash' || routeName === 'Login' || routeName === 'Register') {
                // Auth flow - navigate to Main/Home
                navigation.reset({
                  index: 0,
                  routes: [{ 
                    name: 'Main', 
                    params: { screen: 'Home', params: { refresh: true } }
                  }],
                });
              } else {
                // Already in main flow - navigate to MainTabs/Home
                navigation.navigate('MainTabs', {
                  screen: 'Home',
                  params: { refresh: true }
                });
              }
            },
          },
        ],
        { cancelable: false }
      );
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to create pet profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleArrayItem = (field, item) => {
    const array = petData[field];
    const exists = array.includes(item);
    
    let newArray;
    if (exists) {
      newArray = array.filter(i => i !== item);
    } else {
      newArray = [...array, item];
    }
    
    setPetData({ ...petData, [field]: newArray });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.headerContainer}>
          <Text style={styles.headerText}>Set Up Your Pet Profile</Text>
          <Text style={styles.subHeaderText}>Let's get to know your furry friend</Text>
        </View>

        <View style={styles.formContainer}>
          <Text style={styles.label}>Pet Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Buddy"
            value={petData.name}
            onChangeText={(value) => handleInputChange('name', value)}
          />

          <Text style={styles.label}>Breed *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Golden Retriever"
            value={petData.breed}
            onChangeText={(value) => handleInputChange('breed', value)}
          />

          <Text style={styles.label}>Type</Text>
          <CustomDropdown
            label="Type"
            options={[
              { label: 'Dog', value: PET_TYPES.DOG },
              { label: 'Cat', value: PET_TYPES.CAT },
            ]}
            selectedValue={petData.type}
            onValueChange={(value) => handleInputChange('type', value)}
          />

          <Text style={styles.label}>Age *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., 2 years"
            value={petData.age}
            onChangeText={(value) => handleInputChange('age', value)}
            keyboardType="default"
          />

          <Text style={styles.label}>Gender</Text>
          <CustomDropdown
            label="Gender"
            options={[
              { label: 'Male', value: GENDER_OPTIONS.MALE },
              { label: 'Female', value: GENDER_OPTIONS.FEMALE },
            ]}
            selectedValue={petData.gender}
            onValueChange={(value) => handleInputChange('gender', value)}
          />

          <Text style={styles.label}>Size</Text>
          <CustomDropdown
            label="Size"
            options={[
              { label: 'Small', value: SIZE_OPTIONS.SMALL },
              { label: 'Medium', value: SIZE_OPTIONS.MEDIUM },
              { label: 'Large', value: SIZE_OPTIONS.LARGE },
            ]}
            selectedValue={petData.size}
            onValueChange={(value) => handleInputChange('size', value)}
          />

          <Text style={styles.label}>Vaccinated</Text>
          <CustomDropdown
            label="Vaccinated"
            options={[
              { label: 'Yes', value: VACCINATION_STATUS.YES },
              { label: 'No', value: VACCINATION_STATUS.NO },
            ]}
            selectedValue={petData.vaccinated}
            onValueChange={(value) => handleInputChange('vaccinated', value)}
          />

          <Text style={styles.label}>Activity Level</Text>
          <CustomDropdown
            label="Activity Level"
            options={[
              { label: 'Low', value: ACTIVITY_LEVELS.LOW },
              { label: 'Moderate', value: ACTIVITY_LEVELS.MODERATE },
              { label: 'High', value: ACTIVITY_LEVELS.HIGH },
            ]}
            selectedValue={petData.activityLevel}
            onValueChange={(value) => handleInputChange('activityLevel', value)}
          />

          <Text style={styles.label}>Temperament (Select all that apply)</Text>
          <View style={styles.optionsContainer}>
            {TEMPERAMENTS.map((item) => (
              <TouchableOpacity
                key={item}
                style={[
                  styles.optionItem,
                  petData.temperament.includes(item) && styles.selectedOption,
                ]}
                onPress={() => toggleArrayItem('temperament', item)}
              >
                <Text
                  style={[
                    styles.optionText,
                    petData.temperament.includes(item) && styles.selectedOptionText,
                  ]}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Preferred Playmates (Select all that apply)</Text>
          <View style={styles.optionsContainer}>
            {getPlaymateOptions().map((item) => (
              <TouchableOpacity
                key={item}
                style={[
                  styles.optionItem,
                  petData.preferredPlaymates.includes(item) && styles.selectedOption,
                ]}
                onPress={() => toggleArrayItem('preferredPlaymates', item)}
              >
                <Text
                  style={[
                    styles.optionText,
                    petData.preferredPlaymates.includes(item) && styles.selectedOptionText,
                  ]}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Tell us a bit about your pet..."
            value={petData.description}
            onChangeText={(value) => handleInputChange('description', value)}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          <Text style={styles.label}>Pet Photos</Text>
          <TouchableOpacity style={styles.photoUploadButton} onPress={pickImage}>
            <Ionicons name="add-circle-outline" size={20} color="#666" />
            <Text style={styles.photoUploadButtonText}>Add Photo</Text>
          </TouchableOpacity>

          <View style={styles.photoContainer}>
            {petData.photos.map((photo, index) => (
              <View key={index} style={styles.photoItem}>
                <Image source={{ uri: photo }} style={styles.photo} />
                <TouchableOpacity
                  style={styles.removePhotoButton}
                  onPress={() => removeImage(index)}
                >
                  <Text style={styles.removePhotoButtonText}>×</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            <Text style={styles.submitButtonText}>
              {isSubmitting ? 'Creating Profile...' : 'Create Pet Profile'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContainer: {
    padding: 20,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 25,
  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  subHeaderText: {
    fontSize: 16,
    color: '#666',
  },
  formContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  dropdownButton: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownButtonText: {
    fontSize: 16,
    color: '#333',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalHeaderText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  pickerContainer: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    marginBottom: 20,
  },
  picker: {
    height: 50,
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  optionItem: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 15,
    margin: 5,
  },
  selectedOption: {
    backgroundColor: '#FF6B6B',
    borderColor: '#FF6B6B',
  },
  optionText: {
    color: '#333',
  },
  selectedOptionText: {
    color: '#FFF',
  },
  photoUploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F0F0',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#DDD',
    borderStyle: 'dashed',
  },
  photoUploadButtonText: {
    color: '#666',
    fontSize: 16,
    marginLeft: 8,
  },
  photoContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  photoItem: {
    position: 'relative',
    margin: 5,
  },
  photo: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  removePhotoButton: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removePhotoButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  submitButton: {
    backgroundColor: '#FF6B6B',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  submitButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default PetProfileSetupScreen;