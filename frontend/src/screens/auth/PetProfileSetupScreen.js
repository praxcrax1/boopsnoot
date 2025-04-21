import React, { useState, useContext, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    Alert,
    ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
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

const PetProfileSetupScreen = ({ navigation }) => {
    const { user } = useContext(AuthContext);
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
    
    // Local image URIs and cloud URLs mapping
    const [localImages, setLocalImages] = useState([]);
    const [cloudinaryUrls, setCloudinaryUrls] = useState([]);

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

            // Navigate to Home tab
            navigation.reset({
                index: 0,
                routes: [{ name: "MainTabs" }],
            });
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

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.headerContainer}>
                    <Text style={styles.headerText}>Set Up Pet Profile</Text>
                    <Text style={styles.subHeaderText}>
                        Let's create a profile for your pet to help find
                        playmates!
                    </Text>
                </View>

                <View style={styles.formContainer}>
                    <InputField
                        label="Pet Name"
                        required
                        placeholder="e.g., Buddy"
                        value={petData.name}
                        onChangeText={(value) =>
                            handleInputChange("name", value)
                        }
                        error={errors.name}
                        touched={touched.name}
                        onBlur={() => handleBlur("name")}
                    />

                    <InputField
                        label="Breed"
                        required
                        placeholder="e.g., Golden Retriever"
                        value={petData.breed}
                        onChangeText={(value) =>
                            handleInputChange("breed", value)
                        }
                        error={errors.breed}
                        touched={touched.breed}
                        onBlur={() => handleBlur("breed")}
                    />

                    <CustomDropdown
                        label="Type"
                        options={petTypeOptions}
                        selectedValue={petData.type}
                        onValueChange={(value) =>
                            handleInputChange("type", value)
                        }
                    />

                    <InputField
                        label="Age"
                        required
                        isNumeric={true}
                        placeholder="e.g., 2 years"
                        value={petData.age}
                        onChangeText={(value) =>
                            handleInputChange("age", value)
                        }
                        keyboardType="default"
                        error={errors.age}
                        touched={touched.age}
                        onBlur={() => handleBlur("age")}
                    />

                    <CustomDropdown
                        label="Gender"
                        options={genderOptions}
                        selectedValue={petData.gender}
                        onValueChange={(value) =>
                            handleInputChange("gender", value)
                        }
                    />

                    <CustomDropdown
                        label="Size"
                        options={sizeOptions}
                        selectedValue={petData.size}
                        onValueChange={(value) =>
                            handleInputChange("size", value)
                        }
                    />

                    <Text style={styles.label}>
                        Temperament (Select all that apply)
                    </Text>
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

                    <Text style={styles.label}>
                        Preferred Playmates (Select all that apply)
                    </Text>
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

                    <InputField
                        label="Description"
                        placeholder="Tell us a bit about your pet..."
                        value={petData.description}
                        onChangeText={(value) =>
                            handleInputChange("description", value)
                        }
                        multiline
                        numberOfLines={4}
                        textAlignVertical="top"
                        style={styles.textArea}
                    />

                    <View>
                        <Text style={styles.label}>
                            Pet Photos{" "}
                            <Text style={styles.requiredMark}>*</Text>
                        </Text>
                        <TouchableOpacity
                            style={styles.photoUploadButton}
                            onPress={pickImage}
                            disabled={imageUploading}>
                            {imageUploading ? (
                                <ActivityIndicator size="small" color="#666" />
                            ) : (
                                <>
                                    <Ionicons
                                        name="add-circle-outline"
                                        size={20}
                                        color="#666"
                                    />
                                    <Text style={styles.photoUploadButtonText}>
                                        Add Photo
                                    </Text>
                                </>
                            )}
                        </TouchableOpacity>

                        {touched.photos && errors.photos && (
                            <Text style={styles.photoError}>
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
                                            <Text
                                                style={
                                                    styles.removePhotoButtonText
                                                }>
                                                ×
                                            </Text>
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

                    <Button
                        title={
                            isSubmitting
                                ? "Creating Profile..."
                                : "Create Pet Profile"
                        }
                        onPress={handleSubmit}
                        disabled={isSubmitting || imageUploading}
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
        backgroundColor: "#FFFFFF",
    },
    scrollContent: {
        padding: 20,
    },
    headerContainer: {
        alignItems: "center",
        marginBottom: 30,
    },
    headerText: {
        fontSize: 26,
        fontWeight: "bold",
        color: "#333",
        marginBottom: 10,
    },
    subHeaderText: {
        fontSize: 16,
        color: "#666",
        textAlign: "center",
    },
    formContainer: {
        marginBottom: 20,
    },
    label: {
        fontSize: 16,
        fontWeight: "500",
        color: "#333",
        marginBottom: 8,
    },
    textArea: {
        height: 100,
        textAlignVertical: "top",
    },
    optionsContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
        marginBottom: 20,
    },
    optionItem: {
        borderWidth: 1,
        borderColor: "#DDD",
        borderRadius: 20,
        paddingVertical: 8,
        paddingHorizontal: 15,
        margin: 5,
    },
    selectedOption: {
        backgroundColor: "#FF6B6B",
        borderColor: "#FF6B6B",
    },
    optionText: {
        color: "#333",
    },
    selectedOptionText: {
        color: "#FFF",
    },
    photoUploadButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#F0F0F0",
        padding: 15,
        borderRadius: 8,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: "#DDD",
        borderStyle: "dashed",
    },
    photoUploadButtonText: {
        color: "#666",
        fontSize: 16,
        marginLeft: 8,
    },
    photoContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
        marginBottom: 20,
    },
    photoItem: {
        position: "relative",
        margin: 5,
    },
    photo: {
        width: 100,
        height: 100,
        borderRadius: 8,
    },
    removePhotoButton: {
        position: "absolute",
        top: -5,
        right: -5,
        backgroundColor: "rgba(0, 0, 0, 0.7)",
        width: 22,
        height: 22,
        borderRadius: 11,
        alignItems: "center",
        justifyContent: "center",
    },
    removePhotoButtonText: {
        color: "#FFF",
        fontSize: 18,
        fontWeight: "bold",
    },
    uploadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    skipButton: {
        marginTop: 10,
    },
    skipButtonText: {
        fontWeight: "500",
    },
    requiredMark: {
        color: "#FF6B6B",
    },
    photoError: {
        color: "#FF3B30",
        fontSize: 12,
        marginTop: -10,
        marginBottom: 10,
        marginLeft: 5,
    },
});

export default PetProfileSetupScreen;
