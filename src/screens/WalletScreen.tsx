import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    ActivityIndicator, SafeAreaView, ScrollView, RefreshControl,
    Modal, TextInput, Alert, KeyboardAvoidingView, Platform
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import client from '../api/client';
import { authenticateAction } from '../utils/biometrics';
import { validateAmount, validatePhone } from '../utils/validation';

const CAMPAIGN_TYPE_META: Record<string, { icon: string; color: string; label: string }> = {
    bereavement: { icon: '🕊️', color: '#7c3aed', label: 'Bereavement' },
    excess:      { icon: '🚗', color: '#0284c7', label: 'Insurance Excess' },
    emergency:   { icon: '🆘', color: '#dc2626', label: 'Emergency' },
    custom:      { icon: '✨', color: '#059669', label: 'Custom' },
};

interface Transaction {
    id: number;
    transaction_type: string;
    amount: string;
    status: string;
    timestamp: string;
    destination_group_detail?: {
        name: string;
    };
    recipient_wallet_detail?: {
        user_id: number;
        full_name: string;
    };
    wallet_detail?: {
        user_id: number;
        user_email: string;
        full_name?: string;
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
    const [voucherPin, setVoucherPin] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Send Money States
    const [showSendMoney, setShowSendMoney] = useState(false);
    const [sendAmount, setSendAmount] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [members, setMembers] = useState<any[]>([]);
    const [selectedRecipient, setSelectedRecipient] = useState<any>(null);
    const [isSending, setIsSending] = useState(false);

    // Contribute to Campaign States
    const [showContribute, setShowContribute] = useState(false);
    const [activeCampaigns, setActiveCampaigns] = useState<any[]>([]);
    const [selectedCampaign, setSelectedCampaign] = useState<any>(null);
    const [contributeAmount, setContributeAmount] = useState('');
    const [isContributing, setIsContributing] = useState(false);

    // Error States
    const [topUpError, setTopUpError] = useState<string | null>(null);
    const [sendError, setSendError] = useState<string | null>(null);
    const [contributeError, setContributeError] = useState<string | null>(null);
    const [showWithdraw, setShowWithdraw] = useState(false);
    const [withdrawChannel, setWithdrawChannel] = useState<'bank_transfer' | 'mobile_money' | 'voucher'>('bank_transfer');
    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [withdrawAccountNumber, setWithdrawAccountNumber] = useState('');
    const [withdrawBankCode, setWithdrawBankCode] = useState('');
    const [withdrawPhoneNumber, setWithdrawPhoneNumber] = useState('');
    const [withdrawProvider, setWithdrawProvider] = useState('');
    const [withdrawVoucherCode, setWithdrawVoucherCode] = useState('');
    const [withdrawPartner, setWithdrawPartner] = useState('');
    const [withdrawError, setWithdrawError] = useState<string | null>(null);
    const [isWithdrawing, setIsWithdrawing] = useState(false);

    useEffect(() => {
        fetchData();
        fetchMembers();
        fetchActiveCampaigns();
    }, []);

    useEffect(() => {
        if (initialCampaign) {
            setSelectedCampaign(initialCampaign);
            setShowContribute(true);
            onClearInitialCampaign?.();
        }
    }, [initialCampaign]);

    const [activeGroupOrOrg, setActiveGroupOrOrg] = useState<string | null>(null);

    const fetchData = async () => {
        try {
            const [balanceRes, transRes, activeGroupRes] = await Promise.all([
                client.get('wallets/balance/'),
                client.get('transactions/'),
                client.get('groups/mine/?active=true')
            ]);
            setBalance(balanceRes.data.balance);
            setTransactions(transRes.data);
            if (activeGroupRes.data && activeGroupRes.data.length > 0) {
                setActiveGroupOrOrg(activeGroupRes.data[0].name);
            } else {
                setActiveGroupOrOrg(null);
            }
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
        if (!voucherPin.trim()) {
            setTopUpError('Please enter your 1Voucher PIN.');
            return;
        }

        setTopUpError(null);
        setIsSubmitting(true);
        try {
            await client.post('wallets/top_up/', {
                voucher_pin: voucherPin.trim()
            });
            Alert.alert('Success', 'Voucher redeemed successfully! Your balance has been updated.');
            setShowTopUp(false);
            setVoucherPin('');
            fetchData();
        } catch (error: any) {
            console.error('Top up error:', error);
            const errorMsg = error.response?.data?.error || 'Failed to redeem voucher. Please check your PIN and try again.';
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
            await client.post('wallets/withdraw/', {
                amount: withdrawAmount,
                channel: withdrawChannel,
                metadata,
                currency: 'ZAR'
            });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert('Success', `Withdrawal requested for ${formatCurrency(withdrawAmount)}.`);
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

    const fetchActiveCampaigns = async () => {
        try {
            const response = await client.get('campaigns/');
            const openCampaigns = response.data.filter((c: any) => c.contributions_open);
            setActiveCampaigns(openCampaigns);
        } catch (error) {
            console.error('Error fetching active campaigns:', error);
        }
    };

    const handleContributeToCampaign = async () => {
        if (!selectedCampaign) {
            setContributeError('Please select a campaign to contribute to.');
            return;
        }

        const amtError = validateAmount(contributeAmount, 0, parseFloat(balance));
        if (amtError) {
            setContributeError(amtError);
            return;
        }

        setContributeError(null);

        const authenticated = await authenticateAction(`Authenticate to contribute ${formatCurrency(contributeAmount)} to "${selectedCampaign.title}"`);
        if (!authenticated) return;

        setIsContributing(true);
        try {
            await client.post(`campaigns/${selectedCampaign.id}/contribute/`, {
                amount: parseFloat(contributeAmount)
            });
            Alert.alert(
                'Contribution Successful',
                `You contributed ${formatCurrency(contributeAmount)} to "${selectedCampaign.title}".`
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
                            onPress={() => setShowSendMoney(true)}
                        >
                            <Text style={styles.actionIcon}>💸</Text>
                            <Text style={styles.actionText}>Send</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => setShowWithdraw(true)}
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
                        const senderLabel = item.transaction_type === 'TRANSFER' && item.wallet_detail
                            ? item.wallet_detail.full_name || item.wallet_detail.user_email
                            : item.transaction_type === 'P2P_RECEIVED' && item.wallet_detail
                                ? item.wallet_detail.full_name || item.wallet_detail.user_email
                                : null;
                        const detailTarget = item.destination_group_detail
                            ? `To group: ${item.destination_group_detail.name}`
                            : item.recipient_wallet_detail
                                ? `To: ${item.recipient_wallet_detail.full_name}`
                                : item.transaction_type === 'P2P_RECEIVED' && item.wallet_detail
                                    ? `From: ${item.wallet_detail.full_name || item.wallet_detail.user_email}`
                                    : 'No additional recipient information';

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
                                        <Text style={styles.transactionType}>
                                            {item.transaction_type.replace('_', ' ')}
                                        </Text>
                                        {item.destination_group_detail && (
                                            <Text style={styles.destinationText}>To: {item.destination_group_detail.name}</Text>
                                        )}
                                        {item.recipient_wallet_detail && (
                                            <Text style={styles.destinationText}>To: {item.recipient_wallet_detail.full_name}</Text>
                                        )}
                                        {item.transaction_type === 'P2P_RECEIVED' && item.wallet_detail && (
                                            <Text style={styles.destinationText}>From: {item.wallet_detail.full_name || item.wallet_detail.user_email}</Text>
                                        )}
                                        <Text style={styles.transactionDate}>{formatDate(item.timestamp)}</Text>
                                    </View>
                                    <View style={styles.amountContainer}>
                                        <Text style={[
                                            styles.transactionAmount,
                                            (item.transaction_type === 'TRANSFER' || item.transaction_type === 'WITHDRAWAL' || item.transaction_type === 'P2P_SENT') ? styles.negativeAmount : styles.positiveAmount
                                        ]}>
                                            {(item.transaction_type === 'TRANSFER' || item.transaction_type === 'WITHDRAWAL' || item.transaction_type === 'P2P_SENT') ? '-' : '+'}
                                            {formatCurrency(item.amount)}
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
                                        <Text style={styles.expandedTitle}>More details</Text>
                                        <Text style={styles.expandedText}>Transaction ID: #{item.id}</Text>
                                        <Text style={styles.expandedText}>Type: {item.transaction_type.replace(/_/g, ' ')}</Text>
                                        <Text style={styles.expandedText}>Status: {item.status}</Text>
                                        <Text style={styles.expandedText}>Date: {new Date(item.timestamp).toLocaleString()}</Text>
                                        {senderLabel && (
                                            <Text style={styles.expandedText}>From: {senderLabel}</Text>
                                        )}
                                        {item.transaction_type === 'TRANSFER' && (
                                            <Text style={styles.expandedText}>Transferred to: {detailTarget.replace('To group: ', '').replace('To: ', '')}</Text>
                                        )}
                                        <Text style={styles.expandedText}>Details: {detailTarget}</Text>
                                    </View>
                                )}
                            </View>
                        );
                    })
                )}
            </ScrollView>

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
                            <Text style={styles.modalTitle}>Top Up with 1Voucher</Text>
                            <TouchableOpacity onPress={() => { setShowTopUp(false); setVoucherPin(''); setTopUpError(null); }}>
                                <Text style={styles.closeButton}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        <Text style={[styles.inputLabel, { marginBottom: 4 }]}>1Voucher PIN</Text>
                        <Text style={{ fontSize: 12, color: '#6b7280', marginBottom: 10 }}>
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
                            autoFocus
                        />
                        {topUpError && <Text style={styles.errorText}>{topUpError}</Text>}

                        <TouchableOpacity
                            style={[styles.submitButton, isSubmitting && styles.disabledButton, { marginTop: 20 }]}
                            onPress={handleTopUp}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <ActivityIndicator color="#ffffff" />
                            ) : (
                                <Text style={styles.submitButtonText}>Redeem Voucher</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

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
                                                            source={{ uri: member.member_detail.profile_picture }}
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
                                                source={{ uri: selectedRecipient.member_detail.profile_picture }}
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
                            <Text style={styles.modalTitle}>Withdraw Funds</Text>
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
                            }}>
                                <Text style={styles.closeButton}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.inputLabel}>Withdrawal Channel</Text>
                        <View style={styles.channelOptions}>
                            {[
                                { value: 'bank_transfer', label: 'Bank Transfer', icon: '🏦' },
                                { value: 'mobile_money', label: 'Mobile Money', icon: '📱' },
                                { value: 'voucher', label: 'Voucher', icon: '🎫' }
                            ].map((option) => (
                                <TouchableOpacity
                                    key={option.value}
                                    activeOpacity={0.8}
                                    style={[
                                        styles.channelOption,
                                        withdrawChannel === option.value && styles.channelOptionSelected
                                    ]}
                                    onPress={() => setWithdrawChannel(option.value as any)}
                                >
                                    <Text style={styles.channelOptionIcon}>{option.icon}</Text>
                                    <Text style={[
                                        styles.channelOptionText,
                                        withdrawChannel === option.value && styles.channelOptionTextSelected
                                    ]}>{option.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.inputLabel}>Amount (ZAR)</Text>
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

                                <Text style={styles.inputLabel}>Network Provider</Text>
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
                                <Text style={styles.inputLabel}>Retail Partner</Text>
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
                    </View>
                </KeyboardAvoidingView>
            </Modal>

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
                            <Text style={styles.modalTitle}>Contribute to Fundraiser</Text>
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
                                <Text style={styles.inputLabel}>Select Campaign / Fund</Text>
                                <ScrollView style={styles.memberList}>
                                    {activeCampaigns.map((campaign) => {
                                        const meta = CAMPAIGN_TYPE_META[campaign.campaign_type] || CAMPAIGN_TYPE_META.custom;
                                        return (
                                            <TouchableOpacity
                                                key={campaign.id}
                                                style={styles.deceasedItem}
                                                onPress={() => setSelectedCampaign(campaign)}
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
                                    {activeCampaigns.length === 0 && (
                                        <View style={styles.emptyState}>
                                            <Text style={styles.emptyStateText}>No active campaigns at this time.</Text>
                                        </View>
                                    )}
                                </ScrollView>
                            </>
                        ) : (
                            <>
                                <View style={styles.selectedRecipient}>
                                    <View style={[styles.memberAvatar, { backgroundColor: `${(CAMPAIGN_TYPE_META[selectedCampaign.campaign_type] || CAMPAIGN_TYPE_META.custom).color}15`, justifyContent: 'center', alignItems: 'center' }]}>
                                        <Text style={{ fontSize: 24 }}>{(CAMPAIGN_TYPE_META[selectedCampaign.campaign_type] || CAMPAIGN_TYPE_META.custom).icon}</Text>
                                    </View>
                                    <View style={{ flex: 1, marginLeft: 10 }}>
                                        <Text style={styles.recipientName}>{selectedCampaign.title}</Text>
                                        <Text style={styles.fundProgress}>
                                            Total raised: {formatCurrency(selectedCampaign.total_raised.toString())}
                                            {selectedCampaign.target_amount ? ` of ${formatCurrency(selectedCampaign.target_amount.toString())}` : ''}
                                        </Text>
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
        backgroundColor: '#f3f4f6',
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
        backgroundColor: '#ffffff',
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
    scrollContent: {
        padding: 16,
    },
    balanceCard: {
        backgroundColor: '#2563eb',
        borderRadius: 16,
        padding: 24,
        marginBottom: 24,
        alignItems: 'center',
        shadowColor: '#2563eb',
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
        color: '#ffffff',
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
    },
    actionIcon: {
        fontSize: 24,
        marginBottom: 4,
    },
    actionText: {
        color: '#ffffff',
        fontSize: 12,
        fontWeight: '600',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 16,
    },
    transactionWrapper: {
        marginBottom: 12,
    },
    transactionItem: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    transactionIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#f3f4f6',
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
        color: '#1f2937',
        textTransform: 'capitalize',
    },
    destinationText: {
        fontSize: 13,
        color: '#6b7280',
        marginTop: 2,
    },
    transactionDate: {
        fontSize: 12,
        color: '#9ca3af',
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
        color: '#10b981',
    },
    negativeAmount: {
        color: '#ef4444',
    },
    expandedCard: {
        backgroundColor: '#f8fafc',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        padding: 12,
        marginTop: 8,
    },
    expandedTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: '#1e293b',
        marginBottom: 6,
    },
    expandedText: {
        fontSize: 12,
        color: '#475569',
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
        backgroundColor: '#d1fae5',
    },
    statusTextCOMPLETED: {
        color: '#065f46',
    },
    statusPENDING: {
        backgroundColor: '#fef3c7',
    },
    statusFAILED: {
        backgroundColor: '#fee2e2',
    },
    emptyState: {
        padding: 40,
        alignItems: 'center',
    },
    emptyStateText: {
        color: '#6b7280',
        fontSize: 16,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#ffffff',
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
        color: '#111827',
    },
    closeButton: {
        fontSize: 20,
        color: '#9ca3af',
        padding: 4,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#4b5563',
        marginBottom: 8,
    },
    textInput: {
        backgroundColor: '#f9fafb',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 12,
        padding: 16,
        fontSize: 18,
        color: '#111827',
        marginBottom: 8,
    },
    inputError: {
        borderColor: '#ef4444',
        backgroundColor: '#fef2f2',
    },
    errorText: {
        color: '#ef4444',
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
        borderColor: '#d1d5db',
        backgroundColor: '#fafafa',
        alignItems: 'center',
        justifyContent: 'center',
    },
    channelOptionSelected: {
        backgroundColor: '#2563eb',
        borderColor: '#1d4ed8',
    },
    channelOptionText: {
        fontSize: 13,
        color: '#374151',
        fontWeight: '600',
        textAlign: 'center',
    },
    channelOptionIcon: {
        fontSize: 20,
        marginBottom: 6,
    },
    channelOptionTextSelected: {
        color: '#ffffff',
    },
    presets: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 24,
    },
    presetBtn: {
        backgroundColor: '#eff6ff',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#dbeafe',
    },
    presetText: {
        color: '#2563eb',
        fontWeight: '600',
    },
    submitButton: {
        backgroundColor: '#2563eb',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        shadowColor: '#2563eb',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    submitButtonText: {
        color: '#ffffff',
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
        backgroundColor: '#f9fafb',
        borderRadius: 8,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    memberAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#eff6ff',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#dbeafe',
    },
    avatarImg: {
        width: '100%',
        height: '100%',
    },
    avatarInitial: {
        color: '#2563eb',
        fontWeight: 'bold',
        fontSize: 16,
    },
    memberName: {
        fontSize: 16,
        color: '#111827',
        fontWeight: '600',
    },
    selectedRecipient: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#eff6ff',
        borderRadius: 12,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#dbeafe',
    },
    recipientName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 4,
    },
    changeRecipient: {
        fontSize: 13,
        color: '#2563eb',
        fontWeight: '600',
    },
    deceasedItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        backgroundColor: '#f9fafb',
        borderRadius: 8,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    fundProgress: {
        fontSize: 13,
        color: '#10b981',
        fontWeight: '600',
        marginTop: 2,
    },
    chevron: {
        fontSize: 20,
        color: '#9ca3af',
        marginLeft: 8,
    },
    activeEntityContainer: {
        backgroundColor: '#eff6ff',
        borderColor: '#dbeafe',
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
        color: '#2563eb',
    },
});

export default WalletScreen;
