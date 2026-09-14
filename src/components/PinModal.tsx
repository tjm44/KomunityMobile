import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, shadows } from '../constants/theme';

interface PinModalProps {
  visible: boolean;
  title?: string;
  description?: string;
  onClose: () => void;
  onConfirm: (pin: string) => Promise<void> | void;
}

export default function PinModal({
  visible,
  title = 'Confirm Security PIN',
  description = 'Please enter your 4-digit security PIN to authorize this sensitive transaction.',
  onClose,
  onConfirm,
}: PinModalProps) {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      setPin('');
      setError(null);
      setLoading(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
    }
  }, [visible]);

  const handleConfirm = async () => {
    if (pin.length < 4) {
      setError('Please enter your 4-digit security PIN.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    setError(null);
    setLoading(true);
    try {
      await onConfirm(pin);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setPin('');
      onClose();
    } catch (err: any) {
      console.error('PIN verification error:', err);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const apiError = err?.response?.data?.error || err?.message || 'Incorrect security PIN. Please try again.';
      setError(apiError);
      setPin('');
      inputRef.current?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setPin('');
    setError(null);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleCancel}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <Text style={styles.iconText}>🔐</Text>
            </View>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.description}>{description}</Text>
          </View>

          {/* Masked PIN Display Dots */}
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => inputRef.current?.focus()}
            style={styles.pinDisplayContainer}
          >
            {[0, 1, 2, 3].map((index) => {
              const hasDigit = pin.length > index;
              return (
                <View
                  key={index}
                  style={[
                    styles.pinDotSlot,
                    hasDigit && styles.pinDotSlotFilled,
                    error ? styles.pinDotSlotError : null,
                  ]}
                >
                  {hasDigit && <View style={styles.pinDotInner} />}
                </View>
              );
            })}
          </TouchableOpacity>

          {/* Hidden text input for native keyboard support */}
          <TextInput
            ref={inputRef}
            value={pin}
            onChangeText={(text) => {
              const cleaned = text.replace(/[^0-9]/g, '').slice(0, 6);
              setPin(cleaned);
              if (error) setError(null);
            }}
            keyboardType="number-pad"
            maxLength={6}
            secureTextEntry
            style={styles.hiddenInput}
            onSubmitEditing={handleConfirm}
          />

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>⚠️ {error}</Text>
            </View>
          ) : null}

          {/* Action Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.btn, styles.cancelBtn]}
              onPress={handleCancel}
              disabled={loading}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.btn,
                styles.confirmBtn,
                (pin.length < 4 || loading) && styles.disabledBtn,
              ]}
              onPress={handleConfirm}
              disabled={pin.length < 4 || loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.white} size="small" />
              ) : (
                <Text style={styles.confirmBtnText}>Confirm</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.cardBackground,
    borderRadius: 20,
    padding: 24,
    ...shadows.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.surfaceTeal,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  iconText: {
    fontSize: 26,
  },
  title: {
    fontSize: 18,
    fontFamily: 'Outfit-Bold',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 6,
  },
  description: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 12,
  },
  pinDisplayContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    marginVertical: 18,
  },
  pinDotSlot: {
    width: 48,
    height: 52,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinDotSlotFilled: {
    borderColor: colors.primary,
    backgroundColor: colors.cardBackground,
  },
  pinDotSlotError: {
    borderColor: colors.danger,
    backgroundColor: colors.dangerLight,
  },
  pinDotInner: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.primary,
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    width: 1,
    height: 1,
  },
  errorBox: {
    backgroundColor: colors.dangerLight,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  errorText: {
    color: colors.danger,
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  btn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    backgroundColor: colors.borderLight,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelBtnText: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
  confirmBtn: {
    backgroundColor: colors.primary,
  },
  confirmBtnText: {
    color: colors.white,
    fontSize: 15,
    fontFamily: 'Outfit-Bold',
  },
  disabledBtn: {
    opacity: 0.5,
  },
});
