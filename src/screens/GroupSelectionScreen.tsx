import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface GroupSelectionProps {
    onJoin: () => void;
    onCreate: () => void;
    onCreateOrganisation?: () => void;
}

const GroupSelectionScreen = ({ onJoin, onCreate, onCreateOrganisation }: GroupSelectionProps) => {
    return (
        <View style={styles.container}>
            <View style={styles.content}>
                <View style={styles.header}>
                    <Text style={styles.title}>You're almost there!</Text>
                    <Text style={styles.subtitle}>
                        Communities are the heart of Komunity. How would you like to get started?
                    </Text>
                </View>

                <View style={styles.options}>
                    {/* Join existing */}
                    <TouchableOpacity style={styles.card} onPress={onJoin}>
                        <View style={[styles.iconContainer, { backgroundColor: '#eff6ff' }]}>
                            <Text style={styles.icon}>🔍</Text>
                        </View>
                        <View style={styles.cardText}>
                            <Text style={styles.cardTitle}>Join a Community</Text>
                            <Text style={styles.cardSubtitle}>
                                Find and join existing groups near you or with shared interests.
                            </Text>
                        </View>
                        <Text style={styles.arrow}>›</Text>
                    </TouchableOpacity>

                    {/* Create new */}
                    <TouchableOpacity style={styles.card} onPress={onCreate}>
                        <View style={[styles.iconContainer, { backgroundColor: '#ecfdf5' }]}>
                            <Text style={styles.icon}>➕</Text>
                        </View>
                        <View style={styles.cardText}>
                            <Text style={styles.cardTitle}>Create a Community</Text>
                            <Text style={styles.cardSubtitle}>
                                Start your own group — for bereavement support, insurance excess,
                                emergency fundraising, or any custom purpose.
                            </Text>
                        </View>
                        <Text style={styles.arrow}>›</Text>
                    </TouchableOpacity>

                    {/* Register Organisation */}
                    {onCreateOrganisation && (
                        <TouchableOpacity style={[styles.card, { borderColor: '#99f6e4' }]} onPress={onCreateOrganisation}>
                            <View style={[styles.iconContainer, { backgroundColor: '#f0fdfa' }]}> 
                                <Text style={styles.icon}>🏢</Text>
                            </View>
                            <View style={styles.cardText}>
                                <Text style={[styles.cardTitle, { color: '#0f766e' }]}>Register an Organisation</Text>
                                <Text style={styles.cardSubtitle}>
                                    Set up a formal, verified legal entity (NGO, Church, NPO, Corporate)
                                    to manage wallets and coordinate campaigns.
                                </Text>
                            </View>
                            <Text style={[styles.arrow, { color: '#0f766e' }]}>›</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#ffffff',
    },
    content: {
        flex: 1,
        padding: 24,
        justifyContent: 'center',
    },
    header: {
        marginBottom: 48,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 12,
        fontFamily: 'Outfit-Bold',
    },
    subtitle: {
        fontSize: 18,
        color: '#6b7280',
        lineHeight: 28,
        fontFamily: 'Outfit-Regular',
    },
    options: {
        gap: 20,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    iconContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    icon: {
        fontSize: 30,
    },
    cardText: {
        flex: 1,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 4,
        fontFamily: 'Outfit-Bold',
    },
    cardSubtitle: {
        fontSize: 14,
        color: '#6b7280',
        lineHeight: 20,
        fontFamily: 'Outfit-Regular',
    },
    arrow: {
        fontSize: 24,
        color: '#d1d5db',
        marginLeft: 8,
    },
    registerOrgContainer: {
        marginTop: 20,
        alignItems: 'center',
    },
    registerOrgButton: {
        backgroundColor: '#0f766e',
        paddingHorizontal: 18,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#085f52',
    },
    registerOrgButtonText: {
        color: '#ffffff',
        fontWeight: '700',
        fontSize: 16,
    },
});

export default GroupSelectionScreen;
