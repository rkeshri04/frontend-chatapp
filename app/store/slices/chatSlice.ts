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
  let token = state?.auth?.token;
  
  if (!token) {
    token = await SecureStore.getItemAsync('token');
  }
  
  if (!token) {
    throw new Error('Not authenticated');
  }
  
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
      const headers = await getAuthHeaders(getState());
      
      const response = await axios.get(`${API_URL}/chat/conversations/`, { headers });
      
      let conversations = [];
      
      if (Array.isArray(response.data)) {
        conversations = response.data.map(conversation => ({
          id: conversation.id || String(Math.random()),
          name: conversation.other_user?.username || 'Unknown',
          lastMessage: conversation.last_message?.content || '',
          unreadCount: conversation.unread_count || 0,
          messages: [],
          otherUser: conversation.other_user || null,
          status: conversation.status || 'pending'
        }));
      } else if (typeof response.data === 'object' && response.data !== null) {
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
        }
      }
      
      return conversations;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const sanitizedHeaders = { ...error.config?.headers };
        if (sanitizedHeaders.Authorization) {
          sanitizedHeaders.Authorization = sanitizedHeaders.Authorization.substring(0, 15) + '...';
        }
        
        if (error.response?.status === 401) {
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
      const headers = await getAuthHeaders(getState());
      
      const response = await axios.post(
        `${API_URL}/chat/conversations/${chatId}/messages`,
        { content: text },
        { headers }
      );
      
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
      const token = await SecureStore.getItemAsync('token');
      
      if (!token) {
        return rejectWithValue('Authentication token not found');
      }
      
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
      
      if (!response.data || !response.data.id) {
        return rejectWithValue('Failed to create conversation: Invalid response');
      }
      
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
      if (axios.isAxiosError(error)) {
        return rejectWithValue(error.response?.data?.detail || 'Failed to create conversation');
      }
      return rejectWithValue('Failed to create conversation');
    }
  }
);

// Fetch chat messages using conversation code
export const fetchChatMessages = createAsyncThunk(
  'chat/fetchChatMessages',
  async ({ chatId, code }: { chatId: string, code: string }, { rejectWithValue, getState }) => {
    try {
      // Get auth headers (includes Authorization)
      const baseHeaders = await getAuthHeaders(getState());
      
      const headers = {
        ...baseHeaders,
        'X-Convo-Code': code // Add the conversation code header
      };
      
      console.log(`Fetching messages for chat ${chatId} using code`);
      
      // Use the new endpoint
      const response = await axios.get(
        `${API_URL}/chat/messages/conversation/${chatId}/with-code`, 
        { headers }
      );
      
      console.log('Messages fetch successful:', response.status);
      
      // Transform the messages to our format (assuming the response structure is similar)
      let messages: Message[] = [];
      
      // Adjust based on actual API response structure if needed
      if (Array.isArray(response.data)) {
        messages = response.data.map(msg => ({
          id: msg.id || String(Math.random()),
          text: msg.content || '',
          // Determine sender based on your user ID or a flag from the backend
          // Assuming backend provides `is_sender` or similar
          sender: msg.is_sender ? 'me' : 'other', 
          timestamp: msg.created_at ? new Date(msg.created_at).getTime() : Date.now()
        })).sort((a, b) => a.timestamp - b.timestamp); // Ensure messages are sorted by time
      } else if (response.data.messages && Array.isArray(response.data.messages)) {
         messages = response.data.messages.map(msg => ({
          id: msg.id || String(Math.random()),
          text: msg.content || '',
          sender: msg.is_sender ? 'me' : 'other',
          timestamp: msg.created_at ? new Date(msg.created_at).getTime() : Date.now()
        })).sort((a, b) => a.timestamp - b.timestamp); // Ensure messages are sorted by time
      } else {
        console.warn('Unexpected response structure for messages:', response.data);
      }
      
      return { chatId, messages };
    } catch (error) {
      console.error('Error fetching messages:', error);
      
      if (axios.isAxiosError(error)) {
         if (error.response?.status === 401) {
          return rejectWithValue('Authentication failed. Your session may have expired.');
        }
         if (error.response?.status === 403 || error.response?.status === 404) {
           // Handle cases where the code might be wrong or convo not found
           return rejectWithValue('Failed to load messages. Invalid code or conversation not found.');
         }
        return rejectWithValue(error.response?.data?.detail || 'Failed to load messages. Please try again.');
      }
      
      return rejectWithValue('Network error. Please check your connection.');
    }
  }
);

// Verify conversation code
export const verifyConversationCode = createAsyncThunk(
  'chat/verifyConversationCode',
  async ({ chatId, code }: { chatId: string, code: string }, { rejectWithValue, getState }) => {
    try {
      const headers = await getAuthHeaders(getState());
      
      const response = await axios.post(
        `${API_URL}/chat/conversations/${chatId}/verify-code`,
        {}, 
        { 
          headers: {
            ...headers,
            'X-Convo-Code': code 
          }
        }
      );
      
      if (response.data && response.data.valid === true) {
        return { chatId };
      } else {
        return rejectWithValue('Invalid code'); 
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          return rejectWithValue('Authentication failed. Your session may have expired.');
        }
        if (error.response?.data?.valid === false || error.response?.data?.detail === 'Invalid code') {
          return rejectWithValue('Invalid code');
        }
        return rejectWithValue(error.response?.data?.detail || 'Failed to verify code');
      }
      
      return rejectWithValue('Network error. Please check your connection.');
    }
  }
);

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    setCurrentChat: (state, action: PayloadAction<string>) => {
      state.currentChatId = action.payload;
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
        
        if (state.currentChatId !== chatId) {
          chat.unreadCount += 1;
        }
      }
    },
  },
  extraReducers: (builder) => {
    builder
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
      .addCase(createConversation.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createConversation.fulfilled, (state, action) => {
        state.isLoading = false;
        state.chats.unshift(action.payload);
        state.currentChatId = action.payload.id;
      })
      .addCase(createConversation.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
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
      })
      .addCase(verifyConversationCode.rejected, (state, action) => {
        console.log('Verification rejected in slice:', action.payload);
      });
  },
});

export const { setCurrentChat, clearCurrentChat, receiveMessage } = chatSlice.actions;

export default chatSlice.reducer;
