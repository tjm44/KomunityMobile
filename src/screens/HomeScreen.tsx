import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import client from "../api/client";
import { usePushNotifications } from "../hooks/usePushNotifications";
import SearchScreen from "./SearchScreen";
import { GroupPlaceholder } from "../components/Loaders";

interface Group {
  id: number;
  name: string;
  description: string;
  cover_image: string | null;
  total_members: number;
  is_selected: boolean;
  unread_posts_count: number;
}

interface HomeScreenProps {
  onSelectGroup: (group: Group) => void;
  onViewGroupDetails?: (group: Group) => void;
  onViewWallet?: () => void;
  onDiscover?: () => void;
  onCreateGroup?: () => void;
}

const HomeScreen = ({
  onSelectGroup,
  onViewGroupDetails,
  onViewWallet,
  onDiscover,
  onCreateGroup,
}: HomeScreenProps) => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { registerToken } = usePushNotifications();
  const [searchVisible, setSearchVisible] = useState(false);

  useEffect(() => {
    fetchData();
    registerToken();
  }, []);

  if (searchVisible) {
    return (
      <SearchScreen
        onClose={() => setSearchVisible(false)}
        onSelectGroup={(group) => {
          setSearchVisible(false);
          onViewGroupDetails?.(group as any);
        }}
      />
    );
  }

  const fetchData = async () => {
    try {
      const groupsRes = await client.get("groups/mine/");
      setGroups(groupsRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleSelectGroup = async (groupId: number) => {
    try {
      await client.post(`groups/${groupId}/select/`);
      fetchData();
    } catch (error) {
      console.error("Error selecting group:", error);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>My Hub</Text>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View style={styles.searchButton}>
              <Text style={{ fontSize: 22, opacity: 0.3 }}>🔍</Text>
            </View>
          </View>
        </View>
        <GroupPlaceholder />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>My Hub</Text>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <TouchableOpacity
            onPress={() => setSearchVisible(true)}
            style={styles.searchButton}
          >
            <Text style={{ fontSize: 22 }}>🔍</Text>
          </TouchableOpacity>
        </View>
      </View>
      <ScrollView
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#2563eb"]}
            tintColor="#2563eb"
          />
        }
      >
        {/* ──── Communities Section ──── */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeader}>👥 My Communities</Text>
            {onCreateGroup && (
              <TouchableOpacity onPress={onCreateGroup} style={styles.sectionAddBtn}>
                <Text style={styles.sectionAddBtnText}>+ New</Text>
              </TouchableOpacity>
            )}
          </View>
          {groups.length === 0 ? (
            <View style={styles.emptySection}>
              <Text style={styles.emptySectionText}>No communities yet.</Text>
              {onDiscover && (
                <TouchableOpacity onPress={onDiscover}>
                  <Text style={styles.emptySectionLink}>Discover groups →</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            groups.map((item) => (
              <TouchableOpacity
                key={`group-${item.id}`}
                onPress={() => onViewGroupDetails?.(item)}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={["#ffffff", "#f1f5f9"]}
                  style={styles.groupCard}
                >
                  {item.cover_image ? (
                    <Image
                      source={{ uri: item.cover_image }}
                      style={styles.coverImage}
                      transition={200}
                    />
                  ) : (
                    <View
                      style={[styles.coverImage, { backgroundColor: "#e5e7eb" }]}
                    />
                  )}
                  <View style={styles.cardContent}>
                    <View style={styles.cardHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.groupName}>{item.name}</Text>
                        <Text style={styles.memberCount}>
                          {item.total_members} members
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.description} numberOfLines={2}>
                      {item.description || "No description available"}
                    </Text>

                    <View style={styles.actionRow}>
                      <TouchableOpacity
                        style={[
                          styles.detailsButton,
                          item.is_selected && styles.selectedButton,
                        ]}
                        onPress={() => handleSelectGroup(item.id)}
                      >
                        <Text
                          style={[
                            styles.detailsButtonText,
                            item.is_selected && styles.selectedButtonText,
                          ]}
                        >
                          {item.is_selected ? "Selected" : "Select"}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.feedButton}
                        onPress={() => onSelectGroup(item)}
                      >
                        <Text style={styles.feedButtonText}>Discussion Feed</Text>
                        {item.unread_posts_count > 0 && (
                          <View style={styles.notificationBadge}>
                            <Text style={styles.badgeText}>
                              {item.unread_posts_count}
                            </Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            ))
          )}
        </View>

        {groups.length === 0 && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No communities found.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 50, // Safe area
    paddingBottom: 10,
    backgroundColor: "transparent",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  searchButton: {
    padding: 8,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  headerContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  walletHeaderButton: {
    backgroundColor: "#eff6ff",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#dbeafe",
  },
  walletIcon: {
    color: "#2563eb",
    fontWeight: "bold",
    fontSize: 14,
  },
  discoverLink: {
    color: "#2563eb",
    fontSize: 14,
    fontWeight: "500",
    marginTop: 4,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#111827",
  },
  listContent: {
    padding: 16,
  },
  groupCard: {
    borderRadius: 12,
    marginBottom: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  coverImage: {
    width: "100%",
    height: 140,
  },
  cardContent: {
    padding: 16,
  },
  groupName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 4,
  },
  memberCount: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: "#4b5563",
    lineHeight: 20,
    marginBottom: 16,
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  feedButton: {
    backgroundColor: "#eff6ff",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#dbeafe",
  },
  feedButtonText: {
    color: "#2563eb",
    fontWeight: "bold",
    fontSize: 14,
    marginRight: 6,
  },
  detailsButton: {
    backgroundColor: "#f0fdf4",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#dcfce7",
  },
  detailsButtonText: {
    color: "#16a34a",
    fontWeight: "bold",
    fontSize: 14,
  },
  selectedButton: {
    backgroundColor: "#16a34a",
    borderColor: "#16a34a",
  },
  selectedButtonText: {
    color: "#ffffff",
  },
  notificationBadge: {
    backgroundColor: "#ef4444",
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  badgeText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "bold",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  emptyContainer: {
    marginTop: 60,
    alignItems: "center",
  },
  emptyText: {
    color: "#9ca3af",
    fontSize: 16,
  },
  verifiedBadge: {
    backgroundColor: '#d1fae5',
    borderRadius: 20,
    paddingHorizontal: 7,
    paddingVertical: 1,
    borderWidth: 1,
    borderColor: '#6ee7b7',
  },
  verifiedBadgeText: {
    color: '#065f46',
    fontSize: 10,
    fontWeight: '700',
  },
  sectionContainer: {
    marginBottom: 20,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#475569',
    marginBottom: 10,
    marginTop: 10,
    fontFamily: 'Outfit-Bold',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 10,
  },
  sectionAddBtn: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  sectionAddBtnText: {
    color: '#2563eb',
    fontWeight: '700',
    fontSize: 12,
  },
  emptySection: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  emptySectionText: {
    color: '#94a3b8',
    fontSize: 14,
  },
  emptySectionLink: {
    color: '#2563eb',
    fontWeight: '600',
    fontSize: 13,
    marginTop: 8,
  },
});

export default HomeScreen;
