import React, { useState, useEffect, useCallback, useRef } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    Alert,
    Dimensions,
    StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import PetService from "../services/PetService";
import {
    validateName,
    validateBreed,
    validateAge,
    validatePhotos,
} from "../utils/validation";
import {
    petTypeOptions,
    genderOptions,
    sizeOptions,
    activityOptions,
    vaccinatedOptions,
    TEMPERAMENTS,
    DOG_PLAYMATE_PREFERENCES,
    CAT_PLAYMATE_PREFERENCES,
    PET_TYPES,
} from "../constants/petConstants";
import InputField from "../components/InputField";
import CustomDropdown from "../components/CustomDropdown";
import Button from "../components/Button";
import theme from "../styles/theme";

const { width } = Dimensions.get("window");
const photoSize = (width - 60) / 3;

const EditPetProfileScreen = ({ route, navigation }) => {
    const { petId } = route.params;
    
    // Mutable ref to store the original pet data for reference
    const originalPetData = useRef(null);
    
    // Loading & submission states
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);
    const [imageUploading, setImageUploading] = useState(false);
    const [currentSection, setCurrentSection] = useState('basic');
    
    // Form state
    const [petData, setPetData] = useState({
        name: "",
        breed: "",
        type: "dog",
        age: "",
        gender: "male",
        size: "medium",
        vaccinated: "yes",
        photos: [],
        description: "",
        activityLevel: "moderate",
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
    
    // Track which images are new and being uploaded
    const [pendingUploads, setPendingUploads] = useState([]);

    // Request permission for image library
    useEffect(() => {
        (async () => {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Required', 'Sorry, we need camera roll permissions to upload images!');
            }
        })();
    }, []);

    // Helper function to normalize pet data
    const normalizePetData = (pet) => ({
        ...pet,
        preferredPlaymates: Array.isArray(pet.preferredPlaymates)
            ? pet.preferredPlaymates
            : [],
        temperament: Array.isArray(pet.temperament)
            ? pet.temperament
            : [],
        photos: Array.isArray(pet.photos)
            ? pet.photos
            : [],
    });

    // Fetch pet data
    useEffect(() => {
        let isMounted = true;
        
        const fetchPetData = async () => {
            try {
                const response = await PetService.getPetById(petId);
                
                if (!isMounted) return;
                
                if (response && response.pet) {
                    const normalizedPet = normalizePetData(response.pet);
                    setPetData(normalizedPet);
                    originalPetData.current = { ...normalizedPet };
                } else {
                    throw new Error("Pet not found");
                }
            } catch (error) {
                console.error("Error fetching pet data:", error);
                if (isMounted) {
                    Alert.alert(
                        "Error",
                        "Failed to load pet information. Please try again."
                    );
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        fetchPetData();
        
        return () => {
            isMounted = false;
        };
    }, [petId]);

    // Setup navigation header separately from data fetching
    useEffect(() => {
        const headerLeftButton = () => (
            <TouchableOpacity
                style={styles.headerButton}
                onPress={handleBackPress}>
                <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
            </TouchableOpacity>
        );
        
        navigation.setOptions({
            title: "Edit Pet Profile",
            headerLeft: headerLeftButton,
            headerRight: null,
            headerTitleStyle: {
                fontWeight: theme.typography.fontWeight.semiBold,
                color: theme.colors.textPrimary
            },
            headerStyle: {
                backgroundColor: theme.colors.background,
                elevation: 0,
                shadowOpacity: 0,
                borderBottomWidth: 0,
            }
        });
    }, [navigation]);

    // Check for form changes
    useEffect(() => {
        if (!loading && originalPetData.current) {
            const hasFormChanges = JSON.stringify(originalPetData.current) !== JSON.stringify(petData);
            setHasChanges(hasFormChanges);
        }
    }, [petData, loading]);

    // Handle back button press
    const handleBackPress = () => {
        if (hasChanges) {
            Alert.alert(
                "Unsaved Changes",
                "You have unsaved changes. Are you sure you want to leave?",
                [
                    { text: "Stay", style: "cancel" },
                    { text: "Leave", style: "destructive", onPress: () => navigation.goBack() }
                ]
            );
        } else {
            navigation.goBack();
        }
    };

    // Run validation when values change after being touched
    useEffect(() => {
        const validateTouchedFields = () => {
            Object.keys(touched).forEach(field => {
                if (touched[field]) {
                    validateField(field, petData[field]);
                }
            });
        };
        
        validateTouchedFields();
    }, [petData]);
    
    // Get appropriate playmates based on pet type
    const getPlaymatePreferences = useCallback(() => {
        return petData.type === PET_TYPES.DOG 
            ? DOG_PLAYMATE_PREFERENCES 
            : CAT_PLAYMATE_PREFERENCES;
    }, [petData.type]);

    // Field validation
    const validateField = useCallback((fieldName, value) => {
        let error = null;

        switch (fieldName) {
            case "name":
                error = validateName(value);
                break;
            case "breed":
                error = validateBreed(value);
                break;
            case "age":
                error = validateAge(value);
                break;
            case "photos":
                error = validatePhotos(value);
                break;
            default:
                break;
        }

        setErrors(prev => ({ ...prev, [fieldName]: error }));
        return error;
    }, []);

    // Input handlers
    const handleInputChange = useCallback((field, value) => {
        setPetData(prevData => ({
            ...prevData,
            [field]: value,
        }));
    }, []);

    const handleBlur = useCallback((fieldName) => {
        setTouched(prev => ({ ...prev, [fieldName]: true }));
    }, []);

    const toggleArrayItem = useCallback((field, item) => {
        setPetData(prevData => {
            const array = prevData[field];
            const exists = array.includes(item);
            
            const newArray = exists 
                ? array.filter(i => i !== item) 
                : [...array, item];
                
            return {
                ...prevData,
                [field]: newArray
            };
        });
    }, []);

    // Image handling
    const pickImage = useCallback(async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [4, 4],
                quality: 0.8,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const selectedImage = result.assets[0];
                
                // Add to pending uploads list
                setPendingUploads(prev => [...prev, selectedImage.uri]);
                
                // Add to pet photos with local URI first (will be replaced with Cloudinary URL)
                setPetData(prevData => ({
                    ...prevData,
                    photos: [...prevData.photos, selectedImage.uri]
                }));
                
                // Start upload to Cloudinary
                uploadImageToCloudinary(selectedImage.uri);
                
                setTouched(prev => ({ ...prev, photos: true }));
            }
        } catch (error) {
            console.error('Image picker error:', error);
            Alert.alert("Error", "Failed to pick image");
        }
    }, [petData.photos]);
    
    const uploadImageToCloudinary = async (imageUri) => {
        setImageUploading(true);
        try {
            // Upload to Cloudinary
            const response = await PetService.uploadPetImage(imageUri);
            
            if (response.success && response.imageUrl) {
                // Replace the local URI with the Cloudinary URL
                setPetData(prevData => {
                    const photos = [...prevData.photos];
                    const localIndex = photos.findIndex(uri => uri === imageUri);
                    
                    if (localIndex !== -1) {
                        photos[localIndex] = response.imageUrl;
                    }
                    
                    return {
                        ...prevData,
                        photos: photos
                    };
                });
                
                // Remove from pending uploads
                setPendingUploads(prev => prev.filter(uri => uri !== imageUri));
            } else {
                throw new Error('Upload failed');
            }
        } catch (error) {
            console.error('Cloudinary upload error:', error);
            Alert.alert('Upload Failed', 'Failed to upload image to cloud storage.');
            
            // Remove the failed image
            setPetData(prevData => ({
                ...prevData,
                photos: prevData.photos.filter(uri => uri !== imageUri)
            }));
            
            // Remove from pending uploads
            setPendingUploads(prev => prev.filter(uri => uri !== imageUri));
        } finally {
            setImageUploading(false);
        }
    };

    const removeImage = useCallback((index) => {
        setPetData(prevData => {
            const newPhotos = [...prevData.photos];
            const removedUri = newPhotos[index];
            
            // Remove from photos array
            newPhotos.splice(index, 1);
            
            // Remove from pending uploads if it's there
            if (pendingUploads.includes(removedUri)) {
                setPendingUploads(prev => prev.filter(uri => uri !== removedUri));
            }
            
            return {
                ...prevData,
                photos: newPhotos
            };
        });
        setTouched(prev => ({ ...prev, photos: true }));
    }, [pendingUploads]);

    // Form validation
    const validateForm = useCallback(() => {
        // Mark all fields as touched
        const allTouched = {
            name: true,
            breed: true,
            age: true,
            photos: true,
        };
        setTouched(allTouched);

        // Check all fields
        const nameError = validateField("name", petData.name);
        const breedError = validateField("breed", petData.breed);
        const ageError = validateField("age", petData.age);
        const photosError = validateField("photos", petData.photos);

        // Return true if no errors
        return !nameError && !breedError && !ageError && !photosError;
    }, [petData, validateField]);

    // Delete pet handler
    const handleDeletePet = useCallback(() => {
        Alert.alert(
            "Delete Pet",
            "Are you sure you want to delete this pet? This action cannot be undone.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await PetService.deletePet(petId);
                            navigation.navigate("MainTabs", {
                                screen: "Home",
                                params: { refresh: true },
                            });
                            Alert.alert("Success", "Pet deleted successfully.");
                        } catch (error) {
                            console.error("Error deleting pet:", error);
                            Alert.alert(
                                "Error",
                                "Failed to delete pet. Please try again."
                            );
                        }
                    },
                },
            ]
        );
    }, [petId, navigation]);
    
    // Form submission
    const handleSubmit = useCallback(async () => {
        // Check if there are pending uploads
        if (pendingUploads.length > 0) {
            Alert.alert(
                "Images Still Uploading",
                "Please wait for all images to finish uploading before saving.",
                [{ text: "OK" }]
            );
            return;
        }
        
        if (!validateForm()) {
            Alert.alert(
                "Validation Error",
                "Please correct the errors in the form."
            );
            return;
        }

        setSubmitting(true);
        try {
            // Create a deep copy of the petData to send to the API
            const dataToSubmit = JSON.parse(JSON.stringify(petData));
            
            await PetService.updatePet(petId, dataToSubmit);
            
            // Update the original data ref after successful update
            originalPetData.current = { ...petData };
            setHasChanges(false);
            
            Alert.alert(
                "Success",
                "Pet profile updated successfully!",
                [
                    {
                        text: "OK",
                        onPress: () => {
                            navigation.navigate("MainTabs", {
                                screen: "Home",
                                params: { refresh: true },
                            });
                        },
                    },
                ],
                { cancelable: false }
            );
        } catch (error) {
            console.error("Error updating pet:", error);
            Alert.alert(
                "Error",
                error.message || "Failed to update pet profile"
            );
        } finally {
            setSubmitting(false);
        }
    }, [petData, petId, navigation, validateForm, pendingUploads]);

    // Loading state
    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    // Check if a photo URL is a local URI or remote URL
    const isLocalUri = (uri) => {
        return uri && (uri.startsWith('file:') || uri.startsWith('content:') || pendingUploads.includes(uri));
    };

    // Section navigation
    const renderSectionTabs = () => (
        <View style={styles.sectionTabsContainer}>
            <TouchableOpacity 
                style={[styles.sectionTab, currentSection === 'basic' && styles.activeSectionTab]}
                onPress={() => setCurrentSection('basic')}
            >
                <Ionicons 
                    name="information-circle-outline" 
                    size={20} 
                    color={currentSection === 'basic' ? theme.colors.primary : theme.colors.textSecondary} 
                />
                <Text style={[
                    styles.sectionTabText, 
                    currentSection === 'basic' && styles.activeSectionTabText
                ]}>
                    Basic
                </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
                style={[styles.sectionTab, currentSection === 'photos' && styles.activeSectionTab]}
                onPress={() => setCurrentSection('photos')}
            >
                <Ionicons 
                    name="images-outline" 
                    size={20} 
                    color={currentSection === 'photos' ? theme.colors.primary : theme.colors.textSecondary} 
                />
                <Text style={[
                    styles.sectionTabText, 
                    currentSection === 'photos' && styles.activeSectionTabText
                ]}>
                    Photos
                </Text>
                {errors.photos && (
                    <View style={styles.errorBadge}>
                        <Text style={styles.errorBadgeText}>!</Text>
                    </View>
                )}
            </TouchableOpacity>
            
            <TouchableOpacity 
                style={[styles.sectionTab, currentSection === 'personality' && styles.activeSectionTab]}
                onPress={() => setCurrentSection('personality')}
            >
                <Ionicons 
                    name="happy-outline" 
                    size={20} 
                    color={currentSection === 'personality' ? theme.colors.primary : theme.colors.textSecondary} 
                />
                <Text style={[
                    styles.sectionTabText, 
                    currentSection === 'personality' && styles.activeSectionTabText
                ]}>
                    Personality
                </Text>
            </TouchableOpacity>
        </View>
    );

    // Render the appropriate section content
    const renderSectionContent = () => {
        switch (currentSection) {
            case 'basic':
                return (
                    <View style={styles.sectionContent}>
                        <InputField
                            label="Pet Name"
                            required
                            placeholder="e.g., Buddy"
                            value={petData.name}
                            onChangeText={(value) => handleInputChange("name", value)}
                            error={errors.name}
                            touched={touched.name}
                            onBlur={() => handleBlur("name")}
                            style={styles.input}
                            containerStyle={styles.inputContainer}
                        />

                        <InputField
                            label="Breed"
                            required
                            placeholder="e.g., Golden Retriever"
                            value={petData.breed}
                            onChangeText={(value) => handleInputChange("breed", value)}
                            error={errors.breed}
                            touched={touched.breed}
                            onBlur={() => handleBlur("breed")}
                            style={styles.input}
                            containerStyle={styles.inputContainer}
                        />

                        <CustomDropdown
                            label="Type"
                            options={petTypeOptions}
                            selectedValue={petData.type}
                            onValueChange={(value) => handleInputChange("type", value)}
                            containerStyle={styles.inputContainer}
                        />

                        <InputField
                            label="Age"
                            required
                            placeholder="e.g., 2"
                            isNumeric={true}
                            value={petData.age}
                            onChangeText={(value) => handleInputChange("age", value)}
                            keyboardType="default"
                            error={errors.age}
                            touched={touched.age}
                            onBlur={() => handleBlur("age")}
                            style={styles.input}
                            containerStyle={styles.inputContainer}
                        />

                        <CustomDropdown
                            label="Gender"
                            options={genderOptions}
                            selectedValue={petData.gender}
                            onValueChange={(value) => handleInputChange("gender", value)}
                            containerStyle={styles.inputContainer}
                        />

                        <CustomDropdown
                            label="Size"
                            options={sizeOptions}
                            selectedValue={petData.size}
                            onValueChange={(value) => handleInputChange("size", value)}
                            containerStyle={styles.inputContainer}
                        />

                        <CustomDropdown
                            label="Vaccinated"
                            options={vaccinatedOptions}
                            selectedValue={petData.vaccinated}
                            onValueChange={(value) => handleInputChange("vaccinated", value)}
                            containerStyle={styles.inputContainer}
                        />
                    </View>
                );
                
            case 'photos':
                return (
                    <View style={styles.sectionContent}>
                        <Text style={styles.label}>
                            Pet Photos <Text style={styles.requiredMark}>*</Text>
                        </Text>
                        <Text style={styles.photoHelperText}>
                            Add at least 2 photos of your pet to help potential playmates get to know them better
                        </Text>
                        
                        <TouchableOpacity
                            style={styles.photoUploadButton}
                            onPress={pickImage}
                            disabled={imageUploading}>
                            {imageUploading ? (
                                <ActivityIndicator size="small" color={theme.colors.primary} />
                            ) : (
                                <>
                                    <Ionicons
                                        name="add-circle-outline"
                                        size={24}
                                        color={theme.colors.primary}
                                    />
                                    <Text style={styles.photoUploadButtonText}>
                                        Add Photo
                                    </Text>
                                </>
                            )}
                        </TouchableOpacity>

                        {touched.photos && errors.photos && (
                            <Text style={styles.errorText}>
                                {errors.photos}
                            </Text>
                        )}

                        <View style={styles.photoGridContainer}>
                            {petData.photos?.map((photo, index) => (
                                <View key={index} style={styles.photoItem}>
                                    <Image
                                        source={{ uri: photo }}
                                        style={styles.photo}
                                    />
                                    <TouchableOpacity
                                        style={styles.removePhotoButton}
                                        onPress={() => removeImage(index)}
                                        disabled={imageUploading}>
                                        <Ionicons 
                                            name="close-circle" 
                                            size={22} 
                                            color="white" 
                                        />
                                    </TouchableOpacity>
                                    {isLocalUri(photo) && (
                                        <View style={styles.uploadingOverlay}>
                                            <ActivityIndicator size="small" color="#FFF" />
                                        </View>
                                    )}
                                </View>
                            ))}
                        </View>
                    </View>
                );
                
            case 'personality':
                return (
                    <View style={styles.sectionContent}>
                        <CustomDropdown
                            label="Activity Level"
                            options={activityOptions}
                            selectedValue={petData.activityLevel}
                            onValueChange={(value) => handleInputChange("activityLevel", value)}
                            containerStyle={styles.inputContainer}
                        />

                        <InputField
                            label="Description"
                            placeholder="Tell us a bit about your pet..."
                            value={petData.description}
                            onChangeText={(value) => handleInputChange("description", value)}
                            multiline
                            numberOfLines={4}
                            textAlignVertical="top"
                            style={styles.textArea}
                            containerStyle={styles.inputContainer}
                        />

                        <Text style={styles.label}>Temperament</Text>
                        <Text style={styles.sublabel}>Select all that apply</Text>
                        <View style={styles.optionsContainer}>
                            {TEMPERAMENTS.map((item) => (
                                <TouchableOpacity
                                    key={item}
                                    style={[
                                        styles.optionItem,
                                        petData.temperament?.includes(item) &&
                                            styles.selectedOption,
                                    ]}
                                    onPress={() =>
                                        toggleArrayItem("temperament", item)
                                    }>
                                    <Text
                                        style={[
                                            styles.optionText,
                                            petData.temperament?.includes(item) &&
                                                styles.selectedOptionText,
                                        ]}>
                                        {item}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.label}>Preferred Playmates</Text>
                        <Text style={styles.sublabel}>Select all that apply</Text>
                        <View style={styles.optionsContainer}>
                            {getPlaymatePreferences().map((item) => (
                                <TouchableOpacity
                                    key={item}
                                    style={[
                                        styles.optionItem,
                                        petData.preferredPlaymates?.includes(item) &&
                                            styles.selectedOption,
                                    ]}
                                    onPress={() =>
                                        toggleArrayItem("preferredPlaymates", item)
                                    }>
                                    <Text
                                        style={[
                                            styles.optionText,
                                            petData.preferredPlaymates?.includes(item) &&
                                                styles.selectedOptionText,
                                        ]}>
                                        {item}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Button
                            title="Delete Pet"
                            onPress={handleDeletePet}
                            type="danger"
                            icon="trash-outline"
                            iconPosition="left"
                            style={styles.deleteButton}
                        />
                    </View>
                );
                
            default:
                return null;
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView 
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Back Button */}
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={handleBackPress}
                >
                    <Ionicons
                        name="chevron-back"
                        size={28}
                        color={theme.colors.textPrimary}
                    />
                </TouchableOpacity>
                
                {/* Pet preview card */}
                <View style={styles.previewCard}>
                    <LinearGradient
                        colors={['rgba(0,0,0,0.4)', 'transparent']}
                        style={styles.gradientOverlay}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 1 }}
                    />
                    
                    {petData.photos && petData.photos.length > 0 && (
                        <Image 
                            source={{ uri: petData.photos[0] }} 
                            style={styles.previewImage} 
                            resizeMode="cover"
                        />
                    )}
                    
                    <View style={styles.previewInfo}>
                        <Text style={styles.previewName}>{petData.name}</Text>
                        <Text style={styles.previewBreed}>{petData.breed}</Text>
                    </View>
                </View>
                
                {renderSectionTabs()}
                
                {renderSectionContent()}
            </ScrollView>
            
            {/* Fixed action button */}
            <View style={styles.fixedActionContainer}>
                <Button
                    title={submitting ? "Saving..." : "Save Changes"}
                    onPress={handleSubmit}
                    disabled={submitting || !hasChanges || imageUploading}
                    loading={submitting}
                    style={styles.submitButton}
                />
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
        paddingTop: StatusBar.currentHeight || 0,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    headerButton: {
        padding: 8,
    },
    backButton: {
        position: 'absolute',
        top: 10,
        left: 10,
        zIndex: 10,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: theme.colors.background + 'CC', // Semi-transparent
        alignItems: 'center',
        justifyContent: 'center',
        ...theme.shadows.small,
    },
    scrollContent: {
        paddingBottom: 100, // Space for fixed action button
        paddingTop: 0,      // No padding at top since we have absolute header
    },
    previewCard: {
        height: 200,
        width: "100%",
        position: "relative",
        marginBottom: 16,
    },
    previewImage: {
        width: '100%',
        height: '100%',
    },
    gradientOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '100%',
        zIndex: 1,
    },
    previewInfo: {
        position: 'absolute',
        bottom: 20,
        left: 20,
        zIndex: 2,
    },
    previewName: {
        color: '#fff',
        fontSize: theme.typography.fontSize.xxl,
        fontWeight: theme.typography.fontWeight.bold,
        textShadowColor: 'rgba(0, 0, 0, 0.5)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 3,
    },
    previewBreed: {
        color: '#fff',
        fontSize: theme.typography.fontSize.md,
        fontWeight: theme.typography.fontWeight.medium,
        opacity: 0.9,
        textShadowColor: 'rgba(0, 0, 0, 0.5)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 3,
    },
    sectionTabsContainer: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: theme.colors.background,
        borderRadius: theme.borderRadius.lg,
        marginHorizontal: 20,
        marginBottom: 20,
        ...theme.shadows.medium,
    },
    sectionTab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        position: 'relative',
    },
    activeSectionTab: {
        backgroundColor: theme.colors.primaryLight + '20', // 20% opacity
        borderRadius: theme.borderRadius.md,
    },
    sectionTabText: {
        marginLeft: 6,
        fontSize: theme.typography.fontSize.sm,
        fontWeight: theme.typography.fontWeight.medium,
        color: theme.colors.textSecondary,
    },
    activeSectionTabText: {
        color: theme.colors.primary,
        fontWeight: theme.typography.fontWeight.semiBold,
    },
    errorBadge: {
        position: 'absolute',
        top: 0,
        right: 20,
        backgroundColor: theme.colors.error,
        width: 16,
        height: 16,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    errorBadgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
    },
    sectionContent: {
        paddingHorizontal: 20,
    },
    inputContainer: {
        marginBottom: 16,
    },
    input: {
        borderWidth: 1,
        borderColor: theme.colors.inputBorder,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        fontSize: theme.typography.fontSize.md,
    },
    label: {
        fontSize: theme.typography.fontSize.md,
        fontWeight: theme.typography.fontWeight.semiBold,
        color: theme.colors.textPrimary,
        marginBottom: 8,
    },
    sublabel: {
        fontSize: theme.typography.fontSize.sm,
        color: theme.colors.textSecondary,
        marginBottom: 12,
        marginTop: -4,
    },
    photoHelperText: {
        fontSize: theme.typography.fontSize.sm,
        color: theme.colors.textSecondary,
        marginBottom: 16,
    },
    textArea: {
        height: 120,
        textAlignVertical: "top",
        borderWidth: 1,
        borderColor: theme.colors.inputBorder,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
    },
    optionsContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
        marginBottom: 24,
    },
    optionItem: {
        borderWidth: 1,
        borderColor: theme.colors.inputBorder,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.xl,
        paddingVertical: 8,
        paddingHorizontal: 16,
        margin: 4,
        marginBottom: 8,
        ...theme.shadows.small,
    },
    selectedOption: {
        backgroundColor: theme.colors.primary,
        borderColor: theme.colors.primary,
    },
    optionText: {
        color: theme.colors.textPrimary,
        fontSize: theme.typography.fontSize.sm,
    },
    selectedOptionText: {
        color: theme.colors.onPrimary,
        fontWeight: theme.typography.fontWeight.medium,
    },
    photoUploadButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: theme.colors.surface,
        padding: 16,
        borderRadius: theme.borderRadius.md,
        marginBottom: 16,
        borderWidth: 1.5,
        borderColor: theme.colors.primary,
        borderStyle: "dashed",
    },
    photoUploadButtonText: {
        color: theme.colors.primary,
        fontSize: theme.typography.fontSize.md,
        fontWeight: theme.typography.fontWeight.medium,
        marginLeft: 10,
    },
    photoGridContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
        marginHorizontal: -4,
        marginBottom: 24,
    },
    photoItem: {
        position: "relative",
        margin: 4,
    },
    photo: {
        width: photoSize,
        height: photoSize,
        borderRadius: theme.borderRadius.md,
    },
    removePhotoButton: {
        position: "absolute",
        top: 6,
        right: 6,
        zIndex: 10,
    },
    uploadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        borderRadius: theme.borderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    requiredMark: {
        color: theme.colors.error,
    },
    errorText: {
        color: theme.colors.error,
        fontSize: theme.typography.fontSize.sm,
        marginTop: -8,
        marginBottom: 12,
        marginLeft: 4,
    },
    deleteButton: {
        marginTop: 24,
        marginBottom: 40,
    },
    fixedActionContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingVertical: 12,
        paddingHorizontal: 20,
        backgroundColor: theme.colors.background,
        borderTopWidth: 1,
        borderTopColor: theme.colors.divider,
        ...theme.shadows.medium,
    },
    submitButton: {
        borderRadius: theme.borderRadius.md,
    },
});

export default EditPetProfileScreen;
