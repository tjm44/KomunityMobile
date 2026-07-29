import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, Dimensions, RefreshControl, Share } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import client, { getMediaUrl } from '../api/client';
import { FeedPlaceholder } from '../components/Loaders';

interface Author {
    id: number;
    full_name: string;
    profile_picture: string | null;
}

interface Post {
    id: number;
    author_detail: Author;
    content: string;
    images: { id: number; image: string }[];
    created_at: string;
    likes_count: number;
    like_count?: number; // fallback for older API responses
    has_liked: boolean;
    comment_count: number;
}

interface GroupFeedProps {
    group: { id: number; name: string; is_organisation?: boolean };
    onBack: () => void;
    onSelectPost: (post: Post) => void;
    onCreatePost: () => void;
}

const { width } = Dimensions.get('window');

const ImageCarousel = ({ images }: { images: { id: number; image: string }[] }) => {
    const [activeIndex, setActiveIndex] = useState(0);

    const onScroll = (event: any) => {
        const slideSize = event.nativeEvent.layoutMeasurement.width;
        const index = event.nativeEvent.contentOffset.x / slideSize;
        setActiveIndex(Math.round(index));
    };

    return (
        <View style={styles.carouselContainer}>
            <FlatList
                data={images}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item) => item.id.toString()}
                onScroll={onScroll}
                renderItem={({ item }) => (
                    <Image
                        source={{ uri: item.image }}
                        style={styles.postImage}
                        transition={200}
                        contentFit="cover"
                    />
                )}
            />
            {images.length > 1 && (
                <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                        {activeIndex + 1}/{images.length}
                    </Text>
                </View>
            )}
        </View>
    );
};

