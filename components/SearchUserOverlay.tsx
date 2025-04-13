import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useAppDispatch, useAppSelector } from '../app/store/hooks';
import { searchUsers, clearSearchResults } from '../app/store/slices/searchSlice';
import { requestConversation } from '../app/store/slices/chatSlice'; // Import the new thunk
import { useAppTheme } from '../app/hooks/useAppTheme';
import { Ionicons } from '@expo/vector-icons'; // Import Ionicons

interface SearchUserOverlayProps {
  visible: boolean;
  onClose: () => void;
}

interface UserSearchResult {
  id: string;
  username: string;
  email: string;
  conversation_exists?: boolean;
  conversation_id?: string;
}

const SearchUserOverlay: React.FC<SearchUserOverlayProps> = ({ visible, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const dispatch = useAppDispatch();
  const { results, isLoading, error } = useAppSelector(state => state.search);
  const { colors, colorScheme } = useAppTheme();
  const loggedInUserId = useAppSelector(state => state.auth.user?.id); // Get logged-in user ID

  // State to track users for whom a request has been sent in this session
  const [requestedUserIds, setRequestedUserIds] = useState<Set<string>>(new Set());
  const [requestingId, setRequestingId] = useState<string | null>(null); // Track which user request is in progress

  useEffect(() => {
    // Clear search results and requested IDs when the overlay is closed
    if (!visible) {
      dispatch(clearSearchResults());
      setSearchTerm('');
      setRequestedUserIds(new Set());
      setRequestingId(null);
    }
  }, [visible, dispatch]);

  const handleSearch = (text: string) => {
    setSearchTerm(text);
    if (text.trim().length > 1) {
      dispatch(searchUsers(text.trim()));
    } else {
      dispatch(clearSearchResults());
    }
  };

  const handleStartConversation = async (user: UserSearchResult) => {
    if (requestingId === user.id) return; // Prevent multiple requests

    Alert.alert(
      "Start Conversation",
      `Are you sure you want to start a conversation with ${user.username}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Yes",
          onPress: async () => {
            setRequestingId(user.id); // Set loading state for this specific user
            try {
              console.log(`Attempting to start conversation with user ID: ${user.id}`);
              await dispatch(requestConversation({ user2_id: user.id })).unwrap();
              // On success, add user ID to the set to hide the '+' icon
              setRequestedUserIds(prev => new Set(prev).add(user.id));
              Alert.alert("Success", `Conversation request sent to ${user.username}.`);
            } catch (err: any) {
              console.error("Failed to send conversation request:", err);
              Alert.alert("Error", `Failed to send request: ${err || 'Unknown error'}`);
            } finally {
              setRequestingId(null); // Clear loading state regardless of outcome
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: UserSearchResult }) => {
    // Don't show the logged-in user in search results
    if (item.id === loggedInUserId) {
      return null;
    }

    const showAddButton = !item.conversation_exists && !requestedUserIds.has(item.id);
    const avatarLetter = item.username?.[0]?.toUpperCase() || item.email?.[0]?.toUpperCase() || '?';

    return (
      <View style={[styles.itemContainer, { borderBottomColor: colors.border }]}>
        {/* Avatar */}
        <View style={[styles.avatarContainer, { backgroundColor: colors.tint }]}>
          <Text style={styles.avatarText}>{avatarLetter}</Text>
        </View>

        {/* User Info */}
        <View style={styles.userInfo}>
          <Text style={[styles.username, { color: colors.text }]}>{item.username}</Text>
          <Text style={[styles.email, { color: colors.icon }]}>{item.email}</Text>
        </View>

        {/* Action Button/Icon */}
        {showAddButton && (
          <TouchableOpacity
            onPress={() => handleStartConversation(item)}
            disabled={requestingId === item.id}
            style={styles.addButton}
          >
            {requestingId === item.id ? (
              <ActivityIndicator size="small" color={colors.tint} />
            ) : (
              <Ionicons name="add-circle-outline" size={28} color={colors.tint} />
            )}
          </TouchableOpacity>
        )}
        {item.conversation_exists && (
           <Ionicons name="checkmark-circle" size={24} color="green" style={styles.existingIcon} />
        )}
         {requestedUserIds.has(item.id) && !item.conversation_exists && (
           <Ionicons name="checkmark-done-circle-outline" size={24} color={colors.icon} style={styles.existingIcon} title="Request Sent"/>
        )}
      </View>
    );
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>Search Users</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={28} color={colors.icon} />
            </TouchableOpacity>
          </View>

          <TextInput
            style={[
              styles.input,
              {
                borderColor: colors.border,
                color: colors.text,
                backgroundColor: colorScheme === 'dark' ? '#252525' : '#fff',
              },
            ]}
            placeholder="Search by username or email..."
            placeholderTextColor={colors.icon}
            value={searchTerm}
            onChangeText={handleSearch}
            autoCapitalize="none"
            autoCorrect={false}
          />

          {isLoading && searchTerm.trim().length > 2 && (
            <ActivityIndicator size="large" color={colors.tint} style={styles.loader} />
          )}

          {error && (
            <Text style={styles.errorText}>{error}</Text>
          )}

          <FlatList
            data={results}
            renderItem={renderItem}
            keyExtractor={item => item.id}
            style={styles.list}
            ListEmptyComponent={
              !isLoading && searchTerm.trim().length > 2 ? (
                <Text style={[styles.emptyText, { color: colors.icon }]}>No users found.</Text>
              ) : null
            }
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end', // Position modal at the bottom initially
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    height: '85%', // Take up most of the screen
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingTop: 15, // Less padding at the very top
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  input: {
    height: 45,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    fontSize: 16,
    marginBottom: 15,
  },
  list: {
    flex: 1, // Ensure list takes available space
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  avatarContainer: { // Style for the avatar
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12, // Space between avatar and user info
  },
  avatarText: { // Style for the letter inside the avatar
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  userInfo: {
    flex: 1, // Allow user info to take up space
    marginRight: 10, // Add margin before the button/icon
  },
  username: {
    fontSize: 16,
    fontWeight: '500',
  },
  email: {
    fontSize: 14,
    marginTop: 2,
  },
  addButton: {
    padding: 5, // Add padding for easier tapping
    marginLeft: 10, // Space between text and button
  },
  existingIcon: {
     marginLeft: 10, // Space between text and icon
  },
  loader: {
    marginTop: 20,
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    marginTop: 10,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
  },
});

export default SearchUserOverlay;
