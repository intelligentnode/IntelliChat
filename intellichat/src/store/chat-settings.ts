import { Azure, OpenAI, Replicate } from '@/lib/chat-providers';
import {
  PostMessagePayload,
  azureType,
  openAIType,
  replicateType,
} from '@/lib/validators';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type ChatSettingsState = {
  isSidebarOpen: boolean;
  systemMessage: string;
  provider: 'openai' | 'replicate' | 'azure';
  numberOfMessages: number;
  openai: openAIType;
  replicate: replicateType;
  azure: azureType;
  envKeyExist: {
    openai: boolean;
    replicate: boolean;
    azure: boolean;
  };
  withContext: boolean;
  setEnvKeyExist: ({
    openai,
    replicate,
  }: {
    openai: boolean;
    replicate: boolean;
  }) => void;
  getModel: () => string;
  getExistsInEnv: () => boolean;
  getSettings: () => Omit<PostMessagePayload, 'messages'>;
  getProvider: () => Azure | OpenAI | Replicate;
  updateChatSettings: (settings: Partial<ChatSettingsState>) => void;
  toggleSidebar: () => void;
};

export const useChatSettings = create<ChatSettingsState>()(
  persist(
    (set, get) => ({
      withContext: true,
      systemMessage: '',
      provider: 'openai',
      isSidebarOpen: false,
      numberOfMessages: 4,
      azure: {
        name: 'azure',
        model: '',
        resourceName: '',
        embeddingName: '',
        apiKey: '',
      },
      openai: {
        name: 'openai',
        model: 'gpt-3.5-turbo',
        apiKey: '',
      },
      replicate: {
        name: 'replicate',
        model: '70b-chat',
        apiKey: '',
      },
      envKeyExist: {
        openai: false,
        replicate: false,
        azure: false,
      },
      getExistsInEnv: () => {
        const provider = get().provider;
        return get().envKeyExist[provider];
      },
      getSettings: () => {
        const provider = get().provider;
        let settings: Omit<PostMessagePayload, 'messages'> = {
          provider,
          providers: {
            openai: get().openai,
            replicate: get().replicate,
            azure: get().azure,
          },
          systemMessage: get().systemMessage,
          n: get().numberOfMessages,
          withContext: get().withContext,
        };
        return settings;
      },
      getProvider: () => {
        const provider = get().provider;
        if (provider === 'openai') {
          return get().openai;
        } else if (provider === 'replicate') {
          return get().replicate;
        } else if (provider === 'azure') {
          return get().azure;
        } else {
          // return default provider
          console.log('returning default provider');
          return get().openai;
        }
      },
      getModel: () => {
        const provider = get().provider;
        if (provider === 'openai') {
          return get().openai.model;
        } else if (provider === 'replicate') {
          return get().replicate.model;
        } else if (provider === 'azure') {
          return get().azure.model;
        } else {
          // return default model
          console.log('returning default model');
          return get().openai.model;
        }
      },
      updateChatSettings: (settings: Partial<ChatSettingsState>) => {
        set((state) => ({
          ...state,
          ...settings,
        }));
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
