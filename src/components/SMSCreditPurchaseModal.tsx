import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, Modal, TouchableOpacity,
    ActivityIndicator, Alert, ScrollView
} from 'react-native';
import client from '../api/client';

interface SMSCreditPackage {
    id: number;
    name: string;
    credits_count: number;
    price: string;
    is_active: boolean;
}

interface SMSCreditPurchaseModalProps {
    visible: boolean;
    groupId: number;
    groupName: string;
    onClose: () => void;
    onSuccess: (newBalance: number) => void;
}

export const SMSCreditPurchaseModal: React.FC<SMSCreditPurchaseModalProps> = ({
    visible,
    groupId,
    groupName,
    onClose,
    onSuccess,
}) => {
    const [packages, setPackages] = useState<SMSCreditPackage[]>([]);
    const [selectedPackage, setSelectedPackage] = useState<SMSCreditPackage | null>(null);
    const [loading, setLoading] = useState(false);
    const [purchasing, setPurchasing] = useState(false);
    const [currentBalance, setCurrentBalance] = useState<number | null>(null);

    useEffect(() => {
        if (visible) {
            fetchData();
        }
    }, [visible, groupId]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [pkgRes, balRes] = await Promise.all([
                client.get('/wallet/sms-packages/'),
                client.get(`/wallet/group-sms-balance/?group_id=${groupId}`)
            ]);
            setPackages(pkgRes.data);
            if (pkgRes.data && pkgRes.data.length > 0) {
                setSelectedPackage(pkgRes.data[1] || pkgRes.data[0]);
            }
            if (balRes.data && typeof balRes.data.balance === 'number') {
                setCurrentBalance(balRes.data.balance);
            }
        } catch (err: any) {
            console.error('Failed to load SMS credit packages:', err);
        } finally {
            setLoading(false);
        }
    };

    const handlePurchase = async () => {
        if (!selectedPackage) return;
        setPurchasing(true);
        try {
            const res = await client.post('/wallet/buy-sms-package/', {
                package_id: selectedPackage.id,
                group_id: groupId,
            });
            Alert.alert(
                'Purchase Successful! 🎉',
                `${selectedPackage.credits_count} SMS notification credits added to ${groupName}.`
            );
            onSuccess(res.data.new_sms_balance);
            onClose();
        } catch (err: any) {
            const msg = err.response?.data?.error || 'Failed to purchase SMS credits.';
            Alert.alert('Purchase Failed', msg);
        } finally {
            setPurchasing(false);
        }
    };

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <Text style={styles.title}>💬 Buy SMS Notification Credits</Text>
                    <Text style={styles.subtitle}>
                        Notify offline members of {groupName} via SMS alerts.
                    </Text>

                    {currentBalance !== null && (
                        <View style={styles.balanceBadge}>
                            <Text style={styles.balanceText}>
                                Current Credit Balance: <Text style={styles.bold}>{currentBalance} SMS</Text>
                            </Text>
                        </View>
                    )}

                    {loading ? (
                        <ActivityIndicator size="large" color="#0284c7" style={{ marginVertical: 30 }} />
                    ) : (
                        <ScrollView style={{ maxHeight: 280 }} showsVerticalScrollIndicator={false}>
                            {packages.map((pkg) => {
                                const isSelected = selectedPackage?.id === pkg.id;
                                return (
                                    <TouchableOpacity
                                        key={pkg.id}
                                        style={[styles.packageCard, isSelected && styles.packageCardSelected]}
                                        onPress={() => setSelectedPackage(pkg)}
                                        activeOpacity={0.8}
                                    >
                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.packageName, isSelected && styles.textSelected]}>
                                                {pkg.name}
                                            </Text>
                                            <Text style={styles.packageCredits}>
                                                {pkg.credits_count} SMS Notifications
                                            </Text>
                                        </View>
                                        <Text style={[styles.packagePrice, isSelected && styles.textSelected]}>
                                            R {pkg.price}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    )}

                    <View style={styles.actionRow}>
                        <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={purchasing}>
                            <Text style={styles.cancelBtnText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.buyBtn, (!selectedPackage || purchasing) && styles.btnDisabled]}
                            onPress={handlePurchase}
                            disabled={!selectedPackage || purchasing}
                        >
                            {purchasing ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.buyBtnText}>
                                    Buy for R {selectedPackage?.price || '0'}
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.55)',
        justifyContent: 'flex-end',
    },
    container: {
        backgroundColor: '#ffffff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: '#0f172a',
        marginBottom: 6,
    },
    subtitle: {
        fontSize: 14,
        color: '#64748b',
        marginBottom: 16,
    },
    balanceBadge: {
        backgroundColor: '#f0f9ff',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 12,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#bae6fd',
    },
    balanceText: {
        fontSize: 14,
        color: '#0369a1',
    },
    bold: {
        fontWeight: '700',
    },
    packageCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#f8fafc',
        padding: 16,
        borderRadius: 14,
        marginBottom: 10,
        borderWidth: 2,
        borderColor: '#e2e8f0',
    },
    packageCardSelected: {
        backgroundColor: '#f0f9ff',
        borderColor: '#0284c7',
    },
    packageName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1e293b',
    },
    packageCredits: {
        fontSize: 13,
        color: '#64748b',
        marginTop: 2,
    },
    packagePrice: {
        fontSize: 18,
        fontWeight: '700',
        color: '#0284c7',
    },
    textSelected: {
        color: '#0369a1',
    },
    actionRow: {
        flexDirection: 'row',
        marginTop: 20,
        gap: 12,
    },
    cancelBtn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: '#f1f5f9',
        alignItems: 'center',
    },
    cancelBtnText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#64748b',
    },
    buyBtn: {
        flex: 2,
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: '#0284c7',
        alignItems: 'center',
    },
    buyBtnText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#ffffff',
    },
    btnDisabled: {
        opacity: 0.5,
    },
});
