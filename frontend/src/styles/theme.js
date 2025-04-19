import { Platform } from 'react-native';
import React from 'react';

/**
 * Theme configuration for BoopSnoot
 * Centralizes UI styles for consistency and easier theme switching
 */

// Base colors
const palette = {
  // Primary brand colors
  primary: {
    main: '#FF6B6B',
    light: '#FF9B9B',
    dark: '#E95252',
    contrast: '#FFFFFF',
  },
  
  // Secondary colors for accents and CTAs
  secondary: {
    main: '#4CAF50',
    light: '#80C883',
    dark: '#388E3C',
    contrast: '#FFFFFF',
  },
  
  // Neutral colors for backgrounds, text, borders
  neutral: {
    white: '#FFFFFF',
    background: '#F8F9FA',
    lightGrey: '#F0F0F0',
    mediumGrey: '#DDDDDD',
    grey: '#999999',
    darkGrey: '#666666',
    black: '#333333',
    textPrimary: '#333333',
    textSecondary: '#666666',
    divider: '#EEEEEE',
    disabled: '#CCCCCC',
  },
  
  // States and feedback colors
  status: {
    error: '#FF3B30',
    success: '#4CAF50',
    warning: '#FFCC00',
    info: '#59ADFF',
  },
};

// Typography configuration
const typography = {
  fontFamily: {
    base: undefined, // System default
    heading: undefined, // System default
  },
  fontSize: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 28,
    display: 36,
  },
  fontWeight: {
    regular: '400',
    medium: '500',
    semiBold: '600',
    bold: '700',
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    loose: 1.8,
  },
};

// Spacing units (for margins, paddings)
const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  section: 40,
};

// Border radiuses
const borderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  circle: 1000, // Large value for perfect circles
};

// Shadows
const shadows = {
  small: Platform.select({
    ios: {
      shadowColor: palette.neutral.black,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    android: {
      elevation: 2,
    },
  }),
  medium: Platform.select({
    ios: {
      shadowColor: palette.neutral.black,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
    },
    android: {
      elevation: 4,
    },
  }),
  large: Platform.select({
    ios: {
      shadowColor: palette.neutral.black,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.2,
      shadowRadius: 12,
    },
    android: {
      elevation: 8,
    },
  }),
};

// Light theme (default)
const lightTheme = {
  colors: {
    primary: palette.primary.main,
    primaryLight: palette.primary.light,
    primaryDark: palette.primary.dark,
    onPrimary: palette.primary.contrast,
    
    secondary: palette.secondary.main,
    secondaryLight: palette.secondary.light,
    secondaryDark: palette.secondary.dark,
    onSecondary: palette.secondary.contrast,
    
    background: palette.neutral.white,
    backgroundVariant: palette.neutral.background,
    surface: palette.neutral.white,
    divider: palette.neutral.divider,
    
    textPrimary: palette.neutral.textPrimary,
    textSecondary: palette.neutral.textSecondary,
    textDisabled: palette.neutral.grey,
    
    error: palette.status.error,
    success: palette.status.success,
    warning: palette.status.warning,
    info: palette.status.info,
    
    // UI element specific colors
    card: palette.neutral.white,
    input: palette.neutral.white,
    inputBorder: palette.neutral.mediumGrey,
    placeholder: palette.neutral.grey,
    icon: palette.neutral.darkGrey,
    iconActive: palette.primary.main,
    
    // Button colors
    buttonPrimary: palette.primary.main,
    buttonSecondary: 'transparent',
    buttonDisabled: palette.neutral.disabled,
    buttonDanger: palette.status.error,
    
    // Tab/navigation colors
    tabActive: palette.primary.main,
    tabInactive: palette.neutral.grey,
    navigationBackground: palette.neutral.white,
  },
  
  // Re-export these configurations
  typography,
  spacing,
  borderRadius,
  shadows,
};

// Dark theme (for future implementation)
const darkTheme = {
  colors: {
    primary: palette.primary.main,
    primaryLight: palette.primary.light,
    primaryDark: palette.primary.dark,
    onPrimary: palette.primary.contrast,
    
    secondary: palette.secondary.main,
    secondaryLight: palette.secondary.light,
    secondaryDark: palette.secondary.dark,
    onSecondary: palette.secondary.contrast,
    
    background: '#121212', // Dark background
    backgroundVariant: '#1E1E1E', // Slightly lighter dark background
    surface: '#242424', // Card/surface background
    divider: '#2C2C2C', // Dark divider
    
    textPrimary: '#FFFFFF', // White text
    textSecondary: '#BBBBBB', // Light grey text
    textDisabled: '#777777', // Darker grey for disabled
    
    error: palette.status.error,
    success: palette.status.success,
    warning: palette.status.warning, 
    info: palette.status.info,
    
    // UI element specific colors
    card: '#242424',
    input: '#242424',
    inputBorder: '#444444',
    placeholder: '#777777',
    icon: '#BBBBBB',
    iconActive: palette.primary.main,
    
    // Button colors
    buttonPrimary: palette.primary.main,
    buttonSecondary: 'transparent',
    buttonDisabled: '#444444',
    buttonDanger: palette.status.error,
    
    // Tab/navigation colors
    tabActive: palette.primary.main,
    tabInactive: '#777777',
    navigationBackground: '#1A1A1A',
  },
  
  // Re-export these configurations
  typography,
  spacing,
  borderRadius,
  shadows,
};

// Export the default theme
export default lightTheme;

// Also export themes separately for theme-switching functionality
export { lightTheme, darkTheme };

// Export a ThemeProvider context for future implementation
export const ThemeContext = React.createContext({
  theme: lightTheme,
  toggleTheme: () => {},
});

// Helper function to get a value with specific opacity
export const withOpacity = (color, opacity) => {
  // Check if color is in hex format (#RRGGBB)
  if (color.startsWith('#')) {
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }
  
  // Handle rgba or other formats
  return color;
};