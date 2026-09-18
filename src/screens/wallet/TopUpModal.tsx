import React, { useState } from 'react';
import {
    Modal, View, Text, TextInput, TouchableOpacity,
    ActivityIndicator, KeyboardAvoidingView, Platform, Alert, ScrollView,
} from 'react-native';
import { colors } from '../../constants/theme';
import { walletStyles as s } from './walletStyles';
import type { SavedCardItem } from '../../hooks/useWallet';

interface TopUpModalProps {
    visible: boolean;
    savedCards: SavedCardItem[];
    onClose: () => void;
    onSubmitVoucher: (pin: string) => Promise<void>;
    onSubmitCard: (params: {
        savedCardId?: number | 'new';
        amount: string;
        cardNumber?: string;
        cardExpiry?: string;
        cardCvv?: string;
        saveCard?: boolean;
    }) => Promise<void>;
    onDeleteSavedCard: (cardId: number) => void;
}

function validateCardDetails(
    amount: string,
    cardNumber: string,
    cardExpiry: string,
    cardCvv: string
): string | null {
    const rawAmount = parseFloat(amount);
    if (isNaN(rawAmount) || rawAmount <= 0) return 'Please enter a valid amount greater than R0.';
    if (rawAmount < 10) return 'Minimum card top-up amount is R10.00.';
    const rawCard = cardNumber.replace(/\s+/g, '');
    if (!rawCard) return 'Card number is required.';
    if (rawCard.length < 15 || rawCard.length > 16 || !/^\d+$/.test(rawCard)) return 'Please enter a valid 15 or 16 digit card number.';
    if (!cardExpiry) return 'Expiry date is required.';
    const parts = cardExpiry.split('/');
    const month = parseInt(parts[0]?.trim() || '0', 10);
    let year = parseInt(parts[1]?.trim() || '0', 10);
    if (year < 100) year += 2000;
    const now = new Date();
    if (!parts[0] || !parts[1] || month < 1 || month > 12) return 'Invalid month (01-12).';
    if (year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth() + 1)) return 'Card has expired.';
    const rawCvv = cardCvv.trim();
    if (!rawCvv) return 'CVV is required.';
    if (rawCvv.length < 3 || rawCvv.length > 4 || !/^\d+$/.test(rawCvv)) return 'CVV must be 3 or 4 digits.';
    return null;
}

