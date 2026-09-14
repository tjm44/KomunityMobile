import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, Alert, FlatList, Share
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import client from '../api/client';
import { colors } from '../constants/theme';

interface OrganisationDetailScreenProps {
    organisation: any;
    onBack: () => void;
    onViewFeed: () => void;
    onManage: () => void;
    onLaunchFundraiser: () => void;
    onViewWallet: () => void;
    onEditOrganisation: () => void;
    onSelectCampaign: (campaign: any) => void;
}

const OrganisationDetailScreen = ({
    organisation,
    onBack,
    onViewFeed,
    onManage,
    onLaunchFundraiser,
    onViewWallet,
    onEditOrganisation,
    onSelectCampaign
}: OrganisationDetailScreenProps) => {
    const insets = useSafeAreaInsets();
    const [orgDetails, setOrgDetails] = useState<any>(organisation);
    const [campaigns, setCampaigns] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        fetchData();
    }, [organisation.id]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch latest org detail
            const orgRes = await client.get(`organisations/${organisation.id}/`);
            setOrgDetails(orgRes.data);

            // Fetch campaigns for this organisation
            const campRes = await client.get(`campaigns/?organisation=${organisation.id}`);
            const activeCampaigns = campRes.data.filter((c: any) => c.contributions_open);
            setCampaigns(activeCampaigns);
        } catch (error) {
            console.error('Error fetching org details & campaigns:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleShare = () => {
        const shareUrl = `komunity://organisation/${orgDetails.id}`;
        Share.share({
            message: `Check out ${orgDetails.name} on Komunity! Join here: ${shareUrl}`,
            url: shareUrl
        });
    };

    const entityLabels: Record<string, string> = {
        ngo: 'NGO',
        church: 'Church / Faith-based',
        npo: 'NPO / Charity Trust',
        corporate: 'Corporate / Business',
        other: 'Organisation'
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 40 }}
            >
                {/* Hero / Cover Section */}
                <View style={styles.heroSection}>
                    {orgDetails.cover_image ? (
                        <Image source={{ uri: orgDetails.cover_image }} style={styles.coverImage} />
                    ) : (
                        <LinearGradient
                            colors={[colors.primaryDark, colors.primary, colors.primaryLight]}
                            style={styles.coverImage}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        />
                    )}

                    <View style={styles.heroOverlay}>
                        <View style={styles.headerActions}>
                            <TouchableOpacity style={styles.backBtn} onPress={onBack}>
                                <Text style={styles.backBtnText}>←</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
                                <Text style={styles.shareIcon}>🔗</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.orgInfoWrap}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                <Text style={styles.orgName}>{orgDetails.name}</Text>
                                {orgDetails.is_verified && (
                                    <View style={styles.verifiedBadge}>
                                        <Text style={styles.verifiedBadgeText}>🛡️ Official Trusted</Text>
                                    </View>
                                )}
                            </View>
                            <Text style={styles.entityLabel}>
                                🏢 {entityLabels[orgDetails.entity_type] || 'Organisation'}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Quick Dashboard Action Row */}
                <View style={styles.dashboardActions}>
                    <TouchableOpacity style={styles.mainActionBtn} onPress={onViewFeed}>
                        <Text style={styles.mainActionText}>📣 Jump to Feed</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.iconActionBtn} onPress={onViewWallet}>
                        <Text style={styles.iconActionText}>💳 Wallet</Text>
                    </TouchableOpacity>
                    {orgDetails.is_admin && (
                        <TouchableOpacity style={styles.iconActionBtn} onPress={onEditOrganisation}>
                            <Text style={styles.iconActionText}>⚙️ Settings</Text>
                        </TouchableOpacity>
                    )}
                </View>

                <View style={styles.contentBody}>
                    {/* About details */}
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>About Us</Text>
                        <Text style={styles.descText}>
                            {orgDetails.description || 'This organisation has no description yet. Connect with admins to learn more about their mission.'}
                        </Text>
                    </View>

                    {/* Official Registration Card */}
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Registry & Legal Status</Text>
                        <View style={styles.registryRow}>
                            <Text style={styles.registryLabel}>Registration Number</Text>
                            <Text style={styles.registryValue}>{orgDetails.registration_number || 'Pending Submission'}</Text>
                        </View>
                        <View style={styles.registryRow}>
                            <Text style={styles.registryLabel}>Entity Class</Text>
                            <Text style={styles.registryValue}>{(orgDetails.entity_type || 'other').toUpperCase()}</Text>
                        </View>
                        <View style={styles.registryRow}>
                            <Text style={styles.registryLabel}>Verification Trust Seal</Text>
                            <Text style={[styles.registryValue, { color: orgDetails.is_verified ? colors.primary : '#b45309' }]}>
                                {orgDetails.is_verified ? '🛡️ OFFICIAL TRUSTED' : '⚠️ UNVERIFIED PROFILE'}
                            </Text>
                        </View>
                    </View>

                    {/* Contact & Leadership Card */}
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Contact & Leadership</Text>
                        <View style={styles.registryRow}>
                            <Text style={styles.registryLabel}>Email</Text>
                            <Text style={styles.registryValue}>{orgDetails.email || 'Not provided'}</Text>
                        </View>
                        <View style={styles.registryRow}>
                            <Text style={styles.registryLabel}>Phone Number</Text>
                            <Text style={styles.registryValue}>{orgDetails.phone_number || 'Not provided'}</Text>
                        </View>
                        <View style={{ marginTop: 12 }}>
                            <Text style={[styles.registryLabel, { marginBottom: 6 }]}>Administrators</Text>
                            <View style={{ gap: 6 }}>
                                <Text style={styles.adminNameText}>👤 Primary Admin (Creator)</Text>
                                {orgDetails.admin2_detail && (
                                    <Text style={styles.adminNameText}>
                                        👤 {orgDetails.admin2_detail.full_name || orgDetails.admin2_detail.email} (Co-Admin)
                                    </Text>
                                )}
                                {orgDetails.admin3_detail && (
                                    <Text style={styles.adminNameText}>
                                        👤 {orgDetails.admin3_detail.full_name || orgDetails.admin3_detail.email} (Co-Admin)
                                    </Text>
                                )}
                            </View>
                        </View>
                    </View>

                    {/* Campaigns List */}
                    <View style={styles.card}>
                        <View style={styles.campaignHeader}>
                            <Text style={styles.cardTitle}>Active Fundraisers</Text>
                            {orgDetails.is_admin && (
                                <TouchableOpacity style={styles.createCampBtn} onPress={onLaunchFundraiser}>
                                    <Text style={styles.createCampBtnText}>🚀 Launch</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        {loading ? (
                            <ActivityIndicator color="#4f46e5" style={{ padding: 20 }} />
                        ) : campaigns.length === 0 ? (
                            <Text style={styles.emptyCampText}>No active fundraisers currently. Check back later.</Text>
                        ) : (
                            campaigns.map((camp) => {
                                const raised = parseFloat(camp.total_raised || 0);
                                const target = camp.target_amount ? parseFloat(camp.target_amount) : null;
                                return (
                                    <TouchableOpacity
                                        key={camp.id}
                                        style={styles.campRow}
                                        onPress={() => onSelectCampaign(camp)}
                                    >
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.campTitle}>{camp.title}</Text>
                                            <Text style={styles.campRaised}>
                                                Raised: R{raised.toFixed(2)} {target ? `of R${target.toFixed(2)}` : ''}
                                            </Text>
                                        </View>
                                        <Text style={styles.campChevron}>→</Text>
                                    </TouchableOpacity>
                                );
                            })
                        )}
                    </View>
                </View>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    heroSection: { height: 260, position: 'relative' },
    coverImage: { width: '100%', height: '100%' },
    heroOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
        justifyContent: 'space-between',
        padding: 20,
    },
    headerActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255, 255, 255, 0.9)', justifyContent: 'center', alignItems: 'center' },
    backBtnText: { fontSize: 20, fontWeight: 'bold', color: colors.primaryDark },
    shareBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255, 255, 255, 0.9)', justifyContent: 'center', alignItems: 'center' },
    shareIcon: { fontSize: 16 },
    orgInfoWrap: { marginTop: 'auto' },
    orgName: { fontSize: 24, fontWeight: 'bold', color: colors.white, fontFamily: 'Outfit-Bold' },
    verifiedBadge: { backgroundColor: colors.surfaceLight, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1, borderColor: colors.accentLight },
    verifiedBadgeText: { color: colors.primary, fontSize: 11, fontWeight: '700' },
    entityLabel: { fontSize: 14, color: colors.surfaceLight, marginTop: 4, fontWeight: '600', fontFamily: 'Outfit-Regular' },
    dashboardActions: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        marginVertical: 16,
        gap: 10,
    },
    mainActionBtn: {
        flex: 2,
        backgroundColor: colors.primary,
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
        elevation: 3,
    },
    mainActionText: { color: colors.white, fontWeight: 'bold', fontSize: 15, fontFamily: 'Outfit-Bold' },
    iconActionBtn: {
        flex: 1,
        backgroundColor: colors.white,
        borderWidth: 1.5,
        borderColor: colors.accentLight,
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconActionText: { color: colors.primary, fontWeight: '700', fontSize: 13 },
    contentBody: { paddingHorizontal: 20, gap: 16 },
    card: { backgroundColor: colors.white, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: colors.surfaceLight },
    cardTitle: { fontSize: 16, fontWeight: 'bold', color: colors.primaryDark, marginBottom: 12, fontFamily: 'Outfit-Bold' },
    descText: { fontSize: 14, color: colors.textSecondary, lineHeight: 22, fontFamily: 'Outfit-Regular' },
    registryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
    registryLabel: { fontSize: 14, color: colors.textSecondary, fontWeight: '500', fontFamily: 'Outfit-Regular' },
    registryValue: { fontSize: 14, color: colors.primary, fontWeight: '700', fontFamily: 'Outfit-Bold' },
    campaignHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    createCampBtn: { backgroundColor: colors.surfaceLight, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: colors.accentLight },
    createCampBtnText: { color: colors.primary, fontWeight: '700', fontSize: 12 },
    emptyCampText: { color: colors.textMuted, fontSize: 14, textAlign: 'center', paddingVertical: 20, fontFamily: 'Outfit-Regular' },
    campRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
    campTitle: { fontSize: 14, fontWeight: '700', color: colors.textSecondary },
    campRaised: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
    campChevron: { fontSize: 18, color: colors.textMuted, fontWeight: '700' },
    adminNameText: { fontSize: 14, color: colors.textPrimary, fontWeight: '500', fontFamily: 'Outfit-Regular' },
});

export default OrganisationDetailScreen;
