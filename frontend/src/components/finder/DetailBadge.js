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
                    color="#FFFFFF"
                    style={styles.icon}
                />
            )}
            <Text style={styles.detailValue}>{value}</Text>
        </View>
    </View>
);

const styles = StyleSheet.create({
    detailBadge: {
        backgroundColor: "rgba(255, 255, 255, 0.15)",
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 14,
        marginRight: 5,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.2)",
        flex: 1,
    },
    detailLabel: {
        fontSize: 12,
        color: "rgba(255, 255, 255, 0.7)",
        marginBottom: 2,
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
        fontWeight: "700",
        color: "#FFFFFF",
    },
});

export default DetailBadge;
