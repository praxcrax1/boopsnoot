const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Pet = require("../models/Pet");
const Match = require("../models/Match");
const Chat = require("../models/Chat");
const User = require("../models/User"); // Added User model for location-based filtering
const { protect } = require("../middleware/auth");

// @route   GET /api/matches/potential/:petId
// @desc    Get potential matches for a pet
// @access  Private
router.get("/potential/:petId", protect, async (req, res) => {
    try {
        const { petId } = req.params;
        const { limit = 10, skip = 0, maxDistance = 100 } = req.query; // Default 100km radius
        const limitNum = Number(limit);
        const skipNum = Number(skip);
        const maxDistanceNum = Number(maxDistance);

        // Verify the pet exists and belongs to the user
        const pet = await Pet.findOne({
            _id: petId,
            owner: req.user.id,
        });

        if (!pet) {
            return res.status(404).json({
                success: false,
                message: "Pet not found or does not belong to you",
            });
        }

        // Find matches that this pet has already interacted with
        const matches = await Match.find({
            $or: [{ pet1: pet._id }, { pet2: pet._id }],
        });

        // These are pet IDs we should exclude completely from results
        const excludedPetIds = [];

        // These are pet IDs that have liked this pet but haven't been acted upon yet
        const likedByPetIds = [];

        // These are pet IDs that this pet has already liked but haven't liked back yet
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
                (isPet1 &&
                    match.pet2LikedPet1 === true &&
                    match.pet1LikedPet2 === null) ||
                (!isPet1 &&
                    match.pet1LikedPet2 === true &&
                    match.pet2LikedPet1 === null)
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
        const hasValidLocation =
            petOwner &&
            petOwner.location &&
            petOwner.location.coordinates &&
            petOwner.location.coordinates.length === 2 &&
            (petOwner.location.coordinates[0] !== 0 ||
                petOwner.location.coordinates[1] !== 0);

        // STEP 1: First priority - fetch pets who have already liked this pet
        if (likedByPetIds.length > 0) {
            let likedByQuery = {
                _id: { $in: likedByPetIds },
                type: pet.type,
            };

            // Add location filter if user has location
            if (hasValidLocation && likedByPetIds.length > 0) {
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

                    const nearbyOwnerIds = nearbyOwners.map((user) =>
                        user._id.toString()
                    );

                    // Filter to pets whose owners are nearby
                    const nearbyLikedPetIds = petsWhoLikedMeData
                        .filter((pet) =>
                            nearbyOwnerIds.includes(pet.owner.toString())
                        )
                        .map((pet) => pet._id);

                    // Finally get the full pet details
                    if (nearbyLikedPetIds.length > 0) {
                        petsWhoLikedMe = await Pet.find({
                            _id: { $in: nearbyLikedPetIds },
                        }).lean();

                        // Add distance information to each pet
                        petsWhoLikedMe = await Promise.all(
                            petsWhoLikedMe.map(async (pet) => {
                                const petOwnerInfo = await User.findById(
                                    pet.owner
                                );
                                if (
                                    petOwnerInfo &&
                                    petOwnerInfo.location &&
                                    petOwnerInfo.location.coordinates
                                ) {
                                    // Calculate rough distance between points
                                    const [long1, lat1] =
                                        petOwner.location.coordinates;
                                    const [long2, lat2] =
                                        petOwnerInfo.location.coordinates;

                                    // Simple distance calculation (this is an approximation)
                                    const R = 6371; // Radius of earth in km
                                    const dLat =
                                        ((lat2 - lat1) * Math.PI) / 180;
                                    const dLon =
                                        ((long2 - long1) * Math.PI) / 180;
                                    const a =
                                        Math.sin(dLat / 2) *
                                            Math.sin(dLat / 2) +
                                        Math.cos((lat1 * Math.PI) / 180) *
                                            Math.cos((lat2 * Math.PI) / 180) *
                                            Math.sin(dLon / 2) *
                                            Math.sin(dLon / 2);
                                    const c =
                                        2 *
                                        Math.atan2(
                                            Math.sqrt(a),
                                            Math.sqrt(1 - a)
                                        );
                                    const distance = R * c; // Distance in km

                                    return {
                                        ...pet,
                                        distance: distance,
                                    };
                                }
                                return {
                                    ...pet,
                                    distance: 0.1, // Default distance if can't calculate
                                };
                            })
                        );
                    }
                } catch (error) {
                    console.error(
                        "Error finding nearby pets who liked me:",
                        error
                    );
                    // Fallback to non-location query
                    petsWhoLikedMe = await Pet.find(likedByQuery);
                }
            } else {
                // No location filtering if user doesn't have location
                petsWhoLikedMe = await Pet.find(likedByQuery);
            }
        }

        // Define the base query for potential matches
        let matchQuery = {
            type: pet.type,
            owner: { $ne: req.user.id },
            _id: { $nin: allExcludedIds },
        };

        // STEP 2: Second priority - fetch pets that haven't interacted yet
        // Calculate how many additional pets we need
        const needMorePets = limitNum - petsWhoLikedMe.length;

        if (needMorePets > 0) {
            if (hasValidLocation) {
                // Modified approach: First get users within range, then find their pets
                // This makes the query more straightforward and avoids $geoNear complexities
                try {
                    // 1. First find nearby users
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

                    // 2. Get the user IDs
                    const nearbyUserIds = nearbyUsers.map((user) => user._id);

                    // 3. Find pets belonging to those users
                    if (nearbyUserIds.length > 0) {
                        newPets = await Pet.find({
                            type: pet.type,
                            owner: { $in: nearbyUserIds },
                            _id: { $nin: allExcludedIds },
                        })
                            .sort({ createdAt: -1 })
                            .limit(needMorePets)
                            .skip(skipNum)
                            .lean(); // Use lean() for better performance

                        // Add distance information to each pet
                        // For now we'll just set a default close distance since we've filtered by proximity
                        newPets = await Promise.all(
                            newPets.map(async (pet) => {
                                const petOwnerInfo = await User.findById(
                                    pet.owner
                                );
                                if (
                                    petOwnerInfo &&
                                    petOwnerInfo.location &&
                                    petOwnerInfo.location.coordinates
                                ) {
                                    // Calculate rough distance between points
                                    const [long1, lat1] =
                                        petOwner.location.coordinates;
                                    const [long2, lat2] =
                                        petOwnerInfo.location.coordinates;

                                    // Simple distance calculation (this is an approximation)
                                    const R = 6371; // Radius of earth in km
                                    const dLat =
                                        ((lat2 - lat1) * Math.PI) / 180;
                                    const dLon =
                                        ((long2 - long1) * Math.PI) / 180;
                                    const a =
                                        Math.sin(dLat / 2) *
                                            Math.sin(dLat / 2) +
                                        Math.cos((lat1 * Math.PI) / 180) *
                                            Math.cos((lat2 * Math.PI) / 180) *
                                            Math.sin(dLon / 2) *
                                            Math.sin(dLon / 2);
                                    const c =
                                        2 *
                                        Math.atan2(
                                            Math.sqrt(a),
                                            Math.sqrt(1 - a)
                                        );
                                    const distance = R * c; // Distance in km

                                    return {
                                        ...pet,
                                        distance: distance,
                                    };
                                }
                                return {
                                    ...pet,
                                    distance: 0.1, // Default distance if can't calculate
                                };
                            })
                        );
                    }
                } catch (error) {
                    console.error("Error finding nearby pets:", error);
                    // Fallback to non-location query if there's an error
                    newPets = await Pet.find(matchQuery)
                        .sort({ createdAt: -1 })
                        .limit(needMorePets)
                        .skip(skipNum);
                }
            } else {
                // No location filtering if user doesn't have location
                newPets = await Pet.find(matchQuery)
                    .sort({ createdAt: -1 })
                    .limit(needMorePets)
                    .skip(skipNum);
            }
        }

        // Combine the results with priority to pets who liked this pet
        potentialMatches = [...petsWhoLikedMe, ...newPets];

        // Ensure no duplicates (though this shouldn't be necessary given our queries)
        potentialMatches = potentialMatches.filter(
            (pet, index, self) =>
                index ===
                self.findIndex((p) => p._id.toString() === pet._id.toString())
        );

        res.json({
            success: true,
            count: potentialMatches.length,
            pets: potentialMatches,
        });
    } catch (error) {
        console.error("Get potential matches error:", error);
        res.status(500).json({
            success: false,
            message: "Server error",
            error:
                process.env.NODE_ENV === "development"
                    ? error.message
                    : undefined,
        });
    }
});

