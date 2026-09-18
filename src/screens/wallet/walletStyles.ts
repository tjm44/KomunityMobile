import { StyleSheet, Platform } from 'react-native';
import { colors } from '../../constants/theme';

export const walletStyles = StyleSheet.create({
    // ── Modal shell ────────────────────────────────────────────────
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: colors.white,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: colors.textPrimary,
    },
    closeButton: {
        fontSize: 20,
        color: colors.textMuted,
        padding: 4,
    },

    // ── Inputs ─────────────────────────────────────────────────────
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textSecondary,
        marginBottom: 8,
    },
    textInput: {
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 12,
        padding: 16,
        fontSize: 18,
        color: colors.textPrimary,
        marginBottom: 8,
    },
    inputError: {
        borderColor: colors.danger,
        backgroundColor: colors.dangerLight,
    },
    errorText: {
        color: colors.danger,
        fontSize: 13,
        marginBottom: 16,
        marginLeft: 4,
        fontWeight: '500',
    },

    // ── Buttons ────────────────────────────────────────────────────
    submitButton: {
        backgroundColor: colors.primaryLight,
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        shadowColor: colors.primaryLight,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    submitButtonText: {
        color: colors.white,
        fontSize: 16,
        fontWeight: 'bold',
    },
    disabledButton: {
        opacity: 0.5,
    },
    presets: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 24,
    },
    presetBtn: {
        backgroundColor: colors.surfaceLight,
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.surfaceLight,
    },
    presetText: {
        color: colors.primaryLight,
        fontWeight: '600',
    },

    // ── Member / recipient picker ──────────────────────────────────
    memberList: {
        maxHeight: 300,
        marginBottom: 16,
    },
    memberItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        backgroundColor: colors.background,
        borderRadius: 8,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: colors.border,
    },
    memberAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.surfaceLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.surfaceLight,
    },
    avatarImg: {
        width: '100%',
        height: '100%',
    },
    avatarInitial: {
        color: colors.primaryLight,
        fontWeight: 'bold',
        fontSize: 16,
    },
    memberName: {
        fontSize: 16,
        color: colors.textPrimary,
        fontWeight: '600',
    },
    selectedRecipient: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: colors.surfaceLight,
        borderRadius: 12,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: colors.surfaceLight,
    },
    recipientName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: colors.textPrimary,
        marginBottom: 4,
    },
    changeRecipient: {
        fontSize: 13,
        color: colors.primaryLight,
        fontWeight: '600',
    },

    // ── Campaigns list ─────────────────────────────────────────────
    deceasedItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        backgroundColor: colors.background,
        borderRadius: 8,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: colors.border,
    },
    fundProgress: {
        fontSize: 13,
        color: colors.success,
        fontWeight: '600',
        marginTop: 2,
    },
    chevron: {
        fontSize: 20,
        color: colors.textMuted,
        marginLeft: 8,
    },
    emptyState: {
        padding: 40,
        alignItems: 'center',
    },
    emptyStateText: {
        color: colors.textSecondary,
        fontSize: 16,
    },

    // ── Withdraw channel picker ────────────────────────────────────
    channelOptions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    channelOption: {
        flex: 1,
        paddingVertical: 12,
        marginHorizontal: 4,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.background,
        alignItems: 'center',
        justifyContent: 'center',
    },
    channelOptionSelected: {
        backgroundColor: colors.primaryLight,
        borderColor: colors.primaryLight,
    },
    channelOptionText: {
        fontSize: 13,
        color: colors.textSecondary,
        fontWeight: '600',
        textAlign: 'center',
    },
    channelOptionIcon: {
        fontSize: 20,
        marginBottom: 6,
    },
    channelOptionTextSelected: {
        color: colors.white,
    },
});
