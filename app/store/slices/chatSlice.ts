import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import axios from 'axios';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';

const API_URL = Constants.expoConfig?.extra?.apiUrl || 'http://127.0.0.1:8000';

interface Message {
  id: string;
  text: string; // Will hold encrypted content if secondary_auth is true initially
  sender: string;
  timestamp: number;
  secondary_auth?: boolean; // Flag for secondary auth requirement
  is_verified?: boolean; // Track if secondary auth was successful for this message
  verification_attempts?: number; // Track attempts for secondary auth
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
  currentChatCode: string | null; // Store the verified primary code for the current chat
  isLoading: boolean;
  error: string | null;
}

const initialState: ChatState = {
  chats: [],
  currentChatId: null,
  currentChatCode: null, // Initialize as null
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
      const baseHeaders = await getAuthHeaders(getState());
      const headers = { ...baseHeaders, 'X-Convo-Code': code };

      console.log(`Fetching messages for chat ${chatId} using code`);
      const response = await axios.get(`${API_URL}/chat/messages/conversation/${chatId}/with-code`, { headers });
      console.log('Messages fetch successful:', response.status);

      let messages: Message[] = [];
      if (Array.isArray(response.data)) {
        messages = response.data.map(msg => ({
          id: msg.id || String(Math.random()),
          text: msg.content || '', // Store content (might be encrypted)
          sender: msg.is_sender ? 'me' : 'other',
          timestamp: msg.created_at ? new Date(msg.created_at).getTime() : Date.now(),
          secondary_auth: msg.secondary_auth === true, // Store the flag
          is_verified: false, // Initially not verified
          verification_attempts: 0, // Initialize attempts
        })).sort((a, b) => a.timestamp - b.timestamp);
      } else {
        console.warn('Unexpected response structure for messages:', response.data);
      }

      // Return code along with messages to store it in state
      return { chatId, messages, code };
    } catch (error) {
      console.error('Error fetching messages:', error);

      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          return rejectWithValue('Authentication failed. Your session may have expired.');
        }
        if (error.response?.status === 403 || error.response?.status === 404) {
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

// Verify secondary code for a specific message (Checks validity only)
export const verifySecondaryCode = createAsyncThunk(
  'chat/verifySecondaryCode',
  async (
    { chatId, messageId, secondaryCode, primaryCode }: { chatId: string, messageId: string, secondaryCode: string, primaryCode: string },
    { rejectWithValue, getState }
  ) => {
    try {
      const baseHeaders = await getAuthHeaders(getState());

      if (!primaryCode) {
        console.error('Primary code was not provided to verifySecondaryCode thunk.');
        return rejectWithValue('Primary conversation code not found. Cannot verify secondary code.');
      }

      const headers = {
        ...baseHeaders,
        'X-Convo-Code': primaryCode,
        'X-Second-Code': secondaryCode
      };

      console.log(`Verifying secondary code for message ${messageId} in chat ${chatId} using primary code`);

      const response = await axios.post(
        `${API_URL}/chat/conversations/${chatId}/messages/${messageId}/verify-secondary-code`,
        {},
        { headers }
      );

      console.log('Secondary verification response:', response.status, response.data);

      // Only check for validity confirmation
      if (response.data && response.data.valid === true) {
        // Return necessary info to trigger content fetch
        return { chatId, messageId, primaryCode, secondaryCode }; 
      } else {
        return rejectWithValue('Invalid secondary code');
      }
    } catch (error) {
      console.error('Error verifying secondary code:', error);
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          return rejectWithValue('Authentication failed.');
        }
        if (error.response?.status === 403 || error.response?.data?.valid === false) {
           return rejectWithValue('Invalid secondary code');
        }
        return rejectWithValue(error.response?.data?.detail || 'Failed to verify secondary code.');
      }
      return rejectWithValue('Network error during secondary verification.');
    }
  }
);

