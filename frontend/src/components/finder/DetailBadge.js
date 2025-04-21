import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const DetailBadge = ({ label, value, icon }) => (
    <View style={styles.detailBadge}>
        <Text style={styles.detailLabel}>{label}</Text>
        <View style={styles.valueContainer}>
            {icon && (
                <Ionicons
                    name={icon}
                    size={16}
                    color="#666666"
                    style={styles.icon}
                />
            )}
            <Text style={styles.detailValue}>{value}</Text>
        </View>
    </View>
);

const styles = StyleSheet.create({
    detailBadge: {
        flex: 1,
        backgroundColor: "#F8F9FA",
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#EEEEEE",
    },
    detailLabel: {
        fontSize: 12,
        color: "#666666",
        marginBottom: 4,
        fontWeight: "500",
    },
    valueContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    icon: {
        marginRight: 4,
    },
    detailValue: {
        fontSize: 14,
        fontWeight: "600",
        color: "#333333",
    },
});

export default DetailBadge;
