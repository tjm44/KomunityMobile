import React, { useState } from 'react';
import {
    Modal, View, Text, TextInput, TouchableOpacity,
    ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { colors } from '../../constants/theme';
import { walletStyles as s } from './walletStyles';
import { CAMPAIGN_TYPE_META, formatCurrency } from '../../hooks/useWallet';

interface ContributeModalProps {
    visible: boolean;
    balance: string;
    activeCampaigns: any[];
    joinedGroups: any[];
    activeGroupId: number | null;
    initialCampaign?: any;
    onClose: () => void;
    /** Returns an error string on failure, null on success */
    onContribute: (campaign: any, amount: string) => Promise<string | null>;
}

export const ContributeModal: React.FC<ContributeModalProps> = ({
    visible, activeCampaigns, joinedGroups, activeGroupId,
    initialCampaign, onClose, onContribute,
}) => {
    const [selectedCampaign, setSelectedCampaign] = useState<any>(initialCampaign ?? null);
    const [amount, setAmount] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isContributing, setIsContributing] = useState(false);

    const reset = () => { setSelectedCampaign(null); setAmount(''); setError(null); };
    const handleClose = () => { reset(); onClose(); };

    const pendingCycles = joinedGroups.filter((g: any) =>
        (!activeGroupId || g.id === activeGroupId) &&
        g.is_active !== false &&
        g.enable_recurring_contributions &&
        g.active_cycle &&
        g.my_cycle_status?.status !== 'paid'
    );

    const handleContribute = async () => {
        if (!selectedCampaign) { setError('Please select a campaign or contribution.'); return; }
        setError(null);
        setIsContributing(true);
        try {
            const err = await onContribute(selectedCampaign, amount);
            if (err) setError(err);
            else { reset(); onClose(); }
        } catch (e: any) {
            setError(e.response?.data?.error || e.response?.data?.non_field_errors?.[0] || 'Failed to process contribution.');
        } finally {
            setIsContributing(false);
        }
    };

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.modalOverlay}>
                <View style={s.modalContent}>
                    <View style={s.modalHeader}>
                        <Text style={s.modalTitle}>Contribute</Text>
                        <TouchableOpacity onPress={handleClose}><Text style={s.closeButton}>✕</Text></TouchableOpacity>
                    </View>

                    {!selectedCampaign ? (
                        <>
                            <Text style={s.inputLabel}>Select Campaign or Monthly Due</Text>
                            <ScrollView style={s.memberList}>
                                {/* Pending recurring cycle dues */}
                                {pendingCycles.map((g: any) => (
                                    <TouchableOpacity
                                        key={`cycle-${g.id}`}
                                        style={[s.deceasedItem, { borderLeftWidth: 4, borderLeftColor: colors.primaryLight }]}
                                        onPress={() => {
                                            setSelectedCampaign({ ...g, _type: 'cycle' });
                                            const targetAmt = g.active_cycle?.target_amount_per_member || g.recurring_amount;
                                            if (targetAmt) setAmount(String(targetAmt));
                                        }}
                                    >
                                        <View style={[s.memberAvatar, { backgroundColor: `${colors.primaryLight}20`, justifyContent: 'center', alignItems: 'center' }]}>
                                            <Text style={{ fontSize: 20 }}>🔄</Text>
                                        </View>
                                        <View style={{ flex: 1, marginLeft: 10 }}>
                                            <Text style={s.memberName} numberOfLines={1}>{g.name}</Text>
                                            <Text style={[s.fundProgress, { color: colors.primaryLight }]}>
                                                Monthly Due · {g.active_cycle?.title || 'Recurring Contribution'}
                                            </Text>
                                        </View>
                                        <Text style={s.chevron}>›</Text>
                                    </TouchableOpacity>
                                ))}

                                {/* Active fundraiser campaigns */}
                                {activeCampaigns.map((campaign: any) => {
                                    const meta = CAMPAIGN_TYPE_META[campaign.campaign_type] || CAMPAIGN_TYPE_META.custom;
                                    return (
                                        <TouchableOpacity
                                            key={`campaign-${campaign.id}`}
                                            style={s.deceasedItem}
                                            onPress={() => setSelectedCampaign({ ...campaign, _type: 'campaign' })}
                                        >
                                            <View style={[s.memberAvatar, { backgroundColor: `${meta.color}15`, justifyContent: 'center', alignItems: 'center' }]}>
                                                <Text style={{ fontSize: 20 }}>{meta.icon}</Text>
                                            </View>
                                            <View style={{ flex: 1, marginLeft: 10 }}>
                                                <Text style={s.memberName} numberOfLines={1}>{campaign.title}</Text>
                                                <Text style={s.fundProgress}>Type: {meta.label} · Raised: {formatCurrency(campaign.total_raised)}</Text>
                                            </View>
                                            <Text style={s.chevron}>›</Text>
                                        </TouchableOpacity>
                                    );
                                })}

                                {pendingCycles.length === 0 && activeCampaigns.length === 0 && (
                                    <View style={s.emptyState}>
                                        <Text style={s.emptyStateText}>No active campaigns or pending dues.</Text>
                                    </View>
                                )}
                            </ScrollView>
                        </>
                    ) : (
                        <>
                            <View style={s.selectedRecipient}>
                                {selectedCampaign._type === 'cycle' ? (
                                    <View style={[s.memberAvatar, { backgroundColor: `${colors.primaryLight}20`, justifyContent: 'center', alignItems: 'center' }]}>
                                        <Text style={{ fontSize: 24 }}>🔄</Text>
                                    </View>
                                ) : (
                                    <View style={[s.memberAvatar, { backgroundColor: `${(CAMPAIGN_TYPE_META[selectedCampaign.campaign_type] || CAMPAIGN_TYPE_META.custom).color}15`, justifyContent: 'center', alignItems: 'center' }]}>
                                        <Text style={{ fontSize: 24 }}>{(CAMPAIGN_TYPE_META[selectedCampaign.campaign_type] || CAMPAIGN_TYPE_META.custom).icon}</Text>
                                    </View>
                                )}
                                <View style={{ flex: 1, marginLeft: 10 }}>
                                    <Text style={s.recipientName}>
                                        {selectedCampaign._type === 'cycle'
                                            ? `${selectedCampaign.name} – ${selectedCampaign.active_cycle?.title || 'Monthly Dues'}`
                                            : selectedCampaign.title}
                                    </Text>
                                    {selectedCampaign._type === 'campaign' && (
                                        <Text style={s.fundProgress}>
                                            Total raised: {formatCurrency(selectedCampaign.total_raised)}
                                            {selectedCampaign.target_amount ? ` of ${formatCurrency(selectedCampaign.target_amount)}` : ''}
                                        </Text>
                                    )}
                                    <TouchableOpacity onPress={() => setSelectedCampaign(null)}>
                                        <Text style={s.changeRecipient}>Change selection</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <Text style={s.inputLabel}>Contribution Amount (ZAR)</Text>
                            <TextInput
                                style={[s.textInput, error ? s.inputError : null]}
                                placeholder="0.00"
                                keyboardType="decimal-pad"
                                value={amount}
                                onChangeText={t => { setAmount(t); setError(null); }}
                                placeholderTextColor="#9ca3af"
                            />
                            {error && <Text style={s.errorText}>{error}</Text>}

                            <View style={s.presets}>
                                {['10', '25', '50', '100'].map(amt => (
                                    <TouchableOpacity key={amt} style={s.presetBtn} onPress={() => setAmount(amt)}>
                                        <Text style={s.presetText}>R{amt}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <TouchableOpacity style={[s.submitButton, isContributing && s.disabledButton]} onPress={handleContribute} disabled={isContributing}>
                                {isContributing ? <ActivityIndicator color="#ffffff" /> : <Text style={s.submitButtonText}>Contribute</Text>}
                            </TouchableOpacity>
                        </>
                    )}
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
};
