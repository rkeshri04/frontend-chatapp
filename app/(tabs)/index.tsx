import { useEffect, useState } from 'react';
import { StyleSheet, Text, View, SafeAreaView, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Alert, Modal, TextInput, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchConversations, setCurrentChat, verifyConversationCode, fetchChatMessages, approveConversation, selectMappedChats } from '../store/slices/chatSlice';
import { logout } from '../store/slices/authSlice';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../hooks/useAppTheme';
import SearchUserOverlay from '../../components/SearchUserOverlay';

interface ChatItem {
  id: string;
  name: string;
  lastMessage?: string;
  unreadCount: number;
  status?: 'pending' | 'approved' | 'rejected' | 'pending_approval' | 'pending_sent' | string;
  otherUserId?: string | null;
}

export default function TabOneScreen() {
  const chats: ChatItem[] = useAppSelector(selectMappedChats);
  const currentUserId = useAppSelector(state => state.auth.user?.id);
  const isLoading = useAppSelector(state => state.chat.isLoading);
  const error = useAppSelector(state => state.chat.error);
  const token = useAppSelector(state => state.auth.token);
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { colors, colorScheme } = useAppTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [authError, setAuthError] = useState(false);

  const [verifyModalVisible, setVerifyModalVisible] = useState(false);
  const [selectedChatIdForVerify, setSelectedChatIdForVerify] = useState<string | null>(null);
  const [enteredVerifyCode, setEnteredVerifyCode] = useState('');
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const [verifyCodeError, setVerifyCodeError] = useState<string | null>(null);
  const [showVerifyCode, setShowVerifyCode] = useState(false);

  const [approveModalVisible, setApproveModalVisible] = useState(false);
  const [selectedChatIdForApprove, setSelectedChatIdForApprove] = useState<string | null>(null);
  const [enteredApproveCode, setEnteredApproveCode] = useState('');
  const [confirmApproveCode, setConfirmApproveCode] = useState('');
  const [isApproving, setIsApproving] = useState(false);
  const [approveCodeError, setApproveCodeError] = useState<string | null>(null);
  const [showApproveCode, setShowApproveCode] = useState(false);

  const [searchOverlayVisible, setSearchOverlayVisible] = useState(false);

  useEffect(() => {
    if (token) {
      loadConversations();
    }
  }, [dispatch, token]);

  const loadConversations = async () => {
    try {
      setRefreshing(true);
      await dispatch(fetchConversations()).unwrap();
      setAuthError(false);
    } catch (error) {
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

  const handleChatPress = (chat: ChatItem) => {
    if (chat.status === 'pending') {
      if (chat.otherUserId !== currentUserId) {
        Alert.alert("Request Pending", "This conversation request has not been approved yet.");
      }
      return;
    }

    setSelectedChatIdForVerify(chat.id);
    setEnteredVerifyCode('');
    setVerifyCodeError(null);
    setIsVerifyingCode(false);
    setShowVerifyCode(false);
    setVerifyModalVisible(true);
  };

  const handleVerifyPrimaryCode = async () => {
    if (!selectedChatIdForVerify || !enteredVerifyCode.trim()) {
      setVerifyCodeError('Please enter the code.');
      return;
    }

    setIsVerifyingCode(true);
    setVerifyCodeError(null);

    try {
      const resultAction = await dispatch(verifyConversationCode({ chatId: selectedChatIdForVerify, code: enteredVerifyCode.trim() }));

      if (verifyConversationCode.fulfilled.match(resultAction)) {
        const { chatId } = resultAction.payload;
        const verifiedCode = enteredVerifyCode.trim();

        dispatch(setCurrentChat(chatId));
        await dispatch(fetchChatMessages({ chatId, code: verifiedCode })).unwrap();

        setVerifyModalVisible(false);
        router.push({
          pathname: `../chat/${chatId}`,
          params: { primaryCode: verifiedCode }
        });
      } else {
        let errorMessage = 'Verification failed. Please try again.';
        if (resultAction.payload === 'Invalid code') {
          errorMessage = 'Invalid code. Please check and try again.';
        } else if (typeof resultAction.payload === 'string') {
          errorMessage = resultAction.payload;
        }
        setVerifyCodeError(errorMessage);
      }
    } catch (err: any) {
      setVerifyCodeError('An error occurred. Please check your connection and try again.');
    } finally {
      setIsVerifyingCode(false);
    }
  };

  const closeVerifyModal = () => {
    setVerifyModalVisible(false);
    setSelectedChatIdForVerify(null);
  };

  const openApproveModal = (chatId: string) => {
    setSelectedChatIdForApprove(chatId);
    setEnteredApproveCode('');
    setConfirmApproveCode('');
    setApproveCodeError(null);
    setIsApproving(false);
    setShowApproveCode(false);
    setApproveModalVisible(true);
  };

  const closeApproveModal = () => {
    setApproveModalVisible(false);
    setSelectedChatIdForApprove(null);
  };

  const handleApproveConversation = async () => {
    if (!selectedChatIdForApprove) return;

    if (!enteredApproveCode || !confirmApproveCode) {
      setApproveCodeError('Please enter and confirm the code.');
      return;
    }
    if (enteredApproveCode !== confirmApproveCode) {
      setApproveCodeError('Codes do not match.');
      return;
    }

    setIsApproving(true);
    setApproveCodeError(null);

    try {
      await dispatch(approveConversation({ chatId: selectedChatIdForApprove, code: enteredApproveCode })).unwrap();
      Alert.alert("Success", "Conversation approved!");
      closeApproveModal();
    } catch (error: any) {
    } finally {
      setIsApproving(false);
    }
  };

  const handleRejectConversation = (chatId: string, chatName: string) => {
    Alert.alert(
      "Reject Conversation",
      `Are you sure you want to reject the conversation request from ${chatName}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reject",
          style: "destructive",
          onPress: () => {
            Alert.alert("Info", "Reject functionality not yet implemented.");
          },
        },
      ]
    );
  };

  const renderChatItem = ({ item }: { item: ChatItem }) => {
    const isIncomingRequest = item.status === 'pending_approval';
    const isOutgoingRequest = item.status === 'pending' || item.status === 'pending_sent';

    return (
      <TouchableOpacity
        style={[
          styles.chatItem,
          { backgroundColor: colors.background }
        ]}
        onPress={() => (isIncomingRequest ? null : handleChatPress(item))}
        disabled={isIncomingRequest}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{item.name?.[0]?.toUpperCase() || '?'}</Text>
        </View>

        <View style={styles.chatInfo}>
          <View style={styles.chatHeader}>
            <Text style={[styles.chatName, { color: colors.text }]}>{item.name}</Text>
          </View>

          {isIncomingRequest ? (
            <View style={styles.pendingActions}>
              <Text style={[styles.pendingText, { color: colors.icon }]}>Incoming Request</Text>
              <View style={styles.actionButtons}>
                <TouchableOpacity onPress={() => openApproveModal(item.id)} style={styles.approveButton}>
                  <Ionicons name="checkmark-circle" size={28} color="green" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleRejectConversation(item.id, item.name)} style={styles.rejectButton}>
                  <Ionicons name="close-circle" size={28} color="red" />
                </TouchableOpacity>
              </View>
            </View>
          ) : isOutgoingRequest ? (
            <Text style={[styles.chatText, { color: colors.icon, marginTop: 10, fontStyle: 'italic' }]}>
              Request Sent
            </Text>
          ) : (
            <Text style={[styles.chatText, { color: colors.text, marginTop: 10 }]}>
              Tap to view conversation!
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

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
          onPress={() => setSearchOverlayVisible(true)}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>

        <Modal
          animationType="slide"
          transparent={true}
          visible={verifyModalVisible}
          onRequestClose={closeVerifyModal}
        >
          <View style={styles.modalCenteredView}>
            <View style={[styles.modalView, { backgroundColor: colors.card }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Enter Conversation Code</Text>
              <Text style={[styles.modalSubtitle, { color: colors.icon }]}>
                Please enter the code provided to access this conversation.
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
                    onPress={closeVerifyModal}
                  >
                    <Text style={styles.modalButtonText}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.modalButton, { backgroundColor: colors.tint }]}
                    onPress={handleVerifyPrimaryCode}
                    disabled={!enteredVerifyCode.trim()}
                  >
                    <Text style={styles.modalButtonText}>Verify</Text>
                  </Pressable>
                </View>
              )}
            </View>
          </View>
        </Modal>

        <Modal
          animationType="slide"
          transparent={true}
          visible={approveModalVisible}
          onRequestClose={closeApproveModal}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.modalCenteredView}
          >
            <View style={[styles.modalView, { backgroundColor: colors.card }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Approve Conversation</Text>
              <Text style={[styles.modalSubtitle, { color: colors.icon }]}>
                Set a secure code for this conversation. Share it only with the other participant.
              </Text>

              <View style={[styles.inputContainer, { borderColor: colors.border, marginBottom: 10 }]}>
                <TextInput
                  style={[styles.modalInput, { color: colors.text }]}
                  placeholder="Enter secure code"
                  placeholderTextColor={colors.icon}
                  value={enteredApproveCode}
                  onChangeText={setEnteredApproveCode}
                  secureTextEntry={!showApproveCode}
                  autoCapitalize="none"
                  editable={!isApproving}
                />
                <TouchableOpacity onPress={() => setShowApproveCode(!showApproveCode)} style={styles.eyeIcon}>
                  <Ionicons
                    name={showApproveCode ? "eye-off-outline" : "eye-outline"}
                    size={24}
                    color={colors.icon}
                  />
                </TouchableOpacity>
              </View>

              <View style={[styles.inputContainer, { borderColor: colors.border }]}>
                <TextInput
                  style={[styles.modalInput, { color: colors.text }]}
                  placeholder="Confirm secure code"
                  placeholderTextColor={colors.icon}
                  value={confirmApproveCode}
                  onChangeText={setConfirmApproveCode}
                  secureTextEntry={!showApproveCode}
                  autoCapitalize="none"
                  editable={!isApproving}
                />
              </View>

              {approveCodeError && (
                <Text style={styles.modalErrorText}>{approveCodeError}</Text>
              )}

              {isApproving ? (
                <ActivityIndicator size="large" color={colors.tint} style={styles.modalSpinner} />
              ) : (
                <View style={styles.modalButtonContainer}>
                  <Pressable
                    style={[styles.modalButton, { backgroundColor: 'gray' }]}
                    onPress={closeApproveModal}
                  >
                    <Text style={styles.modalButtonText}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.modalButton,
                      { backgroundColor: colors.tint },
                      (!enteredApproveCode || enteredApproveCode !== confirmApproveCode) && styles.disabledButton
                    ]}
                    onPress={handleApproveConversation}
                    disabled={!enteredApproveCode || enteredApproveCode !== confirmApproveCode}
                  >
                    <Text style={styles.modalButtonText}>Approve</Text>
                  </Pressable>
                </View>
              )}
            </View>
          </KeyboardAvoidingView>
        </Modal>

        <SearchUserOverlay
          visible={searchOverlayVisible}
          onClose={() => setSearchOverlayVisible(false)}
        />
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
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomRightRadius: 20,
    borderBottomLeftRadius: 20,
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
    justifyContent: 'center',
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
  pendingActions: {
    marginTop: 5,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pendingText: {
    fontSize: 14,
    fontStyle: 'italic',
    flexShrink: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
  },
  approveButton: {
    padding: 5,
  },
  rejectButton: {
    padding: 5,
    marginLeft: 8,
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
  modalCenteredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
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
