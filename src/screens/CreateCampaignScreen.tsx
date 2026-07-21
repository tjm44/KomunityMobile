import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity,
    ScrollView, Alert, ActivityIndicator, Platform, KeyboardAvoidingView
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import client from '../api/client';

interface Member {
    id: number;
    member: number;
    member_detail: {
        id: number;
        full_name: string;
        profile_picture?: string;
    };
}

interface CreateCampaignScreenProps {
    group: any;
    onBack: () => void;
    onCreated: (campaign: any) => void;
}

const CAMPAIGN_TYPES = [
    { key: 'bereavement', label: 'Bereavement', icon: '🕊️', color: '#7c3aed' },
    { key: 'excess',      label: 'Insurance Excess', icon: '🚗', color: '#0284c7' },
    { key: 'emergency',   label: 'Emergency', icon: '🆘', color: '#dc2626' },
    { key: 'custom',      label: 'Custom', icon: '✨', color: '#059669' },
];

const CreateCampaignScreen = ({ group, onBack, onCreated }: CreateCampaignScreenProps) => {
    const insets = useSafeAreaInsets();
    const [campaignType, setCampaignType] = useState<string>(group?.purpose ?? 'custom');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [targetAmount, setTargetAmount] = useState('');
    const [deadlineDate, setDeadlineDate] = useState<Date | null>(null);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [beneficiaryId, setBeneficiaryId] = useState<number | null>(null);
    const [members, setMembers] = useState<Member[]>([]);
    const [loadingMembers, setLoadingMembers] = useState(false);
    const [loading, setLoading] = useState(false);
    const [showMemberPicker, setShowMemberPicker] = useState(false);

    const onDateChange = (event: any, selectedDate?: Date) => {
        setShowDatePicker(false);
        if (selectedDate) {
            setDeadlineDate(selectedDate);
        }
    };

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    };

    const selectedMeta = CAMPAIGN_TYPES.find(t => t.key === campaignType)!;
    const selectedBeneficiary = members.find(m => m.member_detail.id === beneficiaryId);

    const isOrganisation = (group as any).is_organisation || !!(group as any).entity_type;

    useEffect(() => {
        if (!isOrganisation) {
            fetchMembers();
        }
    }, [isOrganisation]);

    const fetchMembers = async () => {
        setLoadingMembers(true);
        try {
            const res = await client.get(`groups/${group.id}/members/`);
            setMembers(res.data);
        } catch (e) {
            console.error('Error fetching members:', e);
        } finally {
            setLoadingMembers(false);
        }
    };

    const handleCreate = async () => {
        if (!title.trim()) {
            Alert.alert('Validation', 'Please enter a campaign title.');
            return;
        }
        if ((campaignType === 'excess' || campaignType === 'bereavement') && !beneficiaryId) {
            Alert.alert('Validation', 'Please select a beneficiary / claimant for this campaign.');
            return;
        }

        setLoading(true);
        try {
            const payload: any = {
                campaign_type: campaignType,
                title: title.trim(),
                description: description.trim(),
            };
            if (isOrganisation) {
                payload.organisation = group.id;
            } else {
                payload.group = group.id;
            }
            if (beneficiaryId) payload.beneficiary = beneficiaryId;
            if (targetAmount) payload.target_amount = parseFloat(targetAmount);
            if (deadlineDate) {
                payload.deadline = deadlineDate.toISOString().split('T')[0];
            }

            const res = await client.post('campaigns/', payload);
            Alert.alert('✅ Campaign Created', `"${res.data.title}" is now active!`);
            onCreated(res.data);
        } catch (e: any) {
            const msg = e?.response?.data?.non_field_errors?.[0]
                || e?.response?.data?.detail
                || 'Failed to create campaign. Please try again.';
            Alert.alert('Error', msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

                    {/* Campaign type selector */}
                    <Text style={styles.sectionLabel}>Campaign Type</Text>
                    <View style={styles.typeGrid}>
                        {CAMPAIGN_TYPES.filter(t => {
                            if ((group as any).is_organisation) {
                                return t.key === 'emergency' || t.key === 'custom';
                            }
                            return t.key === group?.purpose;
                        }).map(t => {
                            const active = campaignType === t.key;
                            return (
                                <TouchableOpacity
                                    key={t.key}
                                    style={[styles.typeCard, active && { borderColor: t.color, backgroundColor: `${t.color}12` }]}
                                    onPress={() => setCampaignType(t.key)}
                                >
                                    <Text style={styles.typeIcon}>{t.icon}</Text>
                                    <Text style={[styles.typeLabel, active && { color: t.color }]}>{t.label}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    {campaignType === 'emergency' && !(group as any).is_verified && (
                        <View style={styles.warningBox}>
                            <Text style={styles.warningText}>
                                ⚠️ Emergency Fundraisers require a verified NGO or Church account.
                                Submit a verification request in settings.
                            </Text>
                        </View>
                    )}

                    {/* Title */}
                    <Text style={styles.sectionLabel}>Campaign Title *</Text>
                    <TextInput
                        style={styles.input}
                        placeholder={campaignType === 'excess'
                            ? 'e.g. Help John with insurance excess after accident'
                            : 'Campaign title...'}
                        value={title}
                        onChangeText={setTitle}
                        maxLength={200}
                    />

                    {/* Description */}
                    <Text style={styles.sectionLabel}>Description</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        placeholder="Describe the situation and how the funds will be used..."
                        value={description}
                        onChangeText={setDescription}
                        multiline
                        numberOfLines={4}
                    />

                    {/* Beneficiary / Claimant */}
                    {(campaignType === 'excess' || campaignType === 'bereavement') && (
                        <>
                            <Text style={styles.sectionLabel}>
                                {campaignType === 'excess' ? 'Claimant (Member) *' : 'Beneficiary *'}
                            </Text>
                            <TouchableOpacity
                                style={styles.pickerBtn}
                                onPress={() => setShowMemberPicker(!showMemberPicker)}
                            >
                                <Text style={[styles.pickerBtnText, !selectedBeneficiary && { color: '#94a3b8' }]}>
                                    {selectedBeneficiary
                                        ? `👤 ${selectedBeneficiary.member_detail.full_name}`
                                        : 'Select a member...'}
                                </Text>
                                <Text style={styles.pickerArrow}>{showMemberPicker ? '▲' : '▼'}</Text>
                            </TouchableOpacity>

                            {showMemberPicker && (
                                <View style={styles.memberList}>
                                    {loadingMembers
                                        ? <ActivityIndicator color="#2563eb" style={{ padding: 12 }} />
                                        : members.map(m => (
                                            <TouchableOpacity
                                                key={m.id}
                                                style={[
                                                    styles.memberRow,
                                                    beneficiaryId === m.member_detail.id && styles.memberRowSelected,
                                                ]}
                                                onPress={() => {
                                                    setBeneficiaryId(m.member_detail.id);
                                                    setShowMemberPicker(false);
                                                }}
                                            >
                                                <Text style={styles.memberName}>{m.member_detail.full_name}</Text>
                                                {beneficiaryId === m.member_detail.id && (
                                                    <Text style={styles.memberCheck}>✓</Text>
                                                )}
                                            </TouchableOpacity>
                                        ))
                                    }
                                </View>
                            )}
                        </>
                    )}

                    {/* Target amount */}
                    <Text style={styles.sectionLabel}>Target Amount (optional)</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g. 5000 — leave blank for open-ended"
                        value={targetAmount}
                        onChangeText={setTargetAmount}
                        keyboardType="numeric"
                    />

                    {/* Deadline */}
                    <Text style={styles.sectionLabel}>Deadline (optional)</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <TouchableOpacity 
                            style={[styles.input, { flex: 1, justifyContent: 'center' }]} 
                            onPress={() => setShowDatePicker(true)}
                        >
                            <Text style={deadlineDate ? { color: '#1e293b', fontFamily: 'Outfit-Regular', fontSize: 15 } : { color: '#94a3b8', fontFamily: 'Outfit-Regular', fontSize: 15 }}>
                                {deadlineDate ? formatDate(deadlineDate) : "Select a deadline date"}
                            </Text>
                        </TouchableOpacity>
                        {deadlineDate && (
                            <TouchableOpacity 
                                style={{ marginLeft: 10, padding: 12, backgroundColor: '#fee2e2', borderRadius: 12, borderWidth: 1, borderColor: '#fecaca' }}
                                onPress={() => setDeadlineDate(null)}
                            >
                                <Text style={{ color: '#ef4444', fontFamily: 'Outfit-Bold', fontSize: 14 }}>Clear</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {showDatePicker && (
                        <DateTimePicker
                            value={deadlineDate || new Date()}
                            mode="date"
                            display="default"
                            minimumDate={new Date()}
                            onChange={onDateChange}
                        />
                    )}

                    {campaignType === 'emergency' && (
                        <View style={styles.infoBox}>
                            <Text style={styles.infoText}>
                                🌍 This campaign will be publicly visible to all Komunity users in the Fundraisers tab
                                until it is manually closed.
                            </Text>
                        </View>
                    )}

                </ScrollView>

                <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
                    <TouchableOpacity
                        style={[styles.createBtn, { backgroundColor: selectedMeta.color }, loading && { opacity: 0.6 }]}
                        onPress={handleCreate}
                        disabled={loading}
                    >
                        {loading
                            ? <ActivityIndicator color="#fff" />
                            : <Text style={styles.createBtnText}>Launch Campaign {selectedMeta.icon}</Text>
                        }
                    </TouchableOpacity>
                    <TouchableOpacity onPress={onBack} style={styles.cancelBtn}>
                        <Text style={styles.cancelBtnText}>Cancel</Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    scroll: { padding: 20, paddingBottom: 24 },
    sectionLabel: {
        fontSize: 14,
        fontWeight: '700',
        color: '#374151',
        marginBottom: 8,
        marginTop: 16,
        fontFamily: 'Outfit-Bold',
    },
    typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    typeCard: {
        width: '47%',
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#e2e8f0',
        backgroundColor: '#fff',
        padding: 12,
        alignItems: 'center',
        gap: 6,
    },
    typeIcon: { fontSize: 26 },
    typeLabel: { fontSize: 13, fontWeight: '700', color: '#374151', fontFamily: 'Outfit-Bold', textAlign: 'center' },
    input: {
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 12,
        padding: 14,
        fontSize: 15,
        color: '#1e293b',
        fontFamily: 'Outfit-Regular',
    },
    textArea: { height: 110, textAlignVertical: 'top' },
    pickerBtn: {
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 12,
        padding: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    pickerBtnText: { fontSize: 15, color: '#1e293b', fontFamily: 'Outfit-Regular' },
    pickerArrow: { fontSize: 12, color: '#94a3b8' },
    memberList: {
        backgroundColor: '#fff',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        marginTop: 4,
        overflow: 'hidden',
    },
    memberRow: { padding: 14, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    memberRowSelected: { backgroundColor: '#eff6ff' },
    memberName: { fontSize: 15, color: '#1e293b', fontFamily: 'Outfit-Regular' },
    memberCheck: { fontSize: 16, color: '#2563eb' },
    warningBox: {
        backgroundColor: '#fef3c7',
        borderRadius: 12,
        padding: 14,
        borderWidth: 1,
        borderColor: '#fcd34d',
        marginTop: 8,
    },
    warningText: { fontSize: 13, color: '#92400e', lineHeight: 18, fontFamily: 'Outfit-Regular' },
    infoBox: {
        backgroundColor: '#eff6ff',
        borderRadius: 12,
        padding: 14,
        borderWidth: 1,
        borderColor: '#bfdbfe',
        marginTop: 12,
    },
    infoText: { fontSize: 13, color: '#1e40af', lineHeight: 18, fontFamily: 'Outfit-Regular' },
    footer: { padding: 20, paddingTop: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#f1f5f9' },
    createBtn: { borderRadius: 14, padding: 16, alignItems: 'center', marginBottom: 10 },
    createBtnText: { color: '#fff', fontSize: 17, fontWeight: '800', fontFamily: 'Outfit-Bold' },
    cancelBtn: { alignItems: 'center', padding: 10 },
    cancelBtnText: { fontSize: 15, color: '#64748b', fontFamily: 'Outfit-Regular' },
});

export default CreateCampaignScreen;
