import { useEffect, useState, useRef } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View, ActivityIndicator, Modal, Pressable, Alert, SafeAreaView } from 'react-native';
import { useLocalSearchParams, useRouter, Stack, useNavigation } from 'expo-router';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { sendMessage, setCurrentChat, clearCurrentChat, fetchConversations, verifySecondaryCode, fetchUnlockedMessage, manuallyLockMessage } from '../store/slices/chatSlice';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../hooks/useAppTheme';

interface Message {
  id: string;
  text: string;
  sender: string;
  timestamp: string | number | Date;
  secondary_auth?: boolean;
  is_verified?: boolean;
  verification_attempts?: number;
}

type UnlockedTimestamps = {
  [messageId: string]: number;
};

const AUTO_RELOCK_DURATION = 60 * 1000;

export default function ChatScreen() {
  const { id, primaryCode: primaryCodeFromParams } = useLocalSearchParams<{ id: string, primaryCode?: string }>();
  const chatId = id as string;
  const primaryCode = primaryCodeFromParams;

  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const dispatch = useAppDispatch();
  const router = useRouter();
  const navigation = useNavigation();
  const { colors, colorScheme } = useAppTheme();
  const flatListRef = useRef<FlatList>(null);

  const chat = useAppSelector(state =>
    state.chat.chats.find(c => c.id === chatId)
  );

  const getMessageById = (messageId: string | null): Message | undefined => {
    if (!messageId) return undefined;
    return chat?.messages.find(m => m.id === messageId);
  };

  const isLoading = useAppSelector(state => state.chat.isLoading);
  const error = useAppSelector(state => state.chat.error);

  const [secondaryModalVisible, setSecondaryModalVisible] = useState(false);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [enteredSecondaryCode, setEnteredSecondaryCode] = useState('');
  const [isSecondaryVerifying, setIsSecondaryVerifying] = useState(false);
  const [secondaryVerificationError, setSecondaryVerificationError] = useState<string | null>(null);
  const [showSecondaryCode, setShowSecondaryCode] = useState(false);
  const [unlockedTimestamps, setUnlockedTimestamps] = useState<UnlockedTimestamps>({});
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const currentAttempts = getMessageById(selectedMessageId)?.verification_attempts || 0;

  useEffect(() => {
    if (!chat) {
      dispatch(fetchConversations());
    }

    if (chatId) {
      dispatch(setCurrentChat(chatId));
    }

    return () => {
      dispatch(clearCurrentChat());
    };
  }, [chatId, dispatch, chat]);

  useEffect(() => {
    if (chat?.messages?.length) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 200);
    }
  }, [chat?.messages]);

  useEffect(() => {
    if (chat?.name) {
      navigation.setOptions({ headerTitle: chat.name });
    }
  }, [chat?.name, navigation]);

  useEffect(() => {
    const checkRelock = () => {
      const now = Date.now();
      let changed = false;
      const newTimestamps = { ...unlockedTimestamps };

      Object.keys(newTimestamps).forEach(msgId => {
        if (now - newTimestamps[msgId] > AUTO_RELOCK_DURATION) {
          delete newTimestamps[msgId];
          changed = true;
        }
      });

      if (changed) {
        setUnlockedTimestamps(newTimestamps);
      }
    };

    intervalRef.current = setInterval(checkRelock, 10000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [unlockedTimestamps, chatId, dispatch]);

  const handleSend = async () => {
    if (!message.trim() || !chatId) return;

    try {
      setIsSending(true);
      await dispatch(sendMessage({ chatId: chatId, text: message.trim() })).unwrap();
      setMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleTyping = (text: string) => {
    setMessage(text);
  };

  const openSecondaryVerifyModal = (messageId: string) => {
    setSelectedMessageId(messageId);
    setEnteredSecondaryCode('');
    setSecondaryVerificationError(null);
    setIsSecondaryVerifying(false);
    setShowSecondaryCode(false);
    setSecondaryModalVisible(true);
  };

  const closeSecondaryModal = () => {
    setSecondaryModalVisible(false);
    setSelectedMessageId(null);
  };

  const handleVerifySecondaryCode = async () => {
    if (!selectedMessageId || !enteredSecondaryCode.trim()) {
      setSecondaryVerificationError('Please enter the secondary code.');
      return;
    }

    if (!primaryCode) {
      setSecondaryVerificationError('Cannot verify: Primary conversation code is missing.');
      console.error('Attempted secondary verification without primary code from navigation params.');
      Alert.alert("Verification Error", "Cannot verify message at this time. Please go back and re-enter the conversation.");
      return;
    }

    const currentSecondaryCode = enteredSecondaryCode.trim();

    setIsSecondaryVerifying(true);
    setSecondaryVerificationError(null);

    try {
      const verifyResultAction = await dispatch(verifySecondaryCode({
        chatId: chatId,
        messageId: selectedMessageId,
        secondaryCode: currentSecondaryCode,
        primaryCode: primaryCode
      }));

      if (verifySecondaryCode.fulfilled.match(verifyResultAction)) {
        console.log(`Secondary code verified for message ${selectedMessageId}. Now fetching content.`);
        const currentMessageId = selectedMessageId!;
        closeSecondaryModal();

        const fetchAction = await dispatch(fetchUnlockedMessage({
          chatId: chatId,
          messageId: currentMessageId,
          primaryCode: primaryCode!,
          secondaryCode: currentSecondaryCode
        }));

        if (fetchUnlockedMessage.fulfilled.match(fetchAction)) {
          setUnlockedTimestamps(prev => ({
            ...prev,
            [currentMessageId]: Date.now()
          }));
        }
      } else {
        const updatedAttempts = (getMessageById(selectedMessageId)?.verification_attempts || 0);
        const attemptsRemaining = 2 - updatedAttempts;

        let errorMessage = 'Verification failed.';
        if (verifyResultAction.payload === 'Invalid secondary code') {
          errorMessage = `Invalid secondary code. ${attemptsRemaining > 0 ? `${attemptsRemaining} attempt${attemptsRemaining > 1 ? 's' : ''} remaining.` : 'No attempts remaining.'}`;
        } else if (verifyResultAction.payload === 'Primary conversation code not found. Cannot verify secondary code.') {
          errorMessage = 'Verification error: Missing primary code context.';
        } else if (typeof verifyResultAction.payload === 'string') {
          errorMessage = verifyResultAction.payload;
        }

        setSecondaryVerificationError(errorMessage);
        console.error(`Secondary verification failed for ${selectedMessageId}. Attempts: ${updatedAttempts}. Error: ${verifyResultAction.payload}`);

        if (updatedAttempts >= 2) {
          Alert.alert('Maximum verification attempts reached.', 'Returning to conversations list.');
          closeSecondaryModal();
          router.replace('../(tabs)');
        }
      }
    } catch (err: any) {
      console.error('An unexpected error occurred during secondary verification/unlock:', err);
      setSecondaryVerificationError('An error occurred. Please try again.');
    } finally {
      setIsSecondaryVerifying(false);
    }
  };

  const handleManualLock = (messageId: string) => {
    dispatch(manuallyLockMessage({ chatId, messageId }));
    setUnlockedTimestamps(prev => {
      const newState = { ...prev };
      delete newState[messageId];
      return newState;
    });
  };

  const handleSosPress = () => {
    console.log('SOS button pressed');
    Alert.alert("SOS", "SOS functionality not yet implemented.");
  };

  if (isLoading && !chat) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  if (error && !chat) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text }}>{error}</Text>
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: colors.tint }]}
          onPress={() => dispatch(fetchConversations())}
        >
          <Text style={{ color: 'white' }}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!chat) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text }}>Chat not found</Text>
      </View>
    );
  }

  const renderMessage = ({ item }: { item: Message }) => {
    const isMe = item.sender === 'me';
    const isCurrentlyUnlocked = item.is_verified && unlockedTimestamps[item.id] && (Date.now() - unlockedTimestamps[item.id] < AUTO_RELOCK_DURATION);

    if (item.secondary_auth && !isCurrentlyUnlocked) {
      const timedOut = item.is_verified && !isCurrentlyUnlocked;

      return (
        <View style={[
          styles.messageBubble,
          isMe ? styles.myMessage : [styles.otherMessage, { backgroundColor: colorScheme === 'dark' ? '#333' : '#E5E5EA' }],
          styles.secondaryAuthContainer
        ]}>
          <Ionicons name="lock-closed-outline" size={18} color={isMe ? 'rgba(255, 255, 255, 0.7)' : colors.icon} style={{ marginRight: 5 }} />
          <Text style={[
            styles.secondaryAuthText,
            isMe ? { color: 'rgba(255, 255, 255, 0.9)' } : { color: colors.text }
          ]}>
            {timedOut ? "Message relocked (timed out)" : "Secondary code required."}
          </Text>
          <TouchableOpacity
            style={[styles.verifyButton, { borderColor: isMe ? 'rgba(255, 255, 255, 0.7)' : colors.tint }]}
            onPress={() => openSecondaryVerifyModal(item.id)}
          >
            <Text style={[styles.verifyButtonText, { color: isMe ? '#fff' : colors.tint }]}>Verify</Text>
          </TouchableOpacity>
          <Text style={[
            styles.messageTime,
            !isMe && { color: colorScheme === 'dark' ? '#999' : 'rgba(0, 0, 0, 0.5)' },
            { marginTop: 8 }
          ]}>
            {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      );
    }

    return (
      <View style={[
        styles.messageBubble,
        isMe ? styles.myMessage : [styles.otherMessage, { backgroundColor: colorScheme === 'dark' ? '#333' : '#E5E5EA' }]
      ]}>
        {item.secondary_auth && isCurrentlyUnlocked && (
          <TouchableOpacity onPress={() => handleManualLock(item.id)} style={styles.lockIconWrapper}>
            <Ionicons
              name="lock-open-outline"
              size={16}
              color={isMe ? 'rgba(255, 255, 255, 0.7)' : colors.icon}
            />
          </TouchableOpacity>
        )}
        <Text style={[
          styles.messageText,
          isMe ? styles.myMessageText : [styles.otherMessageText, { color: colors.text }]
        ]}>
          {item.text}
        </Text>
        <Text style={[
          styles.messageTime,
          !isMe && { color: colorScheme === 'dark' ? '#999' : 'rgba(0, 0, 0, 0.5)' }
        ]}>
          {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
      >
        <Stack.Screen options={{ headerShown: false }} />

        <View style={[styles.customHeader, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
            <Ionicons name="chevron-back" size={28} color={colors.tint} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
            {chat?.name || 'Chat'}
          </Text>
          <TouchableOpacity onPress={handleSosPress} style={styles.headerButton}>
            <Ionicons name="warning-outline" size={26} color={'red'} />
          </TouchableOpacity>
        </View>

        <FlatList
          ref={flatListRef}
          data={chat?.messages || []}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messagesContainer}
          inverted={false}
        />

        <View style={[
          styles.inputContainer,
          {
            backgroundColor: colors.background,
            borderTopColor: colorScheme === 'dark' ? '#333' : '#eee'
          }
        ]}>
          <TextInput
            style={[
              styles.input,
              {
                borderColor: colorScheme === 'dark' ? '#333' : '#ddd',
                color: colors.text,
                backgroundColor: colorScheme === 'dark' ? '#252525' : '#fff'
              }
            ]}
            placeholder="Type a message..."
            value={message}
            onChangeText={handleTyping}
            multiline
            placeholderTextColor={colors.icon}
            editable={!isSending}
          />
          {isSending ? (
            <View style={styles.sendButton}>
              <ActivityIndicator size="small" color={colors.tint} />
            </View>
          ) : (
            <TouchableOpacity
              style={styles.sendButton}
              onPress={handleSend}
              disabled={!message.trim()}
            >
              <Ionicons
                name="send"
                size={24}
                color={message.trim() ? colors.tint : colors.icon}
              />
            </TouchableOpacity>
          )}
        </View>

        <Modal
          animationType="slide"
          transparent={true}
          visible={secondaryModalVisible}
          onRequestClose={closeSecondaryModal}
        >
          <View style={styles.modalCenteredView}>
            <View style={[styles.modalView, { backgroundColor: colors.card }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Verify Message</Text>
              <Text style={[styles.modalSubtitle, { color: colors.icon }]}>
                Enter the secondary code to view this message.
              </Text>

              <View style={[styles.modalInputContainer, { borderColor: colors.border }]}>
                <TextInput
                  style={[styles.modalInput, { color: colors.text }]}
                  placeholder="Enter secondary code..."
                  placeholderTextColor={colors.icon}
                  value={enteredSecondaryCode}
                  onChangeText={setEnteredSecondaryCode}
                  secureTextEntry={!showSecondaryCode}
                  autoCapitalize="none"
                  editable={!isSecondaryVerifying}
                />
                <TouchableOpacity onPress={() => setShowSecondaryCode(!showSecondaryCode)} style={styles.eyeIcon}>
                  <Ionicons
                    name={showSecondaryCode ? "eye-off-outline" : "eye-outline"}
                    size={24}
                    color={colors.icon}
                  />
                </TouchableOpacity>
              </View>

              {secondaryVerificationError && (
                <Text style={styles.modalErrorText}>{secondaryVerificationError}</Text>
              )}

              {isSecondaryVerifying ? (
                <ActivityIndicator size="large" color={colors.tint} style={styles.modalSpinner} />
              ) : (
                <View style={styles.modalButtonContainer}>
                  <Pressable
                    style={[styles.modalButton, { backgroundColor: 'gray' }]}
                    onPress={closeSecondaryModal}
                  >
                    <Text style={styles.modalButtonText}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.modalButton, { backgroundColor: colors.tint }]}
                    onPress={handleVerifySecondaryCode}
                    disabled={!enteredSecondaryCode.trim()}
                  >
                    <Text style={styles.modalButtonText}>Verify</Text>
                  </Pressable>
                </View>
              )}
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  customHeader: {
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerButton: {
    padding: 5,
    minWidth: 40,
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '600',
    marginHorizontal: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  retryButton: {
    marginTop: 15,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
  },
  messagesContainer: {
    padding: 15,
    flexGrow: 1,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 18,
    marginBottom: 10,
  },
  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#0a7ea4',
  },
  otherMessage: {
    alignSelf: 'flex-start',
  },
  messageText: {
    fontSize: 16,
  },
  myMessageText: {
    color: '#fff',
  },
  otherMessageText: {
    color: '#000',
  },
  messageTime: {
    fontSize: 11,
    marginTop: 5,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'right',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    borderTopWidth: 1,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    maxHeight: 120,
    fontSize: 16,
  },
  sendButton: {
    marginLeft: 10,
    padding: 10,
    height: 44,
    width: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryAuthContainer: {
    alignItems: 'flex-start',
  },
  secondaryAuthText: {
    fontSize: 15,
    fontStyle: 'italic',
    marginLeft: 5,
    flexShrink: 1,
  },
  verifyButton: {
    borderWidth: 1,
    borderRadius: 15,
    paddingVertical: 4,
    paddingHorizontal: 10,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  verifyButtonText: {
    fontSize: 13,
    fontWeight: '500',
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
  modalInputContainer: {
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
  lockIconWrapper: {
    position: 'absolute',
    top: 5,
    right: 5,
    padding: 3,
  },
});
