import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import axios from 'axios';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';

const API_URL = Constants.expoConfig?.extra?.apiUrl || 'http://127.0.0.1:8000';

interface Message {
  id: string;
  text: string;
  sender: string;
  timestamp: number;
}

interface OtherUser {
  id: string;
  username: string;
  email: string;
}

interface Chat {
  id: string;
  name: string;
  lastMessage?: string;
  unreadCount: number;
  messages: Message[];
  otherUser?: OtherUser | null;
  status?: string;
}

interface ChatState {
  chats: Chat[];
  currentChatId: string | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: ChatState = {
  chats: [],
  currentChatId: null,
  isLoading: false,
  error: null,
};

// Helper function to get authorization headers
const getAuthHeaders = async (state) => {
  // Try to get token from Redux state first
  let token = state?.auth?.token;
  
  // If not in Redux state, try SecureStore
  if (!token) {
    token = await SecureStore.getItemAsync('token');
  }
  
  if (!token) {
    throw new Error('Not authenticated');
  }
  
  // Log token type and first few characters for debugging
  console.log(`Token type: ${typeof token}, length: ${token.length}, starts with: ${token.substring(0, 10)}...`);
  
  // Make sure token doesn't already have Bearer prefix
  const authToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
  
  return {
    Authorization: authToken
  };
};

// Fetch conversations from the backend
export const fetchConversations = createAsyncThunk(
  'chat/fetchConversations',
  async (_, { rejectWithValue, getState, dispatch }) => {
    try {
      // Get auth headers
      const headers = await getAuthHeaders(getState());
      
      // Log request info for debugging
      console.log(`Fetching conversations from: ${API_URL}/chat/conversations`);
      
      const response = await axios.get(`${API_URL}/chat/conversations/`, { headers });
      
      console.log('Conversations fetch successful:', response.status);
      
      // Check the actual structure of the response to better adapt the transformation
      console.log('Response data structure:', typeof response.data, Array.isArray(response.data) ? 'is array' : 'not array');
      
      // Transform the new conversation format
      let conversations = [];
      
      if (Array.isArray(response.data)) {
        conversations = response.data.map(conversation => ({
          id: conversation.id || String(Math.random()),
          name: conversation.other_user?.username || 'Unknown',
          // Use empty string if no last message yet
          lastMessage: conversation.last_message?.content || '',
          unreadCount: conversation.unread_count || 0,
          // Initialize with empty messages array - these will be loaded when the chat is opened
          messages: [],
          // Store the other user info for reference
          otherUser: conversation.other_user || null,
          status: conversation.status || 'pending'
        }));
      } else if (typeof response.data === 'object' && response.data !== null) {
        // Handle case where API returns an object instead of array
        console.log('API returned object instead of array, exploring structure:', Object.keys(response.data));
        
        // Try to find conversations in a nested property if exists
        const conversationsData = response.data.conversations || response.data.data || response.data.results || [];
        
        if (Array.isArray(conversationsData)) {
          conversations = conversationsData.map(conversation => ({
            id: conversation.id || String(Math.random()),
            name: conversation.other_user?.username || 'Unknown',
            lastMessage: conversation.last_message?.content || '',
            unreadCount: conversation.unread_count || 0,
            messages: [],
            otherUser: conversation.other_user || null,
            status: conversation.status || 'pending'
          }));
        } else {
          console.log('Could not find conversations array in response');
        }
      }
      
      console.log(`Transformed ${conversations.length} conversations`);
      return conversations;
    } catch (error) {
      console.error('Error fetching conversations:', error);
      
      // Add detailed error logging
      if (axios.isAxiosError(error)) {
        // Do not log complete token from headers for security
        const sanitizedHeaders = { ...error.config?.headers };
        if (sanitizedHeaders.Authorization) {
          sanitizedHeaders.Authorization = sanitizedHeaders.Authorization.substring(0, 15) + '...';
        }
        
        console.log('Request details:', {
          url: error.config?.url,
          method: error.config?.method,
          headers: sanitizedHeaders
        });
        
        if (error.response?.status === 401) {
          // Don't automatically log out - allow user to retry or manually log out
          return rejectWithValue('Authentication failed. Please check your internet connection and try again.');
        }
        
        return rejectWithValue(error.response?.data?.detail || 'Failed to fetch conversations');
      }
      return rejectWithValue('Network error. Please check your connection.');
    }
  }
);

export const sendMessage = createAsyncThunk(
  'chat/sendMessage',
  async ({ chatId, text }: { chatId: string, text: string }, { rejectWithValue, getState }) => {
    try {
      // Get auth headers
      const headers = await getAuthHeaders(getState());
      
      console.log(`Sending message to chat ${chatId}`);
      
      // Send message to the backend
      const response = await axios.post(
        `${API_URL}/chat/conversations/${chatId}/messages`,
        { content: text },
        { headers }
      );
      
      console.log('Message sent successfully:', response.status);
      
      // Return properly formatted data
      return {
        chatId,
        message: {
          id: response.data.id || Date.now().toString(),
          text,
          sender: 'me',
          timestamp: Date.now(),
        }
      };
    } catch (error) {
      console.error('Error sending message:', error);
      
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        return rejectWithValue('Authentication failed. Your session may have expired.');
      }
      
      return rejectWithValue('Failed to send message. Please try again.');
    }
  }
);

