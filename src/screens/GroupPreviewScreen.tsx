import React, { useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, Alert, Dimensions, Share, Modal, TextInput
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import client from '../api/client';

const { width } = Dimensions.get('window');

interface Group {
    id: number;
    name: string;
    description: string;
    cover_image: string | null;
    total_members: number;
    requires_approval: boolean;
    membership_status: 'active' | 'pending' | null;
    created_at?: string;
    verified_members_only?: boolean;
    is_verified?: boolean;
    purpose?: string;
    bereavement_profile?: any;
}

interface GroupPreviewScreenProps {
    group: Group;
    onBack: () => void;
    onGroupJoined: () => void;
    onGoToVerification?: () => void;
}

const GroupPreviewScreen = ({ group, onBack, onGroupJoined, onGoToVerification }: GroupPreviewScreenProps) => {
    const insets = useSafeAreaInsets();
    const [joining, setJoining] = useState(false);
    const [membershipStatus, setMembershipStatus] = useState<'active' | 'pending' | null>(group.membership_status);

    // Bereavement Modal State
    const [showBereavementModal, setShowBereavementModal] = useState(false);
    const [bName, setBName] = useState('');
    const [bRel, setBRel] = useState('Spouse');
    const [bPhone, setBPhone] = useState('');
    const [joinMsg, setJoinMsg] = useState('');
    const [dependents, setDependents] = useState<Array<{ name: string; relationship: string; date_of_birth: string }>>([]);

    // Excess Modal State
    const [showExcessModal, setShowExcessModal] = useState(false);
    const [vMakeModel, setVMakeModel] = useState('');
    const [vReg, setVReg] = useState('');
    const [vInsurer, setVInsurer] = useState('');
    const [vPolicy, setVPolicy] = useState('');
    const [vVin, setVVin] = useState('');
    const [vLicense, setVLicense] = useState('');
    const [excessJoinMsg, setExcessJoinMsg] = useState('');

    const formatDate = (dateString?: string) => {
        if (!dateString) return 'Recently';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    };

    const handleJoinGroup = () => {
        if ((group as any).purpose === 'bereavement') {
            setShowBereavementModal(true);
        } else if ((group as any).purpose === 'excess') {
            setShowExcessModal(true);
        } else {
            Alert.alert(
                'Join Community',
                `Are you sure you want to ${group.requires_approval ? 'request to join' : 'join'} ${group.name}?`,
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Confirm',
                        onPress: () => performJoin(),
                    },
                ]
            );
        }
    };

    const performJoin = async (customPayload?: any) => {
        setJoining(true);
        try {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            const response = await client.post(`groups/${group.id}/join/`, customPayload || {});
            const status = response.data.status;

            if (status === 'active') {
                Alert.alert('Welcome!', `You have successfully joined ${group.name}.`);
                setShowBereavementModal(false);
                setShowExcessModal(false);
                onGroupJoined();
            } else if (status === 'pending') {
                setMembershipStatus('pending');
                setShowBereavementModal(false);
                setShowExcessModal(false);
                Alert.alert('Request Sent', 'Your request to join has been sent to the community admins.');
            }
        } catch (error: any) {
            console.error('Error joining group:', error, error.response?.data);
            const data = error.response?.data;
            const msg = (typeof data === 'string' ? data : (data?.error || data?.detail || (data && typeof data === 'object' ? Object.values(data).flat().join(', ') : ''))) || '';
            if (msg.toLowerCase().includes('verified') || msg.toLowerCase().includes('restrict')) {
                Alert.alert(
                    'Verification Required',
                    'This group requires verified members. Your account is not yet verified.',
                    [
                        { text: 'Maybe Later', style: 'cancel' },
                        {
                            text: 'Verify Now',
                            style: 'default',
                            onPress: () => onGoToVerification?.()
                        }
                    ]
                );
            } else {
                Alert.alert('Join Failed', msg || 'Failed to join the community. Please try again.');
            }
        } finally {
            setJoining(false);
        }
    };

    const handleBereavementSubmit = () => {
        if (!bName.trim()) {
            Alert.alert('Required Field', 'Please enter Next of Kin / Beneficiary full name.');
            return;
        }
        if (!bPhone.trim()) {
            Alert.alert('Required Field', 'Please enter Next of Kin contact phone number.');
            return;
        }
        performJoin({
            beneficiary_name: bName.trim(),
            beneficiary_relationship: bRel,
            beneficiary_phone: bPhone.trim(),
            join_message: joinMsg.trim(),
            dependents: dependents.filter(d => d.name.trim().length > 0)
        });
    };

    const handleExcessSubmit = () => {
        if (!vMakeModel.trim()) {
            Alert.alert('Required Field', 'Please enter Vehicle Make & Model.');
            return;
        }
        if (!vReg.trim()) {
            Alert.alert('Required Field', 'Please enter Vehicle Registration Number.');
            return;
        }
        if (!vInsurer.trim()) {
            Alert.alert('Required Field', 'Please enter Insurance Provider Name.');
            return;
        }
        if (!vPolicy.trim()) {
            Alert.alert('Required Field', 'Please enter Policy Number.');
            return;
        }
        if (!vVin.trim()) {
            Alert.alert('Required Field', 'Please enter VIN / Chassis Number for fraud prevention.');
            return;
        }
        if (!vLicense.trim()) {
            Alert.alert('Required Field', "Please enter Driver's License / Owner ID Number.");
            return;
        }
        performJoin({
            vehicle_make_model: vMakeModel.trim(),
            vehicle_registration: vReg.trim().toUpperCase(),
            insurer_name: vInsurer.trim(),
            policy_number: vPolicy.trim(),
            vin_number: vVin.trim().toUpperCase(),
            driver_license_number: vLicense.trim(),
            join_message: excessJoinMsg.trim()
        });
    };

    const handleShare = async () => {
        try {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            const shareUrl = `komunity://group/${group.id}`;
            await Share.share({
                message: `Check out "${group.name}" on Komunity!\n\n${group.description}\n\nJoin here: ${shareUrl}`,
            });
        } catch (error) {
            console.error('Error sharing group:', error);
        }
    };

    const getJoinButtonConfig = () => {
        if (membershipStatus === 'active') {
            return {
                label: '✓ Already Joined',
                style: styles.joinedButton,
                textStyle: styles.joinedButtonText,
                disabled: true,
            };
        }
        if (membershipStatus === 'pending') {
            return {
                label: '⏳ Request Pending',
                style: styles.pendingButton,
                textStyle: styles.pendingButtonText,
                disabled: true,
            };
        }
        return {
            label: group.requires_approval ? 'Request to Join' : 'Join Community',
            style: styles.joinButton,
            textStyle: styles.joinButtonText,
            disabled: false,
        };
    };

    const btn = getJoinButtonConfig();

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <ScrollView showsVerticalScrollIndicator={false} bounces={true}>
                {/* Hero Cover Image */}
                <View style={styles.heroSection}>
                    {group.cover_image ? (
                        <Image
                            source={{ uri: group.cover_image }}
                            style={styles.coverImage}
                            transition={300}
                        />
                    ) : (
                        <View style={[styles.coverImage, styles.coverPlaceholder]}>
                            <Text style={styles.coverPlaceholderText}>
                                {group.name[0]?.toUpperCase()}
                            </Text>
                        </View>
                    )}
                    <View style={styles.heroGradient} />
                    {/* Back button overlaying the image */}
                    <TouchableOpacity
                        style={[styles.backButtonOverlay, { top: 12 }]}
                        onPress={onBack}
                    >
                        <Text style={styles.backButtonText}>←</Text>
                    </TouchableOpacity>

                    <View style={styles.heroContent}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
                            <Text style={styles.heroGroupName}>{group.name}</Text>
                            {group.is_verified && (
                                <View style={styles.heroVerifiedBadge}>
                                    <Text style={styles.heroVerifiedBadgeText}>✅ Verified</Text>
                                </View>
                            )}
                        </View>
                        <View style={styles.heroMeta}>
                            <View style={styles.metaBadge}>
                                <Text style={styles.metaBadgeText}>
                                    👥 {group.total_members} {group.total_members === 1 ? 'member' : 'members'}
                                </Text>
                            </View>
                            <View style={[styles.metaBadge, group.requires_approval ? styles.metaBadgeRestricted : styles.metaBadgePublic]}>
                                <Text style={styles.metaBadgeText}>
                                    {group.requires_approval ? '🔒 Restricted' : '🌍 Public'}
                                </Text>
                            </View>
                            {group.verified_members_only && (
                                <View style={[styles.metaBadge, { backgroundColor: '#fee2e2' }]}>
                                    <Text style={[styles.metaBadgeText, { color: '#dc2626', fontWeight: 'bold' }]}>
                                        🛡️ Verified Only
                                    </Text>
                                </View>
                            )}
                        </View>
                    </View>
                </View>

                <View style={styles.contentArea}>
                    {group.is_verified && (
                        <View style={[styles.card, { borderColor: '#6ee7b7', backgroundColor: '#f0fdf4', borderWidth: 1 }]}>
                            <View style={styles.cardHeader}>
                                <Text style={styles.cardIcon}>✅</Text>
                                <Text style={[styles.cardTitle, { color: '#065f46' }]}>Verified Community</Text>
                            </View>
                            <Text style={[styles.descriptionText, { color: '#14532d', marginTop: 4 }]}>
                                This community has been officially verified by the Komunity team as a legitimate and trusted organisation.
                            </Text>
                        </View>
                    )}
                    {group.verified_members_only && (
                        <View style={[styles.card, { borderColor: '#fecaca', backgroundColor: '#fef2f2', borderWidth: 1 }]}>
                            <View style={styles.cardHeader}>
                                <Text style={styles.cardIcon}>🛡️</Text>
                                <Text style={[styles.cardTitle, { color: '#991b1b' }]}>Verified Members Only</Text>
                            </View>
                            <Text style={[styles.descriptionText, { color: '#7f1d1d', marginTop: 4 }]}>
                                This community requires a verified user profile to join. Go to your Profile settings to complete KYC verification if you haven't already.
                            </Text>
                        </View>
                    )}

                    {/* Description Card */}
                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <Text style={styles.cardIcon}>📝</Text>
                            <Text style={styles.cardTitle}>About this Community</Text>
                        </View>
                        <Text style={styles.descriptionText}>
                            {group.description || 'This community brings people together to support each other. Join to learn more about the group\'s mission and connect with other members.'}
                        </Text>
                    </View>

                    {/* Stats Card */}
                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <Text style={styles.cardIcon}>📊</Text>
                            <Text style={styles.cardTitle}>Community Stats</Text>
                        </View>
                        <View style={styles.statsGrid}>
                            <View style={styles.statBox}>
                                <Text style={styles.statNumber}>{group.total_members}</Text>
                                <Text style={styles.statLabel}>Members</Text>
                            </View>
                            <View style={styles.statDivider} />
                            <View style={styles.statBox}>
                                <Text style={styles.statNumber}>{group.requires_approval ? '🔒' : '🌍'}</Text>
                                <Text style={styles.statLabel}>{group.requires_approval ? 'Restricted' : 'Public'}</Text>
                            </View>
                            <View style={styles.statDivider} />
                            <View style={styles.statBox}>
                                <Text style={styles.statNumber}>📅</Text>
                                <Text style={styles.statLabel}>{formatDate(group.created_at)}</Text>
                            </View>
                        </View>
                    </View>

                    {/* Community Guidelines Card */}
                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <Text style={styles.cardIcon}>📋</Text>
                            <Text style={styles.cardTitle}>Community Guidelines</Text>
                        </View>
                        <View style={styles.guidelineItem}>
                            <View style={styles.guidelineDot} />
                            <View style={styles.guidelineContent}>
                                <Text style={styles.guidelineTitle}>Respect & Solidarity</Text>
                                <Text style={styles.guidelineDesc}>Treat all members with dignity. We are a support network built on mutual trust.</Text>
                            </View>
                        </View>
                        <View style={styles.guidelineItem}>
                            <View style={[styles.guidelineDot, { backgroundColor: '#8b5cf6' }]} />
                            <View style={styles.guidelineContent}>
                                <Text style={styles.guidelineTitle}>Cultural Sensitivity</Text>
                                <Text style={styles.guidelineDesc}>Honor the heritage and traditions of our shared community background.</Text>
                            </View>
                        </View>
                        <View style={styles.guidelineItem}>
                            <View style={[styles.guidelineDot, { backgroundColor: '#f59e0b' }]} />
                            <View style={styles.guidelineContent}>
                                <Text style={styles.guidelineTitle}>Financial Integrity</Text>
                                <Text style={styles.guidelineDesc}>All contributions are tracked transparently for the benefit of members.</Text>
                            </View>
                        </View>
                    </View>

                    {/* What to Expect Card */}
                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <Text style={styles.cardIcon}>✨</Text>
                            <Text style={styles.cardTitle}>What to Expect</Text>
                        </View>
                        <View style={styles.expectItem}>
                            <Text style={styles.expectEmoji}>💬</Text>
                            <Text style={styles.expectText}>Discussion feed to connect with members</Text>
                        </View>
                        <View style={styles.expectItem}>
                            <Text style={styles.expectEmoji}>💳</Text>
                            <Text style={styles.expectText}>Community wallet for transparent contributions</Text>
                        </View>
                        <View style={styles.expectItem}>
                            <Text style={styles.expectEmoji}>🤝</Text>
                            <Text style={styles.expectText}>Support network for members and their families</Text>
                        </View>
                    </View>

                    {/* Spacer for bottom action bar */}
                    <View style={{ height: 100 }} />
                </View>
            </ScrollView>

            {/* Fixed Bottom Action Bar */}
            <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
                <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
                    <Text style={styles.shareButtonText}>🚀</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[btn.style, joining && styles.buttonLoading, { flex: 1 }]}
                    onPress={handleJoinGroup}
                    disabled={btn.disabled || joining}
                >
                    {joining ? (
                        <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                        <Text style={btn.textStyle}>{btn.label}</Text>
                    )}
                </TouchableOpacity>
            </View>

            {/* 🕊️ BEREAVEMENT GROUP JOIN REGISTRATION MODAL */}
            <Modal
                visible={showBereavementModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowBereavementModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>🕊️ Join Bereavement Fund</Text>
                            <TouchableOpacity onPress={() => setShowBereavementModal(false)}>
                                <Text style={styles.modalCloseText}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                            <Text style={styles.modalSubtitle}>{group.name}</Text>
                            <Text style={styles.modalDesc}>Please fill in your primary beneficiary details before joining.</Text>

                            {/* Section 1: Beneficiary */}
                            <Text style={styles.fieldSectionTitle}>1. Primary Beneficiary (Next of Kin)</Text>
                            
                            <Text style={styles.inputLabel}>Beneficiary Full Name *</Text>
                            <TextInput
                                style={styles.textInput}
                                placeholder="e.g. Jane Mary Doe"
                                placeholderTextColor="#94a3b8"
                                value={bName}
                                onChangeText={setBName}
                            />

                            <Text style={styles.inputLabel}>Relationship *</Text>
                            <TextInput
                                style={styles.textInput}
                                placeholder="e.g. Spouse, Child, Parent, Sibling"
                                placeholderTextColor="#94a3b8"
                                value={bRel}
                                onChangeText={setBRel}
                            />

                            <Text style={styles.inputLabel}>Contact Phone Number *</Text>
                            <TextInput
                                style={styles.textInput}
                                placeholder="e.g. +27 82 123 4567"
                                placeholderTextColor="#94a3b8"
                                keyboardType="phone-pad"
                                value={bPhone}
                                onChangeText={setBPhone}
                            />

                            {/* Section 2: Join Message */}
                            <Text style={[styles.fieldSectionTitle, { marginTop: 16 }]}>2. Join Message (Optional)</Text>
                            <TextInput
                                style={[styles.textInput, { height: 70 }]}
                                placeholder="Introduce yourself or leave a message for admins..."
                                placeholderTextColor="#94a3b8"
                                multiline
                                value={joinMsg}
                                onChangeText={setJoinMsg}
                            />

                            {/* Dependents Section */}
                            <View style={styles.dependentsHeaderRow}>
                                <Text style={styles.fieldSectionTitle}>3. Covered Dependents ({dependents.length})</Text>
                                <TouchableOpacity
                                    style={styles.addDepBtn}
                                    onPress={() => setDependents([...dependents, { name: '', relationship: 'Child', date_of_birth: '2000-01-01' }])}
                                >
                                    <Text style={styles.addDepBtnText}>+ Add</Text>
                                </TouchableOpacity>
                            </View>

                            {dependents.map((dep, idx) => (
                                <View key={idx} style={styles.depCard}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                                        <Text style={{ fontWeight: '700', fontSize: 12, color: '#475569' }}>Dependent #{idx + 1}</Text>
                                        <TouchableOpacity onPress={() => setDependents(dependents.filter((_, i) => i !== idx))}>
                                            <Text style={{ color: '#ef4444', fontSize: 12 }}>Remove</Text>
                                        </TouchableOpacity>
                                    </View>
                                    <TextInput
                                        style={[styles.textInput, { marginBottom: 6 }]}
                                        placeholder="Full Name"
                                        placeholderTextColor="#94a3b8"
                                        value={dep.name}
                                        onChangeText={(val) => {
                                            const updated = [...dependents];
                                            updated[idx].name = val;
                                            setDependents(updated);
                                        }}
                                    />
                                    <TextInput
                                        style={styles.textInput}
                                        placeholder="Relationship (e.g. Child, Spouse)"
                                        placeholderTextColor="#94a3b8"
                                        value={dep.relationship}
                                        onChangeText={(val) => {
                                            const updated = [...dependents];
                                            updated[idx].relationship = val;
                                            setDependents(updated);
                                        }}
                                    />
                                </View>
                            ))}
                        </ScrollView>

                        <View style={styles.modalFooter}>
                            <TouchableOpacity style={styles.cancelModalBtn} onPress={() => setShowBereavementModal(false)}>
                                <Text style={styles.cancelModalBtnText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.submitModalBtn} onPress={handleBereavementSubmit} disabled={joining}>
                                {joining ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Text style={styles.submitModalBtnText}>Confirm &amp; Join</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* 🚗 INSURANCE EXCESS JOIN REGISTRATION MODAL */}
            <Modal
                visible={showExcessModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowExcessModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>🚗 Join Insurance Excess</Text>
                            <TouchableOpacity onPress={() => setShowExcessModal(false)}>
                                <Text style={styles.modalCloseText}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                            <Text style={styles.modalSubtitle}>{group.name}</Text>
                            <Text style={styles.modalDesc}>Register your vehicle &amp; policy details for fraud prevention.</Text>

                            <Text style={styles.fieldSectionTitle}>1. Insured Vehicle Information</Text>
                            
                            <Text style={styles.inputLabel}>Vehicle Make &amp; Model *</Text>
                            <TextInput
                                style={styles.textInput}
                                placeholder="e.g. 2022 Toyota Hilux 2.8 GD-6"
                                placeholderTextColor="#94a3b8"
                                value={vMakeModel}
                                onChangeText={setVMakeModel}
                            />

                            <Text style={styles.inputLabel}>Registration Number *</Text>
                            <TextInput
                                style={styles.textInput}
                                placeholder="e.g. CA 987-654"
                                placeholderTextColor="#94a3b8"
                                value={vReg}
                                onChangeText={(text) => setVReg(text.toUpperCase())}
                            />

                            <Text style={styles.inputLabel}>VIN / Chassis Number *</Text>
                            <TextInput
                                style={styles.textInput}
                                placeholder="e.g. AHT1234567890"
                                placeholderTextColor="#94a3b8"
                                value={vVin}
                                onChangeText={(text) => setVVin(text.toUpperCase())}
                            />

                            <Text style={[styles.fieldSectionTitle, { marginTop: 16 }]}>2. Insurance Provider &amp; Policy</Text>

                            <Text style={styles.inputLabel}>Insurer / Provider *</Text>
                            <TextInput
                                style={styles.textInput}
                                placeholder="e.g. Santam / OUTsurance"
                                placeholderTextColor="#94a3b8"
                                value={vInsurer}
                                onChangeText={setVInsurer}
                            />

                            <Text style={styles.inputLabel}>Policy Number *</Text>
                            <TextInput
                                style={styles.textInput}
                                placeholder="e.g. POL-99887766"
                                placeholderTextColor="#94a3b8"
                                value={vPolicy}
                                onChangeText={setVPolicy}
                            />

                            <Text style={[styles.fieldSectionTitle, { marginTop: 16 }]}>3. Owner / Driver Verification</Text>
                            <Text style={styles.inputLabel}>Driver&apos;s License / ID Number *</Text>
                            <TextInput
                                style={styles.textInput}
                                placeholder="e.g. 9001015800087"
                                placeholderTextColor="#94a3b8"
                                value={vLicense}
                                onChangeText={setVLicense}
                            />

                            <Text style={[styles.fieldSectionTitle, { marginTop: 16 }]}>4. Notes (Optional)</Text>
                            <TextInput
                                style={[styles.textInput, { height: 60 }]}
                                placeholder="Add notes for group admins..."
                                placeholderTextColor="#94a3b8"
                                multiline
                                value={excessJoinMsg}
                                onChangeText={setExcessJoinMsg}
                            />
                        </ScrollView>

                        <View style={styles.modalFooter}>
                            <TouchableOpacity style={styles.cancelModalBtn} onPress={() => setShowExcessModal(false)}>
                                <Text style={styles.cancelModalBtnText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.submitModalBtn, { backgroundColor: '#0284c7' }]} onPress={handleExcessSubmit} disabled={joining}>
                                {joining ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Text style={styles.submitModalBtnText}>Register &amp; Join</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f3f4f6',
    },
    heroSection: {
        width: '100%',
        height: 280,
        position: 'relative',
    },
    coverImage: {
        width: '100%',
        height: '100%',
    },
    coverPlaceholder: {
        backgroundColor: '#2563eb',
        justifyContent: 'center',
        alignItems: 'center',
    },
    coverPlaceholderText: {
        fontSize: 72,
        fontWeight: 'bold',
        color: 'rgba(255,255,255,0.3)',
    },
    heroGradient: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 180,
        backgroundColor: 'rgba(0,0,0,0.45)',
    },
    backButtonOverlay: {
        position: 'absolute',
        left: 16,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    backButtonText: {
        fontSize: 22,
        color: '#ffffff',
        fontWeight: 'bold',
    },
    heroContent: {
        position: 'absolute',
        bottom: 20,
        left: 16,
        right: 16,
    },
    heroGroupName: {
        fontSize: 26,
        fontWeight: 'bold',
        color: '#ffffff',
        marginBottom: 10,
        textShadowColor: 'rgba(0, 0, 0, 0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
    },
    heroMeta: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    metaBadge: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 16,
        marginRight: 8,
    },
    metaBadgeRestricted: {
        backgroundColor: 'rgba(245, 158, 11, 0.3)',
    },
    metaBadgePublic: {
        backgroundColor: 'rgba(34, 197, 94, 0.3)',
    },
    metaBadgeText: {
        fontSize: 12,
        color: '#ffffff',
        fontWeight: '600',
    },
    contentArea: {
        padding: 16,
    },
    card: {
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 18,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 1,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 14,
    },
    cardIcon: {
        fontSize: 18,
        marginRight: 8,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#111827',
    },
    descriptionText: {
        fontSize: 15,
        color: '#4b5563',
        lineHeight: 24,
    },
    statsGrid: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
    },
    statBox: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 4,
    },
    statNumber: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 12,
        color: '#6b7280',
        textAlign: 'center',
    },
    statDivider: {
        width: 1,
        height: 40,
        backgroundColor: '#e5e7eb',
    },
    guidelineItem: {
        flexDirection: 'row',
        marginBottom: 14,
        alignItems: 'flex-start',
    },
    guidelineDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#2563eb',
        marginTop: 6,
        marginRight: 12,
    },
    guidelineContent: {
        flex: 1,
    },
    guidelineTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: 2,
    },
    guidelineDesc: {
        fontSize: 13,
        color: '#6b7280',
        lineHeight: 18,
    },
    expectItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    expectEmoji: {
        fontSize: 20,
        marginRight: 12,
    },
    expectText: {
        fontSize: 14,
        color: '#4b5563',
        flex: 1,
    },
    bottomBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 12,
        backgroundColor: '#ffffff',
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
        elevation: 8,
    },
    shareButton: {
        width: 50,
        height: 50,
        borderRadius: 14,
        backgroundColor: '#f3f4f6',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    shareButtonText: {
        fontSize: 22,
    },
    // Join button
    joinButton: {
        backgroundColor: '#2563eb',
        paddingVertical: 14,
        borderRadius: 14,
        alignItems: 'center',
        shadowColor: '#2563eb',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 4,
    },
    joinButtonText: {
        color: '#ffffff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    // Already joined
    joinedButton: {
        backgroundColor: '#f0fdf4',
        paddingVertical: 14,
        borderRadius: 14,
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: '#22c55e',
    },
    joinedButtonText: {
        color: '#16a34a',
        fontWeight: 'bold',
        fontSize: 16,
    },
    // Pending
    pendingButton: {
        backgroundColor: '#fffbeb',
        paddingVertical: 14,
        borderRadius: 14,
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: '#f59e0b',
    },
    pendingButtonText: {
        color: '#d97706',
        fontWeight: 'bold',
        fontSize: 16,
    },
    buttonLoading: {
        backgroundColor: '#93c5fd',
    },
    heroVerifiedBadge: {
        backgroundColor: 'rgba(209, 250, 229, 0.9)',
        borderRadius: 20,
        paddingHorizontal: 9,
        paddingVertical: 3,
        borderWidth: 1,
        borderColor: '#6ee7b7',
    },
    heroVerifiedBadgeText: {
        color: '#065f46',
        fontSize: 12,
        fontWeight: '700',
    },
    // Bereavement Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#ffffff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '85%',
        paddingBottom: 24,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#1e293b',
    },
    modalCloseText: {
        fontSize: 20,
        color: '#94a3b8',
        padding: 4,
    },
    modalBody: {
        paddingHorizontal: 20,
        paddingTop: 12,
    },
    modalSubtitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#7c3aed',
    },
    modalDesc: {
        fontSize: 13,
        color: '#64748b',
        marginBottom: 16,
        marginTop: 2,
    },
    fieldSectionTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#334155',
        marginBottom: 8,
    },
    inputLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#475569',
        marginBottom: 4,
        marginTop: 6,
    },
    textInput: {
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 14,
        color: '#0f172a',
    },
    dependentsHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 16,
        marginBottom: 8,
    },
    addDepBtn: {
        backgroundColor: '#f3e8ff',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    addDepBtnText: {
        color: '#7c3aed',
        fontWeight: '700',
        fontSize: 12,
    },
    depCard: {
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: '#cbd5e1',
        borderRadius: 12,
        padding: 10,
        marginBottom: 8,
    },
    modalFooter: {
        flexDirection: 'row',
        gap: 12,
        paddingHorizontal: 20,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
    },
    cancelModalBtn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#cbd5e1',
        alignItems: 'center',
    },
    cancelModalBtnText: {
        color: '#64748b',
        fontWeight: '600',
    },
    submitModalBtn: {
        flex: 2,
        backgroundColor: '#7c3aed',
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
    },
    submitModalBtnText: {
        color: '#ffffff',
        fontWeight: '700',
        fontSize: 15,
    },
});

export default GroupPreviewScreen;
