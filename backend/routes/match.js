const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Pet = require("../models/Pet");
const Match = require("../models/Match");
const Chat = require("../models/Chat");
const User = require("../models/User");
const { protect } = require("../middleware/auth");

// Helper functions
const errorResponse = (res, status, message, error) => {
    return res.status(status).json({
        success: false,
        message,
        error: process.env.NODE_ENV === "development" ? error?.message : undefined,
    });
};

const validateUserPet = async (petId, userId) => {
    const pet = await Pet.findOne({
        _id: petId,
        owner: userId,
    });
    return pet;
};

const calculateDistance = (coords1, coords2) => {
    if (!coords1 || !coords2) return 0.1;
    
    const [long1, lat1] = coords1;
    const [long2, lat2] = coords2;
    
    // Simple distance calculation (approximation)
    const R = 6371; // Radius of earth in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((long2 - long1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
    return R * c; // Distance in km
};

const addDistanceInfo = async (pets, ownerCoordinates) => {
    return Promise.all(
        pets.map(async (pet) => {
            const petOwnerInfo = await User.findById(pet.owner);
            if (petOwnerInfo?.location?.coordinates) {
                const distance = calculateDistance(
                    ownerCoordinates,
                    petOwnerInfo.location.coordinates
                );
                return { ...pet, distance };
            }
            return { ...pet, distance: 0.1 };
        })
    );
};

const isValidLocation = (location) => {
    return (
        location &&
        location.coordinates &&
        location.coordinates.length === 2 &&
        (location.coordinates[0] !== 0 || location.coordinates[1] !== 0)
    );
};

