import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity,
    ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
    Modal, SafeAreaView
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import client from '../api/client';
import { colors, gradients } from '../constants/theme';

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
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');

    const [profiles, setProfiles] = useState<any[]>([]);
    const [admin2, setAdmin2] = useState<any>(null);
    const [admin3, setAdmin3] = useState<any>(null);
    const [showAdmin2Modal, setShowAdmin2Modal] = useState(false);
    const [showAdmin3Modal, setShowAdmin3Modal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const [loading, setLoading] = useState(false);
    const [nameError, setNameError] = useState<string | null>(null);

    useEffect(() => {
        const loadProfiles = async () => {
            try {
                const res = await client.get('profiles/');
                setProfiles(res.data);
            } catch (err) {
                console.error('Error fetching profiles:', err);
            }
        };
        loadProfiles();
    }, []);

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
                email: email.trim(),
                phone_number: phone.trim(),
                admin2: admin2,
                admin3: admin3,
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

                    <View style={styles.formSection}>
                        <Text style={styles.label}>Organisation Email</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. contact@organisation.org"
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                    </View>

                    <View style={styles.formSection}>
                        <Text style={styles.label}>Organisation Phone Number</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. +1234567890"
                            value={phone}
                            onChangeText={setPhone}
                            keyboardType="phone-pad"
                            autoCorrect={false}
                        />
                    </View>

                    <View style={styles.formSection}>
                        <Text style={styles.label}>Second Administrator (Optional)</Text>
                        <View style={styles.pickerRow}>
                            <TouchableOpacity 
                                style={styles.pickerButton} 
                                onPress={() => {
                                    setSearchQuery('');
                                    setShowAdmin2Modal(true);
                                }}
                            >
                                <Text style={styles.pickerButtonText}>
                                    {admin2 
                                        ? profiles.find(p => p.user === admin2)?.full_name || 'Selected Admin'
                                        : 'Select Second Admin...'}
                                </Text>
                            </TouchableOpacity>
                            {admin2 && (
                                <TouchableOpacity style={styles.clearBtn} onPress={() => setAdmin2(null)}>
                                    <Text style={styles.clearBtnText}>Clear</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>

                    <View style={styles.formSection}>
                        <Text style={styles.label}>Third Administrator (Optional)</Text>
                        <View style={styles.pickerRow}>
                            <TouchableOpacity 
                                style={styles.pickerButton} 
                                onPress={() => {
                                    setSearchQuery('');
                                    setShowAdmin3Modal(true);
                                }}
                            >
                                <Text style={styles.pickerButtonText}>
                                    {admin3 
                                        ? profiles.find(p => p.user === admin3)?.full_name || 'Selected Admin'
                                        : 'Select Third Admin...'}
                                </Text>
                            </TouchableOpacity>
                            {admin3 && (
                                <TouchableOpacity style={styles.clearBtn} onPress={() => setAdmin3(null)}>
                                    <Text style={styles.clearBtnText}>Clear</Text>
                                </TouchableOpacity>
                            )}
                        </View>
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

            {/* Admin 2 Selection Modal */}
            <Modal visible={showAdmin2Modal} animationType="slide" transparent={true} onRequestClose={() => setShowAdmin2Modal(false)}>
                <SafeAreaView style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Select Second Admin</Text>
                        <TextInput
                            style={styles.searchBar}
                            placeholder="Search by name or email..."
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            autoCapitalize="none"
                        />
                        <ScrollView style={styles.profilesList}>
                            {profiles.filter(p => {
                                const q = searchQuery.toLowerCase();
                                return (p.full_name || '').toLowerCase().includes(q) || (p.email || '').toLowerCase().includes(q);
                            }).map(p => (
                                <TouchableOpacity 
                                    key={p.id} 
                                    style={styles.profileItem}
                                    onPress={() => {
                                        setAdmin2(p.user);
                                        setShowAdmin2Modal(false);
                                    }}
                                >
                                    <Text style={styles.profileItemName}>{p.full_name || 'No Name'}</Text>
                                    <Text style={styles.profileItemEmail}>{p.email}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                        <TouchableOpacity style={styles.closeModalBtn} onPress={() => setShowAdmin2Modal(false)}>
                            <Text style={styles.closeModalBtnText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </Modal>

            {/* Admin 3 Selection Modal */}
            <Modal visible={showAdmin3Modal} animationType="slide" transparent={true} onRequestClose={() => setShowAdmin3Modal(false)}>
                <SafeAreaView style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Select Third Admin</Text>
                        <TextInput
                            style={styles.searchBar}
                            placeholder="Search by name or email..."
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            autoCapitalize="none"
                        />
                        <ScrollView style={styles.profilesList}>
                            {profiles.filter(p => {
                                const q = searchQuery.toLowerCase();
                                return (p.full_name || '').toLowerCase().includes(q) || (p.email || '').toLowerCase().includes(q);
                            }).map(p => (
                                <TouchableOpacity 
                                    key={p.id} 
                                    style={styles.profileItem}
                                    onPress={() => {
                                        setAdmin3(p.user);
                                        setShowAdmin3Modal(false);
                                    }}
                                >
                                    <Text style={styles.profileItemName}>{p.full_name || 'No Name'}</Text>
                                    <Text style={styles.profileItemEmail}>{p.email}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                        <TouchableOpacity style={styles.closeModalBtn} onPress={() => setShowAdmin3Modal(false)}>
                            <Text style={styles.closeModalBtnText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.white },
    scrollContent: { padding: 24 },
    headerInfo: { marginBottom: 24 },
    title: { fontSize: 24, fontWeight: 'bold', color: colors.textPrimary, fontFamily: 'Outfit-Bold' },
    subtitle: { fontSize: 14, color: colors.textSecondary, marginTop: 4, fontFamily: 'Outfit-Regular' },
    formSection: { marginBottom: 24 },
    label: { fontSize: 16, fontWeight: 'bold', color: colors.textSecondary, marginBottom: 8, fontFamily: 'Outfit-Bold' },
    input: {
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        color: colors.textPrimary,
        fontFamily: 'Outfit-Regular',
    },
    textArea: { height: 120, textAlignVertical: 'top' },
    inputError: { borderColor: colors.danger, backgroundColor: colors.dangerLight },
    errorText: { color: colors.danger, fontSize: 12, marginTop: 4, marginLeft: 4, fontWeight: '500' },
    pillsContainer: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 4 },
    entityPill: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 8,
        borderWidth: 1.5,
        borderColor: colors.border,
        backgroundColor: colors.background,
    },
    entityPillActive: {
        backgroundColor: colors.surfaceLight,
        borderColor: colors.primary,
    },
    entityPillText: { fontSize: 14, color: colors.textSecondary, fontWeight: '600' },
    entityPillTextActive: { color: colors.primary },
    infoBox: {
        backgroundColor: colors.surfaceLight,
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.surfaceLight,
        marginBottom: 24,
    },
    infoText: { fontSize: 14, color: colors.primary, lineHeight: 20, fontFamily: 'Outfit-Regular' },
    createButton: {
        backgroundColor: colors.primary,
        borderRadius: 12,
        padding: 18,
        alignItems: 'center',
        marginBottom: 12,
    },
    buttonDisabled: { opacity: 0.5 },
    createButtonText: { color: colors.white, fontWeight: 'bold', fontSize: 17, fontFamily: 'Outfit-Bold' },
    cancelButton: { padding: 12, alignItems: 'center' },
    cancelButtonText: { color: colors.textSecondary, fontSize: 15, fontWeight: '500', fontFamily: 'Outfit-Regular' },
    // Verified Gate styling
    verifiedGateBox: {
        alignItems: 'center',
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 16,
        padding: 24,
    },
    gateIcon: { fontSize: 48, marginBottom: 16 },
    gateTitle: { fontSize: 22, fontWeight: 'bold', color: colors.textPrimary, fontFamily: 'Outfit-Bold', marginBottom: 8 },
    gateDesc: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 24, fontFamily: 'Outfit-Regular' },
    kycButton: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 24, alignItems: 'center', width: '100%', marginBottom: 12 },
    kycButtonText: { color: colors.white, fontWeight: 'bold', fontSize: 16, fontFamily: 'Outfit-Bold' },
    gateBackBtn: { padding: 12 },
    gateBackBtnText: { color: colors.textSecondary, fontWeight: '600', fontSize: 14 },
    pickerRow: {
        flexDirection: 'row',
        gap: 10,
        alignItems: 'center',
    },
    pickerButton: {
        flex: 1,
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 12,
        padding: 16,
    },
    pickerButtonText: {
        fontSize: 16,
        color: colors.textPrimary,
        fontFamily: 'Outfit-Regular',
    },
    clearBtn: {
        backgroundColor: colors.dangerLight,
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.dangerLight,
    },
    clearBtnText: {
        color: colors.danger,
        fontWeight: 'bold',
        fontSize: 14,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: colors.white,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        maxHeight: '80%',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: colors.textPrimary,
        fontFamily: 'Outfit-Bold',
        marginBottom: 16,
    },
    searchBar: {
        backgroundColor: colors.surfaceLight,
        borderRadius: 12,
        padding: 12,
        fontSize: 16,
        color: colors.textPrimary,
        marginBottom: 16,
    },
    profilesList: {
        marginBottom: 16,
    },
    profileItem: {
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.surfaceLight,
    },
    profileItemName: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    profileItemEmail: {
        fontSize: 14,
        color: colors.textSecondary,
    },
    closeModalBtn: {
        backgroundColor: colors.textSecondary,
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
    },
    closeModalBtnText: {
        color: colors.white,
        fontWeight: 'bold',
        fontSize: 16,
    },
});

export default CreateOrganisationScreen;
