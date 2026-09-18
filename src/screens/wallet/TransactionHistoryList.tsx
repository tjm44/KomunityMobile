import React from 'react';
import { View, Text, TouchableOpacity, Platform, StyleSheet } from 'react-native';
import { colors } from '../../constants/theme';
import { formatCurrency, formatDate, getTransactionIcon, type Transaction } from '../../hooks/useWallet';

interface TransactionHistoryListProps {
    transactions: Transaction[];
    expandedId: number | null;
    onToggleExpand: (id: number) => void;
}

export const TransactionHistoryList: React.FC<TransactionHistoryListProps> = ({
    transactions, expandedId, onToggleExpand,
}) => {
    if (transactions.length === 0) {
        return (
            <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No transactions yet.</Text>
            </View>
        );
    }

    return (
        <>
            {transactions.map(item => {
                const isExpanded = expandedId === item.id;
                const isDebit = ['TRANSFER', 'WITHDRAWAL', 'P2P_SENT'].includes(item.transaction_type);
                const label = item.description || (item.transaction_type || 'Transaction').replace(/_/g, ' ');
                const fromName = item.from_label?.full_name || item.sender_wallet_detail?.full_name ||
                    (item.transaction_type === 'P2P_RECEIVED' && item.wallet_detail ? item.wallet_detail.full_name || item.wallet_detail.user_email : null);
                const toName = item.to_label?.full_name || item.recipient_wallet_detail?.full_name || item.destination_group_detail?.name;
                const flowLine = fromName && toName ? `${fromName} → ${toName}` : fromName ? `From: ${fromName}` : toName ? `To: ${toName}` : null;

                return (
                    <View key={item.id} style={styles.transactionWrapper}>
                        <TouchableOpacity
                            activeOpacity={0.8}
                            onPress={() => onToggleExpand(item.id)}
                            style={styles.transactionItem}
                        >
                            <View style={styles.transactionIconContainer}>
                                <Text style={styles.transactionIcon}>{getTransactionIcon(item.transaction_type)}</Text>
                            </View>
                            <View style={styles.transactionDetails}>
                                <Text style={styles.transactionType} numberOfLines={1}>{label}</Text>
                                {flowLine ? <Text style={styles.destinationText} numberOfLines={1}>{flowLine}</Text> : null}
                                <Text style={styles.transactionDate}>{formatDate(item.timestamp)}</Text>
                            </View>
                            <View style={styles.amountContainer}>
                                <Text style={[styles.transactionAmount, isDebit ? styles.negativeAmount : styles.positiveAmount]}>
                                    {isDebit ? '-' : '+'}{formatCurrency(item.amount)}
                                </Text>
                                <View style={[
                                    styles.statusBadge,
                                    item.status === 'COMPLETED' ? styles.statusCOMPLETED :
                                        item.status === 'PENDING' ? styles.statusPENDING : styles.statusFAILED
                                ]}>
                                    <Text style={[styles.statusText, item.status === 'COMPLETED' ? styles.statusTextCOMPLETED : {}]}>
                                        {item.status}
                                    </Text>
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
                                {fromName ? <Text style={styles.expandedText}><Text style={{ fontWeight: '700' }}>From:</Text> {fromName}</Text> : null}
                                {toName ? <Text style={styles.expandedText}><Text style={{ fontWeight: '700' }}>To:</Text> {toName}</Text> : null}
                                {item.fund_campaign_detail ? (
                                    <Text style={styles.expandedText}>
                                        <Text style={{ fontWeight: '700' }}>Campaign:</Text> {item.fund_campaign_detail.title}
                                        {item.fund_campaign_detail.campaign_type ? ` (${item.fund_campaign_detail.campaign_type})` : ''}
                                    </Text>
                                ) : null}
                                {item.deceased_contribution_detail ? (
                                    <Text style={styles.expandedText}>
                                        <Text style={{ fontWeight: '700' }}>Bereavement:</Text> {item.deceased_contribution_detail.full_name}
                                        {item.deceased_contribution_detail.group ? ` · ${item.deceased_contribution_detail.group}` : ''}
                                    </Text>
                                ) : null}
                                {item.note ? (
                                    <View style={{ marginTop: 6, padding: 8, borderRadius: 8, backgroundColor: colors.borderLight, borderWidth: 1, borderColor: colors.border }}>
                                        <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textSecondary }}>Note:</Text>
                                        <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>{item.note}</Text>
                                    </View>
                                ) : null}
                                {item.withdrawal_channel ? (
                                    <Text style={styles.expandedText}><Text style={{ fontWeight: '700' }}>Channel:</Text> {item.withdrawal_channel.replace(/_/g, ' ')}</Text>
                                ) : null}
                                {item.withdrawal_metadata?.voucher_code ? (
                                    <View style={{ marginTop: 8, padding: 10, borderRadius: 10, backgroundColor: colors.successLight, borderWidth: 1, borderColor: colors.successLight }}>
                                        <Text style={{ fontSize: 11, color: colors.success, fontWeight: 'bold' }}>🎫 Voucher Code:</Text>
                                        <Text style={{ fontSize: 18, fontWeight: '800', color: colors.success, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', marginTop: 2, letterSpacing: 1 }}>
                                            {item.withdrawal_metadata.voucher_code}
                                        </Text>
                                        {item.withdrawal_metadata.partner ? (
                                            <Text style={{ fontSize: 11, color: colors.success, marginTop: 4, fontWeight: '500' }}>
                                                🏪 Redeem at: {item.withdrawal_metadata.partner}
                                            </Text>
                                        ) : null}
                                    </View>
                                ) : null}
                            </View>
                        )}
                    </View>
                );
            })}
        </>
    );
};

const styles = StyleSheet.create({
    emptyState: { padding: 40, alignItems: 'center' },
    emptyStateText: { color: colors.textSecondary, fontSize: 16 },
    transactionWrapper: { marginBottom: 12 },
    transactionItem: { backgroundColor: colors.white, borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border },
    transactionIconContainer: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    transactionIcon: { fontSize: 20 },
    transactionDetails: { flex: 1 },
    transactionType: { fontSize: 16, fontWeight: '600', color: colors.textPrimary, textTransform: 'capitalize' },
    destinationText: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
    transactionDate: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
    amountContainer: { alignItems: 'flex-end' },
    transactionAmount: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
    positiveAmount: { color: colors.success },
    negativeAmount: { color: colors.danger },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
    statusText: { fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' },
    statusCOMPLETED: { backgroundColor: colors.successLight },
    statusTextCOMPLETED: { color: colors.success },
    statusPENDING: { backgroundColor: colors.warningLight },
    statusFAILED: { backgroundColor: colors.dangerLight },
    expandedCard: { backgroundColor: colors.background, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 12, marginTop: 8 },
    expandedTitle: { fontSize: 13, fontWeight: '700', color: colors.textPrimary, marginBottom: 6 },
    expandedText: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
});
