import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Dimensions,
  Pressable,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppDispatch, useAppSelector } from '../app/store/hooks';
import { searchUsers, clearSearchResults } from '../app/store/slices/searchSlice';
import { verifyConversationCode, setCurrentChat, fetchChatMessages } from '../app/store/slices/chatSlice';
import { useAppTheme } from '../app/hooks/useAppTheme';
import { useRouter } from 'expo-router';
import { UserSearchResult } from '../app/store/slices/searchSlice';

interface SearchUserOverlayProps {
  visible: boolean;
  onClose: () => void;
}

interface RenderUserItemProps {
  item: UserSearchResult;
}

const screenHeight = Dimensions.get('window').height;

const SearchUserOverlay: React.FC<SearchUserOverlayProps> = ({ visible, onClose }) => {
  const [identifier, setIdentifier] = useState('');
  const dispatch = useAppDispatch();
  const { results, isLoading: isSearchLoading, error: searchError } = useAppSelector((state) => state.search);
  const { colors, colorScheme } = useAppTheme();
  const router = useRouter();
  const slideAnim = useRef(new Animated.Value(screenHeight)).current;

  const [showCodeInput, setShowCodeInput] = useState(false);
  const [verificationChatId, setVerificationChatId] = useState<string | null>(null);
  const [enteredCode, setEnteredCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [showCode, setShowCode] = useState(false);

  useEffect(() => {
    if (visible) {
      Animated.timing(slideAnim, {
        toValue: 60,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: screenHeight,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, slideAnim]);

  const handleSearch = () => {
    setShowCodeInput(false);
    setVerificationChatId(null);
    setVerificationError(null);
    setEnteredCode('');
    if (identifier.trim()) {
      dispatch(searchUsers(identifier.trim()));
    }
  };

  const handleClose = () => {
    Animated.timing(slideAnim, {
      toValue: screenHeight,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      dispatch(clearSearchResults());
      setIdentifier('');
      setShowCodeInput(false);
      setVerificationChatId(null);
      setVerificationError(null);
      setEnteredCode('');
      setIsVerifying(false);
      setShowCode(false);
      onClose();
    });
  };

  const handleResultItemPress = (user: UserSearchResult) => {
    console.log('Clicked user:', user);
    if (user.conversation_exists && user.conversation_id) {
      console.log(`Conversation exists (ID: ${user.conversation_id}). Showing code input.`);
      setVerificationChatId(user.conversation_id);
      setShowCodeInput(true);
      setVerificationError(null);
      setEnteredCode('');
      setShowCode(false);
    } else {
      console.log('No existing conversation. Navigating to new chat screen.');
      handleClose();
      router.push({
        pathname: '../new-chat',
        params: { recipientId: user.id },
      });
    }
  };

  const handleVerifyCodeInOverlay = async () => {
    if (!verificationChatId || !enteredCode.trim()) {
      setVerificationError('Please enter the code.');
      return;
    }

    setIsVerifying(true);
    setVerificationError(null);
    const codeToVerify = enteredCode.trim();

    try {
      const resultAction = await dispatch(verifyConversationCode({ chatId: verificationChatId, code: codeToVerify }));

      if (verifyConversationCode.fulfilled.match(resultAction)) {
        const { chatId } = resultAction.payload;
        console.log(`Code verified for chat ${chatId}. Fetching messages and navigating.`);

        dispatch(setCurrentChat(chatId));

        await dispatch(fetchChatMessages({ chatId, code: codeToVerify })).unwrap();

        handleClose();

        router.push({
          pathname: `../chat/${chatId}`,
          params: { primaryCode: codeToVerify },
        });
      } else {
        let errorMessage = 'Verification failed. Please try again.';
        if (resultAction.payload === 'Invalid code') {
          errorMessage = 'Invalid code. Please check and try again.';
        } else if (typeof resultAction.payload === 'string') {
          errorMessage = resultAction.payload;
        }
        console.error('Verification failed:', errorMessage);
        setVerificationError(errorMessage);
      }
    } catch (err: any) {
      console.error('An unexpected error occurred during verification:', err);
      setVerificationError('An error occurred. Please check your connection and try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const renderUserItem = ({ item }: RenderUserItemProps) => (
    <TouchableOpacity
      style={[styles.resultItem, { borderBottomColor: colors.border }]}
      onPress={() => handleResultItemPress(item)}
    >
      <View style={styles.avatarPlaceholder}>
        <Text style={styles.avatarText}>{item.username?.[0]?.toUpperCase() ?? '?'}</Text>
      </View>
      <View>
        <Text style={[styles.username, { color: colors.text }]}>{item.username}</Text>
        <Text style={[styles.email, { color: colors.icon }]}>{item.email}</Text>
        {item.conversation_exists && (
          <Text style={[styles.conversationExistsText, { color: colors.tint }]}>Conversation exists - Tap to enter code</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <Modal
      animationType="none"
      transparent={true}
      visible={visible}
      onRequestClose={handleClose}
    >
      <View style={styles.modalBackground}>
        <Animated.View
          style={[
            styles.animatedContainer,
            { transform: [{ translateY: slideAnim }] },
          ]}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardAvoidingView}
          >
            <SafeAreaView style={[styles.contentContainer, { backgroundColor: colors.background }]}>
              <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                {showCodeInput ? (
                  <TouchableOpacity
                    onPress={() => {
                      setShowCodeInput(false);
                      setVerificationChatId(null);
                      setVerificationError(null);
                    }}
                    style={styles.backButton}
                  >
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                  </TouchableOpacity>
                ) : (
                  <View style={styles.backButton} />
                )}
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  {showCodeInput ? 'Enter Conversation Code' : 'Start Conversation'}
                </Text>
                <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                  <Ionicons name="close" size={28} color={colors.text} />
                </TouchableOpacity>
              </View>

              {!showCodeInput ? (
                <>
                  <View style={styles.searchContainer}>
                    <TextInput
                      style={[
                        styles.input,
                        {
                          borderColor: colors.border,
                          color: colors.text,
                          backgroundColor: colorScheme === 'dark' ? '#2C2C2E' : '#F2F2F7',
                        },
                      ]}
                      placeholder="Enter username or email..."
                      placeholderTextColor={colors.icon}
                      value={identifier}
                      onChangeText={setIdentifier}
                      autoCapitalize="none"
                      autoCorrect={false}
                      onSubmitEditing={handleSearch}
                      returnKeyType="search"
                    />
                    <TouchableOpacity
                      style={[styles.goButton, { backgroundColor: colors.tint }]}
                      onPress={handleSearch}
                      disabled={isSearchLoading || !identifier.trim()}
                    >
                      {isSearchLoading ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={styles.goButtonText}>Go</Text>
                      )}
                    </TouchableOpacity>
                  </View>

                  <View style={styles.resultsContainer}>
                    {searchError && !isSearchLoading && (
                      <View style={styles.centeredMessage}>
                        <Ionicons name="warning-outline" size={40} color="red" />
                        <Text style={styles.errorText}>{searchError}</Text>
                      </View>
                    )}
                    {!searchError && !isSearchLoading && results.length === 0 && identifier && (
                      <View style={styles.centeredMessage}>
                        <Ionicons name="search-outline" size={40} color={colors.icon} />
                        <Text style={[styles.infoText, { color: colors.icon }]}>No users found matching "{identifier}"</Text>
                      </View>
                    )}
                    {!searchError && !isSearchLoading && results.length === 0 && !identifier && (
                      <View style={styles.centeredMessage}>
                        <Ionicons name="search" size={40} color={colors.icon} />
                        <Text style={[styles.infoText, { color: colors.icon }]}>Enter a username or email to search</Text>
                      </View>
                    )}
                    {results.length > 0 && (
                      <FlatList
                        data={results}
                        renderItem={renderUserItem}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={styles.listContent}
                      />
                    )}
                  </View>
                </>
              ) : (
                <View style={styles.verificationContainer}>
                  <Text style={[styles.modalSubtitle, { color: colors.icon }]}>
                    Please enter the code provided to access this conversation.
                  </Text>

                  <View style={[styles.codeInputRow, { borderColor: colors.border }]}>
                    <TextInput
                      style={[styles.modalInput, { color: colors.text }]}
                      placeholder="Enter code..."
                      placeholderTextColor={colors.icon}
                      value={enteredCode}
                      onChangeText={setEnteredCode}
                      secureTextEntry={!showCode}
                      autoCapitalize="none"
                      editable={!isVerifying}
                      onSubmitEditing={handleVerifyCodeInOverlay}
                      returnKeyType="go"
                    />
                    <TouchableOpacity onPress={() => setShowCode(!showCode)} style={styles.eyeIcon}>
                      <Ionicons
                        name={showCode ? 'eye-off-outline' : 'eye-outline'}
                        size={24}
                        color={colors.icon}
                      />
                    </TouchableOpacity>
                  </View>

                  {verificationError && (
                    <Text style={styles.modalErrorText}>{verificationError}</Text>
                  )}

                  {isVerifying ? (
                    <ActivityIndicator size="large" color={colors.tint} style={styles.modalSpinner} />
                  ) : (
                    <Pressable
                      style={({ pressed }) => [
                        styles.modalButton,
                        { backgroundColor: colors.tint },
                        (!enteredCode.trim() || isVerifying) && styles.disabledButton,
                        pressed && styles.pressedButton,
                      ]}
                      onPress={handleVerifyCodeInOverlay}
                      disabled={!enteredCode.trim() || isVerifying}
                    >
                      <Text style={styles.modalButtonText}>Verify & Open Chat</Text>
                    </Pressable>
                  )}
                </View>
              )}
            </SafeAreaView>
          </KeyboardAvoidingView>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  animatedContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: screenHeight - 60,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  backButton: {
    padding: 5,
    minWidth: 40,
    alignItems: 'flex-start',
  },
  closeButton: {
    padding: 5,
    minWidth: 40,
    alignItems: 'flex-end',
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 15,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    fontSize: 16,
    marginRight: 10,
  },
  goButton: {
    paddingHorizontal: 18,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  goButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  resultsContainer: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 15,
    paddingBottom: 15,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0a7ea4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  username: {
    fontSize: 16,
    fontWeight: '500',
  },
  email: {
    fontSize: 13,
    marginTop: 2,
  },
  conversationExistsText: {
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 4,
    fontWeight: '500',
  },
  centeredMessage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    marginTop: 15,
    fontSize: 16,
    color: 'red',
    textAlign: 'center',
  },
  infoText: {
    marginTop: 15,
    fontSize: 16,
    textAlign: 'center',
  },
  verificationContainer: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
  },
  modalSubtitle: {
    marginBottom: 15,
    textAlign: 'center',
    fontSize: 14,
  },
  codeInputRow: {
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
  modalSpinner: {
    marginTop: 15,
    marginBottom: 15,
  },
  modalButton: {
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    elevation: 2,
    width: '100%',
    alignItems: 'center',
    marginTop: 10,
  },
  modalButtonText: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 16,
  },
  disabledButton: {
    opacity: 0.5,
  },
  pressedButton: {
    opacity: 0.8,
  },
});

export default SearchUserOverlay;
