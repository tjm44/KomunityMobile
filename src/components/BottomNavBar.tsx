import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Feather } from '@expo/vector-icons';
import { getMediaUrl } from '../api/client';
import { colors } from '../constants/theme';

type TabName = 'home' | 'discovery' | 'wallet' | 'fundraisers' | 'profile';

interface BottomNavBarProps {
    activeTab: TabName;
    onTabPress: (tab: TabName) => void;
    onBack?: () => void;
    profilePicture?: string | null;
    userInitial?: string;
    unreadNotificationCount?: number;
}

const TABS: Array<{
    key: TabName;
    label: string;
    icon?: React.ComponentProps<typeof Feather>['name'];
    emoji?: string;
    color: string;
}> = [
    { key: 'home',        label: 'My Hub',      icon: 'users',       color: colors.primary },
    { key: 'discovery',   label: 'Explore',     icon: 'search',      color: colors.primary },
    { key: 'fundraisers', label: 'Fundraise',   emoji: '🆘',         color: colors.danger },
    { key: 'wallet',      label: 'Wallet',      icon: 'credit-card', color: colors.primary },
    { key: 'profile',     label: 'Profile',                          color: colors.primary },
];

const BottomNavBar = ({ activeTab, onTabPress, onBack, profilePicture, userInitial, unreadNotificationCount }: BottomNavBarProps) => {
    const insets = useSafeAreaInsets();

    const handlePress = (tab: TabName) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onTabPress(tab);
    };

    const handleBack = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onBack?.();
    };

    return (
        <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 12) }]}>
            {onBack && (
                <TouchableOpacity style={styles.navItem} onPress={handleBack}>
                    <Text style={styles.backIcon}>←</Text>
                    <Text style={styles.navText}>Back</Text>
                </TouchableOpacity>
            )}

            {TABS.map((tab) => {
                const isActive = activeTab === tab.key;
                const tabColor = isActive ? tab.color : colors.textMuted;

                if (tab.key === 'profile') {
                    return (
                        <TouchableOpacity
                            key={tab.key}
                            style={styles.navItem}
                            onPress={() => handlePress('profile')}
                        >
                            {profilePicture ? (
                                <Image
                                    source={{ uri: getMediaUrl(profilePicture) }}
                                    style={[styles.profilePic, isActive && styles.activeProfilePic]}
                                    transition={200}
                                />
                            ) : userInitial ? (
                                <View style={[styles.profilePlaceholder, isActive && styles.activeProfilePlaceholder, { backgroundColor: colors.surfaceTeal }]}>
                                    <Text style={{ fontSize: 13, fontFamily: 'Outfit-Bold', color: colors.primary }}>
                                        {userInitial}
                                    </Text>
                                </View>
                            ) : (
                                <View style={[styles.profilePlaceholder, isActive && styles.activeProfilePlaceholder]}>
                                    <Feather name="user" size={16} color={tabColor} />
                                </View>
                            )}
                            <Text style={[styles.navText, isActive && { color: tab.color }]}>{tab.label}</Text>
                        </TouchableOpacity>
                    );
                }

                if (tab.key === 'fundraisers') {
                    return (
                        <TouchableOpacity
                            key={tab.key}
                            style={styles.navItem}
                            onPress={() => handlePress('fundraisers')}
                        >
                            <View style={[styles.fundraiserIconWrap, isActive && { backgroundColor: colors.dangerLight }]}>
                                <Text style={styles.fundraiserEmoji}>{tab.emoji}</Text>
                            </View>
                            <Text style={[styles.navText, isActive && { color: tab.color }]}>{tab.label}</Text>
                        </TouchableOpacity>
                    );
                }

                return (
                    <TouchableOpacity
                        key={tab.key}
                        style={styles.navItem}
                        onPress={() => handlePress(tab.key)}
                    >
                        <View style={styles.iconWrap}>
                            <Feather
                                name={tab.icon!}
                                size={22}
                                color={tabColor}
                                style={{ marginBottom: 4 }}
                            />
                            {tab.key === 'home' && unreadNotificationCount ? unreadNotificationCount > 0 ? (
                                <View style={styles.badge}>
                                    <Text style={styles.badgeText}>
                                        {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
                                    </Text>
                                </View>
                            ) : null : null}
                        </View>
                        <Text style={[styles.navText, isActive && { color: tab.color }]}>{tab.label}</Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        backgroundColor: colors.cardBackground,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        paddingTop: 12,
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 10,
    },
    navItem: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconWrap: {
        position: 'relative',
        alignItems: 'center',
        justifyContent: 'center',
    },
    badge: {
        position: 'absolute',
        top: -4,
        right: -8,
        backgroundColor: colors.danger,
        borderRadius: 9,
        minWidth: 16,
        height: 16,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 3,
        borderWidth: 1.5,
        borderColor: colors.white,
    },
    badgeText: {
        color: colors.white,
        fontSize: 9,
        fontWeight: 'bold',
    },
    backIcon: { fontSize: 22, marginBottom: 4, color: colors.primary, fontWeight: 'bold' },
    navText: { fontSize: 10, fontWeight: '600', color: colors.textSecondary },
    fundraiserIconWrap: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.dangerLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 2,
    },
    fundraiserEmoji: { fontSize: 18 },
    profilePic: {
        width: 28, height: 28, borderRadius: 14,
        marginBottom: 4, opacity: 0.6,
        borderWidth: 2, borderColor: colors.border,
    },
    activeProfilePic: { opacity: 1, borderColor: colors.accent },
    profilePlaceholder: {
        width: 28, height: 28, borderRadius: 14,
        backgroundColor: colors.surfaceLight, borderWidth: 2,
        borderColor: colors.border, justifyContent: 'center',
        alignItems: 'center', marginBottom: 4,
    },
    activeProfilePlaceholder: { backgroundColor: colors.surfaceTeal, borderColor: colors.accent },
});

export default BottomNavBar;
