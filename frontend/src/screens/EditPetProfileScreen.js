import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    Alert,
    Modal,
    FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "react-native-image-picker";
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

const EditPetProfileScreen = ({ route, navigation }) => {
    const { petId } = route.params;
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
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

    // Validation state
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

    // Get appropriate playmates based on pet type
    const getPlaymatePreferences = () => {
        return petData.type === PET_TYPES.DOG 
            ? DOG_PLAYMATE_PREFERENCES 
            : CAT_PLAYMATE_PREFERENCES;
    };

    // Validate fields when pet data changes
    useEffect(() => {
        if (!loading) {
            validateField("name", petData.name);
            validateField("breed", petData.breed);
            validateField("age", petData.age);
            validateField("photos", petData.photos);
        }
    }, [petData, loading]);

    useEffect(() => {
        const fetchPetData = async () => {
            try {
                const response = await PetService.getPetById(petId);
                if (response && response.pet) {
                    // Ensure preferredPlaymates is an array for compatibility
                    const petWithNormalizedData = {
                        ...response.pet,
                        preferredPlaymates: Array.isArray(
                            response.pet.preferredPlaymates
                        )
                            ? response.pet.preferredPlaymates
                            : [],
                    };
                    setPetData(petWithNormalizedData);
                }
            } catch (error) {
                console.error("Error fetching pet data:", error);
                Alert.alert(
                    "Error",
                    "Failed to load pet information. Please try again."
                );
            } finally {
                setLoading(false);
            }
        };

        fetchPetData();

        // Set navigation header
        navigation.setOptions({
            title: "Edit Pet Profile",
            headerLeft: () => (
                <TouchableOpacity
                    style={styles.headerButton}
                    onPress={() => navigation.goBack()}>
                    <Ionicons name="close" size={24} color="#333" />
                </TouchableOpacity>
            ),
            headerRight: () => (
                <TouchableOpacity
                    style={styles.headerButton}
                    onPress={handleSubmit}
                    disabled={submitting}>
                    <Text
                        style={[
                            styles.saveButtonText,
                            submitting && styles.disabledButtonText,
                        ]}>
                        {submitting ? "Saving..." : "Save"}
                    </Text>
                </TouchableOpacity>
            ),
        });
    }, [petId, navigation, submitting]);

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
        const array = petData[field];
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
        const options = {
            mediaType: "photo",
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
            Alert.alert("Error", "Failed to pick image");
        }
    };

    const removeImage = (index) => {
        const newPhotos = [...petData.photos];
        newPhotos.splice(index, 1);
        setPetData({ ...petData, photos: newPhotos });
        setTouched({ ...touched, photos: true });
    };

    const handleDeletePet = () => {
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
                            // Navigate to Home tab with refresh parameter
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
        const photosError = validateField("photos", petData.photos);

        return !nameError && !breedError && !ageError && !photosError;
    };

    const handleSubmit = async () => {
        // Validate the form
        if (!validateForm()) {
            // If validation fails, show a message and scroll to the first error
            Alert.alert(
                "Validation Error",
                "Please correct the errors in the form."
            );
            return;
        }

        setSubmitting(true);
        try {
            await PetService.updatePet(petId, petData);
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
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#FF6B6B" />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
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

                    <CustomDropdown
                        label="Vaccinated"
                        options={vaccinatedOptions}
                        selectedValue={petData.vaccinated}
                        onValueChange={(value) =>
                            handleInputChange("vaccinated", value)
                        }
                    />

                    <CustomDropdown
                        label="Activity Level"
                        options={activityOptions}
                        selectedValue={petData.activityLevel}
                        onValueChange={(value) =>
                            handleInputChange("activityLevel", value)
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
                                    petData.preferredPlaymates?.includes(
                                        item
                                    ) && styles.selectedOption,
                                ]}
                                onPress={() =>
                                    toggleArrayItem("preferredPlaymates", item)
                                }>
                                <Text
                                    style={[
                                        styles.optionText,
                                        petData.preferredPlaymates?.includes(
                                            item
                                        ) && styles.selectedOptionText,
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

                    <View style={styles.photosSection}>
                        <Text style={styles.label}>
                            Pet Photos{" "}
                            <Text style={styles.requiredMark}>*</Text>
                        </Text>
                        <TouchableOpacity
                            style={styles.photoUploadButton}
                            onPress={pickImage}>
                            <Ionicons
                                name="add-circle-outline"
                                size={20}
                                color="#666"
                            />
                            <Text style={styles.photoUploadButtonText}>
                                Add Photo
                            </Text>
                        </TouchableOpacity>

                        {touched.photos && errors.photos && (
                            <Text style={styles.photoError}>
                                {errors.photos}
                            </Text>
                        )}

                        <View style={styles.photoContainer}>
                            {petData.photos?.map((photo, index) => (
                                <View key={index} style={styles.photoItem}>
                                    <Image
                                        source={{ uri: photo }}
                                        style={styles.photo}
                                    />
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
                                </View>
                            ))}
                        </View>
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
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#FFFFFF",
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    headerButton: {
        marginHorizontal: 15,
    },
    saveButtonText: {
        color: "#FF6B6B",
        fontWeight: "bold",
        fontSize: 16,
    },
    disabledButtonText: {
        opacity: 0.6,
    },
    scrollContent: {
        padding: 20,
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
    requiredMark: {
        color: "#FF6B6B",
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
    photosSection: {
        marginBottom: 20,
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
    deleteButton: {
        marginTop: 10,
    },
    photoError: {
        color: "#FF3B30",
        fontSize: 12,
        marginTop: -10,
        marginBottom: 10,
        marginLeft: 5,
    },
});

export default EditPetProfileScreen;
