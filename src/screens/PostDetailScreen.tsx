import React, { useEffect, useState, useRef } from 'react';
import {
    View, Text, FlatList, StyleSheet,
    ActivityIndicator, TouchableOpacity,
    Dimensions, TextInput, Platform, Alert, Share,
    Keyboard, Animated, LayoutAnimation, Modal, KeyboardAvoidingView
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import client, { getMediaUrl } from '../api/client';

const { width, height } = Dimensions.get('window');

// --- Interfaces ---
interface Author { id: number; full_name: string; profile_picture: string | null; }
interface ImageType { id: number; image: string; }
interface Reply { id: number; author_detail: Author; content: string; created_at: string; }
interface Comment { id: number; author_detail: Author; content: string; created_at: string; replies: Reply[]; }
interface Post {
    id: number; author_detail: Author; content: string; images: ImageType[]; created_at: string;
    comment_count: number; likes_count: number; like_count?: number; has_liked: boolean;
}
interface PostDetailProps { post: Post; onBack: () => void; onEditPost?: (post: Post) => void; }

const PostDetailScreen = ({ post, onBack, onEditPost }: PostDetailProps) => {
    const insets = useSafeAreaInsets();
    const [comments, setComments] = useState<Comment[]>([]);
    const [loading, setLoading] = useState(true);
    const [newComment, setNewComment] = useState('');
    const [activeImageIndex, setActiveImageIndex] = useState(0);
    const [postLikes, setPostLikes] = useState(post.likes_count ?? post.like_count ?? 0);
    const [hasLiked, setHasLiked] = useState(post.has_liked);

    // Edit/Reply state
    const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
    const [editingComment, setEditingComment] = useState<Comment | null>(null);
    const [editingReply, setEditingReply] = useState<Reply | null>(null);
    const [currentUserProfile, setCurrentUserProfile] = useState<any>(null);

    // Modal state
    const [isInputVisible, setIsInputVisible] = useState(false);

    const inputRef = useRef<TextInput>(null);
    const flatListRef = useRef<FlatList>(null);

    // Setup
    useEffect(() => {
        fetchComments();
        fetchCurrentUser();
    }, []);

    // API calls
    const fetchCurrentUser = async () => { try { const r = await client.get('profiles/me/'); setCurrentUserProfile(r.data); } catch (e) { } };
    const fetchComments = async () => { try { const r = await client.get(`comments/?post_id=${post.id}`); setComments(r.data); } catch (e) { } finally { setLoading(false); } };
    const handleLike = async () => { try { const r = await client.post(`posts/${post.id}/like/`); setPostLikes(r.data.likes_count); setHasLiked(r.data.liked); } catch (e) { } };

    const handleShare = async () => {
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

    const handleDeletePost = () => {
        Alert.alert('Delete Post', 'Are you sure you want to delete this post?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: performDelete }
        ]);
    };

    const performDelete = async () => {
        try {
            await client.delete(`posts/${post.id}/`);
            onBack();
        } catch (error) {
            console.error('Error deleting post:', error);
            Alert.alert('Error', 'Failed to delete post.');
        }
    };

    const handleDeleteComment = (id: number) => {
        Alert.alert('Delete?', 'Delete this comment?', [{ text: 'Cancel' }, {
            text: 'Delete', onPress: async () => {
                await client.delete(`comments/${id}/`); fetchComments();
            }
        }]);
    };
    const handleDeleteReply = (id: number) => {
        Alert.alert('Delete?', 'Delete this reply?', [{ text: 'Cancel' }, {
            text: 'Delete', onPress: async () => {
                await client.delete(`replies/${id}/`); fetchComments();
            }
        }]);
    };

    // Input Actions
    const openCommentInput = () => {
        setReplyingTo(null);
        setEditingComment(null);
        setEditingReply(null);
        setNewComment('');
        setIsInputVisible(true);
    };

    const openReplyInput = (c: Comment) => {
        setReplyingTo(c);
        setEditingComment(null);
        setEditingReply(null);
        setNewComment('');
        setIsInputVisible(true);
    };

    const openEditCommentInput = (c: Comment) => {
        setEditingComment(c);
        setEditingReply(null);
        setReplyingTo(null);
        setNewComment(c.content);
        setIsInputVisible(true);
    };

    const openEditReplyInput = (r: Reply) => {
        setEditingReply(r);
        setEditingComment(null);
        setReplyingTo(null);
        setNewComment(r.content);
        setIsInputVisible(true);
    };

    const closeInputMode = () => {
        setIsInputVisible(false);
        setReplyingTo(null);
        setEditingComment(null);
        setEditingReply(null);
        setNewComment('');
        Keyboard.dismiss();
    };

    const handleSend = async () => {
        const content = newComment.trim();
        if (!content) return;

        try {
            if (editingComment) {
                await client.patch(`comments/${editingComment.id}/`, { content });
            } else if (editingReply) {
                await client.patch(`replies/${editingReply.id}/`, { content });
            } else if (replyingTo) {
                await client.post('replies/', { comment: replyingTo.id, content });
            } else {
                await client.post('comments/', { post: post.id, content });
            }

            closeInputMode();
            await fetchComments();
        } catch (e) {
            Alert.alert('Error', 'Failed to send');
        }
    };

    const formatDate = (ds: string) => {
        if (!ds) return '';
        return new Date(ds).toLocaleDateString();
    };

    // Renders
    const renderPost = () => (
        <LinearGradient
            colors={['#ffffff', '#eff6ff']}
            style={styles.postCard}
        >
            <View style={styles.postHeader}>
                <Image source={{ uri: getMediaUrl(post.author_detail.profile_picture) }} style={styles.avatar} contentFit="cover" />
                <View style={{ flex: 1 }}>
                    <Text style={styles.author}>{post.author_detail.full_name}</Text>
                    <Text style={styles.date}>{formatDate(post.created_at)}</Text>
                </View>
                {currentUserProfile?.id === post.author_detail.id && (
                    <View style={{ flexDirection: 'row' }}>
                        {onEditPost && (
                            <TouchableOpacity onPress={() => onEditPost(post)} style={{ padding: 8 }}>
                                <Text style={{ fontSize: 18 }}>✏️</Text>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity onPress={handleDeletePost} style={{ padding: 8 }}>
                            <Text style={{ fontSize: 18 }}>🗑️</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
            <Text style={styles.postContent}>{post.content}</Text>
            {post.images?.length > 0 && (
                <View style={{ height: 300, marginBottom: 15 }}>
                    <FlatList
                        data={post.images} horizontal pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        renderItem={({ item }) => (
                            <Image source={{ uri: getMediaUrl(item.image) }} style={[styles.postImage, { width: width - 30 }]} />
                        )}
                        keyExtractor={i => i.id.toString()}
                        onMomentumScrollEnd={(e) => {
                            setActiveImageIndex(Math.round(e.nativeEvent.contentOffset.x / (width - 30)));
                        }}
                    />
                    {post.images.length > 1 && (
                        <View style={styles.imageBadge}>
                            <Text style={styles.imageBadgeText}>{activeImageIndex + 1}/{post.images.length}</Text>
                        </View>
                    )}
                </View>
            )}
            <View style={styles.postStats}>
                <TouchableOpacity style={styles.statButton} onPress={handleLike}>
                    <Text style={{ fontSize: 18 }}>{hasLiked ? '❤️' : '🤍'}</Text>
                    <Text style={[styles.statText, hasLiked && { color: '#ef4444' }]}>
                        {postLikes} {postLikes === 1 ? 'Like' : 'Likes'}
                    </Text>
                </TouchableOpacity>
                <View style={styles.statButton}>
                    <Text style={{ fontSize: 18 }}>💬</Text>
                    <Text style={styles.statText}>{comments.length} Comments</Text>
                </View>
                <TouchableOpacity style={styles.statButton} onPress={handleShare}>
                    <Text style={{ fontSize: 18 }}>🚀</Text>
                    <Text style={styles.statText}>Share</Text>
                </TouchableOpacity>
            </View>
        </LinearGradient>
    );

    const renderComment = ({ item }: { item: Comment }) => (
        <View style={styles.commentRow}>
            <Image source={{ uri: getMediaUrl(item.author_detail.profile_picture) }} style={[styles.avatar, { width: 34, height: 34 }]} />
            <View style={{ flex: 1, marginLeft: 10 }}>
                <LinearGradient
                    colors={['#ffffff', '#dcfce7']}
                    style={styles.bubble}
                >
                    <Text style={styles.commentAuthor}>{item.author_detail.full_name}</Text>
                    <Text style={styles.commentText}>{item.content}</Text>
                </LinearGradient>
                <View style={styles.actions}>
                    <Text style={styles.date}>{formatDate(item.created_at)}</Text>
                    <TouchableOpacity onPress={() => openReplyInput(item)}><Text style={styles.actionText}>Reply</Text></TouchableOpacity>
                    {currentUserProfile?.id === item.author_detail.id && (
                        <>
                            <TouchableOpacity onPress={() => openEditCommentInput(item)}><Text style={styles.actionText}>Edit</Text></TouchableOpacity>
                            <TouchableOpacity onPress={() => handleDeleteComment(item.id)}><Text style={[styles.actionText, { color: '#ef4444' }]}>Delete</Text></TouchableOpacity>
                        </>
                    )}
                </View>
                {/* Replies */}
                {item.replies?.map(r => (
                    <View key={r.id} style={{ flexDirection: 'row', marginTop: 12 }}>
                        <Image source={{ uri: getMediaUrl(r.author_detail.profile_picture) }} style={[styles.avatar, { width: 28, height: 28 }]} />
                        <View style={{ flex: 1, marginLeft: 10 }}>
                            <LinearGradient
                                colors={['#ffffff', '#dcfce7']}
                                style={styles.bubble}
                            >
                                <Text style={styles.commentAuthor}>{r.author_detail.full_name}</Text>
                                <Text style={styles.commentText}>{r.content}</Text>
                            </LinearGradient>
                            {currentUserProfile?.id === r.author_detail.id && (
                                <View style={styles.actions}>
                                    <Text style={styles.date}>{formatDate(r.created_at)}</Text>
                                    <TouchableOpacity onPress={() => openEditReplyInput(r)}><Text style={styles.actionText}>Edit</Text></TouchableOpacity>
                                    <TouchableOpacity onPress={() => handleDeleteReply(r.id)}><Text style={[styles.actionText, { color: '#ef4444' }]}>Delete</Text></TouchableOpacity>
                                </View>
                            )}
                        </View>
                    </View>
                ))}
            </View>
        </View>
    );

    return (
        <View style={{ flex: 1, backgroundColor: 'transparent' }}>
            {/* Header */}
            <View style={[styles.navbar, { paddingTop: insets.top }]}>
                <TouchableOpacity onPress={onBack} style={{ padding: 12 }}>
                    <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#2563eb' }}>←</Text>
                </TouchableOpacity>
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#111827' }}>Post Details</Text>
                <View style={{ width: 48 }} />
            </View>

            {loading ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color="#2563eb" />
                </View>
            ) : (
                <FlatList
                    ref={flatListRef}
                    data={comments}
                    keyExtractor={item => item.id.toString()}
                    renderItem={renderComment}
                    ListHeaderComponent={() => (
                        <View style={{ backgroundColor: 'transparent' }}>
                            {renderPost()}
                            <View style={styles.commentSectionHeader}>
                                <Text style={styles.commentSectionTitle}>COMMENTS</Text>
                            </View>
                        </View>
                    )}
                    contentContainerStyle={{ paddingBottom: 100 }}
                    keyboardShouldPersistTaps="handled"
                />
            )}

            {/* Bottom Floating Trigger */}
            <View style={[styles.bottomTrigger, { paddingBottom: Math.max(insets.bottom, 16) }]}>
                <TouchableOpacity style={styles.triggerButton} onPress={openCommentInput}>
                    <Text style={styles.triggerText}>Write a comment...</Text>
                    <View style={styles.triggerIcon}>
                        <Text style={{ color: '#fff' }}>Post</Text>
                    </View>
                </TouchableOpacity>
            </View>

            {/* Comment Input Modal */}
            <Modal
                visible={isInputVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={closeInputMode}
            >
                <View style={styles.modalOverlay}>
                    <TouchableOpacity
                        style={styles.modalDismissArea}
                        activeOpacity={1}
                        onPress={closeInputMode}
                    />
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        style={styles.modalContainer}
                    >
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <TouchableOpacity onPress={closeInputMode}>
                                    <Text style={styles.modalCancelText}>Cancel</Text>
                                </TouchableOpacity>
                                <Text style={styles.modalTitle}>
                                    {editingComment ? 'Edit Comment' : editingReply ? 'Edit Reply' : replyingTo ? 'Reply' : 'New Comment'}
                                </Text>
                                <TouchableOpacity onPress={handleSend} disabled={!newComment.trim()}>
                                    <Text style={[styles.modalPostText, !newComment.trim() && { color: '#9ca3af' }]}>
                                        {editingComment || editingReply ? 'Update' : 'Post'}
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            {replyingTo && (
                                <View style={styles.modalReplyContext}>
                                    <Text style={styles.modalReplyContextText} numberOfLines={1}>
                                        Replying to {replyingTo.author_detail.full_name}: "{replyingTo.content}"
                                    </Text>
                                </View>
                            )}

                            <TextInput
                                ref={inputRef}
                                style={styles.modalInput}
                                placeholder="What's on your mind?"
                                value={newComment}
                                onChangeText={setNewComment}
                                multiline
                                autoFocus={true}
                                placeholderTextColor="#9ca3af"
                            />
                        </View>
                    </KeyboardAvoidingView>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    navbar: { backgroundColor: 'transparent', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderColor: '#e5e7eb' },
    postCard: { padding: 15, marginBottom: 8 },
    postHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#eff6ff', borderWidth: 2, borderColor: '#2563eb' },
    author: { fontWeight: 'bold', fontSize: 16, marginLeft: 12, color: '#111827' },
    date: { color: '#6b7280', fontSize: 12, marginLeft: 12 },
    postContent: { fontSize: 16, color: '#374151', marginBottom: 15, lineHeight: 24 },
    postImage: { height: 300, borderRadius: 12, marginRight: 10 },
    imageBadge: { position: 'absolute', bottom: 12, right: 12, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    imageBadgeText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
    postStats: { flexDirection: 'row', borderTopWidth: 1, borderColor: '#f3f4f6', paddingTop: 15, justifyContent: 'space-around' },
    statButton: { flexDirection: 'row', alignItems: 'center' },
    statText: { marginLeft: 6, fontSize: 14, color: '#6b7280', fontWeight: '500' },

    commentSectionHeader: { padding: 15, backgroundColor: 'transparent' },
    commentSectionTitle: { fontWeight: 'bold', fontSize: 13, color: '#6b7280', letterSpacing: 1 },

    commentRow: { flexDirection: 'row', padding: 15, backgroundColor: 'transparent', borderBottomWidth: 1, borderColor: '#f3f4f6' },
    bubble: { padding: 12, borderRadius: 18, borderTopLeftRadius: 2 },
    commentAuthor: { fontWeight: 'bold', marginBottom: 2, fontSize: 14, color: '#111827' },
    commentText: { fontSize: 15, color: '#374151', lineHeight: 20 },
    actions: { flexDirection: 'row', gap: 15, marginTop: 8, alignItems: 'center' },
    actionText: { fontSize: 12, color: '#2563eb', fontWeight: 'bold' },

    bottomTrigger: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(255, 255, 255, 0.9)', paddingTop: 12, paddingHorizontal: 16, borderTopWidth: 1, borderColor: '#e5e7eb' },
    triggerButton: { backgroundColor: '#f3f4f6', borderRadius: 24, paddingVertical: 10, paddingLeft: 20, paddingRight: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    triggerText: { color: '#6b7280', fontSize: 15 },
    triggerIcon: { backgroundColor: '#2563eb', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 18 },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    modalDismissArea: { flex: 1 },
    modalContainer: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: 'hidden' },
    modalContent: { padding: 16, minHeight: 250 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingBottom: 15, borderBottomWidth: 1, borderColor: '#f3f4f6' },
    modalCancelText: { color: '#6b7280', fontSize: 16 },
    modalTitle: { fontSize: 17, fontWeight: 'bold', color: '#111827' },
    modalPostText: { color: '#2563eb', fontSize: 16, fontWeight: 'bold' },
    modalReplyContext: { backgroundColor: '#eff6ff', padding: 10, borderRadius: 8, marginBottom: 15 },
    modalReplyContextText: { fontSize: 13, color: '#1e40af' },
    modalInput: { fontSize: 17, color: '#111827', minHeight: 120, textAlignVertical: 'top' },
});

export default PostDetailScreen;
