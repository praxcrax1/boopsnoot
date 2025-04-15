import React, { useContext } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { AuthContext } from "../contexts/AuthContext";
import Button from "../components/Button";

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
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color="#FF6B6B" />
                </TouchableOpacity>
                <Text style={styles.title}>Settings</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView style={styles.content}>
                <View style={styles.settingsSection}>
                    <Text style={styles.sectionTitle}>Account Settings</Text>
                    <TouchableOpacity
                        style={styles.settingItem}
                        onPress={() =>
                            Alert.alert(
                                "Info",
                                "Account settings would be implemented here."
                            )
                        }>
                        <Ionicons
                            name="person-outline"
                            size={24}
                            color="#666"
                        />
                        <Text style={styles.settingText}>Account</Text>
                        <Ionicons
                            name="chevron-forward"
                            size={20}
                            color="#DDD"
                            style={styles.settingChevron}
                        />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.settingItem}
                        onPress={() =>
                            Alert.alert(
                                "Info",
                                "Notifications settings would be implemented here."
                            )
                        }>
                        <Ionicons
                            name="notifications-outline"
                            size={24}
                            color="#666"
                        />
                        <Text style={styles.settingText}>Notifications</Text>
                        <Ionicons
                            name="chevron-forward"
                            size={20}
                            color="#DDD"
                            style={styles.settingChevron}
                        />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.settingItem}
                        onPress={() =>
                            Alert.alert(
                                "Info",
                                "Privacy settings would be implemented here."
                            )
                        }>
                        <Ionicons
                            name="shield-outline"
                            size={24}
                            color="#666"
                        />
                        <Text style={styles.settingText}>Privacy</Text>
                        <Ionicons
                            name="chevron-forward"
                            size={20}
                            color="#DDD"
                            style={styles.settingChevron}
                        />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.settingItem}
                        onPress={() =>
                            Alert.alert(
                                "Info",
                                "Help center would be implemented here."
                            )
                        }>
                        <Ionicons
                            name="help-circle-outline"
                            size={24}
                            color="#666"
                        />
                        <Text style={styles.settingText}>Help & Support</Text>
                        <Ionicons
                            name="chevron-forward"
                            size={20}
                            color="#DDD"
                            style={styles.settingChevron}
                        />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.settingItem}
                        onPress={() =>
                            Alert.alert(
                                "Info",
                                "About page would be implemented here."
                            )
                        }>
                        <Ionicons
                            name="information-circle-outline"
                            size={24}
                            color="#666"
                        />
                        <Text style={styles.settingText}>About</Text>
                        <Ionicons
                            name="chevron-forward"
                            size={20}
                            color="#DDD"
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
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#FFF",
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: "#F0F0F0",
    },
    title: {
        fontSize: 20,
        fontWeight: "bold",
        color: "#333",
    },
    content: {
        flex: 1,
    },
    settingsSection: {
        padding: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#333",
        marginBottom: 15,
    },
    settingItem: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: "#F0F0F0",
    },
    settingText: {
        marginLeft: 15,
        flex: 1,
        fontSize: 16,
        color: "#333",
    },
    settingChevron: {
        marginLeft: "auto",
    },
    logoutSection: {
        padding: 20,
        marginTop: 10,
    },
});

export default SettingsScreen;
