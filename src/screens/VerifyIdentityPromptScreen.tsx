import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity,
    ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import client from '../api/client';
import { colors, gradients } from '../constants/theme';

interface VerifyIdentityPromptScreenProps {
    profileId: number;
    onVerified: () => void;
    onSkip: () => void;
}

const VerifyIdentityPromptScreen = ({
    profileId,
    onVerified,
    onSkip
}: VerifyIdentityPromptScreenProps) => {
    const insets = useSafeAreaInsets();
    const [idNumber, setIdNumber] = useState('');
    const [idType, setIdType] = useState<'national_id' | 'passport'>('national_id');
    const [loading, setLoading] = useState(false);
    const [showVerificationForm, setShowVerificationForm] = useState(false);

    const handleVerifyNow = async () => {
        if (!idNumber.trim()) {
            Alert.alert('Validation Error', 'Please enter your ID/Passport number.');
            return;
        }

        setLoading(true);
        try {
            const response = await client.post(`profiles/${profileId}/verify-kyc/`, {
                id_number: idNumber.trim(),
                id_type: idType
            });
            Alert.alert('Verification Successful', response.data.message || 'Your identity has been verified successfully!');
            onVerified();
        } catch (error: any) {
            console.error('KYC Verification error:', error);
            const errorMsg = error.response?.data?.error || 'Verification failed. Please check details and try again.';
            Alert.alert('Verification Failed', errorMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <ScrollView contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}>
                <LinearGradient
                    colors={[...gradients.screenBackground]}
                    style={styles.headerBadgeContainer}
                >
                    <Text style={styles.badgeEmoji}>🛡️</Text>
                </LinearGradient>

                <Text style={styles.title}>Verify Your Identity</Text>
                <Text style={styles.subtitle}>
                    Verifying your profile helps build a trusted, safe space for the whole community.
                </Text>

                {/* Benefits List */}
                <View style={styles.benefitsContainer}>
                    <View style={styles.benefitItem}>
                        <Text style={styles.benefitIcon}>🤝</Text>
                        <View style={styles.benefitTextContainer}>
                            <Text style={styles.benefitTitle}>Greater Trust & Security</Text>
                            <Text style={styles.benefitDesc}>Verified profiles foster transparency and prevent fraudulent behavior.</Text>
                        </View>
                    </View>
                    <View style={styles.benefitItem}>
                        <Text style={styles.benefitIcon}>🏢</Text>
                        <View style={styles.benefitTextContainer}>
                            <Text style={styles.benefitTitle}>Access to Verified Groups</Text>
                            <Text style={styles.benefitDesc}>Join exclusive, verification-required communities and official groups.</Text>
                        </View>
                    </View>
                    <View style={styles.benefitItem}>
                        <Text style={styles.benefitIcon}>⚡</Text>
                        <View style={styles.benefitTextContainer}>
                            <Text style={styles.benefitTitle}>Additional Features</Text>
                            <Text style={styles.benefitDesc}>Unlock higher wallet limits, instant withdrawals, and organization creation.</Text>
                        </View>
                    </View>
                </View>

                {!showVerificationForm ? (
                    <View style={styles.actionContainer}>
                        <TouchableOpacity
                            style={styles.primaryBtn}
                            onPress={() => setShowVerificationForm(true)}
                        >
                            <Text style={styles.primaryBtnText}>Verify Now</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.secondaryBtn}
                            onPress={onSkip}
                        >
                            <Text style={styles.secondaryBtnText}>Do It Later</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.formContainer}>
                        <Text style={styles.formTitle}>Enter Verification Details</Text>
                        
                        <Text style={styles.label}>Document Type</Text>
                        <View style={styles.tabRow}>
                            <TouchableOpacity
                                style={[styles.tab, idType === 'national_id' && styles.tabActive]}
                                onPress={() => setIdType('national_id')}
                            >
                                <Text style={[styles.tabText, idType === 'national_id' && styles.tabTextActive]}>
                                    National ID
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.tab, idType === 'passport' && styles.tabActive]}
                                onPress={() => setIdType('passport')}
                            >
                                <Text style={[styles.tabText, idType === 'passport' && styles.tabTextActive]}>
                                    Passport
                                </Text>
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.label}>ID / Passport Number</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Enter document number"
                            value={idNumber}
                            onChangeText={setIdNumber}
                            autoCapitalize="characters"
                            autoCorrect={false}
                        />

                        {loading ? (
                            <ActivityIndicator size="large" color="#2563eb" style={{ marginVertical: 20 }} />
                        ) : (
                            <View style={styles.actionContainer}>
                                <TouchableOpacity
                                    style={styles.primaryBtn}
                                    onPress={handleVerifyNow}
                                >
                                    <Text style={styles.primaryBtnText}>Submit & Verify</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.secondaryBtn}
                                    onPress={() => setShowVerificationForm(false)}
                                >
                                    <Text style={styles.secondaryBtnText}>Go Back</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                )}
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.white,
    },
    scrollContent: {
        paddingHorizontal: 24,
        alignItems: 'center',
    },
    headerBadgeContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
        marginTop: 20,
    },
    badgeEmoji: {
        fontSize: 48,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: colors.textPrimary,
        textAlign: 'center',
        marginBottom: 10,
        fontFamily: 'Outfit-Bold',
    },
    subtitle: {
        fontSize: 15,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 30,
        paddingHorizontal: 10,
        fontFamily: 'Outfit-Regular',
    },
    benefitsContainer: {
        width: '100%',
        backgroundColor: colors.background,
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: colors.borderLight,
        marginBottom: 30,
    },
    benefitItem: {
        flexDirection: 'row',
        marginBottom: 16,
    },
    benefitIcon: {
        fontSize: 24,
        marginRight: 16,
        marginTop: 2,
    },
    benefitTextContainer: {
        flex: 1,
    },
    benefitTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: colors.textPrimary,
        marginBottom: 4,
        fontFamily: 'Outfit-Bold',
    },
    benefitDesc: {
        fontSize: 13,
        color: colors.textSecondary,
        lineHeight: 18,
        fontFamily: 'Outfit-Regular',
    },
    actionContainer: {
        width: '100%',
        gap: 12,
    },
    primaryBtn: {
        backgroundColor: colors.primaryLight,
        width: '100%',
        paddingVertical: 15,
        borderRadius: 12,
        alignItems: 'center',
    },
    primaryBtnText: {
        color: colors.white,
        fontSize: 16,
        fontWeight: 'bold',
        fontFamily: 'Outfit-Bold',
    },
    secondaryBtn: {
        backgroundColor: colors.white,
        width: '100%',
        paddingVertical: 15,
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },
    secondaryBtnText: {
        color: colors.textSecondary,
        fontSize: 15,
        fontWeight: '600',
        fontFamily: 'Outfit-Regular',
    },
    formContainer: {
        width: '100%',
        backgroundColor: colors.background,
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: colors.border,
        alignSelf: 'stretch',
    },
    formTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.textPrimary,
        marginBottom: 16,
        textAlign: 'center',
        fontFamily: 'Outfit-Bold',
    },
    label: {
        fontSize: 13,
        fontWeight: '700',
        color: colors.textSecondary,
        marginBottom: 8,
        fontFamily: 'Outfit-Bold',
    },
    tabRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 16,
    },
    tab: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        borderWidth: 1.5,
        borderColor: colors.border,
        alignItems: 'center',
        backgroundColor: colors.white,
    },
    tabActive: {
        borderColor: colors.primaryLight,
        backgroundColor: colors.surfaceLight,
    },
    tabText: {
        fontSize: 14,
        color: colors.textSecondary,
        fontWeight: '600',
    },
    tabTextActive: {
        color: colors.primaryLight,
    },
    input: {
        backgroundColor: colors.white,
        borderWidth: 1.5,
        borderColor: colors.border,
        borderRadius: 8,
        padding: 12,
        fontSize: 15,
        marginBottom: 20,
    },
});

export default VerifyIdentityPromptScreen;
