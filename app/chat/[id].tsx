import { useEffect, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View, useColorScheme } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { sendMessage, setCurrentChat, clearCurrentChat } from '../store/slices/chatSlice';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';

export default function ChatScreen() {
  const { id } = useLocalSearchParams();
  const [message, setMessage] = useState('');
  const dispatch = useAppDispatch();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  
  const chat = useAppSelector(state => 
    state.chat.chats.find(c => c.id === id)
  );
  
  useEffect(() => {
    if (id) {
      dispatch(setCurrentChat(id as string));
    }
    
    return () => {
      dispatch(clearCurrentChat());
    };
  }, [id, dispatch]);
  
  const handleSend = async () => {
    if (!message.trim() || !id) return;
    
    try {
      await dispatch(sendMessage({ chatId: id as string, text: message.trim() })).unwrap();
      setMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };
  
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
          },
          headerTintColor: colors.text,
        }} 
      />
      
      <FlatList
        data={chat.messages}
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
          onChangeText={setMessage}
          multiline
          placeholderTextColor={colors.icon}
        />
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
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  },
});
