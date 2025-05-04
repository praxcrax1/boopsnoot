import React, { useState, useContext, useEffect, useRef } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    Alert,
    ActivityIndicator,
    Dimensions,
    Platform,
    StatusBar,
    PanResponder,
    Animated,
} from "react-native";
import { SafeAreaView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import PetService from "../../services/PetService";
import { AuthContext } from "../../contexts/AuthContext";
import {
    validateName,
    validateBreed,
    validateAge,
    validatePhotos,
} from "../../utils/validation";
import {
    petTypeOptions,
    genderOptions,
    sizeOptions,
    TEMPERAMENTS,
    DOG_PLAYMATE_PREFERENCES,
    CAT_PLAYMATE_PREFERENCES,
    PET_TYPES,
} from "../../constants/petConstants";
import InputField from "../../components/InputField";
import CustomDropdown from "../../components/CustomDropdown";
import Button from "../../components/Button";
import theme, { withOpacity } from "../../styles/theme";

const { width } = Dimensions.get("window");
const photoSize = (width - 48) / 3;

const PetProfileSetupScreen = ({ navigation }) => {
    const { user, updatePetStatus } = useContext(AuthContext);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [imageUploading, setImageUploading] = useState(false);
    const [petData, setPetData] = useState({
        name: "",
        breed: "",
        type: "dog",
        age: "",
        gender: "male",
        size: "medium",
        photos: [],
        description: "",
        temperament: [],
        preferredPlaymates: [],
    });
    
    // Animation values
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;
    
    // Local image URIs and cloud URLs mapping
    const [localImages, setLocalImages] = useState([]);
    const [cloudinaryUrls, setCloudinaryUrls] = useState([]);
    const [currentStep, setCurrentStep] = useState(1);
    const totalSteps = 3;

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

    // Request permission for image library
    useEffect(() => {
        (async () => {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Required', 'Sorry, we need camera roll permissions to upload images!');
            }
        })();
        
        // Run entrance animation
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 600,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 600,
                useNativeDriver: true,
            }),
        ]).start();
        
    }, []);

    // Get appropriate playmates based on pet type
    const getPlaymatePreferences = () => {
        return petData.type === PET_TYPES.DOG 
            ? DOG_PLAYMATE_PREFERENCES 
            : CAT_PLAYMATE_PREFERENCES;
    };

    // Validate form fields on change
    useEffect(() => {
        validateField("name", petData.name);
        validateField("breed", petData.breed);
        validateField("age", petData.age);
        validateField("photos", cloudinaryUrls);
    }, [petData, cloudinaryUrls]);

    const validateField = (fieldName, value) => {
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

        setErrors((prev) => ({ ...prev, [fieldName]: error }));
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
            newArray = array.filter((i) => i !== item);
        } else {
            newArray = [...array, item];
        }

        setPetData({ ...petData, [field]: newArray });
    };

    const pickImage = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [4, 4],
                quality: 0.8,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const selectedImage = result.assets[0];
                
                // Add to local images
                setLocalImages([...localImages, selectedImage.uri]);
                
                // Start upload to Cloudinary
                uploadImageToCloudinary(selectedImage.uri);
                
                setTouched({ ...touched, photos: true });
            }
        } catch (error) {
            console.error('Image picker error:', error);
            Alert.alert("Error", "Failed to pick image");
        }
    };
    
    const uploadImageToCloudinary = async (imageUri) => {
        setImageUploading(true);
        try {
            // Upload to Cloudinary
            const response = await PetService.uploadPetImage(imageUri);
            
            if (response.success && response.imageUrl) {
                // Add Cloudinary URL to state
                const newUrls = [...cloudinaryUrls, response.imageUrl];
                setCloudinaryUrls(newUrls);
                
                // Also update petData.photos which will be sent to API
                setPetData(prev => ({
                    ...prev,
                    photos: newUrls
                }));
            } else {
                throw new Error('Upload failed');
            }
        } catch (error) {
            console.error('Cloudinary upload error:', error);
            Alert.alert('Upload Failed', 'Failed to upload image to cloud storage.');
            
            // Remove the local image if upload fails
            setLocalImages(localImages.filter(uri => uri !== imageUri));
        } finally {
            setImageUploading(false);
        }
    };

    const removeImage = (index) => {
        // Remove from both local and cloudinary arrays
        const newLocalImages = [...localImages];
        const newCloudinaryUrls = [...cloudinaryUrls];
        
        newLocalImages.splice(index, 1);
        newCloudinaryUrls.splice(index, 1);
        
        setLocalImages(newLocalImages);
        setCloudinaryUrls(newCloudinaryUrls);
        
        // Update petData.photos
        setPetData({
            ...petData,
            photos: newCloudinaryUrls
        });
        
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
        const nameError = validateField("name", petData.name);
        const breedError = validateField("breed", petData.breed);
        const ageError = validateField("age", petData.age);
        const photosError = validateField("photos", cloudinaryUrls);

        return !nameError && !breedError && !ageError && !photosError;
    };

    const handleSubmit = async () => {
        // Validate all fields
        if (!validateForm()) {
            return;
        }

        setIsSubmitting(true);
        try {
            // Prepare pet data with Cloudinary URLs
            const petWithOwner = {
                ...petData,
                photos: cloudinaryUrls, // Use Cloudinary URLs
                ownerId: user.id,
            };

            await PetService.createPet(petWithOwner);
            
            // Update pet status in AuthContext
            if (updatePetStatus) {
                updatePetStatus(true);
            }

            // Fixed navigation - use CommonActions instead of reset
            // This works regardless of which navigator stack we're in
            navigation.navigate("MainTabs");
        } catch (error) {
            console.error("Error creating pet:", error);
            Alert.alert(
                "Error",
                error.message || "Failed to create pet profile"
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    const nextStep = () => {
        if (currentStep === 1) {
            // Validate step 1 fields
            setTouched({
                ...touched,
                name: true,
                breed: true,
                age: true,
            });
            
            const nameError = validateField("name", petData.name);
            const breedError = validateField("breed", petData.breed);
            const ageError = validateField("age", petData.age);
            
            if (nameError || breedError || ageError) {
                return;
            }
        } else if (currentStep === 2) {
            // Validate photos before proceeding to step 3
            setTouched({
                ...touched,
                photos: true,
            });
            
            const photosError = validateField("photos", cloudinaryUrls);
            
            if (photosError) {
                return;
            }
        }
        
        setCurrentStep(prev => Math.min(prev + 1, totalSteps));
    };

    const prevStep = () => {
        setCurrentStep(prev => Math.max(prev - 1, 1));
    };

    // Set up Pan Responder for swipe gestures
    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (e, gestureState) => {
                // Only recognize horizontal gestures that are significant enough
                return Math.abs(gestureState.dx) > 30 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
            },
            onPanResponderRelease: (e, gestureState) => {
                // If user swiped right with enough force and we're not on the first step
                if (gestureState.dx > 100 && currentStep > 1) {
                    prevStep();
                }
                // We could add swipe left to go to next step, but we'll leave that to the buttons for clarity
            }
        })
    ).current;

    // Render step indicators
    const renderStepIndicators = () => (
        <View style={styles.stepIndicatorContainer}>
            {Array.from({ length: totalSteps }).map((_, index) => (
                <View 
                    key={index} 
                    style={[
                        styles.stepIndicator, 
                        currentStep > index && styles.activeStepIndicator
                    ]}
                />
            ))}
        </View>
    );

    // Content for step 1 - Basic info
    const renderStep1 = () => (
        <View style={styles.stepContainer}>
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
                isNumeric={true}
                placeholder="e.g., 2"
                value={petData.age}
                onChangeText={(value) => handleInputChange("age", value)}
                keyboardType="default"
                error={errors.age}
                touched={touched.age}
                onBlur={() => handleBlur("age")}
            />

            <CustomDropdown
                label="Gender"
                options={genderOptions}
                selectedValue={petData.gender}
                onValueChange={(value) => handleInputChange("gender", value)}
            />

            <CustomDropdown
                label="Size"
                options={sizeOptions}
                selectedValue={petData.size}
                onValueChange={(value) => handleInputChange("size", value)}
            />

            <View style={styles.navigationButtonsContainer}>
                <Button 
                    title="Next" 
                    onPress={nextStep} 
                    style={styles.navigationButton}
                />
            </View>
        </View>
    );

    // Content for step 2 - Photos
    const renderStep2 = () => (
        <View style={styles.stepContainer}>
            <View>
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

                <View style={styles.photoContainer}>
                    {localImages.map((photoUri, index) => (
                        <View key={index} style={styles.photoItem}>
                            <Image
                                source={{ uri: photoUri }}
                                style={styles.photo}
                            />
                            {!imageUploading && (
                                <TouchableOpacity
                                    style={styles.removePhotoButton}
                                    onPress={() => removeImage(index)}>
                                    <Ionicons 
                                        name="close-circle" 
                                        size={22} 
                                        color="white" 
                                    />
                                </TouchableOpacity>
                            )}
                            {index >= cloudinaryUrls.length && (
                                <View style={styles.uploadingOverlay}>
                                    <ActivityIndicator size="small" color="#FFF" />
                                </View>
                            )}
                        </View>
                    ))}
                </View>
            </View>

            <View style={styles.navigationButtonsContainer}>
                <Button 
                    title="Back" 
                    onPress={prevStep} 
                    type="secondary"
                    style={styles.navigationButton}
                />
                <Button 
                    title="Next" 
                    onPress={nextStep} 
                    style={styles.navigationButton}
                />
            </View>
        </View>
    );

    // Content for step 3 - Personality & Preferences
    const renderStep3 = () => (
        <View style={styles.stepContainer}>
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

            <View style={styles.navigationButtonsContainer}>
                <Button 
                    title="Back" 
                    onPress={prevStep} 
                    type="secondary"
                    style={styles.navigationButton}
                />
                <Button
                    title={isSubmitting ? "Creating Profile..." : "Create Pet Profile"}
                    onPress={handleSubmit}
                    disabled={isSubmitting || imageUploading}
                    loading={isSubmitting}
                    style={styles.navigationButton}
                />
            </View>
        </View>
    );

    // Render appropriate step content
    const renderStepContent = () => {
        switch (currentStep) {
            case 1:
                return renderStep1();
            case 2:
                return renderStep2();
            case 3:
                return renderStep3();
            default:
                return null;
        }
    };

    return (
        <SafeAreaView 
            style={styles.container} 
            edges={["left", "right"]} // Removed "top" to handle it manually
        >
            <StatusBar
                barStyle="dark-content"
                backgroundColor="transparent"
                translucent={true}
            />
            <Animated.View
                style={[
                    { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
                    { flex: 1 }
                ]}
            >
                <LinearGradient
                    colors={[theme.colors.primaryLight, theme.colors.background]}
                    style={styles.gradientHeader}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                >
                    {/* Removed back button as requested */}
                    
                    <View style={styles.headerContainer}>
                        <Text style={styles.headerText}>Set Up Pet Profile</Text>
                        <Text style={styles.subHeaderText}>
                            Let's create a profile for your pet to help find playmates!
                        </Text>
                        {renderStepIndicators()}
                    </View>
                </LinearGradient>
                
                {/* Apply pan responder to the ScrollView */}
                <View {...panResponder.panHandlers} style={styles.swipeContainer}>
                    <ScrollView 
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                    >
                        {renderStepContent()}
                    </ScrollView>
                </View>
            </Animated.View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    gradientHeader: {
        paddingTop: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight + 20,
        paddingBottom: 40,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        marginBottom: -30,
        zIndex: 10,
    },
    headerContainer: {
        alignItems: "center",
        paddingHorizontal: 20,
        marginTop: Platform.OS === 'ios' ? 15 : 5,
    },
    headerText: {
        fontSize: theme.typography.fontSize.xxl,
        fontWeight: theme.typography.fontWeight.bold,
        color: theme.colors.textPrimary,
        marginBottom: 8,
    },
    subHeaderText: {
        fontSize: theme.typography.fontSize.md,
        color: theme.colors.textSecondary,
        textAlign: "center",
        marginBottom: 20,
    },
    stepIndicatorContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 10,
    },
    stepIndicator: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: theme.colors.backgroundVariant,
        marginHorizontal: 4,
    },
    activeStepIndicator: {
        width: 24,
        backgroundColor: theme.colors.primary,
    },
    scrollContent: {
        padding: 20,
        paddingTop: 40,
    },
    stepContainer: {
        flex: 1,
        marginBottom: 20,
    },
    inputContainer: {
        marginBottom: 16,
    },
    input: {
        borderWidth: 1,
        borderColor: theme.colors.inputBorder,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.sm,
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
    photoHelperText: {
        fontSize: theme.typography.fontSize.sm,
        color: theme.colors.textSecondary,
        marginBottom: 16,
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
    photoContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
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
    navigationButtonsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 16,
    },
    navigationButton: {
        flex: 1,
        marginHorizontal: 4,
        marginTop: 20,
    },
    swipeContainer: {
        flex: 1,
        width: '100%',
    },
});

export default PetProfileSetupScreen;
