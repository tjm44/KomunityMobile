import React, { useState } from 'react';
import {
    Modal, View, Text, TextInput, TouchableOpacity,
    ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { Image } from 'expo-image';
import { walletStyles as s } from './walletStyles';
import { getMediaUrl } from '../../api/client';

interface SendMoneyModalProps {
    visible: boolean;
    balance: string;
    members: any[];
    onClose: () => void;
    onSend: (recipient: any, amount: string) => Promise<string | null>;
}

export const SendMoneyModal: React.FC<SendMoneyModalProps> = ({
    visible, members, onClose, onSend,
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedRecipient, setSelectedRecipient] = useState<any>(null);
    const [amount, setAmount] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isSending, setIsSending] = useState(false);

    const reset = () => {
        setSearchQuery(''); setSelectedRecipient(null); setAmount(''); setError(null);
    };

    const handleClose = () => { reset(); onClose(); };

    const handleSend = async () => {
        if (!selectedRecipient) { setError('Please select a recipient.'); return; }
        setError(null);
        setIsSending(true);
        try {
            const err = await onSend(selectedRecipient, amount);
            if (err) setError(err);
            else reset();
        } catch (e: any) {
            setError(e.response?.data?.error || 'Failed to send money.');
        } finally {
            setIsSending(false);
        }
    };

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.modalOverlay}>
                <View style={s.modalContent}>
                    <View style={s.modalHeader}>
                        <Text style={s.modalTitle}>Send Money</Text>
                        <TouchableOpacity onPress={handleClose}><Text style={s.closeButton}>✕</Text></TouchableOpacity>
                    </View>

                    {!selectedRecipient ? (
                        <>
                            <Text style={s.inputLabel}>Select Recipient</Text>
                            <TextInput
                                style={s.textInput}
                                placeholder="Search members..."
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                placeholderTextColor="#9ca3af"
                            />
                            <ScrollView style={s.memberList}>
                                {members
                                    .filter(m => m.member_detail.full_name.toLowerCase().includes(searchQuery.toLowerCase()))
                                    .map(member => (
                                        <TouchableOpacity key={member.id} style={s.memberItem} onPress={() => setSelectedRecipient(member)}>
                                            <View style={s.memberAvatar}>
                                                {member.member_detail.profile_picture
                                                    ? <Image source={{ uri: getMediaUrl(member.member_detail.profile_picture) }} style={s.avatarImg} />
                                                    : <Text style={s.avatarInitial}>{member.member_detail.full_name[0].toUpperCase()}</Text>}
                                            </View>
                                            <Text style={s.memberName}>{member.member_detail.full_name}</Text>
                                        </TouchableOpacity>
                                    ))}
                            </ScrollView>
                        </>
                    ) : (
                        <>
                            <View style={s.selectedRecipient}>
                                <View style={s.memberAvatar}>
                                    {selectedRecipient.member_detail.profile_picture
                                        ? <Image source={{ uri: getMediaUrl(selectedRecipient.member_detail.profile_picture) }} style={s.avatarImg} />
                                        : <Text style={s.avatarInitial}>{selectedRecipient.member_detail.full_name[0].toUpperCase()}</Text>}
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={s.recipientName}>{selectedRecipient.member_detail.full_name}</Text>
                                    <TouchableOpacity onPress={() => setSelectedRecipient(null)}>
                                        <Text style={s.changeRecipient}>Change recipient</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <Text style={s.inputLabel}>Amount (ZAR)</Text>
                            <TextInput
                                style={[s.textInput, error ? s.inputError : null]}
                                placeholder="0.00"
                                keyboardType="decimal-pad"
                                value={amount}
                                onChangeText={t => { setAmount(t); setError(null); }}
                                placeholderTextColor="#9ca3af"
                            />
                            {error && <Text style={s.errorText}>{error}</Text>}

                            <View style={s.presets}>
                                {['5', '10', '25', '50'].map(amt => (
                                    <TouchableOpacity key={amt} style={s.presetBtn} onPress={() => setAmount(amt)}>
                                        <Text style={s.presetText}>R{amt}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <TouchableOpacity style={[s.submitButton, isSending && s.disabledButton]} onPress={handleSend} disabled={isSending}>
                                {isSending ? <ActivityIndicator color="#ffffff" /> : <Text style={s.submitButtonText}>Send Money</Text>}
                            </TouchableOpacity>
                        </>
                    )}
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
};
