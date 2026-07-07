import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    ScrollView, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type GroupPurpose = 'bereavement' | 'excess' | 'emergency' | 'custom';

export interface PurposeSelection {
    purpose: GroupPurpose;
    fund_description: string;
}

interface Props {
    onSelect: (selection: PurposeSelection) => void;
    onBack: () => void;
}

interface PurposeOption {
    key: GroupPurpose;
    icon: string;
    label: string;
    description: string;
    color: string;
    bgColor: string;
}

const PURPOSE_OPTIONS: PurposeOption[] = [
    {
        key: 'bereavement',
        icon: '🕊️',
        label: 'Bereavement Fund',
        description: 'Pool funds to support members during times of loss and bereavement.',
        color: '#7c3aed',
        bgColor: '#f5f3ff',
    },
    {
        key: 'excess',
        icon: '🚗',
        label: 'Insurance Excess Fund',
        description: 'Help a member cover their insurance excess after an accident or claim.',
        color: '#0284c7',
        bgColor: '#f0f9ff',
    },
    {
        key: 'emergency',
        icon: '🆘',
        label: 'Emergency Fundraiser',
        description:
            'Once-off public fundraiser for disasters and emergencies. Requires a verified NGO or Church account.',
        color: '#dc2626',
        bgColor: '#fef2f2',
    },
    {
        key: 'custom',
        icon: '✨',
        label: 'Custom Purpose',
        description: 'Define your own group fund purpose — any reason your community needs.',
        color: '#059669',
        bgColor: '#f0fdf4',
    },
];

const GroupPurposeScreen = ({ onSelect, onBack }: Props) => {
    const insets = useSafeAreaInsets();
    const [selected, setSelected] = useState<GroupPurpose | null>(null);
    const [customText, setCustomText] = useState('');

    const selectedOption = PURPOSE_OPTIONS.find(o => o.key === selected);

    const canProceed = !!selected && (selected !== 'custom' || customText.trim().length > 3);

    const handleConfirm = () => {
        if (!selected) return;
        onSelect({
            purpose: selected,
            fund_description: selected === 'custom' ? customText.trim() : '',
        });
    };

    return (
        <View style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView
                    contentContainerStyle={[styles.scroll, { paddingBottom: Math.max(insets.bottom, 24) + 80 }]}
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.header}>
                        <Text style={styles.title}>What's this group for?</Text>
                        <Text style={styles.subtitle}>
                            Choose the fund type that best describes your community's purpose.
                        </Text>
                    </View>

                    {PURPOSE_OPTIONS.map((option) => {
                        const isSelected = selected === option.key;
                        return (
                            <TouchableOpacity
                                key={option.key}
                                style={[
                                    styles.card,
                                    isSelected && { borderColor: option.color, borderWidth: 2, backgroundColor: option.bgColor },
                                ]}
                                onPress={() => setSelected(option.key)}
                                activeOpacity={0.8}
                            >
                                <View style={[styles.iconBadge, { backgroundColor: option.bgColor }]}>
                                    <Text style={styles.iconText}>{option.icon}</Text>
                                </View>
                                <View style={styles.cardBody}>
                                    <View style={styles.cardTitleRow}>
                                        <Text style={[styles.cardLabel, isSelected && { color: option.color }]}>
                                            {option.label}
                                        </Text>
                                        {option.key === 'emergency' && (
                                            <View style={styles.verifiedBadge}>
                                                <Text style={styles.verifiedText}>Verified only</Text>
                                            </View>
                                        )}
                                    </View>
                                    <Text style={styles.cardDescription}>{option.description}</Text>
                                </View>
                                <View style={[
                                    styles.radio,
                                    isSelected && { borderColor: option.color, backgroundColor: option.color }
                                ]}>
                                    {isSelected && <View style={styles.radioInner} />}
                                </View>
                            </TouchableOpacity>
                        );
                    })}

                    {selected === 'custom' && (
                        <View style={styles.customBox}>
                            <Text style={styles.customLabel}>Describe your group's fund purpose *</Text>
                            <TextInput
                                style={styles.customInput}
                                placeholder="e.g. Monthly savings pool for school fees..."
                                value={customText}
                                onChangeText={setCustomText}
                                multiline
                                numberOfLines={3}
                                maxLength={300}
                            />
                            <Text style={styles.charCount}>{customText.length}/300</Text>
                        </View>
                    )}
                </ScrollView>

                <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
                    <TouchableOpacity
                        style={[
                            styles.continueBtn,
                            !canProceed && styles.continueBtnDisabled,
                            selectedOption && canProceed && { backgroundColor: selectedOption.color },
                        ]}
                        onPress={handleConfirm}
                        disabled={!canProceed}
                    >
                        <Text style={styles.continueBtnText}>Continue →</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.backBtn} onPress={onBack}>
                        <Text style={styles.backBtnText}>← Back</Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    scroll: { padding: 24 },
    header: { marginBottom: 28 },
    title: {
        fontSize: 28,
        fontWeight: '800',
        color: '#0f172a',
        marginBottom: 8,
        fontFamily: 'Outfit-Bold',
    },
    subtitle: {
        fontSize: 16,
        color: '#64748b',
        lineHeight: 24,
        fontFamily: 'Outfit-Regular',
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1.5,
        borderColor: '#e2e8f0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
    },
    iconBadge: {
        width: 52,
        height: 52,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    iconText: { fontSize: 26 },
    cardBody: { flex: 1 },
    cardTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, gap: 8 },
    cardLabel: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1e293b',
        fontFamily: 'Outfit-Bold',
    },
    cardDescription: {
        fontSize: 13,
        color: '#64748b',
        lineHeight: 18,
        fontFamily: 'Outfit-Regular',
    },
    verifiedBadge: {
        backgroundColor: '#fef3c7',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    verifiedText: { fontSize: 10, color: '#92400e', fontWeight: '700' },
    radio: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 2,
        borderColor: '#cbd5e1',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 10,
    },
    radioInner: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#ffffff',
    },
    customBox: {
        marginTop: 4,
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1.5,
        borderColor: '#059669',
    },
    customLabel: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1e293b',
        marginBottom: 8,
        fontFamily: 'Outfit-Bold',
    },
    customInput: {
        backgroundColor: '#f8fafc',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        padding: 12,
        fontSize: 15,
        color: '#1e293b',
        textAlignVertical: 'top',
        minHeight: 80,
        fontFamily: 'Outfit-Regular',
    },
    charCount: {
        fontSize: 11,
        color: '#94a3b8',
        textAlign: 'right',
        marginTop: 4,
    },
    footer: {
        padding: 20,
        paddingTop: 12,
        backgroundColor: '#ffffff',
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
    },
    continueBtn: {
        backgroundColor: '#2563eb',
        borderRadius: 14,
        padding: 16,
        alignItems: 'center',
        marginBottom: 10,
    },
    continueBtnDisabled: { backgroundColor: '#cbd5e1' },
    continueBtnText: {
        color: '#ffffff',
        fontWeight: '800',
        fontSize: 17,
        fontFamily: 'Outfit-Bold',
    },
    backBtn: { alignItems: 'center', padding: 10 },
    backBtnText: { fontSize: 15, color: '#64748b', fontFamily: 'Outfit-Regular' },
});

export default GroupPurposeScreen;
