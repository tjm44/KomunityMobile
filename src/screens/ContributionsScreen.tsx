import React, { useEffect, useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    ActivityIndicator, RefreshControl, ScrollView, LayoutAnimation, Platform, UIManager
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import client from '../api/client';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

export interface ContributionItem {
    id: number;
    type?: 'deceased' | 'campaign';
    group?: number;
    group_detail?: {
        id: number;
        name: string;
    };
    campaign?: number;
    campaign_detail?: {
        id: number;
        title: string;
        campaign_type: string;
        organisation?: number;
    };
    organisation?: number;
    organisation_detail?: {
        id: number;
        name: string;
    };
    deceased_member?: number;
    deceased_member_detail?: {
        id: number;
        group_detail?: {
            id: number;
            name: string;
        };
        deceased_detail?: {
            id: number;
            full_name: string;
            profile_picture: string | null;
        };
        total_raised?: string;
        contributions_open?: boolean;
        cont_is_active?: boolean;
    };
    contributing_member?: number;
    contributing_member_detail?: {
        id: number;
        full_name?: string;
        profile_picture?: string | null;
    };
    amount: string;
    payment_method: string;
    contribution_date: string;
    note?: string;
}

export interface GroupedContribution {
    key: string;
    title: string;
    theme: {
        icon: string;
        color: string;
        bg: string;
        label: string;
    };
    subtitle: string;
    entries: ContributionItem[];
    totalAmount: number;
}

interface ContributionsScreenProps {
    onBack: () => void;
}

const CAMPAIGN_TYPE_META: Record<string, { icon: string; color: string; bg: string; label: string }> = {
    bereavement: { icon: '🕊️', color: '#7c3aed', bg: '#f3e8ff', label: 'Bereavement' },
    excess:      { icon: '🚗', color: '#0284c7', bg: '#e0f2fe', label: 'Insurance Excess' },
    emergency:   { icon: '🆘', color: '#dc2626', bg: '#fee2e2', label: 'Emergency' },
    custom:      { icon: '✨', color: '#059669', bg: '#d1fae5', label: 'Custom' },
};

const ContributionsScreen = ({ onBack }: ContributionsScreenProps) => {
    const insets = useSafeAreaInsets();
    const [contributions, setContributions] = useState<ContributionItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeWalletTab, setActiveWalletTab] = useState<'group_contributions' | 'organisation_contributions'>('group_contributions');
    const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
    const [expandedGroupKeys, setExpandedGroupKeys] = useState<Record<string, boolean>>({});
    const [expandedEntryId, setExpandedEntryId] = useState<number | null>(null);

    const fetchContributions = useCallback(async () => {
        try {
            const response = await client.get('contributions/');
            const data = response.data;
            const newItems = Array.isArray(data) ? data : data.results || [];
            setContributions(newItems);
        } catch (error) {
            console.error('Error fetching contributions:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchContributions();
    }, [fetchContributions]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchContributions();
    };

    const formatCurrency = (amtStr: string | number | null | undefined) => {
        const num = typeof amtStr === 'number' ? amtStr : parseFloat(String(amtStr ?? '0'));
        return isNaN(num) ? 'R 0.00' : `R ${num.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return 'Date unknown';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-ZA', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const getPaymentMethodLabel = (method: string) => {
        switch (method) {
            case 'cash': return 'Cash';
            case 'bank_transfer': return 'Bank Transfer';
            case 'mobile_money': return 'Mobile Money';
            case 'wallet': return 'Wallet';
            case 'other': return 'Other';
            default: return method || 'Wallet';
        }
    };

    const getPaymentMethodIcon = (method: string) => {
        switch (method) {
            case 'cash': return '💵';
            case 'bank_transfer': return '🏦';
            case 'mobile_money': return '📱';
            case 'wallet': return '👛';
            default: return '💳';
        }
    };

    const getContributionTitle = (contrib: ContributionItem) => {
        if (contrib.campaign_detail?.title) return contrib.campaign_detail.title;
        if (contrib.deceased_member_detail?.deceased_detail?.full_name) {
            return `${contrib.deceased_member_detail.deceased_detail.full_name} • Bereavement`;
        }
        if (contrib.group_detail?.name) return `${contrib.group_detail.name} • Group`;
        return 'Community Contribution';
    };

    const getContributionTheme = (contrib: ContributionItem) => {
        const campaignType = contrib.campaign_detail?.campaign_type || (contrib.type === 'deceased' ? 'bereavement' : 'custom');
        return CAMPAIGN_TYPE_META[campaignType] || CAMPAIGN_TYPE_META.custom;
    };

    const getContributionSubtitle = (contrib: ContributionItem) => {
        const groupName = contrib.group_detail?.name || contrib.deceased_member_detail?.group_detail?.name || '';
        const organisationName = contrib.organisation_detail?.name || '';
        const typeLabel = contrib.type === 'campaign' ? 'Campaign contribution' : 'Member contribution';
        return [typeLabel, organisationName || groupName].filter(Boolean).join(' • ');
    };

    const isOrganisationContribution = (contrib: ContributionItem) =>
        Boolean(contrib.organisation || contrib.organisation_detail || contrib.campaign_detail?.organisation);

    // Visible filtering
    const visibleContributions = contributions.filter((contrib) => {
        if (selectedGroupId) {
            const contribGroupId = contrib.group || contrib.group_detail?.id || contrib.deceased_member_detail?.group_detail?.id;
            return contribGroupId === selectedGroupId;
        }
        return true;
    });

    const groupContributions = visibleContributions.filter((contrib) => !isOrganisationContribution(contrib));
    const organisationContributions = visibleContributions.filter((contrib) => isOrganisationContribution(contrib));

    const activeContributions = activeWalletTab === 'organisation_contributions' ? organisationContributions : groupContributions;

    // Grouping by Campaign / Cause
    const groupedContributions = activeContributions.reduce((groups: GroupedContribution[], contrib) => {
        const key = contrib.campaign_detail?.id ? `campaign-${contrib.campaign_detail.id}` : `entry-${contrib.id}`;
        const existingGroup = groups.find((g) => g.key === key);

        if (!existingGroup) {
            groups.push({
                key,
                title: getContributionTitle(contrib),
                theme: getContributionTheme(contrib),
                subtitle: getContributionSubtitle(contrib),
                entries: [contrib],
                totalAmount: parseFloat(contrib.amount || '0'),
            });
        } else {
            existingGroup.entries.push(contrib);
            existingGroup.totalAmount += parseFloat(contrib.amount || '0');
        }

        return groups;
    }, []);

    // Summary calculations
    const totalContributionAmount = groupedContributions.reduce((total, group) => total + (group.totalAmount || 0), 0);
    const totalEntriesCount = activeContributions.length;

    // Unique groups list for filtering
    const availableGroupsMap = new Map<number, string>();
    contributions.forEach((c) => {
        const gId = c.group || c.group_detail?.id || c.deceased_member_detail?.group_detail?.id;
        const gName = c.group_detail?.name || c.deceased_member_detail?.group_detail?.name;
        if (gId && gName) {
            availableGroupsMap.set(gId, gName);
        }
    });
    const availableGroups = Array.from(availableGroupsMap.entries()).map(([id, name]) => ({ id, name }));

    const toggleGroupExpansion = (key: string) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpandedGroupKeys((prev) => ({
            ...prev,
            [key]: prev[key] === undefined ? false : !prev[key], // expanded by default unless toggled off
        }));
    };

    const toggleEntryExpansion = (id: number) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpandedEntryId((prev) => (prev === id ? null : id));
    };

    if (loading) {
        return (
            <View style={[styles.centered, { paddingTop: insets.top }]}>
                <ActivityIndicator size="large" color="#2563eb" />
                <Text style={styles.loadingText}>Loading contribution history...</Text>
            </View>
        );
    }

    const renderGroupedItem = ({ item }: { item: GroupedContribution }) => {
        const isCollapsed = expandedGroupKeys[item.key] === false;

        return (
            <View style={[styles.groupCard, { borderColor: item.theme.color + '44' }]}>
                {/* Campaign / Cause Header */}
                <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => toggleGroupExpansion(item.key)}
                    style={[styles.groupHeader, { backgroundColor: item.theme.bg }]}
                >
                    <View style={styles.groupHeaderLeft}>
                        <View style={[styles.themeIconCircle, { backgroundColor: item.theme.color + '20' }]}>
                            <Text style={styles.themeIcon}>{item.theme.icon}</Text>
                        </View>
                        <View style={styles.groupHeaderMeta}>
                            <Text style={styles.groupTitle} numberOfLines={1}>{item.title}</Text>
                            <Text style={styles.groupSubtitle} numberOfLines={1}>
                                {item.subtitle} • {item.entries.length} {item.entries.length === 1 ? 'contribution' : 'contributions'}
                            </Text>
                        </View>
                    </View>
                    <View style={styles.groupHeaderRight}>
                        <Text style={styles.groupTotalAmount}>{formatCurrency(item.totalAmount)}</Text>
                        <Text style={styles.chevronIcon}>{isCollapsed ? '▼' : '▲'}</Text>
                    </View>
                </TouchableOpacity>

                {/* Nested Contribution Entries */}
                {!isCollapsed && (
                    <View style={styles.entriesContainer}>
                        {item.entries.map((entry) => {
                            const isEntryExpanded = expandedEntryId === entry.id;
                            const deceasedName = entry.deceased_member_detail?.deceased_detail?.full_name;

                            return (
                                <View key={entry.id} style={styles.entryWrapper}>
                                    <TouchableOpacity
                                        activeOpacity={0.7}
                                        onPress={() => toggleEntryExpansion(entry.id)}
                                        style={styles.entryRow}
                                    >
                                        <View style={styles.entryMain}>
                                            <View style={styles.entryTitleRow}>
                                                <Text style={styles.entryTitle} numberOfLines={1}>
                                                    {entry.campaign_detail?.title || deceasedName || 'Contribution Entry'}
                                                </Text>
                                                <Text style={styles.entryAmount}>{formatCurrency(entry.amount)}</Text>
                                            </View>
                                            <View style={styles.entryMetaRow}>
                                                <View style={styles.methodBadge}>
                                                    <Text style={styles.methodBadgeText}>
                                                        {getPaymentMethodIcon(entry.payment_method)} {getPaymentMethodLabel(entry.payment_method)}
                                                    </Text>
                                                </View>
                                                <Text style={styles.entryDate}>{formatDate(entry.contribution_date)}</Text>
                                            </View>
                                            {entry.note ? (
                                                <Text style={styles.entryNoteSnippet} numberOfLines={1}>
                                                    💬 "{entry.note}"
                                                </Text>
                                            ) : null}
                                        </View>
                                    </TouchableOpacity>

                                    {/* Expanded Detail Panel */}
                                    {isEntryExpanded && (
                                        <View style={styles.expandedDetailPanel}>
                                            <Text style={styles.detailItemText}>
                                                <Text style={styles.detailLabel}>Contribution ID:</Text> #{entry.id}
                                            </Text>
                                            <Text style={styles.detailItemText}>
                                                <Text style={styles.detailLabel}>Type:</Text> {entry.type === 'campaign' ? 'Fundraiser Campaign' : 'Bereavement Member Contribution'}
                                            </Text>
                                            <Text style={styles.detailItemText}>
                                                <Text style={styles.detailLabel}>Date:</Text> {formatDate(entry.contribution_date)}
                                            </Text>
                                            <Text style={styles.detailItemText}>
                                                <Text style={styles.detailLabel}>Payment Method:</Text> {getPaymentMethodLabel(entry.payment_method)}
                                            </Text>
                                            {entry.group_detail?.name && (
                                                <Text style={styles.detailItemText}>
                                                    <Text style={styles.detailLabel}>Group:</Text> {entry.group_detail.name}
                                                </Text>
                                            )}
                                            {entry.organisation_detail?.name && (
                                                <Text style={styles.detailItemText}>
                                                    <Text style={styles.detailLabel}>Organisation:</Text> {entry.organisation_detail.name}
                                                </Text>
                                            )}
                                            {deceasedName && (
                                                <Text style={styles.detailItemText}>
                                                    <Text style={styles.detailLabel}>Bereavement Member:</Text> {deceasedName}
                                                </Text>
                                            )}
                                            {entry.note && (
                                                <View style={styles.fullNoteBox}>
                                                    <Text style={styles.detailLabel}>Note / Reference:</Text>
                                                    <Text style={styles.fullNoteText}>{entry.note}</Text>
                                                </View>
                                            )}
                                        </View>
                                    )}
                                </View>
                            );
                        })}
                    </View>
                )}
            </View>
        );
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Header Navigation */}
            <View style={styles.headerBar}>
                <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
                    <Text style={styles.backButtonText}>←</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Contribution History</Text>
                <TouchableOpacity style={styles.refreshButton} onPress={onRefresh} activeOpacity={0.7}>
                    <Text style={styles.refreshButtonText}>🔄</Text>
                </TouchableOpacity>
            </View>

            {/* Segmented Wallet Tabs */}
            <View style={styles.tabBar}>
                <TouchableOpacity
                    style={[
                        styles.tabButton,
                        activeWalletTab === 'group_contributions' && styles.tabButtonActive,
                    ]}
                    onPress={() => setActiveWalletTab('group_contributions')}
                    activeOpacity={0.8}
                >
                    <Text
                        style={[
                            styles.tabButtonText,
                            activeWalletTab === 'group_contributions' && styles.tabButtonTextActive,
                        ]}
                        numberOfLines={1}
                    >
                        🤝 Group ({groupContributions.length})
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[
                        styles.tabButton,
                        activeWalletTab === 'organisation_contributions' && styles.tabButtonActive,
                    ]}
                    onPress={() => setActiveWalletTab('organisation_contributions')}
                    activeOpacity={0.8}
                >
                    <Text
                        style={[
                            styles.tabButtonText,
                            activeWalletTab === 'organisation_contributions' && styles.tabButtonTextActive,
                        ]}
                        numberOfLines={1}
                    >
                        🏢 Organisation ({organisationContributions.length})
                    </Text>
                </TouchableOpacity>
            </View>

            <FlatList
                data={groupedContributions}
                keyExtractor={(item) => item.key}
                renderItem={renderGroupedItem}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563eb']} />
                }
                contentContainerStyle={styles.listContent}
                ListHeaderComponent={
                    <>
                        {/* Dynamic Summary Card */}
                        <View style={styles.summaryCard}>
                            <Text style={styles.summaryLabel}>
                                {activeWalletTab === 'organisation_contributions' ? 'Organisation Contributions Total' : 'Group Contributions Total'}
                            </Text>
                            <Text style={styles.summaryValue}>{formatCurrency(totalContributionAmount)}</Text>

                            <View style={styles.summaryBadgeRow}>
                                <View style={styles.badgePill}>
                                    <Text style={styles.badgePillText}>
                                        {groupedContributions.length} {groupedContributions.length === 1 ? 'Fundraiser' : 'Fundraisers'}
                                    </Text>
                                </View>
                                <View style={styles.badgePill}>
                                    <Text style={styles.badgePillText}>
                                        {totalEntriesCount} {totalEntriesCount === 1 ? 'Payment' : 'Payments'}
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {/* Optional Group Filter Chips */}
                        {availableGroups.length > 0 && (
                            <View style={styles.filterSection}>
                                <Text style={styles.filterTitle}>FILTER BY GROUP</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
                                    <TouchableOpacity
                                        style={[styles.filterChip, selectedGroupId === null && styles.filterChipActive]}
                                        onPress={() => setSelectedGroupId(null)}
                                    >
                                        <Text style={[styles.filterChipText, selectedGroupId === null && styles.filterChipTextActive]}>
                                            All Groups
                                        </Text>
                                    </TouchableOpacity>
                                    {availableGroups.map((g) => (
                                        <TouchableOpacity
                                            key={g.id}
                                            style={[styles.filterChip, selectedGroupId === g.id && styles.filterChipActive]}
                                            onPress={() => setSelectedGroupId(selectedGroupId === g.id ? null : g.id)}
                                        >
                                            <Text style={[styles.filterChipText, selectedGroupId === g.id && styles.filterChipTextActive]}>
                                                {g.name}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>
                        )}

                        <Text style={styles.sectionTitle}>
                            {activeWalletTab === 'organisation_contributions' ? 'Organisation Contributions' : 'Group Contributions'}
                        </Text>
                    </>
                }
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyIcon}>
                            {activeWalletTab === 'organisation_contributions' ? '🏢' : '🤝'}
                        </Text>
                        <Text style={styles.emptyTitle}>
                            No {activeWalletTab === 'organisation_contributions' ? 'Organisation' : 'Group'} Contributions
                        </Text>
                        <Text style={styles.emptySubtext}>
                            {selectedGroupId
                                ? 'No contribution history recorded for the selected group.'
                                : `Your ${activeWalletTab === 'organisation_contributions' ? 'organisation' : 'group'} contribution history will appear here.`}
                        </Text>
                    </View>
                }
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f8fafc',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        color: '#64748b',
        fontWeight: '500',
    },
    headerBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#ffffff',
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
    },
    backButton: {
        padding: 6,
        borderRadius: 8,
        backgroundColor: '#f1f5f9',
    },
    backButtonText: {
        fontSize: 20,
        fontWeight: '700',
        color: '#0f172a',
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: '#0f172a',
    },
    refreshButton: {
        padding: 6,
        borderRadius: 8,
        backgroundColor: '#f1f5f9',
    },
    refreshButtonText: {
        fontSize: 16,
    },
    tabBar: {
        flexDirection: 'row',
        backgroundColor: '#ffffff',
        paddingHorizontal: 16,
        paddingVertical: 8,
        gap: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
    },
    tabButton: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 10,
        backgroundColor: '#f1f5f9',
        alignItems: 'center',
        justifyContent: 'center',
    },
    tabButtonActive: {
        backgroundColor: '#2563eb',
    },
    tabButtonText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#64748b',
    },
    tabButtonTextActive: {
        color: '#ffffff',
        fontWeight: '700',
    },
    listContent: {
        padding: 16,
        paddingBottom: 40,
    },
    summaryCard: {
        backgroundColor: '#1e293b',
        borderRadius: 18,
        padding: 20,
        marginBottom: 16,
        elevation: 4,
        shadowColor: '#0f172a',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
    },
    summaryLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: '#94a3b8',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        marginBottom: 4,
    },
    summaryValue: {
        fontSize: 28,
        fontWeight: '800',
        color: '#ffffff',
        marginBottom: 12,
    },
    summaryBadgeRow: {
        flexDirection: 'row',
        gap: 8,
    },
    badgePill: {
        backgroundColor: 'rgba(255, 255, 255, 0.12)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
    },
    badgePillText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#cbd5e1',
    },
    filterSection: {
        marginBottom: 16,
    },
    filterTitle: {
        fontSize: 11,
        fontWeight: '700',
        color: '#94a3b8',
        letterSpacing: 1,
        marginBottom: 8,
    },
    filterScroll: {
        gap: 8,
    },
    filterChip: {
        backgroundColor: '#ffffff',
        borderRadius: 20,
        paddingVertical: 6,
        paddingHorizontal: 14,
        borderWidth: 1,
        borderColor: '#cbd5e1',
    },
    filterChipActive: {
        backgroundColor: '#2563eb',
        borderColor: '#2563eb',
    },
    filterChipText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#475569',
    },
    filterChipTextActive: {
        color: '#ffffff',
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: '#64748b',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 10,
    },
    groupCard: {
        backgroundColor: '#ffffff',
        borderRadius: 16,
        marginBottom: 14,
        borderWidth: 1,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    groupHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 14,
    },
    groupHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginRight: 8,
    },
    themeIconCircle: {
        width: 38,
        height: 38,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    themeIcon: {
        fontSize: 18,
    },
    groupHeaderMeta: {
        flex: 1,
    },
    groupTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#0f172a',
        marginBottom: 2,
    },
    groupSubtitle: {
        fontSize: 12,
        color: '#64748b',
    },
    groupHeaderRight: {
        alignItems: 'flex-end',
        justifyContent: 'center',
    },
    groupTotalAmount: {
        fontSize: 15,
        fontWeight: '800',
        color: '#059669',
        marginBottom: 2,
    },
    chevronIcon: {
        fontSize: 10,
        color: '#94a3b8',
    },
    entriesContainer: {
        backgroundColor: '#ffffff',
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    entryWrapper: {
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
        paddingVertical: 10,
    },
    entryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    entryMain: {
        flex: 1,
    },
    entryTitleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    entryTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1e293b',
        flex: 1,
        marginRight: 8,
    },
    entryAmount: {
        fontSize: 14,
        fontWeight: '700',
        color: '#059669',
    },
    entryMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    methodBadge: {
        backgroundColor: '#f1f5f9',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
    },
    methodBadgeText: {
        fontSize: 11,
        fontWeight: '500',
        color: '#475569',
    },
    entryDate: {
        fontSize: 11,
        color: '#94a3b8',
    },
    entryNoteSnippet: {
        fontSize: 12,
        color: '#64748b',
        fontStyle: 'italic',
        marginTop: 4,
    },
    expandedDetailPanel: {
        marginTop: 8,
        padding: 10,
        backgroundColor: '#f8fafc',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        gap: 4,
    },
    detailItemText: {
        fontSize: 12,
        color: '#334155',
    },
    detailLabel: {
        fontWeight: '700',
        color: '#0f172a',
    },
    fullNoteBox: {
        marginTop: 4,
        padding: 6,
        backgroundColor: '#ffffff',
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    fullNoteText: {
        fontSize: 12,
        color: '#475569',
        marginTop: 2,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 50,
        paddingHorizontal: 24,
    },
    emptyIcon: {
        fontSize: 44,
        marginBottom: 12,
    },
    emptyTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: '#334155',
        marginBottom: 6,
    },
    emptySubtext: {
        fontSize: 13,
        color: '#94a3b8',
        textAlign: 'center',
        lineHeight: 18,
    },
});

export default ContributionsScreen;