// @route   GET /api/matches/potential/:petId
// @desc    Get potential matches for a pet
// @access  Private
router.get("/potential/:petId", protect, async (req, res) => {
    try {
        const { petId } = req.params;
        const { limit = 10, skip = 0, maxDistance = 100 } = req.query;
        const limitNum = Number(limit);
        const skipNum = Number(skip);
        const maxDistanceNum = Number(maxDistance);

        // Verify the pet exists and belongs to the user
        const pet = await validateUserPet(petId, req.user.id);
        if (!pet) {
            return errorResponse(res, 404, "Pet not found or does not belong to you");
        }

        // Find matches that this pet has already interacted with
        const matches = await Match.find({
            $or: [{ pet1: pet._id }, { pet2: pet._id }],
        });

        // Create pet ID lists for filtering
        const excludedPetIds = [];
        const likedByPetIds = [];
        const alreadyLikedPetIds = [];

        matches.forEach((match) => {
            const isPet1 = match.pet1.toString() === pet._id.toString();
            const otherPetId = isPet1 ? match.pet2 : match.pet1;

            // If it's already a match or the current pet rejected the other pet, exclude it
            if (
                match.isMatch ||
                (isPet1 && match.pet1LikedPet2 === false) ||
                (!isPet1 && match.pet2LikedPet1 === false)
            ) {
                excludedPetIds.push(otherPetId);
            }
            // If the other pet likes this pet but this pet hasn't acted yet, prioritize showing it
            else if (
                (isPet1 && match.pet2LikedPet1 === true && match.pet1LikedPet2 === null) ||
                (!isPet1 && match.pet1LikedPet2 === true && match.pet2LikedPet1 === null)
            ) {
                likedByPetIds.push(otherPetId);
            }
            // If this pet likes the other pet but hasn't been liked back yet, don't show again
            else if (
                (isPet1 && match.pet1LikedPet2 === true) ||
                (!isPet1 && match.pet2LikedPet1 === true)
            ) {
                alreadyLikedPetIds.push(otherPetId);
            }
        });

        // Don't show the pet to itself
        excludedPetIds.push(pet._id);

        // Combine exclusion lists for the query
        const allExcludedIds = [...excludedPetIds, ...alreadyLikedPetIds];

        let potentialMatches = [];
        let petsWhoLikedMe = [];
        let newPets = [];

        // Get the user's location
        const petOwner = await User.findById(req.user.id);
        const hasValidLocation = isValidLocation(petOwner?.location);

        // STEP 1: First priority - fetch pets who have already liked this pet
        if (likedByPetIds.length > 0) {
            if (hasValidLocation) {
                try {
                    // First find the owners of these pets
                    const petsWhoLikedMeData = await Pet.find({
                        _id: { $in: likedByPetIds },
                        type: pet.type,
                    }).select("owner _id");

                    const ownerIds = petsWhoLikedMeData.map((p) => p.owner);

                    // Find nearby owners from this set
                    const nearbyOwners = await User.find({
                        _id: { $in: ownerIds },
                        location: {
                            $near: {
                                $geometry: {
                                    type: "Point",
                                    coordinates: petOwner.location.coordinates,
                                },
                                $maxDistance: maxDistanceNum * 1000, // Convert km to meters
                            },
                        },
                    }).select("_id");

                    const nearbyOwnerIds = nearbyOwners.map((user) => user._id.toString());

                    // Filter to pets whose owners are nearby
                    const nearbyLikedPetIds = petsWhoLikedMeData
                        .filter((pet) => nearbyOwnerIds.includes(pet.owner.toString()))
                        .map((pet) => pet._id);

                    // Finally get the full pet details
                    if (nearbyLikedPetIds.length > 0) {
                        petsWhoLikedMe = await Pet.find({
                            _id: { $in: nearbyLikedPetIds },
                        }).lean();

                        // Add distance information to each pet
                        petsWhoLikedMe = await addDistanceInfo(
                            petsWhoLikedMe,
                            petOwner.location.coordinates
                        );
                    }
                } catch (error) {
                    console.error("Error finding nearby pets who liked me:", error);
                    // Fallback to non-location query
                    petsWhoLikedMe = await Pet.find({
                        _id: { $in: likedByPetIds },
                        type: pet.type,
                    });
                }
            } else {
                // No location filtering if user doesn't have location
                petsWhoLikedMe = await Pet.find({
                    _id: { $in: likedByPetIds },
                    type: pet.type,
                });
            }
        }

        // STEP 2: Second priority - fetch pets that haven't interacted yet
        // Calculate how many additional pets we need
        const needMorePets = limitNum - petsWhoLikedMe.length;

        if (needMorePets > 0) {
            const baseQuery = {
                type: pet.type,
                owner: { $ne: req.user.id },
                _id: { $nin: allExcludedIds },
            };

            if (hasValidLocation) {
                try {
                    // Find nearby users
                    const nearbyUsers = await User.find({
                        _id: { $ne: req.user.id },
                        location: {
                            $near: {
                                $geometry: {
                                    type: "Point",
                                    coordinates: petOwner.location.coordinates,
                                },
                                $maxDistance: maxDistanceNum * 1000, // Convert km to meters
                            },
                        },
                    }).select("_id");

                    const nearbyUserIds = nearbyUsers.map((user) => user._id);

                    // Find pets belonging to those users
                    if (nearbyUserIds.length > 0) {
                        newPets = await Pet.find({
                            ...baseQuery,
                            owner: { $in: nearbyUserIds },
                        })
                            .sort({ createdAt: -1 })
                            .limit(needMorePets)
                            .skip(skipNum)
                            .lean();

                        // Add distance information to each pet
                        newPets = await addDistanceInfo(
                            newPets,
                            petOwner.location.coordinates
                        );
                    }
                } catch (error) {
                    console.error("Error finding nearby pets:", error);
                    // Fallback to non-location query
                    newPets = await Pet.find(baseQuery)
                        .sort({ createdAt: -1 })
                        .limit(needMorePets)
                        .skip(skipNum);
                }
            } else {
                // No location filtering if user doesn't have location
                newPets = await Pet.find(baseQuery)
                    .sort({ createdAt: -1 })
                    .limit(needMorePets)
                    .skip(skipNum);
            }
        }

        // Combine results with priority to pets who liked this pet
        potentialMatches = [...petsWhoLikedMe, ...newPets];

        // Ensure no duplicates
        potentialMatches = potentialMatches.filter(
            (pet, index, self) =>
                index === self.findIndex((p) => p._id.toString() === pet._id.toString())
        );

        res.json({
            success: true,
            count: potentialMatches.length,
            pets: potentialMatches,
        });
    } catch (error) {
        console.error("Get potential matches error:", error);
        return errorResponse(res, 500, "Server error", error);
    }
});

