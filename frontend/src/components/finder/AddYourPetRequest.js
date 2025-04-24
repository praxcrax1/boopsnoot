import React from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import theme from "../../styles/theme";

const AddYourPetRequest = () => {
    const navigation = useNavigation();

    const navigateToPetSetup = () => {
        navigation.navigate("PetProfileSetup");
    };

    return (
        <View style={styles.container}>
            <Ionicons 
                name="paw" 
                size={70} 
                color={theme.colors.primary} 
                style={styles.icon} 
            />
            
            <Text style={styles.title}>Add Your Pet First</Text>
            
            <Text style={styles.description}>
                Before you can find playmates, you need to create a profile for your pet.
                Add your pet's details to start finding matches!
            </Text>
            
            <TouchableOpacity 
                style={styles.button}
                onPress={navigateToPetSetup}
            >
                <Text style={styles.buttonText}>Create Pet Profile</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: theme.spacing.xxl,
        backgroundColor: theme.colors.backgroundVariant,
    },
    icon: {
        marginBottom: theme.spacing.xxl,
    },
    title: {
        fontSize: theme.typography.fontSize.xxl,
        fontWeight: theme.typography.fontWeight.bold,
        marginBottom: theme.spacing.md,
        color: theme.colors.textPrimary,
        textAlign: "center",
    },
    description: {
        fontSize: theme.typography.fontSize.md,
        textAlign: "center",
        marginBottom: theme.spacing.xxl,
        color: theme.colors.textSecondary,
        lineHeight: theme.typography.lineHeight.normal * theme.typography.fontSize.md,
        maxWidth: "80%",
    },
    button: {
        backgroundColor: theme.colors.primary,
        paddingVertical: theme.spacing.md,
        paddingHorizontal: theme.spacing.xxl,
        borderRadius: theme.borderRadius.md,
        ...theme.shadows.medium,
    },
    buttonText: {
        color: theme.colors.onPrimary,
        fontSize: theme.typography.fontSize.md,
        fontWeight: theme.typography.fontWeight.semiBold,
    },
});

export default AddYourPetRequest;