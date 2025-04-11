import React, { useState, useContext, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'react-native-image-picker';
import { petService } from '../../api/api';
import { AuthContext } from '../../contexts/AuthContext';
import { InputField, Button, CustomDropdown } from '../../components';
import { validateName, validateBreed, validateAge, validatePhotos } from '../../utils/validation';
import { 
  petTypeOptions, 
  genderOptions, 
  sizeOptions, 
  TEMPERAMENTS
} from '../../constants/petConstants';

const PetProfileSetupScreen = ({ navigation }) => {
  const { user } = useContext(AuthContext);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [petData, setPetData] = useState({
    name: '',
    breed: '',
    type: 'dog',
    age: '',
    gender: 'male',
    size: 'medium',
    photos: [],
    description: '',
    temperament: [],
    preferredPlaymates: [],
  });

  // Form validation state
  const [touched, setTouched] = useState({
    name: false,
    breed: false,
    age: false,
    photos: false,
  });
  
  const [errors, setErrors] = useState({
    name: null,
    breed: null,
    age: null,
    photos: null,
  });

  // Validate form fields on change
  useEffect(() => {
    validateField('name', petData.name);
    validateField('breed', petData.breed);
    validateField('age', petData.age);
    validateField('photos', petData.photos);
  }, [petData]);

  const validateField = (fieldName, value) => {
    let error = null;

    switch (fieldName) {
      case 'name':
        error = validateName(value);
        break;
      case 'breed':
        error = validateBreed(value);
        break;
      case 'age':
        error = validateAge(value);
        break;
      default:
        break;
    }

    setErrors(prev => ({ ...prev, [fieldName]: error }));
    return error;
  };

  const handleInputChange = (field, value) => {
    setPetData({
      ...petData,
      [field]: value,
    });
  };

  const handleBlur = (fieldName) => {
    setTouched({ ...touched, [fieldName]: true });
  };

  const toggleArrayItem = (field, item) => {
    const array = petData[field] || [];
    const exists = array.includes(item);
    
    let newArray;
    if (exists) {
      newArray = array.filter(i => i !== item);
    } else {
      newArray = [...array, item];
    }
    
    setPetData({ ...petData, [field]: newArray });
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
        // For simplicity, we'll just store the image URI in the state
        // In a real app, you would upload to a server and store the URL
        const newPhotos = [...petData.photos, result.assets[0].uri];
        setPetData({ ...petData, photos: newPhotos });
        setTouched({ ...touched, photos: true });
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const removeImage = (index) => {
    const newPhotos = [...petData.photos];
    newPhotos.splice(index, 1);
    setPetData({ ...petData, photos: newPhotos });
    setTouched({ ...touched, photos: true });
  };

  const validateForm = () => {
    // Mark all fields as touched to show errors
    const allTouched = {
      name: true,
      breed: true,
      age: true,
      photos: true,
    };
    setTouched(allTouched);

    // Check if there are any errors
    const nameError = validateField('name', petData.name);
    const breedError = validateField('breed', petData.breed);
    const ageError = validateField('age', petData.age);
    const photosError = validateField('photos', petData.photos);

    return !nameError && !breedError && !ageError && !photosError;
  };

  const handleSubmit = async () => {
    // Validate all fields
    if (!validateForm()) {
      // Scroll to the first error field would be added here
      return;
    }

    setIsSubmitting(true);
    try {
      // Add user ID to pet data
      const petWithOwner = {
        ...petData,
        ownerId: user.id,
      };
      
      await petService.createPet(petWithOwner);
      
      // Navigate to Home tab
      navigation.reset({
        index: 0,
        routes: [{ name: 'MainTabs' }],
      });
    } catch (error) {
      console.error('Error creating pet:', error);
      Alert.alert('Error', error.message || 'Failed to create pet profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerContainer}>
          <Text style={styles.headerText}>Set Up Pet Profile</Text>
          <Text style={styles.subHeaderText}>
            Let's create a profile for your pet to help find playmates!
          </Text>
        </View>

        <View style={styles.formContainer}>
          <InputField
            label="Pet Name"
            required
            placeholder="e.g., Buddy"
            value={petData.name}
            onChangeText={(value) => handleInputChange('name', value)}
            error={errors.name}
            touched={touched.name}
            onBlur={() => handleBlur('name')}
          />

          <InputField
            label="Breed"
            required
            placeholder="e.g., Golden Retriever"
            value={petData.breed}
            onChangeText={(value) => handleInputChange('breed', value)}
            error={errors.breed}
            touched={touched.breed}
            onBlur={() => handleBlur('breed')}
          />

          <CustomDropdown
            label="Type"
            options={petTypeOptions}
            selectedValue={petData.type}
            onValueChange={(value) => handleInputChange('type', value)}
          />

          <InputField
            label="Age"
            required
            placeholder="e.g., 2 years"
            value={petData.age}
            onChangeText={(value) => handleInputChange('age', value)}
            keyboardType="default"
            error={errors.age}
            touched={touched.age}
            onBlur={() => handleBlur('age')}
          />

          <CustomDropdown
            label="Gender"
            options={genderOptions}
            selectedValue={petData.gender}
            onValueChange={(value) => handleInputChange('gender', value)}
          />

          <CustomDropdown
            label="Size"
            options={sizeOptions}
            selectedValue={petData.size}
            onValueChange={(value) => handleInputChange('size', value)}
          />

          <Text style={styles.label}>Temperament (Select all that apply)</Text>
          <View style={styles.optionsContainer}>
            {TEMPERAMENTS.map((item) => (
              <TouchableOpacity
                key={item}
                style={[
                  styles.optionItem,
                  petData.temperament?.includes(item) && styles.selectedOption,
                ]}
                onPress={() => toggleArrayItem('temperament', item)}
              >
                <Text
                  style={[
                    styles.optionText,
                    petData.temperament?.includes(item) && styles.selectedOptionText,
                  ]}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <InputField
            label="Description"
            placeholder="Tell us a bit about your pet..."
            value={petData.description}
            onChangeText={(value) => handleInputChange('description', value)}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            style={styles.textArea}
          />

          <View>
            <Text style={styles.label}>Pet Photos <Text style={styles.requiredMark}>*</Text></Text>
            <TouchableOpacity style={styles.photoUploadButton} onPress={pickImage}>
              <Ionicons name="add-circle-outline" size={20} color="#666" />
              <Text style={styles.photoUploadButtonText}>Add Photo</Text>
            </TouchableOpacity>

            {touched.photos && errors.photos && (
              <Text style={styles.photoError}>{errors.photos}</Text>
            )}

            <View style={styles.photoContainer}>
              {petData.photos?.map((photo, index) => (
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
          </View>

          <Button
            title={isSubmitting ? 'Creating Profile...' : 'Create Pet Profile'}
            onPress={handleSubmit}
            disabled={isSubmitting}
            loading={isSubmitting}
          />

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
  scrollContent: {
    padding: 20,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  headerText: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  subHeaderText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
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
  textArea: {
    height: 100,
    textAlignVertical: 'top',
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
  skipButton: {
    marginTop: 10,
  },
  skipButtonText: {
    fontWeight: '500',
  },
  requiredMark: {
    color: '#FF6B6B',
  },
  photoError: {
    color: '#FF3B30',
    fontSize: 12,
    marginTop: -10,
    marginBottom: 10,
    marginLeft: 5,
  },
});

export default PetProfileSetupScreen;