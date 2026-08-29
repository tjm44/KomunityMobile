import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView,
    TouchableOpacity, ActivityIndicator, Alert, Dimensions
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import client, { getMediaUrl } from '../api/client';
import { colors, gradients } from '../constants/theme';

const { width } = Dimensions.get('window');

interface MemberProfileProps {
    membership: any;
    isAdmin: boolean;
    onBack: () => void;
    onStatusChange: () => void;
}

const MemberProfileScreen = ({ membership, isAdmin, onBack, onStatusChange }: MemberProfileProps) => {
    const insets = useSafeAreaInsets();
    const [loading, setLoading] = useState(false);
    const profile = membership.member_detail;

    const handleDeclareDeceased = () => {
        Alert.alert(
            'Declare Deceased',
            `Are you sure you want to declare ${profile.full_name} as deceased? This will initiate the condolence and contribution workflow. This action is sensitive and permanent.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Confirm',
                    onPress: performDeclareDeceased,
                    style: 'destructive'
                }
            ]
        );
    };

    const handleChangeRole = (newRole: string) => {
        Alert.alert(
            'Change Role',
            `Are you sure you want to change ${profile.full_name}'s role to ${newRole}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Change',
                    onPress: () => performChangeRole(newRole)
                }
            ]
        );
    };

    const performChangeRole = async (newRole: string) => {
        setLoading(true);
        try {
            await client.post(`memberships/${membership.id}/change_role/`, { role: newRole });
            Alert.alert('Success', `Role updated to ${newRole}.`);
            onStatusChange();
            onBack();
        } catch (error) {
            console.error('Error changing role:', error);
            Alert.alert('Error', 'Failed to change role.');
        } finally {
            setLoading(false);
        }
    };

    const performDeclareDeceased = async () => {
        setLoading(true);
        try {
            await client.post(`memberships/${membership.id}/declare_deceased/`);
            Alert.alert('Notice Recorded', 'The member has been declared deceased.');
            onStatusChange();
            onBack();
        } catch (error) {
            console.error('Error declaring deceased:', error);
            Alert.alert('Error', 'Failed to record notice. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const InfoRow = ({ label, value }: { label: string, value: string | null }) => (
        <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{label}</Text>
            <Text style={styles.infoValue}>{value || 'Not provided'}</Text>
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={[styles.header, { paddingTop: insets.top }]}>
                <TouchableOpacity onPress={onBack} style={styles.backButton}>
                    <Text style={styles.backButtonText}>←</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Member Profile</Text>
                <View style={{ width: 40 }} />
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.profileHero}>
                    <View style={styles.avatarContainer}>
                        {profile.profile_picture ? (
                            <Image
                                source={{ uri: getMediaUrl(profile.profile_picture) }}
                                style={styles.avatar}
                                transition={200}
                            />
                        ) : (
                            <View style={[styles.avatar, styles.placeholderAvatar]}>
                                <Text style={styles.placeholderInitial}>
                                    {profile.full_name[0].toUpperCase()}
                                </Text>
                            </View>
                        )}
                        {membership.is_deceased && (
                            <View style={styles.deceasedBadge}>
                                <Text style={styles.deceasedBadgeText}>DECEASED</Text>
                            </View>
                        )}
                    </View>
                    <Text style={styles.name}>{profile.full_name}</Text>
                    <View style={styles.roleBadge}>
                        <Text style={styles.roleText}>{membership.role.toUpperCase()}</Text>
                    </View>
                </View>

                {isAdmin && !membership.is_deceased && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Manage Roles</Text>
                        <View style={styles.roleActions}>
                            {['member', 'moderator', 'admin'].map((role) => (
                                <TouchableOpacity
                                    key={role}
                                    style={[
                                        styles.roleActionButton,
                                        membership.role === role && styles.activeRoleBtn
                                    ]}
                                    onPress={() => handleChangeRole(role)}
                                    disabled={loading || membership.role === role}
                                >
                                    <Text style={[
                                        styles.roleActionText,
                                        membership.role === role && styles.activeRoleText
                                    ]}>
                                        {role.charAt(0).toUpperCase() + role.slice(1)}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                )}

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Cultural & Spiritual Information</Text>
                    <InfoRow label="Cultural Background" value={profile.cultural_background} />
                    <InfoRow label="Religious Affiliation" value={profile.religious_affiliation} />
                    <InfoRow label="Traditional Names" value={profile.traditional_names} />
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Bio</Text>
                    <Text style={styles.bioText}>{profile.bio || 'This member hasn\'t added a bio yet.'}</Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Membership Details</Text>
                    <InfoRow label="Member Since" value={new Date(membership.date_joined).toLocaleDateString()} />
                    <InfoRow label="Status" value={membership.status} />
                </View>

                {isAdmin && !membership.is_deceased && (
                    <TouchableOpacity
                        style={styles.deceasedButton}
                        onPress={handleDeclareDeceased}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#ffffff" />
                        ) : (
                            <Text style={styles.deceasedButtonText}>Declare Deceased</Text>
                        )}
                    </TouchableOpacity>
                )}

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    backgroundColor: colors.background,
            },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: colors.white,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    backButton: {
        padding: 4,
    },
    backButtonText: {
        fontSize: 24,
        color: colors.primaryLight,
        fontWeight: 'bold',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.textPrimary,
    },
    profileHero: {
        backgroundColor: colors.white,
        alignItems: 'center',
        paddingVertical: 30,
        marginBottom: 8,
    },
    avatarContainer: {
        position: 'relative',
        marginBottom: 16,
    },
    avatar: {
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 3,
        borderColor: colors.surfaceLight,
    },
    placeholderAvatar: {
        backgroundColor: colors.surfaceLight,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: colors.primaryLight,
    },
    placeholderInitial: {
        fontSize: 48,
        fontWeight: 'bold',
        color: colors.primaryLight,
    },
    deceasedBadge: {
        position: 'absolute',
        bottom: 0,
        backgroundColor: colors.danger,
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: colors.white,
    },
    deceasedBadgeText: {
        color: colors.white,
        fontSize: 10,
        fontWeight: 'bold',
    },
    name: {
        fontSize: 24,
        fontWeight: 'bold',
        color: colors.textPrimary,
        marginBottom: 8,
    },
    roleBadge: {
        backgroundColor: colors.surfaceLight,
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 16,
    },
    roleText: {
        color: colors.primaryLight,
        fontSize: 12,
        fontWeight: 'bold',
    },
    section: {
        backgroundColor: colors.white,
        padding: 16,
        marginBottom: 8,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: colors.textSecondary,
        marginBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.surfaceLight,
        paddingBottom: 8,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    infoLabel: {
        fontSize: 14,
        color: colors.textSecondary,
    },
    infoValue: {
        fontSize: 14,
        color: colors.textPrimary,
        fontWeight: '500',
    },
    bioText: {
        fontSize: 15,
        color: colors.textSecondary,
        lineHeight: 22,
    },
    deceasedButton: {
        margin: 16,
        backgroundColor: colors.danger,
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        shadowColor: colors.danger,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    deceasedButtonText: {
        color: colors.white,
        fontSize: 16,
        fontWeight: 'bold',
    },
    roleActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 8,
    },
    roleActionButton: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.surfaceLight,
        backgroundColor: colors.white,
        alignItems: 'center',
    },
    activeRoleBtn: {
        backgroundColor: colors.primaryLight,
        borderColor: colors.primaryLight,
    },
    roleActionText: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.primaryLight,
    },
    activeRoleText: {
        color: colors.white,
    },
});

export default MemberProfileScreen;
