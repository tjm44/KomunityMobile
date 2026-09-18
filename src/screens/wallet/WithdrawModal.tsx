import React, { useState } from 'react';
import {
    Modal, View, Text, TextInput, TouchableOpacity,
    ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { Image } from 'expo-image';
import { colors } from '../../constants/theme';
import { walletStyles as s } from './walletStyles';
import { RETAIL_PARTNERS, NETWORK_PROVIDERS, type WithdrawChannel } from '../../hooks/useWallet';
import { getMediaUrl } from '../../api/client';

interface WithdrawModalProps {
    visible: boolean;
    balance: string;
    members: any[];
    onClose: () => void;
    /** Returns an error string on validation failure, null on success (PIN modal will open) */
    onWithdraw: (
        channel: WithdrawChannel,
        amount: string,
        metadata: Record<string, string>,
        partner: string,
    ) => Promise<string | null>;
    /** Returns an error string on validation failure, null on success (PIN modal will open) */
    onSend: (recipient: any, amount: string) => Promise<string | null>;
}

export const WithdrawModal: React.FC<WithdrawModalProps> = ({
    visible, members, onClose, onWithdraw, onSend,
}) => {
    const [channel, setChannel] = useState<WithdrawChannel>('bank_transfer');
    const [amount, setAmount] = useState('');
    const [accountNumber, setAccountNumber] = useState('');
    const [bankCode, setBankCode] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [provider, setProvider] = useState('MTN');
    const [partner, setPartner] = useState('Shoprite');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedRecipient, setSelectedRecipient] = useState<any>(null);
    const [sendAmount, setSendAmount] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const reset = () => {
        setAmount(''); setAccountNumber(''); setBankCode(''); setPhoneNumber('');
        setProvider('MTN'); setPartner('Shoprite'); setSearchQuery('');
        setSelectedRecipient(null); setSendAmount(''); setError(null);
    };

    const handleClose = () => { reset(); onClose(); };

    const handleWithdraw = async () => {
        const metadata: Record<string, string> = {};
        if (channel === 'bank_transfer') {
            metadata.account_number = accountNumber.trim();
            metadata.bank_code = bankCode.trim();
        } else if (channel === 'mobile_money') {
            metadata.phone_number = phoneNumber.trim();
            metadata.provider = provider.trim();
        } else if (channel === 'voucher') {
            metadata.partner = partner.trim();
        }
        setIsSubmitting(true);
        try {
            const err = await onWithdraw(channel, amount, metadata, partner);
            if (err) setError(err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSend = async () => {
        setIsSubmitting(true);
        try {
            const err = await onSend(selectedRecipient, sendAmount);
            if (err) setError(err);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.modalOverlay}>
                <View style={s.modalContent}>
                    <View style={s.modalHeader}>
                        <Text style={s.modalTitle}>{channel === 'send_money' ? 'Send Money' : 'Withdraw Funds'}</Text>
                        <TouchableOpacity onPress={handleClose}><Text style={s.closeButton}>✕</Text></TouchableOpacity>
                    </View>

                    {/* Channel Selector */}
                    <Text style={s.inputLabel}>Channel</Text>
                    <View style={s.channelOptions}>
                        {[
                            { value: 'bank_transfer', label: 'Bank', icon: '🏦' },
                            { value: 'mobile_money', label: 'Mobile', icon: '📱' },
                            { value: 'voucher', label: 'Voucher', icon: '🎫' },
                            { value: 'send_money', label: 'Send Money', icon: '💸' },
                        ].map(opt => (
                            <TouchableOpacity
                                key={opt.value}
                                activeOpacity={0.8}
                                style={[
                                    s.channelOption,
                                    channel === opt.value && s.channelOptionSelected,
                                    opt.value === 'send_money' && channel === 'send_money' && { borderColor: colors.primary, backgroundColor: colors.primary },
                                ]}
                                onPress={() => { setChannel(opt.value as WithdrawChannel); setError(null); }}
                            >
                                <Text style={s.channelOptionIcon}>{opt.icon}</Text>
                                <Text style={[s.channelOptionText, channel === opt.value && s.channelOptionTextSelected]}>{opt.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Amount (non send_money channels) */}
                    {channel !== 'send_money' && (
                        <>
                            <Text style={s.inputLabel}>Amount (ZAR)</Text>
                            <TextInput
                                style={[s.textInput, error ? s.inputError : null]}
                                placeholder="0.00"
                                keyboardType="decimal-pad"
                                value={amount}
                                onChangeText={t => { setAmount(t); setError(null); }}
                                placeholderTextColor="#9ca3af"
                            />
                        </>
                    )}

                    {/* Bank Transfer */}
                    {channel === 'bank_transfer' && (
                        <>
                            <Text style={s.inputLabel}>Account Number</Text>
                            <TextInput style={[s.textInput, error ? s.inputError : null]} placeholder="1234567890" value={accountNumber} onChangeText={t => { setAccountNumber(t); setError(null); }} placeholderTextColor="#9ca3af" />
                            <Text style={s.inputLabel}>Bank Code</Text>
                            <TextInput style={[s.textInput, error ? s.inputError : null]} placeholder="FNB001" value={bankCode} onChangeText={t => { setBankCode(t); setError(null); }} placeholderTextColor="#9ca3af" />
                        </>
                    )}

                    {/* Mobile Money */}
                    {channel === 'mobile_money' && (
                        <>
                            <Text style={s.inputLabel}>Mobile Money Number</Text>
                            <TextInput style={[s.textInput, error ? s.inputError : null]} placeholder="+27761234567" value={phoneNumber} onChangeText={t => { setPhoneNumber(t); setError(null); }} placeholderTextColor="#9ca3af" />
                            <Text style={s.inputLabel}>Network Provider</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 6, maxHeight: 40 }}>
                                <View style={{ flexDirection: 'row', gap: 6, paddingRight: 10 }}>
                                    {NETWORK_PROVIDERS.map(prov => (
                                        <TouchableOpacity key={prov} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: provider === prov ? colors.primaryLight : colors.surfaceLight, borderWidth: 1, borderColor: provider === prov ? colors.primaryLight : colors.border }} onPress={() => setProvider(prov)}>
                                            <Text style={{ fontSize: 12, fontWeight: provider === prov ? '700' : '500', color: provider === prov ? colors.white : colors.textSecondary }}>{provider === prov ? `✓ ${prov}` : prov}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </ScrollView>
                            <TextInput style={[s.textInput, error ? s.inputError : null]} placeholder="MTN" value={provider} onChangeText={t => { setProvider(t); setError(null); }} placeholderTextColor="#9ca3af" />
                        </>
                    )}

                    {/* Voucher */}
                    {channel === 'voucher' && (
                        <>
                            <Text style={s.inputLabel}>Retail Partner</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 6, maxHeight: 40 }}>
                                <View style={{ flexDirection: 'row', gap: 6, paddingRight: 10 }}>
                                    {RETAIL_PARTNERS.map(p => (
                                        <TouchableOpacity key={p} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: partner === p ? colors.success : colors.surfaceLight, borderWidth: 1, borderColor: partner === p ? colors.success : colors.border }} onPress={() => setPartner(p)}>
                                            <Text style={{ fontSize: 12, fontWeight: partner === p ? '700' : '500', color: partner === p ? colors.white : colors.textSecondary }}>{partner === p ? `✓ ${p}` : p}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </ScrollView>
                            <TextInput style={[s.textInput, error ? s.inputError : null]} placeholder="Shoprite" value={partner} onChangeText={t => { setPartner(t); setError(null); }} placeholderTextColor="#9ca3af" />
                        </>
                    )}

                    {/* Send Money (embedded member picker) */}
                    {channel === 'send_money' && (
                        <View>
                            {!selectedRecipient ? (
                                <>
                                    <Text style={s.inputLabel}>Search Member</Text>
                                    <TextInput style={s.textInput} placeholder="Search by name..." value={searchQuery} onChangeText={setSearchQuery} placeholderTextColor="#9ca3af" />
                                    <ScrollView style={[s.memberList, { maxHeight: 180 }]}>
                                        {members
                                            .filter((m: any) => !searchQuery || m.member_detail?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()))
                                            .map((member: any) => (
                                                <TouchableOpacity key={member.id} style={s.memberItem} onPress={() => { setSelectedRecipient(member); setSearchQuery(''); }}>
                                                    <View style={s.memberAvatar}>
                                                        {member.member_detail?.profile_picture
                                                            ? <Image source={{ uri: getMediaUrl(member.member_detail.profile_picture) }} style={s.avatarImg} />
                                                            : <Text style={s.avatarInitial}>{member.member_detail?.full_name?.[0]?.toUpperCase() || '?'}</Text>}
                                                    </View>
                                                    <Text style={s.memberName}>{member.member_detail?.full_name}</Text>
                                                </TouchableOpacity>
                                            ))}
                                    </ScrollView>
                                </>
                            ) : (
                                <>
                                    <View style={s.selectedRecipient}>
                                        <View style={s.memberAvatar}>
                                            {selectedRecipient.member_detail?.profile_picture
                                                ? <Image source={{ uri: getMediaUrl(selectedRecipient.member_detail.profile_picture) }} style={s.avatarImg} />
                                                : <Text style={s.avatarInitial}>{selectedRecipient.member_detail?.full_name?.[0]?.toUpperCase()}</Text>}
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={s.recipientName}>{selectedRecipient.member_detail?.full_name}</Text>
                                            <TouchableOpacity onPress={() => setSelectedRecipient(null)}><Text style={s.changeRecipient}>Change recipient</Text></TouchableOpacity>
                                        </View>
                                    </View>
                                    <Text style={s.inputLabel}>Amount (ZAR)</Text>
                                    <TextInput style={[s.textInput, error ? s.inputError : null]} placeholder="0.00" keyboardType="decimal-pad" value={sendAmount} onChangeText={t => { setSendAmount(t); setError(null); }} placeholderTextColor="#9ca3af" />
                                    {error && <Text style={s.errorText}>{error}</Text>}
                                    <View style={s.presets}>
                                        {['5', '10', '25', '50'].map(amt => (
                                            <TouchableOpacity key={amt} style={s.presetBtn} onPress={() => setSendAmount(amt)}>
                                                <Text style={s.presetText}>R{amt}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </>
                            )}
                        </View>
                    )}

                    {error && channel !== 'send_money' && <Text style={s.errorText}>{error}</Text>}

                    {channel !== 'send_money' && (
                        <TouchableOpacity style={[s.submitButton, isSubmitting && s.disabledButton]} onPress={handleWithdraw} disabled={isSubmitting}>
                            {isSubmitting ? <ActivityIndicator color="#ffffff" /> : <Text style={s.submitButtonText}>Submit Withdrawal</Text>}
                        </TouchableOpacity>
                    )}
                    {channel === 'send_money' && selectedRecipient && (
                        <TouchableOpacity style={[s.submitButton, { backgroundColor: colors.primary }, isSubmitting && s.disabledButton]} onPress={handleSend} disabled={isSubmitting}>
                            {isSubmitting ? <ActivityIndicator color="#ffffff" /> : <Text style={s.submitButtonText}>Send Money</Text>}
                        </TouchableOpacity>
                    )}
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
};