// Fetch unlocked message content after successful secondary verification
export const fetchUnlockedMessage = createAsyncThunk(
  'chat/fetchUnlockedMessage',
  async (
    { chatId, messageId, primaryCode, secondaryCode }: { chatId: string, messageId: string, primaryCode: string, secondaryCode: string },
    { rejectWithValue, getState }
  ) => {
    try {
      const baseHeaders = await getAuthHeaders(getState());

      const headers = {
        ...baseHeaders,
        'X-Convo-Code': primaryCode,
        'X-Second-Code': secondaryCode
      };

      console.log(`Fetching unlocked content for message ${messageId} in chat ${chatId}`);

      // Make GET request to the unlock endpoint
      const response = await axios.get(
        `${API_URL}/chat/messages/conversation/${chatId}/${messageId}/unlock-secondary`,
        { headers }
      );

      console.log('Unlock message response:', response.status, response.data);

      // Expecting { content: "decrypted message" }
      if (response.data && typeof response.data.content === 'string') {
        return { chatId, messageId, decryptedContent: response.data.content };
      } else {
        // If content is missing or not a string
        console.error('Unexpected response structure from unlock endpoint:', response.data);
        return rejectWithValue('Failed to retrieve unlocked message content.');
      }
    } catch (error) {
      console.error('Error fetching unlocked message:', error);
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          return rejectWithValue('Authentication failed.');
        }
        // 403/404 likely mean codes were wrong or message not found
        if (error.response?.status === 403 || error.response?.status === 404) {
           return rejectWithValue('Failed to unlock message. Invalid codes or message not found.');
        }
        return rejectWithValue(error.response?.data?.detail || 'Failed to fetch unlocked message.');
      }
      return rejectWithValue('Network error while fetching unlocked message.');
    }
  }
);

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    setCurrentChat: (state, action: PayloadAction<string>) => {
      state.currentChatId = action.payload;
      state.currentChatCode = null; // Reset code when changing chat
      const chat = state.chats.find(c => c.id === action.payload);
      if (chat) {
        chat.unreadCount = 0;
      }
    },
    clearCurrentChat: (state) => {
      state.currentChatId = null;
      state.currentChatCode = null; // Clear code when leaving chat
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
    manuallyLockMessage: (state, action: PayloadAction<{ chatId: string; messageId: string }>) => {
      const { chatId, messageId } = action.payload;
      const chat = state.chats.find(c => c.id === chatId);
      if (chat) {
        const message = chat.messages.find(m => m.id === messageId);
        if (message && message.secondary_auth) {
          message.is_verified = false;
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
        const { chatId, messages, code } = action.payload;
        const chat = state.chats.find(c => c.id === chatId);
        if (chat) {
          chat.messages = messages;
        }
        if (state.currentChatId === chatId) {
          state.currentChatCode = code;
          console.log(`Stored primary code for chat ${chatId}`);
        }
      })
      .addCase(fetchChatMessages.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
        state.currentChatCode = null;
      })
      .addCase(verifySecondaryCode.fulfilled, (state, action) => {
        const { chatId, messageId } = action.payload;
        const chat = state.chats.find(c => c.id === chatId);
        if (chat) {
          const message = chat.messages.find(m => m.id === messageId);
          if (message) {
            message.is_verified = true;
            message.verification_attempts = 0;
            console.log(`Secondary code for message ${messageId} verified. Ready to fetch content.`);
          }
        }
      })
      .addCase(verifySecondaryCode.rejected, (state, action) => {
        const { chatId, messageId } = action.meta.arg;
        const chat = state.chats.find(c => c.id === chatId);
        if (chat) {
          const message = chat.messages.find(m => m.id === messageId);
          if (message) {
            message.verification_attempts = (message.verification_attempts || 0) + 1;
            console.log(`Secondary verification failed for message ${messageId}. Attempt ${message.verification_attempts}. Error: ${action.payload}`);
          }
        }
      })
      .addCase(fetchUnlockedMessage.pending, (state, action) => {
        console.log(`Unlocking message ${action.meta.arg.messageId}...`);
      })
      .addCase(fetchUnlockedMessage.fulfilled, (state, action) => {
        const { chatId, messageId, decryptedContent } = action.payload;
        const chat = state.chats.find(c => c.id === chatId);
        if (chat) {
          const message = chat.messages.find(m => m.id === messageId);
          if (message) {
            message.text = decryptedContent;
            console.log(`Message ${messageId} unlocked and content updated.`);
          }
        }
      })
      .addCase(fetchUnlockedMessage.rejected, (state, action) => {
        const { messageId } = action.meta.arg;
        console.error(`Failed to fetch unlocked content for message ${messageId}. Error: ${action.payload}`);
      });
  },
});

export const { setCurrentChat, clearCurrentChat, receiveMessage, manuallyLockMessage } = chatSlice.actions;

export default chatSlice.reducer;