// @route   POST /api/matches/like
// @desc    Like or dislike another pet
// @access  Private
router.post("/like", protect, async (req, res) => {
    try {
        const { petId, likedPetId, isLiked } = req.body;

        // Verify the pet exists and belongs to the user
        const pet = await Pet.findOne({
            _id: petId,
            owner: req.user.id,
        });

        if (!pet) {
            return res.status(404).json({
                success: false,
                message: "Pet not found or does not belong to you",
            });
        }

        // Check if the liked pet exists
        const likedPet = await Pet.findById(likedPetId);
        if (!likedPet) {
            return res.status(404).json({
                success: false,
                message: "Liked pet not found",
            });
        }

        // Find or create a match record
        // We always store with pet1 having the lower ObjectId to avoid duplicates
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
            const pet1Owner = await Pet.findById(petWithLowerId)
                .select("owner")
                .populate("owner", "id");
            const pet2Owner = await Pet.findById(petWithHigherId)
                .select("owner")
                .populate("owner", "id");

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
        res.status(500).json({
            success: false,
            message: "Server error",
            error:
                process.env.NODE_ENV === "development"
                    ? error.message
                    : undefined,
        });
    }
});

// @route   GET /api/matches/:petId
// @desc    Get all matches for a pet
// @access  Private
router.get("/:petId", protect, async (req, res) => {
    try {
        const { petId } = req.params;

        // Verify the pet exists and belongs to the user
        const pet = await Pet.findOne({
            _id: petId,
            owner: req.user.id,
        });

        if (!pet) {
            return res.status(404).json({
                success: false,
                message: "Pet not found or does not belong to you",
            });
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
        res.status(500).json({
            success: false,
            message: "Server error",
            error:
                process.env.NODE_ENV === "development"
                    ? error.message
                    : undefined,
        });
    }
});

module.exports = router;
