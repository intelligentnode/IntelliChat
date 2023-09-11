import {
  AIProviderType,
  AIProviders,
  defaultProvider,
} from '@/lib/chat-providers';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
  numberOfMessages: number;
  apiKeys: {
    openai: string;
    replicate: string;
  };
  setSystemMessage: (message: string) => void;
  setNumberOfMessages: (numberOfMessages: number) => void;
  setProvider: (provider: 'openai' | 'replicate') => void;
  setModel: (model: OpenAI['model'] | Replicate['model']) => void;
  setKey: (provider: 'openai' | 'replicate', key: string) => void;
  toggleSidebar: () => void;
};

export const useChatSettings = create<ChatSettingsState>()(
  persist(
    (set, get) => ({
      systemMessage: defaultSystemMessage,
      provider: defaultProvider,
      isSidebarOpen: false,
      numberOfMessages: 4,
      apiKeys: {
        openai: '',
        replicate: '',
      },
      setSystemMessage: (message: string) => {
        set({ systemMessage: message });
      },
      setNumberOfMessages: (numberOfMessages: number) => {
        if (numberOfMessages < 4 || numberOfMessages > 8) return;
        set({ numberOfMessages });
      },
      setKey: (provider: 'openai' | 'replicate', key: string) => {
        set((state) => ({
          apiKeys: {
            ...state.apiKeys,
            [provider]: key,
          },
        }));
      },
      setProvider: (provider: 'openai' | 'replicate') => {
        let newProvider: OpenAI | Replicate;
        if (provider === 'openai') {
          const model = AIProviders.openai.models[0];
          newProvider = {
            name: 'openai',
            model,
          };
        } else {
          const model = AIProviders.replicate.models[0];
          newProvider = {
            name: 'replicate',
            model,
          };
        }
        set(() => ({ provider: newProvider }));
      },
      setModel: (model: OpenAI['model'] | Replicate['model']) => {
        const currentProvider = get().provider.name;
        if (currentProvider === 'openai') {
          set((state) => ({
            provider: {
              ...(state.provider as OpenAI),
              model: model as OpenAI['model'],
            },
          }));
        } else {
          set((state) => ({
            provider: {
              ...(state.provider as Replicate),
              model: model as Replicate['model'],
            },
          }));
        }
      },
      toggleSidebar: () => {
        set((state) => ({
          isSidebarOpen: !state.isSidebarOpen,
        }));
      },
    }),
    {
      name: 'chat-settings',
    }
  )
);
