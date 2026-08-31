import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, Image, ScrollView,
    TouchableOpacity, Dimensions, ActivityIndicator, Alert, RefreshControl
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import client from '../api/client';
import { colors } from '../constants/theme';

const { width } = Dimensions.get('window');

interface Member {
    id: number;
    member_detail: {
        id: number;
        full_name: string;
        profile_picture: string | null;
    };
    role: string;
    is_admin: boolean;
}

interface Group {
    id: number;
    name: string;
    description: string;
    cover_image: string | null;
    total_members: number;
    requires_approval: boolean;
    created_at: string;
    is_admin: boolean;
    is_verified?: boolean;
    enable_recurring_contributions?: boolean;
    recurring_amount?: number | string;
    recurring_frequency?: string;
    recurring_title?: string;
}

interface GroupDetailProps {
    group: Group;
    onBack: () => void;
    onViewFeed: () => void;
    onManage: () => void;
    onSelectMember: (membership: any) => void;
    onViewAllMembers: () => void;
    onViewWallet: () => void;
    onViewDuesLedger?: () => void;
    onEditGroup?: () => void;
    onInvite?: () => void;
}

const GroupDetailScreen = ({
    group,
    onBack,
    onViewFeed,
    onManage,
    onSelectMember,
    onViewAllMembers,
    onViewWallet,
    onViewDuesLedger,
    onEditGroup,
    onInvite
}: GroupDetailProps) => {
    const insets = useSafeAreaInsets();
    const [members, setMembers] = useState<Member[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        fetchMembers();
    }, []);

    const fetchMembers = async () => {
        try {
            const response = await client.get(`groups/${group.id}/members/`);
            const data = response.data;
            setMembers(Array.isArray(data) ? data : data.results || []);
        } catch (error) {
            console.error('Error fetching members:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchMembers();
    };

    const handleLeaveGroup = () => {
        Alert.alert(
            'Leave Group',
            `Are you sure you want to leave ${group.name}? You will no longer see posts from this community.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Leave',
                    onPress: performLeave,
                    style: 'destructive'
                }
            ]
        );
    };

    const performLeave = async () => {
        try {
            await client.post(`groups/${group.id}/leave/`);
            Alert.alert('Left Group', `You have left ${group.name}.`);
            onBack();
        } catch (error) {
            console.error('Error leaving group:', error);
            Alert.alert('Error', 'Failed to leave group. Please try again.');
        }
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={[colors.primaryLight]}
                        tintColor="#2563eb"
                    />
                }
            >
                <View style={styles.heroSection}>
                    {group.cover_image ? (
                        <Image source={{ uri: group.cover_image }} style={styles.coverImage} />
                    ) : (
                        <View style={[styles.coverImage, { backgroundColor: colors.primaryLight }]} />
                    )}
                    <View style={styles.groupInfoOverlay}>
                        <View style={styles.mainInfo}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                                <Text style={styles.groupName}>{group.name}</Text>
                            </View>
                            {(group as any).purpose && (
                                <View style={styles.purposePill}>
                                    <Text style={styles.purposePillText}>
                                        {({
                                            'bereavement': '🕊️ Bereavement Fund',
                                            'excess': '🚗 Insurance Excess',
                                            'emergency': '🆘 Emergency Fundraiser',
                                            'custom': '✨ Custom Fund',
                                            'church': '⛪ Church Group',
                                            'stokvel': '💰 Stokvel & Savings',
                                            'student': '🎓 Student Body',
                                            'sports': '⚽ Sports Club',
                                        } as any)[(group as any).purpose] ?? ''}
                                    </Text>
                                </View>
                            )}
                            <Text style={styles.memberCountText}>{group.total_members} active members</Text>
                        </View>

                        <View style={styles.bannerActions}>
                            {onViewDuesLedger && (
                                <TouchableOpacity
                                    style={styles.bannerSecondaryButton}
                                    onPress={onViewDuesLedger}
                                    accessibilityLabel="Dues & Ledger"
                                >
                                    <View style={styles.iconCircle}>
                                        <Text style={styles.iconText}>🗓️</Text>
                                    </View>
                                </TouchableOpacity>
                            )}

                            <TouchableOpacity style={styles.bannerSecondaryButton} onPress={onViewWallet}>
                                <View style={styles.iconCircle}>
                                    <Text style={styles.iconText}>💳</Text>
                                </View>
                            </TouchableOpacity>

                            {group.is_admin && (
                                <TouchableOpacity style={styles.bannerSecondaryButton} onPress={onManage}>
                                    <View style={styles.iconCircle}>
                                        <Text style={styles.iconText}>⚙️</Text>
                                    </View>
                                </TouchableOpacity>
                            )}

                            {group.is_admin && onEditGroup && (
                                <TouchableOpacity style={styles.bannerSecondaryButton} onPress={onEditGroup}>
                                    <View style={styles.iconCircle}>
                                        <Text style={styles.iconText}>✏️</Text>
                                    </View>
                                </TouchableOpacity>
                            )}

                            {group.is_admin && onInvite && (
                                <TouchableOpacity style={styles.bannerSecondaryButton} onPress={onInvite}>
                                    <View style={styles.iconCircle}>
                                        <Text style={styles.iconText}>✉️</Text>
                                    </View>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                </View>

                <View style={styles.contentSection}>
                    {/* DUES & LEDGER FEATURE CARD */}
                    {onViewDuesLedger && (
                        <TouchableOpacity
                            style={[styles.card, { backgroundColor: '#e6faf8', borderColor: '#3fd2c7', borderWidth: 1.5 }]}
                            onPress={onViewDuesLedger}
                            activeOpacity={0.85}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                                    <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#00458b', justifyContent: 'center', alignItems: 'center' }}>
                                        <Text style={{ fontSize: 22 }}>🗓️</Text>
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ fontSize: 16, fontWeight: '800', color: '#00458b' }}>Dues & Contribution Ledger</Text>
                                        <Text style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>
                                            Track monthly cycles, payment due dates, and member ledgers
                                        </Text>
                                    </View>
                                </View>
                                <Text style={{ fontSize: 20, color: '#00458b', fontWeight: 'bold' }}>→</Text>
                            </View>
                        </TouchableOpacity>
                    )}

                    <View style={styles.card}>
                        <Text style={styles.sectionTitle}>Description</Text>
                        <Text style={styles.descriptionText}>
                            {group.description || `This ${group.is_verified ? 'organisation' : 'community'} has no description yet. Connect with members to learn more about their shared goals and cultural heritage.`}
                        </Text>
                    </View>

                    <View style={styles.card}>
                        <Text style={styles.sectionTitle}>Group Statistics</Text>
                        <View style={styles.statRow}>
                            <View style={styles.statItem}>
                                <Text style={styles.statLabel}>Founded</Text>
                                <Text style={styles.statValue}>{formatDate(group.created_at)}</Text>
                            </View>
                            <View style={styles.statItem}>
                                <Text style={styles.statLabel}>Privacy</Text>
                                <Text style={styles.statValue}>{group.requires_approval ? 'Restricted' : 'Public'}</Text>
                            </View>
                            <View style={styles.statItem}>
                                <Text style={styles.statLabel}>Status</Text>
                                <Text style={[styles.statValue, { color: colors.success }]}>Active</Text>
                            </View>
                        </View>
                    </View>

                    <View style={styles.card}>
                        <Text style={styles.sectionTitle}>Community Guidelines</Text>
                        <View style={styles.ruleItem}>
                            <Text style={styles.ruleEmoji}>🤝</Text>
                            <View style={styles.ruleTextContainer}>
                                <Text style={styles.ruleTitle}>Respect & Solidarity</Text>
                                <Text style={styles.ruleDescription}>Treat all members with dignity. We are a support network built on mutual trust.</Text>
                            </View>
                        </View>
                        <View style={styles.ruleItem}>
                            <Text style={styles.ruleEmoji}>🎭</Text>
                            <View style={styles.ruleTextContainer}>
                                <Text style={styles.ruleTitle}>Cultural Sensitivity</Text>
                                <Text style={styles.ruleDescription}>Honor the heritage and traditions of our shared community background.</Text>
                            </View>
                        </View>
                        <View style={styles.ruleItem}>
                            <Text style={styles.ruleEmoji}>💎</Text>
                            <View style={styles.ruleTextContainer}>
                                <Text style={styles.ruleTitle}>Financial Integrity</Text>
                                <Text style={styles.ruleDescription}>All contributions are tracked transparently for the benefit of members.</Text>
                            </View>
                        </View>
                    </View>

                    <View style={styles.card}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Key Members</Text>
                            <TouchableOpacity onPress={onViewAllMembers}>
                                <Text style={styles.viewAllText}>View All</Text>
                            </TouchableOpacity>
                        </View>

                        {loading ? (
                            <ActivityIndicator size="small" color="#2563eb" style={{ marginVertical: 20 }} />
                        ) : members.length > 0 ? (
                            <View style={styles.membersList}>
                                {members.slice(0, 5).map((member) => (
                                    <TouchableOpacity
                                        key={member.id}
                                        style={styles.memberItem}
                                        onPress={() => onSelectMember(member)}
                                    >
                                        <View style={styles.memberAvatar}>
                                            {member.member_detail.profile_picture ? (
                                                <Image
                                                    source={{ uri: member.member_detail.profile_picture }}
                                                    style={styles.avatarImg}
                                                />
                                            ) : (
                                                <Text style={styles.avatarInitial}>
                                                    {member.member_detail.full_name[0].toUpperCase()}
                                                </Text>
                                            )}
                                        </View>
                                        <View style={styles.memberMeta}>
                                            <Text style={styles.memberName}>{member.member_detail.full_name}</Text>
                                            <Text style={styles.memberRole}>
                                                {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                                            </Text>
                                        </View>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        ) : (
                            <Text style={styles.emptyMembersText}>Member list is currently private or unavailable.</Text>
                        )}
                    </View>

                    <TouchableOpacity style={styles.leaveButton} onPress={handleLeaveGroup}>
                        <Text style={styles.leaveButtonText}>Leave Group</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </View>
    );
};

export default GroupDetailScreen;

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
        borderBottomWidth: 1,
        borderBottomColor: colors.surfaceLight,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.surfaceLight,
        justifyContent: 'center',
        alignItems: 'center',
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
    heroSection: {
        width: '100%',
        height: 250,
        position: 'relative',
    },
    coverImage: {
        width: '100%',
        height: '100%',
    },
    groupInfoOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 20,
    },
    purposePill: {
        backgroundColor: 'rgba(255,255,255,0.25)',
        borderRadius: 12,
        paddingHorizontal: 10,
        paddingVertical: 3,
        marginTop: 4,
        alignSelf: 'flex-start',
    },
    purposePillText: {
        color: colors.white,
        fontSize: 12,
        fontWeight: '700',
    },
    groupName: {
        fontSize: 24,
        fontWeight: 'bold',
        color: colors.white,
        marginBottom: 4,
        textShadowColor: 'rgba(0, 0, 0, 0.75)',
        textShadowOffset: { width: -1, height: 1 },
        textShadowRadius: 10,
    },
    memberCountText: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.9)',
        fontWeight: '500',
        textShadowColor: 'rgba(0, 0, 0, 0.75)',
        textShadowOffset: { width: -1, height: 1 },
        textShadowRadius: 5,
    },
    bannerActions: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 10,
    },
    bannerSecondaryButton: {
        borderRadius: 20,
        overflow: 'hidden',
    },
    iconCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(0,0,0,0.55)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.25)',
    },
    iconText: {
        fontSize: 16,
    },
    contentSection: {
        padding: 16,
        backgroundColor: colors.background,
    },
    card: {
        backgroundColor: colors.white,
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: colors.border,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: colors.textPrimary,
        marginBottom: 12,
    },
    viewAllText: {
        fontSize: 14,
        color: colors.primaryLight,
        fontWeight: '600',
    },
    descriptionText: {
        fontSize: 15,
        color: colors.textSecondary,
        lineHeight: 22,
    },
    statRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    statItem: {
        flex: 1,
    },
    statLabel: {
        fontSize: 12,
        color: colors.textMuted,
        marginBottom: 4,
    },
    statValue: {
        fontSize: 14,
        fontWeight: 'bold',
        color: colors.textPrimary,
    },
    ruleItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    ruleEmoji: {
        fontSize: 24,
        marginRight: 12,
    },
    ruleTextContainer: {
        flex: 1,
    },
    ruleTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: colors.textPrimary,
        marginBottom: 2,
    },
    ruleDescription: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    membersList: {
        gap: 12,
    },
    memberItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    memberAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarImg: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    avatarInitial: {
        color: colors.white,
        fontWeight: 'bold',
        fontSize: 16,
    },
    memberMeta: {
        flex: 1,
    },
    memberName: {
        fontSize: 14,
        fontWeight: 'bold',
        color: colors.textPrimary,
    },
    memberRole: {
        fontSize: 12,
        color: colors.textMuted,
    },
    emptyMembersText: {
        fontSize: 13,
        color: colors.textMuted,
        textAlign: 'center',
        paddingVertical: 12,
    },
    leaveButton: {
        backgroundColor: '#ef4444',
        borderRadius: 10,
        paddingVertical: 12,
        alignItems: 'center',
        marginTop: 8,
    },
    leaveButtonText: {
        color: colors.white,
        fontWeight: 'bold',
        fontSize: 14,
    },
    mainInfo: {
        flex: 1,
    },
});
