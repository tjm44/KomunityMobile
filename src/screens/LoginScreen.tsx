import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import client, { setAuthToken, saveToken } from '../api/client';
import { validateEmail } from '../utils/validation';

WebBrowser.maybeCompleteAuthSession();

interface LoginProps {
    onLoginSuccess: () => void;
    onShowSignUp: () => void;
    onForgotPassword: () => void;
    onBack?: () => void;
}

const LoginScreen = ({ onLoginSuccess, onShowSignUp, onForgotPassword, onBack }: LoginProps) => {
    const [email, setEmail] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [isPasswordVisible, setIsPasswordVisible] = React.useState(false);
    const [loading, setLoading] = React.useState(false);
    const [errors, setErrors] = React.useState<{ [key: string]: string | null }>({});

    const handleLogin = async () => {
        const newErrors: { [key: string]: string | null } = {
            email: validateEmail(email),
            password: !password ? 'Password is required' : null,
        };

        setErrors(newErrors);

        const hasErrors = Object.values(newErrors).some(error => error !== null);
        if (hasErrors) return;

        setLoading(true);
        try {
            const response = await client.post('auth-token/', {
                email: email.trim(),
                password: password,
            });

            const token = response.data.token;
            setAuthToken(token);
            await saveToken(token);
            onLoginSuccess();
        } catch (error: any) {
            console.error(error);
            const errorData = error.response?.data;
            let errorMessage = 'Unable to connect to server';

            if (errorData) {
                if (errorData.non_field_errors) {
                    errorMessage = errorData.non_field_errors[0];
                } else if (typeof errorData === 'object') {
                    const firstField = Object.keys(errorData)[0];
                    errorMessage = `${errorData[firstField][0]}`;
                }
            } else if (error.message === 'Network Error') {
                errorMessage = 'Network Error. Check your server IP.';
            }

            if (Platform.OS === 'web') {
                window.alert(`Login Failed\n\n${errorMessage}`);
            } else {
                Alert.alert('Login Failed', errorMessage);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleSocialLogin = async (provider: 'google' | 'facebook') => {
        setLoading(true);
        try {
            const backendBaseUrl = client.defaults.baseURL ? client.defaults.baseURL.replace('/api/v1/', '') : 'http://127.0.0.1:8000';
            const redirectUrl = Linking.createURL('auth-success');
            const callbackPath = '/api/v1/auth/mobile-callback/';
            const nextUrl = `${callbackPath}?redirect_url=${encodeURIComponent(redirectUrl)}`;
            
            const authUrl = `${backendBaseUrl}/accounts/${provider}/login/?next=${encodeURIComponent(nextUrl)}`;
            
            console.log('[Social Auth] Requesting URL:', authUrl);
            console.log('[Social Auth] Redirect URL:', redirectUrl);
            
            const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);
            
            if (result.type === 'success' && result.url) {
                console.log('[Social Auth] Success redirect url:', result.url);
                const parsed = Linking.parse(result.url);
                const token = parsed.queryParams?.token;
                
                if (token && typeof token === 'string') {
                    setAuthToken(token);
                    await saveToken(token);
                    onLoginSuccess();
                } else {
                    Alert.alert('Authentication Failed', 'No authentication token returned.');
                }
            } else if (result.type === 'cancel') {
                console.log('[Social Auth] User cancelled login');
            } else {
                Alert.alert('Authentication Failed', 'Unable to complete social authentication.');
            }
        } catch (error: any) {
            console.error('[Social Auth] Error during login:', error);
            Alert.alert('Error', error.message || 'An unexpected error occurred during social login.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <LinearGradient
            colors={['#bfdbfe', '#f1f5f9', '#ffffff']}
            style={styles.container}
        >
            <SafeAreaView style={{ flex: 1 }}>
                <View style={styles.innerContainer}>
                {onBack && (
                    <TouchableOpacity onPress={onBack} style={styles.backButton} activeOpacity={0.7}>
                        <Text style={styles.backButtonText}>← Back</Text>
                    </TouchableOpacity>
                )}
                <View style={styles.logoContainer}>
                    <Image
                        source={require('../../assets/icon.png')}
                        style={styles.logoImage}
                        contentFit="contain"
                    />
                </View>
                <Text style={styles.subtitle}>Sign in to your account</Text>

                <TextInput
                    style={[styles.input, errors.email && styles.inputError]}
                    placeholder="Email Address"
                    value={email}
                    onChangeText={(text) => {
                        setEmail(text);
                        if (errors.email) setErrors((prev: any) => ({ ...prev, email: null }));
                    }}
                    autoCapitalize="none"
                    keyboardType="email-address"
                />
                {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}

                <View style={[styles.passwordContainer, errors.password && styles.inputError]}>
                    <TextInput
                        style={styles.passwordInput}
                        placeholder="Password"
                        value={password}
                        onChangeText={(text) => {
                            setPassword(text);
                            if (errors.password) setErrors((prev: any) => ({ ...prev, password: null }));
                        }}
                        secureTextEntry={!isPasswordVisible}
                    />
                    <TouchableOpacity
                        style={styles.eyeButton}
                        onPress={() => setIsPasswordVisible(!isPasswordVisible)}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.eyeButtonText}>
                            {isPasswordVisible ? 'Hide' : 'Show'}
                        </Text>
                    </TouchableOpacity>
                </View>
                {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}

                <TouchableOpacity
                    style={styles.forgotPasswordContainer}
                    onPress={onForgotPassword}
                >
                    <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.button, loading && styles.buttonDisabled]}
                    onPress={handleLogin}
                    disabled={loading}
                >
                    <Text style={styles.buttonText}>
                        {loading ? 'Signing in...' : 'Sign In'}
                    </Text>
                </TouchableOpacity>

                <View style={styles.dividerContainer}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>or continue with</Text>
                    <View style={styles.dividerLine} />
                </View>

                <View style={styles.socialContainer}>
                    <TouchableOpacity
                        style={[styles.socialButton, styles.googleButton]}
                        onPress={() => handleSocialLogin('google')}
                        disabled={loading}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="logo-google" size={18} color="#ea4335" />
                        <Text style={[styles.socialButtonText, styles.googleButtonText]}>Google</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                        style={[styles.socialButton, styles.facebookButton]}
                        onPress={() => handleSocialLogin('facebook')}
                        disabled={loading}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="logo-facebook" size={18} color="#ffffff" />
                        <Text style={[styles.socialButtonText, styles.facebookButtonText]}>Facebook</Text>
                    </TouchableOpacity>
                </View>

                <TouchableOpacity
                    style={styles.signUpLink}
                    onPress={onShowSignUp}
                    disabled={loading}
                >
                    <Text style={styles.signUpLinkText}>
                        Don't have an account? <Text style={styles.signUpLinkBold}>Sign Up</Text>
                    </Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#ffffff',
    },
    innerContainer: {
        flex: 1,
        justifyContent: 'center',
        padding: 30,
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: 16,
    },
    logoImage: {
        width: 220,
        height: 220,
        borderRadius: 55,
    },
    title: {
        fontSize: 36,
        fontFamily: 'Outfit-Bold',
        textAlign: 'center',
        color: '#2563eb',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        textAlign: 'center',
        color: '#6b7280',
        marginBottom: 24,
    },
    input: {
        backgroundColor: '#f9fafb',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        padding: 16,
        borderRadius: 12,
        marginBottom: 16,
        fontSize: 16,
    },
    inputError: {
        borderColor: '#ef4444',
        backgroundColor: '#fef2f2',
    },
    passwordContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f9fafb',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 12,
        marginBottom: 16,
    },
    passwordInput: {
        flex: 1,
        padding: 16,
        fontSize: 16,
    },
    eyeButton: {
        paddingHorizontal: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    eyeButtonText: {
        color: '#2563eb',
        fontWeight: 'bold',
        fontSize: 14,
    },
    errorText: {
        color: '#ef4444',
        fontSize: 12,
        marginTop: -12,
        marginBottom: 12,
        marginLeft: 4,
        fontWeight: '500',
    },
    forgotPasswordContainer: {
        alignItems: 'flex-end',
        marginBottom: 16,
    },
    forgotPasswordText: {
        color: '#2563eb',
        fontWeight: 'bold',
        fontSize: 14,
    },
    button: {
        backgroundColor: '#2563eb',
        padding: 18,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 10,
        elevation: 2,
        shadowColor: '#2563eb',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
    },
    buttonDisabled: {
        backgroundColor: '#93c5fd',
    },
    buttonText: {
        color: '#ffffff',
        fontWeight: 'bold',
        fontSize: 18,
    },
    signUpLink: {
        marginTop: 24,
        alignItems: 'center',
    },
    signUpLinkText: {
        color: '#6b7280',
        fontSize: 14,
    },
    signUpLinkBold: {
        color: '#2563eb',
        fontWeight: 'bold',
    },
    backButton: {
        position: 'absolute',
        top: 20,
        left: 20,
        padding: 8,
        zIndex: 10,
    },
    backButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#2563eb',
    },
    dividerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 20,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: '#e5e7eb',
    },
    dividerText: {
        color: '#6b7280',
        paddingHorizontal: 10,
        fontSize: 14,
    },
    socialContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
        marginBottom: 10,
    },
    socialButton: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        gap: 8,
    },
    googleButton: {
        backgroundColor: '#ffffff',
    },
    facebookButton: {
        backgroundColor: '#1877f2',
        borderColor: '#1877f2',
    },
    socialButtonText: {
        fontWeight: '600',
        fontSize: 16,
    },
    googleButtonText: {
        color: '#1f2937',
    },
    facebookButtonText: {
        color: '#ffffff',
    },
});

export default LoginScreen;
