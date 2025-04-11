/**
 * Pet constants shared between frontend and backend
 */

// Pet types
export const PET_TYPES = {
  DOG: 'dog',
  CAT: 'cat',
};

// Pet types as array for UI components that need iteration
export const PET_TYPES_ARRAY = ['dog', 'cat'];

// Gender options
export const GENDER_OPTIONS = {
  MALE: 'male',
  FEMALE: 'female',
};

// Size options
export const SIZE_OPTIONS = {
  SMALL: 'small',
  MEDIUM: 'medium',
  LARGE: 'large',
  XLARGE: 'xlarge',
};

// Activity levels
export const ACTIVITY_LEVELS = {
  LOW: 'low',
  MODERATE: 'moderate',
  HIGH: 'high',
};

// Vaccination status
export const VACCINATION_STATUS = {
  YES: 'yes',
  NO: 'no',
};

// Common temperaments
export const TEMPERAMENTS = [
  'Friendly',
  'Shy',
  'Energetic',
  'Calm',
  'Playful',
];

// Common preferred playmates for dogs
export const DOG_PLAYMATE_PREFERENCES = [
  'Small Dogs',
  'Medium Dogs',
  'Large Dogs',
  'All Dogs',
];

// Common preferred playmates for cats
export const CAT_PLAYMATE_PREFERENCES = [
  'Kittens',
  'Adult Cats',
  'All Cats',
];

// Option formatters for UI
export const petTypeOptions = [
  { label: 'Dog', value: PET_TYPES.DOG },
  { label: 'Cat', value: PET_TYPES.CAT },
];

export const genderOptions = [
  { label: 'Male', value: GENDER_OPTIONS.MALE },
  { label: 'Female', value: GENDER_OPTIONS.FEMALE },
];

export const sizeOptions = [
  { label: 'Small', value: SIZE_OPTIONS.SMALL },
  { label: 'Medium', value: SIZE_OPTIONS.MEDIUM },
  { label: 'Large', value: SIZE_OPTIONS.LARGE },
  { label: 'Extra Large', value: SIZE_OPTIONS.XLARGE },
];

export const activityOptions = [
  { label: 'Low', value: ACTIVITY_LEVELS.LOW },
  { label: 'Moderate', value: ACTIVITY_LEVELS.MODERATE },
  { label: 'High', value: ACTIVITY_LEVELS.HIGH },
];

export const vaccinatedOptions = [
  { label: 'Yes', value: VACCINATION_STATUS.YES },
  { label: 'No', value: VACCINATION_STATUS.NO },
];