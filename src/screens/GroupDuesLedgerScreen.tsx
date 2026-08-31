import React, { useEffect, useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    ActivityIndicator, Image, Alert, ScrollView, RefreshControl,
    TextInput, Modal, Dimensions, Platform, KeyboardAvoidingView
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import client, { getMediaUrl } from '../api/client';
import { authenticateAction } from '../utils/biometrics';
import { colors, gradients, shadows } from '../constants/theme';

const { width } = Dimensions.get('window');

interface MemberDetail {
    id: number;
    full_name: string;
    phone?: string;
    profile_picture?: string | null;
}

interface MemberCyclePayment {
    id: number;
    member: number;
    member_detail?: MemberDetail;
    amount_due: string;
    amount_paid: string;
    status: 'pending' | 'paid' | 'overdue' | 'partial';
    paid_at?: string | null;
    payment_method?: string;
    waas_reference_id?: string;
}

interface ContributionCycle {
    id: number;
    title: string;
    cycle_month: number;
    cycle_year: number;
    due_date: string;
    target_amount_per_member: string;
    status: 'active' | 'completed' | 'cancelled';
    total_collected: number;
    total_expected: number;
    paid_count: number;
    unpaid_count: number;
    total_members_count: number;
    progress_percentage: number;
    my_payment?: MemberCyclePayment | null;
    payments?: MemberCyclePayment[];
}

interface RecurringData {
    enabled: boolean;
    recurring_amount: number;
    recurring_frequency: string;
    recurring_due_day: number;
    recurring_title: string;
    recurring_reminder_days: number;
    active_cycle_id: number | null;
    days_until_due: number | null;
    my_active_payment?: MemberCyclePayment | null;
    summary?: {
        total_collected_all_time: number;
        total_due_all_time: number;
        total_cycles_count: number;
        active_cycle_collected: number;
        active_cycle_expected: number;
        active_cycle_paid_count: number;
        active_cycle_unpaid_count: number;
        active_cycle_progress: number;
    };
    cycles: ContributionCycle[];
}

interface GroupDuesLedgerProps {
    group: {
        id: number;
        name: string;
        purpose?: string;
        is_admin?: boolean;
        enable_recurring_contributions?: boolean;
        recurring_amount?: number | string;
        recurring_frequency?: string;
        recurring_title?: string;
    };
    onBack: () => void;
    onEditGroupSettings?: () => void;
    onViewWallet?: () => void;
}

const GroupDuesLedgerScreen: React.FC<GroupDuesLedgerProps> = ({
    group,
    onBack,
    onEditGroupSettings,
    onViewWallet
}) => {
    const insets = useSafeAreaInsets();

    const [recurringData, setRecurringData] = useState<RecurringData | null>(null);
    const [selectedCycleId, setSelectedCycleId] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [ledgerFilter, setLedgerFilter] = useState<'all' | 'paid' | 'pending'>('all');
    const [searchQuery, setSearchQuery] = useState('');

    // Pay Dues Modal
    const [showPayModal, setShowPayModal] = useState(false);
    const [payAmount, setPayAmount] = useState('');
    const [userWalletBalance, setUserWalletBalance] = useState<number | null>(null);
    const [payingDues, setPayingDues] = useState(false);

    // Admin Action States
    const [sendingReminder, setSendingReminder] = useState(false);
    const [showGenerateModal, setShowGenerateModal] = useState(false);
    const [generateTitle, setGenerateTitle] = useState('');
    const [generateAmount, setGenerateAmount] = useState('');
    const [generatingCycle, setGeneratingCycle] = useState(false);

    const fetchRecurringData = useCallback(async () => {
        try {
            const response = await client.get(`groups/${group.id}/recurring_cycles/`);
            const data: RecurringData = response.data;
            setRecurringData(data);

            if (data?.active_cycle_id) {
                setSelectedCycleId(prev => prev ?? data.active_cycle_id);
            } else if (data?.cycles?.length > 0) {
                setSelectedCycleId(prev => prev ?? data.cycles[0].id);
            }
        } catch (error) {
            console.error('Error fetching recurring cycles:', error);
            Alert.alert('Error', 'Failed to load contribution cycles & ledger.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [group.id]);

    const fetchWalletBalance = async () => {
        try {
            const res = await client.get('wallets/');
            const wallet = Array.isArray(res.data) ? res.data[0] : (res.data?.results?.[0] || res.data);
            if (wallet) {
                const bal = parseFloat(wallet.balance ?? wallet.get_balance ?? '0');
                setUserWalletBalance(isNaN(bal) ? 0 : bal);
            }
        } catch (err) {
            console.error('Error fetching wallet:', err);
        }
    };

    useEffect(() => {
        fetchRecurringData();
        fetchWalletBalance();
    }, [fetchRecurringData]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchRecurringData();
        fetchWalletBalance();
    };

    const activeCycle = recurringData?.cycles?.find(c => c.id === selectedCycleId) || recurringData?.cycles?.[0];
    const daysUntilDue = recurringData?.days_until_due;
    const myPayment = activeCycle?.my_payment || (activeCycle?.id === recurringData?.active_cycle_id ? recurringData?.my_active_payment : null);
    const isPaid = myPayment?.status === 'paid';

    // Filter payments for selected cycle
    const filteredPayments = (activeCycle?.payments || []).filter(p => {
        if (ledgerFilter === 'paid' && p.status !== 'paid') return false;
        if (ledgerFilter === 'pending' && p.status === 'paid') return false;
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            const name = p.member_detail?.full_name?.toLowerCase() || '';
            const phone = p.member_detail?.phone?.toLowerCase() || '';
            return name.includes(q) || phone.includes(q);
        }
        return true;
    });

    const handleOpenPayModal = () => {
        const defaultAmt = parseFloat(activeCycle?.target_amount_per_member || String(recurringData?.recurring_amount || '100')).toFixed(2);
        setPayAmount(defaultAmt);
        setShowPayModal(true);
        fetchWalletBalance();
    };

    const handleConfirmPayDues = async () => {
        const amt = parseFloat(payAmount);
        if (isNaN(amt) || amt <= 0) {
            Alert.alert('Invalid Amount', 'Please enter a valid contribution amount.');
            return;
        }

        if (userWalletBalance !== null && userWalletBalance < amt) {
            Alert.alert(
                'Insufficient Funds',
                `Your wallet balance (R ${userWalletBalance.toFixed(2)}) is less than the required amount (R ${amt.toFixed(2)}). Would you like to top up your wallet?`,
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Go to Wallet', onPress: () => { setShowPayModal(false); onViewWallet?.(); } }
                ]
            );
            return;
        }

        const authenticated = await authenticateAction('Authorize dues payment from your digital wallet');
        if (!authenticated) return;

        setPayingDues(true);
        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            const res = await client.post(`groups/${group.id}/pay_cycle/`, {
                cycle_id: activeCycle?.id || recurringData?.active_cycle_id,
                amount: amt,
            });

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert('Payment Successful', res.data?.message || `Successfully contributed R ${amt.toFixed(2)} for ${activeCycle?.title || 'this cycle'}!`);
            setShowPayModal(false);
            fetchRecurringData();
            fetchWalletBalance();
        } catch (error: any) {
            console.error('Error paying dues:', error);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert('Payment Failed', error.response?.data?.error || error.response?.data?.detail || 'Failed to complete dues payment.');
        } finally {
            setPayingDues(false);
        }
    };

    const handleSendReminder = async () => {
        Alert.alert(
            'Send Dues Reminder',
            `Send automated due date reminders and SMS notifications to ${activeCycle?.unpaid_count || 0} unpaid members for ${activeCycle?.title}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Send Reminders',
                    onPress: async () => {
                        setSendingReminder(true);
                        try {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            const res = await client.post(`groups/${group.id}/send_cycle_reminder/`, {
                                cycle_id: activeCycle?.id || recurringData?.active_cycle_id,
                            });
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                            Alert.alert('Reminders Sent', res.data?.message || 'Reminders dispatched to unpaid members successfully.');
                            fetchRecurringData();
                        } catch (error: any) {
                            console.error('Error sending reminder:', error);
                            Alert.alert('Error', error.response?.data?.error || 'Failed to send reminders.');
                        } finally {
                            setSendingReminder(false);
                        }
                    }
                }
            ]
        );
    };

    const handleGenerateCycle = async () => {
        const amt = parseFloat(generateAmount || String(recurringData?.recurring_amount || 100));
        if (isNaN(amt) || amt <= 0) {
            Alert.alert('Invalid Amount', 'Please specify a target amount per member.');
            return;
        }

        setGeneratingCycle(true);
        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            const res = await client.post(`groups/${group.id}/generate_cycle/`, {
                title: generateTitle.trim() || undefined,
                target_amount: amt,
            });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert('Cycle Created', `Contribution cycle "${res.data.title}" is now active.`);
            setShowGenerateModal(false);
            setGenerateTitle('');
            setGenerateAmount('');
            fetchRecurringData();
        } catch (error: any) {
            console.error('Error generating cycle:', error);
            Alert.alert('Error', error.response?.data?.error || 'Failed to create contribution cycle.');
        } finally {
            setGeneratingCycle(false);
        }
    };

    const formatDate = (dateStr?: string | null) => {
        if (!dateStr) return '';
        try {
            const d = new Date(dateStr);
            return d.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
        } catch {
            return dateStr;
        }
    };

    if (loading) {
        return (
            <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Loading Dues & Contribution Ledger...</Text>
            </View>
        );
    }

    // If recurring dues is disabled for this community
    if (!recurringData?.enabled) {
        return (
            <View style={[styles.container, { paddingTop: insets.top }]}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={onBack} style={styles.backButton}>
                        <Text style={styles.backButtonText}>←</Text>
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Dues & Ledger</Text>
                    <View style={{ width: 40 }} />
                </View>

                <ScrollView
                    contentContainerStyle={styles.emptyContainer}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />}
                >
                    <View style={styles.emptyIconCircle}>
                        <Text style={{ fontSize: 44 }}>🗓️</Text>
                    </View>
                    <Text style={styles.emptyTitle}>Scheduled Dues Not Enabled</Text>
                    <Text style={styles.emptyDescription}>
                        Scheduled recurring contributions, due date reminders, and member payment ledgers are not enabled for &quot;{group.name}&quot;.
                    </Text>
                    {group.is_admin ? (
                        <TouchableOpacity
                            style={styles.enableButton}
                            onPress={onEditGroupSettings}
                            activeOpacity={0.85}
                        >
                            <LinearGradient
                                colors={[colors.primary, colors.primaryLight]}
                                style={styles.enableButtonGradient}
                            >
                                <Text style={styles.enableButtonText}>⚙️ Configure Recurring Dues in Settings</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    ) : (
                        <Text style={styles.memberNoteText}>
                            Group administrators can enable automated contribution cycles with full transparency tracking.
                        </Text>
                    )}
                </ScrollView>
            </View>
        );
    }

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack} style={styles.backButton}>
                    <Text style={styles.backButtonText}>←</Text>
                </TouchableOpacity>
                <View style={{ flex: 1, alignItems: 'center' }}>
                    <Text style={styles.headerTitle} numberOfLines={1}>Dues & Ledger</Text>
                    <Text style={styles.headerSubtitle} numberOfLines={1}>{group.name}</Text>
                </View>
                {group.is_admin ? (
                    <TouchableOpacity
                        onPress={() => setShowGenerateModal(true)}
                        style={styles.headerActionBtn}
                        accessibilityLabel="New Cycle"
                    >
                        <Text style={styles.headerActionBtnText}>➕</Text>
                    </TouchableOpacity>
                ) : (
                    <View style={{ width: 40 }} />
                )}
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={[colors.primary]}
                        tintColor={colors.primary}
                    />
                }
            >
                {/* ══ HERO ACTIVE CYCLE CARD ══ */}
                <LinearGradient
                    colors={['#002f5e', '#00458b', '#005cb3']}
                    style={styles.heroCard}
                >
                    {/* Top Row: Frequency badge & Due date status */}
                    <View style={styles.heroTopRow}>
                        <View style={styles.frequencyBadge}>
                            <Text style={styles.frequencyBadgeText}>
                                {(recurringData.recurring_frequency || 'monthly').toUpperCase()} CYCLE
                            </Text>
                        </View>

                        {activeCycle?.due_date && (
                            <View style={[
                                styles.dueDateBadge,
                                typeof daysUntilDue === 'number' && daysUntilDue < 0
                                    ? styles.dueDateOverdue
                                    : typeof daysUntilDue === 'number' && daysUntilDue === 0
                                    ? styles.dueDateToday
                                    : styles.dueDateUpcoming
                            ]}>
                                <Text style={[
                                    styles.dueDateBadgeText,
                                    typeof daysUntilDue === 'number' && daysUntilDue < 0
                                        ? styles.dueDateTextOverdue
                                        : typeof daysUntilDue === 'number' && daysUntilDue === 0
                                        ? styles.dueDateTextToday
                                        : styles.dueDateTextUpcoming
                                ]}>
                                    {typeof daysUntilDue === 'number' && daysUntilDue < 0
                                        ? `⚠️ Overdue by ${Math.abs(daysUntilDue)}d`
                                        : typeof daysUntilDue === 'number' && daysUntilDue === 0
                                        ? '🔔 Due Today'
                                        : `🗓️ Due ${formatDate(activeCycle.due_date)}${typeof daysUntilDue === 'number' ? ` (${daysUntilDue}d left)` : ''}`}
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* Title & Expected Amount */}
                    <Text style={styles.heroCycleTitle}>
                        {activeCycle?.title || recurringData.recurring_title || 'Monthly Contribution'}
                    </Text>
                    <Text style={styles.heroExpectedText}>
                        Expected: <Text style={{ fontWeight: '800', color: '#fff' }}>R {parseFloat(activeCycle?.target_amount_per_member || String(recurringData.recurring_amount || '0')).toFixed(2)}</Text> per member
                    </Text>

                    {/* Member Personal Action & Status */}
                    <View style={styles.personalStatusContainer}>
                        {isPaid ? (
                            <View style={styles.paidPill}>
                                <Text style={styles.paidPillText}>
                                    ✓ Paid for this cycle (R {parseFloat(myPayment?.amount_paid || '0').toFixed(2)})
                                </Text>
                            </View>
                        ) : (
                            <TouchableOpacity
                                style={styles.payDuesButton}
                                onPress={handleOpenPayModal}
                                activeOpacity={0.85}
                            >
                                <LinearGradient
                                    colors={['#10b981', '#059669']}
                                    style={styles.payDuesGradient}
                                >
                                    <Text style={styles.payDuesButtonText}>
                                        ⚡ Pay My Dues (R {parseFloat(activeCycle?.target_amount_per_member || String(recurringData.recurring_amount || '100')).toFixed(2)})
                                    </Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        )}

                        {group.is_admin && (
                            <TouchableOpacity
                                style={[styles.reminderBtn, sendingReminder && { opacity: 0.6 }]}
                                onPress={handleSendReminder}
                                disabled={sendingReminder}
                            >
                                <Text style={styles.reminderBtnText}>
                                    {sendingReminder ? 'Sending…' : `🔔 Remind Unpaid (${activeCycle?.unpaid_count || 0})`}
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Collection Progress & Stats */}
                    <View style={styles.progressSection}>
                        <View style={styles.progressLabels}>
                            <Text style={styles.progressLabelLeft}>
                                Total Collected: <Text style={{ color: '#3fd2c7', fontWeight: '800' }}>R {(activeCycle?.total_collected || 0).toFixed(2)}</Text>
                            </Text>
                            <Text style={styles.progressLabelRight}>
                                {activeCycle?.paid_count || 0}/{activeCycle?.total_members_count || (activeCycle?.payments?.length || 0)} Paid ({activeCycle?.progress_percentage || 0}%)
                            </Text>
                        </View>
                        <View style={styles.progressBarTrack}>
                            <View style={[styles.progressBarFill, { width: `${Math.min(100, Math.max(0, activeCycle?.progress_percentage || 0))}%` }]} />
                        </View>
                    </View>
                </LinearGradient>

                {/* ══ CYCLE TIMELINE / PICKER ══ */}
                {recurringData.cycles && recurringData.cycles.length > 1 && (
                    <View style={styles.cyclePickerContainer}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cyclePickerScroll}>
                            {recurringData.cycles.map(c => {
                                const isSelected = (selectedCycleId === c.id) || (!selectedCycleId && c.id === recurringData.active_cycle_id);
                                return (
                                    <TouchableOpacity
                                        key={c.id}
                                        style={[styles.cyclePill, isSelected && styles.cyclePillActive]}
                                        onPress={() => setSelectedCycleId(c.id)}
                                    >
                                        <Text style={[styles.cyclePillText, isSelected && styles.cyclePillTextActive]}>
                                            🗓️ {c.title} {c.status === 'active' ? '●' : ''}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    </View>
                )}

                {/* ══ ALL-TIME SUMMARY CARDS ══ */}
                {recurringData.summary && (
                    <View style={styles.summaryRow}>
                        <View style={styles.summaryCard}>
                            <Text style={styles.summaryLabel}>Total Collected (All-Time)</Text>
                            <Text style={styles.summaryValue}>R {recurringData.summary.total_collected_all_time.toFixed(2)}</Text>
                        </View>
                        <View style={styles.summaryCard}>
                            <Text style={styles.summaryLabel}>Total Cycles</Text>
                            <Text style={styles.summaryValue}>{recurringData.summary.total_cycles_count}</Text>
                        </View>
                    </View>
                )}

                {/* ══ CONTRIBUTION LEDGER SECTION ══ */}
                <View style={styles.ledgerCard}>
                    {/* Header with Title and Filter Pills */}
                    <View style={styles.ledgerHeader}>
                        <View>
                            <Text style={styles.ledgerTitle}>📜 Member Contribution Ledger</Text>
                            <Text style={styles.ledgerCount}>{filteredPayments.length} records</Text>
                        </View>
                        <View style={styles.filterPillGroup}>
                            {(['all', 'paid', 'pending'] as const).map(f => (
                                <TouchableOpacity
                                    key={f}
                                    style={[styles.filterPill, ledgerFilter === f && styles.filterPillActive]}
                                    onPress={() => setLedgerFilter(f)}
                                >
                                    <Text style={[styles.filterPillText, ledgerFilter === f && styles.filterPillTextActive]}>
                                        {f.charAt(0).toUpperCase() + f.slice(1)}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* Search Input */}
                    <View style={styles.searchContainer}>
                        <Text style={styles.searchIcon}>🔍</Text>
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search member by name or phone..."
                            placeholderTextColor={colors.textMuted}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => setSearchQuery('')}>
                                <Text style={styles.clearSearchText}>✕</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Ledger Rows */}
                    {filteredPayments.length === 0 ? (
                        <View style={styles.emptyLedger}>
                            <Text style={styles.emptyLedgerText}>No payment records matching your filter.</Text>
                        </View>
                    ) : (
                        filteredPayments.map(payment => {
                            const isPaidRow = payment.status === 'paid';
                            const memberName = payment.member_detail?.full_name || 'Member';
                            const initial = memberName.charAt(0).toUpperCase() || 'M';
                            const profilePic = payment.member_detail?.profile_picture ? getMediaUrl(payment.member_detail.profile_picture) : null;

                            return (
                                <View key={payment.id} style={styles.ledgerRow}>
                                    {/* Member Avatar */}
                                    {profilePic ? (
                                        <Image source={{ uri: profilePic }} style={styles.memberAvatar} />
                                    ) : (
                                        <View style={styles.avatarPlaceholder}>
                                            <Text style={styles.avatarText}>{initial}</Text>
                                        </View>
                                    )}

                                    {/* Member Details */}
                                    <View style={styles.memberInfo}>
                                        <Text style={styles.memberName} numberOfLines={1}>{memberName}</Text>
                                        {payment.member_detail?.phone ? (
                                            <Text style={styles.memberPhone}>{payment.member_detail.phone}</Text>
                                        ) : null}
                                        {isPaidRow && payment.paid_at ? (
                                            <Text style={styles.paymentMeta}>
                                                Paid {formatDate(payment.paid_at)} {payment.payment_method ? `• ${payment.payment_method}` : ''}
                                            </Text>
                                        ) : null}
                                    </View>

                                    {/* Financial Amounts & Status Badge */}
                                    <View style={styles.paymentStatusCol}>
                                        <View style={[styles.statusBadge, isPaidRow ? styles.statusBadgePaid : styles.statusBadgePending]}>
                                            <Text style={[styles.statusBadgeText, isPaidRow ? styles.statusTextPaid : styles.statusTextPending]}>
                                                {isPaidRow ? '✓ Paid' : '⏳ Pending'}
                                            </Text>
                                        </View>
                                        <Text style={[styles.amountText, isPaidRow ? styles.amountPaidText : styles.amountDueText]}>
                                            {isPaidRow
                                                ? `R ${parseFloat(payment.amount_paid || '0').toFixed(2)}`
                                                : `Due R ${parseFloat(payment.amount_due || '0').toFixed(2)}`}
                                        </Text>
                                    </View>
                                </View>
                            );
                        })
                    )}
                </View>
            </ScrollView>

            {/* ══ PAY DUES MODAL ══ */}
            <Modal
                visible={showPayModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowPayModal(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    style={styles.modalOverlay}
                >
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>⚡ Pay Contribution Dues</Text>
                            <TouchableOpacity onPress={() => setShowPayModal(false)} style={styles.modalCloseBtn}>
                                <Text style={styles.modalCloseBtnText}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.modalSubtitle}>
                            Contributing towards <Text style={{ fontWeight: '700', color: colors.primary }}>{activeCycle?.title || 'Monthly Contribution'}</Text>
                        </Text>

                        {/* Wallet Balance Display */}
                        <View style={styles.walletBalanceBox}>
                            <Text style={styles.walletBalanceLabel}>Available Wallet Balance</Text>
                            <Text style={styles.walletBalanceValue}>
                                R {userWalletBalance !== null ? userWalletBalance.toFixed(2) : '...'}
                            </Text>
                        </View>

                        {/* Amount Input */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Contribution Amount (R)</Text>
                            <TextInput
                                style={styles.amountInput}
                                value={payAmount}
                                onChangeText={setPayAmount}
                                keyboardType="decimal-pad"
                                placeholder="0.00"
                                placeholderTextColor={colors.textMuted}
                            />
                        </View>

                        <Text style={styles.modalInfoNote}>
                            💡 Payment will be deducted directly from your Komunity wallet and recorded on the group ledger instantly.
                        </Text>

                        {/* Confirm Button */}
                        <TouchableOpacity
                            style={[styles.confirmPayButton, payingDues && { opacity: 0.7 }]}
                            onPress={handleConfirmPayDues}
                            disabled={payingDues}
                            activeOpacity={0.85}
                        >
                            <LinearGradient
                                colors={['#10b981', '#059669']}
                                style={styles.confirmPayGradient}
                            >
                                {payingDues ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Text style={styles.confirmPayButtonText}>
                                        Confirm Payment • R {parseFloat(payAmount || '0').toFixed(2)}
                                    </Text>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* ══ ADMIN GENERATE CYCLE MODAL ══ */}
            <Modal
                visible={showGenerateModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowGenerateModal(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    style={styles.modalOverlay}
                >
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>➕ Generate Contribution Cycle</Text>
                            <TouchableOpacity onPress={() => setShowGenerateModal(false)} style={styles.modalCloseBtn}>
                                <Text style={styles.modalCloseBtnText}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.modalSubtitle}>
                            Create a new scheduled collection cycle and populate member payment slots for tracking.
                        </Text>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Cycle Title (Optional)</Text>
                            <TextInput
                                style={styles.textInput}
                                value={generateTitle}
                                onChangeText={setGenerateTitle}
                                placeholder="e.g. September 2026 Monthly Contribution"
                                placeholderTextColor={colors.textMuted}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Target Amount per Member (R)</Text>
                            <TextInput
                                style={styles.amountInput}
                                value={generateAmount}
                                onChangeText={setGenerateAmount}
                                keyboardType="decimal-pad"
                                placeholder={String(recurringData.recurring_amount || '100')}
                                placeholderTextColor={colors.textMuted}
                            />
                        </View>

                        <TouchableOpacity
                            style={[styles.confirmPayButton, generatingCycle && { opacity: 0.7 }]}
                            onPress={handleGenerateCycle}
                            disabled={generatingCycle}
                            activeOpacity={0.85}
                        >
                            <LinearGradient
                                colors={[colors.primary, colors.primaryLight]}
                                style={styles.confirmPayGradient}
                            >
                                {generatingCycle ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Text style={styles.confirmPayButtonText}>Create & Activate Cycle</Text>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
};

export default GroupDuesLedgerScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f8fafc',
        gap: 12,
    },
    loadingText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textSecondary,
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
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.surfaceLight,
    },
    backButtonText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: colors.primary,
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: '800',
        color: colors.textPrimary,
    },
    headerSubtitle: {
        fontSize: 12,
        fontWeight: '500',
        color: colors.textSecondary,
        marginTop: 1,
    },
    headerActionBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.surfaceTeal,
    },
    headerActionBtnText: {
        fontSize: 16,
    },
    scrollContent: {
        padding: 16,
        gap: 14,
        paddingBottom: 40,
    },

    // Empty state
    emptyContainer: {
        padding: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyIconCircle: {
        width: 88,
        height: 88,
        borderRadius: 44,
        backgroundColor: colors.surfaceLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 19,
        fontWeight: '800',
        color: colors.textPrimary,
        textAlign: 'center',
        marginBottom: 8,
    },
    emptyDescription: {
        fontSize: 14,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 21,
        marginBottom: 24,
    },
    enableButton: {
        borderRadius: 12,
        overflow: 'hidden',
        width: '100%',
    },
    enableButtonGradient: {
        paddingVertical: 14,
        paddingHorizontal: 20,
        alignItems: 'center',
    },
    enableButtonText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 14,
    },
    memberNoteText: {
        fontSize: 13,
        color: colors.textMuted,
        textAlign: 'center',
        fontStyle: 'italic',
    },

    // Hero Card
    heroCard: {
        borderRadius: 18,
        padding: 18,
        ...shadows.md,
    },
    heroTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 10,
    },
    frequencyBadge: {
        backgroundColor: 'rgba(255,255,255,0.18)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    frequencyBadgeText: {
        color: '#99ddff',
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    dueDateBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999,
        borderWidth: 1,
    },
    dueDateOverdue: {
        backgroundColor: 'rgba(239, 68, 68, 0.25)',
        borderColor: 'rgba(239, 68, 68, 0.5)',
    },
    dueDateToday: {
        backgroundColor: 'rgba(245, 158, 11, 0.25)',
        borderColor: 'rgba(245, 158, 11, 0.5)',
    },
    dueDateUpcoming: {
        backgroundColor: 'rgba(16, 185, 129, 0.25)',
        borderColor: 'rgba(16, 185, 129, 0.5)',
    },
    dueDateBadgeText: {
        fontSize: 11,
        fontWeight: '700',
    },
    dueDateTextOverdue: { color: '#fca5a5' },
    dueDateTextToday: { color: '#fde68a' },
    dueDateTextUpcoming: { color: '#6ee7b7' },

    heroCycleTitle: {
        color: '#fff',
        fontSize: 19,
        fontWeight: '900',
        marginBottom: 4,
    },
    heroExpectedText: {
        color: 'rgba(255,255,255,0.85)',
        fontSize: 13,
        marginBottom: 14,
    },

    personalStatusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 16,
    },
    paidPill: {
        backgroundColor: 'rgba(16, 185, 129, 0.22)',
        borderWidth: 1,
        borderColor: 'rgba(16, 185, 129, 0.45)',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 999,
    },
    paidPillText: {
        color: '#6ee7b7',
        fontSize: 13,
        fontWeight: '800',
    },
    payDuesButton: {
        borderRadius: 12,
        overflow: 'hidden',
        flex: 1,
        minWidth: 160,
    },
    payDuesGradient: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        alignItems: 'center',
    },
    payDuesButtonText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '800',
    },
    reminderBtn: {
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
        paddingHorizontal: 12,
        paddingVertical: 9,
        borderRadius: 10,
    },
    reminderBtnText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '700',
    },

    progressSection: {
        gap: 6,
    },
    progressLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    progressLabelLeft: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: 12,
    },
    progressLabelRight: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 11,
        fontWeight: '600',
    },
    progressBarTrack: {
        height: 8,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: '#3fd2c7',
        borderRadius: 4,
    },

    // Cycle Timeline Picker
    cyclePickerContainer: {
        marginVertical: 2,
    },
    cyclePickerScroll: {
        gap: 8,
    },
    cyclePill: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 999,
        backgroundColor: colors.white,
        borderWidth: 1,
        borderColor: colors.border,
    },
    cyclePillActive: {
        backgroundColor: '#e6faf8',
        borderColor: colors.accentDark,
    },
    cyclePillText: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    cyclePillTextActive: {
        color: colors.primary,
        fontWeight: '800',
    },

    // Summary Row
    summaryRow: {
        flexDirection: 'row',
        gap: 10,
    },
    summaryCard: {
        flex: 1,
        backgroundColor: colors.white,
        borderRadius: 14,
        padding: 14,
        borderWidth: 1,
        borderColor: colors.border,
    },
    summaryLabel: {
        fontSize: 11,
        color: colors.textMuted,
        fontWeight: '600',
        marginBottom: 4,
    },
    summaryValue: {
        fontSize: 16,
        fontWeight: '800',
        color: colors.primary,
    },

    // Ledger Card
    ledgerCard: {
        backgroundColor: colors.white,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: 'hidden',
        ...shadows.sm,
    },
    ledgerHeader: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 10,
    },
    ledgerTitle: {
        fontSize: 15,
        fontWeight: '800',
        color: colors.textPrimary,
    },
    ledgerCount: {
        fontSize: 11,
        color: colors.textMuted,
        marginTop: 2,
    },
    filterPillGroup: {
        flexDirection: 'row',
        backgroundColor: colors.surfaceLight,
        borderRadius: 8,
        padding: 3,
        gap: 4,
    },
    filterPill: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
    },
    filterPillActive: {
        backgroundColor: colors.primary,
    },
    filterPillText: {
        fontSize: 11,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    filterPillTextActive: {
        color: '#fff',
        fontWeight: '800',
    },

    // Search
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
        backgroundColor: '#fafbfc',
    },
    searchIcon: {
        fontSize: 14,
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 13,
        color: colors.textPrimary,
        padding: 0,
    },
    clearSearchText: {
        fontSize: 13,
        color: colors.textMuted,
        paddingHorizontal: 6,
    },

    // Ledger Rows
    emptyLedger: {
        padding: 32,
        alignItems: 'center',
    },
    emptyLedgerText: {
        fontSize: 13,
        color: colors.textMuted,
    },
    ledgerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
    },
    memberAvatar: {
        width: 38,
        height: 38,
        borderRadius: 19,
        marginRight: 12,
    },
    avatarPlaceholder: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: colors.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    avatarText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '800',
    },
    memberInfo: {
        flex: 1,
        marginRight: 10,
    },
    memberName: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.textPrimary,
    },
    memberPhone: {
        fontSize: 11,
        color: colors.textMuted,
        marginTop: 1,
    },
    paymentMeta: {
        fontSize: 10,
        color: colors.success,
        marginTop: 2,
        fontWeight: '600',
    },
    paymentStatusCol: {
        alignItems: 'flex-end',
        gap: 3,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 999,
        borderWidth: 1,
    },
    statusBadgePaid: {
        backgroundColor: colors.successLight,
        borderColor: 'rgba(16, 185, 129, 0.4)',
    },
    statusBadgePending: {
        backgroundColor: colors.warningLight,
        borderColor: 'rgba(245, 158, 11, 0.4)',
    },
    statusBadgeText: {
        fontSize: 10,
        fontWeight: '800',
    },
    statusTextPaid: { color: '#047857' },
    statusTextPending: { color: '#b45309' },
    amountText: {
        fontSize: 12,
    },
    amountPaidText: {
        fontWeight: '800',
        color: colors.textPrimary,
    },
    amountDueText: {
        color: colors.textMuted,
    },

    // Modals
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.55)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: colors.white,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 22,
        paddingBottom: Platform.OS === 'ios' ? 40 : 24,
        gap: 16,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: colors.textPrimary,
    },
    modalCloseBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.surfaceLight,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalCloseBtnText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: colors.textSecondary,
    },
    modalSubtitle: {
        fontSize: 13,
        color: colors.textSecondary,
        lineHeight: 18,
    },
    walletBalanceBox: {
        backgroundColor: colors.surfaceTeal,
        borderRadius: 12,
        padding: 14,
        borderWidth: 1,
        borderColor: 'rgba(63, 210, 199, 0.3)',
    },
    walletBalanceLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    walletBalanceValue: {
        fontSize: 20,
        fontWeight: '900',
        color: colors.primary,
        marginTop: 2,
    },
    inputGroup: {
        gap: 6,
    },
    inputLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.textPrimary,
    },
    amountInput: {
        backgroundColor: colors.surfaceLight,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: colors.border,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 18,
        fontWeight: '800',
        color: colors.textPrimary,
    },
    textInput: {
        backgroundColor: colors.surfaceLight,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: colors.border,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 14,
        color: colors.textPrimary,
    },
    modalInfoNote: {
        fontSize: 11,
        color: colors.textMuted,
        lineHeight: 16,
    },
    confirmPayButton: {
        borderRadius: 12,
        overflow: 'hidden',
        marginTop: 4,
    },
    confirmPayGradient: {
        paddingVertical: 14,
        alignItems: 'center',
    },
    confirmPayButtonText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '800',
    },
});
