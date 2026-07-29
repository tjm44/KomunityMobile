import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity,
    ScrollView, Alert, ActivityIndicator, Switch, Platform,
    KeyboardAvoidingView, Image, Modal
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import client, { fetchFormData, appendFileToFormData } from '../api/client';

interface EditGroupScreenProps {
    group: any;
    onBack: () => void;
    onGroupUpdated: (updatedGroup: any) => void;
}

const EditGroupScreen = ({ group, onBack, onGroupUpdated }: EditGroupScreenProps) => {
    const insets = useSafeAreaInsets();
    const [name, setName] = useState(group.name || '');
    const [description, setDescription] = useState(group.description || '');
    const [requiresApproval, setRequiresApproval] = useState(group.requires_approval || false);
    const [verifiedMembersOnly, setVerifiedMembersOnly] = useState(group.verified_members_only || false);
    const [registrationNumber, setRegistrationNumber] = useState(group.registration_number || '');
    const [entityType, setEntityType] = useState(group.entity_type || 'ngo');
    const isOrganisation = !!group.registration_number || !!group.entity_type;
    const [loading, setLoading] = useState(false);
    const [coverImage, setCoverImage] = useState<string | null>(group.cover_image || null);
    const [newCoverImage, setNewCoverImage] = useState<any>(null); // For the picked image
    const [removeCover, setRemoveCover] = useState(false);
    const [selectedReviewImage, setSelectedReviewImage] = useState<any>(null);
    const [isReviewingImage, setIsReviewingImage] = useState(false);
    const [requestingVerification, setRequestingVerification] = useState(false);

    const pickCoverImage = async () => {
        Alert.alert(
            'Community Cover',
            'Choose a source for your cover image',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Take Photo', onPress: handleCameraLaunch },
                { text: 'Choose from Gallery', onPress: handleGalleryLaunch },
            ]
        );
    };

    const handleCameraLaunch = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Needed', 'We need permission to use your camera to take a cover photo.');
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            allowsEditing: false,
            quality: 0.8,
        });

        if (!result.canceled && result.assets[0]) {
            setSelectedReviewImage(result.assets[0]);
            setIsReviewingImage(true);
        }
    };

    const handleGalleryLaunch = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Required', 'We need access to your photos to set a cover image.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: false,
            quality: 0.8,
        });

        if (!result.canceled && result.assets[0]) {
            setSelectedReviewImage(result.assets[0]);
            setIsReviewingImage(true);
        }
    };

    const confirmImage = () => {
        if (selectedReviewImage) {
            setCoverImage(selectedReviewImage.uri);
            setNewCoverImage(selectedReviewImage);
            setRemoveCover(false);
            setIsReviewingImage(false);
        }
    };

    const handleRemoveCover = () => {
        setCoverImage(null);
        setNewCoverImage(null);
        setRemoveCover(true);
    };

    const handleSave = async () => {
        if (!name.trim()) {
            Alert.alert('Required Field', 'Community name cannot be empty.');
            return;
        }

        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('name', name.trim());
            formData.append('description', description.trim());
            formData.append('requires_approval', requiresApproval.toString());
            formData.append('verified_members_only', verifiedMembersOnly.toString());

            const isOrganisation = !!group.registration_number || !!group.entity_type;
            if (isOrganisation) {
                formData.append('registration_number', registrationNumber.trim());
                formData.append('entity_type', entityType);
            }

            if (newCoverImage) {
                await appendFileToFormData(formData, 'cover_image', newCoverImage.uri, 'cover.jpg');
            } else if (removeCover) {
                formData.append('cover_image', '');
            }

            const response = await fetchFormData('PATCH', `groups/${group.id}/`, formData);

            Alert.alert('Success', 'Community details have been updated!');
            onGroupUpdated(response.data);
        } catch (error: any) {
            console.error('Error updating group:', error);
            const errorMsg = error.response?.data
                ? JSON.stringify(error.response.data)
                : 'Failed to update community. Please try again.';
            Alert.alert('Error', errorMsg);
        } finally {
            setLoading(false);
        }
    };

    const hasChanges = () => {
        return (
            name.trim() !== (group.name || '') ||
            description.trim() !== (group.description || '') ||
            requiresApproval !== (group.requires_approval || false) ||
            verifiedMembersOnly !== (group.verified_members_only || false) ||
            registrationNumber.trim() !== (group.registration_number || '') ||
            entityType !== (group.entity_type || 'ngo') ||
            newCoverImage !== null ||
            removeCover
        );
    };

    const handleRequestVerification = async () => {
        Alert.alert(
            'Request Group Verification',
            'Submitting a verification request will notify the Komunity team to review your group. This process typically takes 2–5 business days. Continue?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Submit Request',
                    onPress: async () => {
                        setRequestingVerification(true);
                        try {
                            const response = await client.post(`groups/${group.id}/request-verification/`);
                            Alert.alert(
                                'Request Submitted ✅',
                                response.data.message || 'Your verification request has been submitted.'
                            );
                        } catch (error: any) {
                            const msg = error.response?.data?.error || 'Failed to submit verification request.';
                            Alert.alert('Error', msg);
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
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    {/* Cover Image Section */}
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
                        <Text style={styles.label}>{isOrganisation ? 'Organisation Name *' : 'Community Name *'}</Text>
                        <TextInput
                            style={styles.input}
                            placeholder={isOrganisation ? 'e.g. Hope Foundation' : 'e.g. Sunnyvale Neighborhood'}
                            value={name}
                            onChangeText={setName}
                            placeholderTextColor="#9ca3af"
                        />
                    </View>

                    {/* Description */}
                    <View style={styles.formSection}>
                        <Text style={styles.label}>Description</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            placeholder={isOrganisation ? 'What is this organisation about?' : 'What is this community about?'}
                            value={description}
                            onChangeText={setDescription}
                            multiline
                            numberOfLines={5}
                            placeholderTextColor="#9ca3af"
                        />
                    </View>

                    {isOrganisation && (
                        <View style={{ marginBottom: 16 }}>
                            <View style={styles.formSection}>
                                <Text style={styles.label}>Organisation Type *</Text>
                                <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
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
                        </View>
                    )}

                    {/* Requires Approval */}
                    <View style={styles.settingRow}>
                        <View style={styles.settingText}>
                            <Text style={styles.settingLabel}>Require Approval</Text>
                            <Text style={styles.settingDescription}>
                                New members must be approved by an admin before joining.
                            </Text>
                        </View>
                        <Switch
                            value={requiresApproval}
                            onValueChange={setRequiresApproval}
                            trackColor={{ false: '#d1d5db', true: '#93c5fd' }}
                            thumbColor={requiresApproval ? '#2563eb' : '#f4f3f4'}
                        />
                    </View>

                    {/* Verified Members Only */}
                    <View style={styles.settingRow}>
                        <View style={styles.settingText}>
                            <Text style={styles.settingLabel}>Verified Members Only 🛡️</Text>
                            <Text style={styles.settingDescription}>
                                Only allow verified user profiles to join this community.
                            </Text>
                        </View>
                        <Switch
                            value={verifiedMembersOnly}
                            onValueChange={setVerifiedMembersOnly}
                            trackColor={{ false: '#d1d5db', true: '#93c5fd' }}
                            thumbColor={verifiedMembersOnly ? '#2563eb' : '#f4f3f4'}
                        />
                    </View>

                    {/* Group Verification Status */}
                    <View style={[
                        styles.infoBox,
                        group.is_verified
                            ? { backgroundColor: '#f0fdf4', borderColor: '#6ee7b7', borderWidth: 1 }
                            : { backgroundColor: '#fffbeb', borderColor: '#fde68a', borderWidth: 1 }
                    ]}>
                        <Text style={[styles.infoText, { fontWeight: '700', marginBottom: 4, color: group.is_verified ? '#065f46' : '#92400e' }]}>
                            {group.is_verified ? '✅ This community is Verified' : '⚠️ This community is not yet verified'}
                        </Text>
                        <Text style={[styles.infoText, { color: group.is_verified ? '#14532d' : '#78350f' }]}>
                            {group.is_verified
                                ? 'Your group has been officially verified by the Komunity team. A ✅ badge is shown on your community profile.'
                                : 'Verified groups receive a trust badge and are eligible to run Emergency Fundraiser campaigns. Tap below to apply.'}
                        </Text>
                        {!group.is_verified && (
                            <TouchableOpacity
                                style={styles.verificationRequestBtn}
                                onPress={handleRequestVerification}
                                disabled={requestingVerification}
                            >
                                {requestingVerification ? (
                                    <ActivityIndicator color="#ffffff" size="small" />
                                ) : (
                                    <Text style={styles.verificationRequestBtnText}>Request Verification →</Text>
                                )}
                            </TouchableOpacity>
                        )}
                    </View>

                    <View style={styles.infoBox}>
                        <Text style={styles.infoText}>
                            ✏️ Changes will be visible to all community members immediately after saving.
                        </Text>
                    </View>
                </ScrollView>

                <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
                    <TouchableOpacity
                        style={[
                            styles.saveButton,
                            (loading || !hasChanges()) && styles.buttonDisabled
                        ]}
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

            {/* Internal Image Review Modal */}
            <Modal
                visible={isReviewingImage}
                transparent={false}
                animationType="slide"
            >
                <SafeAreaView style={styles.reviewContainer}>
                    <View style={styles.reviewHeader}>
                        <Text style={styles.reviewTitle}>Preview Cover Image</Text>
                        <Text style={styles.reviewSubtitle}>This is how your community cover will look (16:9)</Text>
                    </View>

                    <View style={styles.reviewContent}>
                        <View style={styles.reviewFrame}>
                            {selectedReviewImage && (
                                <Image
                                    source={{ uri: selectedReviewImage.uri }}
                                    style={styles.reviewImage}
                                    resizeMode="cover"
                                />
                            )}
                        </View>
                    </View>

                    <View style={styles.reviewFooter}>
                        <TouchableOpacity
                            style={styles.reviewConfirmBtn}
                            onPress={confirmImage}
                        >
                            <Text style={styles.reviewConfirmText}>Use This Image</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.reviewCancelBtn}
                            onPress={() => setIsReviewingImage(false)}
                        >
                            <Text style={styles.reviewCancelText}>Pick Another</Text>
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#ffffff',
    },
    scrollContent: {
        padding: 24,
    },
    // Cover Image
    coverSection: {
        marginBottom: 24,
    },
    coverPicker: {
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: '#e5e7eb',
        borderStyle: 'dashed',
    },
    coverPreview: {
        width: '100%',
        height: 180,
        borderRadius: 14,
    },
    coverPlaceholder: {
        width: '100%',
        height: 180,
        backgroundColor: '#f9fafb',
        justifyContent: 'center',
        alignItems: 'center',
    },
    coverPlaceholderIcon: {
        fontSize: 36,
        marginBottom: 8,
    },
    coverPlaceholderText: {
        fontSize: 14,
        color: '#9ca3af',
        fontWeight: '500',
    },
    coverActions: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 12,
        marginTop: 10,
    },
    changeCoverBtn: {
        paddingVertical: 8,
        paddingHorizontal: 20,
        backgroundColor: '#eff6ff',
        borderRadius: 8,
    },
    changeCoverText: {
        color: '#2563eb',
        fontWeight: '600',
        fontSize: 14,
    },
    removeCoverBtn: {
        paddingVertical: 8,
        paddingHorizontal: 20,
        backgroundColor: '#fef2f2',
        borderRadius: 8,
    },
    removeCoverText: {
        color: '#ef4444',
        fontWeight: '600',
        fontSize: 14,
    },
    // Form
    formSection: {
        marginBottom: 24,
    },
    label: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#374151',
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#f9fafb',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        color: '#111827',
    },
    textArea: {
        height: 130,
        textAlignVertical: 'top',
    },
    settingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#f9fafb',
        padding: 16,
        borderRadius: 12,
        marginBottom: 24,
    },
    settingText: {
        flex: 1,
        marginRight: 16,
    },
    settingLabel: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#111827',
    },
    settingDescription: {
        fontSize: 14,
        color: '#6b7280',
        marginTop: 2,
    },
    infoBox: {
        backgroundColor: '#eff6ff',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#dbeafe',
    },
    infoText: {
        fontSize: 14,
        color: '#1e40af',
        lineHeight: 20,
    },
    // Footer
    footer: {
        padding: 24,
        borderTopWidth: 1,
        borderTopColor: '#f3f4f6',
    },
    saveButton: {
        backgroundColor: '#2563eb',
        borderRadius: 12,
        padding: 18,
        alignItems: 'center',
        marginBottom: 12,
        shadowColor: '#2563eb',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    buttonDisabled: {
        backgroundColor: '#93c5fd',
        shadowOpacity: 0,
        elevation: 0,
    },
    saveButtonText: {
        color: '#ffffff',
        fontWeight: 'bold',
        fontSize: 18,
    },
    cancelButton: {
        padding: 12,
        alignItems: 'center',
    },
    cancelButtonText: {
        color: '#6b7280',
        fontSize: 16,
        fontWeight: '500',
    },
    // Review Modal Styles
    reviewContainer: {
        flex: 1,
        backgroundColor: '#ffffff',
    },
    reviewHeader: {
        padding: 24,
        alignItems: 'center',
    },
    reviewTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#111827',
    },
    reviewSubtitle: {
        fontSize: 14,
        color: '#6b7280',
        marginTop: 4,
        textAlign: 'center',
    },
    reviewContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f9fafb',
    },
    reviewFrame: {
        width: '90%',
        aspectRatio: 16 / 9,
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: '#e5e7eb',
        borderWidth: 2,
        borderColor: '#ffffff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 8,
    },
    reviewImage: {
        width: '100%',
        height: '100%',
    },
    reviewFooter: {
        padding: 24,
        gap: 12,
    },
    reviewConfirmBtn: {
        backgroundColor: '#2563eb',
        paddingVertical: 18,
        borderRadius: 12,
        alignItems: 'center',
    },
    reviewConfirmText: {
        color: '#ffffff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    reviewCancelBtn: {
        paddingVertical: 12,
        alignItems: 'center',
    },
    reviewCancelText: {
        color: '#6b7280',
        fontWeight: '600',
        fontSize: 14,
    },
    verificationRequestBtn: {
        backgroundColor: '#2563eb',
        borderRadius: 10,
        paddingVertical: 12,
        alignItems: 'center',
        marginTop: 12,
    },
    verificationRequestBtnText: {
        color: '#ffffff',
        fontWeight: 'bold',
        fontSize: 14,
    },
    entityPill: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        backgroundColor: '#f9fafb',
        marginBottom: 8,
        marginRight: 6,
    },
    entityPillActive: {
        backgroundColor: '#eff6ff',
        borderColor: '#2563eb',
    },
    entityPillText: {
        fontSize: 13,
        color: '#475569',
        fontWeight: '500',
        fontFamily: 'Outfit-Regular',
    },
    entityPillTextActive: {
        color: '#2563eb',
        fontWeight: '700',
    },
});

export default EditGroupScreen;
