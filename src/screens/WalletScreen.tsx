import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    ActivityIndicator, ScrollView, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PinModal from '../components/PinModal';
import { useWallet, formatCurrency } from '../hooks/useWallet';
import { TopUpModal } from './wallet/TopUpModal';
import { SendMoneyModal } from './wallet/SendMoneyModal';
import { WithdrawModal } from './wallet/WithdrawModal';
import { ContributeModal } from './wallet/ContributeModal';
import { TransactionHistoryList } from './wallet/TransactionHistoryList';
import { colors } from '../constants/theme';

interface WalletScreenProps {
    onBack: () => void;
    onViewContributions?: () => void;
    initialCampaign?: any;
    onClearInitialCampaign?: () => void;
}

const WalletScreen = ({
    onBack,
    onViewContributions,
    initialCampaign,
    onClearInitialCampaign,
}: WalletScreenProps) => {
    const insets = useSafeAreaInsets();
    const [expandedTransactionId, setExpandedTransactionId] = useState<number | null>(null);

    const wallet = useWallet(initialCampaign, onClearInitialCampaign);

    if (wallet.loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#2563eb" />
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
                <Text style={styles.headerTitle}>My Wallet</Text>
                {wallet.activeGroupOrOrg ? (
                    <View style={styles.activeEntityContainer}>
                        <Text style={styles.activeEntityText} numberOfLines={1}>{wallet.activeGroupOrOrg}</Text>
                    </View>
                ) : (
                    <View style={{ width: 40 }} />
                )}
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={wallet.refreshing} onRefresh={wallet.onRefresh} />}
            >
                {/* Balance Card */}
                <View style={styles.balanceCard}>
                    <Text style={styles.balanceLabel}>Current Balance</Text>
                    <Text style={styles.balanceAmount}>{formatCurrency(wallet.balance)}</Text>
                    <View style={styles.quickActions}>
                        <TouchableOpacity style={styles.actionButton} onPress={() => wallet.setShowTopUp(true)}>
                            <Text style={styles.actionIcon}>➕</Text>
                            <Text style={styles.actionText}>Top Up</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.actionButton} onPress={() => wallet.setShowWithdraw(true)}>
                            <Text style={styles.actionIcon}>📤</Text>
                            <Text style={styles.actionText}>Withdraw</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.actionButton} onPress={() => wallet.setShowContribute(true)}>
                            <Text style={styles.actionIcon}>🤝</Text>
                            <Text style={styles.actionText}>Contribute</Text>
                        </TouchableOpacity>
                        {onViewContributions && (
                            <TouchableOpacity style={styles.actionButton} onPress={onViewContributions}>
                                <Text style={styles.actionIcon}>📋</Text>
                                <Text style={styles.actionText}>History</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                <Text style={styles.sectionTitle}>Transaction History</Text>

                <TransactionHistoryList
                    transactions={wallet.transactions}
                    expandedId={expandedTransactionId}
                    onToggleExpand={id => setExpandedTransactionId(prev => prev === id ? null : id)}
                />
            </ScrollView>

            {/* ── Modals ── */}
            <TopUpModal
                visible={wallet.showTopUp}
                savedCards={wallet.savedCards}
                onClose={() => wallet.setShowTopUp(false)}
                onSubmitVoucher={wallet.submitVoucherTopUp}
                onSubmitCard={wallet.submitCardTopUp}
                onDeleteSavedCard={wallet.handleDeleteSavedCard}
            />

            <SendMoneyModal
                visible={wallet.showSendMoney}
                balance={wallet.balance}
                members={wallet.members}
                onClose={() => wallet.setShowSendMoney(false)}
                onSend={wallet.initiateSendMoney}
            />

            <WithdrawModal
                visible={wallet.showWithdraw}
                balance={wallet.balance}
                members={wallet.members}
                onClose={() => wallet.setShowWithdraw(false)}
                onWithdraw={wallet.initiateWithdraw}
                onSend={wallet.initiateSendMoney}
            />

            <ContributeModal
                visible={wallet.showContribute}
                balance={wallet.balance}
                activeCampaigns={wallet.activeCampaigns}
                joinedGroups={wallet.joinedGroups}
                activeGroupId={wallet.activeGroupId}
                initialCampaign={initialCampaign}
                onClose={() => wallet.setShowContribute(false)}
                onContribute={wallet.submitContribution}
            />

            <PinModal
                visible={wallet.showPinModal}
                title={wallet.pinModalTitle}
                description={wallet.pinModalDescription}
                onClose={() => { wallet.setShowPinModal(false); wallet.setPendingPinAction(null); }}
                onConfirm={wallet.handlePinConfirm}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border },
    backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceLight, justifyContent: 'center', alignItems: 'center' },
    backButtonText: { fontSize: 24, color: colors.primaryLight, fontWeight: 'bold' },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: colors.textPrimary },
    scrollContent: { padding: 16 },
    balanceCard: { backgroundColor: colors.primaryLight, borderRadius: 16, padding: 24, marginBottom: 24, alignItems: 'center', shadowColor: colors.primaryLight, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
    balanceLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: '600', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 },
    balanceAmount: { color: colors.white, fontSize: 36, fontWeight: 'bold', marginBottom: 24 },
    quickActions: { flexDirection: 'row', width: '100%', justifyContent: 'space-around', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)', paddingTop: 20 },
    actionButton: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)', borderRadius: 14, paddingVertical: 10, paddingHorizontal: 12, minWidth: 64 },
    actionIcon: { fontSize: 22, marginBottom: 5 },
    actionText: { color: colors.white, fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 16 },
    activeEntityContainer: { borderColor: colors.surfaceLight, borderWidth: 1, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4, maxWidth: 120, justifyContent: 'center', alignItems: 'center' },
    activeEntityText: { fontSize: 12, fontWeight: '700', color: colors.primaryLight },
});

export default WalletScreen;
