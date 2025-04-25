import React, { useState, useRef, useMemo, useCallback, memo, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    Image,
    Dimensions,
    FlatList,
    ScrollView,
    Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import DetailBadge from "./DetailBadge";
import { DISPLAY_VALUES } from "../../constants/petConstants";
import LocationService from "../../services/LocationService";

// Using icon.png as a placeholder image
const PLACEHOLDER_IMAGE = "https://blocks.astratic.com/img/general-img-landscape.png"

const PetCard = memo(({ pet, onCardPress, animationStyle }) => {
    const [activeImageIndex, setActiveImageIndex] = useState(0);
    const [imagesLoaded, setImagesLoaded] = useState({});
    const [locality, setLocality] = useState(null);
    const [isLoadingLocality, setIsLoadingLocality] = useState(false);
    const flatListRef = useRef(null);

    // Fetch locality name when pet changes
    useEffect(() => {
        // Only proceed if pet has location data (owner.location.coordinates)
        if (pet && pet.ownerLocation && pet.ownerLocation.coordinates) {
            const fetchLocality = async () => {
                setIsLoadingLocality(true);
                try {
                    // Extract coordinates from pet
                    const [longitude, latitude] = pet.ownerLocation.coordinates;
                    
                    // Get locality name from coordinates
                    const localityName = await LocationService.getLocalityFromCoordinates(
                        latitude, 
                        longitude
                    );
                    setLocality(localityName);
                } catch (error) {
                    console.error("Error fetching locality:", error);
                    setLocality("Unknown area");
                } finally {
                    setIsLoadingLocality(false);
                }
            };
            
            fetchLocality();
        } else {
            setLocality("Unknown area");
        }
    }, [pet]);
    

    const handleImageLoad = useCallback((index) => {
        setImagesLoaded(prev => ({
            ...prev,
            [index]: true
        }));
    }, []);

    const renderImageItem = useCallback(({ item, index }) => (
        <View style={styles.imageWrapper}>
            <Image
                source={PLACEHOLDER_IMAGE}
                style={styles.placeholderImage}
                resizeMode="contain"
            />
            <Image
                source={typeof item === 'string' ? { uri: item } : item}
                style={[
                    styles.image, 
                    imagesLoaded[index] ? { opacity: 1 } : { opacity: 0 }
                ]}
                resizeMode="cover"
                onLoad={() => handleImageLoad(index)}
            />
        </View>
    ), [imagesLoaded, handleImageLoad]);

    const renderPagingDots = useMemo(() => (
        <View style={styles.paginationDots}>
            {(pet.photos?.length ? pet.photos : [PLACEHOLDER_IMAGE]).map((_, index) => (
                <View
                    key={index}
                    style={[
                        styles.paginationDot,
                        index === activeImageIndex && styles.paginationDotActive
                    ]}
                />
            ))}
        </View>
    ), [pet.photos, activeImageIndex]);

    const handleScroll = useCallback((event) => {
        const contentOffset = event.nativeEvent.contentOffset.x;
        const viewSize = event.nativeEvent.layoutMeasurement.width;
        const newIndex = Math.round(contentOffset / viewSize);
        setActiveImageIndex(newIndex);
    }, []);

    // Memoize the pet details section to prevent unnecessary re-renders
    const petDetailsSection = useMemo(() => (
        <>
            <View style={styles.headerSection}>
                <View style={styles.nameContainer}>
                    <Text style={styles.name}>{pet.name}</Text>
                </View>
                <View style={styles.locationContainer}>
                    <Ionicons name="location" size={14} color="#666666" />
                    <Text style={styles.locationText} ellipsizeMode="tail">
                        {isLoadingLocality 
                            ? "Loading location..." 
                            : (locality || "Unknown area") + (pet.distance ? `, ${LocationService.formatDistance(pet.distance)}` : "")}
                    </Text>
                </View>
                <View style={styles.breedAgeContainer}>
                    <Text style={styles.breed}>{pet.breed}</Text>
                    {pet.age && <Text style={styles.age}>, {pet.age}</Text>}
                </View>
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

            {pet.preferredPlaymates && pet.preferredPlaymates.length > 0 && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Preferred Play Mates</Text>
                    <View style={styles.tagsContainer}>
                        {pet.preferredPlaymates.map((playmate, index) => (
                            <View key={index} style={styles.tag}>
                                <Text style={styles.tagText}>{playmate}</Text>
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
        </>
    ), [pet, locality, isLoadingLocality]);

    // Memoize the images carousel to prevent rendering issues
    const imageCarousel = useMemo(() => (
        <View style={styles.imageContainer}>
            <FlatList
                ref={flatListRef}
                data={pet.photos?.length ? pet.photos : [PLACEHOLDER_IMAGE]}
                renderItem={renderImageItem}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                removeClippedSubviews={true}
            />
            {renderPagingDots}
        </View>
    ), [pet.photos, renderImageItem, handleScroll, renderPagingDots]);

    return (
        <Animated.View style={[styles.container, animationStyle]}>
            <ScrollView 
                style={styles.scrollContainer} 
                showsVerticalScrollIndicator={false}
                removeClippedSubviews={true}
            >
                {imageCarousel}
                
                <View style={styles.contentContainer}>
                    {petDetailsSection}
                    <View style={styles.bottomSpacing} />
                </View>
            </ScrollView>
        </Animated.View>
    );
});

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
    imageWrapper: {
        width: SCREEN_WIDTH,
        height: SCREEN_WIDTH,
        position: 'relative',
    },
    placeholderImage: {
        width: SCREEN_WIDTH,
        height: SCREEN_WIDTH,
        position: 'absolute',
        backgroundColor: '#f0f0f0',
    },
    image: {
        width: SCREEN_WIDTH,
        height: SCREEN_WIDTH,
        position: 'absolute',
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
        backfaceVisibility: 'hidden',
    },
    headerSection: {
        marginBottom: 20,
        position: 'relative',
    },
    nameContainer: {
        marginBottom: 8,
    },
    name: {
        fontSize: 28,
        fontWeight: '700',
        color: '#333333',
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    locationContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F5F5F5',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        marginBottom: 8,
        alignSelf: 'flex-start', // Make container wrap content width
        maxWidth: '95%', // Allow some space but prevent overflow
    },
    locationText: {
        fontSize: 14,
        color: '#666666',
        marginLeft: 4,
        fontWeight: '500',
        includeFontPadding: false,
        textAlignVertical: 'center',
        flex: 0, // Don't expand to fill container
    },
    breedAgeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    breed: {
        fontSize: 18,
        color: '#666666',
        fontWeight: '500',
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    age: {
        fontSize: 18,
        color: '#666666',
        fontWeight: '500',
        includeFontPadding: false,
        textAlignVertical: 'center',
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
        includeFontPadding: false,
        textAlignVertical: 'center',
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
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    description: {
        fontSize: 16,
        lineHeight: 24,
        color: '#666666',
        includeFontPadding: false, 
    },
    bottomSpacing: {
        height: 100,
    },
});

export default PetCard;
