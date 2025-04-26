import { createSlice, createAsyncThunk, PayloadAction, createSelector, AsyncThunkAction, ThunkDispatch, UnknownAction } from '@reduxjs/toolkit'; // Import createSelector
import axios from 'axios';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { RootState } from '../store'; // Adjust path if necessary
import { Alert } from 'react-native'; // Import Alert
import { logout } from './authSlice'; // Import logout action

const API_URL = Constants.expoConfig?.extra?.apiUrl || 'http://127.0.0.1:8000';

interface Message {
  id: string;
  sender_id: string | null; // Add sender_id field
  text: string; // Will hold translated_content or content
  originalText: string | null; // Will hold the original content
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
  status?: 'pending' | 'approved' | 'rejected' | string; // Make status more specific if possible
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

// Helper function to get authorization headers and user ID
const getAuthHeadersAndUserId = async (state: unknown) => {
  const typedState = state as RootState;
  let token = typedState?.auth?.token;
  const userId = typedState?.auth?.user?.id; // Get user ID from auth state
  const language = typedState?.auth?.user?.default_language || 'en';

  if (!token) {
    token = await SecureStore.getItemAsync('token');
  }

  if (!token) {
    throw new Error('Not authenticated');
  }

  const authToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`;

  return {
    headers: {
      Authorization: authToken,
      'X-User-Language': language,
      'Content-Type': 'application/json', // Ensure Content-Type is set
    },
    userId: userId, // Return userId along with headers
  };
};

// Fetch conversations from the backend
export const fetchConversations = createAsyncThunk(
  'chat/fetchConversations',
  async (_, { rejectWithValue, getState, dispatch }) => {
    try {
      const headers = await getAuthHeadersAndUserId(getState());

      const response = await axios.get(`${API_URL}/chat/conversations/`, { headers: headers.headers });

      let conversations: Chat[] = [];

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
  async (
    { chatId, text, secondaryAuth, secondaryCode }: { chatId: string, text: string, secondaryAuth?: boolean, secondaryCode?: string },
    { rejectWithValue, getState }
  ) => {
    try {
      // Get headers and userId
      const { headers, userId } = await getAuthHeadersAndUserId(getState());

      if (!userId) {
        return rejectWithValue('User ID not found. Cannot send message.');
      }

      const requestBody: {
        conversation_id: string;
        content: string;
        secondary_auth?: boolean;
        second_code?: string;
      } = {
        conversation_id: chatId,
        content: text,
      };

      if (secondaryAuth && secondaryCode) {
        requestBody.secondary_auth = true;
        requestBody.second_code = secondaryCode;
      }

      const response = await axios.post(
        `${API_URL}/chat/messages/`,
        requestBody,
        { headers }
      );

      const newMessage: Message = {
        id: response.data.id || Date.now().toString(),
        sender_id: userId, // Set sender_id to the current user's ID
        text: response.data.content || text,
        originalText: response.data.content || text,
        timestamp: response.data.created_at ? new Date(response.data.created_at).getTime() : Date.now(),
        secondary_auth: response.data.secondary_auth === true,
        is_verified: response.data.secondary_auth === true ? false : undefined,
        verification_attempts: 0,
      };

      return {
        chatId,
        message: newMessage,
      };
    } catch (error: any) {
      console.error('Send message error:', error.response?.data || error.message);
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          return rejectWithValue('Authentication failed. Your session may have expired.');
        }
        if (error.response?.data?.detail?.includes('secondary code')) {
           return rejectWithValue(error.response.data.detail);
        }
        return rejectWithValue(error.response?.data?.detail || 'Failed to send message. Please try again.');
      }
      return rejectWithValue('Network error. Failed to send message.');
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
            sender_id: null, // Initialize sender_id as null for the initial message
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
      // Use the helper that also gets userId, although not strictly needed here for the request
      const { headers } = await getAuthHeadersAndUserId(getState());
      const requestHeaders = { ...headers, 'X-Convo-Code': code };

      console.log(`Fetching messages for chat ${chatId} using code and language ${requestHeaders['X-User-Language']}`);
      const response = await axios.get(`${API_URL}/chat/messages/conversation/${chatId}/with-code`, { headers: requestHeaders });
      console.log('Messages fetch successful:', response.status);

      let messages: Message[] = [];
      if (Array.isArray(response.data)) {
        messages = response.data.map(msg => ({
          id: msg.id || String(Math.random()),
          sender_id: msg.sender_id || null, // Store sender_id from backend
          text: msg.translated_content || msg.content || '',
          originalText: msg.content || null,
          timestamp: msg.created_at ? new Date(msg.created_at).getTime() : Date.now(),
          secondary_auth: msg.secondary_auth === true,
          is_verified: false,
          verification_attempts: 0,
        })).sort((a, b) => a.timestamp - b.timestamp);
      } else {
        console.warn('Unexpected response structure for messages:', response.data);
      }

      return { chatId, messages, code };
    } catch (error: any) {
      console.error('Error fetching messages:', error.response?.data || error.message);

      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          return rejectWithValue('Authentication failed. Your session may have expired.');
        }
        if (error.response?.status === 403 || error.response?.status === 404) {
          if (error.response?.data?.detail?.toLowerCase().includes('invalid code')) {
             return rejectWithValue('Invalid conversation code.');
          }
          return rejectWithValue('Failed to load messages. Conversation not found or access denied.');
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
      const { headers } = await getAuthHeadersAndUserId(getState());

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
      const { headers } = await getAuthHeadersAndUserId(getState());

      if (!primaryCode) {
        console.error('Primary code was not provided to verifySecondaryCode thunk.');
        return rejectWithValue('Primary conversation code not found. Cannot verify secondary code.');
      }

      const requestHeaders = {
        ...headers,
        'X-Convo-Code': primaryCode,
        'X-Second-Code': secondaryCode
      };

      console.log(`Verifying secondary code for message ${messageId} in chat ${chatId} using primary code`);

      const response = await axios.post(
        `${API_URL}/chat/conversations/${chatId}/messages/${messageId}/verify-secondary-code`,
        {},
        { headers: requestHeaders }
      );

      console.log('Secondary verification response:', response.status, response.data);

      if (response.data && response.data.valid === true) {
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
      const { headers } = await getAuthHeadersAndUserId(getState());

      const requestHeaders = {
        ...headers,
        'X-Convo-Code': primaryCode,
        'X-Second-Code': secondaryCode
      };

      console.log(`Fetching unlocked content for message ${messageId} in chat ${chatId}`);

      const response = await axios.get(
        `${API_URL}/chat/messages/conversation/${chatId}/${messageId}/unlock-secondary`,
        { headers: requestHeaders }
      );

      console.log('Unlock message response:', response.status, response.data);

      if (response.data && typeof response.data.content === 'string') {
        return {
          chatId,
          messageId,
          decryptedContent: response.data.content,
          translatedContent: response.data.translated_content || null
        };
      } else {
        console.error('Unexpected response structure from unlock endpoint:', response.data);
        return rejectWithValue('Failed to retrieve unlocked message content.');
      }
    } catch (error) {
      console.error('Error fetching unlocked message:', error);
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          return rejectWithValue('Authentication failed.');
        }
        if (error.response?.status === 403 || error.response?.status === 404) {
           return rejectWithValue('Failed to unlock message. Invalid codes or message not found.');
        }
        return rejectWithValue(error.response?.data?.detail || 'Failed to fetch unlocked message.');
      }
      return rejectWithValue('Network error while fetching unlocked message.');
    }
  }
);

// Async thunk to request a new conversation
export const requestConversation = createAsyncThunk<
  { success: boolean; user2_id: string }, // Return type on success
  { user2_id: string }, // Argument type
  { rejectValue: string; state: RootState } // ThunkApi config
>(
  'chat/requestConversation',
  async ({ user2_id }, { getState, rejectWithValue }) => {
    try {
      const state = getState();
      const { headers, userId: user1_id } = await getAuthHeadersAndUserId(state);

      if (!user1_id) {
        return rejectWithValue('Logged in user ID not found.');
      }

      console.log(`Requesting conversation between ${user1_id} and ${user2_id}`);

      const response = await axios.post(
        `${API_URL}/chat/conversations/request`,
        { user1_id, user2_id },
        { headers }
      );

      // Assuming the backend returns a success status or relevant data
      console.log('Conversation request response:', response.data);
      if (response.status === 200 || response.status === 201) {
        return { success: true, user2_id }; // Indicate success and which user was requested
      } else {
        return rejectWithValue('Failed to request conversation.');
      }
    } catch (error: any) {
      console.error('Error requesting conversation:', error.response?.data || error.message);
      const errorMessage = error.response?.data?.detail || error.message || 'An unknown error occurred';
      return rejectWithValue(errorMessage);
    }
  }
);

// Async thunk to approve a conversation request
export const approveConversation = createAsyncThunk<
  { chatId: string; status: string }, // Return type on success
  { chatId: string; code: string }, // Argument type
  { rejectValue: string; state: RootState } // ThunkApi config
>(
  'chat/approveConversation',
  async ({ chatId, code }, { getState, rejectWithValue }) => {
    try {
      const state = getState();
      const { headers } = await getAuthHeadersAndUserId(state);

      console.log(`Approving conversation ${chatId} with code.`);

      const response = await axios.post(
        `${API_URL}/chat/conversations/${chatId}/approve`,
        { code }, // Send the code in the request body
        { headers }
      );

      console.log('Approve conversation response:', response.data);
      // Assuming the backend confirms approval, maybe returns the updated status
      if (response.status === 200 || response.status === 204) {
         // You might want the backend to return the new status, default to 'approved'
        return { chatId, status: response.data?.status || 'approved' };
      } else {
        return rejectWithValue('Failed to approve conversation.');
      }
    } catch (error: any) {
      console.error('Error approving conversation:', error.response?.data || error.message);
      const errorMessage = error.response?.data?.detail || error.message || 'An unknown error occurred during approval';
      return rejectWithValue(errorMessage);
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
        if (message && message.is_verified) {
          message.is_verified = false; // Mark as locked again
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
        // Ensure status is mapped correctly
        state.chats = action.payload.map(chat => ({
          ...chat,
          status: chat.status || 'approved' // Default to approved if status is missing? Adjust as needed.
        }));
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
          if (!chat.messages.some(m => m.id === message.id)) {
            chat.messages.push(message);
          }
          chat.lastMessage = message.text;
        }
      })
      .addCase(sendMessage.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
        Alert.alert("Send Error", action.payload as string || "Failed to send message.");
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
            if (message.verification_attempts >= 3) {
              console.log('Too many failed attempts to verify secondary code. Logging out.');
              Alert.alert(
                "Too Many Failed Attempts",
                "You have entered the wrong code too many times. You will be logged out for security.",
                [{ text: "OK", onPress: async () => {
                    // Dispatch logout action
                    dispatch(logout());
                }}]
              );
            }
          }
        }
      })
      .addCase(fetchUnlockedMessage.pending, (state, action) => {
        console.log(`Unlocking message ${action.meta.arg.messageId}...`);
      })
      .addCase(fetchUnlockedMessage.fulfilled, (state, action) => {
        const { chatId, messageId, decryptedContent, translatedContent } = action.payload;
        const chat = state.chats.find(c => c.id === chatId);
        if (chat) {
          const message = chat.messages.find(m => m.id === messageId);
          if (message) {
            message.text = translatedContent || decryptedContent;
            message.originalText = decryptedContent;
            message.is_verified = true;
            message.verification_attempts = 0;
            console.log(`Message ${messageId} unlocked and content updated.`);
          }
        }
      })
      .addCase(fetchUnlockedMessage.rejected, (state, action) => {
        const { messageId } = action.meta.arg;
        console.error(`Failed to fetch unlocked content for message ${messageId}. Error: ${action.payload}`);
      })
      .addCase(requestConversation.pending, (state) => {
        console.log('Conversation request pending...');
      })
      .addCase(requestConversation.fulfilled, (state, action) => {
        console.log(`Conversation request successful for user: ${action.payload.user2_id}`);
      })
      .addCase(requestConversation.rejected, (state, action) => {
        console.error('Conversation request failed:', action.payload);
      })
      .addCase(approveConversation.pending, (state, action) => {
        console.log(`Approval pending for chat ${action.meta.arg.chatId}...`);
      })
      .addCase(approveConversation.fulfilled, (state, action) => {
        const { chatId, status } = action.payload;
        const chat = state.chats.find(c => c.id === chatId);
        if (chat) {
          chat.status = status; // Update the status of the specific chat
          console.log(`Chat ${chatId} status updated to ${status}`);
        }
      })
      .addCase(approveConversation.rejected, (state, action) => {
        const { chatId } = action.meta.arg;
        console.error(`Failed to approve chat ${chatId}:`, action.payload);
        Alert.alert("Approval Failed", action.payload || "Could not approve conversation.");
      });
  },
});

// --- Selectors ---

// Base selector for the raw chats array
const selectChats = (state: RootState) => state.chat.chats;

// Memoized selector to map chats for the UI
export const selectMappedChats = createSelector(
  [selectChats], // Input selector(s)
  (chats) => chats.map(chat => ({ // Transformation function
    id: chat.id,
    name: chat.name,
    lastMessage: chat.lastMessage,
    unreadCount: chat.unreadCount,
    status: chat.status,
    otherUserId: chat.otherUser?.id,
  }))
);

export const { setCurrentChat, clearCurrentChat, receiveMessage, manuallyLockMessage } = chatSlice.actions;

export default chatSlice.reducer;
function dispatch(arg0: AsyncThunkAction<true, void, { state?: unknown; dispatch?: ThunkDispatch<unknown, unknown, UnknownAction>; extra?: unknown; rejectValue?: unknown; serializedErrorType?: unknown; pendingMeta?: unknown; fulfilledMeta?: unknown; rejectedMeta?: unknown; }>) {
  throw new Error('Function not implemented.');
}

