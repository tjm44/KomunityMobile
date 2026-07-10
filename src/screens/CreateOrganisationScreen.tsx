import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity,
    ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import client from '../api/client';

interface CreateOrganisationScreenProps {
    onBack: () => void;
    onOrganisationCreated: (org: any) => void;
    isUserVerified: boolean;
    onGoToKYC: () => void;
}

const CreateOrganisationScreen = ({
    onBack,
    onOrganisationCreated,
    isUserVerified,
    onGoToKYC
}: CreateOrganisationScreenProps) => {
    const insets = useSafeAreaInsets();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [registrationNumber, setRegistrationNumber] = useState('');
    const [entityType, setEntityType] = useState('ngo');
    const [loading, setLoading] = useState(false);
    const [nameError, setNameError] = useState<string | null>(null);

    const handleCreate = async () => {
        if (!name.trim()) {
            setNameError('Organisation name is required.');
            return;
        }
        if (!registrationNumber.trim()) {
            Alert.alert('Required Field', 'Please provide an official registration number.');
            return;
        }

        setNameError(null);
        setLoading(true);
        try {
            const response = await client.post('organisations/', {
                name: name.trim(),
                description: description.trim(),
                registration_number: registrationNumber.trim(),
                entity_type: entityType,
            });

            Alert.alert(
                'Organisation Registered 🏢',
                `"${name}" has been registered! You can submit a verification request in settings to unlock full features.`
            );
            onOrganisationCreated(response.data);
        } catch (error: any) {
            console.error('Error creating organisation:', error);
            const msg = error.response?.data?.detail || 'Failed to register organisation. Please try again.';
            Alert.alert('Error', msg);
        } finally {
            setLoading(false);
        }
    };

    if (!isUserVerified) {
        return (
            <View style={[styles.container, { paddingTop: insets.top, justifyContent: 'center', padding: 24 }]}>
                <View style={styles.verifiedGateBox}>
                    <Text style={styles.gateIcon}>🛡️</Text>
                    <Text style={styles.gateTitle}>Verification Required</Text>
                    <Text style={styles.gateDesc}>
                        Only users with verified profiles can register and manage Organisations on Komunity.
                        Please complete your identity verification (KYC) first.
                    </Text>
                    <TouchableOpacity style={styles.kycButton} onPress={onGoToKYC}>
                        <Text style={styles.kycButtonText}>Verify Profile (KYC) →</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.gateBackBtn} onPress={onBack}>
                        <Text style={styles.gateBackBtnText}>Go Back</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 24) }]}>
                    <View style={styles.headerInfo}>
                        <Text style={styles.title}>Register Organisation 🏢</Text>
                        <Text style={styles.subtitle}>Create a formal workspace for NGOs, churches, charity trusts, or businesses.</Text>
                    </View>

                    <View style={styles.formSection}>
                        <Text style={styles.label}>Organisation Name *</Text>
                        <TextInput
                            style={[styles.input, nameError && styles.inputError]}
                            placeholder="e.g. Red Cross Society"
                            value={name}
                            onChangeText={(text) => {
                                setName(text);
                                if (nameError) setNameError(null);
                            }}
                        />
                        {nameError && <Text style={styles.errorText}>{nameError}</Text>}
                    </View>

                    <View style={styles.formSection}>
                        <Text style={styles.label}>Organisation Type *</Text>
                        <View style={styles.pillsContainer}>
                            {[
                                { key: 'ngo', label: 'NGO' },
                                { key: 'church', label: 'Church' },
                                { key: 'npo', label: 'NPO/Charity' },
                                { key: 'corporate', label: 'Corporate' },
                                { key: 'other', label: 'Other' },
                            ].map((type) => (
                                <TouchableOpacity
                                    key={type.key}
                                    style={[styles.entityPill, entityType === type.key && styles.entityPillActive]}
                                    onPress={() => setEntityType(type.key)}
                                >
                                    <Text style={[styles.entityPillText, entityType === type.key && styles.entityPillTextActive]}>
                                        {type.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    <View style={styles.formSection}>
                        <Text style={styles.label}>Registration Number *</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. NPO-123-456 or REG-2026-99"
                            value={registrationNumber}
                            onChangeText={setRegistrationNumber}
                            autoCapitalize="characters"
                            autoCorrect={false}
                        />
                    </View>

                    <View style={styles.formSection}>
                        <Text style={styles.label}>Description</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            placeholder="Tell members about your organisation's goals..."
                            value={description}
                            onChangeText={setDescription}
                            multiline
                            numberOfLines={5}
                        />
                    </View>

                    <View style={styles.infoBox}>
                        <Text style={styles.infoText}>
                            ℹ️ Registered organisations start as unverified. Go to settings after creation to submit your registry certificates for official verification.
                        </Text>
                    </View>

                    <TouchableOpacity
                        style={[styles.createButton, loading && styles.buttonDisabled]}
                        onPress={handleCreate}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#ffffff" />
                        ) : (
                            <Text style={styles.createButtonText}>Register Organisation 🏢</Text>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity onPress={onBack} style={styles.cancelButton}>
                        <Text style={styles.cancelButtonText}>← Cancel</Text>
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#ffffff' },
    scrollContent: { padding: 24 },
    headerInfo: { marginBottom: 24 },
    title: { fontSize: 24, fontWeight: 'bold', color: '#111827', fontFamily: 'Outfit-Bold' },
    subtitle: { fontSize: 14, color: '#6b7280', marginTop: 4, fontFamily: 'Outfit-Regular' },
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
    pillsContainer: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 4 },
    entityPill: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 8,
        borderWidth: 1.5,
        borderColor: '#e5e7eb',
        backgroundColor: '#f9fafb',
    },
    entityPillActive: {
        backgroundColor: '#eff6ff',
        borderColor: '#2563eb',
    },
    entityPillText: { fontSize: 14, color: '#475569', fontWeight: '600' },
    entityPillTextActive: { color: '#2563eb' },
    infoBox: {
        backgroundColor: '#eff6ff',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#dbeafe',
        marginBottom: 24,
    },
    infoText: { fontSize: 14, color: '#1e40af', lineHeight: 20, fontFamily: 'Outfit-Regular' },
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
    // Verified Gate styling
    verifiedGateBox: {
        alignItems: 'center',
        backgroundColor: '#f9fafb',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 16,
        padding: 24,
    },
    gateIcon: { fontSize: 48, marginBottom: 16 },
    gateTitle: { fontSize: 22, fontWeight: 'bold', color: '#111827', fontFamily: 'Outfit-Bold', marginBottom: 8 },
    gateDesc: { fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 22, marginBottom: 24, fontFamily: 'Outfit-Regular' },
    kycButton: { backgroundColor: '#2563eb', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 24, alignItems: 'center', width: '100%', marginBottom: 12 },
    kycButtonText: { color: '#ffffff', fontWeight: 'bold', fontSize: 16, fontFamily: 'Outfit-Bold' },
    gateBackBtn: { padding: 12 },
    gateBackBtnText: { color: '#6b7280', fontWeight: '600', fontSize: 14 },
});

export default CreateOrganisationScreen;
