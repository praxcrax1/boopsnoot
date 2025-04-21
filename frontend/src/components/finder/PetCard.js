import React, { useState, useRef } from "react";
import {
    View,
    Text,
    StyleSheet,
    Image,
    Dimensions,
    FlatList,
    ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import DetailBadge from "./DetailBadge";
import { DISPLAY_VALUES } from "../../constants/petConstants";

// Local placeholder images (replace these paths with your actual placeholder image assets)
const PLACEHOLDER_IMAGES = [
    require('../../assets/default-pet.png'),
    require('../../assets/default-pet.png'),
    require('../../assets/default-pet.png'),
    require('../../assets/default-pet.png'),
];

const PetCard = ({ pet, onCardPress }) => {
    const [activeImageIndex, setActiveImageIndex] = useState(0);
    const flatListRef = useRef(null);

    const formatDistance = (distance) => {
        if (!distance && distance !== 0) return "Nearby";
        if (typeof distance === "number") {
            if (distance < 1) return `${(distance * 1000).toFixed(0)}m`;
            if (distance < 10) return `${distance.toFixed(1)}km`;
            return `${Math.round(distance)}km`;
        }
        return "Nearby";
    };

    const renderImageItem = ({ item }) => (
        <Image
            source={typeof item === 'string' ? { uri: item } : item}
            style={styles.image}
            resizeMode="cover"
        />
    );

    const renderPagingDots = () => (
        <View style={styles.paginationDots}>
            {(pet.photos?.length ? pet.photos : PLACEHOLDER_IMAGES).map((_, index) => (
                <View
                    key={index}
                    style={[
                        styles.paginationDot,
                        index === activeImageIndex && styles.paginationDotActive
                    ]}
                />
            ))}
        </View>
    );

    const handleScroll = (event) => {
        const contentOffset = event.nativeEvent.contentOffset.x;
        const viewSize = event.nativeEvent.layoutMeasurement.width;
        const newIndex = Math.round(contentOffset / viewSize);
        setActiveImageIndex(newIndex);
    };

    return (
        <View style={styles.container}>
            <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
                <View style={styles.imageContainer}>
                    <FlatList
                        ref={flatListRef}
                        data={pet.photos?.length ? pet.photos : PLACEHOLDER_IMAGES}
                        renderItem={renderImageItem}
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        onScroll={handleScroll}
                        scrollEventThrottle={16}
                    />
                    {renderPagingDots()}
                </View>

                <View style={styles.contentContainer}>
                    <View style={styles.headerSection}>
                        <View style={styles.nameContainer}>
                            <Text style={styles.name}>{pet.name}</Text>
                            <View style={styles.distanceBadge}>
                                <Ionicons name="location" size={14} color="#666666" />
                                <Text style={styles.distance}>{formatDistance(pet.distance)}</Text>
                            </View>
                        </View>
                        <Text style={styles.breed}>{pet.breed}</Text>
                    </View>

                    <View style={styles.detailsRow}>
                        <DetailBadge 
                            label="Gender" 
                            value={DISPLAY_VALUES.GENDER[pet.gender]}
                            icon={pet.gender === 'male' ? 'male' : 'female'} 
                        />
                        <DetailBadge 
                            label="Size" 
                            value={DISPLAY_VALUES.SIZE[pet.size]} 
                        />
                        <DetailBadge 
                            label="Activity" 
                            value={DISPLAY_VALUES.ACTIVITY[pet.activityLevel]} 
                        />
                    </View>

                    {pet.temperament && pet.temperament.length > 0 && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Temperament</Text>
                            <View style={styles.tagsContainer}>
                                {pet.temperament.map((tag, index) => (
                                    <View key={index} style={styles.tag}>
                                        <Text style={styles.tagText}>{tag}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    )}

                    {pet.description && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>About</Text>
                            <Text style={styles.description}>{pet.description}</Text>
                        </View>
                    )}

                    <View style={styles.bottomSpacing} />
                </View>
            </ScrollView>
        </View>
    );
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    scrollContainer: {
        flex: 1,
    },
    imageContainer: {
        height: SCREEN_WIDTH,
        backgroundColor: '#f0f0f0',
    },
    image: {
        width: SCREEN_WIDTH,
        height: SCREEN_WIDTH,
    },
    paginationDots: {
        flexDirection: 'row',
        position: 'absolute',
        bottom: 16,
        alignSelf: 'center',
    },
    paginationDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: 'rgba(255, 255, 255, 0.5)',
        marginHorizontal: 4,
    },
    paginationDotActive: {
        backgroundColor: '#FFFFFF',
    },
    contentContainer: {
        padding: 20,
    },
    headerSection: {
        marginBottom: 20,
    },
    nameContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    name: {
        fontSize: 28,
        fontWeight: '700',
        color: '#333333',
    },
    distanceBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F5F5F5',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    distance: {
        fontSize: 14,
        color: '#666666',
        marginLeft: 4,
        fontWeight: '500',
    },
    breed: {
        fontSize: 18,
        color: '#666666',
        fontWeight: '500',
    },
    detailsRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 24,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333333',
        marginBottom: 12,
    },
    tagsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    tag: {
        backgroundColor: '#F5F5F5',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
    },
    tagText: {
        fontSize: 14,
        color: '#666666',
        fontWeight: '500',
    },
    description: {
        fontSize: 16,
        lineHeight: 24,
        color: '#666666',
    },
    bottomSpacing: {
        height: 100, // Space for floating action buttons
    },
});

export default PetCard;
