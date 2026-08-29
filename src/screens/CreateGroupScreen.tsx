import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity,
    ScrollView, Alert, ActivityIndicator, Switch, Platform, KeyboardAvoidingView
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import client from '../api/client';
import { validateName } from '../utils/validation';
import type { GroupPurpose } from './GroupPurposeScreen';
import { colors, gradients } from '../constants/theme';

const PURPOSE_META: Record<GroupPurpose, { label: string; icon: string; color: string }> = {
    bereavement: { label: 'Bereavement Fund', icon: '🕊️', color: colors.primary },
    excess:      { label: 'Insurance Excess', icon: '🚗', color: colors.primaryLight },
    custom:      { label: 'Custom Fund', icon: '✨', color: colors.primaryLight },
    emergency:   { label: 'Emergency Fund', icon: '🆘', color: colors.danger },
    church:      { label: 'Church / Religious', icon: '⛪', color: colors.primaryLight },
    stokvel:     { label: 'Stokvel & Savings', icon: '💰', color: colors.success },
    student:     { label: 'Student Body', icon: '🎓', color: colors.warning },
    sports:      { label: 'Sports Club', icon: '⚽', color: colors.success },
};

interface CreateGroupScreenProps {
    onBack: () => void;
    onGroupCreated: (group: any) => void;
    purpose?: GroupPurpose;
    fund_description?: string;
}