const GroupFeedScreen = ({ group, onBack, onSelectPost, onCreatePost }: GroupFeedProps) => {
    const insets = useSafeAreaInsets();
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [nextPage, setNextPage] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(true);

    useEffect(() => {
        fetchPosts(1);
        markAsRead();
    }, []);

    const markAsRead = async () => {
        try {
            if (!group.is_organisation) {
                await client.post(`groups/${group.id}/mark_read/`);
            }
        } catch (error) {
            console.error('Error marking group as read:', error);
        }
    };

    const fetchPosts = async (page: number = 1) => {
        try {
            const queryParam = group.is_organisation ? `organisation=${group.id}` : `group_id=${group.id}`;
            const response = await client.get(`posts/?${queryParam}&page=${page}`);
            const data = response.data;

            // Handle both paginated { results, next } and flat array responses
            const newPosts = Array.isArray(data) ? data : data.results || [];
            const nextUrl = Array.isArray(data) ? null : data.next;

            if (page === 1) {
                setPosts(newPosts);
            } else {
                setPosts(prev => {
                    // Filter out any posts that already exist in the list to avoid duplicate keys
                    const existingIds = new Set(prev.map(p => p.id));
                    const uniqueNewPosts = newPosts.filter((p: Post) => !existingIds.has(p.id));
                    return [...prev, ...uniqueNewPosts];
                });
            }
            setNextPage(nextUrl);
            setHasMore(!!nextUrl);
        } catch (error) {
            console.error('Error fetching posts:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
            setLoadingMore(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchPosts(1);
        markAsRead();
    };

    const loadMore = () => {
        if (!hasMore || loadingMore || !nextPage) return;
        setLoadingMore(true);
        // Extract page number from next URL
        const pageMatch = nextPage.match(/page=(\d+)/);
        const page = pageMatch ? parseInt(pageMatch[1]) : 2;
        fetchPosts(page);
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const handleShare = async (post: Post) => {
        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            const shareUrl = `komunity://post/${post.id}`;
            await Share.share({
                message: `${post.author_detail.full_name} shared a post in Komunity!\n\n"${post.content}"\n\nView here: ${shareUrl}`,
            });
        } catch (error) {
            console.error('Error sharing:', error);
        }
    };

    const toggleLike = async (post: Post) => {
        if (!post || !post.id) return;

        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

            const currentCount = Number(post.likes_count ?? post.like_count ?? 0);
            const newHasLiked = !post.has_liked;
            const newLikeCount = newHasLiked ? currentCount + 1 : Math.max(0, currentCount - 1);

            // Update local state immediately with a new array reference
            setPosts(currentPosts => {
                if (!Array.isArray(currentPosts)) return [];
                return currentPosts.map(p => {
                    // Use loose equality or string conversion to be safe against number/string mismatch
                    if (String(p.id) === String(post.id)) {
                        return {
                            ...p,
                            has_liked: newHasLiked,
                            likes_count: newLikeCount,
                            like_count: newLikeCount
                        };
                    }
                    return p;
                });
            });

            const response = await client.post(`posts/${post.id}/like/`);

            if (response.data && typeof response.data.likes_count === 'number') {
                setPosts(currentPosts => {
                    if (!Array.isArray(currentPosts)) return [];
                    return currentPosts.map(p => {
                        if (String(p.id) === String(post.id)) {
                            return {
                                ...p,
                                has_liked: response.data.liked,
                                likes_count: response.data.likes_count,
                                like_count: response.data.likes_count
                            };
                        }
                        return p;
                    });
                });
            }
        } catch (error) {
            console.error('Error toggling like:', error);
            // Revert local state to original post object on error
            setPosts(currentPosts => {
                if (!Array.isArray(currentPosts)) return [];
                return currentPosts.map(p => String(p.id) === String(post.id) ? { ...post } : p);
            });
        }
    };

    if (loading) {
        return (
            <View style={{ flex: 1, backgroundColor: '#ffffff' }}>
                <FeedPlaceholder />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={[styles.header, { paddingTop: insets.top }]}>
                <TouchableOpacity onPress={onBack} style={styles.backButton}>
                    <Text style={styles.backButtonText}>←</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{group.name}</Text>
                <View style={{ width: 40 }} />
            </View>

            <FlatList
                data={posts}
                keyExtractor={(item, index) => item && item.id ? item.id.toString() : `post-${index}`}
                contentContainerStyle={styles.listContent}
                removeClippedSubviews={false}
                initialNumToRender={10}
                maxToRenderPerBatch={10}
                windowSize={5}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={['#2563eb']}
                        tintColor="#2563eb"
                    />
                }
                renderItem={({ item }) => (
                    <LinearGradient
                        colors={['#ffffff', '#eff6ff']}
                        style={styles.postCard}
                    >
                        {/* Make the author and content area clickable to view details */}
                        <TouchableOpacity
                            activeOpacity={0.7}
                            onPress={() => onSelectPost(item)}
                        >
                            <View style={styles.authorSection}>
                                <View style={styles.avatarCircle}>
                                    {item.author_detail.profile_picture ? (
                                        <Image
                                            source={{ uri: getMediaUrl(item.author_detail.profile_picture) }}
                                            style={styles.avatarImage}
                                            contentFit="cover"
                                            transition={200}
                                        />
                                    ) : (
                                        <Text style={styles.avatarInitial}>
                                            {(item.author_detail.full_name || 'U')[0].toUpperCase()}
                                        </Text>
                                    )}
                                </View>
                                <View style={styles.authorMeta}>
                                    <Text style={styles.authorName}>{item.author_detail.full_name}</Text>
                                    <Text style={styles.timestamp}>{formatDate(item.created_at)}</Text>
                                </View>
                            </View>

                            <Text style={styles.content}>{item.content}</Text>
                        </TouchableOpacity>

                        {/* Multiple Images Carousel */}
                        <TouchableOpacity
                            activeOpacity={0.9}
                            onPress={() => onSelectPost(item)}
                            style={styles.carouselContainer}
                        >
                            {item.images && item.images.length > 0 && (
                                <ImageCarousel images={item.images} />
                            )}
                        </TouchableOpacity>

                        {/* Action Buttons in Footer - NOT wrapped by outer TouchableOpacity anymore */}
                        <View style={styles.footer}>
                            <TouchableOpacity
                                style={styles.footerAction}
                                onPress={() => toggleLike(item)}
                            >
                                <Text style={[styles.footerActionText, item.has_liked && styles.activeLike]}>
                                    {item.has_liked ? '❤️' : '🤍'} {item.likes_count ?? item.like_count ?? 0}
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.footerAction}
                                onPress={() => onSelectPost(item)}
                            >
                                <Text style={styles.footerActionText}>💬 {item.comment_count} comments</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.footerAction} onPress={() => handleShare(item)}>
                                <Text style={styles.footerActionText}>🚀 share</Text>
                            </TouchableOpacity>
                        </View>
                    </LinearGradient>
                )}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>No posts yet. Be the first to share!</Text>
                    </View>
                }
                onEndReached={loadMore}
                onEndReachedThreshold={0.3}
                ListFooterComponent={
                    loadingMore ? (
                        <View style={{ paddingVertical: 20 }}>
                            <ActivityIndicator size="small" color="#2563eb" />
                        </View>
                    ) : null
                }
            />

            <TouchableOpacity
                style={[styles.fab, { bottom: Math.max(insets.bottom, 20) }]}
                onPress={onCreatePost}
                activeOpacity={0.8}
            >
                <Text style={styles.fabIcon}>+</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: 'transparent',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#eff6ff',
        justifyContent: 'center',
        alignItems: 'center',
    },
    backButtonText: {
        fontSize: 24,
        color: '#2563eb',
        fontWeight: 'bold',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#111827',
    },
    listContent: {
        padding: 12,
    },
    postCard: {
        borderRadius: 12,
        marginBottom: 12,
        padding: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    authorSection: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    avatarCircle: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: '#eff6ff',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
        borderWidth: 2,
        borderColor: '#2563eb',
        overflow: 'hidden',
    },
    avatarImage: {
        width: '100%',
        height: '100%',
    },
    avatarInitial: {
        color: '#2563eb',
        fontWeight: 'bold',
        fontSize: 18,
    },
    authorMeta: {
        flex: 1,
    },
    authorName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1f2937',
    },
    timestamp: {
        fontSize: 12,
        color: '#6b7280',
    },
    content: {
        fontSize: 15,
        color: '#4b5563',
        lineHeight: 22,
        marginBottom: 12,
    },
    carouselContainer: {
        marginHorizontal: -12,
        marginBottom: 12,
        position: 'relative',
    },
    postImage: {
        width: width - 24,
        height: 300,
        backgroundColor: '#f3f4f6',
    },
    badge: {
        position: 'absolute',
        top: 12,
        right: 12,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    badgeText: {
        color: '#ffffff',
        fontSize: 12,
        fontWeight: 'bold',
    },
    footer: {
        flexDirection: 'row',
        borderTopWidth: 1,
        borderTopColor: '#f3f4f6',
        paddingTop: 12,
        marginTop: 4,
    },
    footerAction: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 24,
    },
    footerActionText: {
        fontSize: 14,
        color: '#6b7280',
        fontWeight: '500',
    },
    activeLike: {
        color: '#ef4444',
        fontWeight: 'bold',
    },
    emptyContainer: {
        padding: 40,
        alignItems: 'center',
    },
    emptyText: {
        color: '#9ca3af',
        fontSize: 16,
        textAlign: 'center',
    },
    fab: {
        position: 'absolute',
        right: 20,
        bottom: 20,
        backgroundColor: '#2563eb',
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    fabIcon: {
        color: '#ffffff',
        fontSize: 32,
        fontWeight: '300',
        marginTop: -2,
    },
});

export default GroupFeedScreen;
