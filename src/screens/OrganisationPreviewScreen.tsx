import React from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

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
                            colors={['#0f766e', '#115e59']}
                            style={styles.coverImage}
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
                                        <Text style={styles.verifiedBadgeText}>✅ Verified</Text>
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
                            <Text style={[styles.registryValue, { color: organisation.is_verified ? '#0f766e' : '#b45309' }]}>
                                {organisation.is_verified ? '🛡️ Trusted Entity' : '⚠️ Registry Pending Verification'}
                            </Text>
                        </View>
                    </View>

                    {/* Action controls */}
                    <TouchableOpacity style={styles.exploreBtn} onPress={onExplore}>
                        <Text style={styles.exploreBtnText}>Enter Organisation Workspace →</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    heroSection: { height: 260, position: 'relative' },
    coverImage: { width: '100%', height: '100%' },
    heroOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
        justifyContent: 'space-between',
        padding: 20,
    },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255, 255, 255, 0.9)', justifyContent: 'center', alignItems: 'center' },
    backBtnText: { fontSize: 20, fontWeight: 'bold', color: '#0f766e' },
    orgMetaInfo: { marginTop: 'auto' },
    orgName: { fontSize: 24, fontWeight: 'bold', color: '#ffffff', fontFamily: 'Outfit-Bold' },
    verifiedBadge: { backgroundColor: '#ccfbf1', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1, borderColor: '#2dd4bf' },
    verifiedBadgeText: { color: '#115e59', fontSize: 11, fontWeight: '700' },
    entityLabel: { fontSize: 14, color: '#e2e8f0', marginTop: 4, fontWeight: '600', fontFamily: 'Outfit-Regular' },
    contentBody: { padding: 20, gap: 16 },
    card: { backgroundColor: '#ffffff', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#f1f5f9' },
    cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#1e293b', marginBottom: 12, fontFamily: 'Outfit-Bold' },
    descText: { fontSize: 14, color: '#475569', lineHeight: 22, fontFamily: 'Outfit-Regular' },
    registryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    registryLabel: { fontSize: 14, color: '#64748b', fontWeight: '500', fontFamily: 'Outfit-Regular' },
    registryValue: { fontSize: 14, color: '#0f766e', fontWeight: '700', fontFamily: 'Outfit-Bold' },
    exploreBtn: {
        backgroundColor: '#0f766e',
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        marginTop: 10,
        shadowColor: '#0f766e',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        elevation: 3,
    },
    exploreBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 16, fontFamily: 'Outfit-Bold' },
});

export default OrganisationPreviewScreen;