export const TopUpModal: React.FC<TopUpModalProps> = ({
    visible, savedCards, onClose, onSubmitVoucher, onSubmitCard, onDeleteSavedCard,
}) => {
    const [method, setMethod] = useState<'voucher' | 'card'>('voucher');
    const [voucherPin, setVoucherPin] = useState('');
    const [cardAmount, setCardAmount] = useState('');
    const [cardNumber, setCardNumber] = useState('');
    const [cardExpiry, setCardExpiry] = useState('');
    const [cardCvv, setCardCvv] = useState('');
    const [saveCard, setSaveCard] = useState(true);
    const [selectedCardId, setSelectedCardId] = useState<number | 'new'>('new');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const reset = () => {
        setVoucherPin(''); setCardAmount(''); setCardNumber('');
        setCardExpiry(''); setCardCvv(''); setError(null);
        setSelectedCardId(savedCards.length > 0 ? (savedCards.find(c => c.is_default)?.id ?? savedCards[0].id) : 'new');
    };

    const handleClose = () => { reset(); onClose(); };

    const handleSubmit = async () => {
        setError(null);
        setIsSubmitting(true);
        try {
            if (method === 'voucher') {
                if (!voucherPin.trim()) { setError('Please enter your 1Voucher PIN.'); return; }
                await onSubmitVoucher(voucherPin);
                reset();
            } else {
                if (selectedCardId !== 'new') {
                    const rawAmount = parseFloat(cardAmount);
                    if (isNaN(rawAmount) || rawAmount < 10) { setError('Minimum top-up amount is R10.00.'); return; }
                    await onSubmitCard({ savedCardId: selectedCardId, amount: cardAmount });
                    reset();
                } else {
                    const err = validateCardDetails(cardAmount, cardNumber, cardExpiry, cardCvv);
                    if (err) { setError(err); return; }
                    await onSubmitCard({ savedCardId: 'new', amount: cardAmount, cardNumber, cardExpiry, cardCvv, saveCard });
                    reset();
                }
            }
        } catch (e: any) {
            setError(e.response?.data?.error || (method === 'voucher' ? 'Invalid or already redeemed voucher.' : 'Card payment failed. Please check your details.'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const isDisabled = isSubmitting || (method === 'voucher'
        ? !voucherPin.trim()
        : selectedCardId !== 'new' ? !cardAmount : !cardAmount || !cardNumber || !cardExpiry || !cardCvv);

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.modalOverlay}>
                <View style={s.modalContent}>
                    <View style={s.modalHeader}>
                        <Text style={s.modalTitle}>Top Up Wallet</Text>
                        <TouchableOpacity onPress={handleClose}><Text style={s.closeButton}>✕</Text></TouchableOpacity>
                    </View>

                    {/* Method Tabs */}
                    <View style={{ flexDirection: 'row', backgroundColor: colors.surfaceLight, padding: 4, borderRadius: 8, marginBottom: 16 }}>
                        {(['voucher', 'card'] as const).map(m => (
                            <TouchableOpacity
                                key={m}
                                style={{ flex: 1, paddingVertical: 8, borderRadius: 6, backgroundColor: method === m ? colors.primaryLight : 'transparent', alignItems: 'center' }}
                                onPress={() => { setMethod(m); setError(null); }}
                            >
                                <Text style={{ color: method === m ? colors.white : colors.textSecondary, fontWeight: 'bold' }}>
                                    {m === 'voucher' ? '🎫 1Voucher' : '💳 Bank Card'}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {method === 'voucher' ? (
                        <>
                            <Text style={[s.inputLabel, { marginBottom: 4 }]}>1Voucher PIN</Text>
                            <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 10 }}>Enter the 14–16 digit PIN from your physical 1Voucher.</Text>
                            <TextInput
                                style={[s.textInput, error ? s.inputError : null, { letterSpacing: 2, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontSize: 18, textAlign: 'center' }]}
                                placeholder="0000 0000 0000 00"
                                keyboardType="number-pad"
                                value={voucherPin}
                                onChangeText={t => { setVoucherPin(t); setError(null); }}
                                placeholderTextColor="#9ca3af"
                                maxLength={16}
                            />
                        </>
                    ) : (
                        <View style={{ gap: 12 }}>
                            <View>
                                <Text style={[s.inputLabel, { marginBottom: 4 }]}>Amount (ZAR)</Text>
                                <TextInput
                                    style={s.textInput}
                                    placeholder="e.g. 150"
                                    keyboardType="numeric"
                                    value={cardAmount}
                                    onChangeText={t => { setCardAmount(t.replace(/[^0-9.]/g, '')); setError(null); }}
                                    placeholderTextColor="#9ca3af"
                                />
                            </View>

                            {savedCards.length > 0 && (
                                <View>
                                    <Text style={[s.inputLabel, { marginBottom: 6 }]}>Select Card</Text>
                                    <View style={{ gap: 8 }}>
                                        {savedCards.map(card => {
                                            const isSelected = selectedCardId === card.id;
                                            return (
                                                <TouchableOpacity
                                                    key={card.id}
                                                    style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: isSelected ? colors.primaryLight : '#374151', backgroundColor: isSelected ? 'rgba(59,130,246,0.15)' : colors.surfaceLight }}
                                                    onPress={() => setSelectedCardId(card.id)}
                                                >
                                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                                                        <View style={{ width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: isSelected ? colors.primaryLight : '#6b7280', alignItems: 'center', justifyContent: 'center' }}>
                                                            {isSelected && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primaryLight }} />}
                                                        </View>
                                                        <Text style={{ fontSize: 16 }}>💳</Text>
                                                        <View>
                                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                                                <Text style={{ color: colors.white, fontWeight: '600', fontSize: 13 }}>{card.card_brand} •••• {card.last4}</Text>
                                                                {card.is_default && <View style={{ backgroundColor: 'rgba(34,197,94,0.2)', paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4 }}><Text style={{ color: '#22c55e', fontSize: 9, fontWeight: 'bold' }}>DEFAULT</Text></View>}
                                                            </View>
                                                            <Text style={{ color: colors.textSecondary, fontSize: 11 }}>Exp {card.expiry_month}/{card.expiry_year}</Text>
                                                        </View>
                                                    </View>
                                                    <TouchableOpacity onPress={() => onDeleteSavedCard(card.id)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={{ padding: 4 }}>
                                                        <Text style={{ fontSize: 14 }}>🗑️</Text>
                                                    </TouchableOpacity>
                                                </TouchableOpacity>
                                            );
                                        })}
                                        <TouchableOpacity
                                            style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: selectedCardId === 'new' ? colors.primaryLight : '#374151', borderStyle: selectedCardId === 'new' ? 'solid' : 'dashed', backgroundColor: selectedCardId === 'new' ? 'rgba(59,130,246,0.15)' : 'transparent' }}
                                            onPress={() => setSelectedCardId('new')}
                                        >
                                            <View style={{ width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: selectedCardId === 'new' ? colors.primaryLight : '#6b7280', alignItems: 'center', justifyContent: 'center' }}>
                                                {selectedCardId === 'new' && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primaryLight }} />}
                                            </View>
                                            <Text style={{ color: colors.white, fontSize: 13, fontWeight: '500' }}>➕ Use a new card</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            )}

                            {selectedCardId === 'new' && (
                                <>
                                    <View>
                                        <Text style={[s.inputLabel, { marginBottom: 4 }]}>Card Number</Text>
                                        <TextInput
                                            style={[s.textInput, { fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', letterSpacing: 2 }]}
                                            placeholder="5531 8866 5214 2950"
                                            keyboardType="number-pad"
                                            value={cardNumber}
                                            onChangeText={t => {
                                                const raw = t.replace(/\D/g, '').slice(0, 16);
                                                setCardNumber(raw.match(/.{1,4}/g)?.join(' ') || raw);
                                                setError(null);
                                            }}
                                            placeholderTextColor="#9ca3af"
                                            maxLength={19}
                                        />
                                    </View>
                                    <View style={{ flexDirection: 'row', gap: 12 }}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={[s.inputLabel, { marginBottom: 4 }]}>Expiry (MM/YY)</Text>
                                            <TextInput
                                                style={s.textInput}
                                                placeholder="09/32"
                                                value={cardExpiry}
                                                onChangeText={t => {
                                                    let v = t.replace(/\D/g, '').slice(0, 4);
                                                    if (v.length > 2) v = v.slice(0, 2) + '/' + v.slice(2);
                                                    setCardExpiry(v); setError(null);
                                                }}
                                                placeholderTextColor="#9ca3af"
                                                maxLength={5}
                                            />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={[s.inputLabel, { marginBottom: 4 }]}>CVV</Text>
                                            <TextInput
                                                style={s.textInput}
                                                placeholder="564"
                                                keyboardType="number-pad"
                                                secureTextEntry
                                                value={cardCvv}
                                                onChangeText={t => { setCardCvv(t.replace(/\D/g, '').slice(0, 4)); setError(null); }}
                                                placeholderTextColor="#9ca3af"
                                                maxLength={4}
                                            />
                                        </View>
                                    </View>
                                    <TouchableOpacity
                                        style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4, paddingVertical: 4 }}
                                        onPress={() => setSaveCard(v => !v)}
                                        activeOpacity={0.8}
                                    >
                                        <View style={{ width: 20, height: 20, borderRadius: 4, borderWidth: 1.5, borderColor: saveCard ? '#10b981' : '#4b5563', backgroundColor: saveCard ? '#10b981' : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                                            {saveCard && <Text style={{ color: '#fff', fontSize: 13, fontWeight: 'bold' }}>✓</Text>}
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={{ color: '#e5e7eb', fontSize: 13, fontWeight: '500' }}>Save this card securely for future payments</Text>
                                            <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 2 }}>🔒 Encrypted tokenization. CVV is never stored.</Text>
                                        </View>
                                    </TouchableOpacity>
                                </>
                            )}
                        </View>
                    )}

                    {error && <Text style={[s.errorText, { marginTop: 8 }]}>{error}</Text>}
                    <TouchableOpacity style={[s.submitButton, isDisabled && s.disabledButton, { marginTop: 20 }]} onPress={handleSubmit} disabled={isDisabled}>
                        {isSubmitting ? <ActivityIndicator color="#ffffff" /> : (
                            <Text style={s.submitButtonText}>
                                {method === 'voucher' ? 'Redeem Voucher' : selectedCardId !== 'new' ? `Top Up R${cardAmount || '0'} with Saved Card` : 'Pay with Card'}
                            </Text>
                        )}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
};
