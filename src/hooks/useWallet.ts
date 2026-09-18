import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import client from '../api/client';
import { authenticateAction } from '../utils/biometrics';
import { validateAmount, validatePhone } from '../utils/validation';

export interface Transaction {
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
    destination_group_detail?: { id?: number; name: string };
    recipient_wallet_detail?: { user_id?: number; full_name?: string; user_email?: string };
    sender_wallet_detail?: { user_id?: number; full_name?: string; user_email?: string };
    wallet_detail?: { user_id?: number; user_email?: string; full_name?: string };
    fund_campaign_detail?: { id?: number; title: string; campaign_type?: string };
    deceased_contribution_detail?: { full_name: string; group?: string };
    description?: string;
    from_label?: { full_name?: string; email?: string };
    to_label?: { full_name?: string; email?: string };
}

export interface SavedCardItem {
    id: number;
    card_brand: string;
    last4: string;
    expiry_month: string;
    expiry_year: string;
    is_default: boolean;
    created_at: string;
}

export type WithdrawChannel = 'bank_transfer' | 'mobile_money' | 'voucher' | 'send_money';

type PendingPinAction =
    | { type: 'send'; recipientId: number; amount: string; recipientName: string }
    | { type: 'withdraw'; amount: string; channel: string; metadata: Record<string, string> };

export const RETAIL_PARTNERS = ['Shoprite', 'Pick n Pay', 'Checkers', 'Spar', 'Boxer', 'Flash', '1Voucher'];
export const NETWORK_PROVIDERS = ['MTN', 'Vodacom', 'Cell C', 'Telkom', 'Airtel', 'EcoCash'];

export const CAMPAIGN_TYPE_META: Record<string, { icon: string; color: string; label: string }> = {
    bereavement: { icon: '🕊️', color: '#2563eb', label: 'Bereavement' },
    excess:      { icon: '🚗', color: '#60a5fa', label: 'Insurance Excess' },
    emergency:   { icon: '🆘', color: '#ef4444', label: 'Emergency' },
    custom:      { icon: '✨', color: '#22c55e', label: 'Custom' },
};

export function formatCurrency(amount: string | number) {
    return new Intl.NumberFormat('en-ZA', {
        style: 'currency',
        currency: 'ZAR',
    }).format(parseFloat(String(amount)));
}

