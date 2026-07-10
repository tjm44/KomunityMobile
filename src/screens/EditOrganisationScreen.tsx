import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity,
    ScrollView, Alert, ActivityIndicator, Image, KeyboardAvoidingView, Platform
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import client from '../api/client';

interface EditOrganisationScreenProps {
    organisation: any;
    onBack: () => void;
    onOrganisationUpdated: (updated: any) => void;
}

const EditOrganisationScreen = ({ organisation, onBack, onOrganisationUpdated }: EditOrganisationScreenProps) => {
    const insets = useSafeAreaInsets();
    const [name, setName] = useState(organisation.name || '');
    const [description, setDescription] = useState(organisation.description || '');
    const [registrationNumber, setRegistrationNumber] = useState(organisation.registration_number || '');
    const [entityType, setEntityType] = useState(organisation.entity_type || 'ngo');
    const [loading, setLoading] = useState(false);
    const [coverImage, setCoverImage] = useState<string | null>(organisation.cover_image || null);
    const [newCoverImage, setNewCoverImage] = useState<any>(null);
    const [removeCover, setRemoveCover] = useState(false);
    const [requestingVerification, setRequestingVerification] = useState(false);

    const pickCoverImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Denied', 'We need gallery permissions to set a cover photo.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [16, 9],
            quality: 0.8,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
            const picked = result.assets[0];
            setNewCoverImage(picked);
            setCoverImage(picked.uri);
            setRemoveCover(false);
        }
    };

    const handleRemoveCover = () => {
        setCoverImage(null);
        setNewCoverImage(null);
        setRemoveCover(true);
    };

    const hasChanges = () => {
        return (
            name.trim() !== (organisation.name || '') ||
            description.trim() !== (organisation.description || '') ||
            registrationNumber.trim() !== (organisation.registration_number || '') ||
            entityType !== (organisation.entity_type || 'ngo') ||
            newCoverImage !== null ||
            removeCover
        );
    };

    const handleSave = async () => {
        if (!name.trim()) {
            Alert.alert('Required Field', 'Organisation name cannot be empty.');
            return;
        }

        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('name', name.trim());
            formData.append('description', description.trim());
            formData.append('registration_number', registrationNumber.trim());
            formData.append('entity_type', entityType);

            if (newCoverImage) {
                const uri = newCoverImage.uri;
                const filename = uri.split('/').pop() || 'cover.jpg';
                const match = /\.(\w+)$/.exec(filename);
                const type = match ? `image/${match[1]}` : 'image/jpeg';
                formData.append('cover_image', {
                    uri,
                    name: filename,
                    type,
                } as any);
            } else if (removeCover) {
                formData.append('cover_image', '');
            }

            const response = await client.patch(`organisations/${organisation.id}/`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            Alert.alert('Success', 'Organisation details updated!');
            onOrganisationUpdated(response.data);
        } catch (error: any) {
            console.error('Error updating organisation:', error);
            Alert.alert('Error', 'Failed to update organisation details. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleRequestVerification = async () => {
        Alert.alert(
            'Request Verification',
            'Submitting a request will notify the Komunity compliance team to review your registration documents. Continue?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Submit Request',
                    onPress: async () => {
                        setRequestingVerification(true);
                        try {
                            const response = await client.post(`organisations/${organisation.id}/request-verification/`);
                            Alert.alert('Request Submitted ✅', response.data.message);
                        } catch (error: any) {
                            Alert.alert('Error', error.response?.data?.error || 'Failed to submit request.');
                        } finally {
                            setRequestingVerification(false);
                        }
                    }
                }
            ]
        );
    };

    return (
        <View style={styles.container}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    {/* Cover Photo */}
                    <View style={styles.coverSection}>
                        <Text style={styles.label}>Cover Image</Text>
                        <TouchableOpacity style={styles.coverPicker} onPress={pickCoverImage}>
                            {coverImage ? (
                                <Image source={{ uri: coverImage }} style={styles.coverPreview} />
                            ) : (
                                <View style={styles.coverPlaceholder}>
                                    <Text style={styles.coverPlaceholderIcon}>📷</Text>
                                    <Text style={styles.coverPlaceholderText}>Tap to select cover image</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                        {coverImage && (
                            <View style={styles.coverActions}>
                                <TouchableOpacity style={styles.changeCoverBtn} onPress={pickCoverImage}>
                                    <Text style={styles.changeCoverText}>Change</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.removeCoverBtn} onPress={handleRemoveCover}>
                                    <Text style={styles.removeCoverText}>Remove</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>

                    {/* Name */}
                    <View style={styles.formSection}>
                        <Text style={styles.label}>Organisation Name *</Text>
                        <TextInput
                            style={styles.input}
                            value={name}
                            onChangeText={setName}
                            placeholderTextColor="#9ca3af"
                        />
                    </View>

                    {/* Registry details */}
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
                            value={registrationNumber}
                            onChangeText={setRegistrationNumber}
                            autoCapitalize="characters"
                            autoCorrect={false}
                        />
                    </View>

                    {/* Description */}
                    <View style={styles.formSection}>
                        <Text style={styles.label}>Description</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            value={description}
                            onChangeText={setDescription}
                            multiline
                            numberOfLines={5}
                            placeholderTextColor="#9ca3af"
                        />
                    </View>

                    {/* Verification Status Card */}
                    <View style={[
                        styles.verificationCard,
                        organisation.is_verified
                            ? { backgroundColor: '#f0fdf4', borderColor: '#6ee7b7' }
                            : { backgroundColor: '#fffbeb', borderColor: '#fde68a' }
                    ]}>
                        <Text style={[styles.verificationTitle, { color: organisation.is_verified ? '#065f46' : '#92400e' }]}>
                            {organisation.is_verified ? '✅ Official Verified Organisation' : '⚠️ Unverified Organisation Profile'}
                        </Text>
                        <Text style={[styles.verificationDesc, { color: organisation.is_verified ? '#14532d' : '#78350f' }]}>
                            {organisation.is_verified
                                ? 'Your registry documents are verified. You can launch public emergency campaigns globally.'
                                : 'You are currently unverified. Verified accounts receive trust seals and access to global fundraisers.'}
                        </Text>
                        {!organisation.is_verified && (
                            <TouchableOpacity
                                style={styles.verifyRequestBtn}
                                onPress={handleRequestVerification}
                                disabled={requestingVerification}
                            >
                                {requestingVerification ? (
                                    <ActivityIndicator color="#ffffff" size="small" />
                                ) : (
                                    <Text style={styles.verifyRequestBtnText}>Request Verification →</Text>
                                )}
                            </TouchableOpacity>
                        )}
                    </View>
                </ScrollView>

                {/* Footer Controls */}
                <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
                    <TouchableOpacity
                        style={[styles.saveButton, !hasChanges() && styles.saveButtonDisabled]}
                        onPress={handleSave}
                        disabled={loading || !hasChanges()}
                    >
                        {loading ? (
                            <ActivityIndicator color="#ffffff" />
                        ) : (
                            <Text style={styles.saveButtonText}>Save Changes</Text>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity onPress={onBack} style={styles.cancelButton}>
                        <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#ffffff' },
    scrollContent: { padding: 24 },
    coverSection: { marginBottom: 24 },
    label: { fontSize: 16, fontWeight: 'bold', color: '#374151', marginBottom: 8, fontFamily: 'Outfit-Bold' },
    coverPicker: { height: 160, borderRadius: 12, borderStyle: 'dashed', borderWidth: 2, borderColor: '#cbd5e1', overflow: 'hidden' },
    coverPreview: { width: '100%', height: '100%' },
    coverPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },
    coverPlaceholderIcon: { fontSize: 32, marginBottom: 8 },
    coverPlaceholderText: { fontSize: 13, color: '#64748b', fontWeight: '500' },
    coverActions: { flexDirection: 'row', gap: 10, marginTop: 10 },
    changeCoverBtn: { flex: 1, backgroundColor: '#f1f5f9', paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
    changeCoverText: { color: '#334155', fontWeight: '700', fontSize: 13 },
    removeCoverBtn: { flex: 1, backgroundColor: '#fee2e2', paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
    removeCoverText: { color: '#dc2626', fontWeight: '700', fontSize: 13 },
    formSection: { marginBottom: 24 },
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
    pillsContainer: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 4 },
    entityPill: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1.5, borderColor: '#e5e7eb', backgroundColor: '#f9fafb' },
    entityPillActive: { backgroundColor: '#eff6ff', borderColor: '#2563eb' },
    entityPillText: { fontSize: 13, color: '#475569', fontWeight: '600' },
    entityPillTextActive: { color: '#2563eb' },
    verificationCard: { padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 24 },
    verificationTitle: { fontSize: 15, fontWeight: 'bold', fontFamily: 'Outfit-Bold' },
    verificationDesc: { fontSize: 13, marginTop: 6, lineHeight: 20, fontFamily: 'Outfit-Regular' },
    verifyRequestBtn: { backgroundColor: '#2563eb', borderRadius: 8, paddingVertical: 10, alignItems: 'center', marginTop: 12 },
    verifyRequestBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 13 },
    footer: { padding: 24, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
    saveButton: { backgroundColor: '#2563eb', borderRadius: 12, padding: 18, alignItems: 'center', marginBottom: 12 },
    saveButtonDisabled: { opacity: 0.5 },
    saveButtonText: { color: '#ffffff', fontWeight: 'bold', fontSize: 16, fontFamily: 'Outfit-Bold' },
    cancelButton: { padding: 12, alignItems: 'center' },
    cancelButtonText: { color: '#6b7280', fontSize: 15, fontWeight: '500' },
});

export default EditOrganisationScreen;
