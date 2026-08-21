import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, Alert, RefreshControl, Share, Modal, TextInput, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import client from '../api/client';
import SearchScreen from './SearchScreen';
import { GroupPlaceholder } from '../components/Loaders';

interface Group {
    id: number;
    name: string;
    description: string;
    cover_image: string | null;
    total_members: number;
    requires_approval: boolean;
    membership_status: 'active' | 'pending' | null;
    verified_members_only?: boolean;
    purpose?: string;
}

interface Organisation {
    id: number;
    name: string;
    description: string;
    cover_image: string | null;
    is_verified: boolean;
    entity_type: string;
    registration_number: string;
}

interface DiscoveryScreenProps {
    onBack: () => void;
    onGroupJoined: () => void;
    onViewGroupDetails?: (group: Group) => void;
    onViewOrganisationPreview?: (org: Organisation) => void;
    onGoToVerification?: () => void;
}

const DiscoveryScreen = ({
    onBack,
    onGroupJoined,
    onViewGroupDetails,
    onViewOrganisationPreview,
    onGoToVerification
}: DiscoveryScreenProps) => {
    const insets = useSafeAreaInsets();
    const [groups, setGroups] = useState<Group[]>([]);
    const [organisations, setOrganisations] = useState<Organisation[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchVisible, setSearchVisible] = useState(false);
    const [joiningId, setJoiningId] = useState<number | null>(null);
    const [activeTab, setActiveTab] = useState<'communities' | 'organisations'>('communities');

    // Bereavement Modal State
    const [showBereavementModal, setShowBereavementModal] = useState(false);
    const [targetBereavementGroup, setTargetBereavementGroup] = useState<Group | null>(null);
    const [bName, setBName] = useState('');
    const [bRel, setBRel] = useState('Spouse');
    const [bPhone, setBPhone] = useState('');
    const [joinMsg, setJoinMsg] = useState('');
    const [dependents, setDependents] = useState<Array<{ name: string; relationship: string; date_of_birth: string }>>([]);

    // Excess Modal State
    const [showExcessModal, setShowExcessModal] = useState(false);
    const [targetExcessGroup, setTargetExcessGroup] = useState<Group | null>(null);
    const [vMakeModel, setVMakeModel] = useState('');
    const [vReg, setVReg] = useState('');
    const [vInsurer, setVInsurer] = useState('');
    const [vPolicy, setVPolicy] = useState('');
    const [vVin, setVVin] = useState('');
    const [vLicense, setVLicense] = useState('');
    const [excessJoinMsg, setExcessJoinMsg] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [groupsRes, orgsRes] = await Promise.all([
                client.get('groups/discover/'),
                client.get('organisations/discover/'),
            ]);
            setGroups(groupsRes.data);
            setOrganisations(orgsRes.data);
        } catch (error) {
            console.error('Error fetching discovery data:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleShareGroup = async (group: Group) => {
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

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    const handleJoinGroup = (group: Group) => {
        if (group.purpose === 'bereavement') {
            setTargetBereavementGroup(group);
            setShowBereavementModal(true);
        } else if (group.purpose === 'excess') {
            setTargetExcessGroup(group);
            setShowExcessModal(true);
        } else {
            Alert.alert(
                'Join Community',
                `Are you sure you want to ${group.requires_approval ? 'request to join' : 'join'} ${group.name}?`,
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Confirm',
                        onPress: () => performJoin(group)
                    }
                ]
            );
        }
    };

    const performJoin = async (group: Group, customPayload?: any) => {
        setJoiningId(group.id);
        try {
            const response = await client.post(`groups/${group.id}/join/`, customPayload || {});
            const status = response.data.status;

            if (status === 'active') {
                Alert.alert('Welcome!', `You have successfully joined ${group.name}.`);
                setShowBereavementModal(false);
                setTargetBereavementGroup(null);
                setShowExcessModal(false);
                setTargetExcessGroup(null);
                onGroupJoined();
            } else if (status === 'pending') {
                Alert.alert('Request Sent', 'Your request to join has been sent to the community admins.');
                setShowBereavementModal(false);
                setTargetBereavementGroup(null);
                setShowExcessModal(false);
                setTargetExcessGroup(null);
                fetchData();
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
            setJoiningId(null);
        }
    };

    const handleBereavementSubmit = () => {
        if (!targetBereavementGroup) return;
        if (!bName.trim()) {
            Alert.alert('Required Field', 'Please enter Next of Kin / Beneficiary full name.');
            return;
        }
        if (!bPhone.trim()) {
            Alert.alert('Required Field', 'Please enter Next of Kin contact phone number.');
            return;
        }
        performJoin(targetBereavementGroup, {
            beneficiary_name: bName.trim(),
            beneficiary_relationship: bRel,
            beneficiary_phone: bPhone.trim(),
            join_message: joinMsg.trim(),
            dependents: dependents.filter(d => d.name.trim().length > 0)
        });
    };

    const handleExcessSubmit = () => {
        if (!targetExcessGroup) return;
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
        performJoin(targetExcessGroup, {
            vehicle_make_model: vMakeModel.trim(),
            vehicle_registration: vReg.trim().toUpperCase(),
            insurer_name: vInsurer.trim(),
            policy_number: vPolicy.trim(),
            vin_number: vVin.trim().toUpperCase(),
            driver_license_number: vLicense.trim(),
            join_message: excessJoinMsg.trim()
        });
    };

    const getButtonConfig = (group: Group) => {
        if (group.membership_status === 'active') {
            return {
                label: 'Joined',
                style: styles.joinedButton,
                textStyle: styles.joinedButtonText,
                disabled: true
            };
        }
        if (group.membership_status === 'pending') {
            return {
                label: 'Pending',
                style: styles.pendingButton,
                textStyle: styles.pendingButtonText,
                disabled: true
            };
        }
        return {
            label: group.requires_approval ? 'Request to Join' : 'Join Community',
            style: styles.joinButton,
            textStyle: styles.joinButtonText,
            disabled: false
        };
    };

    if (searchVisible) {
        return (
            <SearchScreen
                onClose={() => setSearchVisible(false)}
                onSelectGroup={(group) => {
                    setSearchVisible(false);
                    handleJoinGroup(group as any);
                }}
            />
        );
    }

    if (loading) {
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Explore</Text>
                </View>
                <GroupPlaceholder />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={[styles.header, { paddingTop: insets.top }]}>
                <TouchableOpacity onPress={onBack} style={styles.backButton}>
                    <Text style={styles.backButtonText}>←</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Explore Hub</Text>
                <TouchableOpacity onPress={() => setSearchVisible(true)} style={styles.searchButton}>
                    <Text style={{ fontSize: 22 }}>🔍</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.tabsContainer}>
                <TouchableOpacity
                    style={[styles.tabButton, activeTab === 'communities' && styles.tabButtonActive]}
                    onPress={() => setActiveTab('communities')}
                >
                    <Text style={[styles.tabButtonText, activeTab === 'communities' && styles.tabButtonTextActive]}>
                        Communities
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tabButton, activeTab === 'organisations' && styles.tabButtonActive]}
                    onPress={() => setActiveTab('organisations')}
                >
                    <Text style={[styles.tabButtonText, activeTab === 'organisations' && styles.tabButtonTextActive]}>
                        Organisations
                    </Text>
                </TouchableOpacity>
            </View>

            {activeTab === 'communities' ? (
                <FlatList
                    data={groups}
                    keyExtractor={(item) => `group-${item.id}`}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563eb']} tintColor="#2563eb" />
                    }
                    renderItem={({ item }) => {
                        const btn = getButtonConfig(item);
                        return (
                            <TouchableOpacity onPress={() => onViewGroupDetails?.(item)} activeOpacity={0.85}>
                                <LinearGradient colors={['#ffffff', '#f1f5f9']} style={styles.groupCard}>
                                    {item.cover_image ? (
                                        <Image source={{ uri: item.cover_image }} style={styles.coverImage} transition={200} />
                                    ) : (
                                        <View style={[styles.coverImage, { backgroundColor: '#e5e7eb' }]} />
                                    )}
                                    <View style={styles.cardContent}>
                                        <Text style={styles.groupName}>{item.name}</Text>

                                        <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginVertical: 4 }}>
                                            {item.purpose && (
                                                <View style={[
                                                    styles.cardPurposePill,
                                                    {
                                                        backgroundColor:
                                                            item.purpose === 'excess' ? '#eff6ff' :
                                                            item.purpose === 'emergency' ? '#fef2f2' :
                                                            item.purpose === 'custom' ? '#f0fdf4' : '#f5f3ff',
                                                        borderColor:
                                                            item.purpose === 'excess' ? '#bfdbfe' :
                                                            item.purpose === 'emergency' ? '#fecaca' :
                                                            item.purpose === 'custom' ? '#bbf7d0' : '#ddd6fe',
                                                        marginVertical: 0,
                                                    }
                                                ]}>
                                                    <Text style={[
                                                        styles.cardPurposeText,
                                                        {
                                                            color:
                                                                item.purpose === 'excess' ? '#0284c7' :
                                                                item.purpose === 'emergency' ? '#dc2626' :
                                                                item.purpose === 'custom' ? '#059669' : '#7c3aed'
                                                        }
                                                    ]}>
                                                        {({
                                                            'bereavement': '🕊️ Bereavement Fund',
                                                            'excess': '🚗 Insurance Excess',
                                                            'emergency': '🆘 Emergency Fundraiser',
                                                            'custom': '✨ Custom Fund',
                                                            'church': '⛪ Church Group',
                                                            'stokvel': '💰 Stokvel & Savings',
                                                            'student': '🎓 Student Body',
                                                            'sports': '⚽ Sports Club',
                                                        } as any)[item.purpose] ?? item.purpose}
                                                    </Text>
                                                </View>
                                            )}
                                            {item.verified_members_only && (
                                                <View style={[styles.cardPurposePill, { backgroundColor: '#fee2e2', borderColor: '#fecaca', marginVertical: 0 }]}>
                                                    <Text style={[styles.cardPurposeText, { color: '#dc2626', fontWeight: 'bold' }]}>🛡️ Verified Only</Text>
                                                </View>
                                            )}
                                        </View>

                                        <Text style={styles.memberCount}>{item.total_members} members</Text>
                                        <Text style={styles.description} numberOfLines={3}>
                                            {item.description || 'Connecting community members together.'}
                                        </Text>

                                        <View style={styles.actionRow}>
                                            <TouchableOpacity
                                                style={[btn.style, joiningId === item.id && styles.buttonLoading, { flex: 4 }]}
                                                onPress={() => handleJoinGroup(item)}
                                                disabled={btn.disabled || joiningId === item.id}
                                            >
                                                {joiningId === item.id ? (
                                                    <ActivityIndicator size="small" color="#ffffff" />
                                                ) : (
                                                    <Text style={btn.textStyle}>{btn.label}</Text>
                                                )}
                                            </TouchableOpacity>
                                            <TouchableOpacity style={styles.shareIconBtn} onPress={() => handleShareGroup(item)}>
                                                <Text style={styles.shareIconText}>🚀</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                </LinearGradient>
                            </TouchableOpacity>
                        );
                    }}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>No new communities found at the moment.</Text>
                        </View>
                    }
                />
            ) : (
                <FlatList
                    data={organisations}
                    keyExtractor={(item) => `org-${item.id}`}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#4f46e5']} tintColor="#4f46e5" />
                    }
                    renderItem={({ item: org }) => (
                        <TouchableOpacity onPress={() => onViewOrganisationPreview?.(org)} activeOpacity={0.85}>
                            <LinearGradient colors={['#eef2ff', '#e0e7ff']} style={[styles.groupCard, { borderColor: '#818cf8', borderWidth: 1.5 }]}>
                                {org.cover_image ? (
                                    <Image source={{ uri: org.cover_image }} style={styles.coverImage} transition={200} />
                                ) : (
                                    <LinearGradient colors={['#1e1b4b', '#312e81', '#4338ca']} style={styles.coverImage} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
                                )}
                                <View style={styles.cardContent}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 2 }}>
                                        <Text style={styles.groupName}>{org.name}</Text>
                                        {org.is_verified && (
                                            <View style={styles.verifiedBadge}>
                                                <Text style={styles.verifiedBadgeText}>🛡️ Official Org</Text>
                                            </View>
                                        )}
                                    </View>
                                    <Text style={styles.orgMetaText}>
                                        🏢 {({'ngo': 'NGO', 'church': 'Church/Religious Org', 'npo': 'NPO/Charity', 'corporate': 'Corporate', 'other': 'Organisation'}[org.entity_type] ?? org.entity_type)}
                                        {org.registration_number ? ` · Reg: ${org.registration_number}` : ''}
                                    </Text>
                                    <Text style={styles.description} numberOfLines={3}>
                                        {org.description || 'A formal organisation on the Komunity platform.'}
                                    </Text>
                                    <TouchableOpacity
                                        style={[styles.joinButton, { backgroundColor: '#4338ca', shadowColor: '#4338ca' }]}
                                        onPress={() => onViewOrganisationPreview?.(org)}
                                    >
                                        <Text style={styles.joinButtonText}>Explore Organisation →</Text>
                                    </TouchableOpacity>
                                </View>
                            </LinearGradient>
                        </TouchableOpacity>
                    )}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>No verified organisations to discover yet.</Text>
                        </View>
                    }
                />
            )}
            {/* 🕊️ BEREAVEMENT GROUP JOIN REGISTRATION MODAL */}
            <Modal
                visible={showBereavementModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => {
                    setShowBereavementModal(false);
                    setTargetBereavementGroup(null);
                }}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>🕊️ Join Bereavement Fund</Text>
                            <TouchableOpacity onPress={() => {
                                setShowBereavementModal(false);
                                setTargetBereavementGroup(null);
                            }}>
                                <Text style={styles.modalCloseText}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                            <Text style={styles.modalSubtitle}>{targetBereavementGroup?.name}</Text>
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
                            <TouchableOpacity style={styles.cancelModalBtn} onPress={() => {
                                setShowBereavementModal(false);
                                setTargetBereavementGroup(null);
                            }}>
                                <Text style={styles.cancelModalBtnText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.submitModalBtn} onPress={handleBereavementSubmit} disabled={joiningId !== null}>
                                {joiningId !== null ? (
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
                onRequestClose={() => {
                    setShowExcessModal(false);
                    setTargetExcessGroup(null);
                }}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>🚗 Join Insurance Excess</Text>
                            <TouchableOpacity onPress={() => {
                                setShowExcessModal(false);
                                setTargetExcessGroup(null);
                            }}>
                                <Text style={styles.modalCloseText}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                            <Text style={styles.modalSubtitle}>{targetExcessGroup?.name}</Text>
                            <Text style={styles.modalDesc}>Register your vehicle &amp; policy details for anti-fraud protection.</Text>

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
                            <TouchableOpacity style={styles.cancelModalBtn} onPress={() => {
                                setShowExcessModal(false);
                                setTargetExcessGroup(null);
                            }}>
                                <Text style={styles.cancelModalBtnText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.submitModalBtn, { backgroundColor: '#0284c7' }]} onPress={handleExcessSubmit} disabled={joiningId !== null}>
                                {joiningId !== null ? (
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
        backgroundColor: 'transparent',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingBottom: 12,
        backgroundColor: 'transparent',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#eff6ff',
        justifyContent: 'center',
        alignItems: 'center',
    },
    backButtonText: {
        fontSize: 24,
        color: '#2563eb',
        fontWeight: 'bold',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#111827',
    },
    searchButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        padding: 16,
        paddingBottom: 100,
    },
    groupCard: {
        borderRadius: 16,
        marginBottom: 16,
        overflow: 'hidden',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    coverImage: {
        width: '100%',
        height: 140,
    },
    cardContent: {
        padding: 16,
    },
    groupName: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 4,
    },
    memberCount: {
        fontSize: 14,
        color: '#3b82f6',
        fontWeight: '600',
        marginBottom: 8,
    },
    viewDetailsLink: {
        marginBottom: 12,
    },
    viewDetailsText: {
        fontSize: 14,
        color: '#2563eb',
        fontWeight: '600',
    },
    description: {
        fontSize: 14,
        color: '#6b7280',
        marginBottom: 16,
        lineHeight: 20,
    },
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    shareIconBtn: {
        flex: 1,
        height: 44,
        borderRadius: 12,
        backgroundColor: '#f3f4f6',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
    },
    shareIconText: {
        fontSize: 20,
    },
    // Join button (default — not yet a member)
    joinButton: {
        backgroundColor: '#2563eb',
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
        shadowColor: '#2563eb',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
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
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: '#22c55e',
    },
    joinedButtonText: {
        color: '#16a34a',
        fontWeight: 'bold',
        fontSize: 16,
    },
    // Pending approval
    pendingButton: {
        backgroundColor: '#fffbeb',
        paddingVertical: 12,
        borderRadius: 12,
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
    cardPurposePill: {
        alignSelf: 'flex-start',
        borderRadius: 8,
        borderWidth: 1,
        paddingHorizontal: 8,
        paddingVertical: 2,
        marginVertical: 4,
    },
    cardPurposeText: {
        fontSize: 11,
        fontWeight: '700',
    },
    emptyContainer: {
        padding: 40,
        alignItems: 'center',
    },
    emptyText: {
        color: '#9ca3af',
        fontSize: 16,
        textAlign: 'center',
    },
    verifiedBadge: {
        backgroundColor: '#e0e7ff',
        borderRadius: 20,
        paddingHorizontal: 7,
        paddingVertical: 1,
        borderWidth: 1,
        borderColor: '#818cf8',
    },
    verifiedBadgeText: {
        color: '#3730a3',
        fontSize: 10,
        fontWeight: '700',
    },
    tabsContainer: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: '#ffffff',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
        gap: 12,
    },
    tabButton: {
        flex: 1,
        paddingVertical: 8,
        borderRadius: 20,
        alignItems: 'center',
        backgroundColor: '#f3f4f6',
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    tabButtonActive: {
        backgroundColor: '#eff6ff',
        borderColor: '#3b82f6',
    },
    tabButtonText: {
        fontSize: 14,
        color: '#6b7280',
        fontWeight: '600',
        fontFamily: 'Outfit-Regular',
    },
    tabButtonTextActive: {
        color: '#3b82f6',
        fontWeight: '700',
    },
    orgMetaText: {
        fontSize: 12,
        color: '#475569',
        fontWeight: '500',
        marginBottom: 4,
        fontFamily: 'Outfit-Regular',
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

export default DiscoveryScreen;
