import React, { useState, useRef } from 'react';
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity,
    ScrollView, Alert, KeyboardAvoidingView,
    Platform, ActivityIndicator, Pressable, Image, Modal
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import client, { fetchFormData, appendFileToFormData } from '../api/client';

import { validatePhone, validateName, validateDateOfBirth, validateEmail } from '../utils/validation';

interface ProfileSetupProps {
    onComplete: () => void;
}

const ProfileSetupScreen = ({ onComplete }: ProfileSetupProps) => {
    const insets = useSafeAreaInsets();
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
    const [loading, setLoading] = useState(false);
    const [userEmail, setUserEmail] = useState('');
    const scrollViewRef = useRef<ScrollView>(null);

    React.useEffect(() => {
        const fetchUserEmail = async () => {
            try {
                const response = await client.get('users/me/');
                setUserEmail(response.data.email);
            } catch (error) {
                console.error('Error fetching email for setup:', error);
            }
        };
        fetchUserEmail();
    }, []);

    const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
    const [isReviewingImage, setIsReviewingImage] = useState(false);

    // Error states
    const [errors, setErrors] = useState<{ [key: string]: string | null }>({});

    const onDateChange = (event: any, selectedDate?: Date) => {
        setShowDatePicker(false);
        if (selectedDate) {
            setDob(selectedDate);
        }
    };

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    };

    const pickImage = async () => {
        Alert.alert(
            'Profile Picture',
            'Choose a source for your profile photo',
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
            Alert.alert('Permission Needed', 'We need permission to use your camera to take a profile picture.');
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
            Alert.alert('Permission Needed', 'We need permission to access your gallery to set a profile picture.');
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
            // Auto scroll to move forward
            setTimeout(() => {
                scrollViewRef.current?.scrollTo({ y: 300, animated: true });
            }, 100);
        }
    };

    const handleSaveProfile = async () => {
        const newErrors: { [key: string]: string | null } = {
            email: validateEmail(userEmail),
            firstName: validateName(firstName, 'First Name'),
            surname: validateName(surname, 'Surname'),
            phone: validatePhone(phone),
            dob: validateDateOfBirth(dob),
        };

        setErrors(newErrors);

        const hasErrors = Object.values(newErrors).some(error => error !== null);
        if (hasErrors) {
            Alert.alert('Invalid Input', 'Please correct the errors in the form.');
            return;
        }

        setLoading(true);
        try {
            // First, get the current user's profile ID
            const meResponse = await client.get('profiles/me/');
            const profileId = meResponse.data.id;

            // Updated profile
            const formData = new FormData();
            formData.append('email', userEmail.trim());
            formData.append('first_name', firstName.trim());
            formData.append('surname', surname.trim());
            formData.append('phone', phone.trim());
            if (dob) formData.append('date_of_birth', dob.toISOString().split('T')[0]);
            formData.append('cultural_background', culturalBackground.trim());
            formData.append('religious_affiliation', religiousAffiliation.trim());
            formData.append('traditional_names', traditionalNames.trim());
            formData.append('spiritual_beliefs', spiritualBeliefs.trim());
            formData.append('bio', bio.trim());

            if (profilePicture) {
                await appendFileToFormData(formData, 'profile_picture', profilePicture, 'profile.jpg');
            }

            await fetchFormData('PATCH', `profiles/${profileId}/`, formData);


            Alert.alert('Welcome!', 'Your profile has been set up successfully.');
            onComplete();
        } catch (error: any) {
            console.error('Error saving profile:', error);
            Alert.alert('Save Failed', 'We couldn\'t save your profile. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView
                    ref={scrollViewRef}
                    contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
                >
                    <View style={styles.header}>
                        <Text style={styles.title}>Complete Your Profile</Text>
                        <Text style={styles.subtitle}>Tell us a bit about yourself to get started</Text>
                    </View>

                    <View style={styles.form}>
                        <View style={styles.avatarSection}>
                            <TouchableOpacity onPress={pickImage} style={styles.avatarContainer}>
                                {profilePicture ? (
                                    <Image source={{ uri: profilePicture }} style={styles.avatar} />
                                ) : (
                                    <View style={styles.avatarPlaceholder}>
                                        <Text style={styles.avatarLabel}>Add Photo</Text>
                                    </View>
                                )}
                                <View style={styles.editBadge}>
                                    <Text style={styles.editBadgeText}>📷</Text>
                                </View>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={{
                                    marginTop: 10,
                                    paddingHorizontal: 16,
                                    paddingVertical: 8,
                                    backgroundColor: '#eff6ff',
                                    borderRadius: 20,
                                    borderWidth: 1,
                                    borderColor: '#bfdbfe',
                                }}
                                onPress={pickImage}
                                activeOpacity={0.8}
                            >
                                <Text style={{ fontSize: 13, fontWeight: '600', color: '#2563eb' }}>
                                    📷 {profilePicture ? 'Change Profile Photo' : 'Upload Profile Photo'}
                                </Text>
                            </TouchableOpacity>

                            {profilePicture && (
                                <TouchableOpacity
                                    style={styles.photoCompleteBtn}
                                    onPress={() => {
                                        scrollViewRef.current?.scrollTo({ y: 300, animated: true });
                                    }}
                                >
                                    <Text style={styles.photoCompleteText}>Looks Good! Let's Continue ↓</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Account Email</Text>
                            <TextInput
                                style={[styles.input, errors.email && styles.inputError]}
                                placeholder="Email Address"
                                value={userEmail}
                                onChangeText={(text) => {
                                    setUserEmail(text);
                                    if (errors.email) setErrors((prev: any) => ({ ...prev, email: null }));
                                }}
                                autoCapitalize="none"
                                keyboardType="email-address"
                            />
                            {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>First Name *</Text>
                            <TextInput
                                style={[styles.input, errors.firstName && styles.inputError]}
                                placeholder="e.g. John"
                                value={firstName}
                                onChangeText={(text) => {
                                    setFirstName(text);
                                    if (errors.firstName) setErrors((prev: any) => ({ ...prev, firstName: null }));
                                }}
                            />
                            {errors.firstName && <Text style={styles.errorText}>{errors.firstName}</Text>}
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Surname *</Text>
                            <TextInput
                                style={[styles.input, errors.surname && styles.inputError]}
                                placeholder="e.g. Doe"
                                value={surname}
                                onChangeText={(text) => {
                                    setSurname(text);
                                    if (errors.surname) setErrors((prev: any) => ({ ...prev, surname: null }));
                                }}
                            />
                            {errors.surname && <Text style={styles.errorText}>{errors.surname}</Text>}
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Date of Birth</Text>
                            <Pressable
                                style={[styles.input, errors.dob && styles.inputError]}
                                onPress={() => setShowDatePicker(true)}
                            >
                                <Text style={[styles.dateText, !dob && styles.placeholderText]}>
                                    {dob ? formatDate(dob) : "Select your birth date"}
                                </Text>
                            </Pressable>
                            {errors.dob && <Text style={styles.errorText}>{errors.dob}</Text>}
                            {showDatePicker && (
                                <DateTimePicker
                                    value={dob || new Date(2000, 0, 1)}
                                    mode="date"
                                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                    onChange={(event, date) => {
                                        onDateChange(event, date);
                                        if (errors.dob) setErrors((prev: any) => ({ ...prev, dob: null }));
                                    }}
                                    maximumDate={new Date()}
                                />
                            )}
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Phone Number</Text>
                            <TextInput
                                style={[styles.input, errors.phone && styles.inputError]}
                                placeholder="e.g. +1 234 567 8900"
                                value={phone}
                                onChangeText={(text) => {
                                    setPhone(text);
                                    if (errors.phone) setErrors((prev: any) => ({ ...prev, phone: null }));
                                }}
                                keyboardType="phone-pad"
                            />
                            {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
                        </View>

                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Cultural & Religious (Optional)</Text>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Cultural Background</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g. Zulu, Yoruba, etc."
                                value={culturalBackground}
                                onChangeText={setCulturalBackground}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Religious Affiliation</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g. Christian, Muslim, etc."
                                value={religiousAffiliation}
                                onChangeText={setReligiousAffiliation}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Traditional/Clan Names</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Names used in your tradition"
                                value={traditionalNames}
                                onChangeText={setTraditionalNames}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Spiritual Beliefs</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Any specific beliefs or practices"
                                value={spiritualBeliefs}
                                onChangeText={setSpiritualBeliefs}
                            />
                        </View>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Bio</Text>
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                placeholder="A short bio about yourself..."
                                value={bio}
                                onChangeText={setBio}
                                multiline
                                numberOfLines={4}
                            />
                        </View>
                    </View>
                </ScrollView>

                <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
                    <TouchableOpacity
                        style={[styles.button, loading && styles.buttonDisabled]}
                        onPress={handleSaveProfile}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#ffffff" />
                        ) : (
                            <Text style={styles.buttonText}>Get Started</Text>
                        )}
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
                        <Text style={styles.reviewTitle}>Preview Photo</Text>
                        <Text style={styles.reviewSubtitle}>This is how your profile will look</Text>
                    </View>

                    <View style={styles.reviewContent}>
                        <View style={styles.reviewFrame}>
                            {selectedImageUri && (
                                <Image
                                    source={{ uri: selectedImageUri }}
                                    style={styles.reviewImage}
                                    resizeMode="cover"
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
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#ffffff',
    },
    scrollContent: {
        flexGrow: 1,
        padding: 24,
    },
    header: {
        marginBottom: 32,
        marginTop: 20,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#6b7280',
    },
    form: {
        flex: 1,
    },
    avatarSection: {
        alignItems: 'center',
        marginBottom: 32,
    },
    avatarContainer: {
        position: 'relative',
    },
    avatar: {
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 4,
        borderColor: '#f3f4f6',
    },
    avatarPlaceholder: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#f3f4f6',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#e5e7eb',
        borderStyle: 'dashed',
    },
    avatarLabel: {
        fontSize: 14,
        color: '#6b7280',
        fontWeight: '600',
    },
    editBadge: {
        position: 'absolute',
        bottom: 4,
        right: 4,
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
        fontSize: 20,
        fontWeight: 'bold',
        marginTop: -2,
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 8,
    },
    sectionHeader: {
        marginTop: 12,
        marginBottom: 16,
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#2563eb',
    },
    input: {
        backgroundColor: '#f9fafb',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 12,
        padding: 14,
        fontSize: 16,
        color: '#111827',
        justifyContent: 'center',
    },
    inputError: {
        borderColor: '#ef4444',
        backgroundColor: '#fef2f2',
    },
    readOnlyInput: {
        backgroundColor: '#f1f5f9',
        color: '#64748b',
    },
    errorText: {
        color: '#ef4444',
        fontSize: 12,
        marginTop: 4,
        marginLeft: 4,
        fontWeight: '500',
    },
    dateText: {
        fontSize: 16,
        color: '#111827',
    },
    placeholderText: {
        color: '#9ca3af',
    },
    textArea: {
        height: 120,
        textAlignVertical: 'top',
    },
    button: {
        backgroundColor: '#2563eb',
        borderRadius: 12,
        padding: 18,
        alignItems: 'center',
        marginTop: 12,
        shadowColor: '#2563eb',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 2,
    },
    buttonDisabled: {
        backgroundColor: '#93c5fd',
    },
    buttonText: {
        color: '#ffffff',
        fontWeight: 'bold',
        fontSize: 18,
    },
    photoCompleteBtn: {
        marginTop: 20,
        backgroundColor: '#2563eb',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 25,
        shadowColor: '#2563eb',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    photoCompleteText: {
        color: '#ffffff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    footer: {
        padding: 24,
        borderTopWidth: 1,
        borderTopColor: '#f3f4f6',
        backgroundColor: '#ffffff',
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
        width: 300,
        height: 300,
        borderRadius: 150,
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
        borderRadius: 150,
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
});

export default ProfileSetupScreen;
