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
import { SafeAreaView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getBottomSpace, getStatusBarHeight } from 'react-native-iphone-x-helper';
import { AuthContext } from "../contexts/AuthContext";
import Button from "../components/Button";
import GradientHeader from "../components/GradientHeader";
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
        <View style={styles.rootContainer}>
            <GradientHeader
                title="Settings"
                centerTitle={true}
                leftComponent={
                    <TouchableOpacity 
                        style={styles.backButton}
                        onPress={() => navigation.goBack()}
                    >
                        <Ionicons
                            name="chevron-back"
                            size={24}
                            color={theme.colors.textPrimary}
                        />
                    </TouchableOpacity>
                }
            />
            
            <SafeAreaView style={styles.safeAreaContainer}>
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
        </View>
    );
};

const styles = StyleSheet.create({
    rootContainer: {
        flex: 1,
        backgroundColor: theme.colors.primaryLight,
    },
    safeAreaContainer: {
        flex: 1,
        backgroundColor: theme.colors.background,
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
