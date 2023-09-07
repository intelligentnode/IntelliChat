import { create } from 'zustand';

const defaultSystemMessage = 'You are a helpful assistant!';

type ChatSettingsState = {
  isSidebarOpen: boolean;
  systemMessage: string;
  provider: 'openai' | 'replicate';
  setSystemMessage: (message: string) => void;
  setProvider: (provider: 'openai' | 'replicate') => void;
  toggleSidebar: () => void;
};

export const useChatSettings = create<ChatSettingsState>((set, get) => ({
  systemMessage: defaultSystemMessage,
  provider: 'openai',
  isSidebarOpen: false,
  setSystemMessage: (message: string) => {
    set({ systemMessage: message });
  },
  setProvider: (provider: 'openai' | 'replicate') => {
    set({ provider });
  },
  toggleSidebar: () => {
    set((state) => ({
      isSidebarOpen: !state.isSidebarOpen,
    }));
  },
}));
