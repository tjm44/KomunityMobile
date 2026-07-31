import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, Alert, TextInput, Pressable, Platform, Modal
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import client, { fetchFormData, appendFileToFormData, getMediaUrl } from '../api/client';


interface Profile {
    id: number;
    email: string;
    profile?: {
        id: number;
        first_name: string;
        surname: string;
        phone: string;
        date_of_birth: string | null;
        cultural_background: string;
        religious_affiliation: string;
        traditional_names: string;
        spiritual_beliefs: string;
        bio: string;
        profile_picture: string | null;
        full_name: string;
        active_role: string | null;
        is_verified?: boolean;
    };
    active_role?: string | null;
}

interface Organisation {
    id: number;
    name: string;
    description: string;
    cover_image: string | null;
    is_verified: boolean;
    entity_type: string;
    registration_number: string;
}

interface ProfileScreenProps {
    onBack: () => void;
    onLogout: () => void;
    onProfileUpdate?: () => void;
    onViewOrganisationDetails?: (organisation: Organisation) => void;
    autoShowKyc?: boolean;
}

const ProfileScreen = ({ onBack, onLogout, onProfileUpdate, onViewOrganisationDetails, autoShowKyc }: ProfileScreenProps) => {
    const insets = useSafeAreaInsets();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [organisations, setOrganisations] = useState<Organisation[]>([]);
    const [orgsLoading, setOrgsLoading] = useState(true);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [showMenu, setShowMenu] = useState(false);

    useEffect(() => {
        if (autoShowKyc) {
            setShowKycModal(true);
        }
    }, [autoShowKyc]);

    const showAlert = (title: string, message: string) => {
        if (Platform.OS === 'web') {
            window.alert(`${title}: ${message}`);
        } else {
            Alert.alert(title, message);
        }
    };

    // Editable fields
    const [firstName, setFirstName] = useState('');
    const [surname, setSurname] = useState('');
    const [phone, setPhone] = useState('');
    const [dob, setDob] = useState<Date | null>(null);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [culturalBackground, setCulturalBackground] = useState('');
    const [religiousAffiliation, setReligiousAffiliation] = useState('');
    const [traditionalNames, setTraditionalNames] = useState('');
    const [spiritualBeliefs, setSpiritualBeliefs] = useState('');
    const [bio, setBio] = useState('');
    const [profilePicture, setProfilePicture] = useState<string | null>(null);
    const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
    const [isReviewingImage, setIsReviewingImage] = useState(false);
    
    // KYC states
    const [showKycModal, setShowKycModal] = useState(false);
    const [idNumber, setIdNumber] = useState('');
    const [idType, setIdType] = useState('national_id');
    const [kycLoading, setKycLoading] = useState(false);

    const fetchProfile = React.useCallback(async () => {
        try {
            const response = await client.get('users/me/');
            const data = response.data as Profile;
            setProfile(data);

            // Initialize editable fields
            setFirstName(data.profile?.first_name || '');
            setSurname(data.profile?.surname || '');
            setPhone(data.profile?.phone || '');

            if (data.profile?.date_of_birth) {
                setDob(new Date(data.profile.date_of_birth));
            } else {
                setDob(null);
            }

            setCulturalBackground(data.profile?.cultural_background || '');
            setReligiousAffiliation(data.profile?.religious_affiliation || '');
            setTraditionalNames(data.profile?.traditional_names || '');
            setSpiritualBeliefs(data.profile?.spiritual_beliefs || '');
            setBio(data.profile?.bio || '');
            setProfilePicture(null); // Reset local selection
        } catch (error) {
            console.error('Error fetching profile:', error);
            showAlert('Error', 'Failed to load profile');
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchOrganisations = React.useCallback(async () => {
        setOrgsLoading(true);
        try {
            const response = await client.get('organisations/mine/');
            setOrganisations(response.data);
        } catch (error) {
            console.error('Error fetching user organisations:', error);
        } finally {
            setOrgsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchProfile();
        fetchOrganisations();
    }, [fetchProfile, fetchOrganisations]);

    const pickImage = async () => {
        if (!isEditing) {
            setIsEditing(true);
        }
        if (Platform.OS === 'web') {
            handleGalleryLaunch();
        } else {
            Alert.alert(
                'Profile Picture',
                'Choose a source for your profile photo',
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Take Photo', onPress: handleCameraLaunch },
                    { text: 'Choose from Gallery', onPress: handleGalleryLaunch },
                ]
            );
        }
    };

    const handleCameraLaunch = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            showAlert('Permission Needed', 'We need permission to use your camera to change your profile picture.');
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            allowsEditing: false,
            quality: 0.8,
        });

        if (!result.canceled && result.assets[0]) {
            setSelectedImageUri(result.assets[0].uri);
            setIsReviewingImage(true);
        }
    };

    const handleGalleryLaunch = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            showAlert('Permission Needed', 'We need permission to access your gallery to change your profile picture.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: false,
            quality: 0.8,
        });

        if (!result.canceled && result.assets[0]) {
            setSelectedImageUri(result.assets[0].uri);
            setIsReviewingImage(true);
        }
    };

    const confirmImage = () => {
        if (selectedImageUri) {
            setProfilePicture(selectedImageUri);
            setIsReviewingImage(false);
        }
    };

    const handleSave = async () => {
        if (!profile?.profile?.id) return;

        setIsSaving(true);
        try {
            const formData = new FormData();
            formData.append('first_name', firstName);
            formData.append('surname', surname);
            formData.append('phone', phone);
            if (dob) formData.append('date_of_birth', dob.toISOString().split('T')[0]);
            formData.append('cultural_background', culturalBackground);
            formData.append('religious_affiliation', religiousAffiliation);
            formData.append('traditional_names', traditionalNames);
            formData.append('spiritual_beliefs', spiritualBeliefs);
            formData.append('bio', bio);

            if (profilePicture) {
                await appendFileToFormData(formData, 'profile_picture', profilePicture, 'profile.jpg');
            }

            await fetchFormData('PATCH', `profiles/${profile.profile.id}/`, formData);


            showAlert('Success', 'Profile updated successfully');
            setIsEditing(false);
            fetchProfile(); // Refresh local data
            onProfileUpdate?.(); // Refresh global data (like nav bar)
        } catch (error: any) {
            console.error('Error saving profile:', error);
            const errorMsg = error.response?.data ? JSON.stringify(error.response.data) : 'Failed to update profile';
            showAlert('Error', errorMsg);
        } finally {
            setIsSaving(false);
        }
    };

    const handleKycVerify = async () => {
        if (!profile?.profile?.id) return;
        if (!idNumber.trim()) {
            showAlert('Validation Error', 'ID Number is required.');
            return;
        }

        setKycLoading(true);
        try {
            const response = await client.post(`profiles/${profile.profile.id}/verify-kyc/`, {
                id_number: idNumber.trim(),
                id_type: idType
            });
            showAlert('Verification Successful', response.data.message || 'Your identity has been verified.');
            setShowKycModal(false);
            setIdNumber('');
            fetchProfile();
            onProfileUpdate?.();
        } catch (error: any) {
            console.error('KYC Verification error:', error);
            const errorMsg = error.response?.data?.error || 'Verification failed. Please try again.';
            showAlert('Verification Failed', errorMsg);
        } finally {
            setKycLoading(false);
        }
    };

    const handleLogout = () => {
        if (Platform.OS === 'web') {
            const confirmed = window.confirm('Are you sure you want to logout?');
            if (confirmed) {
                console.log('ProfileScreen: Logout confirmed (web)');
                onLogout();
            }
        } else {
            Alert.alert(
                'Logout',
                'Are you sure you want to logout?',
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Logout',
                        style: 'destructive',
                        onPress: () => {
                            console.log('ProfileScreen: Logout confirmed');
                            onLogout();
                        }
                    }
                ]
            );
        }
    };

    const onDateChange = (event: any, selectedDate?: Date) => {
        setShowDatePicker(false);
        if (selectedDate) {
            setDob(selectedDate);
        }
    };

    const formatDateDisplay = (date: Date) => {
        return date.toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
                <ActivityIndicator size="large" color="#2563eb" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={[styles.header, { paddingTop: insets.top }]}>
                <TouchableOpacity onPress={onBack} style={styles.backButton}>
                    <Text style={styles.backButtonText}>←</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Profile</Text>
                {!isEditing ? (
                    <TouchableOpacity onPress={() => setShowMenu(true)} style={styles.menuButton}>
                        <Text style={styles.menuButtonText}>⋮</Text>
                    </TouchableOpacity>
                ) : (
                    <View style={{ width: 40 }} />
                )}
            </View>

            <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: isEditing ? 180 : 40 }}>
                {/* Profile Header */}
                <View style={styles.profileHeader}>
                    <TouchableOpacity
                        style={styles.avatarContainer}
                        onPress={pickImage}
                        activeOpacity={0.8}
                    >
                        {profilePicture ? (
                            <Image
                                source={{ uri: profilePicture }}
                                style={styles.avatar}
                                transition={200}
                            />
                        ) : profile?.profile?.profile_picture ? (
                            <Image
                                source={{ uri: getMediaUrl(profile.profile.profile_picture) }}
                                style={styles.avatar}
                                transition={200}
                            />
                        ) : (
                            <View style={styles.avatarPlaceholder}>
                                <Text style={styles.avatarText}>
                                    {profile?.profile?.full_name?.[0]?.toUpperCase() || profile?.email?.[0]?.toUpperCase() || '?'}
                                </Text>
                            </View>
                        )}
                        <View style={styles.editBadge}>
                            <Text style={styles.editBadgeText}>📷</Text>
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.changePhotoButton}
                        onPress={pickImage}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.changePhotoButtonText}>📷 Change Profile Photo</Text>
                    </TouchableOpacity>
                    <Text style={styles.profileName}>
                        {isEditing ? `${firstName} ${surname}`.trim() || 'New User' : profile?.profile?.full_name || 'No name set'}
                    </Text>
                    <Text style={styles.profileEmail}>{profile?.email}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                        {profile?.profile?.is_verified ? (
                            <View style={[styles.roleBadge, { backgroundColor: '#d1fae5' }]}>
                                <Text style={[styles.roleText, { color: '#065f46' }]}>🛡️ VERIFIED</Text>
                            </View>
                        ) : (
                            <View style={[styles.roleBadge, { backgroundColor: '#fee2e2' }]}>
                                <Text style={[styles.roleText, { color: '#dc2626' }]}>⚠️ UNVERIFIED</Text>
                            </View>
                        )}
                        {profile?.profile?.active_role && (
                            <View style={styles.roleBadge}>
                                <Text style={styles.roleText}>{profile.profile.active_role.toUpperCase()}</Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* Profile Details */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Personal Information</Text>

                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>First Name</Text>
                        {isEditing ? (
                            <TextInput
                                style={styles.editInput}
                                value={firstName}
                                onChangeText={setFirstName}
                                placeholder="First Name"
                            />
                        ) : (
                            <Text style={styles.infoValue}>
                                {profile?.profile?.first_name || 'Not set'}
                            </Text>
                        )}
                    </View>

                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Surname</Text>
                        {isEditing ? (
                            <TextInput
                                style={styles.editInput}
                                value={surname}
                                onChangeText={setSurname}
                                placeholder="Surname"
                            />
                        ) : (
                            <Text style={styles.infoValue}>
                                {profile?.profile?.surname || 'Not set'}
                            </Text>
                        )}
                    </View>

                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Email</Text>
                        <Text style={[styles.infoValue, isEditing && styles.readOnlyText]}>
                            {profile?.email}
                        </Text>
                    </View>

                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Phone</Text>
                        {isEditing ? (
                            <TextInput
                                style={styles.editInput}
                                value={phone}
                                onChangeText={setPhone}
                                placeholder="Phone"
                                keyboardType="phone-pad"
                            />
                        ) : (
                            <Text style={styles.infoValue}>
                                {profile?.profile?.phone || 'Not set'}
                            </Text>
                        )}
                    </View>

                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Date of Birth</Text>
                        {isEditing ? (
                            <Pressable
                                style={styles.datePickerButton}
                                onPress={() => setShowDatePicker(true)}
                            >
                                <Text style={styles.editInput}>
                                    {dob ? formatDateDisplay(dob) : 'Select Date'}
                                </Text>
                            </Pressable>
                        ) : (
                            <Text style={styles.infoValue}>
                                {dob ? formatDateDisplay(dob) : 'Not set'}
                            </Text>
                        )}
                        {showDatePicker && (
                            <DateTimePicker
                                value={dob || new Date(2000, 0, 1)}
                                mode="date"
                                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                onChange={onDateChange}
                                maximumDate={new Date()}
                            />
                        )}
                    </View>
                </View>

                {/* Cultural Information */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Cultural & Religious</Text>

                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Cultural Background</Text>
                        {isEditing ? (
                            <TextInput
                                style={styles.editInput}
                                value={culturalBackground}
                                onChangeText={setCulturalBackground}
                                placeholder="Cultural Background"
                            />
                        ) : (
                            <Text style={styles.infoValue}>
                                {profile?.profile?.cultural_background || 'Not set'}
                            </Text>
                        )}
                    </View>

                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Religious Affiliation</Text>
                        {isEditing ? (
                            <TextInput
                                style={styles.editInput}
                                value={religiousAffiliation}
                                onChangeText={setReligiousAffiliation}
                                placeholder="Religious Affiliation"
                            />
                        ) : (
                            <Text style={styles.infoValue}>
                                {profile?.profile?.religious_affiliation || 'Not set'}
                            </Text>
                        )}
                    </View>

                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Traditional Names</Text>
                        {isEditing ? (
                            <TextInput
                                style={styles.editInput}
                                value={traditionalNames}
                                onChangeText={setTraditionalNames}
                                placeholder="Traditional Names"
                            />
                        ) : (
                            <Text style={styles.infoValue}>
                                {profile?.profile?.traditional_names || 'Not set'}
                            </Text>
                        )}
                    </View>

                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Spiritual Beliefs</Text>
                        {isEditing ? (
                            <TextInput
                                style={styles.editInput}
                                value={spiritualBeliefs}
                                onChangeText={setSpiritualBeliefs}
                                placeholder="Spiritual Beliefs"
                            />
                        ) : (
                            <Text style={styles.infoValue}>
                                {profile?.profile?.spiritual_beliefs || 'Not set'}
                            </Text>
                        )}
                    </View>
                </View>

                {/* Bio */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>About Me</Text>
                    {isEditing ? (
                        <TextInput
                            style={[styles.editInput, styles.bioInput]}
                            value={bio}
                            onChangeText={setBio}
                            placeholder="Write something about yourself..."
                            multiline
                        />
                    ) : (
                        <Text style={styles.bioText}>{profile?.profile?.bio || 'No bio yet.'}</Text>
                    )}
                </View>

                {organisations.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>My Organisations</Text>
                        {organisations.map((org) => (
                            <TouchableOpacity
                                key={org.id}
                                style={styles.orgCard}
                                onPress={() => onViewOrganisationDetails?.(org)}
                                activeOpacity={0.85}
                            >
                                <View style={styles.orgCardContent}>
                                    <View style={styles.orgMeta}>
                                        <Text style={styles.orgName}>{org.name}</Text>
                                        <Text style={styles.orgSubtitle}>{(org.entity_type || 'Organisation').toUpperCase()}</Text>
                                    </View>
                                    <Text style={styles.feedButtonText}>→</Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}


            </ScrollView>

            {/* Internal Image Review Modal */}
            <Modal
                visible={isReviewingImage}
                transparent={false}
                animationType="slide"
            >
                <SafeAreaView style={styles.reviewContainer}>
                    <View style={styles.reviewHeader}>
                        <Text style={styles.reviewTitle}>Preview Photo</Text>
                        <Text style={styles.reviewSubtitle}>This is how your profile will look</Text>
                    </View>

                    <View style={styles.reviewContent}>
                        <View style={styles.reviewFrame}>
                            {selectedImageUri && (
                                <Image
                                    source={{ uri: selectedImageUri }}
                                    style={styles.reviewImage}
                                    contentFit="cover"
                                />
                            )}
                            <View style={styles.reviewOverlay} />
                        </View>
                    </View>

                    <View style={styles.reviewFooter}>
                        <TouchableOpacity
                            style={styles.reviewConfirmBtn}
                            onPress={confirmImage}
                        >
                            <Text style={styles.reviewConfirmText}>Use This Photo</Text>
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

            {isEditing && (
                <View style={[styles.fixedFooter, { paddingBottom: Math.max(insets.bottom, 20) }]}>
                    <TouchableOpacity
                        style={[styles.actionButton, isSaving && styles.disabledButton]}
                        onPress={handleSave}
                        disabled={isSaving}
                    >
                        {isSaving ? (
                            <ActivityIndicator color="#ffffff" />
                        ) : (
                            <Text style={styles.actionButtonText}>Save Changes</Text>
                        )}
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.actionButton, styles.cancelButton]}
                        onPress={() => setIsEditing(false)}
                        disabled={isSaving}
                    >
                        <Text style={[styles.actionButtonText, styles.cancelText]}>Cancel</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* KYC Verification Modal */}
            <Modal
                visible={showKycModal}
                transparent={true}
                animationType="fade"
            >
                <View style={styles.kycOverlay}>
                    <View style={styles.kycContent}>
                        <Text style={styles.kycTitle}>ID Verification (KYC) 🛡️</Text>
                        <Text style={styles.kycSubtitle}>
                            Identity verification is powered securely by Flutterwave Identity API. Verified members can create organisations and access verified features.
                        </Text>

                        {/* ID Type Selection */}
                        <Text style={styles.kycLabel}>Select Document Type</Text>
                        <View style={styles.kycTypeRow}>
                            <TouchableOpacity
                                style={[styles.kycTypePill, idType === 'national_id' && styles.kycTypePillActive]}
                                onPress={() => setIdType('national_id')}
                            >
                                <Text style={[styles.kycTypePillText, idType === 'national_id' && styles.kycTypePillTextActive]}>
                                    National ID
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.kycTypePill, idType === 'passport' && styles.kycTypePillActive]}
                                onPress={() => setIdType('passport')}
                            >
                                <Text style={[styles.kycTypePillText, idType === 'passport' && styles.kycTypePillTextActive]}>
                                    Passport
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* ID Number */}
                        <Text style={styles.kycLabel}>Document ID Number</Text>
                        <TextInput
                            style={styles.kycInput}
                            placeholder="Enter document ID number..."
                            value={idNumber}
                            onChangeText={setIdNumber}
                            placeholderTextColor="#9ca3af"
                            autoCapitalize="none"
                            autoCorrect={false}
                        />

                        {/* Actions */}
                        <View style={styles.kycActions}>
                            <TouchableOpacity
                                style={[styles.kycButton, styles.kycCancelButton]}
                                onPress={() => {
                                    setShowKycModal(false);
                                    setIdNumber('');
                                }}
                                disabled={kycLoading}
                            >
                                <Text style={styles.kycCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.kycButton, styles.kycVerifyButton]}
                                onPress={handleKycVerify}
                                disabled={kycLoading}
                            >
                                {kycLoading ? (
                                    <ActivityIndicator color="#ffffff" size="small" />
                                ) : (
                                    <Text style={styles.kycVerifyText}>Verify</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Options Menu Modal */}
            <Modal
                visible={showMenu}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowMenu(false)}
            >
                <Pressable style={styles.menuOverlay} onPress={() => setShowMenu(false)}>
                    <View style={[styles.menuDropdown, { top: insets.top + 60 }]}>
                        {!profile?.profile?.is_verified && (
                            <TouchableOpacity
                                style={styles.menuItem}
                                onPress={() => {
                                    setShowMenu(false);
                                    setShowKycModal(true);
                                }}
                            >
                                <Text style={styles.menuItemText}>Verify Profile (KYC) 🛡️</Text>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity
                            style={styles.menuItem}
                            onPress={() => {
                                setShowMenu(false);
                                setIsEditing(true);
                            }}
                        >
                            <Text style={styles.menuItemText}>Edit Profile ✎</Text>
                        </TouchableOpacity>
                        <View style={styles.menuDivider} />
                        <TouchableOpacity
                            style={[styles.menuItem, styles.menuItemLogout]}
                            onPress={() => {
                                setShowMenu(false);
                                handleLogout();
                            }}
                        >
                            <Text style={[styles.menuItemText, styles.menuItemLogoutText]}>Logout ⤶</Text>
                        </TouchableOpacity>
                    </View>
                </Pressable>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f9fafb',
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
        paddingVertical: 16,
        backgroundColor: '#ffffff',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#eff6ff',
        justifyContent: 'center',
        alignItems: 'center',
    },
    backButtonText: {
        fontSize: 24,
        color: '#2563eb',
        fontWeight: 'bold',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#111827',
    },
    content: {
        flex: 1,
    },
    profileHeader: {
        backgroundColor: '#ffffff',
        alignItems: 'center',
        paddingVertical: 32,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    avatarContainer: {
        marginBottom: 16,
        position: 'relative',
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
    },
    avatarPlaceholder: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#eff6ff',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#2563eb',
    },
    avatarText: {
        fontSize: 40,
        fontWeight: 'bold',
        color: '#2563eb',
    },
    editBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: '#2563eb',
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#ffffff',
    },
    editBadgeText: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: 'bold',
    },
    changePhotoButton: {
        marginTop: 10,
        marginBottom: 6,
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: '#eff6ff',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#bfdbfe',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    changePhotoButtonText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#2563eb',
    },
    profileName: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 4,
    },
    profileEmail: {
        fontSize: 14,
        color: '#6b7280',
        marginBottom: 8,
    },
    roleBadge: {
        backgroundColor: '#dbeafe',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 16,
        marginTop: 4,
    },
    roleText: {
        color: '#2563eb',
        fontSize: 12,
        fontWeight: 'bold',
    },
    section: {
        backgroundColor: '#ffffff',
        marginTop: 16,
        paddingHorizontal: 16,
        paddingVertical: 20,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: '#e5e7eb',
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 16,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    infoLabel: {
        fontSize: 14,
        color: '#6b7280',
        fontWeight: '500',
    },
    infoValue: {
        fontSize: 14,
        color: '#111827',
        fontWeight: '600',
        textAlign: 'right',
        flex: 1,
        marginLeft: 16,
    },
    readOnlyText: {
        color: '#6b7280',
        fontWeight: '400',
    },
    bioText: {
        fontSize: 14,
        color: '#374151',
        lineHeight: 20,
    },
    actionButton: {
        backgroundColor: '#2563eb',
        paddingVertical: 14,
        borderRadius: 8,
        alignItems: 'center',
        marginBottom: 12,
    },
    actionButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '600',
    },
    logoutButton: {
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#ef4444',
    },
    logoutText: {
        color: '#ef4444',
    },
    editInput: {
        flex: 1,
        fontSize: 14,
        color: '#111827',
        fontWeight: '600',
        textAlign: 'right',
        marginLeft: 16,
        paddingVertical: 4,
        borderBottomWidth: 1,
        borderBottomColor: '#2563eb',
    },
    bioInput: {
        textAlign: 'left',
        marginLeft: 0,
        marginTop: 8,
        minHeight: 80,
    },
    datePickerButton: {
        flex: 1,
        marginLeft: 16,
    },
    cancelButton: {
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#6b7280',
    },
    cancelText: {
        color: '#6b7280',
    },
    disabledButton: {
        opacity: 0.5,
    },
    headerSaveButton: {
        backgroundColor: '#eff6ff',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    headerSaveText: {
        color: '#2563eb',
        fontWeight: 'bold',
        fontSize: 14,
    },
    fixedFooter: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#ffffff',
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
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
        fontSize: 24,
        fontWeight: 'bold',
        color: '#111827',
    },
    reviewSubtitle: {
        fontSize: 14,
        color: '#6b7280',
        marginTop: 4,
    },
    reviewContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f9fafb',
    },
    reviewFrame: {
        width: 280,
        height: 280,
        borderRadius: 140,
        overflow: 'hidden',
        backgroundColor: '#e5e7eb',
        borderWidth: 4,
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
    reviewOverlay: {
        ...StyleSheet.absoluteFillObject,
        borderWidth: 2,
        borderColor: 'rgba(37, 99, 235, 0.2)',
        borderRadius: 140,
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
    kycOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 24,
    },
    kycContent: {
        backgroundColor: '#ffffff',
        borderRadius: 20,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
        elevation: 10,
    },
    kycTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#111827',
        textAlign: 'center',
        marginBottom: 8,
        fontFamily: 'Outfit-Bold',
    },
    kycSubtitle: {
        fontSize: 14,
        color: '#6b7280',
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 20,
        fontFamily: 'Outfit-Regular',
    },
    kycLabel: {
        fontSize: 14,
        fontWeight: '700',
        color: '#374151',
        marginBottom: 8,
        marginTop: 12,
        fontFamily: 'Outfit-Bold',
    },
    kycTypeRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 12,
    },
    kycTypePill: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 10,
        borderWidth: 1.5,
        borderColor: '#e5e7eb',
        alignItems: 'center',
        backgroundColor: '#f9fafb',
    },
    kycTypePillActive: {
        borderColor: '#2563eb',
        backgroundColor: '#eff6ff',
    },
    kycTypePillText: {
        fontSize: 14,
        color: '#475569',
        fontWeight: '600',
        fontFamily: 'Outfit-Bold',
    },
    kycTypePillTextActive: {
        color: '#2563eb',
    },
    kycInput: {
        backgroundColor: '#f9fafb',
        borderWidth: 1.5,
        borderColor: '#e5e7eb',
        borderRadius: 10,
        padding: 14,
        fontSize: 15,
        color: '#111827',
        marginBottom: 20,
        fontFamily: 'Outfit-Regular',
    },
    kycActions: {
        flexDirection: 'row',
        gap: 12,
    },
    kycButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    kycCancelButton: {
        backgroundColor: '#f3f4f6',
    },
    kycVerifyButton: {
        backgroundColor: '#2563eb',
    },
    kycCancelText: {
        color: '#475569',
        fontWeight: '600',
        fontSize: 15,
        fontFamily: 'Outfit-Bold',
    },
    kycVerifyText: {
        color: '#ffffff',
        fontWeight: 'bold',
        fontSize: 15,
        fontFamily: 'Outfit-Bold',
    },
    menuButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#f3f4f6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    menuButtonText: {
        fontSize: 22,
        color: '#4b5563',
        fontWeight: 'bold',
        marginTop: -4,
    },
    menuOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.15)',
    },
    menuDropdown: {
        position: 'absolute',
        right: 16,
        backgroundColor: '#ffffff',
        borderRadius: 12,
        paddingVertical: 8,
        minWidth: 180,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 5,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    menuItem: {
        paddingVertical: 12,
        paddingHorizontal: 16,
    },
    menuItemText: {
        fontSize: 14,
        color: '#374151',
        fontWeight: '600',
    },
    menuItemLogout: {
        backgroundColor: '#fee2e2',
    },
    menuItemLogoutText: {
        color: '#dc2626',
    },
    menuDivider: {
        height: 1,
        backgroundColor: '#e5e7eb',
        marginVertical: 4,
    },
});

export default ProfileScreen;
