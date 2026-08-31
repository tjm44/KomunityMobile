import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    ActivityIndicator, Image, Alert, ScrollView, RefreshControl,
    TextInput
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import client, { getMediaUrl } from '../api/client';
import { authenticateAction } from '../utils/biometrics';
import { colors, gradients } from '../constants/theme';

interface Member {
    id: number;
    member_detail: {
        id: number;
        full_name: string;
        profile_picture: string | null;
    };
    status: string;
    role: string;
    date_joined: string;
    is_deceased: boolean;
}

interface DeceasedMember {
    id: number;
    deceased_detail: {
        id: number;
        full_name: string;
        profile_picture: string | null;
    };
    total_raised: string;
    total_disbursed: string;
    balance: string;
    beneficiary_detail: {
        id: number;
        full_name: string;
    } | null;
    funds_disbursed: boolean;
}

type ManagementItem = Member | DeceasedMember;

interface GroupManagementProps {
    group: { id: number; name: string; purpose?: string; is_admin?: boolean };
    onBack: () => void;
    onSelectMember: (membership: any) => void;
    onViewWallet: () => void;
    onViewDuesLedger?: () => void;
    onCreateCampaign?: () => void;
    onSelectCampaign?: (campaign: any) => void;
    refreshKey?: number;
}

const CAMPAIGN_TYPE_META: Record<string, { icon: string; color: string; label: string }> = {
    bereavement: { icon: '🕊️', color: colors.primary, label: 'Bereavement' },
    excess:      { icon: '🚗', color: colors.primaryLight, label: 'Insurance Excess' },
    emergency:   { icon: '🆘', color: colors.danger, label: 'Emergency' },
    custom:      { icon: '✨', color: colors.primaryLight, label: 'Custom' },
    church:      { icon: '⛪', color: colors.primaryLight, label: 'Church' },
    stokvel:     { icon: '💰', color: colors.success, label: 'Stokvel' },
    student:     { icon: '🎓', color: colors.warning, label: 'Student Body' },
    sports:      { icon: '⚽', color: colors.success, label: 'Sports Club' },
};

