import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

interface WelcomeProps {
    onShowLogin: () => void;
    onShowSignUp: () => void;
}

const { width } = Dimensions.get('window');

const WelcomeScreen = ({ onShowLogin, onShowSignUp }: WelcomeProps) => {
    const handlePressLogin = async () => {
        try {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        } catch (e) {
            // Haptics might fail in simulator, fallback silently
        }
        onShowLogin();
    };

    const handlePressSignUp = async () => {
        try {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        } catch (e) {
            // Haptics might fail in simulator, fallback silently
        }
        onShowSignUp();
    };

    return (
        <LinearGradient
            colors={['#bfdbfe', '#f1f5f9', '#ffffff']}
            style={styles.container}
        >
            <SafeAreaView style={{ flex: 1 }}>
                <View style={styles.innerContainer}>
                {/* Logo */}
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
                            <Feather name="users" size={24} color="#2563eb" />
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
                            <Feather name="zap" size={24} color="#10b981" />
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
                            <Feather name="shield" size={24} color="#2563eb" />
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
            </View>
        </SafeAreaView>
    </LinearGradient>
);
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    innerContainer: {
        flex: 1,
        justifyContent: 'space-between',
        paddingHorizontal: 28,
        paddingVertical: 32,
    },
    headerContainer: {
        alignItems: 'center',
        marginTop: 40,
    },
    logoImage: {
        width: 220,
        height: 220,
        marginBottom: 8,
        borderRadius: 55,
    },
    brandTitle: {
        fontSize: 44,
        fontWeight: '900',
        color: '#2563eb',
        letterSpacing: -1,
    },
    brandSubtitle: {
        fontSize: 16,
        color: '#6b7280',
        fontWeight: '600',
        marginTop: 6,
    },
    featuresContainer: {
        marginVertical: 40,
    },
    featureRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 28,
    },
    featureIconContainer: {
        width: 52,
        height: 52,
        borderRadius: 16,
        backgroundColor: '#eff6ff',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
        borderWidth: 1,
        borderColor: '#dbeafe',
    },
    featureEmoji: {
        fontSize: 24,
    },
    featureTextContainer: {
        flex: 1,
    },
    featureTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 4,
    },
    featureDescription: {
        fontSize: 14,
        color: '#6b7280',
        lineHeight: 20,
    },
    actionsContainer: {
        marginBottom: 20,
    },
    primaryButton: {
        backgroundColor: '#2563eb',
        padding: 18,
        borderRadius: 14,
        alignItems: 'center',
        elevation: 3,
        shadowColor: '#2563eb',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
        marginBottom: 16,
    },
    primaryButtonText: {
        color: '#ffffff',
        fontWeight: 'bold',
        fontSize: 18,
    },
    secondaryButton: {
        padding: 14,
        alignItems: 'center',
    },
    secondaryButtonText: {
        color: '#6b7280',
        fontSize: 15,
        fontWeight: '500',
    },
    loginLinkBold: {
        color: '#2563eb',
        fontWeight: 'bold',
    },
});

export default WelcomeScreen;
