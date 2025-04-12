import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

interface Message {
  id: string;
  text: string;
  sender: string;
  timestamp: number;
}

interface Chat {
  id: string;
  name: string;
  lastMessage?: string;
  unreadCount: number;
  messages: Message[];
}

interface ChatState {
  chats: Chat[];
  currentChatId: string | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: ChatState = {
  chats: [
    {
      id: '1',
      name: 'John Doe',
      lastMessage: 'Hello, how are you?',
      unreadCount: 2,
      messages: [
        { id: '1', text: 'Hey there!', sender: 'other', timestamp: Date.now() - 60000 },
        { id: '2', text: 'Hello, how are you?', sender: 'other', timestamp: Date.now() },
      ]
    },
    {
      id: '2',
      name: 'Jane Smith',
      lastMessage: 'Can we meet tomorrow?',
      unreadCount: 0,
      messages: [
        { id: '1', text: 'Hi Jane!', sender: 'me', timestamp: Date.now() - 120000 },
        { id: '2', text: 'Can we meet tomorrow?', sender: 'other', timestamp: Date.now() - 60000 },
        { id: '3', text: 'Sure, what time?', sender: 'me', timestamp: Date.now() },
      ]
    },
  ],
  currentChatId: null,
  isLoading: false,
  error: null,
};

export const sendMessage = createAsyncThunk(
  'chat/sendMessage',
  async ({ chatId, text }: { chatId: string, text: string }, { rejectWithValue }) => {
    try {
      // Here would be API call to send message
      // For now, just return the message data
      return {
        chatId,
        message: {
          id: Date.now().toString(),
          text,
          sender: 'me',
          timestamp: Date.now(),
        }
      };
    } catch (error) {
      return rejectWithValue('Failed to send message');
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
      .addCase(sendMessage.pending, (state) => {
        state.isLoading = true;
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
      });
  },
});

export const { setCurrentChat, clearCurrentChat, receiveMessage } = chatSlice.actions;

export default chatSlice.reducer;
