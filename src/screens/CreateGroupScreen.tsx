import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity,
    ScrollView, Alert, ActivityIndicator, Switch, Platform, KeyboardAvoidingView
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import client from '../api/client';
import { validateName } from '../utils/validation';
import type { GroupPurpose } from './GroupPurposeScreen';

const PURPOSE_META: Record<GroupPurpose, { label: string; icon: string; color: string }> = {
    bereavement: { label: 'Bereavement Fund', icon: '🕊️', color: '#7c3aed' },
    excess:      { label: 'Insurance Excess Fund', icon: '🚗', color: '#0284c7' },
    emergency:   { label: 'Emergency Fundraiser', icon: '🆘', color: '#dc2626' },
    custom:      { label: 'Custom Purpose', icon: '✨', color: '#059669' },
};

interface CreateGroupScreenProps {
    onBack: () => void;
    onGroupCreated: (group: any) => void;
    purpose?: GroupPurpose;
    fund_description?: string;
}

const CreateGroupScreen = ({
    onBack,
    onGroupCreated,
    purpose = 'bereavement',
    fund_description = '',
}: CreateGroupScreenProps) => {
    const insets = useSafeAreaInsets();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [requiresApproval, setRequiresApproval] = useState(false);
    const [verifiedMembersOnly, setVerifiedMembersOnly] = useState(false);
    const [loading, setLoading] = useState(false);
    const [nameError, setNameError] = useState<string | null>(null);

    const meta = PURPOSE_META[purpose];

    const handleCreateGroup = async () => {
        const error = validateName(name, 'Community Name');
        if (error) {
            setNameError(error);
            return;
        }

        setNameError(null);
        setLoading(true);
        try {
            const response = await client.post('groups/', {
                name: name.trim(),
                description: description.trim(),
                requires_approval: requiresApproval,
                verified_members_only: verifiedMembersOnly,
                purpose,
                fund_description: purpose === 'custom' ? fund_description : '',
            });

            Alert.alert('Success', `Community "${name}" has been created!`);
            onGroupCreated(response.data);
        } catch (error) {
            console.error('Error creating group:', error);
            Alert.alert('Error', 'Failed to create community. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={styles.scrollContent}>

                    {/* Purpose badge */}
                    <View style={[styles.purposeBadge, { backgroundColor: `${meta.color}18`, borderColor: `${meta.color}40` }]}>
                        <Text style={styles.purposeIcon}>{meta.icon}</Text>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.purposeLabel, { color: meta.color }]}>{meta.label}</Text>
                            {purpose === 'custom' && fund_description ? (
                                <Text style={styles.purposeDesc} numberOfLines={2}>{fund_description}</Text>
                            ) : null}
                        </View>
                    </View>

                    <View style={styles.formSection}>
                        <Text style={styles.label}>Community Name *</Text>
                        <TextInput
                            style={[styles.input, nameError && styles.inputError]}
                            placeholder="e.g. Sunnyvale Neighbourhood"
                            value={name}
                            onChangeText={(text) => {
                                setName(text);
                                if (nameError) setNameError(null);
                            }}
                        />
                        {nameError && <Text style={styles.errorText}>{nameError}</Text>}
                    </View>

                    <View style={styles.formSection}>
                        <Text style={styles.label}>Description</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            placeholder="What is this community about?"
                            value={description}
                            onChangeText={setDescription}
                            multiline
                            numberOfLines={4}
                        />
                    </View>

                    <View style={styles.settingRow}>
                        <View style={styles.settingText}>
                            <Text style={styles.settingLabel}>Require Approval</Text>
                            <Text style={styles.settingDescription}>New members must be approved by an admin.</Text>
                        </View>
                        <Switch
                            value={requiresApproval}
                            onValueChange={setRequiresApproval}
                            trackColor={{ false: '#d1d5db', true: '#93c5fd' }}
                            thumbColor={requiresApproval ? '#2563eb' : '#f4f3f4'}
                        />
                    </View>

                    <View style={styles.settingRow}>
                        <View style={styles.settingText}>
                            <Text style={styles.settingLabel}>Verified Members Only 🛡️</Text>
                            <Text style={styles.settingDescription}>Only allow verified user profiles to join this community.</Text>
                        </View>
                        <Switch
                            value={verifiedMembersOnly}
                            onValueChange={setVerifiedMembersOnly}
                            trackColor={{ false: '#d1d5db', true: '#93c5fd' }}
                            thumbColor={verifiedMembersOnly ? '#2563eb' : '#f4f3f4'}
                        />
                    </View>

                    {purpose === 'emergency' && (
                        <View style={[styles.infoBox, { backgroundColor: '#fef2f2', borderColor: '#fecaca' }]}>
                            <Text style={[styles.infoText, { color: '#991b1b' }]}>
                                🆘 Emergency Fundraisers are only available to verified NGO or Church accounts.
                                Once created, your campaign will be publicly visible to all Komunity users.
                            </Text>
                        </View>
                    )}

                    <View style={styles.infoBox}>
                        <Text style={styles.infoText}>
                            💡 You will automatically become the administrator of this community. You can change settings and add more admins later.
                        </Text>
                    </View>
                </ScrollView>

                <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
                    <TouchableOpacity
                        style={[styles.createButton, { backgroundColor: meta.color }, loading && styles.buttonDisabled]}
                        onPress={handleCreateGroup}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#ffffff" />
                        ) : (
                            <Text style={styles.createButtonText}>Launch Community {meta.icon}</Text>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity onPress={onBack} style={styles.cancelButton}>
                        <Text style={styles.cancelButtonText}>← Change Purpose</Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#ffffff' },
    scrollContent: { padding: 24 },
    purposeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 14,
        padding: 14,
        marginBottom: 24,
        gap: 12,
    },
    purposeIcon: { fontSize: 28 },
    purposeLabel: { fontSize: 15, fontWeight: '700', fontFamily: 'Outfit-Bold' },
    purposeDesc: { fontSize: 12, color: '#64748b', marginTop: 2, fontFamily: 'Outfit-Regular' },
    formSection: { marginBottom: 24 },
    label: { fontSize: 16, fontWeight: 'bold', color: '#374151', marginBottom: 8, fontFamily: 'Outfit-Bold' },
    input: {
        backgroundColor: '#f9fafb',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        color: '#111827',
        fontFamily: 'Outfit-Regular',
    },
    textArea: { height: 120, textAlignVertical: 'top' },
    inputError: { borderColor: '#ef4444', backgroundColor: '#fef2f2' },
    errorText: { color: '#ef4444', fontSize: 12, marginTop: 4, marginLeft: 4, fontWeight: '500' },
    settingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#f9fafb',
        padding: 16,
        borderRadius: 12,
        marginBottom: 24,
    },
    settingText: { flex: 1, marginRight: 16 },
    settingLabel: { fontSize: 16, fontWeight: 'bold', color: '#111827', fontFamily: 'Outfit-Bold' },
    settingDescription: { fontSize: 14, color: '#6b7280', marginTop: 2, fontFamily: 'Outfit-Regular' },
    infoBox: {
        backgroundColor: '#eff6ff',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#dbeafe',
        marginBottom: 16,
    },
    infoText: { fontSize: 14, color: '#1e40af', lineHeight: 20, fontFamily: 'Outfit-Regular' },
    footer: { padding: 24, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
    createButton: {
        backgroundColor: '#2563eb',
        borderRadius: 12,
        padding: 18,
        alignItems: 'center',
        marginBottom: 12,
    },
    buttonDisabled: { opacity: 0.5 },
    createButtonText: { color: '#ffffff', fontWeight: 'bold', fontSize: 17, fontFamily: 'Outfit-Bold' },
    cancelButton: { padding: 12, alignItems: 'center' },
    cancelButtonText: { color: '#6b7280', fontSize: 15, fontWeight: '500', fontFamily: 'Outfit-Regular' },
});

export default CreateGroupScreen;
