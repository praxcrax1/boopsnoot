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

// Display values for consistent UI rendering
export const DISPLAY_VALUES = {
  GENDER: {
    male: 'Male',
    female: 'Female'
  },
  SIZE: {
    small: 'Small',
    medium: 'Medium',
    large: 'Large',
    xlarge: 'Extra Large'
  },
  ACTIVITY: {
    low: 'Low',
    moderate: 'Moderate',
    high: 'High'
  }
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
  { label: DISPLAY_VALUES.GENDER[GENDER_OPTIONS.MALE], value: GENDER_OPTIONS.MALE },
  { label: DISPLAY_VALUES.GENDER[GENDER_OPTIONS.FEMALE], value: GENDER_OPTIONS.FEMALE },
];

export const sizeOptions = [
  { label: DISPLAY_VALUES.SIZE[SIZE_OPTIONS.SMALL], value: SIZE_OPTIONS.SMALL },
  { label: DISPLAY_VALUES.SIZE[SIZE_OPTIONS.MEDIUM], value: SIZE_OPTIONS.MEDIUM },
  { label: DISPLAY_VALUES.SIZE[SIZE_OPTIONS.LARGE], value: SIZE_OPTIONS.LARGE },
  { label: DISPLAY_VALUES.SIZE[SIZE_OPTIONS.XLARGE], value: SIZE_OPTIONS.XLARGE },
];

export const activityOptions = [
  { label: DISPLAY_VALUES.ACTIVITY[ACTIVITY_LEVELS.LOW], value: ACTIVITY_LEVELS.LOW },
  { label: DISPLAY_VALUES.ACTIVITY[ACTIVITY_LEVELS.MODERATE], value: ACTIVITY_LEVELS.MODERATE },
  { label: DISPLAY_VALUES.ACTIVITY[ACTIVITY_LEVELS.HIGH], value: ACTIVITY_LEVELS.HIGH },
];

export const vaccinatedOptions = [
  { label: 'Yes', value: VACCINATION_STATUS.YES },
  { label: 'No', value: VACCINATION_STATUS.NO },
];