// @route   POST /api/matches/like
// @desc    Like or dislike another pet
// @access  Private
router.post("/like", protect, async (req, res) => {
    try {
        const { petId, likedPetId, isLiked } = req.body;

        // Verify the pet exists and belongs to the user
        const pet = await validateUserPet(petId, req.user.id);
        if (!pet) {
            return errorResponse(res, 404, "Pet not found or does not belong to you");
        }

        // Check if the liked pet exists
        const likedPet = await Pet.findById(likedPetId);
        if (!likedPet) {
            return errorResponse(res, 404, "Liked pet not found");
        }

        // Find or create a match record - always store with pet1 having the lower ObjectId
        const [petWithLowerId, petWithHigherId] =
            petId.toString() < likedPetId.toString()
                ? [petId, likedPetId]
                : [likedPetId, petId];

        // Is the current pet pet1 or pet2?
        const isPet1 = petId.toString() === petWithLowerId.toString();

        let match = await Match.findOne({
            pet1: petWithLowerId,
            pet2: petWithHigherId,
        });

        if (match) {
            // Update existing match
            if (isPet1) {
                match.pet1LikedPet2 = isLiked;
            } else {
                match.pet2LikedPet1 = isLiked;
            }
        } else {
            // Create new match
            match = new Match({
                pet1: petWithLowerId,
                pet2: petWithHigherId,
                pet1LikedPet2: isPet1 ? isLiked : null,
                pet2LikedPet1: isPet1 ? null : isLiked,
            });
        }

        // Save the match and check if it's a mutual like
        const previousIsMatch = match.isMatch;
        const savedMatch = await match.save();
        savedMatch.checkMatch();

        // If it's a new match (it wasn't a match before, but now it is)
        if (!previousIsMatch && savedMatch.isMatch) {
            // Create a chat for the matched pets
            const [pet1Owner, pet2Owner] = await Promise.all([
                Pet.findById(petWithLowerId).select("owner").populate("owner", "id"),
                Pet.findById(petWithHigherId).select("owner").populate("owner", "id")
            ]);

            await Chat.create({
                match: savedMatch._id,
                participants: [pet1Owner.owner._id, pet2Owner.owner._id],
            });

            // Mark the match date and save again if this is a new match
            savedMatch.matchDate = new Date();
            await savedMatch.save();
        }

        res.json({
            success: true,
            match: savedMatch,
            isMatch: savedMatch.isMatch,
        });
    } catch (error) {
        console.error("Like pet error:", error);
        return errorResponse(res, 500, "Server error", error);
    }
});

// @route   GET /api/matches/:petId
// @desc    Get all matches for a pet
// @access  Private
router.get("/:petId", protect, async (req, res) => {
    try {
        const { petId } = req.params;

        // Verify the pet exists and belongs to the user
        const pet = await validateUserPet(petId, req.user.id);
        if (!pet) {
            return errorResponse(res, 404, "Pet not found or does not belong to you");
        }

        // Find matches
        const matches = await Match.find({
            $or: [{ pet1: pet._id }, { pet2: pet._id }],
            isMatch: true,
        })
            .populate("pet1", "name breed photos")
            .populate("pet2", "name breed photos")
            .sort({ matchDate: -1 });

        res.json({
            success: true,
            count: matches.length,
            matches: matches.map((match) => {
                const matchedPet =
                    match.pet1._id.toString() === pet._id.toString()
                        ? match.pet2
                        : match.pet1;

                return {
                    matchId: match._id,
                    matchDate: match.matchDate,
                    pet: matchedPet,
                };
            }),
        });
    } catch (error) {
        console.error("Get matches error:", error);
        return errorResponse(res, 500, "Server error", error);
    }
});

module.exports = router;
