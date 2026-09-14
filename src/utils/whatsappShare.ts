import { Linking, Alert, Platform, Share } from 'react-native';

export interface WhatsAppInviteOptions {
    phone?: string; // Optional: if provided, opens chat with that number directly
    groupName: string;
    inviterName?: string;
    inviteCodeOrLink: string;
}

/**
 * Format a phone number into international digits without leading '+'.
 * Automatically handles South African 10-digit format (082... -> 2782...).
 */
export const formatWhatsAppNumber = (phone?: string): string => {
    if (!phone) return '';
    let cleaned = phone.replace(/[^0-9]/g, '');
    if (cleaned.startsWith('0') && cleaned.length === 10) {
        cleaned = '27' + cleaned.substring(1);
    }
    return cleaned;
};

/**
 * Opens WhatsApp to send an invite message to a specific contact or to choose a recipient/group.
 */
export const shareToWhatsApp = async ({
    phone,
    groupName,
    inviterName,
    inviteCodeOrLink
}: WhatsAppInviteOptions): Promise<boolean> => {
    const inviter = inviterName ? `${inviterName} has` : 'You have been';
    const message = `👋 Hi! ${inviter} invited you to join "${groupName}" on Komunity.\n\n` +
        `Komunity is a transparent community wallet for tracking group contributions, savings, and payouts in real time.\n\n` +
        `👉 Tap to join: ${inviteCodeOrLink}\n\n` +
        `End the money drama with Komunity!`;

    const encodedMessage = encodeURIComponent(message);
    const cleanedPhone = formatWhatsAppNumber(phone);

    // Build platform-appropriate URLs
    let nativeUrl = '';
    let webUrl = '';

    if (cleanedPhone) {
        nativeUrl = `whatsapp://send?phone=${cleanedPhone}&text=${encodedMessage}`;
        webUrl = `https://wa.me/${cleanedPhone}?text=${encodedMessage}`;
    } else {
        nativeUrl = `whatsapp://send?text=${encodedMessage}`;
        webUrl = `https://wa.me/?text=${encodedMessage}`;
    }

    try {
        if (Platform.OS === 'web') {
            await Linking.openURL(webUrl);
            return true;
        }

        const canOpen = await Linking.canOpenURL(nativeUrl);
        if (canOpen) {
            await Linking.openURL(nativeUrl);
            return true;
        }

        // Try webUrl fallback
        const canOpenWeb = await Linking.canOpenURL(webUrl);
        if (canOpenWeb) {
            await Linking.openURL(webUrl);
            return true;
        }

        // WhatsApp not installed: offer standard share sheet fallback
        Alert.alert(
            'WhatsApp Not Available',
            'WhatsApp does not appear to be installed on your device. Would you like to share using another app?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Share via Other App',
                    onPress: () => {
                        Share.share({
                            title: `Join ${groupName} on Komunity`,
                            message: message,
                        });
                    }
                }
            ]
        );
        return false;
    } catch (error) {
        console.error('Error opening WhatsApp:', error);
        // Fallback to standard share
        Share.share({
            title: `Join ${groupName} on Komunity`,
            message: message,
        });
        return false;
    }
};
