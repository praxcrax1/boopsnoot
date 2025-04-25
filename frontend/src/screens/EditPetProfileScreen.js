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
    Platform,
    Animated,
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
import theme, { withOpacity } from "../styles/theme";

const { width } = Dimensions.get("window");
const photoSize = Math.floor((width - 56) / 3); // 3 photos per row with 20px padding and 8px gaps

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
    
    // Animations
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(20)).current;
    const tabIndicatorPosition = useRef(new Animated.Value(0)).current;
    
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
                    
                    // Trigger entrance animations
                    Animated.parallel([
                        Animated.timing(fadeAnim, {
                            toValue: 1,
                            duration: 400,
                            useNativeDriver: true
                        }),
                        Animated.timing(slideAnim, {
                            toValue: 0,
                            duration: 400,
                            useNativeDriver: true
                        })
                    ]).start();
                }
            }
        };

        fetchPetData();
        
        return () => {
            isMounted = false;
        };
    }, [petId, fadeAnim, slideAnim]);

    // Setup navigation header separately from data fetching
    useEffect(() => {
        navigation.setOptions({
            headerShown: false, // Hide the default header, we'll use our own
        });
    }, [navigation]);

    // Check for form changes
    useEffect(() => {
        if (!loading && originalPetData.current) {
            const hasFormChanges = JSON.stringify(originalPetData.current) !== JSON.stringify(petData);
            setHasChanges(hasFormChanges);
        }
    }, [petData, loading]);

    // Animate tab indicator when changing sections
    useEffect(() => {
        let newPosition;
        switch (currentSection) {
            case 'basic':
                newPosition = 0;
                break;
            case 'photos':
                newPosition = width / 3;
                break;
            case 'personality':
                newPosition = (width / 3) * 2;
                break;
            default:
                newPosition = 0;
        }
        
        Animated.timing(tabIndicatorPosition, {
            toValue: newPosition,
            duration: 200,
            useNativeDriver: false
        }).start();
    }, [currentSection, tabIndicatorPosition, width]);

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
                <Text style={styles.loadingText}>Loading pet profile...</Text>
            </View>
        );
    }

    // Check if a photo URL is a local URI or remote URL
    const isLocalUri = (uri) => {
        return uri && (uri.startsWith('file:') || uri.startsWith('content:') || pendingUploads.includes(uri));
    };

    // Render the appropriate section content
    const renderSectionContent = () => {
        switch (currentSection) {
            case 'basic':
                return (
                    <Animated.View 
                        style={[
                            styles.sectionContent,
                            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
                        ]}
                    >
                        <InputField
                            label="Pet Name"
                            required
                            placeholder="e.g., Buddy"
                            value={petData.name}
                            onChangeText={(value) => handleInputChange("name", value)}
                            error={errors.name}
                            touched={touched.name}
                            onBlur={() => handleBlur("name")}
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
                        />

                        <CustomDropdown
                            label="Type"
                            options={petTypeOptions}
                            selectedValue={petData.type}
                            onValueChange={(value) => handleInputChange("type", value)}
                        />

                        <InputField
                            label="Age"
                            required
                            placeholder="e.g., 2"
                            isNumeric={true}
                            value={petData.age}
                            onChangeText={(value) => handleInputChange("age", value)}
                            keyboardType="numeric"
                            error={errors.age}
                            touched={touched.age}
                            onBlur={() => handleBlur("age")}
                        />

                        <View style={styles.formRow}>
                            <View style={styles.formHalfColumn}>
                                <CustomDropdown
                                    label="Gender"
                                    options={genderOptions}
                                    selectedValue={petData.gender}
                                    onValueChange={(value) => handleInputChange("gender", value)}
                                />
                            </View>
                            <View style={styles.formHalfColumn}>
                                <CustomDropdown
                                    label="Size"
                                    options={sizeOptions}
                                    selectedValue={petData.size}
                                    onValueChange={(value) => handleInputChange("size", value)}
                                />
                            </View>
                        </View>

                        <CustomDropdown
                            label="Vaccinated"
                            options={vaccinatedOptions}
                            selectedValue={petData.vaccinated}
                            onValueChange={(value) => handleInputChange("vaccinated", value)}
                        />
                    </Animated.View>
                );
                
            case 'photos':
                return (
                    <Animated.View 
                        style={[
                            styles.sectionContent,
                            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
                        ]}
                    >
                        <Text style={styles.sectionHeader}>Pet Photos</Text>
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
                                        <LinearGradient
                                            colors={['rgba(0,0,0,0.6)', 'rgba(0,0,0,0.4)']}
                                            style={styles.removePhotoGradient}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 1 }}
                                        >
                                            <Ionicons 
                                                name="close-circle" 
                                                size={22} 
                                                color="white" 
                                            />
                                        </LinearGradient>
                                    </TouchableOpacity>
                                    {isLocalUri(photo) && (
                                        <View style={styles.uploadingOverlay}>
                                            <ActivityIndicator size="small" color="#FFF" />
                                        </View>
                                    )}
                                </View>
                            ))}
                        </View>
                    </Animated.View>
                );
                
            case 'personality':
                return (
                    <Animated.View 
                        style={[
                            styles.sectionContent,
                            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
                        ]}
                    >
                        <Text style={styles.sectionHeader}>Personality Details</Text>

                        <CustomDropdown
                            label="Activity Level"
                            options={activityOptions}
                            selectedValue={petData.activityLevel}
                            onValueChange={(value) => handleInputChange("activityLevel", value)}
                        />

                        <InputField
                            label="Description"
                            placeholder="Tell us a bit about your pet..."
                            value={petData.description}
                            onChangeText={(value) => handleInputChange("description", value)}
                            multiline
                            numberOfLines={4}
                            textAlignVertical="top"
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
                    </Animated.View>
                );
                
            default:
                return null;
        }
    };

    return (
        <SafeAreaView style={styles.safeArea} edges={['top']}>
            <StatusBar
                translucent
                backgroundColor="transparent"
                barStyle="dark-content"
            />
            
            {/* Custom header */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={handleBackPress}>
                    <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Edit Profile</Text>
                <View style={styles.headerRight}>
                    {hasChanges && !submitting && !imageUploading && (
                        <TouchableOpacity
                            style={styles.saveButton}
                            onPress={handleSubmit}>
                            <Text style={styles.saveButtonText}>Save</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
            
            {/* Pet profile preview */}
            <View style={styles.previewContainer}>
                <Image 
                    source={{ uri: petData.photos?.[0] || 'https://res.cloudinary.com/boopsnoot/image/upload/v1650120000/default-pet.png' }}
                    style={styles.previewImage}
                />
                <LinearGradient
                    colors={['rgba(0,0,0,0.5)', 'transparent']}
                    style={styles.previewGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                />
                <View style={styles.previewInfo}>
                    <View>
                        <Text style={styles.previewName}>{petData.name}</Text>
                        <Text style={styles.previewBreed}>{petData.breed}</Text>
                    </View>
                </View>
            </View>
            
            {/* Section tabs */}
            <View style={styles.tabsContainer}>
                <TouchableOpacity 
                    style={styles.tab} 
                    onPress={() => setCurrentSection('basic')}
                    activeOpacity={0.7}
                >
                    <Ionicons 
                        name="information-circle-outline" 
                        size={20} 
                        color={currentSection === 'basic' ? theme.colors.primary : theme.colors.textSecondary} 
                    />
                    <Text style={[
                        styles.tabText,
                        currentSection === 'basic' && styles.activeTabText
                    ]}>
                        Basic
                    </Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                    style={styles.tab} 
                    onPress={() => setCurrentSection('photos')}
                    activeOpacity={0.7}
                >
                    <Ionicons 
                        name="images-outline" 
                        size={20} 
                        color={currentSection === 'photos' ? theme.colors.primary : theme.colors.textSecondary} 
                    />
                    <Text style={[
                        styles.tabText,
                        currentSection === 'photos' && styles.activeTabText
                    ]}>
                        Photos
                    </Text>
                    {touched.photos && errors.photos && (
                        <View style={styles.errorBadge}>
                            <Text style={styles.errorBadgeText}>!</Text>
                        </View>
                    )}
                </TouchableOpacity>
                
                <TouchableOpacity 
                    style={styles.tab} 
                    onPress={() => setCurrentSection('personality')}
                    activeOpacity={0.7}
                >
                    <Ionicons 
                        name="happy-outline" 
                        size={20} 
                        color={currentSection === 'personality' ? theme.colors.primary : theme.colors.textSecondary} 
                    />
                    <Text style={[
                        styles.tabText,
                        currentSection === 'personality' && styles.activeTabText
                    ]}>
                        Personality
                    </Text>
                </TouchableOpacity>
                
                <Animated.View 
                    style={[
                        styles.activeTabIndicator,
                        { left: tabIndicatorPosition, width: width / 3 }
                    ]}
                />
            </View>
            
            {/* Main content area */}
            <ScrollView 
                style={styles.container}
                contentContainerStyle={styles.contentContainer}
                showsVerticalScrollIndicator={false}
            >
                {renderSectionContent()}
                <View style={styles.bottomPadding} />
            </ScrollView>
            
            {/* Fixed action button at bottom */}
            {hasChanges && (
                <View style={styles.fixedActionContainer}>
                    <Button
                        title={submitting ? "Saving..." : "Save Changes"}
                        onPress={handleSubmit}
                        disabled={submitting || imageUploading}
                        loading={submitting}
                        style={styles.submitButton}
                    />
                </View>
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: theme.colors.background,
    },
    loadingText: {
        marginTop: theme.spacing.md,
        color: theme.colors.textSecondary,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        backgroundColor: theme.colors.background,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.divider,
        ...Platform.select({
            ios: {
                shadowColor: theme.colors.textPrimary,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 3,
            },
            android: {
                elevation: 2,
            },
        }),
        zIndex: 10,
    },
    headerTitle: {
        fontSize: theme.typography.fontSize.lg,
        fontWeight: theme.typography.fontWeight.semiBold,
        color: theme.colors.textPrimary,
    },
    backButton: {
        padding: 8,
    },
    headerRight: {
        width: 60,
        alignItems: 'flex-end',
    },
    saveButton: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: theme.borderRadius.md,
        backgroundColor: theme.colors.primary + '10',
    },
    saveButtonText: {
        color: theme.colors.primary,
        fontWeight: theme.typography.fontWeight.semiBold,
        fontSize: theme.typography.fontSize.sm,
    },
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    contentContainer: {
        paddingBottom: 100, // Extra space for fixed button
    },
    previewContainer: {
        position: 'relative',
        height: 300,
        width: '100%',
    },
    previewImage: {
        height: '100%',
        width: '100%',
        resizeMode: 'cover',
    },
    previewGradient: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '100%',
    },
    previewInfo: {
        position: 'absolute',
        bottom: 16,
        left: 16,
        right: 16,
    },
    previewName: {
        fontSize: theme.typography.fontSize.xl,
        fontWeight: theme.typography.fontWeight.bold,
        color: '#fff',
        textShadowColor: 'rgba(0, 0, 0, 0.5)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 3,
    },
    previewBreed: {
        fontSize: theme.typography.fontSize.md,
        color: '#fff',
        opacity: 0.9,
        textShadowColor: 'rgba(0, 0, 0, 0.5)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 3,
    },
    tabsContainer: {
        flexDirection: 'row',
        height: 48,
        backgroundColor: theme.colors.background,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.divider,
        position: 'relative',
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
    },
    tabText: {
        marginLeft: 6,
        fontSize: theme.typography.fontSize.sm,
        color: theme.colors.textSecondary,
    },
    activeTabText: {
        color: theme.colors.primary,
        fontWeight: theme.typography.fontWeight.semiBold,
    },
    activeTabIndicator: {
        position: 'absolute',
        bottom: 0,
        height: 2,
        backgroundColor: theme.colors.primary,
    },
    errorBadge: {
        position: 'absolute',
        top: 10,
        right: 'auto',
        marginLeft: 20,
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
        paddingTop: 20,
    },
    formRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    formHalfColumn: {
        width: '48%',
    },
    sectionHeader: {
        fontSize: theme.typography.fontSize.lg,
        fontWeight: theme.typography.fontWeight.semiBold,
        color: theme.colors.textPrimary,
        marginBottom: 12,
    },
    label: {
        fontSize: theme.typography.fontSize.md,
        fontWeight: theme.typography.fontWeight.semiBold,
        color: theme.colors.textPrimary,
        marginBottom: 8,
        marginTop: 16,
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
        lineHeight: 18,
    },
    photoUploadButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: theme.colors.background,
        padding: 16,
        borderRadius: theme.borderRadius.md,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: theme.colors.primary,
        borderStyle: "dashed",
    },
    photoUploadButtonText: {
        color: theme.colors.primary,
        fontSize: theme.typography.fontSize.md,
        fontWeight: theme.typography.fontWeight.medium,
        marginLeft: 10,
    },
    errorText: {
        color: theme.colors.error,
        fontSize: theme.typography.fontSize.sm,
        marginBottom: 12,
        marginTop: -8,
    },
    photoGridContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
        marginHorizontal: -4,
    },
    photoItem: {
        position: "relative",
        margin: 4,
        borderRadius: theme.borderRadius.md,
        overflow: 'hidden',
        ...theme.shadows.small,
    },
    photo: {
        width: photoSize,
        height: photoSize,
    },
    removePhotoButton: {
        position: "absolute",
        top: 6,
        right: 6,
        zIndex: 10,
    },
    removePhotoGradient: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    uploadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        alignItems: 'center',
        justifyContent: 'center',
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
        paddingHorizontal: 12,
        margin: 4,
        ...Platform.select({
            ios: {
                shadowColor: theme.colors.textPrimary,
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.1,
                shadowRadius: 2,
            },
            android: {
                elevation: 1,
            },
        }),
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
    deleteButton: {
        marginTop: 24,
    },
    bottomPadding: {
        height: 60,
    },
    fixedActionContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 20,
        paddingVertical: 12,
        backgroundColor: theme.colors.background,
        borderTopWidth: 1,
        borderTopColor: theme.colors.divider,
        ...Platform.select({
            ios: {
                shadowColor: theme.colors.textPrimary,
                shadowOffset: { width: 0, height: -4 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
            },
            android: {
                elevation: 8,
            },
        }),
    },
    submitButton: {
        borderRadius: theme.borderRadius.md,
    },
});

export default EditPetProfileScreen;
