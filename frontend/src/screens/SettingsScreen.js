import React, { useContext } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    ScrollView,
    StatusBar,
    Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { AuthContext } from "../contexts/AuthContext";
import Button from "../components/Button";
import theme, { withOpacity } from "../styles/theme";

const SettingsScreen = ({ navigation }) => {
    const { user, logout } = useContext(AuthContext);

    const handleLogout = () => {
        Alert.alert("Logout", "Are you sure you want to logout?", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Logout",
                onPress: () => {
                    logout();
                },
            },
        ]);
    };

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
                    <TouchableOpacity 
                        style={styles.backButton}
                        onPress={() => navigation.goBack()}
                    >
                        <Ionicons 
                            name="arrow-back" 
                            size={24} 
                            color={theme.colors.textPrimary} 
                        />
                    </TouchableOpacity>
                    <Text style={styles.headerText}>Settings</Text>
                    <View style={{ width: 24 }} />
                </View>
            </LinearGradient>

            <ScrollView 
                style={styles.content}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.settingsSection}>
                    <Text style={styles.sectionTitle}>Account Settings</Text>
                    
                    <TouchableOpacity
                        style={styles.settingItem}
                        onPress={() =>
                            Alert.alert(
                                "Account",
                                "Account settings would be implemented here."
                            )
                        }>
                        <View style={styles.settingIconContainer}>
                            <Ionicons
                                name="person-outline"
                                size={20}
                                color={theme.colors.primary}
                            />
                        </View>
                        <Text style={styles.settingText}>Account</Text>
                        <Ionicons
                            name="chevron-forward"
                            size={20}
                            color={theme.colors.textTertiary}
                            style={styles.settingChevron}
                        />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.settingItem}
                        onPress={() =>
                            Alert.alert(
                                "Notifications",
                                "Notifications settings would be implemented here."
                            )
                        }>
                        <View style={styles.settingIconContainer}>
                            <Ionicons
                                name="notifications-outline"
                                size={20}
                                color={theme.colors.secondary}
                            />
                        </View>
                        <Text style={styles.settingText}>Notifications</Text>
                        <Ionicons
                            name="chevron-forward"
                            size={20}
                            color={theme.colors.textTertiary}
                            style={styles.settingChevron}
                        />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.settingItem}
                        onPress={() =>
                            Alert.alert(
                                "Privacy",
                                "Privacy settings would be implemented here."
                            )
                        }>
                        <View style={styles.settingIconContainer}>
                            <Ionicons
                                name="shield-outline"
                                size={20}
                                color={theme.colors.info}
                            />
                        </View>
                        <Text style={styles.settingText}>Privacy</Text>
                        <Ionicons
                            name="chevron-forward"
                            size={20}
                            color={theme.colors.textTertiary}
                            style={styles.settingChevron}
                        />
                    </TouchableOpacity>
                </View>

                <View style={styles.settingsSection}>
                    <Text style={styles.sectionTitle}>Support</Text>

                    <TouchableOpacity
                        style={styles.settingItem}
                        onPress={() =>
                            Alert.alert(
                                "Help & Support",
                                "Help center would be implemented here."
                            )
                        }>
                        <View style={styles.settingIconContainer}>
                            <Ionicons
                                name="help-circle-outline"
                                size={20}
                                color={theme.colors.success}
                            />
                        </View>
                        <Text style={styles.settingText}>Help & Support</Text>
                        <Ionicons
                            name="chevron-forward"
                            size={20}
                            color={theme.colors.textTertiary}
                            style={styles.settingChevron}
                        />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.settingItem}
                        onPress={() =>
                            Alert.alert(
                                "About",
                                "About page would be implemented here."
                            )
                        }>
                        <View style={styles.settingIconContainer}>
                            <Ionicons
                                name="information-circle-outline"
                                size={20}
                                color={theme.colors.warning}
                            />
                        </View>
                        <Text style={styles.settingText}>About</Text>
                        <Ionicons
                            name="chevron-forward"
                            size={20}
                            color={theme.colors.textTertiary}
                            style={styles.settingChevron}
                        />
                    </TouchableOpacity>
                </View>

                <View style={styles.logoutSection}>
                    <Button
                        title="Logout"
                        onPress={handleLogout}
                        type="danger"
                        icon="log-out-outline"
                    />
                </View>

                <View style={styles.versionContainer}>
                    <Text style={styles.versionText}>BooopSnoot v1.0.0</Text>
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
    backButton: {
        padding: theme.spacing.sm,
        borderRadius: theme.borderRadius.circle,
        backgroundColor: withOpacity(theme.colors.surface, 0.8),
        ...theme.shadows.small,
    },
    content: {
        flex: 1,
        paddingTop: 30,
    },
    settingsSection: {
        backgroundColor: theme.colors.surface,
        marginHorizontal: theme.spacing.lg,
        marginVertical: theme.spacing.md,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.lg,
        ...theme.shadows.small,
    },
    sectionTitle: {
        fontSize: theme.typography.fontSize.lg,
        fontWeight: theme.typography.fontWeight.semiBold,
        color: theme.colors.textPrimary,
        marginBottom: theme.spacing.md,
        paddingBottom: theme.spacing.xs,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.divider,
    },
    settingItem: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: withOpacity(theme.colors.divider, 0.5),
    },
    settingIconContainer: {
        width: 36,
        height: 36,
        justifyContent: "center",
        alignItems: "center",
        borderRadius: theme.borderRadius.circle,
        backgroundColor: withOpacity(theme.colors.backgroundVariant, 0.8),
        ...theme.shadows.small,
    },
    settingText: {
        marginLeft: theme.spacing.md,
        flex: 1,
        fontSize: theme.typography.fontSize.md,
        fontWeight: theme.typography.fontWeight.medium,
        color: theme.colors.textPrimary,
    },
    settingChevron: {
        marginLeft: theme.spacing.auto,
    },
    logoutSection: {
        paddingHorizontal: theme.spacing.xl,
        marginTop: theme.spacing.lg,
        marginBottom: theme.spacing.md,
    },
    versionContainer: {
        alignItems: "center",
        paddingVertical: theme.spacing.xl,
    },
    versionText: {
        fontSize: theme.typography.fontSize.sm,
        color: theme.colors.textTertiary,
    },
});

export default SettingsScreen;