export function formatDate(dateString: string) {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function getTransactionIcon(type: string) {
    switch (type) {
        case 'TOP_UP': return '💰';
        case 'TRANSFER': return '📤';
        case 'WITHDRAWAL': return '📥';
        case 'PAYOUT_RECEIVED': return '🎁';
        case 'P2P_SENT': return '💸';
        case 'P2P_RECEIVED': return '💵';
        default: return '💸';
    }
}

export function useWallet(initialCampaign?: any, onClearInitialCampaign?: () => void) {
    const [balance, setBalance] = useState('0.00');
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [savedCards, setSavedCards] = useState<SavedCardItem[]>([]);
    const [members, setMembers] = useState<any[]>([]);
    const [activeCampaigns, setActiveCampaigns] = useState<any[]>([]);
    const [joinedGroups, setJoinedGroups] = useState<any[]>([]);
    const [activeGroupOrOrg, setActiveGroupOrOrg] = useState<string | null>(null);
    const [activeGroupId, setActiveGroupId] = useState<number | null>(null);

    // Modal visibility
    const [showTopUp, setShowTopUp] = useState(false);
    const [showSendMoney, setShowSendMoney] = useState(false);
    const [showWithdraw, setShowWithdraw] = useState(false);
    const [showContribute, setShowContribute] = useState(false);
    const [showPinModal, setShowPinModal] = useState(false);
    const [pinModalTitle, setPinModalTitle] = useState('Confirm Security PIN');
    const [pinModalDescription, setPinModalDescription] = useState('Please enter your 4-digit security PIN to authorize this transaction.');
    const [pendingPinAction, setPendingPinAction] = useState<PendingPinAction | null>(null);

    // ── Data fetching ──────────────────────────────────────────────
    const fetchSavedCards = useCallback(async () => {
        try {
            const res = await client.get('wallets/saved_cards/');
            const cards: SavedCardItem[] = res.data || [];
            setSavedCards(cards);
        } catch (error) {
            console.error('Error fetching saved cards:', error);
        }
    }, []);

    const fetchActiveCampaigns = useCallback(async (grpId?: number | null) => {
        try {
            const endpoint = grpId ? `campaigns/?group=${grpId}` : 'campaigns/';
            const response = await client.get(endpoint);
            const data = Array.isArray(response.data) ? response.data : response.data?.results || [];
            setActiveCampaigns(data.filter((c: any) => c.contributions_open));
        } catch (error) {
            console.error('Error fetching active campaigns:', error);
        }
    }, []);

    const fetchMembers = useCallback(async () => {
        try {
            const response = await client.get('groups/active_members/');
            setMembers(response.data);
        } catch (error) {
            console.error('Error fetching members:', error);
        }
    }, []);

    const fetchData = useCallback(async () => {
        try {
            const [balanceRes, transRes, groupsRes] = await Promise.all([
                client.get('wallets/balance/'),
                client.get('transactions/'),
                client.get('groups/mine/').catch(() => ({ data: [] })),
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
            fetchSavedCards();
        } catch (error) {
            console.error('Error fetching wallet data:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [fetchActiveCampaigns, fetchSavedCards]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchData();
        fetchSavedCards();
    }, [fetchData, fetchSavedCards]);

    useEffect(() => {
        fetchData();
        fetchMembers();
    }, []);

    useEffect(() => {
        if (initialCampaign) {
            setShowContribute(true);
            onClearInitialCampaign?.();
        }
    }, [initialCampaign]);

    // ── Saved Card Actions ─────────────────────────────────────────
    const handleDeleteSavedCard = useCallback((cardId: number) => {
        Alert.alert('Remove Saved Card', 'Are you sure you want to remove this saved card?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Remove',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await client.post('wallets/delete_saved_card/', { card_id: cardId });
                        setSavedCards(prev => prev.filter(c => c.id !== cardId));
                    } catch (err: any) {
                        Alert.alert('Error', err.response?.data?.error || 'Failed to remove saved card.');
                    }
                },
            },
        ]);
    }, []);

    // ── Top Up ─────────────────────────────────────────────────────
    const submitVoucherTopUp = useCallback(async (voucherPin: string) => {
        await client.post('wallets/top_up/', { payment_method: 'voucher', voucher_pin: voucherPin.trim() });
        Alert.alert('Success', 'Voucher redeemed successfully! Your balance has been updated.');
        setShowTopUp(false);
        fetchData();
    }, [fetchData]);

    const submitCardTopUp = useCallback(async (params: {
        savedCardId?: number | 'new';
        amount: string;
        cardNumber?: string;
        cardExpiry?: string;
        cardCvv?: string;
        saveCard?: boolean;
    }) => {
        if (params.savedCardId && params.savedCardId !== 'new') {
            await client.post('wallets/top_up/', {
                payment_method: 'saved_card',
                saved_card_id: params.savedCardId,
                amount: params.amount,
            });
        } else {
            const parts = (params.cardExpiry || '').split('/');
            await client.post('wallets/top_up/', {
                payment_method: 'card',
                amount: params.amount,
                card_number: (params.cardNumber || '').replace(/\s+/g, ''),
                expiry_month: parts[0]?.trim() || '',
                expiry_year: parts[1]?.trim() || '',
                cvv: params.cardCvv,
                save_card: params.saveCard,
            });
            fetchSavedCards();
        }
        Alert.alert('Success', 'Card payment processed successfully! Your balance has been updated.');
        setShowTopUp(false);
        fetchData();
    }, [fetchData, fetchSavedCards]);

    // ── Send Money ─────────────────────────────────────────────────
    const initiateSendMoney = useCallback(async (recipient: any, amount: string) => {
        const amtError = validateAmount(amount, 0, parseFloat(balance));
        if (amtError) return amtError;

        const authenticated = await authenticateAction(
            `Authenticate to send ${formatCurrency(amount)} to ${recipient.member_detail.full_name}`
        );
        if (!authenticated) return null;

        setPinModalTitle('Authorize Money Transfer');
        setPinModalDescription(`Please enter your 4-digit security PIN to send ${formatCurrency(amount)} to ${recipient.member_detail.full_name}.`);
        setPendingPinAction({
            type: 'send',
            recipientId: recipient.member_detail.user,
            amount,
            recipientName: recipient.member_detail.full_name,
        });
        setShowPinModal(true);
        return null;
    }, [balance]);

    // ── Withdraw ───────────────────────────────────────────────────
    const initiateWithdraw = useCallback(async (
        channel: WithdrawChannel,
        amount: string,
        metadata: Record<string, string>,
        withdrawPartner: string,
    ) => {
        const amtError = validateAmount(amount, 0, parseFloat(balance));
        if (amtError) return amtError;

        if (channel === 'bank_transfer') {
            if (!metadata.account_number) return 'Account number is required.';
            if (!metadata.bank_code) return 'Bank code is required.';
        } else if (channel === 'mobile_money') {
            const phoneError = validatePhone(metadata.phone_number?.trim() || '');
            if (!metadata.phone_number?.trim()) return 'Mobile money number is required.';
            if (phoneError) return phoneError;
            if (!metadata.provider?.trim()) return 'Network provider is required.';
        } else if (channel === 'voucher') {
            if (!withdrawPartner.trim()) return 'Retail partner is required.';
        }

        const authenticated = await authenticateAction(`Authenticate withdrawal of ${formatCurrency(amount)}`);
        if (!authenticated) return null;

        setPinModalTitle('Authorize Withdrawal');
        setPinModalDescription(`Please enter your 4-digit security PIN to withdraw ${formatCurrency(amount)} via ${channel.replace(/_/g, ' ')}.`);
        setPendingPinAction({ type: 'withdraw', amount, channel, metadata });
        setShowPinModal(true);
        return null;
    }, [balance]);

    // ── Contribute ─────────────────────────────────────────────────
    const submitContribution = useCallback(async (selectedCampaign: any, amount: string) => {
        const amtError = validateAmount(amount, 0, parseFloat(balance));
        if (amtError) return amtError;

        const isCycle = selectedCampaign._type === 'cycle' || !!selectedCampaign.active_cycle || !!selectedCampaign.enable_recurring_contributions || !!selectedCampaign.cycle_month;
        const targetGroupId = selectedCampaign.group?.id || (typeof selectedCampaign.group === 'number' ? selectedCampaign.group : null) || selectedCampaign.id;
        const cycleId = selectedCampaign.active_cycle?.id || (selectedCampaign.cycle_month ? selectedCampaign.id : undefined);
        const label = isCycle
            ? `${selectedCampaign.name || selectedCampaign.group_name || 'Community'} – ${selectedCampaign.active_cycle?.title || selectedCampaign.title || 'Monthly Dues'}`
            : selectedCampaign.title;

        const authenticated = await authenticateAction(`Authenticate to contribute ${formatCurrency(amount)} to "${label}"`);
        if (!authenticated) return null;

        if (isCycle) {
            await client.post(`groups/${targetGroupId}/pay_cycle/`, {
                amount: parseFloat(amount),
                ...(cycleId ? { cycle_id: cycleId } : {}),
            });
        } else {
            await client.post(`campaigns/${selectedCampaign.id}/contribute/`, {
                amount: parseFloat(amount),
            });
        }

        Alert.alert('Contribution Successful', `You contributed ${formatCurrency(amount)} to "${label}".`);
        fetchData();
        fetchActiveCampaigns(activeGroupId);
        return null;
    }, [balance, fetchData, fetchActiveCampaigns, activeGroupId]);

    // ── PIN confirmation ───────────────────────────────────────────
    const handlePinConfirm = useCallback(async (pin: string) => {
        if (!pendingPinAction) return;

        if (pendingPinAction.type === 'send') {
            await client.post('wallets/send_money/', {
                recipient_user_id: pendingPinAction.recipientId,
                amount: pendingPinAction.amount,
                pin,
            });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert('Success', `Successfully sent ${formatCurrency(pendingPinAction.amount)} to ${pendingPinAction.recipientName}`);
            setShowSendMoney(false);
            setShowWithdraw(false);
            setPendingPinAction(null);
            fetchData();
        } else if (pendingPinAction.type === 'withdraw') {
            const res = await client.post('wallets/withdraw/', {
                amount: pendingPinAction.amount,
                channel: pendingPinAction.channel,
                metadata: pendingPinAction.metadata,
                currency: 'ZAR',
                pin,
            });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            if (res.data?.voucher_code) {
                Alert.alert(
                    '🎫 Voucher Ready!',
                    `Withdrawal of ${formatCurrency(pendingPinAction.amount)} successful!\n\n` +
                    `Your Voucher Code:\n${res.data.voucher_code}\n\n` +
                    `Redeem at: ${res.data.partner || ''}\n\nPresent this code at your chosen retail partner to collect your cash.`,
                    [{ text: 'OK', style: 'default' }]
                );
            } else {
                Alert.alert('Success', `Withdrawal of ${formatCurrency(pendingPinAction.amount)} requested successfully via ${pendingPinAction.channel.replace(/_/g, ' ')}.`);
            }
            setShowWithdraw(false);
            setPendingPinAction(null);
            fetchData();
        }
    }, [pendingPinAction, fetchData]);

    const getContributeItems = useCallback(() => {
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
    }, [activeCampaigns, joinedGroups, activeGroupId]);

    return {
        // state
        balance, transactions, loading, refreshing, savedCards,
        members, activeCampaigns, joinedGroups, activeGroupOrOrg, activeGroupId,
        showTopUp, setShowTopUp,
        showSendMoney, setShowSendMoney,
        showWithdraw, setShowWithdraw,
        showContribute, setShowContribute,
        showPinModal, setShowPinModal,
        pinModalTitle, pinModalDescription,
        pendingPinAction, setPendingPinAction,
        // actions
        onRefresh,
        fetchData,
        fetchSavedCards,
        handleDeleteSavedCard,
        submitVoucherTopUp,
        submitCardTopUp,
        initiateSendMoney,
        initiateWithdraw,
        submitContribution,
        handlePinConfirm,
        getContributeItems,
    };
}