/** A simple inline picker using pill buttons */
const PillPicker = ({ label, options, value, onChange, color }: {
    label: string;
    options: { value: string; label: string }[];
    value: string;
    onChange: (v: string) => void;
    color: string;
}) => (
    <View style={{ marginBottom: 12 }}>
        <Text style={[styles.label, { fontSize: 13, color: colors.textSecondary, marginBottom: 6 }]}>{label}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {options.map(opt => {
                const isActive = value === opt.value;
                return (
                    <TouchableOpacity
                        key={opt.value}
                        onPress={() => onChange(opt.value)}
                        style={[
                            styles.entityPill,
                            isActive && { backgroundColor: `${color}18`, borderColor: color },
                        ]}
                        activeOpacity={0.75}
                    >
                        <Text style={[styles.entityPillText, isActive && { color, fontWeight: '700' }]}>
                            {opt.label}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    </View>
);

const CreateGroupScreen = ({
    onBack,
    onGroupCreated,
    purpose,
    fund_description = '',
}: CreateGroupScreenProps) => {
    const insets = useSafeAreaInsets();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [requiresApproval, setRequiresApproval] = useState(false);
    const [verifiedMembersOnly, setVerifiedMembersOnly] = useState(false);
    const [loading, setLoading] = useState(false);
    const [nameError, setNameError] = useState<string | null>(null);

    // ── Bereavement ────────────────────────────────────────────────────────────
    const [contributionSchedule, setContributionSchedule] = useState('event_driven');

    // ── Church ─────────────────────────────────────────────────────────────────
    const [denomination, setDenomination] = useState('');
    const [branchParishName, setBranchParishName] = useState('');
    const [defaultTitheAmount, setDefaultTitheAmount] = useState('');
    const [enableFaithPledges, setEnableFaithPledges] = useState(true);
    const [enableTaxReceipts, setEnableTaxReceipts] = useState(false);

    // ── Stokvel ────────────────────────────────────────────────────────────────
    const [stokvelType, setStokvelType] = useState('rotational_payout');
    const [cycleFrequency, setCycleFrequency] = useState('monthly');
    const [payoutRotationMode, setPayoutRotationMode] = useState('fixed_sequence');
    const [stokvelContributionAmount, setStokvelContributionAmount] = useState('');
    const [penaltyLateFee, setPenaltyLateFee] = useState('');
    const [borrowingAllowed, setBorrowingAllowed] = useState(false);

    // ── Student ────────────────────────────────────────────────────────────────
    const [institutionName, setInstitutionName] = useState('');
    const [campusName, setCampusName] = useState('');
    const [studentBodyType, setStudentBodyType] = useState('faculty_society');
    const [studentMembershipFee, setStudentMembershipFee] = useState('');
    const [membershipFeePeriod, setMembershipFeePeriod] = useState('annual');
    const [studentIdRequired, setStudentIdRequired] = useState(true);

    // ── Sports ─────────────────────────────────────────────────────────────────
    const [sportCategory, setSportCategory] = useState('soccer');
    const [clubLevel, setClubLevel] = useState('social_recreational');
    const [sportsMembershipFee, setSportsMembershipFee] = useState('');
    const [duesFrequency, setDuesFrequency] = useState('monthly');
    const [matchFeePerGame, setMatchFeePerGame] = useState('');
    const [kitEquipmentFundEnabled, setKitEquipmentFundEnabled] = useState(true);

    const meta = purpose ? PURPOSE_META[purpose] : { label: 'Select Fund Type', icon: '❓', color: colors.textSecondary };
    const canCreate = !!purpose;

    const handleCreateGroup = async () => {
        const error = validateName(name, 'Community Name');
        if (error) {
            setNameError(error);
            return;
        }

        if (!purpose) {
            Alert.alert('Select Fund Type', 'Please choose a fund type before creating your community.');
            return;
        }

        setNameError(null);
        setLoading(true);
        try {
            const payload: any = {
                name: name.trim(),
                description: description.trim(),
                requires_approval: requiresApproval,
                verified_members_only: verifiedMembersOnly,
                purpose,
                fund_description: purpose === 'custom' ? fund_description : '',
            };

            if (purpose === 'bereavement') {
                payload.bereavement_profile = {
                    contribution_schedule: contributionSchedule,
                };
            } else if (purpose === 'church') {
                payload.church_profile = {
                    denomination: denomination.trim(),
                    branch_parish_name: branchParishName.trim(),
                    default_tithe_amount: parseFloat(defaultTitheAmount) || null,
                    enable_faith_pledges: enableFaithPledges,
                    enable_tax_receipts: enableTaxReceipts,
                };
            } else if (purpose === 'stokvel') {
                payload.stokvel_profile = {
                    stokvel_type: stokvelType,
                    cycle_frequency: cycleFrequency,
                    payout_rotation_mode: payoutRotationMode,
                    contribution_amount: parseFloat(stokvelContributionAmount) || 0.00,
                    penalty_late_fee: parseFloat(penaltyLateFee) || 0.00,
                    borrowing_allowed: borrowingAllowed,
                };
            } else if (purpose === 'student') {
                payload.student_profile = {
                    institution_name: institutionName.trim(),
                    campus_name: campusName.trim(),
                    student_body_type: studentBodyType,
                    student_id_required: studentIdRequired,
                    membership_fee: parseFloat(studentMembershipFee) || 0.00,
                    membership_fee_period: membershipFeePeriod,
                };
            } else if (purpose === 'sports') {
                payload.sports_profile = {
                    sport_category: sportCategory,
                    club_level: clubLevel,
                    membership_fee: parseFloat(sportsMembershipFee) || 0.00,
                    dues_frequency: duesFrequency,
                    match_fee_per_game: parseFloat(matchFeePerGame) || 0.00,
                    kit_equipment_fund_enabled: kitEquipmentFundEnabled,
                };
            }

            const response = await client.post('groups/', payload);

            Alert.alert('Success 👥', `Community "${name}" has been created successfully!`);
            onGroupCreated(response.data);
        } catch (error) {
            console.error('Error creating group:', error);
            Alert.alert('Error', 'Failed to create community. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView
                    contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 24) + 100 }]}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Purpose Badge */}
                    <View style={[styles.purposeBadge, { backgroundColor: `${meta.color}18`, borderColor: `${meta.color}40` }]}>
                        <Text style={styles.purposeIcon}>{meta.icon}</Text>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.purposeLabel, { color: meta.color }]}>{meta.label}</Text>
                            {purpose === 'custom' && fund_description ? (
                                <Text style={styles.purposeDesc} numberOfLines={2}>{fund_description}</Text>
                            ) : null}
                        </View>
                    </View>

                    {/* Community Name */}
                    <View style={styles.formSection}>
                        <Text style={styles.label}>Community Name *</Text>
                        <TextInput
                            style={[styles.input, nameError && styles.inputError]}
                            placeholder="e.g. Grace Fellowship / Sunshine Stokvel"
                            value={name}
                            onChangeText={(text) => {
                                setName(text);
                                if (nameError) setNameError(null);
                            }}
                        />
                        {nameError && <Text style={styles.errorText}>{nameError}</Text>}
                    </View>

                    {/* Description */}
                    <View style={styles.formSection}>
                        <Text style={styles.label}>Description</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            placeholder="What is this community about?"
                            value={description}
                            onChangeText={setDescription}
                            multiline
                            numberOfLines={4}
                        />
                    </View>

                    {/* ── BEREAVEMENT ── */}
                    {purpose === 'bereavement' && (
                        <View style={[styles.profileSection, { borderLeftColor: colors.primary, backgroundColor: colors.surfaceLight }]}>
                            <Text style={[styles.profileSectionTitle, { color: colors.primary }]}>🕊️ Bereavement Fund Settings</Text>
                            <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 10, fontFamily: 'Outfit-Regular', lineHeight: 18 }}>
                                Beneficiary details, payout amounts, and dependent info are collected from each member when they join the group.
                            </Text>
                            <PillPicker
                                label="Contribution Schedule"
                                value={contributionSchedule}
                                onChange={setContributionSchedule}
                                color="#7c3aed"
                                options={[
                                    { value: 'event_driven', label: 'Per Bereavement Event' },
                                    { value: 'monthly', label: 'Monthly' },
                                    { value: 'annual', label: 'Annual' },
                                ]}
                            />
                        </View>
                    )}

                    {/* ── CHURCH ── */}
                    {purpose === 'church' && (
                        <View style={[styles.profileSection, { borderLeftColor: colors.primaryLight, backgroundColor: colors.surfaceLight }]}>
                            <Text style={[styles.profileSectionTitle, { color: colors.primaryLight }]}>⛪ Church & Ministry Settings</Text>
                            <TextInput style={styles.input} placeholder="Denomination (e.g. Pentecostal)" value={denomination} onChangeText={setDenomination} />
                            <TextInput style={[styles.input, { marginTop: 8 }]} placeholder="Branch / Parish Name" value={branchParishName} onChangeText={setBranchParishName} />
                            <TextInput style={[styles.input, { marginTop: 8 }]} placeholder="Default Monthly Tithe (R, optional)" value={defaultTitheAmount} onChangeText={setDefaultTitheAmount} keyboardType="numeric" />
                            <View style={[styles.settingRow, { marginBottom: 0, marginTop: 12, backgroundColor: 'transparent', padding: 0 }]}>
                                <Text style={{ fontSize: 14, color: colors.textSecondary, flex: 1, fontFamily: 'Outfit-Regular' }}>Enable Faith Pledges</Text>
                                <Switch value={enableFaithPledges} onValueChange={setEnableFaithPledges} trackColor={{ false: colors.border, true: '#0284c766' }} thumbColor={enableFaithPledges ? colors.primaryLight : '#f4f3f4'} />
                            </View>
                            <View style={[styles.settingRow, { marginBottom: 0, marginTop: 8, backgroundColor: 'transparent', padding: 0 }]}>
                                <Text style={{ fontSize: 14, color: colors.textSecondary, flex: 1, fontFamily: 'Outfit-Regular' }}>Section 18A Tax Receipts</Text>
                                <Switch value={enableTaxReceipts} onValueChange={setEnableTaxReceipts} trackColor={{ false: colors.border, true: '#0284c766' }} thumbColor={enableTaxReceipts ? colors.primaryLight : '#f4f3f4'} />
                            </View>
                        </View>
                    )}

                    {/* ── STOKVEL ── */}
                    {purpose === 'stokvel' && (
                        <View style={[styles.profileSection, { borderLeftColor: colors.success, backgroundColor: colors.successLight }]}>
                            <Text style={[styles.profileSectionTitle, { color: colors.success }]}>💰 Stokvel Savings & Pool Settings</Text>
                            <PillPicker
                                label="Stokvel Category"
                                value={stokvelType}
                                onChange={setStokvelType}
                                color="#059669"
                                options={[
                                    { value: 'rotational_payout', label: 'ROSCA / Mahodisana' },
                                    { value: 'savings_and_investment', label: 'Savings & Investment' },
                                    { value: 'grocery', label: 'Grocery & Festive' },
                                    { value: 'burial', label: 'Burial Stokvel' },
                                ]}
                            />
                            <PillPicker
                                label="Rotation Mode"
                                value={payoutRotationMode}
                                onChange={setPayoutRotationMode}
                                color="#059669"
                                options={[
                                    { value: 'fixed_sequence', label: 'Fixed Sequence' },
                                    { value: 'random_draw', label: 'Random Draw' },
                                    { value: 'bidding', label: 'Bidding / Auction' },
                                    { value: 'request_on_need', label: 'Request on Need' },
                                ]}
                            />
                            <PillPicker
                                label="Cycle Frequency"
                                value={cycleFrequency}
                                onChange={setCycleFrequency}
                                color="#059669"
                                options={[
                                    { value: 'monthly', label: 'Monthly' },
                                    { value: 'weekly', label: 'Weekly' },
                                    { value: 'biweekly', label: 'Bi-weekly' },
                                    { value: 'annual', label: 'Annual' },
                                ]}
                            />
                            <View style={{ flexDirection: 'row', gap: 8 }}>
                                <TextInput style={[styles.input, { flex: 1 }]} placeholder="Cycle Contribution (R)" value={stokvelContributionAmount} onChangeText={setStokvelContributionAmount} keyboardType="numeric" />
                                <TextInput style={[styles.input, { flex: 1 }]} placeholder="Late Fee Penalty (R)" value={penaltyLateFee} onChangeText={setPenaltyLateFee} keyboardType="numeric" />
                            </View>
                            <View style={[styles.settingRow, { marginBottom: 0, marginTop: 12, backgroundColor: 'transparent', padding: 0 }]}>
                                <Text style={{ fontSize: 14, color: colors.textSecondary, flex: 1, fontFamily: 'Outfit-Regular' }}>Allow Member Loans / Borrowing</Text>
                                <Switch value={borrowingAllowed} onValueChange={setBorrowingAllowed} trackColor={{ false: colors.border, true: '#05996966' }} thumbColor={borrowingAllowed ? colors.success : '#f4f3f4'} />
                            </View>
                        </View>
                    )}

                    {/* ── STUDENT ── */}
                    {purpose === 'student' && (
                        <View style={[styles.profileSection, { borderLeftColor: colors.warning, backgroundColor: colors.warningLight }]}>
                            <Text style={[styles.profileSectionTitle, { color: colors.warning }]}>🎓 Student Society Settings</Text>
                            <TextInput style={styles.input} placeholder="Institution Name (e.g. UCT / Wits)" value={institutionName} onChangeText={setInstitutionName} />
                            <TextInput style={[styles.input, { marginTop: 8 }]} placeholder="Campus Name" value={campusName} onChangeText={setCampusName} />
                            <View style={{ marginTop: 12 }}>
                                <PillPicker
                                    label="Student Body Type"
                                    value={studentBodyType}
                                    onChange={setStudentBodyType}
                                    color="#d97706"
                                    options={[
                                        { value: 'faculty_society', label: 'Faculty Society' },
                                        { value: 'residence_committee', label: 'Res Committee' },
                                        { value: 'student_representative_council', label: 'SRC' },
                                        { value: 'sports_res', label: 'Res Sports Club' },
                                        { value: 'study_group', label: 'Study Group' },
                                    ]}
                                />
                                <PillPicker
                                    label="Fee Period"
                                    value={membershipFeePeriod}
                                    onChange={setMembershipFeePeriod}
                                    color="#d97706"
                                    options={[
                                        { value: 'annual', label: 'Annual' },
                                        { value: 'per_semester', label: 'Per Semester' },
                                        { value: 'once_off', label: 'Once-off' },
                                    ]}
                                />
                            </View>
                            <TextInput style={styles.input} placeholder="Membership Fee (R)" value={studentMembershipFee} onChangeText={setStudentMembershipFee} keyboardType="numeric" />
                            <View style={[styles.settingRow, { marginBottom: 0, marginTop: 12, backgroundColor: 'transparent', padding: 0 }]}>
                                <Text style={{ fontSize: 14, color: colors.textSecondary, flex: 1, fontFamily: 'Outfit-Regular' }}>Require Student Reg Number</Text>
                                <Switch value={studentIdRequired} onValueChange={setStudentIdRequired} trackColor={{ false: colors.border, true: '#d9770666' }} thumbColor={studentIdRequired ? colors.warning : '#f4f3f4'} />
                            </View>
                        </View>
                    )}

                    {/* ── SPORTS ── */}
                    {purpose === 'sports' && (
                        <View style={[styles.profileSection, { borderLeftColor: colors.success, backgroundColor: colors.successLight }]}>
                            <Text style={[styles.profileSectionTitle, { color: colors.success }]}>⚽ Sports Club Settings</Text>
                            <PillPicker
                                label="Sport Category"
                                value={sportCategory}
                                onChange={setSportCategory}
                                color="#10b981"
                                options={[
                                    { value: 'soccer', label: 'Soccer / Football' },
                                    { value: 'rugby', label: 'Rugby' },
                                    { value: 'netball', label: 'Netball' },
                                    { value: 'running_athletics', label: 'Athletics' },
                                    { value: 'cricket', label: 'Cricket' },
                                    { value: 'basketball', label: 'Basketball' },
                                    { value: 'swimming', label: 'Swimming' },
                                    { value: 'golf', label: 'Golf' },
                                    { value: 'other', label: 'Other' },
                                ]}
                            />
                            <PillPicker
                                label="Competition Level"
                                value={clubLevel}
                                onChange={setClubLevel}
                                color="#10b981"
                                options={[
                                    { value: 'social_recreational', label: 'Social / Rec' },
                                    { value: 'amateur_league', label: 'Amateur League' },
                                    { value: 'university_league', label: 'University' },
                                    { value: 'youth_academy', label: 'Youth Academy' },
                                    { value: 'semi_professional', label: 'Semi-Pro' },
                                ]}
                            />
                            <PillPicker
                                label="Dues Frequency"
                                value={duesFrequency}
                                onChange={setDuesFrequency}
                                color="#10b981"
                                options={[
                                    { value: 'monthly', label: 'Monthly' },
                                    { value: 'per_season', label: 'Per Season' },
                                    { value: 'annual', label: 'Annual' },
                                ]}
                            />
                            <View style={{ flexDirection: 'row', gap: 8 }}>
                                <TextInput style={[styles.input, { flex: 1 }]} placeholder="Monthly Dues (R)" value={sportsMembershipFee} onChangeText={setSportsMembershipFee} keyboardType="numeric" />
                                <TextInput style={[styles.input, { flex: 1 }]} placeholder="Per Match Fee (R)" value={matchFeePerGame} onChangeText={setMatchFeePerGame} keyboardType="numeric" />
                            </View>
                            <View style={[styles.settingRow, { marginBottom: 0, marginTop: 12, backgroundColor: 'transparent', padding: 0 }]}>
                                <Text style={{ fontSize: 14, color: colors.textSecondary, flex: 1, fontFamily: 'Outfit-Regular' }}>Enable Kit & Equipment Fund</Text>
                                <Switch value={kitEquipmentFundEnabled} onValueChange={setKitEquipmentFundEnabled} trackColor={{ false: colors.border, true: '#10b98166' }} thumbColor={kitEquipmentFundEnabled ? colors.success : '#f4f3f4'} />
                            </View>
                        </View>
                    )}

                    {/* ── EMERGENCY notice ── */}
                    {purpose === 'emergency' && (
                        <View style={[styles.infoBox, { backgroundColor: colors.dangerLight, borderColor: colors.dangerLight }]}>
                            <Text style={[styles.infoText, { color: colors.danger }]}>
                                🆘 Emergency Fundraisers are only available to verified NGO or Church accounts.
                                Once created, your campaign will be publicly visible to all Komunity users.
                            </Text>
                        </View>
                    )}

                    {/* Governance Settings */}
                    <View style={styles.settingRow}>
                        <View style={styles.settingText}>
                            <Text style={styles.settingLabel}>Require Approval</Text>
                            <Text style={styles.settingDescription}>New members must be approved by an admin.</Text>
                        </View>
                        <Switch
                            value={requiresApproval}
                            onValueChange={setRequiresApproval}
                            trackColor={{ false: colors.border, true: colors.accentLight }}
                            thumbColor={requiresApproval ? colors.primaryLight : '#f4f3f4'}
                        />
                    </View>

                    <View style={styles.settingRow}>
                        <View style={styles.settingText}>
                            <Text style={styles.settingLabel}>Verified Members Only 🛡️</Text>
                            <Text style={styles.settingDescription}>Only allow verified user profiles to join this community.</Text>
                        </View>
                        <Switch
                            value={verifiedMembersOnly}
                            onValueChange={setVerifiedMembersOnly}
                            trackColor={{ false: colors.border, true: colors.accentLight }}
                            thumbColor={verifiedMembersOnly ? colors.primaryLight : '#f4f3f4'}
                        />
                    </View>

                    <View style={styles.infoBox}>
                        <Text style={styles.infoText}>
                            💡 As the creator, you'll automatically become the community admin with full management rights.
                        </Text>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Footer */}
            <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 24) }]}>
                <TouchableOpacity
                    style={[styles.createButton, (!canCreate || loading) && styles.buttonDisabled]}
                    onPress={handleCreateGroup}
                    disabled={!canCreate || loading}
                    activeOpacity={0.85}
                >
                    {loading ? (
                        <ActivityIndicator color="#ffffff" />
                    ) : (
                        <Text style={styles.createButtonText}>
                            {canCreate ? `Launch Community ${meta.icon}` : 'Choose Fund Type First'}
                        </Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity onPress={onBack} style={styles.cancelButton}>
                    <Text style={styles.cancelButtonText}>← Change Purpose</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.white },
    scrollContent: { padding: 24 },
    purposeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 14,
        padding: 14,
        marginBottom: 24,
        gap: 12,
    },
    purposeIcon: { fontSize: 28 },
    purposeLabel: { fontSize: 15, fontWeight: '700', fontFamily: 'Outfit-Bold' },
    purposeDesc: { fontSize: 12, color: colors.textSecondary, marginTop: 2, fontFamily: 'Outfit-Regular' },
    formSection: { marginBottom: 24 },
    label: { fontSize: 16, fontWeight: 'bold', color: colors.textSecondary, marginBottom: 8, fontFamily: 'Outfit-Bold' },
    input: {
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        color: colors.textPrimary,
        fontFamily: 'Outfit-Regular',
    },
    textArea: { height: 120, textAlignVertical: 'top' },
    inputError: { borderColor: colors.danger, backgroundColor: colors.dangerLight },
    errorText: { color: colors.danger, fontSize: 12, marginTop: 4, marginLeft: 4, fontWeight: '500' },
    profileSection: {
        padding: 14,
        borderRadius: 12,
        marginBottom: 20,
        borderLeftWidth: 4,
    },
    profileSectionTitle: {
        fontWeight: '700',
        fontSize: 14,
        marginBottom: 12,
        fontFamily: 'Outfit-Bold',
    },
    settingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.background,
        padding: 16,
        borderRadius: 12,
        marginBottom: 24,
    },
    settingText: { flex: 1, marginRight: 16 },
    settingLabel: { fontSize: 16, fontWeight: 'bold', color: colors.textPrimary, fontFamily: 'Outfit-Bold' },
    settingDescription: { fontSize: 14, color: colors.textSecondary, marginTop: 2, fontFamily: 'Outfit-Regular' },
    infoBox: {
        backgroundColor: colors.surfaceLight,
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.surfaceLight,
        marginBottom: 16,
    },
    infoText: { fontSize: 14, color: colors.primary, lineHeight: 20, fontFamily: 'Outfit-Regular' },
    footer: { padding: 24, borderTopWidth: 1, borderTopColor: colors.surfaceLight },
    createButton: {
        backgroundColor: colors.primaryLight,
        borderRadius: 12,
        padding: 18,
        alignItems: 'center',
        marginBottom: 12,
    },
    buttonDisabled: { opacity: 0.5 },
    createButtonText: { color: colors.white, fontWeight: 'bold', fontSize: 17, fontFamily: 'Outfit-Bold' },
    cancelButton: { padding: 12, alignItems: 'center' },
    cancelButtonText: { color: colors.textSecondary, fontSize: 15, fontWeight: '500', fontFamily: 'Outfit-Regular' },
    entityPill: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.background,
        marginBottom: 8,
        marginRight: 6,
    },
    entityPillText: {
        fontSize: 13,
        color: colors.textSecondary,
        fontWeight: '500',
        fontFamily: 'Outfit-Regular',
    },
});

export default CreateGroupScreen;
