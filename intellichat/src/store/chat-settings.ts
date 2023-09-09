import {
  AIProviderType,
  AIProviders,
  defaultProvider,
} from '@/lib/chat-providers';
import { create } from 'zustand';

const defaultSystemMessage = 'You are a helpful assistant!';

type OpenAI = {
  name: AIProviderType['openai']['name'];
  model: AIProviderType['openai']['models'][number];
};

type Replicate = {
  name: AIProviderType['replicate']['name'];
  model: AIProviderType['replicate']['models'][number];
};

type ChatSettingsState = {
  isSidebarOpen: boolean;
  systemMessage: string;
  provider: OpenAI | Replicate;
  setSystemMessage: (message: string) => void;
  setProvider: (provider: 'openai' | 'replicate') => void;
  setModel: (model: OpenAI['model'] | Replicate['model']) => void;
  toggleSidebar: () => void;
};

export const useChatSettings = create<ChatSettingsState>((set, get) => ({
  systemMessage: defaultSystemMessage,
  provider: defaultProvider,
  isSidebarOpen: false,
  setSystemMessage: (message: string) => {
    set({ systemMessage: message });
  },
  setProvider: (provider: 'openai' | 'replicate') => {
    set((state) => ({
      provider: {
        ...state.provider,
        name: provider,
        model: AIProviders[provider].models[0],
      },
    }));
  },
  setModel: (model: OpenAI['model'] | Replicate['model']) => {
    const currentProvider = get().provider.name;
    if (AIProviders[currentProvider].models.includes(model)) {
      console.log('update');
      set((state) => ({
        provider: {
          ...state.provider,
          model: model,
        },
      }));
    }
  },
  toggleSidebar: () => {
    set((state) => ({
      isSidebarOpen: !state.isSidebarOpen,
    }));
  },
}));
