/**
 * Komunity Platform Theme & Color Tokens
 * Default Brand Palette:
 * - Teal / Cyan Accent: #3fd2c7
 * - Soft Sky Blue:       #99ddff
 * - Deep Navy Blue:      #00458b
 */

export const colors = {
  // Brand Core
  primary: '#00458b',        // Deep Brand Navy
  primaryDark: '#002f5e',    // Darker Navy for shadows/headers
  primaryLight: '#005cb3',   // Medium Navy / Vibrant Blue
  accent: '#3fd2c7',         // Vibrant Mint Teal / Cyan Accent
  accentDark: '#2bb3a8',     // Darker Teal for pressed states
  accentLight: '#99ddff',    // Soft Sky Blue Accent

  // Semantic
  teal: '#3fd2c7',
  sky: '#99ddff',
  navy: '#00458b',

  // Status & Feedback
  success: '#10b981',
  successLight: '#dcfce7',
  warning: '#f59e0b',
  warningLight: '#fef3c7',
  danger: '#ef4444',
  dangerLight: '#fee2e2',
  info: '#99ddff',

  // Neutrals & Surfaces
  white: '#ffffff',
  background: '#f0f9ff',
  cardBackground: '#ffffff',
  surfaceLight: '#f0f9ff',
  surfaceTeal: '#e6faf8',

  // Typography
  textPrimary: '#0f172a',
  textSecondary: '#475569',
  textMuted: '#94a3b8',
  textOnPrimary: '#ffffff',
  textOnAccent: '#002f5e',

  // Borders & Dividers
  border: '#e2e8f0',
  borderFocus: '#3fd2c7',
  borderNavy: '#00458b',
  borderLight: '#f1f5f9',

  // UI Elements
  activeTab: '#00458b',
  inactiveTab: '#94a3b8',
  iconPrimary: '#00458b',
  iconAccent: '#3fd2c7',
  badgeRed: '#ef4444',
  badgeTeal: '#3fd2c7',
};

export const gradients = {
  // Standard full-screen subtle background — lighter gradient of #99ddff and #00458b
  screenBackground: ['#99ddff', '#c2e9ff', '#e2f4ff', '#ffffff'] as const,
  // Ultra-light pastel version — barely-there airy tint
  screenBackgroundLight: ['#bbe4ff', '#e5f5ff', '#ffffff'] as const,
  // Main brand hero & headers
  brand: ['#00458b', '#005cb3', '#3fd2c7'] as const,
  // Deep navy luxury cards & banners
  brandDark: ['#002f5e', '#00458b', '#005cb3'] as const,
  // High-energy teal to sky accent
  accent: ['#3fd2c7', '#99ddff'] as const,
  // Soft card tint
  cardSoft: ['#ffffff', '#f0f9ff'] as const,
  cardTealSoft: ['#ffffff', '#e6faf8'] as const,
  // Buttons
  buttonPrimary: ['#00458b', '#005cb3'] as const,
  buttonAccent: ['#3fd2c7', '#2bb3a8'] as const,
};

export const shadows = {
  sm: {
    shadowColor: '#00458b',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#00458b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  accent: {
    shadowColor: '#3fd2c7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
};

export default {
  colors,
  gradients,
  shadows,
};
