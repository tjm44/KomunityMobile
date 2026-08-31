import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    ActivityIndicator, ScrollView, RefreshControl,
    Modal, TextInput, Alert, KeyboardAvoidingView, Platform
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import client, { getMediaUrl } from '../api/client';
import { authenticateAction } from '../utils/biometrics';
import { validateAmount, validatePhone } from '../utils/validation';
import { colors, gradients } from '../constants/theme';

const CAMPAIGN_TYPE_META: Record<string, { icon: string; color: string; label: string }> = {
    bereavement: { icon: '🕊️', color: colors.primary, label: 'Bereavement' },
    excess:      { icon: '🚗', color: colors.primaryLight, label: 'Insurance Excess' },
    emergency:   { icon: '🆘', color: colors.danger, label: 'Emergency' },
    custom:      { icon: '✨', color: colors.success, label: 'Custom' },
};

const RETAIL_PARTNERS = ['Shoprite', 'Pick n Pay', 'Checkers', 'Spar', 'Boxer', 'Flash', '1Voucher'];
const NETWORK_PROVIDERS = ['MTN', 'Vodacom', 'Cell C', 'Telkom', 'Airtel', 'EcoCash'];

interface Transaction {
    id: number;
    transaction_type: string;
    amount: string;
    fee_amount?: string;
    net_amount?: string;
    status: string;
    timestamp: string;
    note?: string;
    withdrawal_channel?: string;
    withdrawal_metadata?: {
        voucher_code?: string;
        partner?: string;
        [key: string]: any;
    };
    destination_group_detail?: {
        id?: number;
        name: string;
    };
    recipient_wallet_detail?: {
        user_id?: number;
        full_name?: string;
        user_email?: string;
    };
    sender_wallet_detail?: {
        user_id?: number;
        full_name?: string;
        user_email?: string;
    };
    wallet_detail?: {
        user_id?: number;
        user_email?: string;
        full_name?: string;
    };
    fund_campaign_detail?: {
        id?: number;
        title: string;
        campaign_type?: string;
    };
    deceased_contribution_detail?: {
        full_name: string;
        group?: string;
    };
    description?: string;
    from_label?: {
        full_name?: string;
        email?: string;
    };
    to_label?: {
        full_name?: string;
        email?: string;
    };
}

