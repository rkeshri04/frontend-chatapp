import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { useAppDispatch, useAppSelector } from '../app/store/hooks';
import { searchUsers, clearSearchResults } from '../app/store/slices/searchSlice';
import { requestConversation, verifyConversationCode, setCurrentChat, fetchChatMessages } from '../app/store/slices/chatSlice';
import { logout } from '../app/store/slices/authSlice';
import { useAppTheme } from '../app/hooks/useAppTheme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

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
  const loggedInUserId = useAppSelector(state => state.auth.user?.id);
  const router = useRouter();

  const [requestedUserIds, setRequestedUserIds] = useState<Set<string>>(new Set());
  const [requestingId, setRequestingId] = useState<string | null>(null);

  const [verifyModalVisible, setVerifyModalVisible] = useState(false);
  const [selectedUserForVerify, setSelectedUserForVerify] = useState<UserSearchResult | null>(null);
  const [enteredVerifyCode, setEnteredVerifyCode] = useState('');
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const [verifyCodeError, setVerifyCodeError] = useState<string | null>(null);
  const [showVerifyCode, setShowVerifyCode] = useState(false);
  const [verifyAttempts, setVerifyAttempts] = useState(0);

  useEffect(() => {
    if (!visible) {
      dispatch(clearSearchResults());
      setSearchTerm('');
      setRequestedUserIds(new Set());
      setRequestingId(null);
      closeVerifyModalInOverlay();
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
    if (requestingId === user.id) return;

    Alert.alert(
      "Start Conversation",
      `Are you sure you want to start a conversation with ${user.username}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Yes",
          onPress: async () => {
            setRequestingId(user.id);
            try {
              await dispatch(requestConversation({ user2_id: user.id })).unwrap();
              setRequestedUserIds(prev => new Set(prev).add(user.id));
              Alert.alert("Success", `Conversation request sent to ${user.username}.`);
            } catch (err: any) {
              Alert.alert("Error", `Failed to send request: ${err || 'Unknown error'}`);
            } finally {
              setRequestingId(null);
            }
          },
        },
      ]
    );
  };

  const handleOpenVerifyModal = (user: UserSearchResult) => {
    if (!user.conversation_id) {
      Alert.alert("Error", "Conversation ID is missing.");
      return;
    }
    setSelectedUserForVerify(user);
    setEnteredVerifyCode('');
    setVerifyCodeError(null);
    setIsVerifyingCode(false);
    setShowVerifyCode(false);
    setVerifyAttempts(0);
    setVerifyModalVisible(true);
  };

  const closeVerifyModalInOverlay = () => {
    setVerifyModalVisible(false);
    setSelectedUserForVerify(null);
    setVerifyAttempts(0);
  };

  const handleVerifyCodeInOverlay = async () => {
    if (!selectedUserForVerify || !selectedUserForVerify.conversation_id || !enteredVerifyCode.trim()) {
      setVerifyCodeError('Please enter the code.');
      return;
    }

    const chatId = selectedUserForVerify.conversation_id;
    const code = enteredVerifyCode.trim();

    setIsVerifyingCode(true);
    setVerifyCodeError(null);

    try {
      const resultAction = await dispatch(verifyConversationCode({ chatId, code }));

      if (verifyConversationCode.fulfilled.match(resultAction)) {
        setVerifyAttempts(0);
        const verifiedCode = code;

        dispatch(setCurrentChat(chatId));
        await dispatch(fetchChatMessages({ chatId, code: verifiedCode })).unwrap();

        closeVerifyModalInOverlay();
        onClose();
        router.push({
          pathname: `../chat/${chatId}`,
          params: { primaryCode: verifiedCode }
        });
      } else {
        const newAttempts = verifyAttempts + 1;
        setVerifyAttempts(newAttempts);

        let errorMessage = 'Verification failed. Please try again.';
        if (resultAction.payload === 'Invalid code') {
          errorMessage = `Invalid code. Attempt ${newAttempts} of 3.`;
        } else if (typeof resultAction.payload === 'string') {
          errorMessage = resultAction.payload;
        }
        setVerifyCodeError(errorMessage);

        if (newAttempts >= 3 && resultAction.payload === 'Invalid code') {
          closeVerifyModalInOverlay();
          onClose();

          Alert.alert(
            "Too Many Failed Attempts",
            "You have entered the wrong code too many times. You will be logged out.",
            [{ text: "OK", onPress: async () => {
                try {
                  await dispatch(logout()).unwrap();
                  setTimeout(() => {
                    router.replace('../(auth)');
                  }, 10);
                } catch (logoutError) {
                   console.error("Logout failed after failed attempts:", logoutError);
                }
            }}]
          );
          setIsVerifyingCode(false);
          return;
        }
      }
    } catch (err: any) {
      setVerifyCodeError('An error occurred. Please check connection.');
    } finally {
      if (verifyAttempts < 3 || (verifyAttempts >= 3 && verifyCodeError !== 'Invalid code')) {
        setIsVerifyingCode(false);
      }
    }
  };

  const renderItem = ({ item }: { item: UserSearchResult }) => {
    if (item.id === loggedInUserId) {
      return null;
    }

    const showAddButton = !item.conversation_exists && !requestedUserIds.has(item.id);
    const isRequestSent = requestedUserIds.has(item.id) && !item.conversation_exists;
    const canInteract = item.conversation_exists || showAddButton;

    const avatarLetter = item.username?.[0]?.toUpperCase() || item.email?.[0]?.toUpperCase() || '?';

    return (
      <TouchableOpacity
        onPress={() => {
          if (item.conversation_exists) {
            handleOpenVerifyModal(item);
          } else if (showAddButton) {
            handleStartConversation(item);
          }
        }}
        disabled={!canInteract}
        style={[
            styles.itemContainer,
            { borderBottomColor: colors.border },
            !canInteract && styles.disabledItem
        ]}
      >
        <View style={[styles.avatarContainer, { backgroundColor: colors.tint }]}>
          <Text style={styles.avatarText}>{avatarLetter}</Text>
        </View>

        <View style={styles.userInfo}>
          <Text style={[styles.username, { color: colors.text }]}>{item.username}</Text>
          <Text style={[styles.email, { color: colors.icon }]}>{item.email}</Text>
        </View>

        {showAddButton && (
          <View style={styles.addButton}>
            {requestingId === item.id ? (
              <ActivityIndicator size="small" color={colors.tint} />
            ) : (
              <Ionicons name="add-circle-outline" size={28} color={colors.tint} />
            )}
          </View>
        )}
        {item.conversation_exists && (
           <Ionicons name="chatbubble-ellipses-outline" size={24} color={colors.tint} style={styles.existingIcon} />
        )}
         {isRequestSent && (
           <Ionicons name="checkmark-done-circle-outline" size={24} color={colors.icon} style={styles.existingIcon} title="Request Sent"/>
        )}
      </TouchableOpacity>
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

          <Modal
            animationType="fade"
            transparent={true}
            visible={verifyModalVisible}
            onRequestClose={closeVerifyModalInOverlay}
          >
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              style={styles.innerModalCenteredView}
            >
              <View style={[styles.modalView, { backgroundColor: colors.card }]}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Enter Code for {selectedUserForVerify?.username}</Text>
                <Text style={[styles.modalSubtitle, { color: colors.icon }]}>
                  Enter the code to access this conversation.
                </Text>

                <View style={[styles.inputContainer, { borderColor: colors.border }]}>
                  <TextInput
                    style={[styles.modalInput, { color: colors.text }]}
                    placeholder="Enter code..."
                    placeholderTextColor={colors.icon}
                    value={enteredVerifyCode}
                    onChangeText={setEnteredVerifyCode}
                    secureTextEntry={!showVerifyCode}
                    autoCapitalize="none"
                    editable={!isVerifyingCode}
                  />
                  <TouchableOpacity onPress={() => setShowVerifyCode(!showVerifyCode)} style={styles.eyeIcon}>
                    <Ionicons
                      name={showVerifyCode ? "eye-off-outline" : "eye-outline"}
                      size={24}
                      color={colors.icon}
                    />
                  </TouchableOpacity>
                </View>

                {verifyCodeError && (
                  <Text style={styles.modalErrorText}>{verifyCodeError}</Text>
                )}

                {isVerifyingCode ? (
                  <ActivityIndicator size="large" color={colors.tint} style={styles.modalSpinner} />
                ) : (
                  <View style={styles.modalButtonContainer}>
                    <Pressable
                      style={[styles.modalButton, { backgroundColor: 'gray' }]}
                      onPress={closeVerifyModalInOverlay}
                    >
                      <Text style={styles.modalButtonText}>Cancel</Text>
                    </Pressable>
                    <Pressable
                      style={[
                          styles.modalButton,
                          { backgroundColor: colors.tint },
                          !enteredVerifyCode.trim() && styles.disabledButton
                      ]}
                      onPress={handleVerifyCodeInOverlay}
                      disabled={!enteredVerifyCode.trim()}
                    >
                      <Text style={styles.modalButtonText}>Verify</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            </KeyboardAvoidingView>
          </Modal>

        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    height: '85%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingTop: 15,
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
    flex: 1,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  disabledItem: {
    opacity: 0.5,
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  userInfo: {
    flex: 1,
    marginRight: 10,
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
    padding: 5,
    marginLeft: 10,
  },
  existingIcon: {
     marginLeft: 10,
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
  innerModalCenteredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  modalView: {
    margin: 20,
    borderRadius: 20,
    padding: 35,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: '85%',
  },
  modalTitle: {
    marginBottom: 8,
    textAlign: "center",
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalSubtitle: {
    marginBottom: 15,
    textAlign: "center",
    fontSize: 14,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 15,
    width: '100%',
  },
  modalInput: {
    flex: 1,
    height: 45,
    paddingHorizontal: 15,
    fontSize: 16,
  },
  eyeIcon: {
    padding: 10,
  },
  modalErrorText: {
    color: 'red',
    marginBottom: 15,
    textAlign: 'center',
    fontSize: 14,
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 10,
  },
  modalButton: {
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    elevation: 2,
    minWidth: 100,
    alignItems: 'center',
  },
  modalButtonText: {
    color: "white",
    fontWeight: "bold",
    textAlign: "center",
    fontSize: 16,
  },
  modalSpinner: {
    marginTop: 15,
    marginBottom: 15,
  },
  disabledButton: {
    opacity: 0.5,
  },
});

export default SearchUserOverlay;
