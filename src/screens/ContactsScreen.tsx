import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, Share } from 'react-native';
import * as Contacts from 'expo-contacts/legacy';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as SMS from 'expo-sms';
import { Ionicons } from '@expo/vector-icons';
import { colors, gradients } from '../constants/theme';
import { shareToWhatsApp } from '../utils/whatsappShare';

interface ContactsScreenProps {
    onBack?: () => void;
    groupId?: number; // Optional: If inviting to a specific group
}

const ContactsScreen = ({ onBack, groupId }: ContactsScreenProps) => {
    const insets = useSafeAreaInsets();
    const [contacts, setContacts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [permissionStatus, setPermissionStatus] = useState<string | null>(null);

    const inviteLink = groupId
        ? `https://komunity.app/group/${groupId}/join`
        : 'https://komunity.app/invite';

    useEffect(() => {
        (async () => {
            const { status } = await Contacts.requestPermissionsAsync();
            setPermissionStatus(status);

            if (status === 'granted') {
                const { data } = await Contacts.getContactsAsync({
                    fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Emails, Contacts.Fields.Image],
                });

                if (data.length > 0) {
                    setContacts(data);
                }
            } else {
                Alert.alert("Permission Required", "We need access to contacts to invite your friends.");
            }
            setLoading(false);
        })();
    }, []);

    const handleInviteSMS = async (contact: any) => {
        const name = contact.name || "Friend";
        const phoneNumber = contact.phoneNumbers?.[0]?.number;
        const email = contact.emails?.[0]?.email;

        const message = `Hey ${name}, join me on Komunity! It's a great app for our community. Here is the link: ${inviteLink}`;

        if (phoneNumber) {
            const isAvailable = await SMS.isAvailableAsync();
            if (isAvailable) {
                await SMS.sendSMSAsync(
                    [phoneNumber],
                    message
                );
            } else {
                Alert.alert("SMS not available", "Cannot send SMS on this device.");
            }
        } else if (email) {
            // Fallback to generic share
            Share.share({
                message: message,
                title: "Join Komunity"
            });
        } else {
            Alert.alert("No Contact Info", "This contact does not have a phone number or email.");
        }
    };

    const handleWhatsAppInvite = async (contact?: any) => {
        const phoneNumber = contact?.phoneNumbers?.[0]?.number;
        await shareToWhatsApp({
            phone: phoneNumber,
            groupName: groupId ? 'our Komunity group' : 'Komunity',
            inviterName: 'A friend',
            inviteCodeOrLink: inviteLink
        });
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.centered]}>
                <ActivityIndicator size="large" color="#2563eb" />
            </View>
        );
    }

    if (permissionStatus !== 'granted') {
        return (
            <View style={[styles.container, styles.centered, { paddingTop: insets.top, paddingHorizontal: 24 }]}>
                <Ionicons name="people-circle-outline" size={64} color="#94a3b8" style={{ marginBottom: 16 }} />
                <Text style={styles.permissionText}>Permission to access contacts was not granted.</Text>
                <Text style={styles.permissionSubtext}>
                    You can still invite friends directly by sharing the group link to WhatsApp or other apps!
                </Text>

                <TouchableOpacity
                    style={styles.whatsAppFeaturedButton}
                    onPress={() => handleWhatsAppInvite()}
                    activeOpacity={0.85}
                >
                    <Ionicons name="logo-whatsapp" size={20} color="#fff" />
                    <Text style={styles.whatsAppFeaturedText}>Share Invite via WhatsApp</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={onBack} style={styles.backButton}>
                    <Text style={styles.backButtonText}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack} style={styles.headerButton}>
                    <Text style={styles.headerButtonText}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Invite Friends</Text>
                <View style={{ width: 60 }} />
            </View>

            {/* QUICK WHATSAPP SHARE BANNER */}
            <View style={styles.bannerContainer}>
                <TouchableOpacity
                    style={styles.whatsAppFeaturedButton}
                    onPress={() => handleWhatsAppInvite()}
                    activeOpacity={0.85}
                >
                    <View style={styles.whatsAppIconCircle}>
                        <Ionicons name="logo-whatsapp" size={20} color="#FFFFFF" />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.whatsAppFeaturedTitle}>Share Link to WhatsApp</Text>
                        <Text style={styles.whatsAppFeaturedSubtitle}>Post to group chats, status, or any contact</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
                </TouchableOpacity>
            </View>

            <FlatList
                data={contacts}
                keyExtractor={(item) => (item as any).id || item.name || Math.random().toString()}
                renderItem={({ item }) => {
                    const hasPhone = Boolean(item.phoneNumbers?.[0]?.number);
                    return (
                        <View style={styles.contactItem}>
                            <View style={styles.avatar}>
                                <Text style={styles.avatarText}>{item.name?.[0] || "?"}</Text>
                            </View>
                            <View style={styles.contactInfo}>
                                <Text style={styles.contactName}>{item.name}</Text>
                                <Text style={styles.contactDetail}>
                                    {item.phoneNumbers?.[0]?.number || item.emails?.[0]?.email || "No details"}
                                </Text>
                            </View>
                            <View style={styles.actionsContainer}>
                                {hasPhone && (
                                    <TouchableOpacity
                                        style={styles.whatsAppRowButton}
                                        onPress={() => handleWhatsAppInvite(item)}
                                        accessibilityLabel="Invite via WhatsApp"
                                    >
                                        <Ionicons name="logo-whatsapp" size={16} color="#FFFFFF" />
                                    </TouchableOpacity>
                                )}
                                <TouchableOpacity
                                    style={styles.inviteButton}
                                    onPress={() => handleInviteSMS(item)}
                                >
                                    <Text style={styles.inviteButtonText}>SMS</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    );
                }}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    centered: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    headerButton: {
        padding: 8,
    },
    headerButtonText: {
        fontSize: 16,
        color: colors.primaryLight,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.textPrimary,
    },
    bannerContainer: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#F8FAFC',
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
    },
    whatsAppFeaturedButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#25D366',
        borderRadius: 12,
        paddingVertical: 10,
        paddingHorizontal: 14,
        gap: 12,
        shadowColor: '#25D366',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 5,
        elevation: 3,
    },
    whatsAppIconCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    whatsAppFeaturedTitle: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700',
    },
    whatsAppFeaturedSubtitle: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: 12,
    },
    whatsAppFeaturedText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700',
    },
    permissionText: {
        fontSize: 16,
        color: colors.textPrimary,
        fontWeight: '600',
        textAlign: 'center',
        marginBottom: 8,
    },
    permissionSubtext: {
        fontSize: 14,
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: 20,
    },
    backButton: {
        marginTop: 16,
        padding: 12,
        backgroundColor: '#E2E8F0',
        borderRadius: 8,
        minWidth: 120,
        alignItems: 'center',
    },
    backButtonText: {
        color: colors.textPrimary,
        fontWeight: '600',
    },
    contactItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.surfaceLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    avatarText: {
        fontSize: 18,
        color: colors.primaryLight,
        fontWeight: 'bold',
    },
    contactInfo: {
        flex: 1,
    },
    contactName: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    contactDetail: {
        fontSize: 14,
        color: colors.textSecondary,
    },
    actionsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    whatsAppRowButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#25D366',
        alignItems: 'center',
        justifyContent: 'center',
    },
    inviteButton: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        backgroundColor: colors.primaryLight,
        borderRadius: 16,
    },
    inviteButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
});

export default ContactsScreen;