const WalletScreen = ({
    onBack,
    onViewContributions,
    initialCampaign,
    onClearInitialCampaign
}: {
    onBack: () => void;
    onViewContributions?: () => void;
    initialCampaign?: any;
    onClearInitialCampaign?: () => void;
}) => {
    const insets = useSafeAreaInsets();
    const [balance, setBalance] = useState<string>('0.00');
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [expandedTransactionId, setExpandedTransactionId] = useState<number | null>(null);

    // Top Up States
    const [showTopUp, setShowTopUp] = useState(false);
    const [topUpMethod, setTopUpMethod] = useState<'voucher' | 'card'>('voucher');
    const [voucherPin, setVoucherPin] = useState('');
    const [cardAmount, setCardAmount] = useState('');
    const [cardNumber, setCardNumber] = useState('');
    const [cardExpiry, setCardExpiry] = useState('');
    const [cardCvv, setCardCvv] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [topUpError, setTopUpError] = useState<string | null>(null);

    // Send Money States
    const [showSendMoney, setShowSendMoney] = useState(false);
    const [sendAmount, setSendAmount] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [members, setMembers] = useState<any[]>([]);
    const [selectedRecipient, setSelectedRecipient] = useState<any>(null);
    const [isSending, setIsSending] = useState(false);
    const [sendError, setSendError] = useState<string | null>(null);

    // Contribute States
    const [showContribute, setShowContribute] = useState(false);
    const [activeCampaigns, setActiveCampaigns] = useState<any[]>([]);
    const [selectedCampaign, setSelectedCampaign] = useState<any>(null);
    const [contributeAmount, setContributeAmount] = useState('');
    const [isContributing, setIsContributing] = useState(false);
    const [contributeError, setContributeError] = useState<string | null>(null);
    const [joinedGroups, setJoinedGroups] = useState<any[]>([]);

    // Withdraw States
    const [showWithdraw, setShowWithdraw] = useState(false);
    const [withdrawChannel, setWithdrawChannel] = useState<'bank_transfer' | 'mobile_money' | 'voucher' | 'send_money'>('bank_transfer');
    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [withdrawAccountNumber, setWithdrawAccountNumber] = useState('');
    const [withdrawBankCode, setWithdrawBankCode] = useState('');
    const [withdrawPhoneNumber, setWithdrawPhoneNumber] = useState('');
    const [withdrawProvider, setWithdrawProvider] = useState('MTN');
    const [withdrawVoucherCode, setWithdrawVoucherCode] = useState('');
    const [withdrawPartner, setWithdrawPartner] = useState('Shoprite');
    const [withdrawError, setWithdrawError] = useState<string | null>(null);
    const [isWithdrawing, setIsWithdrawing] = useState(false);

    const [activeGroupOrOrg, setActiveGroupOrOrg] = useState<string | null>(null);
    const [activeGroupId, setActiveGroupId] = useState<number | null>(null);

    useEffect(() => {
        fetchData();
        fetchMembers();
    }, []);

    useEffect(() => {
        if (initialCampaign) {
            setSelectedCampaign(initialCampaign);
            setShowContribute(true);
            onClearInitialCampaign?.();
        }
    }, [initialCampaign]);

    const fetchData = async () => {
        try {
            const [balanceRes, transRes, groupsRes] = await Promise.all([
                client.get('wallets/balance/'),
                client.get('transactions/'),
                client.get('groups/mine/').catch(() => ({ data: [] }))
            ]);
            setBalance(balanceRes.data.balance);
            setTransactions(transRes.data);
            const groups = Array.isArray(groupsRes.data) ? groupsRes.data : [];
            setJoinedGroups(groups);
            const activeGroup = groups.find((g: any) => g.is_selected) || groups[0] || null;
            setActiveGroupOrOrg(activeGroup ? activeGroup.name : null);
            const targetGroupId = activeGroup ? activeGroup.id : null;
            setActiveGroupId(targetGroupId);
            fetchActiveCampaigns(targetGroupId);
        } catch (error) {
            console.error('Error fetching wallet data:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    const handleTopUp = async () => {
        setTopUpError(null);
        setIsSubmitting(true);
        try {
            if (topUpMethod === 'voucher') {
                if (!voucherPin.trim()) {
                    setTopUpError('Please enter your 1Voucher PIN.');
                    setIsSubmitting(false);
                    return;
                }
                await client.post('wallets/top_up/', {
                    payment_method: 'voucher',
                    voucher_pin: voucherPin.trim()
                });
                Alert.alert('Success', 'Voucher redeemed successfully! Your balance has been updated.');
            } else {
                const parts = cardExpiry.split('/');
                const expiry_month = parts[0]?.trim() || '';
                const expiry_year = parts[1]?.trim() || '';
                if (!cardAmount || !cardNumber || !expiry_month || !expiry_year || !cardCvv) {
                    setTopUpError('All card fields are required.');
                    setIsSubmitting(false);
                    return;
                }
                await client.post('wallets/top_up/', {
                    payment_method: 'card',
                    amount: cardAmount,
                    card_number: cardNumber.replace(/\s+/g, ''),
                    expiry_month,
                    expiry_year,
                    cvv: cardCvv
                });
                Alert.alert('Success', 'Card payment processed successfully! Your balance has been updated.');
            }
            setShowTopUp(false);
            setVoucherPin('');
            setCardAmount('');
            setCardNumber('');
            setCardExpiry('');
            setCardCvv('');
            fetchData();
        } catch (error: any) {
            console.error('Top up error:', error);
            const errorMsg = error.response?.data?.error || 'Top-up failed. Please check your details and try again.';
            setTopUpError(errorMsg);
        } finally {
            setIsSubmitting(false);
        }
    };

    const fetchMembers = async () => {
        try {
            // Audit: Only fetch members of the currently active group
            const response = await client.get('groups/active_members/');
            setMembers(response.data);
        } catch (error) {
            console.error('Error fetching members:', error);
        }
    };

    const handleSendMoney = async () => {
        if (!selectedRecipient) {
            setSendError('Please select a member to send money to.');
            return;
        }

        const amtError = validateAmount(sendAmount, 0, parseFloat(balance));
        if (amtError) {
            setSendError(amtError);
            return;
        }

        setSendError(null);

        // Authenticate before sending money
        const authenticated = await authenticateAction(`Authenticate to send ${formatCurrency(sendAmount)} to ${selectedRecipient.member_detail.full_name}`);
        if (!authenticated) return;

        setIsSending(true);
        try {
            console.log('Selected recipient:', selectedRecipient);
            console.log('Sending to user ID:', selectedRecipient.member_detail.user);

            const payload = {
                recipient_user_id: selectedRecipient.member_detail.user,
                amount: sendAmount
            };

            console.log('Send money payload:', payload);

            await client.post('wallets/send_money/', payload);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert('Success', `Successfully sent ${formatCurrency(sendAmount)} to ${selectedRecipient.member_detail.full_name}`);
            setShowSendMoney(false);
            setShowWithdraw(false);
            setSendAmount('');
            setSelectedRecipient(null);
            setSearchQuery('');
            fetchData(); // Refresh balance and history
        } catch (error: any) {
            console.error('Send money error:', error);
            console.error('Error response:', error.response?.data);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            const errorMsg = error.response?.data?.error || 'Failed to send money. Please try again.';
            Alert.alert('Error', errorMsg);
        } finally {
            setIsSending(false);
        }
    };

    const handleWithdraw = async () => {
        const amtError = validateAmount(withdrawAmount, 0, parseFloat(balance));
        if (amtError) {
            setWithdrawError(amtError);
            return;
        }

        const metadata: Record<string, string> = {};
        if (withdrawChannel === 'bank_transfer') {
            if (!withdrawAccountNumber.trim()) {
                setWithdrawError('Account number is required.');
                return;
            }
            if (!withdrawBankCode.trim()) {
                setWithdrawError('Bank code is required.');
                return;
            }
            metadata.account_number = withdrawAccountNumber.trim();
            metadata.bank_code = withdrawBankCode.trim();
        } else if (withdrawChannel === 'mobile_money') {
            const phoneError = validatePhone(withdrawPhoneNumber.trim());
            if (!withdrawPhoneNumber.trim()) {
                setWithdrawError('Mobile money number is required.');
                return;
            }
            if (phoneError) {
                setWithdrawError(phoneError);
                return;
            }
            if (!withdrawProvider.trim()) {
                setWithdrawError('Network provider is required.');
                return;
            }
            metadata.phone_number = withdrawPhoneNumber.trim();
            metadata.provider = withdrawProvider.trim();
        } else if (withdrawChannel === 'voucher') {
            if (!withdrawPartner.trim()) {
                setWithdrawError('Retail partner is required.');
                return;
            }
            metadata.partner = withdrawPartner.trim();
        }

        setWithdrawError(null);
        const authenticated = await authenticateAction(`Authenticate withdrawal of ${formatCurrency(withdrawAmount)}`);
        if (!authenticated) return;

        setIsWithdrawing(true);
        try {
            const res = await client.post('wallets/withdraw/', {
                amount: withdrawAmount,
                channel: withdrawChannel,
                metadata,
                currency: 'ZAR'
            });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

            // If voucher withdrawal, show the voucher code prominently
            if (res.data?.voucher_code) {
                Alert.alert(
                    '🎫 Voucher Ready!',
                    `Withdrawal of ${formatCurrency(withdrawAmount)} successful!\n\n` +
                    `Your Voucher Code:\n${res.data.voucher_code}\n\n` +
                    `Redeem at: ${res.data.partner || withdrawPartner}\n\n` +
                    `Present this code at your chosen retail partner to collect your cash.`,
                    [{ text: 'OK', style: 'default' }]
                );
            } else {
                Alert.alert('Success', `Withdrawal of ${formatCurrency(withdrawAmount)} requested successfully via ${withdrawChannel.replace(/_/g, ' ')}.`);
            }

            setShowWithdraw(false);
            setWithdrawAmount('');
            setWithdrawAccountNumber('');
            setWithdrawBankCode('');
            setWithdrawPhoneNumber('');
            setWithdrawProvider('');
            setWithdrawVoucherCode('');
            setWithdrawPartner('');
            setWithdrawError(null);
            fetchData();
        } catch (error: any) {
            console.error('Withdraw error:', error);
            const errorMsg = error.response?.data?.error || 'Failed to submit withdrawal request. Please try again.';
            Alert.alert('Error', errorMsg);
            setWithdrawError(errorMsg);
        } finally {
            setIsWithdrawing(false);
        }
    };

    const fetchActiveCampaigns = async (grpId?: number | null) => {
        try {
            const targetId = grpId !== undefined ? grpId : activeGroupId;
            const endpoint = targetId ? `campaigns/?group=${targetId}` : 'campaigns/';
            const response = await client.get(endpoint);
            const data = Array.isArray(response.data) ? response.data : response.data?.results || [];
            const openCampaigns = data.filter((c: any) => c.contributions_open);
            setActiveCampaigns(openCampaigns);
        } catch (error) {
            console.error('Error fetching active campaigns:', error);
        }
    };

    /**
     * Build the combined list of items shown in the Contribute modal:
     * 1. Active fundraiser campaigns for the active group
     * 2. Active group's pending recurring cycle contribution
     */
    const getContributeItems = () => {
        const campaignItems = activeCampaigns.map((c: any) => ({ type: 'campaign' as const, data: c }));

        const pendingCycleItems = joinedGroups
            .filter((g: any) =>
                (!activeGroupId || g.id === activeGroupId) &&
                g.is_active !== false &&
                g.enable_recurring_contributions &&
                g.active_cycle &&
                g.my_cycle_status?.status !== 'paid'
            )
            .map((g: any) => ({ type: 'cycle' as const, data: g }));

        return [...pendingCycleItems, ...campaignItems];
    };

    const handleContributeToCampaign = async () => {
        if (!selectedCampaign) {
            setContributeError('Please select a campaign or contribution to pay.');
            return;
        }

        const amtError = validateAmount(contributeAmount, 0, parseFloat(balance));
        if (amtError) {
            setContributeError(amtError);
            return;
        }

        setContributeError(null);

        const isCycle = selectedCampaign._type === 'cycle' || !!selectedCampaign.active_cycle || !!selectedCampaign.enable_recurring_contributions || !!selectedCampaign.cycle_month;
        const targetGroupId = selectedCampaign.group?.id || (typeof selectedCampaign.group === 'number' ? selectedCampaign.group : null) || selectedCampaign.id;
        const cycleId = selectedCampaign.active_cycle?.id || (selectedCampaign.cycle_month ? selectedCampaign.id : undefined);

        const label = isCycle
            ? `${selectedCampaign.name || selectedCampaign.group_name || 'Community'} – ${selectedCampaign.active_cycle?.title || selectedCampaign.title || 'Monthly Dues'}`
            : selectedCampaign.title;

        const authenticated = await authenticateAction(`Authenticate to contribute ${formatCurrency(contributeAmount)} to "${label}"`);
        if (!authenticated) return;

        setIsContributing(true);
        try {
            if (isCycle) {
                await client.post(`groups/${targetGroupId}/pay_cycle/`, {
                    amount: parseFloat(contributeAmount),
                    ...(cycleId ? { cycle_id: cycleId } : {})
                });
            } else {
                await client.post(`campaigns/${selectedCampaign.id}/contribute/`, {
                    amount: parseFloat(contributeAmount)
                });
            }

            Alert.alert(
                'Contribution Successful',
                `You contributed ${formatCurrency(contributeAmount)} to "${label}".`
            );
            setShowContribute(false);
            setContributeAmount('');
            setSelectedCampaign(null);
            fetchData(); // Refresh balance and history
            fetchActiveCampaigns(); // Refresh campaigns list
        } catch (error: any) {
            console.error('Contribution error:', error);
            const errorMsg = error.response?.data?.error
                || error.response?.data?.non_field_errors?.[0]
                || 'Failed to process contribution. Please try again.';
            Alert.alert('Error', errorMsg);
        } finally {
            setIsContributing(false);
        }
    };

    const formatCurrency = (amount: string) => {
        return new Intl.NumberFormat('en-ZA', {
            style: 'currency',
            currency: 'ZAR',
        }).format(parseFloat(amount));
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const getTransactionIcon = (type: string) => {
        switch (type) {
            case 'TOP_UP': return '💰';
            case 'TRANSFER': return '📤';
            case 'WITHDRAWAL': return '📥';
            case 'PAYOUT_RECEIVED': return '🎁';
            case 'P2P_SENT': return '💸';
            case 'P2P_RECEIVED': return '💵';
            default: return '💸';
        }
    };

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#2563eb" />
            </View>
        );
    }

    const contributeItems = getContributeItems();

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack} style={styles.backButton}>
                    <Text style={styles.backButtonText}>←</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>My Wallet</Text>
                {activeGroupOrOrg ? (
                    <View style={styles.activeEntityContainer}>
                        <Text style={styles.activeEntityText} numberOfLines={1}>
                            {activeGroupOrOrg}
                        </Text>
                    </View>
                ) : (
                    <View style={{ width: 40 }} />
                )}
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            >
                <View style={styles.balanceCard}>
                    <Text style={styles.balanceLabel}>Current Balance</Text>
                    <Text style={styles.balanceAmount}>{formatCurrency(balance)}</Text>

                    <View style={styles.quickActions}>
                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => setShowTopUp(true)}
                        >
                            <Text style={styles.actionIcon}>➕</Text>
                            <Text style={styles.actionText}>Top Up</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => { setWithdrawChannel('bank_transfer'); setShowWithdraw(true); }}
                        >
                            <Text style={styles.actionIcon}>📤</Text>
                            <Text style={styles.actionText}>Withdraw</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => setShowContribute(true)}
                        >
                            <Text style={styles.actionIcon}>🤝</Text>
                            <Text style={styles.actionText}>Contribute</Text>
                        </TouchableOpacity>
                        {onViewContributions && (
                            <TouchableOpacity
                                style={styles.actionButton}
                                onPress={onViewContributions}
                            >
                                <Text style={styles.actionIcon}>📋</Text>
                                <Text style={styles.actionText}>History</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                <Text style={styles.sectionTitle}>Transaction History</Text>

                {transactions.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyStateText}>No transactions yet.</Text>
                    </View>
                ) : (
                    transactions.map((item) => {
                        const isExpanded = expandedTransactionId === item.id;
                        const isDebit = item.transaction_type === 'TRANSFER' || item.transaction_type === 'WITHDRAWAL' || item.transaction_type === 'P2P_SENT';

                        const label = item.description || (item.transaction_type || 'Transaction').replace(/_/g, ' ');
                        const fromName = item.from_label?.full_name || item.sender_wallet_detail?.full_name || (item.transaction_type === 'P2P_RECEIVED' && item.wallet_detail ? item.wallet_detail.full_name || item.wallet_detail.user_email : null);
                        const toName = item.to_label?.full_name || item.recipient_wallet_detail?.full_name || item.destination_group_detail?.name;

                        const flowLine = fromName && toName ? `${fromName} → ${toName}` : fromName ? `From: ${fromName}` : toName ? `To: ${toName}` : null;

                        return (
                            <View key={item.id} style={styles.transactionWrapper}>
                                <TouchableOpacity
                                    activeOpacity={0.8}
                                    onPress={() => setExpandedTransactionId(isExpanded ? null : item.id)}
                                    style={styles.transactionItem}
                                >
                                    <View style={styles.transactionIconContainer}>
                                        <Text style={styles.transactionIcon}>{getTransactionIcon(item.transaction_type)}</Text>
                                    </View>
                                    <View style={styles.transactionDetails}>
                                        <Text style={styles.transactionType} numberOfLines={1}>
                                            {label}
                                        </Text>
                                        {flowLine ? (
                                            <Text style={styles.destinationText} numberOfLines={1}>
                                                {flowLine}
                                            </Text>
                                        ) : null}
                                        <Text style={styles.transactionDate}>{formatDate(item.timestamp)}</Text>
                                    </View>
                                    <View style={styles.amountContainer}>
                                        <Text style={[
                                            styles.transactionAmount,
                                            isDebit ? styles.negativeAmount : styles.positiveAmount
                                        ]}>
                                            {isDebit ? '-' : '+'}{formatCurrency(item.amount)}
                                        </Text>
                                        <View style={[
                                            styles.statusBadge,
                                            item.status === 'COMPLETED' ? styles.statusCOMPLETED :
                                                item.status === 'PENDING' ? styles.statusPENDING :
                                                    styles.statusFAILED
                                        ]}>
                                            <Text style={[
                                                styles.statusText,
                                                item.status === 'COMPLETED' ? styles.statusTextCOMPLETED : {}
                                            ]}>{item.status}</Text>
                                        </View>
                                    </View>
                                </TouchableOpacity>

                                {isExpanded && (
                                    <View style={styles.expandedCard}>
                                        <Text style={styles.expandedTitle}>Transaction Details</Text>
                                        <Text style={styles.expandedText}><Text style={{ fontWeight: '700' }}>Transaction ID:</Text> #{item.id}</Text>
                                        <Text style={styles.expandedText}><Text style={{ fontWeight: '700' }}>Type:</Text> {(item.transaction_type || '').replace(/_/g, ' ')}</Text>
                                        <Text style={styles.expandedText}><Text style={{ fontWeight: '700' }}>Status:</Text> {item.status}</Text>
                                        <Text style={styles.expandedText}><Text style={{ fontWeight: '700' }}>Date & Time:</Text> {item.timestamp ? new Date(item.timestamp).toLocaleString() : 'Date unknown'}</Text>
                                        {fromName ? (
                                            <Text style={styles.expandedText}><Text style={{ fontWeight: '700' }}>From:</Text> {fromName}</Text>
                                        ) : null}
                                        {toName ? (
                                            <Text style={styles.expandedText}><Text style={{ fontWeight: '700' }}>To:</Text> {toName}</Text>
                                        ) : null}
                                        {item.fund_campaign_detail ? (
                                            <Text style={styles.expandedText}>
                                                <Text style={{ fontWeight: '700' }}>Campaign:</Text> {item.fund_campaign_detail.title} {item.fund_campaign_detail.campaign_type ? `(${item.fund_campaign_detail.campaign_type})` : ''}
                                            </Text>
                                        ) : null}
                                        {item.deceased_contribution_detail ? (
                                            <Text style={styles.expandedText}>
                                                <Text style={{ fontWeight: '700' }}>Bereavement:</Text> {item.deceased_contribution_detail.full_name}{item.deceased_contribution_detail.group ? ` · ${item.deceased_contribution_detail.group}` : ''}
                                            </Text>
                                        ) : null}
                                        {item.note ? (
                                            <View style={{ marginTop: 6, padding: 8, borderRadius: 8, backgroundColor: colors.borderLight, borderWidth: 1, borderColor: colors.border }}>
                                                <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textSecondary }}>Note:</Text>
                                                <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>{item.note}</Text>
                                            </View>
                                        ) : null}
                                        {item.withdrawal_channel ? (
                                            <Text style={styles.expandedText}>
                                                <Text style={{ fontWeight: '700' }}>Channel:</Text> {item.withdrawal_channel.replace(/_/g, ' ')}
                                            </Text>
                                        ) : null}
                                        {item.withdrawal_metadata?.voucher_code ? (
                                            <View style={{ marginTop: 8, padding: 10, borderRadius: 10, backgroundColor: colors.successLight, borderWidth: 1, borderColor: colors.successLight }}>
                                                <Text style={{ fontSize: 11, color: colors.success, fontWeight: 'bold' }}>🎫 Voucher Code:</Text>
                                                <Text style={{ fontSize: 18, fontWeight: '800', color: colors.success, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', marginTop: 2, letterSpacing: 1 }}>{item.withdrawal_metadata.voucher_code}</Text>
                                                {item.withdrawal_metadata.partner ? (
                                                    <Text style={{ fontSize: 11, color: colors.success, marginTop: 4, fontWeight: '500' }}>🏪 Redeem at: {item.withdrawal_metadata.partner}</Text>
                                                ) : null}
                                            </View>
                                        ) : null}
                                    </View>
                                )}
                            </View>
                        );
                    })
                )}
            </ScrollView>

            {/* ──────────────── TOP UP MODAL ──────────────── */}
            <Modal
                visible={showTopUp}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowTopUp(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.modalOverlay}
                >
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Top Up Wallet</Text>
                            <TouchableOpacity onPress={() => { setShowTopUp(false); setVoucherPin(''); setTopUpError(null); }}>
                                <Text style={styles.closeButton}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Method Selection Tabs */}
                        <View style={{ flexDirection: 'row', backgroundColor: colors.surfaceLight, padding: 4, borderRadius: 8, marginBottom: 16 }}>
                            <TouchableOpacity
                                style={{
                                    flex: 1,
                                    paddingVertical: 8,
                                    borderRadius: 6,
                                    backgroundColor: topUpMethod === 'voucher' ? colors.primaryLight : 'transparent',
                                    alignItems: 'center'
                                }}
                                onPress={() => { setTopUpMethod('voucher'); setTopUpError(null); }}
                            >
                                <Text style={{ color: topUpMethod === 'voucher' ? colors.white : colors.textSecondary, fontWeight: 'bold' }}>🎫 1Voucher</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={{
                                    flex: 1,
                                    paddingVertical: 8,
                                    borderRadius: 6,
                                    backgroundColor: topUpMethod === 'card' ? colors.primaryLight : 'transparent',
                                    alignItems: 'center'
                                }}
                                onPress={() => { setTopUpMethod('card'); setTopUpError(null); }}
                            >
                                <Text style={{ color: topUpMethod === 'card' ? colors.white : colors.textSecondary, fontWeight: 'bold' }}>💳 Bank Card</Text>
                            </TouchableOpacity>
                        </View>

                        {topUpMethod === 'voucher' ? (
                            <>
                                <Text style={[styles.inputLabel, { marginBottom: 4 }]}>1Voucher PIN</Text>
                                <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 10 }}>
                                    Enter the 14–16 digit PIN from your physical 1Voucher.
                                </Text>
                                <TextInput
                                    style={[styles.textInput, topUpError ? styles.inputError : null, { letterSpacing: 2, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontSize: 18, textAlign: 'center' }]}
                                    placeholder="0000 0000 0000 00"
                                    keyboardType="number-pad"
                                    value={voucherPin}
                                    onChangeText={(text) => {
                                        setVoucherPin(text);
                                        if (topUpError) setTopUpError(null);
                                    }}
                                    placeholderTextColor="#9ca3af"
                                    maxLength={16}
                                />
                            </>
                        ) : (
                            <View style={{ gap: 12 }}>
                                <View>
                                    <Text style={[styles.inputLabel, { marginBottom: 4 }]}>Amount (ZAR)</Text>
                                    <TextInput
                                        style={styles.textInput}
                                        placeholder="e.g. 150"
                                        keyboardType="numeric"
                                        value={cardAmount}
                                        onChangeText={(text) => {
                                            setCardAmount(text.replace(/[^0-9.]/g, ''));
                                            if (topUpError) setTopUpError(null);
                                        }}
                                        placeholderTextColor="#9ca3af"
                                    />
                                </View>
                                <View>
                                    <Text style={[styles.inputLabel, { marginBottom: 4 }]}>Card Number</Text>
                                    <TextInput
                                        style={[styles.textInput, { fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', letterSpacing: 2 }]}
                                        placeholder="5531 8866 5214 2950"
                                        keyboardType="number-pad"
                                        value={cardNumber}
                                        onChangeText={(text) => {
                                            const raw = text.replace(/\D/g, '').slice(0, 16);
                                            const formatted = raw.match(/.{1,4}/g)?.join(' ') || raw;
                                            setCardNumber(formatted);
                                            if (topUpError) setTopUpError(null);
                                        }}
                                        placeholderTextColor="#9ca3af"
                                        maxLength={19}
                                    />
                                </View>
                                <View style={{ flexDirection: 'row', gap: 12 }}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.inputLabel, { marginBottom: 4 }]}>Expiry (MM/YY)</Text>
                                        <TextInput
                                            style={styles.textInput}
                                            placeholder="09/32"
                                            value={cardExpiry}
                                            onChangeText={(text) => {
                                                let val = text.replace(/\D/g, '').slice(0, 4);
                                                if (val.length > 2) val = val.slice(0, 2) + '/' + val.slice(2);
                                                setCardExpiry(val);
                                                if (topUpError) setTopUpError(null);
                                            }}
                                            placeholderTextColor="#9ca3af"
                                            maxLength={5}
                                        />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.inputLabel, { marginBottom: 4 }]}>CVV</Text>
                                        <TextInput
                                            style={styles.textInput}
                                            placeholder="564"
                                            keyboardType="number-pad"
                                            secureTextEntry
                                            value={cardCvv}
                                            onChangeText={(text) => {
                                                setCardCvv(text.replace(/\D/g, '').slice(0, 4));
                                                if (topUpError) setTopUpError(null);
                                            }}
                                            placeholderTextColor="#9ca3af"
                                            maxLength={4}
                                        />
                                    </View>
                                </View>
                            </View>
                        )}
                        {topUpError && <Text style={styles.errorText}>{topUpError}</Text>}

                        <TouchableOpacity
                            style={[styles.submitButton, isSubmitting && styles.disabledButton, { marginTop: 20 }]}
                            onPress={handleTopUp}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <ActivityIndicator color="#ffffff" />
                            ) : (
                                <Text style={styles.submitButtonText}>
                                    {topUpMethod === 'voucher' ? 'Redeem Voucher' : 'Pay with Card'}
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* ──────────────── SEND MONEY MODAL ──────────────── */}
            <Modal
                visible={showSendMoney}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowSendMoney(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.modalOverlay}
                >
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Send Money</Text>
                            <TouchableOpacity onPress={() => {
                                setShowSendMoney(false);
                                setSelectedRecipient(null);
                                setSendAmount('');
                                setSearchQuery('');
                            }}>
                                <Text style={styles.closeButton}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        {!selectedRecipient ? (
                            <>
                                <Text style={styles.inputLabel}>Select Recipient</Text>
                                <TextInput
                                    style={styles.textInput}
                                    placeholder="Search members..."
                                    value={searchQuery}
                                    onChangeText={setSearchQuery}
                                    placeholderTextColor="#9ca3af"
                                />
                                <ScrollView style={styles.memberList}>
                                    {members
                                        .filter(m =>
                                            m.member_detail.full_name.toLowerCase().includes(searchQuery.toLowerCase())
                                        )
                                        .map((member) => (
                                            <TouchableOpacity
                                                key={member.id}
                                                style={styles.memberItem}
                                                onPress={() => setSelectedRecipient(member)}
                                            >
                                                <View style={styles.memberAvatar}>
                                                    {member.member_detail.profile_picture ? (
                                                        <Image
                                                            source={{ uri: getMediaUrl(member.member_detail.profile_picture) }}
                                                            style={styles.avatarImg}
                                                        />
                                                    ) : (
                                                        <Text style={styles.avatarInitial}>
                                                            {member.member_detail.full_name[0].toUpperCase()}
                                                        </Text>
                                                    )}
                                                </View>
                                                <Text style={styles.memberName}>{member.member_detail.full_name}</Text>
                                            </TouchableOpacity>
                                        ))
                                    }
                                </ScrollView>
                            </>
                        ) : (
                            <>
                                <View style={styles.selectedRecipient}>
                                    <View style={styles.memberAvatar}>
                                        {selectedRecipient.member_detail.profile_picture ? (
                                            <Image
                                                source={{ uri: getMediaUrl(selectedRecipient.member_detail.profile_picture) }}
                                                style={styles.avatarImg}
                                            />
                                        ) : (
                                            <Text style={styles.avatarInitial}>
                                                {selectedRecipient.member_detail.full_name[0].toUpperCase()}
                                            </Text>
                                        )}
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.recipientName}>{selectedRecipient.member_detail.full_name}</Text>
                                        <TouchableOpacity onPress={() => setSelectedRecipient(null)}>
                                            <Text style={styles.changeRecipient}>Change recipient</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                <Text style={styles.inputLabel}>Amount (ZAR)</Text>
                                <TextInput
                                    style={[styles.textInput, sendError && styles.inputError]}
                                    placeholder="0.00"
                                    keyboardType="decimal-pad"
                                    value={sendAmount}
                                    onChangeText={(text) => {
                                        setSendAmount(text);
                                        if (sendError) setSendError(null);
                                    }}
                                    placeholderTextColor="#9ca3af"
                                />
                                {sendError && <Text style={styles.errorText}>{sendError}</Text>}

                                <View style={styles.presets}>
                                    {['5', '10', '25', '50'].map((amt) => (
                                        <TouchableOpacity
                                            key={amt}
                                            style={styles.presetBtn}
                                            onPress={() => setSendAmount(amt)}
                                        >
                                            <Text style={styles.presetText}>${amt}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                <TouchableOpacity
                                    style={[styles.submitButton, isSending && styles.disabledButton]}
                                    onPress={handleSendMoney}
                                    disabled={isSending}
                                >
                                    {isSending ? (
                                        <ActivityIndicator color="#ffffff" />
                                    ) : (
                                        <Text style={styles.submitButtonText}>Send Money</Text>
                                    )}
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* ──────────────── WITHDRAW MODAL ──────────────── */}
            <Modal
                visible={showWithdraw}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowWithdraw(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.modalOverlay}
                >
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>
                                {withdrawChannel === 'send_money' ? 'Send Money' : 'Withdraw Funds'}
                            </Text>
                            <TouchableOpacity onPress={() => {
                                setShowWithdraw(false);
                                setWithdrawAmount('');
                                setWithdrawAccountNumber('');
                                setWithdrawBankCode('');
                                setWithdrawPhoneNumber('');
                                setWithdrawProvider('');
                                setWithdrawVoucherCode('');
                                setWithdrawPartner('');
                                setWithdrawError(null);
                                setSelectedRecipient(null);
                                setSendAmount('');
                                setSendError(null);
                                setSearchQuery('');
                            }}>
                                <Text style={styles.closeButton}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.inputLabel}>Channel</Text>
                        <View style={styles.channelOptions}>
                            {[
                                { value: 'bank_transfer', label: 'Bank', icon: '🏦' },
                                { value: 'mobile_money', label: 'Mobile', icon: '📱' },
                                { value: 'voucher', label: 'Voucher', icon: '🎫' },
                                { value: 'send_money', label: 'Send Money', icon: '💸' },
                            ].map((option) => (
                                <TouchableOpacity
                                    key={option.value}
                                    activeOpacity={0.8}
                                    style={[
                                        styles.channelOption,
                                        withdrawChannel === option.value && styles.channelOptionSelected,
                                        option.value === 'send_money' && withdrawChannel === 'send_money' && { borderColor: colors.primary, backgroundColor: colors.primary }
                                    ]}
                                    onPress={() => {
                                        setWithdrawChannel(option.value as any);
                                        setWithdrawError(null);
                                    }}
                                >
                                    <Text style={styles.channelOptionIcon}>{option.icon}</Text>
                                    <Text style={[
                                        styles.channelOptionText,
                                        withdrawChannel === option.value && styles.channelOptionTextSelected
                                    ]}>{option.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {withdrawChannel !== 'send_money' && <Text style={styles.inputLabel}>Amount (ZAR)</Text>}
                        {withdrawChannel !== 'send_money' && (
                            <TextInput
                                style={[styles.textInput, withdrawError && styles.inputError]}
                                placeholder="0.00"
                                keyboardType="decimal-pad"
                                value={withdrawAmount}
                                onChangeText={(text) => {
                                    setWithdrawAmount(text);
                                    if (withdrawError) setWithdrawError(null);
                                }}
                                placeholderTextColor="#9ca3af"
                            />
                        )}

                        {withdrawChannel === 'send_money' && (
                            <View>
                                {!selectedRecipient ? (
                                    <>
                                        <Text style={styles.inputLabel}>Search Member</Text>
                                        <TextInput
                                            style={styles.textInput}
                                            placeholder="Search by name..."
                                            value={searchQuery}
                                            onChangeText={setSearchQuery}
                                            placeholderTextColor="#9ca3af"
                                        />
                                        <ScrollView style={[styles.memberList, { maxHeight: 180 }]}>
                                            {members
                                                .filter((m: any) =>
                                                    !searchQuery || m.member_detail?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
                                                )
                                                .map((member: any) => (
                                                    <TouchableOpacity
                                                        key={member.id}
                                                        style={styles.memberItem}
                                                        onPress={() => { setSelectedRecipient(member); setSearchQuery(''); }}
                                                    >
                                                        <View style={styles.memberAvatar}>
                                                            {member.member_detail?.profile_picture ? (
                                                                <Image
                                                                    source={{ uri: getMediaUrl(member.member_detail.profile_picture) }}
                                                                    style={styles.avatarImg}
                                                                />
                                                            ) : (
                                                                <Text style={styles.avatarInitial}>
                                                                    {member.member_detail?.full_name?.[0]?.toUpperCase() || '?'}
                                                                </Text>
                                                            )}
                                                        </View>
                                                        <Text style={styles.memberName}>{member.member_detail?.full_name}</Text>
                                                    </TouchableOpacity>
                                                ))
                                            }
                                        </ScrollView>
                                    </>
                                ) : (
                                    <>
                                        <View style={styles.selectedRecipient}>
                                            <View style={styles.memberAvatar}>
                                                {selectedRecipient.member_detail?.profile_picture ? (
                                                    <Image
                                                        source={{ uri: getMediaUrl(selectedRecipient.member_detail.profile_picture) }}
                                                        style={styles.avatarImg}
                                                    />
                                                ) : (
                                                    <Text style={styles.avatarInitial}>
                                                        {selectedRecipient.member_detail?.full_name?.[0]?.toUpperCase()}
                                                    </Text>
                                                )}
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.recipientName}>{selectedRecipient.member_detail?.full_name}</Text>
                                                <TouchableOpacity onPress={() => setSelectedRecipient(null)}>
                                                    <Text style={styles.changeRecipient}>Change recipient</Text>
                                                </TouchableOpacity>
                                            </View>
                                        </View>

                                        <Text style={styles.inputLabel}>Amount (ZAR)</Text>
                                        <TextInput
                                            style={[styles.textInput, sendError && styles.inputError]}
                                            placeholder="0.00"
                                            keyboardType="decimal-pad"
                                            value={sendAmount}
                                            onChangeText={(text) => { setSendAmount(text); if (sendError) setSendError(null); }}
                                            placeholderTextColor="#9ca3af"
                                        />
                                        {sendError && <Text style={styles.errorText}>{sendError}</Text>}

                                        <View style={styles.presets}>
                                            {['5', '10', '25', '50'].map((amt) => (
                                                <TouchableOpacity
                                                    key={amt}
                                                    style={styles.presetBtn}
                                                    onPress={() => setSendAmount(amt)}
                                                >
                                                    <Text style={styles.presetText}>R{amt}</Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    </>
                                )}
                            </View>
                        )}

                        {withdrawChannel === 'bank_transfer' && (
                            <>
                                <Text style={styles.inputLabel}>Account Number</Text>
                                <TextInput
                                    style={[styles.textInput, withdrawError && styles.inputError]}
                                    placeholder="1234567890"
                                    value={withdrawAccountNumber}
                                    onChangeText={(text) => {
                                        setWithdrawAccountNumber(text);
                                        if (withdrawError) setWithdrawError(null);
                                    }}
                                    placeholderTextColor="#9ca3af"
                                />

                                <Text style={styles.inputLabel}>Bank Code</Text>
                                <TextInput
                                    style={[styles.textInput, withdrawError && styles.inputError]}
                                    placeholder="FNB001"
                                    value={withdrawBankCode}
                                    onChangeText={(text) => {
                                        setWithdrawBankCode(text);
                                        if (withdrawError) setWithdrawError(null);
                                    }}
                                    placeholderTextColor="#9ca3af"
                                />
                            </>
                        )}

                        {withdrawChannel === 'mobile_money' && (
                            <>
                                <Text style={styles.inputLabel}>Mobile Money Number</Text>
                                <TextInput
                                    style={[styles.textInput, withdrawError && styles.inputError]}
                                    placeholder="+27761234567"
                                    value={withdrawPhoneNumber}
                                    onChangeText={(text) => {
                                        setWithdrawPhoneNumber(text);
                                        if (withdrawError) setWithdrawError(null);
                                    }}
                                    placeholderTextColor="#9ca3af"
                                />

                                <Text style={styles.inputLabel}>Network Provider (Preselected)</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 6, maxHeight: 40 }}>
                                    <View style={{ flexDirection: 'row', gap: 6, paddingRight: 10 }}>
                                        {NETWORK_PROVIDERS.map((prov) => (
                                            <TouchableOpacity
                                                key={prov}
                                                style={{
                                                    paddingHorizontal: 12,
                                                    paddingVertical: 6,
                                                    borderRadius: 16,
                                                    backgroundColor: withdrawProvider === prov ? colors.primaryLight : colors.surfaceLight,
                                                    borderWidth: 1,
                                                    borderColor: withdrawProvider === prov ? colors.primaryLight : colors.border
                                                }}
                                                onPress={() => setWithdrawProvider(prov)}
                                            >
                                                <Text style={{
                                                    fontSize: 12,
                                                    fontWeight: withdrawProvider === prov ? '700' : '500',
                                                    color: withdrawProvider === prov ? colors.white : colors.textSecondary
                                                }}>
                                                    {withdrawProvider === prov ? `✓ ${prov}` : prov}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </ScrollView>
                                <TextInput
                                    style={[styles.textInput, withdrawError && styles.inputError]}
                                    placeholder="MTN"
                                    value={withdrawProvider}
                                    onChangeText={(text) => {
                                        setWithdrawProvider(text);
                                        if (withdrawError) setWithdrawError(null);
                                    }}
                                    placeholderTextColor="#9ca3af"
                                />
                            </>
                        )}

                        {withdrawChannel === 'voucher' && (
                            <>
                                <Text style={styles.inputLabel}>Retail Partner (Preselected)</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 6, maxHeight: 40 }}>
                                    <View style={{ flexDirection: 'row', gap: 6, paddingRight: 10 }}>
                                        {RETAIL_PARTNERS.map((partner) => (
                                            <TouchableOpacity
                                                key={partner}
                                                style={{
                                                    paddingHorizontal: 12,
                                                    paddingVertical: 6,
                                                    borderRadius: 16,
                                                    backgroundColor: withdrawPartner === partner ? colors.success : colors.surfaceLight,
                                                    borderWidth: 1,
                                                    borderColor: withdrawPartner === partner ? colors.success : colors.border
                                                }}
                                                onPress={() => setWithdrawPartner(partner)}
                                            >
                                                <Text style={{
                                                    fontSize: 12,
                                                    fontWeight: withdrawPartner === partner ? '700' : '500',
                                                    color: withdrawPartner === partner ? colors.white : colors.textSecondary
                                                }}>
                                                    {withdrawPartner === partner ? `✓ ${partner}` : partner}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </ScrollView>
                                <TextInput
                                    style={[styles.textInput, withdrawError && styles.inputError]}
                                    placeholder="Shoprite"
                                    value={withdrawPartner}
                                    onChangeText={(text) => {
                                        setWithdrawPartner(text);
                                        if (withdrawError) setWithdrawError(null);
                                    }}
                                    placeholderTextColor="#9ca3af"
                                />
                            </>
                        )}

                        {withdrawError && <Text style={styles.errorText}>{withdrawError}</Text>}

                        {withdrawChannel !== 'send_money' && (
                            <TouchableOpacity
                                style={[styles.submitButton, isWithdrawing && styles.disabledButton]}
                                onPress={handleWithdraw}
                                disabled={isWithdrawing}
                            >
                                {isWithdrawing ? (
                                    <ActivityIndicator color="#ffffff" />
                                ) : (
                                    <Text style={styles.submitButtonText}>Submit Withdrawal</Text>
                                )}
                            </TouchableOpacity>
                        )}

                        {withdrawChannel === 'send_money' && selectedRecipient && (
                            <TouchableOpacity
                                style={[styles.submitButton, { backgroundColor: colors.primary }, isSending && styles.disabledButton]}
                                onPress={handleSendMoney}
                                disabled={isSending}
                            >
                                {isSending ? (
                                    <ActivityIndicator color="#ffffff" />
                                ) : (
                                    <Text style={styles.submitButtonText}>Send Money</Text>
                                )}
                            </TouchableOpacity>
                        )}
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* ──────────────── CONTRIBUTE MODAL ──────────────── */}
            <Modal
                visible={showContribute}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowContribute(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.modalOverlay}
                >
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Contribute</Text>
                            <TouchableOpacity onPress={() => {
                                setShowContribute(false);
                                setSelectedCampaign(null);
                                setContributeAmount('');
                            }}>
                                <Text style={styles.closeButton}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        {!selectedCampaign ? (
                            <>
                                <Text style={styles.inputLabel}>Select Campaign or Monthly Due</Text>
                                <ScrollView style={styles.memberList}>
                                    {/* ── Pending recurring cycle dues ── */}
                                    {joinedGroups
                                        .filter((g: any) =>
                                            (!activeGroupId || g.id === activeGroupId) &&
                                            g.is_active !== false &&
                                            g.enable_recurring_contributions &&
                                            g.active_cycle &&
                                            g.my_cycle_status?.status !== 'paid'
                                        )
                                        .map((g: any) => (
                                            <TouchableOpacity
                                                key={`cycle-${g.id}`}
                                                style={[styles.deceasedItem, { borderLeftWidth: 4, borderLeftColor: colors.primaryLight }]}
                                                onPress={() => {
                                                    setSelectedCampaign({ ...g, _type: 'cycle' });
                                                    const targetAmt = g.active_cycle?.target_amount_per_member || g.recurring_amount;
                                                    if (targetAmt) setContributeAmount(String(targetAmt));
                                                }}
                                            >
                                                <View style={[styles.memberAvatar, { backgroundColor: `${colors.primaryLight}20`, justifyContent: 'center', alignItems: 'center' }]}>
                                                    <Text style={{ fontSize: 20 }}>🔄</Text>
                                                </View>
                                                <View style={{ flex: 1, marginLeft: 10 }}>
                                                    <Text style={styles.memberName} numberOfLines={1}>{g.name}</Text>
                                                    <Text style={[styles.fundProgress, { color: colors.primaryLight }]}>
                                                        Monthly Due · {g.active_cycle?.title || 'Recurring Contribution'}
                                                    </Text>
                                                </View>
                                                <Text style={styles.chevron}>›</Text>
                                            </TouchableOpacity>
                                        ))
                                    }

                                    {/* ── Active fundraiser campaigns ── */}
                                    {activeCampaigns.map((campaign) => {
                                        const meta = CAMPAIGN_TYPE_META[campaign.campaign_type] || CAMPAIGN_TYPE_META.custom;
                                        return (
                                            <TouchableOpacity
                                                key={`campaign-${campaign.id}`}
                                                style={styles.deceasedItem}
                                                onPress={() => setSelectedCampaign({ ...campaign, _type: 'campaign' })}
                                            >
                                                <View style={[styles.memberAvatar, { backgroundColor: `${meta.color}15`, justifyContent: 'center', alignItems: 'center' }]}>
                                                    <Text style={{ fontSize: 20 }}>{meta.icon}</Text>
                                                </View>
                                                <View style={{ flex: 1, marginLeft: 10 }}>
                                                    <Text style={styles.memberName} numberOfLines={1}>{campaign.title}</Text>
                                                    <Text style={styles.fundProgress}>
                                                        Type: {meta.label} · Raised: {formatCurrency(campaign.total_raised.toString())}
                                                    </Text>
                                                </View>
                                                <Text style={styles.chevron}>›</Text>
                                            </TouchableOpacity>
                                        );
                                    })}

                                    {contributeItems.length === 0 && (
                                        <View style={styles.emptyState}>
                                            <Text style={styles.emptyStateText}>No active campaigns or pending dues.</Text>
                                        </View>
                                    )}
                                </ScrollView>
                            </>
                        ) : (
                            <>
                                <View style={styles.selectedRecipient}>
                                    {selectedCampaign._type === 'cycle' ? (
                                        <View style={[styles.memberAvatar, { backgroundColor: `${colors.primaryLight}20`, justifyContent: 'center', alignItems: 'center' }]}>
                                            <Text style={{ fontSize: 24 }}>🔄</Text>
                                        </View>
                                    ) : (
                                        <View style={[styles.memberAvatar, { backgroundColor: `${(CAMPAIGN_TYPE_META[selectedCampaign.campaign_type] || CAMPAIGN_TYPE_META.custom).color}15`, justifyContent: 'center', alignItems: 'center' }]}>
                                            <Text style={{ fontSize: 24 }}>{(CAMPAIGN_TYPE_META[selectedCampaign.campaign_type] || CAMPAIGN_TYPE_META.custom).icon}</Text>
                                        </View>
                                    )}
                                    <View style={{ flex: 1, marginLeft: 10 }}>
                                        <Text style={styles.recipientName}>
                                            {selectedCampaign._type === 'cycle'
                                                ? `${selectedCampaign.name} – ${selectedCampaign.active_cycle?.title || 'Monthly Dues'}`
                                                : selectedCampaign.title
                                            }
                                        </Text>
                                        {selectedCampaign._type === 'campaign' && (
                                            <Text style={styles.fundProgress}>
                                                Total raised: {formatCurrency(selectedCampaign.total_raised.toString())}
                                                {selectedCampaign.target_amount ? ` of ${formatCurrency(selectedCampaign.target_amount.toString())}` : ''}
                                            </Text>
                                        )}
                                        <TouchableOpacity onPress={() => setSelectedCampaign(null)}>
                                            <Text style={styles.changeRecipient}>Change selection</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                <Text style={styles.inputLabel}>Contribution Amount (ZAR)</Text>
                                <TextInput
                                    style={[styles.textInput, contributeError && styles.inputError]}
                                    placeholder="0.00"
                                    keyboardType="decimal-pad"
                                    value={contributeAmount}
                                    onChangeText={(text) => {
                                        setContributeAmount(text);
                                        if (contributeError) setContributeError(null);
                                    }}
                                    placeholderTextColor="#9ca3af"
                                />
                                {contributeError && <Text style={styles.errorText}>{contributeError}</Text>}

                                <View style={styles.presets}>
                                    {['10', '25', '50', '100'].map((amt) => (
                                        <TouchableOpacity
                                            key={amt}
                                            style={styles.presetBtn}
                                            onPress={() => setContributeAmount(amt)}
                                        >
                                            <Text style={styles.presetText}>R{amt}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                <TouchableOpacity
                                    style={[styles.submitButton, isContributing && styles.disabledButton]}
                                    onPress={handleContributeToCampaign}
                                    disabled={isContributing}
                                >
                                    {isContributing ? (
                                        <ActivityIndicator color="#ffffff" />
                                    ) : (
                                        <Text style={styles.submitButtonText}>Contribute</Text>
                                    )}
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                </KeyboardAvoidingView>
            </Modal>
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
    scrollContent: {
        padding: 16,
    },
    balanceCard: {
        backgroundColor: colors.primaryLight,
        borderRadius: 16,
        padding: 24,
        marginBottom: 24,
        alignItems: 'center',
        shadowColor: colors.primaryLight,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    balanceLabel: {
        color: 'rgba(255, 255, 255, 0.8)',
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    balanceAmount: {
        color: colors.white,
        fontSize: 36,
        fontWeight: 'bold',
        marginBottom: 24,
    },
    quickActions: {
        flexDirection: 'row',
        width: '100%',
        justifyContent: 'space-around',
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.2)',
        paddingTop: 20,
    },
    actionButton: {
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.12)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.35)',
        borderRadius: 14,
        paddingVertical: 10,
        paddingHorizontal: 12,
        minWidth: 64,
    },
    actionIcon: {
        fontSize: 22,
        marginBottom: 5,
    },
    actionText: {
        color: colors.white,
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.textPrimary,
        marginBottom: 16,
    },
    transactionWrapper: {
        marginBottom: 12,
    },
    transactionItem: {
        backgroundColor: colors.white,
        borderRadius: 12,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },
    transactionIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    transactionIcon: {
        fontSize: 20,
    },
    transactionDetails: {
        flex: 1,
    },
    transactionType: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.textPrimary,
        textTransform: 'capitalize',
    },
    destinationText: {
        fontSize: 13,
        color: colors.textSecondary,
        marginTop: 2,
    },
    transactionDate: {
        fontSize: 12,
        color: colors.textMuted,
        marginTop: 4,
    },
    amountContainer: {
        alignItems: 'flex-end',
    },
    transactionAmount: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    positiveAmount: {
        color: colors.success,
    },
    negativeAmount: {
        color: colors.danger,
    },
    expandedCard: {
        backgroundColor: colors.background,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 12,
        marginTop: 8,
    },
    expandedTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: colors.textPrimary,
        marginBottom: 6,
    },
    expandedText: {
        fontSize: 12,
        color: colors.textSecondary,
        marginTop: 2,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
    },
    statusText: {
        fontSize: 10,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    statusCOMPLETED: {
        backgroundColor: colors.successLight,
    },
    statusTextCOMPLETED: {
        color: colors.success,
    },
    statusPENDING: {
        backgroundColor: colors.warningLight,
    },
    statusFAILED: {
        backgroundColor: colors.dangerLight,
    },
    emptyState: {
        padding: 40,
        alignItems: 'center',
    },
    emptyStateText: {
        color: colors.textSecondary,
        fontSize: 16,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: colors.white,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: colors.textPrimary,
    },
    closeButton: {
        fontSize: 20,
        color: colors.textMuted,
        padding: 4,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textSecondary,
        marginBottom: 8,
    },
    textInput: {
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 12,
        padding: 16,
        fontSize: 18,
        color: colors.textPrimary,
        marginBottom: 8,
    },
    inputError: {
        borderColor: colors.danger,
        backgroundColor: colors.dangerLight,
    },
    errorText: {
        color: colors.danger,
        fontSize: 13,
        marginBottom: 16,
        marginLeft: 4,
        fontWeight: '500',
    },
    channelOptions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    channelOption: {
        flex: 1,
        paddingVertical: 12,
        marginHorizontal: 4,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.background,
        alignItems: 'center',
        justifyContent: 'center',
    },
    channelOptionSelected: {
        backgroundColor: colors.primaryLight,
        borderColor: colors.primaryLight,
    },
    channelOptionText: {
        fontSize: 13,
        color: colors.textSecondary,
        fontWeight: '600',
        textAlign: 'center',
    },
    channelOptionIcon: {
        fontSize: 20,
        marginBottom: 6,
    },
    channelOptionTextSelected: {
        color: colors.white,
    },
    presets: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 24,
    },
    presetBtn: {
        backgroundColor: colors.surfaceLight,
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.surfaceLight,
    },
    presetText: {
        color: colors.primaryLight,
        fontWeight: '600',
    },
    submitButton: {
        backgroundColor: colors.primaryLight,
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        shadowColor: colors.primaryLight,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    submitButtonText: {
        color: colors.white,
        fontSize: 16,
        fontWeight: 'bold',
    },
    disabledButton: {
        opacity: 0.5,
    },
    memberList: {
        maxHeight: 300,
        marginBottom: 16,
    },
    memberItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        backgroundColor: colors.background,
        borderRadius: 8,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: colors.border,
    },
    memberAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.surfaceLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.surfaceLight,
    },
    avatarImg: {
        width: '100%',
        height: '100%',
    },
    avatarInitial: {
        color: colors.primaryLight,
        fontWeight: 'bold',
        fontSize: 16,
    },
    memberName: {
        fontSize: 16,
        color: colors.textPrimary,
        fontWeight: '600',
    },
    selectedRecipient: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: colors.surfaceLight,
        borderRadius: 12,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: colors.surfaceLight,
    },
    recipientName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: colors.textPrimary,
        marginBottom: 4,
    },
    changeRecipient: {
        fontSize: 13,
        color: colors.primaryLight,
        fontWeight: '600',
    },
    deceasedItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        backgroundColor: colors.background,
        borderRadius: 8,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: colors.border,
    },
    fundProgress: {
        fontSize: 13,
        color: colors.success,
        fontWeight: '600',
        marginTop: 2,
    },
    chevron: {
        fontSize: 20,
        color: colors.textMuted,
        marginLeft: 8,
    },
    activeEntityContainer: {
        borderColor: colors.surfaceLight,
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 8,
        paddingVertical: 4,
        maxWidth: 120,
        justifyContent: 'center',
        alignItems: 'center',
    },
    activeEntityText: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.primaryLight,
    },
});

export default WalletScreen;
