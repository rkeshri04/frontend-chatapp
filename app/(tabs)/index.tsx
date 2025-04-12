import { useEffect, useState } from 'react';
import { StyleSheet, Text, View, SafeAreaView, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { ThemedText } from '@/app-example/components/ThemedText';
import { useRouter } from 'expo-router';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchConversations, setCurrentChat } from '../store/slices/chatSlice';
import { updateActivity, logout } from '../store/slices/authSlice';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../hooks/useAppTheme';

// Define the interface for chat items
interface ChatItem {
  id: string;
  name: string;
  lastMessage?: string;
  unreadCount: number;
}

export default function TabOneScreen() {
  const chats = useAppSelector(state => state.chat.chats);
  const isLoading = useAppSelector(state => state.chat.isLoading);
  const error = useAppSelector(state => state.chat.error);
  const token = useAppSelector(state => state.auth.token);
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { colors, colorScheme } = useAppTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [authError, setAuthError] = useState(false);

  // Fetch conversations when component mounts
  useEffect(() => {
    if (token) {
      console.log('User has token, fetching conversations');
      loadConversations();
      // Update user activity time
      dispatch(updateActivity());
    } else {
      console.log('No token found, checking initialization status');
      // Don't automatically redirect - wait for initialization to complete
    }
  }, [dispatch, token]);

  const loadConversations = async () => {
    try {
      setRefreshing(true);
      console.log('Loading conversations...');
      await dispatch(fetchConversations()).unwrap();
      console.log('Conversations loaded successfully');
      setAuthError(false);
    } catch (error) {
      console.error('Failed to load conversations:', error);

      // Show error but don't automatically log out
      if (typeof error === 'string' && error.includes('Authentication failed')) {
        setAuthError(true);
      }
    } finally {
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadConversations();
    setRefreshing(false);
  };

  const handleChatPress = (chatId: string) => {
    dispatch(setCurrentChat(chatId));
    dispatch(updateActivity());
    router.push(`../chat/${chatId}`);
  };

  const renderChatItem = ({ item }: { item: ChatItem }) => {
    return (
      <TouchableOpacity 
        style={[
          styles.chatItem, 
          { backgroundColor: colors.background }
        ]} 
        onPress={() => handleChatPress(item.id)}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{item.name?.[0]?.toUpperCase() || '?'}</Text>
        </View>
        
        <View style={styles.chatInfo}>
          <View style={styles.chatHeader}>
            <Text style={[styles.chatName, { color: colors.text }]}>{item.name}</Text>
          </View>
          
          <Text style={[styles.chatText, { color: colors.text, marginTop: 10 }]}>
            Tap to view conversation!
          </Text>
          
          <View style={styles.chatFooter}>
            <Text 
              style={[styles.lastMessage, { color: colors.icon }]} 
              numberOfLines={1}
            >
              {item.lastMessage}
            </Text>
            
            {item.unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>{item.unreadCount}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Render authentication error UI if needed
  if (authError) {
    return (
      <View style={[styles.container, styles.centerContent, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.text }]}>
          Authentication error. Your session may have expired.
        </Text>
        <View style={styles.buttonRow}>
          <TouchableOpacity 
            style={[styles.button, { backgroundColor: colors.tint }]}
            onPress={loadConversations}
          >
            <Text style={styles.buttonText}>Retry</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.button, { backgroundColor: 'gray' }]}
            onPress={() => {
              dispatch(logout());
              router.replace('../(auth)');
            }}
          >
            <Text style={styles.buttonText}>Log Out</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <>
      {/* <SafeAreaView style={{ backgroundColor: colors.background}} /> */}
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {isLoading && !refreshing && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.tint} />
          </View>
        )}
        
        {error && (
          <View style={styles.errorContainer}>
            <Text style={[styles.errorText, { color: colors.text }]}>
              {error}
            </Text>
            <TouchableOpacity 
              style={[styles.retryButton, { backgroundColor: colors.tint }]} 
              onPress={loadConversations}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}
        
        {!isLoading && !error && chats.length === 0 && (
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubble-ellipses-outline" size={60} color={colors.icon} />
            <Text style={[styles.emptyText, { color: colors.text }]}>
              No conversations yet
            </Text>
            <Text style={[styles.emptySubtext, { color: colors.icon }]}>
              Start a new chat to begin messaging
            </Text>
          </View>
        )}
        
        <FlatList
          data={chats}
          renderItem={renderChatItem}
          keyExtractor={item => item.id}
          style={styles.chatList}
          contentContainerStyle={chats.length === 0 ? styles.listEmpty : null}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[colors.tint]}
              tintColor={colors.tint}
            />
          }
          ListFooterComponent={
            isLoading && !refreshing ? (
              <View style={styles.footerLoading}>
                <ActivityIndicator size="large" color={colors.tint} />
                <Text style={[styles.loadingText, { color: colors.text }]}>
                  Loading conversations...
                </Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            isLoading && !refreshing ? (
              <View style={styles.centerLoading}>
                <ActivityIndicator size="large" color={colors.tint} />
                <Text style={[styles.loadingText, { color: colors.text }]}>
                  Loading conversations...
                </Text>
              </View>
            ) : null
          }
        />
        
        <TouchableOpacity 
          style={[styles.fabButton, { backgroundColor: colors.tint }]}
          onPress={() => router.push('../new-chat')}
        >
          <Ionicons name="create-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  chatList: {
    flex: 1,
  },
  listEmpty: {
    flex: 1,
  },
  chatItem: {
    height: 80,
    flexDirection: 'row',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#0a7ea4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  avatarText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  chatInfo: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  chatName: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  chatText: {
    fontSize: 14,
    opacity: 0.7,
  },
  chatFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    flex: 1,
    fontSize: 14,
  },
  unreadBadge: {
    backgroundColor: '#0a7ea4',
    borderRadius: 10,
    height: 20,
    minWidth: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
    marginLeft: 5,
  },
  unreadText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 10,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  fabButton: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    minWidth: 100,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  footerLoading: {
    padding: 20,
    alignItems: 'center',
  },
  centerLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    height: 300,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
});
