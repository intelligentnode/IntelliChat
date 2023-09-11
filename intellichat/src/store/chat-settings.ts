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
  envKeyExist: {
    openai: boolean;
    replicate: boolean;
  };
  useContext: boolean;
  setUseContext: (useContext: boolean) => void;
  setEnvKeyExist: ({
    openai,
    replicate,
  }: {
    openai: boolean;
    replicate: boolean;
  }) => void;
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
      useContext: false,
      systemMessage: defaultSystemMessage,
      provider: defaultProvider,
      isSidebarOpen: false,
      numberOfMessages: 4,
      apiKeys: {
        openai: '',
        replicate: '',
      },
      envKeyExist: {
        openai: false,
        replicate: false,
      },
      setUseContext: (useContext: boolean) => {
        set({ useContext });
      },
      setEnvKeyExist: ({
        openai,
        replicate,
      }: {
        openai: boolean;
        replicate: boolean;
      }) => {
        set((state) => ({
          envKeyExist: {
            ...state.envKeyExist,
            openai,
            replicate,
          },
        }));
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
        if (provider === 'openai') {
          // get default openal model
          const model = AIProviders.openai.models[0];
          const newProvider: OpenAI = { name: 'openai', model };
          // set new provider and context to true
          set(() => ({ provider: newProvider, useContext: true }));
        } else {
          // get default replicate model
          const model = AIProviders.replicate.models[0];
          const newProvider: Replicate = { name: 'replicate', model };
          // set context to true if openai key is set
          const ctx = get().envKeyExist.openai || get().apiKeys.openai !== '';
          // set new provider and context
          set(() => ({ provider: newProvider, useContext: ctx }));
        }
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
