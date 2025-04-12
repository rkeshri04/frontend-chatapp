import { useEffect, useState, useRef } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View, useColorScheme, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { sendMessage, setCurrentChat, clearCurrentChat, fetchConversations, fetchChatMessages } from '../store/slices/chatSlice';
import { updateActivity } from '../store/slices/authSlice';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';

export default function ChatScreen() {
  const { id } = useLocalSearchParams();
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const dispatch = useAppDispatch();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const flatListRef = useRef<FlatList>(null);
  
  const chat = useAppSelector(state => 
    state.chat.chats.find(c => c.id === id)
  );
  
  const isLoading = useAppSelector(state => state.chat.isLoading);
  const error = useAppSelector(state => state.chat.error);
  
  useEffect(() => {
    // Load conversations if not already loaded
    if (!chat) {
      dispatch(fetchConversations());
    }

    if (id) {
      dispatch(setCurrentChat(id as string));
      // Update activity timestamp when entering chat
      dispatch(updateActivity());
      
      // Load messages for the chat if it exists and has no messages
      if (chat && chat.messages.length === 0) {
        dispatch(fetchChatMessages(id as string));
      }
    }
    
    return () => {
      dispatch(clearCurrentChat());
    };
  }, [id, dispatch, chat]);
  
  useEffect(() => {
    // Scroll to bottom when messages change
    if (chat?.messages?.length) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 200);
    }
  }, [chat?.messages]);
  
  const handleSend = async () => {
    if (!message.trim() || !id) return;
    
    try {
      setIsSending(true);
      // Update activity on message send
      dispatch(updateActivity());
      await dispatch(sendMessage({ chatId: id as string, text: message.trim() })).unwrap();
      setMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsSending(false);
    }
  };
  
  // Update activity when user starts typing
  const handleTyping = (text: string) => {
    dispatch(updateActivity());
    setMessage(text);
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
  
  const renderMessage = ({ item }) => {
    const isMe = item.sender === 'me';
    return (
      <View style={[
        styles.messageBubble, 
        isMe ? styles.myMessage : [styles.otherMessage, { backgroundColor: colorScheme === 'dark' ? '#333' : '#E5E5EA' }]
      ]}>
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
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <Stack.Screen 
        options={{
          headerTitle: chat.name,
          headerShown: true,
          headerBackTitle: 'Back',
          headerStyle: {
            backgroundColor: colors.background,
            height: 80, // Make header shorter
          },
          headerTitleStyle: {
            fontSize: 18,
          },
          headerTintColor: colors.text,
          headerShadowVisible: false, // Remove the bottom shadow
        }} 
      />
      
      <FlatList
        ref={flatListRef}
        data={chat.messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messagesContainer}
        inverted={false}
        onScroll={() => dispatch(updateActivity())}
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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
});
