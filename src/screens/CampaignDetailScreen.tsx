import React, { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    Alert, ActivityIndicator, TextInput, RefreshControl, Modal
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import client from '../api/client';
import { authenticateAction } from '../utils/biometrics';

const TYPE_META: Record<string, { icon: string; color: string; label: string }> = {
    bereavement: { icon: '🕊️', color: '#7c3aed', label: 'Bereavement Fund' },
    excess:      { icon: '🚗', color: '#0284c7', label: 'Insurance Excess' },
    emergency:   { icon: '🆘', color: '#dc2626', label: 'Emergency / Disaster Fundraiser' },
    custom:      { icon: '✨', color: '#059669', label: 'Custom Fund' },
};

interface CampaignDetailScreenProps {
    campaign: any;
    isAdmin: boolean;
    onBack: () => void;
    onUpdated?: (campaign: any) => void;
    onContributePress: (campaign: any) => void;
}

const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat('en-ZA', {
        style: 'currency',
        currency: 'ZAR',
    }).format(parseFloat(amount));
};

const CampaignDetailScreen = ({ campaign: initialCampaign, isAdmin, onBack, onUpdated, onContributePress }: CampaignDetailScreenProps) => {
    const insets = useSafeAreaInsets();
    const [campaign, setCampaign] = useState(initialCampaign);
    const [refreshing, setRefreshing] = useState(false);
    const [disbursing, setDisbursing] = useState(false);
    const [closing, setClosing] = useState(false);

    // Ledger state
    const [showLedgerModal, setShowLedgerModal] = useState(false);
    const [loadingLedger, setLoadingLedger] = useState(false);
    const [ledgerData, setLedgerData] = useState<any>(null);

    // Partial withdrawal state
    const [showWithdrawModal, setShowWithdrawModal] = useState(false);
    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [withdrawNote, setWithdrawNote] = useState('');

    const meta = TYPE_META[campaign.campaign_type] ?? TYPE_META.custom;

    const refresh = useCallback(async () => {
        setRefreshing(true);
        try {
            const res = await client.get(`campaigns/${campaign.id}/`);
            setCampaign(res.data);
            onUpdated?.(res.data);
        } catch (e) {
            console.error(e);
        } finally {
            setRefreshing(false);
        }
    }, [campaign.id]);

    const fetchLedger = async () => {
        setShowLedgerModal(true);
        setLoadingLedger(true);
        try {
            const res = await client.get(`campaigns/${campaign.id}/ledger/`);
            setLedgerData(res.data);
        } catch (e) {
            console.error(e);
            Alert.alert('Error', 'Could not load campaign ledger.');
        } finally {
            setLoadingLedger(false);
        }
    };

    const handleOpenWithdrawModal = () => {
        setWithdrawAmount((campaign.balance || 0).toString());
        setWithdrawNote('');
        setShowWithdrawModal(true);
    };

    const handleExecuteWithdrawal = async () => {
        const amt = parseFloat(withdrawAmount);
        if (isNaN(amt) || amt <= 0) {
            Alert.alert('Invalid Amount', 'Please enter a valid withdrawal amount.');
            return;
        }

        const ok = await authenticateAction('Authenticate to disburse campaign funds');
        if (!ok) return;

        setDisbursing(true);
        try {
            await client.post(`campaigns/${campaign.id}/disburse/`, {
                amount: amt,
                note: withdrawNote,
            });
            Alert.alert('✅ Withdrawal Successful', `R${amt.toFixed(2)} has been withdrawn from campaign.`);
            setShowWithdrawModal(false);
            refresh();
            if (showLedgerModal) fetchLedger();
        } catch (e: any) {
            Alert.alert('Error', e?.response?.data?.error || 'Withdrawal failed.');
        } finally {
            setDisbursing(false);
        }
    };

    const handleClose = () => {
        Alert.alert('Close Campaign', 'Stop accepting contributions to this campaign?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Close',
                style: 'destructive',
                onPress: async () => {
                    setClosing(true);
                    try {
                        await client.post(`campaigns/${campaign.id}/close/`);
                        Alert.alert('Campaign Closed', 'No further contributions will be accepted.');
                        refresh();
                    } catch (e: any) {
                        Alert.alert('Error', e?.response?.data?.error || 'Could not close campaign.');
                    } finally {
                        setClosing(false);
                    }
                },
            },
        ]);
    };

    const raised = parseFloat(campaign.total_raised || 0);
    const target = campaign.target_amount ? parseFloat(campaign.target_amount) : null;
    const progress = target ? Math.min((raised / target) * 100, 100) : null;

    return (
        <View style={styles.container}>
            {/* Header banner */}
            <View style={[styles.banner, { backgroundColor: `${meta.color}14` }]}>
                <Text style={styles.bannerIcon}>{meta.icon}</Text>
                <View style={{ flex: 1 }}>
                    <Text style={[styles.bannerType, { color: meta.color }]}>{meta.label}</Text>
                    <Text style={styles.bannerTitle}>{campaign.title}</Text>
                </View>
            </View>

            <ScrollView
                contentContainerStyle={[styles.scroll, { paddingBottom: Math.max(insets.bottom, 24) + 100 }]}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={meta.color} />}
                showsVerticalScrollIndicator={false}
            >
                {/* Description */}
                {campaign.description ? (
                    <Text style={styles.desc}>{campaign.description}</Text>
                ) : null}

                {/* Beneficiary / Claimant */}
                {campaign.beneficiary_detail && (
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>
                            {campaign.campaign_type === 'excess' ? '🚗 Claimant' : '👤 Beneficiary'}
                        </Text>
                        <Text style={styles.cardValue}>{campaign.beneficiary_detail.full_name}</Text>
                    </View>
                )}

                {/* Fund progress */}
                <View style={styles.statsRow}>
                    <View style={styles.stat}>
                        <Text style={[styles.statValue, { color: meta.color }]}>
                            R{raised.toFixed(2)}
                        </Text>
                        <Text style={styles.statLabel}>Raised</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.stat}>
                        <Text style={styles.statValue}>{campaign.contributor_count ?? 0}</Text>
                        <Text style={styles.statLabel}>Contributors</Text>
                    </View>
                    {target !== null && (
                        <>
                            <View style={styles.statDivider} />
                            <View style={styles.stat}>
                                <Text style={styles.statValue}>R{target.toFixed(2)}</Text>
                                <Text style={styles.statLabel}>Target</Text>
                            </View>
                        </>
                    )}
                </View>

                {campaign.target_amount && (
                    <View style={styles.progressContainer}>
                        <View style={styles.progressTrack}>
                            <View
                                style={[
                                    styles.progressBar,
                                    {
                                        backgroundColor: meta.color,
                                        width: `${Math.min(100, ((campaign.total_raised || 0) / campaign.target_amount) * 100)}%`
                                    }
                                ]}
                            />
                        </View>
                        <Text style={[styles.progressText, { color: meta.color }]}>
                            {Math.round(((campaign.total_raised || 0) / campaign.target_amount) * 100)}%
                        </Text>
                    </View>
                )}

                <View style={styles.statusRow}>
                    <View style={[styles.statusPill, { backgroundColor: campaign.contributions_open ? '#d1fae5' : '#fee2e2' }]}>
                        <Text style={[styles.statusText, { color: campaign.contributions_open ? '#065f46' : '#991b1b' }]}>
                            {campaign.contributions_open ? '● Open for Contributions' : '● Closed'}
                        </Text>
                    </View>
                </View>

                {campaign.end_date && (
                    <Text style={styles.deadline}>
                        Deadline: {new Date(campaign.end_date).toLocaleDateString()}
                    </Text>
                )}

                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Beneficiary</Text>
                    <Text style={styles.cardValue}>{campaign.beneficiary_detail?.full_name || 'Group Account'}</Text>
                </View>

                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Current Balance</Text>
                    <Text style={styles.cardValue}>{formatCurrency(campaign.balance?.toString() || '0')}</Text>
                </View>

                {/* Ledger button */}
                <TouchableOpacity
                    style={[styles.adminBtn, { backgroundColor: '#3b82f6', marginBottom: 12 }]}
                    onPress={fetchLedger}
                >
                    <Text style={styles.adminBtnText}>📜 View Campaign Ledger</Text>
                </TouchableOpacity>

                {isAdmin && (
                    <View style={styles.adminSection}>
                        <Text style={styles.adminTitle}>Admin Controls</Text>
                        
                        {parseFloat(campaign.balance || 0) > 0 && (
                            <TouchableOpacity
                                style={[styles.adminBtn, { backgroundColor: meta.color }]}
                                onPress={handleOpenWithdrawModal}
                                disabled={disbursing}
                            >
                                {disbursing
                                    ? <ActivityIndicator color="#fff" />
                                    : <Text style={styles.adminBtnText}>💸 Withdraw Campaign Funds</Text>
                                }
                            </TouchableOpacity>
                        )}

                        {campaign.contributions_open && (
                            <TouchableOpacity
                                style={[styles.adminBtn, { backgroundColor: '#64748b' }]}
                                onPress={handleClose}
                                disabled={closing}
                            >
                                {closing
                                    ? <ActivityIndicator color="#fff" />
                                    : <Text style={styles.adminBtnText}>🔒 Close Campaign</Text>
                                }
                            </TouchableOpacity>
                        )}
                    </View>
                )}
            </ScrollView>

            {/* Contribute button */}
            {campaign.contributions_open && !campaign.has_contributed && (
                <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
                    <TouchableOpacity
                        style={[styles.contributeBtn, { backgroundColor: meta.color }]}
                        onPress={() => onContributePress(campaign)}
                    >
                        <Text style={styles.contributeBtnText}>💙 Contribute to this Fund</Text>
                    </TouchableOpacity>
                </View>
            )}

            {campaign.has_contributed && (
                <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
                    <View style={styles.alreadyContributed}>
                        <Text style={styles.alreadyContributedText}>✅ You have already contributed to this campaign</Text>
                    </View>
                </View>
            )}

            {/* LEDGER MODAL */}
            <Modal visible={showLedgerModal} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalCard, { maxHeight: '85%' }]}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <Text style={styles.modalTitle}>📜 Campaign Ledger</Text>
                            <TouchableOpacity onPress={() => setShowLedgerModal(false)}>
                                <Text style={{ fontSize: 18, color: '#64748b', fontWeight: 'bold' }}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        {loadingLedger ? (
                            <ActivityIndicator color={meta.color} size="large" style={{ padding: 20 }} />
                        ) : ledgerData ? (
                            <ScrollView showsVerticalScrollIndicator={false}>
                                <View style={{ flexDirection: 'row', backgroundColor: '#f1f5f9', borderRadius: 12, padding: 12, marginBottom: 16 }}>
                                    <View style={{ flex: 1, alignItems: 'center' }}>
                                        <Text style={{ fontSize: 10, color: '#64748b', fontWeight: 'bold' }}>RAISED</Text>
                                        <Text style={{ fontSize: 14, color: '#059669', fontWeight: 'bold' }}>R{parseFloat(ledgerData.total_raised || 0).toFixed(2)}</Text>
                                    </View>
                                    <View style={{ flex: 1, alignItems: 'center' }}>
                                        <Text style={{ fontSize: 10, color: '#64748b', fontWeight: 'bold' }}>WITHDRAWN</Text>
                                        <Text style={{ fontSize: 14, color: '#dc2626', fontWeight: 'bold' }}>R{parseFloat(ledgerData.total_disbursed || 0).toFixed(2)}</Text>
                                    </View>
                                    <View style={{ flex: 1, alignItems: 'center' }}>
                                        <Text style={{ fontSize: 10, color: '#64748b', fontWeight: 'bold' }}>BALANCE</Text>
                                        <Text style={{ fontSize: 14, color: '#0284c7', fontWeight: 'bold' }}>R{parseFloat(ledgerData.available_balance || 0).toFixed(2)}</Text>
                                    </View>
                                </View>

                                {ledgerData.timeline && ledgerData.timeline.length > 0 ? (
                                    ledgerData.timeline.map((item: any, idx: number) => {
                                        const isContrib = item.type === 'contribution';
                                        return (
                                            <View key={idx} style={{ padding: 12, backgroundColor: '#f8fafc', borderRadius: 10, marginBottom: 8, borderWidth: 1, borderColor: '#e2e8f0' }}>
                                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#0f172a' }}>
                                                        {isContrib ? `💙 ${item.contributor_name}` : `💸 Payout to ${item.recipient_name}`}
                                                    </Text>
                                                    <Text style={{ fontSize: 14, fontWeight: '800', color: isContrib ? '#059669' : '#dc2626' }}>
                                                        {isContrib ? '+' : '-'} R{parseFloat(item.amount || 0).toFixed(2)}
                                                    </Text>
                                                </View>
                                                {item.note ? <Text style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>{item.note}</Text> : null}
                                                <Text style={{ fontSize: 10, color: '#94a3b8', marginTop: 4 }}>{item.date || item.timestamp}</Text>
                                            </View>
                                        );
                                    })
                                ) : (
                                    <Text style={{ textAlign: 'center', color: '#94a3b8', padding: 20 }}>No transaction history found.</Text>
                                )}
                            </ScrollView>
                        ) : null}
                    </View>
                </View>
            </Modal>

            {/* WITHDRAWAL MODAL */}
            <Modal visible={showWithdrawModal} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>💸 Withdraw Campaign Funds</Text>
                        <Text style={styles.modalSubtitle}>Withdraw funds from {campaign.title} while keeping campaign active.</Text>
                        
                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#64748b', marginBottom: 4 }}>WITHDRAWAL AMOUNT (ZAR)</Text>
                        <TextInput
                            style={styles.modalInput}
                            keyboardType="numeric"
                            value={withdrawAmount}
                            onChangeText={setWithdrawAmount}
                            placeholder="0.00"
                        />

                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#64748b', marginBottom: 4 }}>REASON / NOTE (OPTIONAL)</Text>
                        <TextInput
                            style={styles.modalInput}
                            value={withdrawNote}
                            onChangeText={setWithdrawNote}
                            placeholder="Reason for withdrawal..."
                        />

                        <TouchableOpacity
                            style={[styles.modalConfirm, { backgroundColor: meta.color }]}
                            onPress={handleExecuteWithdrawal}
                            disabled={disbursing}
                        >
                            {disbursing ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalConfirmText}>Confirm Withdrawal</Text>}
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.modalCancel} onPress={() => setShowWithdrawModal(false)}>
                            <Text style={styles.modalCancelText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    banner: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
    bannerIcon: { fontSize: 36 },
    bannerType: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, fontFamily: 'Outfit-Bold' },
    bannerTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a', marginTop: 2, fontFamily: 'Outfit-Bold' },
    scroll: { padding: 20 },
    desc: { fontSize: 15, color: '#475569', lineHeight: 22, marginBottom: 16, fontFamily: 'Outfit-Regular' },
    card: {
        backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 12,
        borderWidth: 1, borderColor: '#e2e8f0',
    },
    cardTitle: { fontSize: 12, fontWeight: '700', color: '#64748b', marginBottom: 4, fontFamily: 'Outfit-Bold' },
    cardValue: { fontSize: 16, fontWeight: '700', color: '#1e293b', fontFamily: 'Outfit-Bold' },
    statsRow: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0' },
    stat: { flex: 1, alignItems: 'center' },
    statValue: { fontSize: 20, fontWeight: '800', color: '#1e293b', fontFamily: 'Outfit-Bold' },
    statLabel: { fontSize: 11, color: '#94a3b8', marginTop: 2, fontFamily: 'Outfit-Regular' },
    statDivider: { width: 1, backgroundColor: '#e2e8f0' },
    progressContainer: { marginBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 10 },
    progressTrack: { flex: 1, height: 8, backgroundColor: '#e2e8f0', borderRadius: 4, overflow: 'hidden' },
    progressBar: { height: '100%', borderRadius: 4 },
    progressText: { fontSize: 13, fontWeight: '700', fontFamily: 'Outfit-Bold' },
    statusRow: { flexDirection: 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap' },
    statusPill: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
    statusText: { fontSize: 13, fontWeight: '700', fontFamily: 'Outfit-Bold' },
    deadline: { fontSize: 13, color: '#64748b', marginBottom: 16, fontFamily: 'Outfit-Regular' },
    adminSection: { marginTop: 8, gap: 10 },
    adminTitle: { fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 4, fontFamily: 'Outfit-Bold' },
    adminBtn: { borderRadius: 12, padding: 14, alignItems: 'center' },
    adminBtnText: { color: '#fff', fontWeight: '700', fontSize: 15, fontFamily: 'Outfit-Bold' },
    footer: { padding: 16, paddingTop: 10, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#f1f5f9' },
    contributeBtn: { borderRadius: 14, padding: 16, alignItems: 'center' },
    contributeBtnText: { color: '#fff', fontSize: 17, fontWeight: '800', fontFamily: 'Outfit-Bold' },
    alreadyContributed: { backgroundColor: '#d1fae5', borderRadius: 14, padding: 14, alignItems: 'center' },
    alreadyContributedText: { color: '#065f46', fontSize: 14, fontWeight: '700', fontFamily: 'Outfit-Bold' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
    modalTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a', marginBottom: 4, fontFamily: 'Outfit-Bold' },
    modalSubtitle: { fontSize: 13, color: '#64748b', marginBottom: 16, fontFamily: 'Outfit-Regular' },
    modalInput: {
        backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0',
        borderRadius: 12, padding: 14, fontSize: 15, marginBottom: 10, fontFamily: 'Outfit-Regular',
    },
    modalConfirm: { borderRadius: 14, padding: 16, alignItems: 'center', marginBottom: 10 },
    modalConfirmText: { color: '#fff', fontSize: 16, fontWeight: '800', fontFamily: 'Outfit-Bold' },
    modalCancel: { alignItems: 'center', padding: 10 },
    modalCancelText: { color: '#64748b', fontSize: 15, fontFamily: 'Outfit-Regular' },
});

export default CampaignDetailScreen;
