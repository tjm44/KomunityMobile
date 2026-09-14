import React from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../constants/theme';

interface OrganisationPreviewScreenProps {
    organisation: any;
    onBack: () => void;
    onExplore: () => void;
}

const OrganisationPreviewScreen = ({
    organisation,
    onBack,
    onExplore
}: OrganisationPreviewScreenProps) => {
    const insets = useSafeAreaInsets();

    const entityLabels: Record<string, string> = {
        ngo: 'NGO',
        church: 'Church / Faith-based',
        npo: 'NPO / Charity Trust',
        corporate: 'Corporate / Business',
        other: 'Organisation'
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
                {/* Hero / Cover */}
                <View style={styles.heroSection}>
                    {organisation.cover_image ? (
                        <Image source={{ uri: organisation.cover_image }} style={styles.coverImage} />
                    ) : (
                        <LinearGradient
                            colors={[colors.primaryDark, colors.primary, colors.primaryLight]}
                            style={styles.coverImage}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        />
                    )}

                    <View style={styles.heroOverlay}>
                        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
                            <Text style={styles.backBtnText}>←</Text>
                        </TouchableOpacity>

                        <View style={styles.orgMetaInfo}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                <Text style={styles.orgName}>{organisation.name}</Text>
                                {organisation.is_verified && (
                                    <View style={styles.verifiedBadge}>
                                        <Text style={styles.verifiedBadgeText}>🛡️ Official Trusted</Text>
                                    </View>
                                )}
                            </View>
                            <Text style={styles.entityLabel}>
                                🏢 {entityLabels[organisation.entity_type] || 'Organisation'}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Body Content */}
                <View style={styles.contentBody}>
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>About the Organisation</Text>
                        <Text style={styles.descText}>
                            {organisation.description || 'No description available for this organisation.'}
                        </Text>
                    </View>

                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Registry Verification Details</Text>
                        <View style={styles.registryRow}>
                            <Text style={styles.registryLabel}>Registration ID</Text>
                            <Text style={styles.registryValue}>{organisation.registration_number || 'Unprovided'}</Text>
                        </View>
                        <View style={styles.registryRow}>
                            <Text style={styles.registryLabel}>Legal Identity Type</Text>
                            <Text style={styles.registryValue}>{(organisation.entity_type || 'other').toUpperCase()}</Text>
                        </View>
                        <View style={styles.registryRow}>
                            <Text style={styles.registryLabel}>Official Status</Text>
                            <Text style={[styles.registryValue, { color: organisation.is_verified ? colors.primary : '#b45309' }]}>
                                {organisation.is_verified ? '🛡️ Trusted Corporate Entity' : '⚠️ Registry Pending Verification'}
                            </Text>
                        </View>
                    </View>

                    {/* Action controls */}
                    <TouchableOpacity style={styles.exploreBtn} onPress={onExplore}>
                        <LinearGradient
                            colors={[colors.primary, colors.primaryLight, colors.accent]}
                            style={styles.btnGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                        >
                            <Text style={styles.exploreBtnText}>Enter Organisation Workspace →</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    heroSection: { height: 260, position: 'relative' },
    coverImage: { width: '100%', height: '100%' },
    heroOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.55)',
        justifyContent: 'space-between',
        padding: 20,
    },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255, 255, 255, 0.9)', justifyContent: 'center', alignItems: 'center' },
    backBtnText: { fontSize: 20, fontWeight: 'bold', color: colors.primaryDark },
    orgMetaInfo: { marginTop: 'auto' },
    orgName: { fontSize: 24, fontWeight: 'bold', color: colors.white, fontFamily: 'Outfit-Bold' },
    verifiedBadge: { backgroundColor: colors.surfaceLight, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1, borderColor: colors.accentLight },
    verifiedBadgeText: { color: colors.primary, fontSize: 11, fontWeight: '700' },
    entityLabel: { fontSize: 14, color: colors.surfaceLight, marginTop: 4, fontWeight: '600', fontFamily: 'Outfit-Regular' },
    contentBody: { padding: 20, gap: 16 },
    card: { backgroundColor: colors.white, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: colors.surfaceLight },
    cardTitle: { fontSize: 16, fontWeight: 'bold', color: colors.primaryDark, marginBottom: 12, fontFamily: 'Outfit-Bold' },
    descText: { fontSize: 14, color: colors.textSecondary, lineHeight: 22, fontFamily: 'Outfit-Regular' },
    registryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
    registryLabel: { fontSize: 14, color: colors.textSecondary, fontWeight: '500', fontFamily: 'Outfit-Regular' },
    registryValue: { fontSize: 14, color: colors.primary, fontWeight: '700', fontFamily: 'Outfit-Bold' },
    exploreBtn: {
        borderRadius: 12,
        overflow: 'hidden',
        marginTop: 10,
        elevation: 3,
    },
    btnGradient: {
        paddingVertical: 16,
        alignItems: 'center',
    },
    exploreBtnText: { color: colors.white, fontWeight: 'bold', fontSize: 16, fontFamily: 'Outfit-Bold' },
});

export default OrganisationPreviewScreen;