const GroupManagementScreen = ({ group, onBack, onSelectMember, onViewWallet, onViewDuesLedger, onCreateCampaign, onSelectCampaign, refreshKey }: GroupManagementProps) => {
    const insets = useSafeAreaInsets();
    const [pendingMembers, setPendingMembers] = useState<Member[]>([]);
    const [activeMembers, setActiveMembers] = useState<Member[]>([]);
    const [deceasedMembers, setDeceasedMembers] = useState<DeceasedMember[]>([]);
    const [activeCampaigns, setActiveCampaigns] = useState<any[]>([]);
    const [transferRequests, setTransferRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<number | null>(null);
    const [activeTab, setActiveTab] = useState<'pending' | 'members' | 'payouts' | 'campaigns' | 'closed' | 'transfers'>('pending');
    const [refreshing, setRefreshing] = useState(false);
    const [showTransferModal, setShowTransferModal] = useState(false);
    const [transferAmount, setTransferAmount] = useState('');
    const [selectedRecipientId, setSelectedRecipientId] = useState<number | null>(null);
    const [showMemberPicker, setShowMemberPicker] = useState(false);
    const [transferError, setTransferError] = useState<string | null>(null);
    const [selectedCampaignKey, setSelectedCampaignKey] = useState<string | null>(null);
    const [showCampaignPicker, setShowCampaignPicker] = useState(false);

    // Beneficiary selection state
    const [isAssigningBeneficiary, setIsAssigningBeneficiary] = useState<number | null>(null);

    useEffect(() => {
        fetchData();
    }, [refreshKey]);

    const fetchData = async () => {
        if (!refreshing) setLoading(true);
        try {
            if (group.is_admin) {
                const [pendingRes, activeRes, deceasedRes, transferRes, campaignsRes] = await Promise.all([
                    client.get(`groups/${group.id}/pending_members/`),
                    client.get(`groups/${group.id}/members/`),
                    client.get(`deceased/?group=${group.id}`),
                    client.get(`groups/${group.id}/wallet_transfer_requests/`),
                    client.get(`campaigns/?group=${group.id}`),
                ]);
                setPendingMembers(pendingRes.data);
                setActiveMembers(activeRes.data);
                setDeceasedMembers(deceasedRes.data);
                setTransferRequests(transferRes.data);
                setActiveCampaigns(campaignsRes.data);
            } else {
                const [pendingRes, activeRes, deceasedRes, campaignsRes] = await Promise.all([
                    client.get(`groups/${group.id}/pending_members/`),
                    client.get(`groups/${group.id}/members/`),
                    client.get(`deceased/?group=${group.id}`),
                    client.get(`campaigns/?group=${group.id}`),
                ]);
                setPendingMembers(pendingRes.data);
                setActiveMembers(activeRes.data);
                setDeceasedMembers(deceasedRes.data);
                setActiveCampaigns(campaignsRes.data);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
            Alert.alert('Error', 'Failed to load group information.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    // Derived campaign lists
    const openCampaigns = activeCampaigns.filter((c: any) => c.contributions_open);
    const closedCampaigns = activeCampaigns.filter((c: any) => !c.contributions_open);

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    const handleCloseCampaign = (campaignId: number, title: string) => {
        Alert.alert(
            'Close Campaign',
            `Stop accepting contributions to "${title}"? This cannot be undone.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Close Campaign',
                    style: 'destructive',
                    onPress: async () => {
                        setProcessingId(campaignId);
                        try {
                            await client.post(`campaigns/${campaignId}/close/`);
                            Alert.alert('✅ Campaign Closed', 'No further contributions will be accepted.');
                            fetchData();
                        } catch (e: any) {
                            Alert.alert('Error', e?.response?.data?.error || 'Could not close campaign.');
                        } finally {
                            setProcessingId(null);
                        }
                    },
                },
            ]
        );
    };

    const handleCreateTransferRequest = async () => {
        if (!selectedRecipientId) {
            setTransferError('Please select a recipient member.');
            return;
        }

        const amountValue = parseFloat(transferAmount);
        if (!transferAmount || isNaN(amountValue) || amountValue <= 0) {
            setTransferError('Enter a valid transfer amount.');
            return;
        }

        setTransferError(null);
        setProcessingId(-1);
        try {
            const payload: any = {
                recipient_profile: selectedRecipientId,
                amount: amountValue,
            };

            if (selectedCampaignKey) {
                const [type, idStr] = selectedCampaignKey.split('_');
                const campaignId = parseInt(idStr, 10);
                if (type === 'deceased') {
                    payload.deceased_contribution = campaignId;
                } else if (type === 'generic') {
                    payload.fund_campaign = campaignId;
                }
            }

            const response = await client.post(`groups/${group.id}/request_wallet_transfer/`, payload);
            setTransferRequests((prev) => [response.data, ...prev]);
            setShowTransferModal(false);
            setTransferAmount('');
            setSelectedRecipientId(null);
            setSelectedCampaignKey(null);
            setShowMemberPicker(false);
            setShowCampaignPicker(false);
            Alert.alert('Transfer Request Created', 'A wallet transfer request has been created and awaits admin approvals.');
        } catch (error: any) {
            console.error('Error creating transfer request:', error);
            const msg = error.response?.data?.error || 'Failed to create transfer request.';
            setTransferError(msg);
        } finally {
            setProcessingId(null);
        }
    };

    const handleApproveTransferRequest = async (requestId: number) => {
        setProcessingId(requestId);
        try {
            const response = await client.post(`groups/${group.id}/approve_wallet_transfer_request/`, {
                request_id: requestId,
            });
            setTransferRequests((prev) => prev.map((item) => item.id === requestId ? response.data : item));
            Alert.alert('Approved', 'Your approval has been recorded.');
        } catch (error: any) {
            console.error('Error approving transfer request:', error);
            const msg = error.response?.data?.error || 'Failed to approve transfer request.';
            Alert.alert('Error', msg);
        } finally {
            setProcessingId(null);
        }
    };

    const handleApprove = async (membershipId: number) => {
        setProcessingId(membershipId);
        try {
            await client.post(`memberships/${membershipId}/approve/`);
            fetchData();
            Alert.alert('Approved', 'Member has been added to the community.');
        } catch (error) {
            console.error('Error approving member:', error);
            Alert.alert('Error', 'Failed to approve member.');
        } finally {
            setProcessingId(null);
        }
    };

    const handleReject = async (membershipId: number) => {
        setProcessingId(membershipId);
        try {
            await client.post(`memberships/${membershipId}/reject/`);
            fetchData();
            Alert.alert('Rejected', 'The membership request was declined.');
        } catch (error) {
            console.error('Error rejecting member:', error);
            Alert.alert('Error', 'Failed to reject member.');
        } finally {
            setProcessingId(null);
        }
    };

    const handleDisburse = async (deceasedId: number) => {
        const deceased = deceasedMembers.find(d => d.id === deceasedId);
        if (!deceased) return;

        if (!deceased.beneficiary_detail) {
            Alert.alert('Incomplete Profile', 'Please assign a beneficiary to this deceased member before disbursing funds.');
            return;
        }

        Alert.alert(
            'Confirm Payout',
            `Disburse $${deceased.balance} to ${deceased.beneficiary_detail.full_name}? This action is irreversible.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Disburse',
                    style: 'destructive',
                    onPress: async () => {
                        // Biometric verification for disbursement
                        const authenticated = await authenticateAction(`Authenticate to disburse $${deceased.balance} to ${deceased.beneficiary_detail?.full_name}`);
                        if (!authenticated) return;

                        setProcessingId(deceasedId);
                        try {
                            await client.post(`deceased/${deceasedId}/disburse_funds/`);
                            Alert.alert('Success', 'Funds have been disbursed to the beneficiary.');
                            fetchData();
                        } catch (error: any) {
                            console.error('Disbursement error:', error);
                            const msg = error.response?.data?.error || 'Failed to disburse funds.';
                            Alert.alert('Error', msg);
                        } finally {
                            setProcessingId(null);
                        }
                    }
                }
            ]
        );
    };

    const handleAssignBeneficiary = async (deceasedId: number, profileId: number) => {
        setProcessingId(deceasedId);
        try {
            await client.patch(`deceased/${deceasedId}/`, {
                beneficiary: profileId
            });
            Alert.alert('Success', 'Beneficiary assigned successfully.');
            setIsAssigningBeneficiary(null);
            fetchData();
        } catch (error) {
            console.error('Error assigning beneficiary:', error);
            Alert.alert('Error', 'Failed to assign beneficiary.');
        } finally {
            setProcessingId(null);
        }
    };

    const renderMemberItem = ({ item }: { item: Member }) => {
        const fullName = item.member_detail?.full_name || 'Member';
        const profilePic = item.member_detail?.profile_picture;
        return (
            <TouchableOpacity
                style={styles.requestCard}
                onPress={() => onSelectMember(item)}
                activeOpacity={0.7}
            >
                <View style={styles.memberInfo}>
                    <View style={styles.avatarCircle}>
                        {profilePic ? (
                            <Image
                                source={{ uri: getMediaUrl(profilePic) }}
                                style={styles.avatarImg}
                            />
                        ) : (
                            <Text style={styles.avatarInitial}>
                                {fullName.charAt(0).toUpperCase()}
                            </Text>
                        )}
                    </View>
                    <View style={styles.memberMeta}>
                        <Text style={styles.memberName}>{fullName}</Text>
                        <Text style={styles.requestDate}>
                            {item.date_joined ? `Joined ${new Date(item.date_joined).toLocaleDateString()}` : ''}
                        </Text>
                    </View>
                    {item.is_deceased && (
                        <View style={styles.deceasedBadge}>
                            <Text style={styles.deceasedBadgeText}>DECEASED</Text>
                        </View>
                    )}
                </View>

                {activeTab === 'pending' && (
                    <View style={styles.actions}>
                        <TouchableOpacity
                            style={[styles.actionButton, styles.approveButton, processingId === item.id && styles.disabledButton]}
                            onPress={() => handleApprove(item.id)}
                            disabled={processingId !== null}
                        >
                            <Text style={styles.approveButtonText}>Approve</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.actionButton, styles.rejectButton, processingId === item.id && styles.disabledButton]}
                            onPress={() => handleReject(item.id)}
                            disabled={processingId !== null}
                        >
                            <Text style={styles.rejectButtonText}>Reject</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    const renderTransferRequestItem = ({ item }: { item: any }) => (
        <View style={styles.requestCard}>
            <View style={styles.transferHeader}>
                <Text style={styles.transferTitle}>Transfer to {item.recipient_profile_detail?.full_name || 'Member'}</Text>
                <Text style={styles.transferStatus}>{item.status}</Text>
            </View>
            <Text style={styles.transferAmount}>${parseFloat(item.amount || 0).toFixed(2)}</Text>
            <Text style={styles.transferMeta}>Requested by {item.requested_by_detail?.full_name || 'Admin'}</Text>
            <Text style={styles.transferMeta}>Approvals: {item.approvals_count ?? 0}/3</Text>
            <View style={styles.transferActions}>
                {item.status === 'PENDING' && !item.current_user_has_approved && (
                    <TouchableOpacity
                        style={[styles.actionButton, styles.approveButton, processingId === item.id && styles.disabledButton]}
                        onPress={() => handleApproveTransferRequest(item.id)}
                        disabled={processingId !== null}
                    >
                        <Text style={styles.approveButtonText}>Approve</Text>
                    </TouchableOpacity>
                )}
                {item.can_execute && item.status === 'EXECUTED' && (
                    <Text style={styles.transferExecutedText}>Executed</Text>
                )}
            </View>
        </View>
    );

    const renderDeceasedItem = ({ item }: { item: DeceasedMember }) => {
        const deceasedName = item.deceased_detail?.full_name || 'Member';
        const profilePic = item.deceased_detail?.profile_picture;
        return (
            <View style={styles.requestCard}>
                <View style={styles.memberInfo}>
                    <View style={styles.avatarCircle}>
                        {profilePic ? (
                            <Image
                                source={{ uri: getMediaUrl(profilePic) }}
                                style={styles.avatarImg}
                            />
                        ) : (
                            <Text style={styles.avatarInitial}>
                                {deceasedName.charAt(0).toUpperCase()}
                            </Text>
                        )}
                    </View>
                    <View style={styles.memberMeta}>
                        <Text style={styles.memberName}>{deceasedName}</Text>
                        <Text style={styles.requestDate}>Fund Management</Text>
                    </View>
                    {parseFloat(item.total_disbursed || '0') > 0 ? (
                        <TouchableOpacity
                            style={[styles.deceasedBadge, { backgroundColor: colors.successLight, borderColor: colors.accent }]}
                            onPress={onViewWallet}
                        >
                            <Text style={[styles.deceasedBadgeText, { color: colors.success }]}>
                                {parseFloat(item.balance || '0') === 0 ? 'PAID' : 'PARTIALLY PAID'} 🔗
                            </Text>
                        </TouchableOpacity>
                    ) : (
                        <View style={styles.deceasedBadge}>
                            <Text style={styles.deceasedBadgeText}>ACTIVE</Text>
                        </View>
                    )}
                </View>

                {/* Comprehensive Stats Section */}
                <View style={styles.statsGrid}>
                    <View style={styles.statBox}>
                        <Text style={styles.statLabel}>Raised</Text>
                        <Text style={styles.statValue}>${item.total_raised ?? '0'}</Text>
                    </View>
                    <View style={styles.statBox}>
                        <Text style={styles.statLabel}>Disbursed</Text>
                        <Text style={[styles.statValue, { color: colors.danger }]}>${item.total_disbursed ?? '0'}</Text>
                    </View>
                    <View style={styles.statBox}>
                        <Text style={styles.statLabel}>Wallet Balance</Text>
                        <Text style={[styles.statValue, { color: colors.success }]}>${item.balance ?? '0'}</Text>
                    </View>
                </View>

                <View style={styles.beneficiarySection}>
                    <View style={styles.beneficiaryHeader}>
                        <Text style={styles.beneficiaryTitle}>Beneficiary Details</Text>
                        {!item.funds_disbursed && (
                            <TouchableOpacity onPress={() => setIsAssigningBeneficiary(item.id)}>
                                <Text style={styles.assignLink}>
                                    {item.beneficiary_detail ? 'Change' : 'Assign Beneficiary'}
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>
                    {item.beneficiary_detail ? (
                        <View style={styles.beneficiaryNameContainer}>
                            <Text style={styles.beneficiaryEmoji}>👤</Text>
                            <Text style={styles.beneficiaryName}>{item.beneficiary_detail.full_name}</Text>
                        </View>
                    ) : (
                        <View style={styles.emptyBeneficiary}>
                            <Text style={styles.emptyBeneficiaryText}>No beneficiary assigned yet.</Text>
                        </View>
                    )}
                </View>

                {parseFloat(item.balance || '0') > 0 && (
                    <TouchableOpacity
                        style={[styles.disburseButton, processingId === item.id && styles.disabledButton]}
                        onPress={() => handleDisburse(item.id)}
                        disabled={processingId !== null}
                    >
                        {processingId === item.id ? (
                            <ActivityIndicator color="#ffffff" size="small" />
                        ) : (
                            <Text style={styles.disburseButtonText}>Disburse ${item.balance}</Text>
                        )}
                    </TouchableOpacity>
                )}
            </View>
        );
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.subHeader}>
                <Text style={styles.groupName}>{group.name}</Text>

                <View style={{ flexDirection: 'row', gap: 8, marginVertical: 4 }}>
                    {onViewDuesLedger && (
                        <TouchableOpacity
                            style={[styles.campaignCreateBtn, { backgroundColor: '#00458b', flex: 1 }]}
                            onPress={onViewDuesLedger}
                        >
                            <Text style={styles.campaignCreateBtnText}>🗓️ Dues & Ledger</Text>
                        </TouchableOpacity>
                    )}
                    {onCreateCampaign && (
                        <TouchableOpacity
                            style={[styles.campaignCreateBtn, { flex: 1 }]}
                            onPress={onCreateCampaign}
                        >
                            <Text style={styles.campaignCreateBtnText}>💰 Create Campaign</Text>
                        </TouchableOpacity>
                    )}
                </View>

                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.tabsContainer}
                    contentContainerStyle={styles.tabsScrollContent}
                >
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'pending' && styles.activeTab]}
                        onPress={() => setActiveTab('pending')}
                    >
                        <Text style={[styles.tabText, activeTab === 'pending' && styles.activeTabText]}>
                            ⏳ Pending ({pendingMembers.length})
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'members' && styles.activeTab]}
                        onPress={() => setActiveTab('members')}
                    >
                        <Text style={[styles.tabText, activeTab === 'members' && styles.activeTabText]}>
                            👥 Members ({activeMembers.length})
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'payouts' && styles.activeTab]}
                        onPress={() => setActiveTab('payouts')}
                    >
                        <Text style={[styles.tabText, activeTab === 'payouts' && styles.activeTabText]}>
                            💸 Payouts ({deceasedMembers.length})
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'campaigns' && styles.activeTab]}
                        onPress={() => setActiveTab('campaigns')}
                    >
                        <Text style={[styles.tabText, activeTab === 'campaigns' && styles.activeTabText]}>
                            📢 Campaigns ({openCampaigns.length})
                        </Text>
                    </TouchableOpacity>
                    {closedCampaigns.length > 0 && (
                        <TouchableOpacity
                            style={[styles.tab, activeTab === 'closed' && styles.activeTab]}
                            onPress={() => setActiveTab('closed')}
                        >
                            <Text style={[styles.tabText, activeTab === 'closed' && styles.activeTabText]}>
                                🔒 Closed ({closedCampaigns.length})
                            </Text>
                        </TouchableOpacity>
                    )}
                    {group.is_admin && (
                        <TouchableOpacity
                            style={[styles.tab, activeTab === 'transfers' && styles.activeTab]}
                            onPress={() => setActiveTab('transfers')}
                        >
                            <Text style={[styles.tabText, activeTab === 'transfers' && styles.activeTabText]}>
                                🔄 Transfers ({transferRequests.length})
                            </Text>
                        </TouchableOpacity>
                    )}
                </ScrollView>
            </View>

            {loading ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color="#2563eb" />
                </View>
            ) : (
                <>
                    {group.is_admin && activeTab === 'transfers' && (
                        <TouchableOpacity
                            style={styles.createTransferButton}
                            onPress={() => setShowTransferModal(true)}
                        >
                            <Text style={styles.createTransferButtonText}>Create Transfer Request</Text>
                        </TouchableOpacity>
                    )}

                    <FlatList
                        data={
                            (activeTab === 'pending' ? pendingMembers :
                            activeTab === 'members' ? activeMembers :
                            activeTab === 'payouts' ? deceasedMembers :
                            activeTab === 'campaigns' ? openCampaigns :
                            activeTab === 'closed' ? closedCampaigns :
                            transferRequests) || []
                        }
                        keyExtractor={(item, index) => (item && item.id != null ? item.id.toString() : `item-${index}`)}
                        contentContainerStyle={styles.listContent}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={onRefresh}
                                colors={[colors.primaryLight]}
                                tintColor="#2563eb"
                            />
                        }
                        renderItem={({ item }) => {
                            if (!item) return null;
                            if (activeTab === 'payouts') {
                                return renderDeceasedItem({ item: item as DeceasedMember });
                            }
                            if (activeTab === 'transfers') {
                                return renderTransferRequestItem({ item });
                            }
                            if (activeTab === 'campaigns' || activeTab === 'closed') {
                                const meta = CAMPAIGN_TYPE_META[item.campaign_type] || CAMPAIGN_TYPE_META.custom;
                                const raised = parseFloat(item.total_raised || 0);
                                const target = item.target_amount ? parseFloat(item.target_amount) : null;
                                const progress = target ? Math.min((raised / target) * 100, 100) : null;
                                const isClosed = !item.contributions_open;
                                return (
                                    <TouchableOpacity
                                        style={[styles.campaignCard, isClosed && styles.campaignCardClosed]}
                                        onPress={() => onSelectCampaign && onSelectCampaign(item)}
                                        activeOpacity={0.85}
                                    >
                                        <View style={styles.campaignCardHeader}>
                                            <View style={[styles.campaignBadge, { backgroundColor: `${meta.color}18` }]}>
                                                <Text style={styles.campaignBadgeIcon}>{meta.icon}</Text>
                                                <Text style={[styles.campaignBadgeLabel, { color: meta.color }]}>{meta.label}</Text>
                                            </View>
                                            <View style={[styles.campaignStatusPill, { backgroundColor: isClosed ? colors.dangerLight : colors.successLight }]}>
                                                <Text style={[styles.campaignStatusText, { color: isClosed ? colors.danger : colors.success }]}>
                                                    {isClosed ? '🔒 Closed' : '● Open'}
                                                </Text>
                                            </View>
                                        </View>
                                        <Text style={styles.campaignTitle}>{item.title}</Text>
                                        {item.description ? (
                                            <Text style={styles.campaignDesc} numberOfLines={2}>{item.description}</Text>
                                        ) : null}
                                        <View style={styles.campaignStats}>
                                            <Text style={[styles.campaignRaised, { color: meta.color }]}>
                                                R{raised.toFixed(2)} raised
                                            </Text>
                                            {target !== null && (
                                                <Text style={styles.campaignTarget}>of R{target.toFixed(2)}</Text>
                                            )}
                                            <Text style={styles.campaignContributors}>· {item.contributor_count ?? 0} contributors</Text>
                                        </View>
                                        {progress !== null && (
                                            <View style={styles.campaignProgressTrack}>
                                                <View style={[styles.campaignProgressBar, { width: `${progress}%` as any, backgroundColor: meta.color }]} />
                                            </View>
                                        )}
                                        {/* Close button for admins on open campaigns */}
                                        {group.is_admin && !isClosed && (
                                            <TouchableOpacity
                                                style={styles.closeCampaignButton}
                                                onPress={(e) => {
                                                    e.stopPropagation();
                                                    handleCloseCampaign(item.id, item.title);
                                                }}
                                                disabled={processingId === item.id}
                                            >
                                                {processingId === item.id ? (
                                                    <ActivityIndicator color="#991b1b" size="small" />
                                                ) : (
                                                    <Text style={styles.closeCampaignButtonText}>🔒 Close Campaign</Text>
                                                )}
                                            </TouchableOpacity>
                                        )}
                                    </TouchableOpacity>
                                );
                            }
                            return renderMemberItem({ item: item as Member });
                        }}
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <Text style={styles.emptyText}>
                                    {activeTab === 'pending' ? 'No pending requests.' :
                                        activeTab === 'members' ? 'No active members.' :
                                            activeTab === 'campaigns' ? 'No open campaigns. Create one above.' :
                                                activeTab === 'closed' ? 'No closed campaigns.' :
                                                    activeTab === 'payouts' ? 'No funeral funds recorded.' :
                                                        'No transfer requests have been created yet.'}
                                </Text>
                            </View>
                        }
                    />
                </>
            )}

            {showTransferModal && (() => {
                const concurrentCampaigns = [
                    ...activeCampaigns.filter(c => !c.funds_disbursed).map(c => ({
                        id: c.id,
                        key: `generic_${c.id}`,
                        title: c.title,
                        type: 'generic',
                        campaign_type: c.campaign_type,
                        balance: c.balance || '0.00'
                    })),
                    ...deceasedMembers.filter(d => !d.funds_disbursed).map(d => ({
                        id: d.id,
                        key: `deceased_${d.id}`,
                        title: `Bereavement: ${d.deceased_detail.full_name}`,
                        type: 'deceased',
                        campaign_type: 'bereavement',
                        balance: d.balance || '0.00'
                    }))
                ];
                
                return (
                    <View style={[styles.modalOverlay, { paddingTop: insets.top }]}> 
                        <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>Request Wallet Transfer</Text>
                            <Text style={styles.modalSubtitle}>Select a recipient and amount, then submit for admin approvals.</Text>
                            <ScrollView 
                                style={styles.modalFormScroll}
                                contentContainerStyle={styles.modalFormContent}
                                nestedScrollEnabled={true}
                                showsVerticalScrollIndicator={false}
                            >
                                <Text style={styles.modalLabel}>Recipient</Text>
                                {(() => {
                                    const selectedRecipient = activeMembers.find(m => m.member_detail.id === selectedRecipientId);
                                    return (
                                        <>
                                            <TouchableOpacity
                                                style={styles.pickerBtn}
                                                onPress={() => setShowMemberPicker(!showMemberPicker)}
                                            >
                                                <Text style={[styles.pickerBtnText, !selectedRecipient && { color: colors.textMuted }]}>
                                                    {selectedRecipient
                                                        ? `👤 ${selectedRecipient.member_detail.full_name}`
                                                        : 'Select a member...'}
                                                </Text>
                                                <Text style={styles.pickerArrow}>{showMemberPicker ? '▲' : '▼'}</Text>
                                            </TouchableOpacity>

                                            {showMemberPicker && (
                                                <ScrollView style={styles.memberDropdownList} nestedScrollEnabled={true}>
                                                    {activeMembers.length === 0 ? (
                                                        <Text style={styles.noMembersText}>No active members available.</Text>
                                                    ) : (
                                                        activeMembers.map((member) => (
                                                            <TouchableOpacity
                                                                key={member.id}
                                                                style={[
                                                                    styles.memberRow,
                                                                    selectedRecipientId === member.member_detail.id && styles.memberRowSelected,
                                                                ]}
                                                                onPress={() => {
                                                                    setSelectedRecipientId(member.member_detail.id);
                                                                    setShowMemberPicker(false);
                                                                }}
                                                            >
                                                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                                    <View style={styles.modalMemberAvatarSmall}>
                                                                        <Text style={styles.modalAvatarTextSmall}>{member.member_detail.full_name[0]}</Text>
                                                                    </View>
                                                                    <Text style={styles.memberName}>{member.member_detail.full_name}</Text>
                                                                </View>
                                                                {selectedRecipientId === member.member_detail.id && (
                                                                    <Text style={styles.memberCheck}>✓</Text>
                                                                )}
                                                            </TouchableOpacity>
                                                        ))
                                                    )}
                                                </ScrollView>
                                            )}
                                        </>
                                    );
                                })()}
                                
                                {concurrentCampaigns.length > 1 && (
                                    <>
                                        <View style={{ height: 16 }} />
                                        <Text style={styles.modalLabel}>Campaign / Fund (Optional)</Text>
                                        {(() => {
                                            const selectedCampaign = concurrentCampaigns.find(c => c.key === selectedCampaignKey);
                                            return (
                                                <>
                                                    <TouchableOpacity
                                                        style={styles.pickerBtn}
                                                        onPress={() => setShowCampaignPicker(!showCampaignPicker)}
                                                    >
                                                        <Text style={[styles.pickerBtnText, !selectedCampaign && { color: colors.textMuted }]}>
                                                            {selectedCampaign
                                                                ? `${CAMPAIGN_TYPE_META[selectedCampaign.campaign_type]?.icon || '✨'} ${selectedCampaign.title}`
                                                                : 'Select campaign / fund...'}
                                                        </Text>
                                                        <Text style={styles.pickerArrow}>{showCampaignPicker ? '▲' : '▼'}</Text>
                                                    </TouchableOpacity>

                                                    {showCampaignPicker && (
                                                        <ScrollView style={styles.memberDropdownList} nestedScrollEnabled={true}>
                                                            <TouchableOpacity
                                                                style={[
                                                                    styles.memberRow,
                                                                    !selectedCampaignKey && styles.memberRowSelected,
                                                                ]}
                                                                onPress={() => {
                                                                    setSelectedCampaignKey(null);
                                                                    setShowCampaignPicker(false);
                                                                }}
                                                            >
                                                                <Text style={styles.memberName}>None (General Wallet)</Text>
                                                                {!selectedCampaignKey && (
                                                                    <Text style={styles.memberCheck}>✓</Text>
                                                                )}
                                                            </TouchableOpacity>
                                                            {concurrentCampaigns.map((campaign) => (
                                                                <TouchableOpacity
                                                                    key={campaign.key}
                                                                    style={[
                                                                        styles.memberRow,
                                                                        selectedCampaignKey === campaign.key && styles.memberRowSelected,
                                                                    ]}
                                                                    onPress={() => {
                                                                        setSelectedCampaignKey(campaign.key);
                                                                        setShowCampaignPicker(false);
                                                                    }}
                                                                >
                                                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                                        <Text style={{ fontSize: 18, marginRight: 8 }}>
                                                                            {CAMPAIGN_TYPE_META[campaign.campaign_type]?.icon || '✨'}
                                                                        </Text>
                                                                        <View>
                                                                            <Text style={styles.memberName}>{campaign.title}</Text>
                                                                            <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                                                                                Balance: R{parseFloat(campaign.balance).toFixed(2)}
                                                                            </Text>
                                                                        </View>
                                                                    </View>
                                                                    {selectedCampaignKey === campaign.key && (
                                                                        <Text style={styles.memberCheck}>✓</Text>
                                                                    )}
                                                                </TouchableOpacity>
                                                            ))}
                                                        </ScrollView>
                                                    )}
                                                </>
                                            );
                                        })()}
                                    </>
                                )}

                                <View style={{ height: 16 }} />

                                <Text style={styles.modalLabel}>Amount</Text>
                                <TextInput
                                    style={[styles.textInput, transferError ? styles.inputError : undefined]}
                                    keyboardType="numeric"
                                    placeholder="Enter amount"
                                    value={transferAmount}
                                    onChangeText={(text) => {
                                        setTransferAmount(text);
                                        if (transferError) setTransferError(null);
                                    }}
                                />
                                {transferError && <Text style={styles.errorText}>{transferError}</Text>}
                            </ScrollView>
                            <View style={styles.modalButtonsRow}>
                                <TouchableOpacity
                                    style={styles.modalCancelButton}
                                    onPress={() => {
                                        setShowTransferModal(false);
                                        setShowMemberPicker(false);
                                        setShowCampaignPicker(false);
                                        setSelectedRecipientId(null);
                                        setSelectedCampaignKey(null);
                                        setTransferError(null);
                                    }}
                                >
                                    <Text style={styles.modalCancelButtonText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.modalSubmitButton, processingId === -1 && styles.disabledButton]}
                                    onPress={handleCreateTransferRequest}
                                    disabled={processingId === -1}
                                >
                                    {processingId === -1 ? (
                                        <ActivityIndicator color="#fff" />
                                    ) : (
                                        <Text style={styles.modalSubmitButtonText}>Submit</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                );
            })()}

            {/* Beneficiary Selection Modal */}
            {isAssigningBeneficiary && (
                <View style={[styles.modalOverlay, { paddingTop: insets.top }]}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Select Beneficiary</Text>
                        <Text style={styles.modalSubtitle}>Assign a community member to receive the funds.</Text>
                        <ScrollView style={styles.memberScrollView}>
                            {activeMembers.map((member) => (
                                <TouchableOpacity
                                    key={member.id}
                                    style={styles.modalMemberItem}
                                    onPress={() => handleAssignBeneficiary(isAssigningBeneficiary, member.member_detail.id)}
                                >
                                    <View style={styles.modalMemberAvatar}>
                                        <Text style={styles.modalAvatarText}>{member.member_detail.full_name[0]}</Text>
                                    </View>
                                    <Text style={styles.modalMemberName}>{member.member_detail.full_name}</Text>
                                    <Text style={styles.modalSelectText}>Select</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                        <TouchableOpacity
                            style={styles.modalCloseButton}
                            onPress={() => setIsAssigningBeneficiary(null)}
                        >
                            <Text style={styles.modalCloseButtonText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
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
        marginBottom: 12,
    },
    campaignCreateBtn: {
        backgroundColor: colors.success,
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 8,
        alignSelf: 'flex-start',
        marginBottom: 12,
    },
    campaignCreateBtnText: {
        color: colors.white,
        fontSize: 13,
        fontWeight: '700',
    },
    tabsContainer: {
        marginTop: 4,
        marginBottom: 8,
    },
    tabsScrollContent: {
        paddingHorizontal: 2,
        paddingVertical: 4,
    },
    tab: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        backgroundColor: colors.borderLight,
        borderWidth: 1,
        borderColor: colors.border,
        marginRight: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    activeTab: {
        backgroundColor: colors.primaryLight,
        borderColor: colors.primaryLight,
        elevation: 2,
        shadowColor: colors.primaryLight,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    tabText: {
        fontSize: 13,
        color: colors.textSecondary,
        fontWeight: '600',
    },
    activeTabText: {
        color: colors.white,
        fontWeight: '700',
    },
    listContent: {
        padding: 16,
    },
    requestCard: {
        backgroundColor: colors.white,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    memberInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    avatarCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
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
    requestDate: {
        fontSize: 13,
        color: colors.textSecondary,
    },
    deceasedBadge: {
        backgroundColor: colors.dangerLight,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: colors.dangerLight,
    },
    deceasedBadgeText: {
        color: colors.danger,
        fontSize: 10,
        fontWeight: 'bold',
    },
    actions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    actionButton: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 8,
        alignItems: 'center',
    },
    approveButton: {
        backgroundColor: colors.primaryLight,
        marginRight: 8,
    },
    rejectButton: {
        backgroundColor: colors.white,
        borderWidth: 1,
        borderColor: colors.border,
        marginLeft: 8,
    },
    approveButtonText: {
        color: colors.white,
        fontWeight: 'bold',
        fontSize: 14,
    },
    rejectButtonText: {
        color: colors.textSecondary,
        fontWeight: 'bold',
        fontSize: 14,
    },
    disabledButton: {
        opacity: 0.5,
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
    // Payout Stats styles
    statsGrid: {
        flexDirection: 'row',
        backgroundColor: colors.background,
        borderRadius: 8,
        padding: 12,
        marginBottom: 16,
    },
    statBox: {
        flex: 1,
        alignItems: 'center',
    },
    statLabel: {
        fontSize: 10,
        color: colors.textSecondary,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        marginBottom: 4,
    },
    statValue: {
        fontSize: 14,
        fontWeight: 'bold',
        color: colors.textPrimary,
    },
    beneficiarySection: {
        marginBottom: 16,
    },
    beneficiaryHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    beneficiaryTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        color: colors.textSecondary,
        textTransform: 'uppercase',
    },
    assignLink: {
        fontSize: 12,
        color: colors.primaryLight,
        fontWeight: 'bold',
    },
    beneficiaryNameContainer: {
        flexDirection: 'row',
        alignItems: 'center',
                padding: 8,
        borderRadius: 6,
    },
    beneficiaryEmoji: {
        marginRight: 6,
    },
    beneficiaryName: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.primaryLight,
    },
    emptyBeneficiary: {
        padding: 8,
        borderWidth: 1,
        borderColor: colors.surfaceLight,
        borderStyle: 'dashed',
        borderRadius: 6,
    },
    emptyBeneficiaryText: {
        fontSize: 12,
        color: colors.textMuted,
        fontStyle: 'italic',
    },
    disburseButton: {
        backgroundColor: colors.success,
        borderRadius: 8,
        paddingVertical: 12,
        alignItems: 'center',
        marginTop: 8,
    },
    disburseButtonText: {
        color: colors.white,
        fontWeight: 'bold',
        fontSize: 14,
    },
    // Modal styles
    modalOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: colors.white,
        borderRadius: 16,
        width: '100%',
        maxHeight: '85%',
        padding: 20,
        flexShrink: 1,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: colors.textPrimary,
        marginBottom: 4,
    },
    modalSubtitle: {
        fontSize: 14,
        color: colors.textSecondary,
        marginBottom: 20,
    },
    modalLabel: {
        fontSize: 14,
        color: colors.textPrimary,
        fontWeight: '600',
        marginBottom: 8,
    },
    memberScrollView: {
        marginBottom: 20,
    },
    modalMemberItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.surfaceLight,
    },
    modalMemberAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    modalAvatarText: {
        color: colors.white,
        fontWeight: 'bold',
        fontSize: 14,
    },
    modalMemberName: {
        flex: 1,
        fontSize: 15,
        color: colors.textPrimary,
        fontWeight: '600',
    },
    modalSelectText: {
        fontSize: 12,
        color: colors.primaryLight,
        fontWeight: 'bold',
    },
    modalCloseButton: {
        paddingVertical: 12,
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: colors.surfaceLight,
    },
    modalCloseButtonText: {
        fontSize: 16,
        color: colors.danger,
        fontWeight: 'bold',
    },
    createTransferButton: {
        marginHorizontal: 16,
        marginBottom: 12,
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: colors.primaryLight,
        alignItems: 'center',
    },
    createTransferButtonText: {
        color: colors.white,
        fontWeight: '700',
        fontSize: 14,
    },
    selectedMemberItem: {
        backgroundColor: colors.surfaceLight,
    },
    textInput: {
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 10,
        marginBottom: 12,
        color: colors.textPrimary,
    },
    modalFormScroll: {
        flexGrow: 1,
        flexShrink: 1,
        marginBottom: 8,
    },
    modalFormContent: {
        paddingBottom: 16,
    },
    inputError: {
        borderColor: colors.danger,
        borderWidth: 1.5,
    },
    errorText: {
        color: colors.danger,
        fontSize: 13,
        marginTop: -8,
        marginBottom: 8,
        fontWeight: '500',
    },
    modalCancelButton: {
        flex: 1,
        backgroundColor: colors.surfaceLight,
        borderRadius: 12,
        paddingVertical: 12,
        alignItems: 'center',
        marginRight: 8,
    },
    modalCancelButtonText: {
        fontSize: 15,
        color: colors.textSecondary,
        fontWeight: 'bold',
    },
    modalSubmitButton: {
        flex: 1,
        backgroundColor: colors.primaryLight,
        borderRadius: 12,
        paddingVertical: 12,
        alignItems: 'center',
        marginLeft: 8,
    },
    modalSubmitButtonText: {
        fontSize: 15,
        color: colors.white,
        fontWeight: 'bold',
    },
    modalButtonsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 12,
    },
    pickerBtn: {
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 12,
        padding: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    pickerBtnText: {
        fontSize: 15,
        color: colors.textPrimary,
    },
    pickerArrow: {
        fontSize: 12,
        color: colors.textMuted,
    },
    memberDropdownList: {
        backgroundColor: colors.white,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        marginTop: 4,
        maxHeight: 220,
        marginBottom: 12,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 6,
    },
    memberRow: {
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.surfaceLight,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    memberRowSelected: {
        backgroundColor: colors.surfaceLight,
    },
    memberCheck: {
        fontSize: 16,
        color: colors.primaryLight,
        fontWeight: 'bold',
    },
    noMembersText: {
        padding: 16,
        color: colors.textMuted,
        textAlign: 'center',
        fontStyle: 'italic',
    },
    modalMemberAvatarSmall: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: colors.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalAvatarTextSmall: {
        color: colors.white,
        fontWeight: 'bold',
        fontSize: 11,
    },
    // ── Campaign card styles ──────────────────────────────────────────────────
    campaignCard: {
        backgroundColor: colors.white,
        borderRadius: 16,
        padding: 16,
        marginHorizontal: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: colors.borderLight,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 2,
    },
    campaignCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    campaignBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 20,
        paddingVertical: 4,
        paddingHorizontal: 10,
        gap: 4,
    },
    campaignBadgeIcon: {
        fontSize: 13,
    },
    campaignBadgeLabel: {
        fontSize: 12,
        fontWeight: '600',
    },
    campaignStatusPill: {
        borderRadius: 20,
        paddingVertical: 3,
        paddingHorizontal: 10,
    },
    campaignStatusText: {
        fontSize: 11,
        fontWeight: '700',
    },
    campaignTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.textPrimary,
        marginBottom: 4,
    },
    campaignDesc: {
        fontSize: 13,
        color: colors.textSecondary,
        marginBottom: 8,
        lineHeight: 18,
    },
    campaignStats: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        flexWrap: 'wrap',
        marginBottom: 8,
    },
    campaignRaised: {
        fontSize: 14,
        fontWeight: '700',
    },
    campaignTarget: {
        fontSize: 13,
        color: colors.textMuted,
    },
    campaignContributors: {
        fontSize: 13,
        color: colors.textMuted,
    },
    campaignProgressTrack: {
        height: 5,
        backgroundColor: colors.borderLight,
        borderRadius: 3,
        overflow: 'hidden',
    },
    campaignProgressBar: {
        height: 5,
        borderRadius: 3,
    },
    campaignCardClosed: {
        opacity: 0.75,
        borderColor: colors.border,
        borderStyle: 'dashed',
    },
    closeCampaignButton: {
        marginTop: 12,
        paddingVertical: 10,
        borderRadius: 10,
        borderWidth: 1.5,
        borderColor: colors.dangerLight,
        backgroundColor: colors.dangerLight,
        alignItems: 'center',
    },
    closeCampaignButtonText: {
        fontSize: 13,
        fontWeight: '700',
        color: colors.danger,
    },
    transferHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    transferTitle: {
        fontSize: 15,
        fontWeight: 'bold',
        color: colors.textPrimary,
        flex: 1,
    },
    transferStatus: {
        fontSize: 11,
        fontWeight: '700',
        color: colors.primaryLight,
        backgroundColor: colors.surfaceLight,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    transferAmount: {
        fontSize: 20,
        fontWeight: 'bold',
        color: colors.primary,
        marginBottom: 6,
    },
    transferMeta: {
        fontSize: 12,
        color: colors.textSecondary,
        marginBottom: 2,
    },
    transferActions: {
        marginTop: 10,
        flexDirection: 'row',
        justifyContent: 'flex-end',
    },
    transferExecutedText: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.success,
    },
});

export default GroupManagementScreen;
