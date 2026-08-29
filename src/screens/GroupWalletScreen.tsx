import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, Alert, RefreshControl
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import client from '../api/client';

import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../constants/theme';

interface Transaction {
    id: number;
    transaction_type: string;
    amount: string;
    status: string;
    timestamp: string;
    wallet_detail?: {
        user_email: string;
        full_name?: string;
    };
}

interface GroupWalletScreenProps {
    group: any;
    onBack: () => void;
}

const GroupWalletScreen = ({ group, onBack }: GroupWalletScreenProps) => {
    const insets = useSafeAreaInsets();
    const isOrg = !!(group.is_organisation || group.entity_type);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [balance, setBalance] = useState<string>(group.balance || '0.00');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [accessDenied, setAccessDenied] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            // First, try to get group/org details for the balance
            try {
                const endpoint = isOrg ? `organisations/${group.id}/` : `groups/${group.id}/`;
                const walletRes = await client.get(endpoint);
                setBalance(walletRes.data.balance || walletRes.data.total_funds || '0.00');
            } catch (err) {
                console.error('Error fetching balance:', err);
            }

            // Then try to get transactions
            try {
                const endpoint = isOrg ? `organisations/${group.id}/transactions/` : `groups/${group.id}/transactions/`;
                const transRes = await client.get(endpoint);
                setTransactions(transRes.data);
                setAccessDenied(false);
            } catch (err: any) {
                console.error('Error fetching transactions:', err);
                if (err.response?.status === 403) {
                    setAccessDenied(true);
                    setTransactions([]);
                }
            }
        } catch (error) {
            console.error('Error in fetching wallet data:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    const formatCurrency = (amount: string) => {
        return new Intl.NumberFormat('en-ZA', {
            style: 'currency',
            currency: 'ZAR',
        }).format(parseFloat(amount));
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getTransactionIcon = (type: string) => {
        switch (type) {
            case 'TRANSFER': return '📥';
            case 'PAYOUT_RECEIVED': return '📤';
            default: return '💰';
        }
    };

    const getTransactionLabel = (type: string) => {
        switch (type) {
            case 'TRANSFER': return 'Contribution';
            case 'PAYOUT_RECEIVED': return 'Disbursement';
            default: return type;
        }
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
                <ActivityIndicator size="large" color={isOrg ? "#4f46e5" : "#2563eb"} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={[
                styles.header,
                { paddingTop: insets.top },
                isOrg && { backgroundColor: colors.primaryDark, borderBottomColor: colors.primaryDark }
            ]}>
                <TouchableOpacity
                    onPress={onBack}
                    style={[styles.backButton, isOrg && { backgroundColor: colors.primaryDark }]}
                >
                    <Text style={[styles.backButtonText, isOrg && { color: colors.accentLight }]}>←</Text>
                </TouchableOpacity>
                <View style={{ alignItems: 'center' }}>
                    <Text style={[styles.headerTitle, isOrg && { color: colors.white }]}>
                        {isOrg ? "Organisation Wallet" : "Group Wallet"}
                    </Text>
                    {isOrg && (
                        <Text style={{ fontSize: 10, color: colors.accentLight, fontWeight: '700', letterSpacing: 0.5 }}>
                            🏢 VERIFIED TREASURY
                        </Text>
                    )}
                </View>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView
                style={styles.content}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={isOrg ? "#00458b" : "#3fd2c7"} />
                }
            >
                {/* Balance Card */}
                {isOrg ? (
                    <LinearGradient
                        colors={[colors.primaryDark, colors.primary, colors.primaryLight]}
                        style={styles.balanceCard}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                            <Text style={{ fontSize: 12 }}>🏢</Text>
                            <Text style={[styles.balanceLabel, { color: colors.accentLight }]}>
                                {group.name} Treasury
                            </Text>
                        </View>
                        <Text style={styles.balanceAmount}>{formatCurrency(balance)}</Text>
                        <View style={[styles.fundInfo, { backgroundColor: 'rgba(255, 255, 255, 0.12)' }]}>
                            <Text style={styles.fundInfoText}>
                                Secure corporate & NPO treasury managed under verified governance standards.
                            </Text>
                        </View>
                    </LinearGradient>
                ) : (
                    <View style={styles.balanceCard}>
                        <Text style={styles.balanceLabel}>{group.name} Total Funds</Text>
                        <Text style={styles.balanceAmount}>{formatCurrency(balance)}</Text>
                        <View style={styles.fundInfo}>
                            <Text style={styles.fundInfoText}>
                                Transparently managed for the benefit of all community members.
                            </Text>
                        </View>
                    </View>
                )}

                {/* Transaction History */}
                <Text style={styles.sectionTitle}>
                    {isOrg ? "Treasury Activity Log" : "Fund History"}
                </Text>

                {transactions.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyStateText}>
                            {accessDenied
                                ? (isOrg ? "Visibility restricted to organisation administrators." : "Visibility restricted to active community members.")
                                : "No treasury transactions recorded yet."}
                        </Text>
                    </View>
                ) : (
                    transactions.map((item) => (
                        <View key={item.id} style={styles.transactionItem}>
                            <View style={[styles.itemIconContainer, isOrg && { backgroundColor: colors.surfaceLight }]}>
                                <Text style={styles.itemIcon}>{getTransactionIcon(item.transaction_type)}</Text>
                            </View>
                            <View style={styles.itemContent}>
                                <View style={styles.itemHeader}>
                                    <Text style={styles.itemType}>{getTransactionLabel(item.transaction_type)}</Text>
                                    <Text style={[
                                        styles.itemAmount,
                                        item.transaction_type === 'TRANSFER' ? styles.positiveAmount : styles.negativeAmount
                                    ]}>
                                        {item.transaction_type === 'TRANSFER' ? '+' : '-'}{formatCurrency(item.amount)}
                                    </Text>
                                </View>
                                <View style={styles.itemFooter}>
                                    <Text style={styles.itemUser}>
                                        {item.wallet_detail?.full_name || item.wallet_detail?.user_email || 'Contributor'}
                                    </Text>
                                    <Text style={styles.itemDate}>{formatDate(item.timestamp)}</Text>
                                </View>
                            </View>
                        </View>
                    ))
                )}

                <View style={{ height: 100 }} />
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    centered: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingBottom: 16,
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
    content: {
        paddingHorizontal: 16,
    },
    balanceCard: {
        backgroundColor: colors.primaryLight,
        borderRadius: 20,
        padding: 24,
        marginTop: 20,
        marginBottom: 24,
        alignItems: 'center',
        shadowColor: colors.primaryLight,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 15,
        elevation: 8,
    },
    balanceLabel: {
        color: 'rgba(255, 255, 255, 0.8)',
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
        textAlign: 'center',
    },
    balanceAmount: {
        color: colors.white,
        fontSize: 32,
        fontWeight: 'bold',
        marginBottom: 16,
    },
    fundInfo: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 12,
    },
    fundInfoText: {
        color: 'rgba(255, 255, 255, 0.9)',
        fontSize: 12,
        textAlign: 'center',
        fontStyle: 'italic',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.textPrimary,
        marginBottom: 16,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    emptyStateText: {
        color: colors.textSecondary,
        fontSize: 16,
        textAlign: 'center',
    },
    transactionItem: {
        flexDirection: 'row',
        backgroundColor: colors.white,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.surfaceLight,
    },
    itemIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.surfaceLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    itemIcon: {
        fontSize: 24,
    },
    itemContent: {
        flex: 1,
    },
    itemHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    itemType: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    itemAmount: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    positiveAmount: {
        color: colors.success,
    },
    negativeAmount: {
        color: colors.danger,
    },
    itemFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    itemUser: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    itemDate: {
        fontSize: 12,
        color: colors.textMuted,
    },
});

export default GroupWalletScreen;
