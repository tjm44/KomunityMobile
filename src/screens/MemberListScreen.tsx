import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    ActivityIndicator, Alert
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import client, { getMediaUrl } from '../api/client';
import { colors, gradients } from '../constants/theme';

interface Member {
    id: number;
    member_detail: {
        id: number;
        full_name: string;
        profile_picture: string | null;
    };
    role: string;
    is_admin: boolean;
    date_joined: string;
    is_deceased: boolean;
}

interface MemberListProps {
    group: { id: number; name: string };
    onBack: () => void;
    onSelectMember: (membership: any) => void;
}

const MemberListScreen = ({ group, onBack, onSelectMember }: MemberListProps) => {
    const insets = useSafeAreaInsets();
    const [members, setMembers] = useState<Member[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchMembers();
    }, []);

    const fetchMembers = async () => {
        try {
            const response = await client.get(`groups/${group.id}/members/`);
            setMembers(response.data);
        } catch (error) {
            console.error('Error fetching members:', error);
            Alert.alert('Error', 'Failed to load community members.');
        } finally {
            setLoading(false);
        }
    };

    const renderMemberItem = ({ item }: { item: Member }) => (
        <TouchableOpacity
            style={styles.memberCard}
            onPress={() => onSelectMember(item)}
            activeOpacity={0.7}
        >
            <View style={styles.memberInfo}>
                <View style={styles.avatarCircle}>
                    {item.member_detail.profile_picture ? (
                        <Image
                            source={{ uri: getMediaUrl(item.member_detail.profile_picture) }}
                            style={styles.avatarImg}
                            transition={200}
                        />
                    ) : (
                        <Text style={styles.avatarInitial}>
                            {item.member_detail.full_name[0].toUpperCase()}
                        </Text>
                    )}
                </View>
                <View style={styles.memberMeta}>
                    <Text style={styles.memberName}>{item.member_detail.full_name}</Text>
                    <Text style={styles.memberRole}>
                        {item.role.charAt(0).toUpperCase() + item.role.slice(1)}
                    </Text>
                </View>
                {item.is_deceased && (
                    <View style={styles.deceasedBadge}>
                        <Text style={styles.deceasedBadgeText}>DECEASED</Text>
                    </View>
                )}
                <Text style={styles.chevron}>›</Text>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <View style={styles.subHeader}>
                <Text style={styles.groupName}>{group.name}</Text>
                <Text style={styles.memberCount}>{members.length} members sharing this community</Text>
            </View>

            {loading ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color="#2563eb" />
                </View>
            ) : (
                <FlatList
                    data={members || []}
                    keyExtractor={(item, index) => (item && item.id != null ? item.id.toString() : `member-${index}`)}
                    renderItem={renderMemberItem}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>No members found in this group yet.</Text>
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
    backgroundColor: colors.background,
            },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
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
    subHeader: {
        padding: 16,
        backgroundColor: colors.white,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    groupName: {
        fontSize: 14,
        color: colors.primaryLight,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    memberCount: {
        fontSize: 16,
        fontWeight: 'bold',
        color: colors.textPrimary,
    },
    listContent: {
        padding: 16,
    },
    memberCard: {
        backgroundColor: colors.white,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
    },
    memberInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatarCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.surfaceLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: colors.primaryLight,
    },
    avatarImg: {
        width: '100%',
        height: '100%',
    },
    avatarInitial: {
        color: colors.primaryLight,
        fontWeight: 'bold',
        fontSize: 18,
    },
    memberMeta: {
        flex: 1,
    },
    memberName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: colors.textPrimary,
    },
    memberRole: {
        fontSize: 13,
        color: colors.textSecondary,
        marginTop: 1,
    },
    deceasedBadge: {
        backgroundColor: colors.dangerLight,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: colors.dangerLight,
        marginRight: 12,
    },
    deceasedBadgeText: {
        color: colors.danger,
        fontSize: 9,
        fontWeight: 'bold',
    },
    chevron: {
        fontSize: 20,
        color: colors.textMuted,
        marginLeft: 8,
    },
    emptyContainer: {
        padding: 40,
        alignItems: 'center',
    },
    emptyText: {
        color: colors.textMuted,
        fontSize: 16,
        textAlign: 'center',
    },
});

export default MemberListScreen;
