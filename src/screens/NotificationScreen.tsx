import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import client from '../api/client';
import { colors, gradients } from '../constants/theme';

export interface NotificationItem {
  id: number;
  title: string;
  message: string;
  data: any;
  is_read: boolean;
  created_at: string;
  notification_type: string | null;
}

interface NotificationScreenProps {
  onBack: () => void;
  onNotificationsRead?: () => void;
}

export default function NotificationScreen({ onBack, onNotificationsRead }: NotificationScreenProps) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread'>('all');

  const fetchNotifications = useCallback(async () => {
    try {
      const response = await client.get('notifications/');
      const data = response.data.results || response.data;
      setNotifications(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  const handleMarkAsRead = async (item: NotificationItem) => {
    if (item.is_read) return;

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      // Optimistic UI update
      setNotifications(prev =>
        prev.map(n => (n.id === item.id ? { ...n, is_read: true } : n))
      );
      await client.post(`notifications/${item.id}/mark_read/`);
      onNotificationsRead?.();
    } catch (error) {
      console.error('Error marking notification as read:', error);
      fetchNotifications(); // revert on fail
    }
  };

  const handleMarkAllRead = async () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      await client.post('notifications/mark_all_read/');
      onNotificationsRead?.();
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      fetchNotifications();
    }
  };

  const getIconForType = (type: string | null) => {
    if (!type) return { icon: 'notifications-outline', color: colors.primaryLight, bg: colors.surfaceLight };
    
    switch (type.toLowerCase()) {
      case 'contribution_sent':
      case 'contribution_received':
      case 'funds_disbursed':
      case 'wallet_transfer_executed':
        return { icon: 'wallet-outline', color: colors.success, bg: colors.successLight };
      case 'member_joined':
      case 'membership_approved':
      case 'member_promoted':
        return { icon: 'people-outline', color: colors.primaryLight, bg: colors.surfaceLight };
      case 'deceased_declared':
      case 'campaign_created':
      case 'campaign_contribution':
      case 'campaign_disbursed':
        return { icon: 'heart-outline', color: colors.danger, bg: colors.dangerLight };
      case 'new_post':
        return { icon: 'chatbubbles-outline', color: colors.primaryLight, bg: '#ede9fe' };
      default:
        return { icon: 'notifications-outline', color: colors.primaryLight, bg: colors.surfaceLight };
    }
  };

  const formatTimeAgo = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

      if (seconds < 60) return 'Just now';
      const minutes = Math.floor(seconds / 60);
      if (minutes < 60) return `${minutes}m ago`;
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return `${hours}h ago`;
      const days = Math.floor(hours / 24);
      if (days < 7) return `${days}d ago`;
      return date.toLocaleDateString();
    } catch {
      return '';
    }
  };

  const renderItem = ({ item }: { item: NotificationItem }) => {
    const { icon, color, bg } = getIconForType(item.notification_type);

    return (
      <TouchableOpacity
        style={[styles.card, !item.is_read && styles.unreadCard]}
        onPress={() => handleMarkAsRead(item)}
        activeOpacity={0.7}
      >
        <View style={[styles.iconContainer, { backgroundColor: bg }]}>
          <Ionicons name={icon as any} size={22} color={color} />
        </View>

        <View style={styles.contentContainer}>
          <View style={styles.headerRow}>
            <Text style={[styles.title, !item.is_read && styles.unreadTitle]} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.timeText}>{formatTimeAgo(item.created_at)}</Text>
          </View>

          <Text style={styles.message} numberOfLines={3}>
            {item.message}
          </Text>
        </View>

        {!item.is_read && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;
  const filteredNotifications = notifications.filter(n => {
    if (activeFilter === 'unread') return !n.is_read;
    return true;
  });

  return (
    <View style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color="#1e293b" />
        </TouchableOpacity>
        
        <View style={styles.titleWrapper}>
          <Text style={styles.topTitle}>Notifications</Text>
        </View>

        {unreadCount > 0 ? (
          <TouchableOpacity style={styles.markAllBtn} onPress={handleMarkAllRead}>
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 80 }} />
        )}
      </View>

      {/* Filter Tabs Bar */}
      <View style={styles.filterBar}>
        <TouchableOpacity
          style={[styles.filterTab, activeFilter === 'all' && styles.activeFilterTab]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setActiveFilter('all');
          }}
        >
          <Text style={[styles.filterTabText, activeFilter === 'all' && styles.activeFilterTabText]}>
            All ({notifications.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterTab, activeFilter === 'unread' && styles.activeFilterTab]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setActiveFilter('unread');
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={[styles.filterTabText, activeFilter === 'unread' && styles.activeFilterTabText]}>
              Unread
            </Text>
            {unreadCount > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{unreadCount}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </View>

      {/* Main List / Loading / Empty State */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      ) : filteredNotifications.length === 0 ? (
        <View style={styles.centerContainer}>
          <View style={styles.emptyIconBg}>
            <Ionicons
              name={activeFilter === 'unread' ? "checkmark-done-circle-outline" : "notifications-off-outline"}
              size={48}
              color="#94a3b8"
            />
          </View>
          <Text style={styles.emptyTitle}>
            {activeFilter === 'unread' ? "No Unread Notifications" : "No Notifications Yet"}
          </Text>
          <Text style={styles.emptySub}>
            {activeFilter === 'unread'
              ? "You're all caught up! Switch to 'All' to view your previous notifications."
              : "We'll notify you when transactions, group approvals, or campaign updates happen."}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredNotifications || []}
          keyExtractor={(item, index) => (item && item.id != null ? item.id.toString() : `notif-${index}`)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primaryLight]} />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
      },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 54,
    paddingBottom: 16,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: colors.borderLight,
  },
  titleWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  topTitle: {
    fontSize: 18,
    fontFamily: 'Outfit-Bold',
    color: colors.textPrimary,
  },
  filterBar: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.borderLight,
  },
  activeFilterTab: {
    backgroundColor: colors.primaryLight,
  },
  filterTabText: {
    fontSize: 13,
    fontFamily: 'Outfit-Regular',
    color: colors.textSecondary,
    fontWeight: '600',
  },
  activeFilterTabText: {
    color: colors.white,
    fontFamily: 'Outfit-Bold',
  },
  filterBadge: {
    backgroundColor: colors.danger,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
  },
  filterBadgeText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: 'bold',
  },
  badge: {
    backgroundColor: colors.danger,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  badgeText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  markAllBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  markAllText: {
    fontSize: 13,
    fontFamily: 'Outfit-Regular',
    color: colors.primaryLight,
    fontWeight: '600',
  },
  centerContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyIconBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'Outfit-Bold',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  emptySub: {
    fontSize: 14,
    fontFamily: 'Outfit-Regular',
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  unreadCard: {
    backgroundColor: colors.surfaceLight,
    borderColor: colors.accentLight,
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contentContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 15,
    fontFamily: 'Outfit-Regular',
    color: colors.textSecondary,
    flex: 1,
    marginRight: 8,
  },
  unreadTitle: {
    fontFamily: 'Outfit-Bold',
    color: colors.textPrimary,
  },
  timeText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  message: {
    fontSize: 13.5,
    color: colors.textSecondary,
    lineHeight: 19,
  },
  unreadDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: colors.primaryLight,
    marginLeft: 8,
    marginTop: 4,
  },
});
