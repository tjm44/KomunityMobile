import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface DevScreenBadgeProps {
  id: string;
  visible?: boolean;
}

/**
 * Set SHOW_DEV_BADGE to false to hide temporary screen index badges from all mobile app screens.
 */
export const SHOW_DEV_BADGE = false;

/**
 * DEV ONLY – displays the screen/modal ID (e.g. "MOB-07") as a floating badge.
 * Rendered in App.tsx and driven by the current navigation state.
 */
const DevScreenBadge: React.FC<DevScreenBadgeProps> = ({ id, visible = SHOW_DEV_BADGE }) => {
  if (!visible || !__DEV__) return null;
  return (
    <View style={styles.badge} pointerEvents="none">
      <Text style={styles.text}>{id}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: 48,              // floats neatly near top right out of the way of bottom nav
    right: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(96, 165, 250, 0.6)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    zIndex: 99999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 10,
  },
  text: {
    color: '#60a5fa',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    fontFamily: 'monospace',
  },
});

export default DevScreenBadge;
