import React from "react";
import {
    View,
    Text,
    StyleSheet,
    StatusBar,
    Platform,
    TouchableOpacity,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { getStatusBarHeight } from "react-native-iphone-x-helper";
import { Ionicons } from "@expo/vector-icons";
import theme from "../styles/theme";

const GradientHeader = ({
    title,
    subtitle,
    children,
    leftComponent,
    rightComponent,
    centerTitle = false,
    currentStep,
    totalSteps,
    showBackButton,
    onBackPress,
    style,
}) => {
    const renderStepIndicators = () => {
        if (!currentStep || !totalSteps) return null;

        return (
            <View style={styles.stepIndicatorContainer}>
                {Array.from({ length: totalSteps }).map((_, index) => (
                    <View
                        key={index}
                        style={[
                            styles.stepIndicator,
                            currentStep > index && styles.activeStepIndicator,
                        ]}
                    />
                ))}
            </View>
        );
    };

    return (
        <View style={styles.headerWrapper}>
            <StatusBar
                barStyle={
                    Platform.OS === "ios" ? "dark-content" : "light-content"
                }
                backgroundColor="transparent"
                translucent={true}
            />

            {/* iOS Status Bar Background - fills the notch area properly */}
            {Platform.OS === "ios" && (
                <View style={styles.iosStatusBarBackground} />
            )}

            <LinearGradient
                colors={[theme.colors.primaryLight, theme.colors.background]}
                style={[styles.gradientHeader, style]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
            >
                <View style={styles.headerContainer}>
                    {/* Back button (legacy support) */}
                    {showBackButton && !leftComponent && (
                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={onBackPress}
                        >
                            <Ionicons
                                name="chevron-back"
                                size={24}
                                color={theme.colors.textPrimary}
                            />
                        </TouchableOpacity>
                    )}

                    <View
                        style={[
                            styles.headerContentContainer,
                            centerTitle && styles.centerHeaderContentContainer,
                        ]}
                    >
                        {/* When using centerTitle with left/right components, we need a special layout */}
                        {centerTitle ? (
                            <>
                                {/* Left component in absolute position */}
                                {leftComponent && (
                                    <View style={styles.leftComponentWithCenteredTitle}>
                                        {leftComponent}
                                    </View>
                                )}

                                {/* Perfectly centered title container */}
                                <View style={styles.centeredTitleContainer}>
                                    {title && (
                                        <Text style={[styles.headerText, styles.centeredHeaderText]}>
                                            {title}
                                        </Text>
                                    )}
                                    {subtitle && (
                                        <Text style={[styles.subHeaderText, styles.centeredSubHeaderText]}>
                                            {subtitle}
                                        </Text>
                                    )}
                                    {renderStepIndicators()}
                                </View>

                                {/* Right component in absolute position */}
                                {rightComponent && (
                                    <View style={styles.rightComponentWithCenteredTitle}>
                                        {rightComponent}
                                    </View>
                                )}
                            </>
                        ) : (
                            <>
                                {/* Standard layout for non-centered titles */}
                                {leftComponent && (
                                    <View style={styles.leftComponentContainer}>
                                        {leftComponent}
                                    </View>
                                )}

                                <View
                                    style={[
                                        styles.titleContainer,
                                        (showBackButton || leftComponent) &&
                                            styles.titleWithLeftComponent,
                                    ]}
                                >
                                    {title && <Text style={styles.headerText}>{title}</Text>}
                                    {subtitle && <Text style={styles.subHeaderText}>{subtitle}</Text>}
                                    {renderStepIndicators()}
                                </View>

                                {rightComponent && (
                                    <View style={styles.rightComponentContainer}>
                                        {rightComponent}
                                    </View>
                                )}
                            </>
                        )}
                    </View>

                    {children}
                </View>
            </LinearGradient>
        </View>
    );
};

const styles = StyleSheet.create({
    headerWrapper: {
        backgroundColor: theme.colors.primaryLight,
        zIndex: 10,
    },
    iosStatusBarBackground: {
        height: getStatusBarHeight(),
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        backgroundColor: theme.colors.primaryLight,
        zIndex: 5,
    },
    gradientHeader: {
        paddingTop:
            Platform.OS === "ios"
                ? getStatusBarHeight(true) + 20
                : StatusBar.currentHeight + 20,
        paddingBottom: 40,
        marginBottom: -20,
        zIndex: 10,
        paddingHorizontal: theme.spacing.xl,
    },
    headerContainer: {
        flexDirection: "column",
        justifyContent: "center",
        marginTop: Platform.OS === "ios" ? 0 : 5,
    },
    backButton: {
        position: "absolute",
        left: 0,
        top: 8,
        zIndex: 20,
    },
    headerContentContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    centerHeaderContentContainer: {
        justifyContent: "center",
    },
    titleContainer: {
        gap: 10,
        alignItems: "flex-start",
    },
    titleWithLeftComponent: {
        marginLeft: 28,
    },
    centeredTitleContainer: {
        alignItems: "center",
        width: "100%",
    },
    headerText: {
        fontSize: theme.typography.fontSize.xxl,
        fontWeight: theme.typography.fontWeight.bold,
        color: theme.colors.textPrimary,
    },
    centeredHeaderText: {
        textAlign: "center",
    },
    subHeaderText: {
        fontSize: theme.typography.fontSize.lg,
        color: theme.colors.textSecondary,
        marginTop: 2,
        marginBottom: 10,
    },
    centeredSubHeaderText: {
        textAlign: "center",
    },
    stepIndicatorContainer: {
        flexDirection: "row",
        justifyContent: "center",
        marginTop: 10,
    },
    stepIndicator: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: theme.colors.backgroundVariant,
        marginHorizontal: 4,
    },
    activeStepIndicator: {
        width: 24,
        backgroundColor: theme.colors.primary,
    },
    rightComponentContainer: {
        alignItems: "flex-end",
        justifyContent: "center",
    },
    leftComponentContainer: {
        alignItems: "flex-start",
        justifyContent: "center",
    },
    leftComponentWithCenteredTitle: {
        position: "absolute",
        left: 0,
        zIndex: 10,
    },
    rightComponentWithCenteredTitle: {
        position: "absolute",
        right: 0,
        zIndex: 10,
    },
    emptyLeftComponent: {
        width: 40,
    },
    emptyRightComponent: {
        width: 40,
    },
});

export default GradientHeader;
