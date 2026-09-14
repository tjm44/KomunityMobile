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
import { colors, gradients } from '../constants/theme';

interface PhoneAuthProps {
  onLoginSuccess: (isNewUser?: boolean) => void;
  onBack?: () => void;
  sessionNotice?: string | null;
}

type AuthStep = 'phone' | 'pin' | 'otp' | 'create_pin';

const COUNTRY_CODES = [
  { code: '+27', label: '🇿🇦 South Africa (+27)' },
  { code: '+254', label: '🇰🇪 Kenya (+254)' },
  { code: '+234', label: '🇳🇬 Nigeria (+234)' },
  { code: '+263', label: '🇿🇼 Zimbabwe (+263)' },
  { code: '+267', label: '🇧🇼 Botswana (+267)' },
  { code: '+260', label: '🇿🇲 Zambia (+260)' },
  { code: '+258', label: '🇲🇿 Mozambique (+258)' },
  { code: '+1', label: '🇺🇸 USA/Canada (+1)' },
  { code: '+44', label: '🇬🇧 UK (+44)' },
];

const PhoneAuthScreen = ({ onLoginSuccess, onBack, sessionNotice }: PhoneAuthProps) => {
  const [step, setStep] = useState<AuthStep>('phone');
  const [countryCode, setCountryCode] = useState('+27');
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
    let interval: ReturnType<typeof setInterval>;
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

  // Auto-format phone number with spaces as user types
  // SA format: 061 325 2589  (3-3-4)
  const formatPhoneNumber = (raw: string) => {
    // Strip everything except digits
    const digits = raw.replace(/[^0-9]/g, '');
    // Limit to 10 digits (SA local number)
    const capped = digits.slice(0, 10);
    // Apply 3-3-4 spacing: 061 325 2589
    if (capped.length <= 3) return capped;
    if (capped.length <= 6) return `${capped.slice(0, 3)} ${capped.slice(3)}`;
    return `${capped.slice(0, 3)} ${capped.slice(3, 6)} ${capped.slice(6)}`;
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
    <LinearGradient colors={[...gradients.screenBackground]} style={styles.container}>
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
                  <Ionicons name="arrow-back" size={24} color={colors.primary} />
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
                  color={colors.primary}
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

            {sessionNotice ? (
              <View style={styles.sessionNoticeBanner}>
                <Ionicons name="shield-checkmark" size={18} color="#d97706" />
                <Text style={styles.sessionNoticeText}>{sessionNotice}</Text>
              </View>
            ) : null}

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
                    placeholder="061 325 2589"
                    placeholderTextColor="#64748b"
                    keyboardType="phone-pad"
                    value={phoneNumber}
                    onChangeText={(text) => setPhoneNumber(formatPhoneNumber(text))}
                    autoFocus
                    maxLength={13}
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
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  iconBadge: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.surfaceTeal,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: colors.accent,
  },
  mainTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: colors.primary,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 12,
  },
  formCard: {
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 4,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 10,
  },
  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    marginBottom: 16,
  },
  countryPickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 16,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    backgroundColor: colors.surfaceTeal,
  },
  countryCodeText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
    marginRight: 6,
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  countryDropdown: {
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
    overflow: 'hidden',
  },
  countryOption: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  countryOptionText: {
    fontSize: 15,
    color: colors.textPrimary,
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
    backgroundColor: colors.surfaceLight,
    borderWidth: 1.5,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  otpBoxFilled: {
    borderColor: colors.accent,
    backgroundColor: colors.surfaceTeal,
  },
  otpBoxFocused: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceLight,
  },
  otpDigitText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.primary,
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
    backgroundColor: colors.surfaceLight,
    borderWidth: 1.5,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pinBoxFilled: {
    borderColor: colors.accent,
    backgroundColor: colors.surfaceTeal,
  },
  pinBoxFocused: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceLight,
  },
  pinDigitDot: {
    fontSize: 28,
    color: colors.primary,
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
    backgroundColor: colors.dangerLight,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    marginLeft: 8,
    flex: 1,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
    marginTop: 8,
  },
  disabledButton: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: colors.white,
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
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  footerLinkDisabled: {
    color: colors.textMuted,
  },
  sessionNoticeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.35)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
  },
  sessionNoticeText: {
    flex: 1,
    color: '#d97706',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
});

export default PhoneAuthScreen;
