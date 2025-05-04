import React, { useState, useEffect, useContext } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    Alert,
    StatusBar,
    Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { AuthContext } from "../contexts/AuthContext";
import PetService from "../services/PetService";
import Button from "../components/Button";
import theme, { withOpacity } from "../styles/theme";

const ProfileScreen = ({ navigation }) => {
    const { user } = useContext(AuthContext);
    const [pets, setPets] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUserPets = async () => {
            if (!user) return;

            try {
                const response = await PetService.getUserPets(user.id);
                setPets(response.pets || []);
            } catch (error) {
                console.error("Error fetching user pets:", error);
                Alert.alert(
                    "Error",
                    "Failed to load your pets. Please try again."
                );
            } finally {
                setLoading(false);
            }
        };

        fetchUserPets();
    }, [user]);

    const handleAddPet = () => {
        navigation.navigate("PetProfileSetup");
    };

    const navigateToSettings = () => {
        navigation.navigate("Settings");
    };

    if (!user) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>
                    Please login to view your profile
                </Text>
                <Button
                    title="Login"
                    onPress={() => navigation.navigate("Login")}
                />
            </View>
        );
    }

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={["left", "right"]}>
            <StatusBar
                barStyle="dark-content"
                backgroundColor="transparent"
                translucent={true}
            />
            
            <LinearGradient
                colors={[theme.colors.primaryLight, theme.colors.background]}
                style={styles.gradientHeader}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
            >
                <View style={styles.headerContainer}>
                    <Text style={styles.headerText}>Profile</Text>
                    <TouchableOpacity 
                        style={styles.settingsButton}
                        onPress={navigateToSettings}
                    >
                        <Ionicons
                            name="settings-outline"
                            size={24}
                            color={theme.colors.textPrimary}
                        />
                    </TouchableOpacity>
                </View>
            </LinearGradient>

            <ScrollView 
                style={styles.content}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.userInfoSection}>
                    <View style={styles.userInfoHeader}>
                        <View style={styles.avatarPlaceholder}>
                            <Text style={styles.avatarText}>
                                {user.name
                                    ? user.name.charAt(0).toUpperCase()
                                    : "U"}
                            </Text>
                        </View>
                        <View style={styles.userDetails}>
                            <Text style={styles.userName}>{user.name}</Text>
                            <Text style={styles.userEmail}>{user.email}</Text>
                        </View>
                    </View>
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
                                onPress={() =>
                                    navigation.navigate("PetProfile", {
                                        petId: pet._id,
                                    })
                                }>
                                <Image
                                    source={
                                        pet.photos && pet.photos.length > 0
                                            ? { uri: pet.photos[0] }
                                            : require("../assets/default-pet.png")
                                    }
                                    style={styles.petImage}
                                />
                                <View style={styles.petInfo}>
                                    <Text style={styles.petName}>
                                        {pet.name}
                                    </Text>
                                    <Text style={styles.petBreed}>
                                        {pet.breed}
                                    </Text>
                                    <Text style={styles.petDetails}>
                                        {pet.age} • {pet.gender} • {pet.size}
                                    </Text>
                                </View>
                                <Ionicons
                                    name="chevron-forward"
                                    size={24}
                                    color={theme.colors.divider}
                                />
                            </TouchableOpacity>
                        ))
                    ) : (
                        <View style={styles.noPetsContainer}>
                            <Ionicons 
                                name="paw" 
                                size={64} 
                                color={withOpacity(theme.colors.primary, 0.3)} 
                            />
                            <Text style={styles.noPetsText}>
                                You haven't added any pets yet
                            </Text>
                            <Button
                                title="Add Your First Pet"
                                onPress={handleAddPet}
                                icon="add-circle"
                            />
                        </View>
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: theme.colors.background,
    },
    errorContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: theme.spacing.xl,
    },
    errorText: {
        fontSize: theme.typography.fontSize.lg,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.xl,
        textAlign: "center",
    },
    gradientHeader: {
        paddingTop: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight + 20,
        paddingBottom: 40,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        marginBottom: -20,
        zIndex: 10,
        paddingHorizontal: theme.spacing.xl,
    },
    headerContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: Platform.OS === 'ios' ? 15 : 5,
    },
    headerText: {
        fontSize: theme.typography.fontSize.xxl,
        fontWeight: theme.typography.fontWeight.bold,
        color: theme.colors.textPrimary,
    },
    settingsButton: {
        padding: theme.spacing.sm,
        borderRadius: theme.borderRadius.circle,
        backgroundColor: withOpacity(theme.colors.surface, 0.8),
        ...theme.shadows.small,
    },
    content: {
        flex: 1,
        paddingTop: 30,
    },
    userInfoSection: {
        paddingHorizontal: theme.spacing.xl,
        paddingVertical: theme.spacing.xl,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.divider,
    },
    userInfoHeader: {
        flexDirection: "row",
        alignItems: "center",
    },
    avatarPlaceholder: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: theme.colors.primary,
        justifyContent: "center",
        alignItems: "center",
        ...theme.shadows.medium,
    },
    avatarText: {
        fontSize: 30,
        fontWeight: theme.typography.fontWeight.bold,
        color: theme.colors.onPrimary,
    },
    userDetails: {
        marginLeft: theme.spacing.lg,
        flex: 1,
    },
    userName: {
        fontSize: theme.typography.fontSize.xl,
        fontWeight: theme.typography.fontWeight.bold,
        color: theme.colors.textPrimary,
    },
    userEmail: {
        fontSize: theme.typography.fontSize.md,
        color: theme.colors.textSecondary,
        marginTop: 4,
    },
    petSection: {
        padding: theme.spacing.xl,
    },
    sectionHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: theme.spacing.lg,
    },
    sectionTitle: {
        fontSize: theme.typography.fontSize.xl,
        fontWeight: theme.typography.fontWeight.semiBold,
        color: theme.colors.textPrimary,
    },
    addPetButton: {
        height: 36,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: 0,
        borderRadius: theme.borderRadius.lg,
    },
    addPetButtonText: {
        fontSize: theme.typography.fontSize.sm,
        fontWeight: theme.typography.fontWeight.medium,
    },
    petCard: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.lg,
        marginBottom: theme.spacing.md,
    },
    petImage: {
        width: 60,
        height: 60,
        borderRadius: 30,
        borderWidth: 2,
        borderColor: withOpacity(theme.colors.primary, 0.2),
    },
    petInfo: {
        flex: 1,
        marginLeft: theme.spacing.lg,
    },
    petName: {
        fontSize: theme.typography.fontSize.lg,
        fontWeight: theme.typography.fontWeight.bold,
        color: theme.colors.textPrimary,
        marginBottom: 2,
    },
    petBreed: {
        fontSize: theme.typography.fontSize.md,
        color: theme.colors.textSecondary,
        marginBottom: 2,
    },
    petDetails: {
        fontSize: theme.typography.fontSize.sm,
        color: theme.colors.textTertiary,
    },
    noPetsContainer: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: theme.spacing.xxxl,
        backgroundColor: theme.colors.backgroundVariant,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.xl,
    },
    noPetsText: {
        fontSize: theme.typography.fontSize.lg,
        color: theme.colors.textSecondary,
        marginVertical: theme.spacing.lg,
        textAlign: "center",
    },
});

export default ProfileScreen;