// Validation utility functions

export const validateRequired = (value) => {
  return value && value.trim() !== '' ? null : 'This field is required';
};

export const validateEmail = (value) => {
  if (!value) return 'Email is required';
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(value) ? null : 'Please enter a valid email address';
};

export const validatePassword = (value) => {
  if (!value) return 'Password is required';
  if (value.length < 6) return 'Password must be at least 6 characters';
  return null;
};

export const validatePasswordMatch = (password, confirmPassword) => {
  if (!confirmPassword) return 'Please confirm your password';
  return password === confirmPassword ? null : 'Passwords do not match';
};

export const validateAge = (value) => {
  if (!value) return 'Age is required';
  return null;
};

export const validateName = (value) => {
  if (!value) return 'Name is required';
  if (value.length < 2) return 'Name must be at least 2 characters';
  return null;
};

export const validateBreed = (value) => {
  if (!value) return 'Breed is required';
  return null;
};

export const validatePhotos = (photos) => {
  if (!photos || photos.length === 0) {
    return 'Please add at least one photo';
  }
  return null;
};