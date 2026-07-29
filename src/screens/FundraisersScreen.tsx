import React, { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    ActivityIndicator, RefreshControl
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import client from '../api/client';

const TYPE_META: Record<string, { icon: string; color: string; label: string }> = {
    bereavement: { icon: '🕊️', color: '#7c3aed', label: 'Bereavement' },
    excess:      { icon: '🚗', color: '#0284c7', label: 'Insurance Excess' },
    emergency:   { icon: '🆘', color: '#dc2626', label: 'Emergency' },
    custom:      { icon: '✨', color: '#059669', label: 'Custom Fund' },
};

interface FundraisersScreenProps {
    onSelectCampaign: (campaign: any) => void;
}

const CampaignCard = ({ campaign, onPress }: { campaign: any; onPress: () => void }) => {
    const meta = TYPE_META[campaign.campaign_type] ?? TYPE_META.custom;
    const raised = parseFloat(campaign.total_raised || 0);
    const target = campaign.target_amount ? parseFloat(campaign.target_amount) : null;
    const progress = target ? Math.min((raised / target) * 100, 100) : null;
    const orgName = campaign.organisation_detail?.name
        ?? campaign.group_detail?.name
        ?? `Group #${campaign.group}`;

    return (
        <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
            <View style={styles.orgHeader}>
                <Text style={styles.orgHeaderText}>{orgName}</Text>
            </View>

            <View style={styles.cardHeader}>
                <View style={[styles.typeBadge, { backgroundColor: `${meta.color}18` }]}>
                    <Text style={styles.typeBadgeIcon}>{meta.icon}</Text>
                    <Text style={[styles.typeBadgeLabel, { color: meta.color }]}>{meta.label}</Text>
                </View>
                {campaign.organisation_detail?.is_verified && (
                    <View style={styles.verifiedBadge}>
                        <Text style={styles.verifiedText}>✓ Verified</Text>
                    </View>
                )}
            </View>

            <Text style={styles.cardTitle}>{campaign.title}</Text>
            {campaign.description ? (
                <Text style={styles.cardDesc} numberOfLines={2}>{campaign.description}</Text>
            ) : null}

            <View style={styles.statsRow}>
                <Text style={[styles.raised, { color: meta.color }]}>R{raised.toFixed(2)} raised</Text>
                {target !== null && (
                    <Text style={styles.target}>of R{target.toFixed(2)}</Text>
                )}
                <Text style={styles.contributors}>
                    · {campaign.contributor_count ?? 0} contributors
                </Text>
            </View>

            {progress !== null && (
                <View style={styles.progressTrack}>
                    <View style={[styles.progressBar, { width: `${progress}%`, backgroundColor: meta.color }]} />
                </View>
            )}

            {campaign.beneficiary_detail && (
                <Text style={styles.beneficiary}>
                    👤 {campaign.beneficiary_detail.full_name}
                </Text>
            )}

            <View style={styles.cardFooter}>
                {campaign.deadline && (
                    <Text style={styles.deadline}>⏰ {campaign.deadline}</Text>
                )}
            </View>

            <View style={[styles.contributeHint, { backgroundColor: `${meta.color}12` }]}>
                <Text style={[styles.contributeHintText, { color: meta.color }]}>
                    Tap to contribute →
                </Text>
            </View>
        </TouchableOpacity>
    );
};

const FundraisersScreen = ({ onSelectCampaign }: FundraisersScreenProps) => {
    const insets = useSafeAreaInsets();
    const [campaigns, setCampaigns] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchCampaigns = useCallback(async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);
        setError(null);
        try {
            const res = await client.get('campaigns/public/');
            setCampaigns(res.data);
        } catch (e: any) {
            setError('Could not load fundraisers. Pull to refresh.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    React.useEffect(() => {
        fetchCampaigns();
    }, [fetchCampaigns]);

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>🆘 Active Fundraisers</Text>
                <Text style={styles.headerSubtitle}>
                    Public emergency campaigns from verified organisations
                </Text>
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#dc2626" />
                </View>
            ) : error ? (
                <View style={styles.center}>
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity onPress={() => fetchCampaigns()} style={styles.retryBtn}>
                        <Text style={styles.retryText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            ) : campaigns.length === 0 ? (
                <View style={styles.center}>
                    <Text style={styles.emptyIcon}>🌟</Text>
                    <Text style={styles.emptyTitle}>No Active Fundraisers</Text>
                    <Text style={styles.emptySubtitle}>
                        Public emergency campaigns from verified NGOs and churches will appear here.
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={campaigns}
                    keyExtractor={item => String(item.id)}
                    contentContainerStyle={[styles.list, { paddingBottom: Math.max(insets.bottom, 24) + 80 }]}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => fetchCampaigns(true)}
                            tintColor="#dc2626"
                        />
                    }
                    renderItem={({ item }) => (
                        <CampaignCard
                            campaign={item}
                            onPress={() => onSelectCampaign(item)}
                        />
                    )}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    header: {
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: 16,
        backgroundColor: '#ffffff',
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '800',
        color: '#0f172a',
        fontFamily: 'Outfit-Bold',
    },
    headerSubtitle: {
        fontSize: 13,
        color: '#64748b',
        marginTop: 4,
        fontFamily: 'Outfit-Regular',
    },
    list: { padding: 16 },
    card: {
        backgroundColor: '#ffffff',
        borderRadius: 18,
        padding: 16,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 3,
    },
    orgHeader: {
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    orgHeaderText: {
        fontSize: 16,
        fontWeight: '800',
        color: '#0f172a',
        textAlign: 'center',
        fontFamily: 'Outfit-Bold',
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    typeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
    },
    typeBadgeIcon: { fontSize: 14 },
    typeBadgeLabel: { fontSize: 12, fontWeight: '700', fontFamily: 'Outfit-Bold' },
    verifiedBadge: {
        backgroundColor: '#d1fae5',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 20,
    },
    verifiedText: { fontSize: 11, color: '#065f46', fontWeight: '700', fontFamily: 'Outfit-Bold' },
    cardTitle: {
        fontSize: 17,
        fontWeight: '800',
        color: '#0f172a',
        marginBottom: 4,
        fontFamily: 'Outfit-Bold',
    },
    cardDesc: {
        fontSize: 13,
        color: '#64748b',
        lineHeight: 18,
        marginBottom: 10,
        fontFamily: 'Outfit-Regular',
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 8,
        flexWrap: 'wrap',
    },
    raised: { fontSize: 15, fontWeight: '800', fontFamily: 'Outfit-Bold' },
    target: { fontSize: 13, color: '#94a3b8', fontFamily: 'Outfit-Regular' },
    contributors: { fontSize: 12, color: '#94a3b8', fontFamily: 'Outfit-Regular' },
    progressTrack: {
        height: 6,
        backgroundColor: '#e2e8f0',
        borderRadius: 3,
        overflow: 'hidden',
        marginBottom: 10,
    },
    progressBar: { height: '100%', borderRadius: 3 },
    beneficiary: {
        fontSize: 13,
        color: '#475569',
        marginBottom: 10,
        fontFamily: 'Outfit-Regular',
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    deadline: { fontSize: 12, color: '#f97316', fontFamily: 'Outfit-Regular' },
    contributeHint: {
        borderRadius: 10,
        padding: 10,
        alignItems: 'center',
    },
    contributeHintText: { fontSize: 14, fontWeight: '700', fontFamily: 'Outfit-Bold' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
    errorText: { fontSize: 15, color: '#64748b', textAlign: 'center', marginBottom: 16, fontFamily: 'Outfit-Regular' },
    retryBtn: { backgroundColor: '#dc2626', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 10 },
    retryText: { color: '#fff', fontWeight: '700', fontFamily: 'Outfit-Bold' },
    emptyIcon: { fontSize: 48, marginBottom: 12 },
    emptyTitle: { fontSize: 20, fontWeight: '800', color: '#1e293b', marginBottom: 8, fontFamily: 'Outfit-Bold' },
    emptySubtitle: { fontSize: 14, color: '#94a3b8', textAlign: 'center', lineHeight: 20, fontFamily: 'Outfit-Regular' },
});

export default FundraisersScreen;