// Add a new conversation
export const createConversation = createAsyncThunk(
  'chat/createConversation',
  async ({ recipientId, initialMessage }: { recipientId: string, initialMessage: string }, { rejectWithValue }) => {
    try {
      // Get the auth token from secure storage
      const token = await SecureStore.getItemAsync('token');
      
      if (!token) {
        return rejectWithValue('Authentication token not found');
      }
      
      // Create a new conversation with the recipient
      const response = await axios.post(
        `${API_URL}/chat/conversations`, 
        { 
          recipient_id: recipientId,
          message: initialMessage 
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      // Check if the response contains the conversation data
      if (!response.data || !response.data.id) {
        return rejectWithValue('Failed to create conversation: Invalid response');
      }
      
      // Format the response to match our Chat interface
      const conversation = {
        id: response.data.id,
        name: response.data.recipient_name || 'User',
        lastMessage: initialMessage,
        unreadCount: 0,
        messages: [
          {
            id: response.data.message_id || Date.now().toString(),
            text: initialMessage,
            sender: 'me',
            timestamp: Date.now(),
          }
        ]
      };
      
      return conversation;
    } catch (error) {
      console.error('Error creating conversation:', error);
      if (axios.isAxiosError(error)) {
        return rejectWithValue(error.response?.data?.detail || 'Failed to create conversation');
      }
      return rejectWithValue('Failed to create conversation');
    }
  }
);

// Fetch chat messages
export const fetchChatMessages = createAsyncThunk(
  'chat/fetchChatMessages',
  async (chatId: string, { rejectWithValue, getState }) => {
    try {
      // Get auth headers
      const headers = await getAuthHeaders(getState());
      
      console.log(`Fetching messages for chat ${chatId}`);
      
      const response = await axios.get(
        `${API_URL}/chat/conversations/${chatId}/messages/`,
        { headers }
      );
      
      console.log('Messages fetch successful:', response.status);
      
      // Transform the messages to our format
      let messages: Message[] = [];
      
      if (Array.isArray(response.data)) {
        messages = response.data.map(msg => ({
          id: msg.id || String(Math.random()),
          text: msg.content || '',
          sender: msg.is_sender ? 'me' : 'other',
          timestamp: msg.created_at ? new Date(msg.created_at).getTime() : Date.now()
        }));
      } else if (response.data.messages && Array.isArray(response.data.messages)) {
        messages = response.data.messages.map(msg => ({
          id: msg.id || String(Math.random()),
          text: msg.content || '',
          sender: msg.is_sender ? 'me' : 'other',
          timestamp: msg.created_at ? new Date(msg.created_at).getTime() : Date.now()
        }));
      }
      
      return { chatId, messages };
    } catch (error) {
      console.error('Error fetching messages:', error);
      
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        return rejectWithValue('Authentication failed. Your session may have expired.');
      }
      
      return rejectWithValue('Failed to load messages. Please try again.');
    }
  }
);

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    setCurrentChat: (state, action: PayloadAction<string>) => {
      state.currentChatId = action.payload;
      // Reset unread count when opening chat
      const chat = state.chats.find(c => c.id === action.payload);
      if (chat) {
        chat.unreadCount = 0;
      }
    },
    clearCurrentChat: (state) => {
      state.currentChatId = null;
    },
    receiveMessage: (state, action: PayloadAction<{ chatId: string, message: Message }>) => {
      const { chatId, message } = action.payload;
      const chat = state.chats.find(c => c.id === chatId);
      
      if (chat) {
        chat.messages.push(message);
        chat.lastMessage = message.text;
        
        // If this isn't the current chat, increment unread
        if (state.currentChatId !== chatId) {
          chat.unreadCount += 1;
        }
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Handle fetchConversations
      .addCase(fetchConversations.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchConversations.fulfilled, (state, action) => {
        state.isLoading = false;
        state.chats = action.payload;
      })
      .addCase(fetchConversations.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Handle sendMessage
      .addCase(sendMessage.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(sendMessage.fulfilled, (state, action) => {
        state.isLoading = false;
        const { chatId, message } = action.payload;
        const chat = state.chats.find(c => c.id === chatId);
        
        if (chat) {
          chat.messages.push(message);
          chat.lastMessage = message.text;
        }
      })
      .addCase(sendMessage.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Handle createConversation
      .addCase(createConversation.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createConversation.fulfilled, (state, action) => {
        state.isLoading = false;
        state.chats.unshift(action.payload); // Add to the beginning of the chats array
        state.currentChatId = action.payload.id;
      })
      .addCase(createConversation.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Handle fetchChatMessages
      .addCase(fetchChatMessages.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchChatMessages.fulfilled, (state, action) => {
        state.isLoading = false;
        const { chatId, messages } = action.payload;
        const chat = state.chats.find(c => c.id === chatId);
        
        if (chat) {
          chat.messages = messages;
        }
      })
      .addCase(fetchChatMessages.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { setCurrentChat, clearCurrentChat, receiveMessage } = chatSlice.actions;

export default chatSlice.reducer;
