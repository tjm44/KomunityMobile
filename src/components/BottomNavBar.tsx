import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Feather } from '@expo/vector-icons';
import { getMediaUrl } from '../api/client';

type TabName = 'home' | 'discovery' | 'wallet' | 'fundraisers' | 'profile';

interface BottomNavBarProps {
    activeTab: TabName;
    onTabPress: (tab: TabName) => void;
    onBack?: () => void;
    profilePicture?: string | null;
}

const TABS: Array<{
    key: TabName;
    label: string;
    icon?: React.ComponentProps<typeof Feather>['name'];
    emoji?: string;
    color: string;
}> = [
    { key: 'home',        label: 'My Hub',      icon: 'users',       color: '#2563eb' },
    { key: 'discovery',   label: 'Explore',     icon: 'search',      color: '#2563eb' },
    { key: 'fundraisers', label: 'Fundraise',   emoji: '🆘',         color: '#dc2626' },
    { key: 'wallet',      label: 'Wallet',      icon: 'credit-card', color: '#2563eb' },
    { key: 'profile',     label: 'Profile',                          color: '#2563eb' },
];

const BottomNavBar = ({ activeTab, onTabPress, onBack, profilePicture }: BottomNavBarProps) => {
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
                const tabColor = isActive ? tab.color : '#9ca3af';

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
                            <View style={[styles.fundraiserIconWrap, isActive && { backgroundColor: '#fee2e2' }]}>
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
                        <Feather
                            name={tab.icon!}
                            size={22}
                            color={tabColor}
                            style={{ marginBottom: 4 }}
                        />
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
        backgroundColor: '#ffffff',
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
        paddingTop: 12,
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 10,
    },
    navItem: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    backIcon: { fontSize: 22, marginBottom: 4, color: '#2563eb', fontWeight: 'bold' },
    navText: { fontSize: 10, fontWeight: '600', color: '#6b7280' },
    fundraiserIconWrap: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#fee2e230',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 2,
    },
    fundraiserEmoji: { fontSize: 18 },
    profilePic: {
        width: 28, height: 28, borderRadius: 14,
        marginBottom: 4, opacity: 0.6,
        borderWidth: 2, borderColor: '#e5e7eb',
    },
    activeProfilePic: { opacity: 1, borderColor: '#2563eb' },
    profilePlaceholder: {
        width: 28, height: 28, borderRadius: 14,
        backgroundColor: '#f3f4f6', borderWidth: 2,
        borderColor: '#d1d5db', justifyContent: 'center',
        alignItems: 'center', marginBottom: 4,
    },
    activeProfilePlaceholder: { backgroundColor: '#eff6ff', borderColor: '#2563eb' },
});

export default BottomNavBar;
