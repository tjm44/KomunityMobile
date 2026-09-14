import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity,
    ScrollView, Alert, ActivityIndicator, Platform, KeyboardAvoidingView
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import client from '../api/client';
import { colors } from '../constants/theme';

interface CreateCampaignScreenProps {
    group: any;
    onBack: () => void;
    onCreated: (campaign: any) => void;
}

const CreateCampaignScreen = ({ group, onBack, onCreated }: CreateCampaignScreenProps) => {
    const insets = useSafeAreaInsets();
    const [title, setTitle] = useState('');
    const [targetAmount, setTargetAmount] = useState('');
    const [deadlineDate, setDeadlineDate] = useState<Date | null>(null);
    const [description, setDescription] = useState('');
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [loading, setLoading] = useState(false);

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

    const isOrganisation = (group as any)?.is_organisation || !!(group as any)?.entity_type;

    const handleCreate = async () => {
        if (!title.trim()) {
            Alert.alert('Validation', 'Please enter a campaign title.');
            return;
        }

        setLoading(true);
        try {
            const validTypes = ['bereavement', 'excess', 'emergency', 'custom'];
            const campaignType = validTypes.includes(group?.purpose) ? group.purpose : 'custom';

            const payload: any = {
                title: title.trim(),
                name: title.trim(),
                description: description.trim(),
                campaign_type: campaignType,
            };
            if (isOrganisation) {
                payload.organisation = group.id;
            } else {
                payload.group = group.id;
            }
            if (targetAmount && parseFloat(targetAmount) > 0) {
                payload.target_amount = parseFloat(targetAmount);
            }
            if (deadlineDate) {
                payload.deadline = deadlineDate.toISOString().split('T')[0];
            }

            const res = await client.post('campaigns/', payload);
            Alert.alert('✅ Campaign Created', `"${res.data.title || title}" is now active!`);
            onCreated(res.data);
        } catch (e: any) {
            let msg = e?.response?.data?.non_field_errors?.[0]
                || e?.response?.data?.detail
                || e?.response?.data?.error;
            if (!msg && e?.response?.data && typeof e.response.data === 'object') {
                const firstKey = Object.keys(e.response.data)[0];
                const firstVal = e.response.data[firstKey];
                msg = Array.isArray(firstVal) ? `${firstKey}: ${firstVal[0]}` : `${firstKey}: ${firstVal}`;
            }
            Alert.alert('Error', msg || 'Failed to create campaign. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

                    {/* Group info header banner */}
                    <View style={styles.groupCard}>
                        <Text style={styles.groupNameText}>{group?.name || 'Community Group'}</Text>
                        <Text style={styles.groupCategoryText}>
                            Category: <Text style={{ color: colors.primary, fontFamily: 'Outfit-Bold' }}>{group?.purpose_display || group?.purpose || 'Community Fund'}</Text>
                        </Text>
                    </View>

                    {/* 1. Campaign Title */}
                    <Text style={styles.sectionLabel}>Campaign Title *</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g. Emergency Support Fund, Annual Event..."
                        value={title}
                        onChangeText={setTitle}
                        maxLength={200}
                    />

                    {/* 2. Target Amount (Optional) */}
                    <Text style={styles.sectionLabel}>Target Amount (optional)</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g. 5000 — leave blank for open-ended"
                        value={targetAmount}
                        onChangeText={setTargetAmount}
                        keyboardType="numeric"
                    />

                    {/* 3. Deadline */}
                    <Text style={styles.sectionLabel}>Deadline (optional)</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <TouchableOpacity 
                            style={[styles.input, { flex: 1, justifyContent: 'center' }]} 
                            onPress={() => setShowDatePicker(true)}
                        >
                            <Text style={deadlineDate ? { color: colors.textPrimary, fontFamily: 'Outfit-Regular', fontSize: 15 } : { color: colors.textMuted, fontFamily: 'Outfit-Regular', fontSize: 15 }}>
                                {deadlineDate ? formatDate(deadlineDate) : "Select deadline date"}
                            </Text>
                        </TouchableOpacity>
                        {deadlineDate && (
                            <TouchableOpacity 
                                style={{ marginLeft: 10, padding: 12, backgroundColor: colors.dangerLight, borderRadius: 12, borderWidth: 1, borderColor: colors.dangerLight }}
                                onPress={() => setDeadlineDate(null)}
                            >
                                <Text style={{ color: colors.danger, fontFamily: 'Outfit-Bold', fontSize: 14 }}>Clear</Text>
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

                    {/* 4. Description */}
                    <Text style={styles.sectionLabel}>Description</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        placeholder="Describe the cause, goals, and how funds will be used..."
                        value={description}
                        onChangeText={setDescription}
                        multiline
                        numberOfLines={4}
                    />

                </ScrollView>

                <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
                    <TouchableOpacity
                        style={[styles.createBtn, loading && { opacity: 0.6 }]}
                        onPress={handleCreate}
                        disabled={loading || !title.trim()}
                    >
                        {loading
                            ? <ActivityIndicator color="#fff" />
                            : <Text style={styles.createBtnText}>🚀 Launch Campaign</Text>
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
    container: { flex: 1, backgroundColor: colors.background },
    scroll: { padding: 20, paddingBottom: 24 },
    groupCard: {
        backgroundColor: colors.white,
        borderRadius: 14,
        padding: 16,
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: 8,
    },
    groupNameText: {
        fontSize: 17,
        fontFamily: 'Outfit-Bold',
        color: colors.textPrimary,
        marginBottom: 4,
    },
    groupCategoryText: {
        fontSize: 13,
        fontFamily: 'Outfit-Regular',
        color: colors.textMuted,
    },
    sectionLabel: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.textSecondary,
        marginBottom: 8,
        marginTop: 16,
        fontFamily: 'Outfit-Bold',
    },
    input: {
        backgroundColor: colors.white,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 12,
        padding: 14,
        fontSize: 15,
        color: colors.textPrimary,
        fontFamily: 'Outfit-Regular',
    },
    textArea: { height: 110, textAlignVertical: 'top' },
    footer: { padding: 20, paddingTop: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: colors.surfaceLight },
    createBtn: { borderRadius: 14, padding: 16, alignItems: 'center', marginBottom: 10, backgroundColor: colors.primary },
    createBtnText: { color: '#fff', fontSize: 17, fontWeight: '800', fontFamily: 'Outfit-Bold' },
    cancelBtn: { alignItems: 'center', padding: 10 },
    cancelBtnText: { fontSize: 15, color: colors.textSecondary, fontFamily: 'Outfit-Regular' },
});

export default CreateCampaignScreen;
