import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import client, { setAuthToken, saveToken } from '../api/client';

interface PhoneAuthProps {
  onLoginSuccess: (isNewUser?: boolean) => void;
  onBack?: () => void;
}

type AuthStep = 'phone' | 'pin' | 'otp' | 'create_pin';

const COUNTRY_CODES = [
  { code: '+254', label: '🇰🇪 Kenya (+254)' },
  { code: '+27', label: '🇿🇦 South Africa (+27)' },
  { code: '+234', label: '🇳🇬 Nigeria (+234)' },
  { code: '+1', label: '🇺🇸 USA/Canada (+1)' },
  { code: '+44', label: '🇬🇧 UK (+44)' },
];

const PhoneAuthScreen = ({ onLoginSuccess, onBack }: PhoneAuthProps) => {
  const [step, setStep] = useState<AuthStep>('phone');
  const [countryCode, setCountryCode] = useState('+254');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isConfirmingPinStep, setIsConfirmingPinStep] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isNewUser, setIsNewUser] = useState(false);
  const [pendingToken, setPendingToken] = useState<string | null>(null);

  const otpInputRef = useRef<TextInput>(null);
  const pinInputRef = useRef<TextInput>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (step === 'otp' && resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [step, resendTimer]);

  const triggerHaptic = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) {}
  };

  const getFullPhone = () => {
    const cleaned = phoneNumber.replace(/[^0-9]/g, '');
    const formattedNum = cleaned.startsWith('0') ? cleaned.substring(1) : cleaned;
    return `${countryCode}${formattedNum}`;
  };

  // Step 1: Check phone status (PIN vs OTP flow)
  const handlePhoneSubmit = async () => {
    triggerHaptic();
    setErrorMessage(null);

    const cleaned = phoneNumber.replace(/[^0-9]/g, '');
    if (cleaned.length < 7) {
      setErrorMessage('Please enter a valid phone number');
      return;
    }

    const fullPhone = getFullPhone();
    setLoading(true);

    try {
      const statusRes = await client.post('auth/check-phone/', { phone: fullPhone });
      if (statusRes.data.user_exists && statusRes.data.has_pin) {
        setStep('pin');
      } else {
        await requestSMSOTP(fullPhone);
      }
    } catch (error: any) {
      // Fallback directly to OTP
      await requestSMSOTP(fullPhone);
    } finally {
      setLoading(false);
    }
  };

  const requestSMSOTP = async (phone: string) => {
    try {
      const response = await client.post('auth/request-otp/', { phone });
      setStep('otp');
      setResendTimer(60);
      setCanResend(false);

      if (response.data.dev_otp) {
        console.log('[DEV MODE] Requested OTP Code:', response.data.dev_otp);
      }
    } catch (error: any) {
      const msg = error.response?.data?.error || 'Failed to send OTP code.';
      setErrorMessage(msg);
    }
  };

  // Step 2: Verify 4-digit PIN
  const handleVerifyPIN = async (pinCode: string) => {
    triggerHaptic();
    setErrorMessage(null);

    if (pinCode.length < 4) {
      setErrorMessage('Please enter your 4-digit security PIN');
      return;
    }

    const fullPhone = getFullPhone();
    setLoading(true);

    try {
      const response = await client.post('auth/verify-pin/', {
        phone: fullPhone,
        pin: pinCode,
      });

      const token = response.data.token;
      setAuthToken(token);
      await saveToken(token);
      onLoginSuccess(false);
    } catch (error: any) {
      console.error(error);
      const msg = error.response?.data?.error || 'Incorrect 4-digit PIN.';
      setErrorMessage(msg);
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Verify 6-digit OTP
  const handleVerifyOTP = async () => {
    triggerHaptic();
    setErrorMessage(null);

    if (otp.length < 6) {
      setErrorMessage('Please enter the complete 6-digit code');
      return;
    }

    const fullPhone = getFullPhone();
    setLoading(true);

    try {
      const response = await client.post('auth/verify-otp/', {
        phone: fullPhone,
        otp: otp.trim(),
      });

      const token = response.data.token;
      const newUser = response.data.is_new_user;
      const userHasPin = response.data.has_pin;

      setPendingToken(token);
      setIsNewUser(newUser);

      if (!userHasPin) {
        // Direct user to create a 4-digit PIN
        setStep('create_pin');
      } else {
        setAuthToken(token);
        await saveToken(token);
        onLoginSuccess(newUser);
      }
    } catch (error: any) {
      console.error(error);
      const msg = error.response?.data?.error || 'Invalid or expired OTP code.';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  // Step 4: Create & Confirm 4-digit PIN
  const handleSaveNewPIN = async () => {
    triggerHaptic();
    setErrorMessage(null);

    if (pin.length !== 4) {
      setErrorMessage('PIN must be 4 digits.');
      return;
    }

    if (!isConfirmingPinStep) {
      setIsConfirmingPinStep(true);
      return;
    }

    if (pin !== confirmPin) {
      setErrorMessage('PINs do not match. Please try again.');
      setConfirmPin('');
      return;
    }

    const fullPhone = getFullPhone();
    setLoading(true);

    try {
      if (pendingToken) {
        setAuthToken(pendingToken);
      }

      await client.post('auth/set-pin/', {
        phone: fullPhone,
        pin: pin,
      });

      if (pendingToken) {
        await saveToken(pendingToken);
      }

      onLoginSuccess(isNewUser);
    } catch (error: any) {
      console.error(error);
      const msg = error.response?.data?.error || 'Failed to save security PIN.';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={['#1e293b', '#0f172a', '#020617']} style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            {/* Header / Back */}
            <View style={styles.headerRow}>
              {onBack && (
                <TouchableOpacity style={styles.backButton} onPress={onBack}>
                  <Ionicons name="arrow-back" size={24} color="#ffffff" />
                </TouchableOpacity>
              )}
            </View>

            {/* Title Section */}
            <View style={styles.titleContainer}>
              <View style={styles.iconBadge}>
                <Feather
                  name={
                    step === 'phone'
                      ? 'smartphone'
                      : step === 'pin' || step === 'create_pin'
                      ? 'lock'
                      : 'shield'
                  }
                  size={32}
                  color="#3b82f6"
                />
              </View>
              <Text style={styles.mainTitle}>
                {step === 'phone'
                  ? 'Mobile Login'
                  : step === 'pin'
                  ? 'Security PIN'
                  : step === 'create_pin'
                  ? isConfirmingPinStep
                    ? 'Confirm Security PIN'
                    : 'Create 4-Digit PIN'
                  : 'Enter 6-Digit Code'}
              </Text>
              <Text style={styles.subtitle}>
                {step === 'phone'
                  ? 'Enter your phone number to sign in or get started.'
                  : step === 'pin'
                  ? `Enter your 4-digit security PIN for ${getFullPhone()}`
                  : step === 'create_pin'
                  ? isConfirmingPinStep
                    ? 'Re-enter your 4-digit PIN to confirm.'
                    : 'Set a 4-digit security PIN for fast & secure future logins.'
                  : `We sent a 6-digit SMS verification code to ${getFullPhone()}`}
              </Text>
            </View>

            {/* Step 1: Phone Input */}
            {step === 'phone' && (
              <View style={styles.formCard}>
                <Text style={styles.inputLabel}>Mobile Phone Number</Text>

                <View style={styles.phoneInputRow}>
                  <TouchableOpacity
                    style={styles.countryPickerButton}
                    onPress={() => setShowCountryPicker(!showCountryPicker)}
                  >
                    <Text style={styles.countryCodeText}>{countryCode}</Text>
                    <Ionicons name="chevron-down" size={16} color="#94a3b8" />
                  </TouchableOpacity>

                  <TextInput
                    style={styles.phoneInput}
                    placeholder="712 345 678"
                    placeholderTextColor="#64748b"
                    keyboardType="phone-pad"
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                    autoFocus
                  />
                </View>

                {showCountryPicker && (
                  <View style={styles.countryDropdown}>
                    {COUNTRY_CODES.map((item) => (
                      <TouchableOpacity
                        key={item.code}
                        style={styles.countryOption}
                        onPress={() => {
                          setCountryCode(item.code);
                          setShowCountryPicker(false);
                        }}
                      >
                        <Text style={styles.countryOptionText}>{item.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {errorMessage && (
                  <View style={styles.errorBanner}>
                    <Ionicons name="alert-circle-outline" size={18} color="#ef4444" />
                    <Text style={styles.errorText}>{errorMessage}</Text>
                  </View>
                )}

                <TouchableOpacity
                  style={[styles.primaryButton, loading && styles.disabledButton]}
                  onPress={handlePhoneSubmit}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  {loading ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Continue</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* Step 2: 4-Digit Security PIN Entry */}
            {step === 'pin' && (
              <View style={styles.formCard}>
                <Text style={styles.inputLabel}>4-Digit Security PIN</Text>

                <TouchableOpacity
                  activeOpacity={1}
                  style={styles.pinBoxesContainer}
                  onPress={() => pinInputRef.current?.focus()}
                >
                  {[0, 1, 2, 3].map((index) => {
                    const digit = pin[index] || '';
                    const isFocused = pin.length === index;
                    return (
                      <View
                        key={index}
                        style={[
                          styles.pinBox,
                          digit ? styles.pinBoxFilled : null,
                          isFocused ? styles.pinBoxFocused : null,
                        ]}
                      >
                        <Text style={styles.pinDigitDot}>{digit ? '●' : ''}</Text>
                      </View>
                    );
                  })}
                </TouchableOpacity>

                <TextInput
                  ref={pinInputRef}
                  style={styles.hiddenInput}
                  keyboardType="number-pad"
                  maxLength={4}
                  value={pin}
                  onChangeText={(val) => {
                    setPin(val);
                    if (val.length === 4) {
                      handleVerifyPIN(val);
                    }
                  }}
                  autoFocus
                />

                {errorMessage && (
                  <View style={styles.errorBanner}>
                    <Ionicons name="alert-circle-outline" size={18} color="#ef4444" />
                    <Text style={styles.errorText}>{errorMessage}</Text>
                  </View>
                )}

                <TouchableOpacity
                  style={[styles.primaryButton, (loading || pin.length < 4) && styles.disabledButton]}
                  onPress={() => handleVerifyPIN(pin)}
                  disabled={loading || pin.length < 4}
                  activeOpacity={0.85}
                >
                  {loading ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Unlock & Continue</Text>
                  )}
                </TouchableOpacity>

                <View style={styles.otpFooterRow}>
                  <TouchableOpacity
                    onPress={() => requestSMSOTP(getFullPhone())}
                    style={styles.footerLinkButton}
                  >
                    <Text style={styles.footerLinkText}>Login via SMS OTP</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => {
                      setStep('phone');
                      setPin('');
                    }}
                    style={styles.footerLinkButton}
                  >
                    <Text style={styles.footerLinkText}>Change Number</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Step 3: OTP Entry */}
            {step === 'otp' && (
              <View style={styles.formCard}>
                <Text style={styles.inputLabel}>Verification Code</Text>

                <TouchableOpacity
                  activeOpacity={1}
                  style={styles.otpBoxesContainer}
                  onPress={() => otpInputRef.current?.focus()}
                >
                  {[0, 1, 2, 3, 4, 5].map((index) => {
                    const digit = otp[index] || '';
                    const isFocused = otp.length === index;
                    return (
                      <View
                        key={index}
                        style={[
                          styles.otpBox,
                          digit ? styles.otpBoxFilled : null,
                          isFocused ? styles.otpBoxFocused : null,
                        ]}
                      >
                        <Text style={styles.otpDigitText}>{digit}</Text>
                      </View>
                    );
                  })}
                </TouchableOpacity>

                <TextInput
                  ref={otpInputRef}
                  style={styles.hiddenInput}
                  keyboardType="number-pad"
                  maxLength={6}
                  value={otp}
                  onChangeText={(val) => {
                    setOtp(val);
                    if (val.length === 6) {
                      setErrorMessage(null);
                    }
                  }}
                  autoFocus
                />

                {errorMessage && (
                  <View style={styles.errorBanner}>
                    <Ionicons name="alert-circle-outline" size={18} color="#ef4444" />
                    <Text style={styles.errorText}>{errorMessage}</Text>
                  </View>
                )}

                <TouchableOpacity
                  style={[styles.primaryButton, loading && styles.disabledButton]}
                  onPress={handleVerifyOTP}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  {loading ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Verify Code</Text>
                  )}
                </TouchableOpacity>

                <View style={styles.otpFooterRow}>
                  <TouchableOpacity
                    onPress={() => requestSMSOTP(getFullPhone())}
                    disabled={!canResend}
                    style={styles.footerLinkButton}
                  >
                    <Text style={[styles.footerLinkText, !canResend && styles.footerLinkDisabled]}>
                      {canResend ? 'Resend Code' : `Resend in ${resendTimer}s`}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => {
                      setStep('phone');
                      setOtp('');
                    }}
                    style={styles.footerLinkButton}
                  >
                    <Text style={styles.footerLinkText}>Change Number</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Step 4: Create / Confirm 4-Digit Security PIN */}
            {step === 'create_pin' && (
              <View style={styles.formCard}>
                <Text style={styles.inputLabel}>
                  {isConfirmingPinStep ? 'Confirm 4-Digit PIN' : 'Choose 4-Digit PIN'}
                </Text>

                <TouchableOpacity
                  activeOpacity={1}
                  style={styles.pinBoxesContainer}
                  onPress={() => pinInputRef.current?.focus()}
                >
                  {[0, 1, 2, 3].map((index) => {
                    const activeVal = isConfirmingPinStep ? confirmPin : pin;
                    const digit = activeVal[index] || '';
                    const isFocused = activeVal.length === index;
                    return (
                      <View
                        key={index}
                        style={[
                          styles.pinBox,
                          digit ? styles.pinBoxFilled : null,
                          isFocused ? styles.pinBoxFocused : null,
                        ]}
                      >
                        <Text style={styles.pinDigitDot}>{digit ? '●' : ''}</Text>
                      </View>
                    );
                  })}
                </TouchableOpacity>

                <TextInput
                  ref={pinInputRef}
                  style={styles.hiddenInput}
                  keyboardType="number-pad"
                  maxLength={4}
                  value={isConfirmingPinStep ? confirmPin : pin}
                  onChangeText={(val) => {
                    if (isConfirmingPinStep) {
                      setConfirmPin(val);
                    } else {
                      setPin(val);
                    }
                  }}
                  autoFocus
                />

                {errorMessage && (
                  <View style={styles.errorBanner}>
                    <Ionicons name="alert-circle-outline" size={18} color="#ef4444" />
                    <Text style={styles.errorText}>{errorMessage}</Text>
                  </View>
                )}

                <TouchableOpacity
                  style={[
                    styles.primaryButton,
                    (loading || (isConfirmingPinStep ? confirmPin.length < 4 : pin.length < 4)) &&
                      styles.disabledButton,
                  ]}
                  onPress={handleSaveNewPIN}
                  disabled={loading || (isConfirmingPinStep ? confirmPin.length < 4 : pin.length < 4)}
                  activeOpacity={0.85}
                >
                  {loading ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text style={styles.primaryButtonText}>
                      {isConfirmingPinStep ? 'Save & Finish' : 'Next'}
                    </Text>
                  )}
                </TouchableOpacity>

                {isConfirmingPinStep && (
                  <TouchableOpacity
                    onPress={() => {
                      setIsConfirmingPinStep(false);
                      setConfirmPin('');
                    }}
                    style={[styles.footerLinkButton, { marginTop: 14, alignItems: 'center' }]}
                  >
                    <Text style={styles.footerLinkText}>Re-enter PIN</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    justifyContent: 'center',
    flexGrow: 1,
  },
  headerRow: {
    height: 50,
    justifyContent: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleContainer: {
    alignItems: 'center',
    marginVertical: 24,
  },
  iconBadge: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  mainTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 12,
  },
  formCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#cbd5e1',
    marginBottom: 10,
  },
  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#334155',
    overflow: 'hidden',
    marginBottom: 16,
  },
  countryPickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 16,
    borderRightWidth: 1,
    borderRightColor: '#334155',
    backgroundColor: '#1e293b',
  },
  countryCodeText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginRight: 6,
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  countryDropdown: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 16,
    overflow: 'hidden',
  },
  countryOption: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  countryOptionText: {
    fontSize: 15,
    color: '#e2e8f0',
  },
  otpBoxesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 16,
  },
  otpBox: {
    width: 46,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#0f172a',
    borderWidth: 1.5,
    borderColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
  },
  otpBoxFilled: {
    borderColor: '#3b82f6',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  otpBoxFocused: {
    borderColor: '#60a5fa',
    backgroundColor: 'rgba(96, 165, 250, 0.15)',
  },
  otpDigitText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  pinBoxesContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginVertical: 20,
  },
  pinBox: {
    width: 60,
    height: 64,
    borderRadius: 16,
    backgroundColor: '#0f172a',
    borderWidth: 1.5,
    borderColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pinBoxFilled: {
    borderColor: '#3b82f6',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  pinBoxFocused: {
    borderColor: '#60a5fa',
    backgroundColor: 'rgba(96, 165, 250, 0.15)',
  },
  pinDigitDot: {
    fontSize: 28,
    color: '#3b82f6',
  },
  hiddenInput: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  errorText: {
    color: '#fca5a5',
    fontSize: 13,
    marginLeft: 8,
    flex: 1,
  },
  primaryButton: {
    backgroundColor: '#2563eb',
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
    marginTop: 8,
  },
  disabledButton: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  otpFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  footerLinkButton: {
    padding: 6,
  },
  footerLinkText: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: '600',
  },
  footerLinkDisabled: {
    color: '#64748b',
  },
});

export default PhoneAuthScreen;
