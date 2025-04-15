import React from "react";
import { View, Text, StyleSheet } from "react-native";

const DetailBadge = ({ label, value }) => (
    <View style={styles.detailBadge}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
    </View>
);

const styles = StyleSheet.create({
    detailBadge: {
        backgroundColor: "rgba(255, 255, 255, 0.15)",
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 14,
        marginRight: 10,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.2)",
    },
    detailLabel: {
        fontSize: 12,
        color: "rgba(255, 255, 255, 0.7)",
        marginBottom: 2,
        fontWeight: "500",
    },
    detailValue: {
        fontSize: 14,
        fontWeight: "700",
        color: "#FFFFFF",
    },
});

export default DetailBadge;
