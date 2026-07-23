import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, Alert, RefreshControl, Share } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import client from '../api/client';
import SearchScreen from './SearchScreen';
import { GroupPlaceholder } from '../components/Loaders';

interface Group {
    id: number;
    name: string;
    description: string;
    cover_image: string | null;
    total_members: number;
    requires_approval: boolean;
    membership_status: 'active' | 'pending' | null;
    verified_members_only?: boolean;
    purpose?: string;
}

interface Organisation {
    id: number;
    name: string;
    description: string;
    cover_image: string | null;
    is_verified: boolean;
    entity_type: string;
    registration_number: string;
}

interface DiscoveryScreenProps {
    onBack: () => void;
    onGroupJoined: () => void;
    onViewGroupDetails?: (group: Group) => void;
    onViewOrganisationPreview?: (org: Organisation) => void;
    onGoToVerification?: () => void;
}

const DiscoveryScreen = ({
    onBack,
    onGroupJoined,
    onViewGroupDetails,
    onViewOrganisationPreview,
    onGoToVerification
}: DiscoveryScreenProps) => {
    const insets = useSafeAreaInsets();
    const [groups, setGroups] = useState<Group[]>([]);
    const [organisations, setOrganisations] = useState<Organisation[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchVisible, setSearchVisible] = useState(false);
    const [joiningId, setJoiningId] = useState<number | null>(null);
    const [activeTab, setActiveTab] = useState<'communities' | 'organisations'>('communities');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [groupsRes, orgsRes] = await Promise.all([
                client.get('groups/discover/'),
                client.get('organisations/discover/'),
            ]);
            setGroups(groupsRes.data);
            setOrganisations(orgsRes.data);
        } catch (error) {
            console.error('Error fetching discovery data:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleShareGroup = async (group: Group) => {
        try {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            const shareUrl = `komunity://group/${group.id}`;
            await Share.share({
                message: `Check out "${group.name}" on Komunity!\n\n${group.description}\n\nJoin here: ${shareUrl}`,
            });
        } catch (error) {
            console.error('Error sharing group:', error);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    const handleJoinGroup = (group: Group) => {
        Alert.alert(
            'Join Community',
            `Are you sure you want to ${group.requires_approval ? 'request to join' : 'join'} ${group.name}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Confirm',
                    onPress: () => performJoin(group)
                }
            ]
        );
    };

    const performJoin = async (group: Group) => {
        setJoiningId(group.id);
        try {
            const response = await client.post(`groups/${group.id}/join/`);
            const status = response.data.status;

            if (status === 'active') {
                Alert.alert('Welcome!', `You have successfully joined ${group.name}.`);
                onGroupJoined();
            } else if (status === 'pending') {
                Alert.alert('Request Sent', 'Your request to join has been sent to the community admins.');
                fetchData();
            }
        } catch (error: any) {
            console.error('Error joining group:', error);
            const msg = error.response?.data?.error || '';
            if (msg.toLowerCase().includes('verified') || msg.toLowerCase().includes('restrict')) {
                Alert.alert(
                    'Verification Required',
                    'This group requires verified members. Your account is not yet verified.',
                    [
                        { text: 'Maybe Later', style: 'cancel' },
                        {
                            text: 'Verify Now',
                            style: 'default',
                            onPress: () => onGoToVerification?.()
                        }
                    ]
                );
            } else {
                Alert.alert('Join Failed', msg || 'Failed to join the community. Please try again.');
            }
        } finally {
            setJoiningId(null);
        }
    };

    const getButtonConfig = (group: Group) => {
        if (group.membership_status === 'active') {
            return {
                label: 'Joined',
                style: styles.joinedButton,
                textStyle: styles.joinedButtonText,
                disabled: true
            };
        }
        if (group.membership_status === 'pending') {
            return {
                label: 'Pending',
                style: styles.pendingButton,
                textStyle: styles.pendingButtonText,
                disabled: true
            };
        }
        return {
            label: group.requires_approval ? 'Request to Join' : 'Join Community',
            style: styles.joinButton,
            textStyle: styles.joinButtonText,
            disabled: false
        };
    };

    if (searchVisible) {
        return (
            <SearchScreen
                onClose={() => setSearchVisible(false)}
                onSelectGroup={(group) => {
                    setSearchVisible(false);
                    handleJoinGroup(group as any);
                }}
            />
        );
    }

    if (loading) {
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Explore</Text>
                </View>
                <GroupPlaceholder />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={[styles.header, { paddingTop: insets.top }]}>
                <TouchableOpacity onPress={onBack} style={styles.backButton}>
                    <Text style={styles.backButtonText}>←</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Explore Hub</Text>
                <TouchableOpacity onPress={() => setSearchVisible(true)} style={styles.searchButton}>
                    <Text style={{ fontSize: 22 }}>🔍</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.tabsContainer}>
                <TouchableOpacity
                    style={[styles.tabButton, activeTab === 'communities' && styles.tabButtonActive]}
                    onPress={() => setActiveTab('communities')}
                >
                    <Text style={[styles.tabButtonText, activeTab === 'communities' && styles.tabButtonTextActive]}>
                        Communities
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tabButton, activeTab === 'organisations' && styles.tabButtonActive]}
                    onPress={() => setActiveTab('organisations')}
                >
                    <Text style={[styles.tabButtonText, activeTab === 'organisations' && styles.tabButtonTextActive]}>
                        Organisations
                    </Text>
                </TouchableOpacity>
            </View>

            {activeTab === 'communities' ? (
                <FlatList
                    data={groups}
                    keyExtractor={(item) => `group-${item.id}`}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563eb']} tintColor="#2563eb" />
                    }
                    renderItem={({ item }) => {
                        const btn = getButtonConfig(item);
                        return (
                            <TouchableOpacity onPress={() => onViewGroupDetails?.(item)} activeOpacity={0.85}>
                                <LinearGradient colors={['#ffffff', '#f1f5f9']} style={styles.groupCard}>
                                    {item.cover_image ? (
                                        <Image source={{ uri: item.cover_image }} style={styles.coverImage} transition={200} />
                                    ) : (
                                        <View style={[styles.coverImage, { backgroundColor: '#e5e7eb' }]} />
                                    )}
                                    <View style={styles.cardContent}>
                                        <Text style={styles.groupName}>{item.name}</Text>

                                        <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginVertical: 4 }}>
                                            {item.purpose && (
                                                <View style={[
                                                    styles.cardPurposePill,
                                                    {
                                                        backgroundColor:
                                                            item.purpose === 'excess' ? '#eff6ff' :
                                                            item.purpose === 'emergency' ? '#fef2f2' :
                                                            item.purpose === 'custom' ? '#f0fdf4' : '#f5f3ff',
                                                        borderColor:
                                                            item.purpose === 'excess' ? '#bfdbfe' :
                                                            item.purpose === 'emergency' ? '#fecaca' :
                                                            item.purpose === 'custom' ? '#bbf7d0' : '#ddd6fe',
                                                        marginVertical: 0,
                                                    }
                                                ]}>
                                                    <Text style={[
                                                        styles.cardPurposeText,
                                                        {
                                                            color:
                                                                item.purpose === 'excess' ? '#0284c7' :
                                                                item.purpose === 'emergency' ? '#dc2626' :
                                                                item.purpose === 'custom' ? '#059669' : '#7c3aed'
                                                        }
                                                    ]}>
                                                        {({'bereavement': '🕊️ Bereavement Fund', 'excess': '🚗 Insurance Excess', 'emergency': '🆘 Emergency / Disaster Fundraiser', 'custom': '✨ Custom Fund'} as any)[item.purpose] ?? item.purpose}
                                                    </Text>
                                                </View>
                                            )}
                                            {item.verified_members_only && (
                                                <View style={[styles.cardPurposePill, { backgroundColor: '#fee2e2', borderColor: '#fecaca', marginVertical: 0 }]}>
                                                    <Text style={[styles.cardPurposeText, { color: '#dc2626', fontWeight: 'bold' }]}>🛡️ Verified Only</Text>
                                                </View>
                                            )}
                                        </View>

                                        <Text style={styles.memberCount}>{item.total_members} members</Text>
                                        <Text style={styles.description} numberOfLines={3}>
                                            {item.description || 'Connecting community members together.'}
                                        </Text>

                                        <View style={styles.actionRow}>
                                            <TouchableOpacity
                                                style={[btn.style, joiningId === item.id && styles.buttonLoading, { flex: 4 }]}
                                                onPress={() => handleJoinGroup(item)}
                                                disabled={btn.disabled || joiningId === item.id}
                                            >
                                                {joiningId === item.id ? (
                                                    <ActivityIndicator size="small" color="#ffffff" />
                                                ) : (
                                                    <Text style={btn.textStyle}>{btn.label}</Text>
                                                )}
                                            </TouchableOpacity>
                                            <TouchableOpacity style={styles.shareIconBtn} onPress={() => handleShareGroup(item)}>
                                                <Text style={styles.shareIconText}>🚀</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                </LinearGradient>
                            </TouchableOpacity>
                        );
                    }}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>No new communities found at the moment.</Text>
                        </View>
                    }
                />
            ) : (
                <FlatList
                    data={organisations}
                    keyExtractor={(item) => `org-${item.id}`}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0f766e']} tintColor="#0f766e" />
                    }
                    renderItem={({ item: org }) => (
                        <TouchableOpacity onPress={() => onViewOrganisationPreview?.(org)} activeOpacity={0.85}>
                            <LinearGradient colors={['#f0fdfa', '#ccfbf1']} style={[styles.groupCard, { borderColor: '#99f6e4' }]}>
                                {org.cover_image ? (
                                    <Image source={{ uri: org.cover_image }} style={styles.coverImage} transition={200} />
                                ) : (
                                    <LinearGradient colors={['#0f766e', '#115e59']} style={styles.coverImage} />
                                )}
                                <View style={styles.cardContent}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 2 }}>
                                        <Text style={styles.groupName}>{org.name}</Text>
                                        {org.is_verified && (
                                            <View style={styles.verifiedBadge}>
                                                <Text style={styles.verifiedBadgeText}>✅ Verified</Text>
                                            </View>
                                        )}
                                    </View>
                                    <Text style={styles.orgMetaText}>
                                        🏢 {({'ngo': 'NGO', 'church': 'Church/Religious Org', 'npo': 'NPO/Charity', 'corporate': 'Corporate', 'other': 'Organisation'}[org.entity_type] ?? org.entity_type)}
                                        {org.registration_number ? ` · Reg: ${org.registration_number}` : ''}
                                    </Text>
                                    <Text style={styles.description} numberOfLines={3}>
                                        {org.description || 'A formal organisation on the Komunity platform.'}
                                    </Text>
                                    <TouchableOpacity
                                        style={[styles.joinButton, { backgroundColor: '#0f766e' }]}
                                        onPress={() => onViewOrganisationPreview?.(org)}
                                    >
                                        <Text style={styles.joinButtonText}>Explore Organisation →</Text>
                                    </TouchableOpacity>
                                </View>
                            </LinearGradient>
                        </TouchableOpacity>
                    )}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>No verified organisations to discover yet.</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingBottom: 12,
        backgroundColor: 'transparent',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#eff6ff',
        justifyContent: 'center',
        alignItems: 'center',
    },
    backButtonText: {
        fontSize: 24,
        color: '#2563eb',
        fontWeight: 'bold',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#111827',
    },
    searchButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        padding: 16,
        paddingBottom: 100,
    },
    groupCard: {
        borderRadius: 16,
        marginBottom: 16,
        overflow: 'hidden',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    coverImage: {
        width: '100%',
        height: 140,
    },
    cardContent: {
        padding: 16,
    },
    groupName: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 4,
    },
    memberCount: {
        fontSize: 14,
        color: '#3b82f6',
        fontWeight: '600',
        marginBottom: 8,
    },
    viewDetailsLink: {
        marginBottom: 12,
    },
    viewDetailsText: {
        fontSize: 14,
        color: '#2563eb',
        fontWeight: '600',
    },
    description: {
        fontSize: 14,
        color: '#6b7280',
        marginBottom: 16,
        lineHeight: 20,
    },
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    shareIconBtn: {
        flex: 1,
        height: 44,
        borderRadius: 12,
        backgroundColor: '#f3f4f6',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
    },
    shareIconText: {
        fontSize: 20,
    },
    // Join button (default — not yet a member)
    joinButton: {
        backgroundColor: '#2563eb',
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
        shadowColor: '#2563eb',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    joinButtonText: {
        color: '#ffffff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    // Already joined
    joinedButton: {
        backgroundColor: '#f0fdf4',
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: '#22c55e',
    },
    joinedButtonText: {
        color: '#16a34a',
        fontWeight: 'bold',
        fontSize: 16,
    },
    // Pending approval
    pendingButton: {
        backgroundColor: '#fffbeb',
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: '#f59e0b',
    },
    pendingButtonText: {
        color: '#d97706',
        fontWeight: 'bold',
        fontSize: 16,
    },
    buttonLoading: {
        backgroundColor: '#93c5fd',
    },
    cardPurposePill: {
        alignSelf: 'flex-start',
        borderRadius: 8,
        borderWidth: 1,
        paddingHorizontal: 8,
        paddingVertical: 2,
        marginVertical: 4,
    },
    cardPurposeText: {
        fontSize: 11,
        fontWeight: '700',
    },
    emptyContainer: {
        padding: 40,
        alignItems: 'center',
    },
    emptyText: {
        color: '#9ca3af',
        fontSize: 16,
        textAlign: 'center',
    },
    verifiedBadge: {
        backgroundColor: '#d1fae5',
        borderRadius: 20,
        paddingHorizontal: 7,
        paddingVertical: 1,
        borderWidth: 1,
        borderColor: '#6ee7b7',
    },
    verifiedBadgeText: {
        color: '#065f46',
        fontSize: 10,
        fontWeight: '700',
    },
    tabsContainer: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: '#ffffff',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
        gap: 12,
    },
    tabButton: {
        flex: 1,
        paddingVertical: 8,
        borderRadius: 20,
        alignItems: 'center',
        backgroundColor: '#f3f4f6',
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    tabButtonActive: {
        backgroundColor: '#eff6ff',
        borderColor: '#3b82f6',
    },
    tabButtonText: {
        fontSize: 14,
        color: '#6b7280',
        fontWeight: '600',
        fontFamily: 'Outfit-Regular',
    },
    tabButtonTextActive: {
        color: '#3b82f6',
        fontWeight: '700',
    },
    orgMetaText: {
        fontSize: 12,
        color: '#475569',
        fontWeight: '500',
        marginBottom: 4,
        fontFamily: 'Outfit-Regular',
    },
});

export default DiscoveryScreen;
