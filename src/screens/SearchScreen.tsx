import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, FlatList, StyleSheet, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import client from '../api/client';
import { colors, gradients } from '../constants/theme';

interface SearchResult {
    groups: Group[];
    members: Member[];
}

interface Group {
    id: number;
    name: string;
    description: string;
    cover_image: string | null;
    total_members: number;
}

interface Member {
    id: number;
    full_name: string;
    profile_picture: string | null;
    bio: string;
}

interface SearchScreenProps {
    onClose: () => void;
    onSelectGroup: (group: Group) => void;
}

const SearchScreen = ({ onClose, onSelectGroup }: SearchScreenProps) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult>({ groups: [], members: [] });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (query.length > 2) {
                performSearch();
            } else {
                setResults({ groups: [], members: [] });
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [query]);

    const performSearch = async () => {
        setLoading(true);
        try {
            const response = await client.get(`search/?q=${encodeURIComponent(query)}`);
            setResults(response.data);
        } catch (error) {
            console.error('Search error:', error);
        } finally {
            setLoading(false);
        }
    };

    const renderGroupItem = ({ item }: { item: Group }) => (
        <TouchableOpacity style={styles.resultItem} onPress={() => onSelectGroup(item)}>
            {item.cover_image ? (
                <Image source={{ uri: item.cover_image }} style={styles.resultImage} />
            ) : (
                <View style={[styles.resultImage, { backgroundColor: colors.border }]} />
            )}
            <View style={styles.resultInfo}>
                <Text style={styles.resultName}>{item.name}</Text>
                <Text style={styles.resultSubtext}>{item.total_members} members</Text>
            </View>
            <Text style={{ fontSize: 16, color: colors.textSecondary }}>👥</Text>
        </TouchableOpacity>
    );

    const renderMemberItem = ({ item }: { item: Member }) => (
        <View style={styles.resultItem}>
            {item.profile_picture ? (
                <Image source={{ uri: item.profile_picture }} style={styles.resultImageRound} />
            ) : (
                <View style={[styles.resultImageRound, { backgroundColor: colors.border }]} />
            )}
            <View style={styles.resultInfo}>
                <Text style={styles.resultName}>{item.full_name}</Text>
                <Text style={styles.resultSubtext}>{item.bio || 'No bio'}</Text>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.searchBar}>
                    <Text style={{ fontSize: 18, color: colors.textSecondary }}>🔍</Text>
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search groups and members..."
                        value={query}
                        onChangeText={setQuery}
                        autoFocus
                    />
                    {query.length > 0 && (
                        <TouchableOpacity onPress={() => setQuery('')}>
                            <Text style={{ fontSize: 16, color: colors.textMuted }}>✕</Text>
                        </TouchableOpacity>
                    )}
                </View>
                <TouchableOpacity onPress={onClose}>
                    <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#2563eb" />
                </View>
            ) : (
                <View style={styles.resultsContainer}>
                    {(results.groups.length > 0 || results.members.length > 0) ? (
                        <FlatList
                            data={[
                                ...results.groups.map(g => ({ ...g, type: 'group' })),
                                ...results.members.map(m => ({ ...m, type: 'member' }))
                            ]}
                            keyExtractor={(item: any) => `${item.type}-${item.id}`}
                            renderItem={({ item }: { item: any }) => (
                                item.type === 'group' ? renderGroupItem({ item }) : renderMemberItem({ item })
                            )}
                        />
                    ) : (
                        query.length > 2 && (
                            <View style={styles.emptyContainer}>
                                <Text style={styles.emptyText}>No results found.</Text>
                            </View>
                        )
                    )}
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    backgroundColor: colors.background,
            },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.surfaceLight,
        gap: 12,
        paddingTop: 50, // Safe area fix essentially
    },
    searchBar: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surfaceLight,
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    searchInput: {
        flex: 1,
        marginLeft: 8,
        fontSize: 16,
        color: colors.textPrimary,
    },
    cancelText: {
        color: colors.primaryLight,
        fontSize: 16,
        fontWeight: '500',
    },
    loadingContainer: {
        flex: 1,
    backgroundColor: colors.background,
        justifyContent: 'center',
        alignItems: 'center',
    },
    resultsContainer: {
        flex: 1,
    backgroundColor: colors.background,
    },
    resultItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.surfaceLight,
    },
    resultImage: {
        width: 40,
        height: 40,
        borderRadius: 8,
        marginRight: 12,
    },
    resultImageRound: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 12,
    },
    resultInfo: {
        flex: 1,
    },
    resultName: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    resultSubtext: {
        fontSize: 14,
        color: colors.textSecondary,
    },
    emptyContainer: {
        padding: 40,
        alignItems: 'center',
    },
    emptyText: {
        color: colors.textMuted,
        fontSize: 16,
    },
});

export default SearchScreen;
