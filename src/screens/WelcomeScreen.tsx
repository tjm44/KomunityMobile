import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, ScrollView } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

interface WelcomeProps {
    onShowLogin: () => void;
    onShowSignUp: () => void;
}

const WelcomeScreen = ({ onShowLogin, onShowSignUp }: WelcomeProps) => {
    const insets = useSafeAreaInsets();

    const handlePressLogin = async () => {
        try {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        } catch (e) {
            // Haptics fallback
        }
        onShowLogin();
    };

    const handlePressSignUp = async () => {
        try {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        } catch (e) {
            // Haptics fallback
        }
        onShowSignUp();
    };

    return (
        <LinearGradient
            colors={['#bfdbfe', '#f1f5f9', '#ffffff']}
            style={styles.container}
        >
            <SafeAreaView style={{ flex: 1 }}>
                <ScrollView
                    contentContainerStyle={[
                        styles.scrollContent,
                        { paddingBottom: Math.max(insets.bottom + 36, 56) }
                    ]}
                    showsVerticalScrollIndicator={false}
                    bounces={false}
                >
                    {/* Logo Header */}
                    <View style={styles.headerContainer}>
                        <Image
                            source={require('../../assets/icon.png')}
                            style={styles.logoImage}
                            contentFit="contain"
                            transition={300}
                        />
                    </View>

                    {/* Value Props Grid */}
                    <View style={styles.featuresContainer}>
                        {/* Feature 1 */}
                        <View style={styles.featureRow}>
                            <View style={styles.featureIconContainer}>
                                <Feather name="users" size={22} color="#2563eb" />
                            </View>
                            <View style={styles.featureTextContainer}>
                                <Text style={styles.featureTitle}>Democratic Group Wallets</Text>
                                <Text style={styles.featureDescription}>
                                    Audit trails & collaborative controls for saving groups, Stokvels, and Chamas.
                                </Text>
                            </View>
                        </View>

                        {/* Feature 2 */}
                        <View style={styles.featureRow}>
                            <View style={styles.featureIconContainer}>
                                <Feather name="zap" size={22} color="#10b981" />
                            </View>
                            <View style={styles.featureTextContainer}>
                                <Text style={styles.featureTitle}>Automated Bereavement</Text>
                                <Text style={styles.featureDescription}>
                                    Launch instant emergency support campaigns and release payout reserves in seconds.
                                </Text>
                            </View>
                        </View>

                        {/* Feature 3 */}
                        <View style={styles.featureRow}>
                            <View style={styles.featureIconContainer}>
                                <Feather name="shield" size={22} color="#2563eb" />
                            </View>
                            <View style={styles.featureTextContainer}>
                                <Text style={styles.featureTitle}>Biometric Payout Security</Text>
                                <Text style={styles.featureDescription}>
                                    Funds are secured with device-level FaceID / Fingerprint locked verification.
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Action CTAs */}
                    <View style={styles.actionsContainer}>
                        <TouchableOpacity
                            id="welcome-signup-button"
                            style={styles.primaryButton}
                            onPress={handlePressSignUp}
                            activeOpacity={0.85}
                        >
                            <Text style={styles.primaryButtonText}>Get Started</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            id="welcome-login-button"
                            style={styles.secondaryButton}
                            onPress={handlePressLogin}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.secondaryButtonText}>
                                Already have an account? <Text style={styles.loginLinkBold}>Sign In</Text>
                            </Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </SafeAreaView>
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'space-between',
        paddingHorizontal: 28,
        paddingTop: 12,
    },
    headerContainer: {
        alignItems: 'center',
        marginTop: 10,
    },
    logoImage: {
        width: 140,
        height: 140,
        marginBottom: 4,
        borderRadius: 35,
    },
    featuresContainer: {
        marginVertical: 16,
    },
    featureRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    featureIconContainer: {
        width: 46,
        height: 46,
        borderRadius: 14,
        backgroundColor: '#eff6ff',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
        borderWidth: 1,
        borderColor: '#dbeafe',
    },
    featureTextContainer: {
        flex: 1,
    },
    featureTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 2,
    },
    featureDescription: {
        fontSize: 13,
        color: '#6b7280',
        lineHeight: 18,
    },
    actionsContainer: {
        marginTop: 12,
    },
    primaryButton: {
        backgroundColor: '#2563eb',
        padding: 16,
        borderRadius: 14,
        alignItems: 'center',
        elevation: 3,
        shadowColor: '#2563eb',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
        marginBottom: 12,
    },
    primaryButtonText: {
        color: '#ffffff',
        fontWeight: 'bold',
        fontSize: 17,
    },
    secondaryButton: {
        padding: 12,
        alignItems: 'center',
    },
    secondaryButtonText: {
        color: '#4b5563',
        fontSize: 15,
        fontWeight: '500',
    },
    loginLinkBold: {
        color: '#2563eb',
        fontWeight: 'bold',
    },
});

export default WelcomeScreen;
