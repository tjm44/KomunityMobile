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
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import client from '../api/client';

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
    if (!type) return { icon: 'notifications-outline', color: '#3b82f6', bg: '#dbeafe' };
    
    switch (type.toLowerCase()) {
      case 'contribution_sent':
      case 'contribution_received':
      case 'funds_disbursed':
      case 'wallet_transfer_executed':
        return { icon: 'wallet-outline', color: '#10b981', bg: '#d1fae5' };
      case 'member_joined':
      case 'membership_approved':
      case 'member_promoted':
        return { icon: 'people-outline', color: '#6366f1', bg: '#e0e7ff' };
      case 'deceased_declared':
      case 'campaign_created':
      case 'campaign_contribution':
      case 'campaign_disbursed':
        return { icon: 'heart-outline', color: '#ef4444', bg: '#fee2e2' };
      case 'new_post':
        return { icon: 'chatbubbles-outline', color: '#8b5cf6', bg: '#ede9fe' };
      default:
        return { icon: 'notifications-outline', color: '#3b82f6', bg: '#dbeafe' };
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
          data={filteredNotifications}
          keyExtractor={item => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563eb']} />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 54,
    paddingBottom: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
  },
  titleWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  topTitle: {
    fontSize: 18,
    fontFamily: 'Outfit-Bold',
    color: '#0f172a',
  },
  filterBar: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
  },
  activeFilterTab: {
    backgroundColor: '#2563eb',
  },
  filterTabText: {
    fontSize: 13,
    fontFamily: 'Outfit-Regular',
    color: '#64748b',
    fontWeight: '600',
  },
  activeFilterTabText: {
    color: '#ffffff',
    fontFamily: 'Outfit-Bold',
  },
  filterBadge: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
  },
  filterBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  badge: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  badgeText: {
    color: '#ffffff',
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
    color: '#2563eb',
    fontWeight: '600',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyIconBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'Outfit-Bold',
    color: '#334155',
    marginBottom: 8,
  },
  emptySub: {
    fontSize: 14,
    fontFamily: 'Outfit-Regular',
    color: '#64748b',
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
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  unreadCard: {
    backgroundColor: '#f0f7ff',
    borderColor: '#bfdbfe',
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
    color: '#334155',
    flex: 1,
    marginRight: 8,
  },
  unreadTitle: {
    fontFamily: 'Outfit-Bold',
    color: '#0f172a',
  },
  timeText: {
    fontSize: 12,
    color: '#94a3b8',
  },
  message: {
    fontSize: 13.5,
    color: '#475569',
    lineHeight: 19,
  },
  unreadDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: '#2563eb',
    marginLeft: 8,
    marginTop: 4,
  },
});
