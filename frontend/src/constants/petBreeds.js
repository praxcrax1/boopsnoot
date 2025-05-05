/**
 * Popular dog and cat breeds in India with corresponding values for backend usage
 */

export const DOG_BREEDS = [
  { label: "Labrador Retriever", value: "labrador_retriever" },
  { label: "German Shepherd", value: "german_shepherd" },
  { label: "Golden Retriever", value: "golden_retriever" },
  { label: "Beagle", value: "beagle" },
  { label: "Pug", value: "pug" },
  { label: "Rottweiler", value: "rottweiler" },
  { label: "Boxer", value: "boxer" },
  { label: "Doberman Pinscher", value: "doberman_pinscher" },
  { label: "Shih Tzu", value: "shih_tzu" },
  { label: "Dachshund", value: "dachshund" },
  { label: "Great Dane", value: "great_dane" },
  { label: "Dalmatian", value: "dalmatian" },
  { label: "Pomeranian", value: "pomeranian" },
  { label: "Siberian Husky", value: "siberian_husky" },
  { label: "Cocker Spaniel", value: "cocker_spaniel" },
  { label: "Bulldog", value: "bulldog" },
  { label: "Saint Bernard", value: "saint_bernard" },
  { label: "Chihuahua", value: "chihuahua" },
  { label: "English Mastiff", value: "english_mastiff" },
  { label: "Border Collie", value: "border_collie" },
  { label: "Lhasa Apso", value: "lhasa_apso" },
  { label: "Poodle", value: "poodle" },
  { label: "Bull Terrier", value: "bull_terrier" },
  { label: "Akita", value: "akita" },
  { label: "Chow Chow", value: "chow_chow" },
  { label: "Pembroke Welsh Corgi", value: "pembroke_welsh_corgi" },
  { label: "Rajapalayam", value: "rajapalayam" },
  { label: "Mudhol Hound", value: "mudhol_hound" },
  { label: "Indian Spitz", value: "indian_spitz" },
  { label: "Chippiparai", value: "chippiparai" },
  { label: "Kombai", value: "kombai" },
  { label: "Kanni", value: "kanni" },
  { label: "Pariah", value: "pariah" },
  { label: "Indian Mastiff", value: "indian_mastiff" },
  { label: "Bully Kutta", value: "bully_kutta" },
  { label: "Gaddi Kutta", value: "gaddi_kutta" },
  { label: "Himalayan Sheepdog", value: "himalayan_sheepdog" },
  { label: "Rampur Greyhound", value: "rampur_greyhound" },
  { label: "Tangkhul Hui", value: "tangkhul_hui" },
  { label: "Mixed Breed Dog", value: "mixed_breed_dog" }
];

export const CAT_BREEDS = [
  { label: "Persian", value: "persian" },
  { label: "Maine Coon", value: "maine_coon" },
  { label: "Siamese", value: "siamese" },
  { label: "Bengal", value: "bengal" },
  { label: "Ragdoll", value: "ragdoll" },
  { label: "British Shorthair", value: "british_shorthair" },
  { label: "Abyssinian", value: "abyssinian" },
  { label: "Sphynx", value: "sphynx" },
  { label: "Russian Blue", value: "russian_blue" },
  { label: "Norwegian Forest Cat", value: "norwegian_forest_cat" },
  { label: "Scottish Fold", value: "scottish_fold" },
  { label: "Bombay", value: "bombay" },
  { label: "Himalayan", value: "himalayan" },
  { label: "American Shorthair", value: "american_shorthair" },
  { label: "Munchkin", value: "munchkin" },
  { label: "Egyptian Mau", value: "egyptian_mau" },
  { label: "Exotic Shorthair", value: "exotic_shorthair" },
  { label: "Birman", value: "birman" },
  { label: "Burmese", value: "burmese" },
  { label: "Tonkinese", value: "tonkinese" },
  { label: "Devon Rex", value: "devon_rex" },
  { label: "Cornish Rex", value: "cornish_rex" },
  { label: "Oriental Shorthair", value: "oriental_shorthair" },
  { label: "Manx", value: "manx" },
  { label: "Turkish Angora", value: "turkish_angora" },
  { label: "Somali", value: "somali" },
  { label: "Japanese Bobtail", value: "japanese_bobtail" },
  { label: "Siberian", value: "siberian" },
  { label: "American Curl", value: "american_curl" },
  { label: "Balinese", value: "balinese" },
  { label: "Singapura", value: "singapura" },
  { label: "Nebelung", value: "nebelung" },
  { label: "Indian Domestic Cat", value: "indian_domestic_cat" },
  { label: "Mixed Breed Cat", value: "mixed_breed_cat" }
];

// Export a function to get a breed's value from its label
export const getBreedValueByLabel = (label) => {
  // First check dog breeds
  let breed = DOG_BREEDS.find(breed => breed.label.toLowerCase() === label.toLowerCase());
  if (breed) return breed.value;
  
  // Then check cat breeds
  breed = CAT_BREEDS.find(breed => breed.label.toLowerCase() === label.toLowerCase());
  if (breed) return breed.value;
  
  // If not found, convert the label to a slug
  return label.toLowerCase().replace(/\s+/g, '_');
};

// Export a function to get a breed's label from its value
export const getBreedLabelByValue = (value) => {
  // First check dog breeds
  let breed = DOG_BREEDS.find(breed => breed.value === value);
  if (breed) return breed.label;
  
  // Then check cat breeds
  breed = CAT_BREEDS.find(breed => breed.value === value);
  if (breed) return breed.label;
  
  // If not found, convert the slug to a readable name
  return value.split('_').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
};

// Export combined breeds for general use cases
export const ALL_PET_BREEDS = [...DOG_BREEDS, ...CAT_BREEDS];

export default { DOG_BREEDS, CAT_BREEDS, ALL_PET_BREEDS };
