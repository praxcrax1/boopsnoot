/**
 * Pet constants shared between frontend and backend
 */

// Pet types
const PET_TYPES = {
    DOG: "dog",
    CAT: "cat",
};

// Gender options
const GENDER_OPTIONS = {
    MALE: "male",
    FEMALE: "female",
};

// Size options
const SIZE_OPTIONS = {
    SMALL: "small",
    MEDIUM: "medium",
    LARGE: "large",
    XLARGE: "xlarge",
};

// Activity levels
const ACTIVITY_LEVELS = {
    LOW: "low",
    MODERATE: "moderate",
    HIGH: "high",
};

// Vaccination status
const VACCINATION_STATUS = {
    YES: "yes",
    NO: "no",
};

// Common temperaments
const TEMPERAMENTS = ["Friendly", "Shy", "Energetic", "Calm", "Playful"];

// Common preferred playmates for dogs
const DOG_PLAYMATE_PREFERENCES = [
    "Small Dogs",
    "Medium Dogs",
    "Large Dogs",
    "All Dogs",
];

// Common preferred playmates for cats
const CAT_PLAYMATE_PREFERENCES = ["Kittens", "Adult Cats", "All Cats"];

module.exports = {
    PET_TYPES,
    GENDER_OPTIONS,
    SIZE_OPTIONS,
    ACTIVITY_LEVELS,
    VACCINATION_STATUS,
    TEMPERAMENTS,
    DOG_PLAYMATE_PREFERENCES,
    CAT_PLAYMATE_PREFERENCES,
};
