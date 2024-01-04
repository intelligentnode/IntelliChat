import type { Azure, Cohere, OpenAI, Replicate } from '@/lib/chat-providers';
import type { Message } from '@/lib/types';
import type {
  PostMessagePayload,
  azureType,
  cohereType,
  openAIType,
  replicateType,
} from '@/lib/validators';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type ChatSettingsState = {
  messages: Message[];
  isSidebarOpen: boolean;
  systemMessage: string;
  provider: 'openai' | 'replicate' | 'azure' | 'cohere';
  numberOfMessages: number;
  openai: openAIType;
  replicate: replicateType;
  azure: azureType;
  cohere: cohereType;
  envKeyExist: {
    openai: boolean;
    replicate: boolean;
    azure: boolean;
    cohere: boolean;
  };
  withContext: boolean;
  intellinodeData: boolean;
  oneKey: string;
  setEnvKeyExist: ({
    openai,
    replicate,
    cohere,
  }: {
    openai: boolean;
    replicate: boolean;
    cohere: boolean;
  }) => void;
  getModel: () => string;
  getExistsInEnv: () => boolean;
  getSettings: () => Omit<PostMessagePayload, 'messages'>;
  getProvider: () => Azure | OpenAI | Replicate | Cohere;
  updateChatSettings: (settings: Partial<ChatSettingsState>) => void;
  toggleSidebar: () => void;
  setMessage: (message: Message) => void;
  setOneKey: (key: string | null) => void;
  clearMessages: () => void;
  resetKeys: () => void;
};

export const useChatSettings = create<ChatSettingsState>()(
  persist(
    (set, get) => ({
      intellinodeData: false,
      oneKey: '',
      setOneKey: (key: string | null) => {
        set((state) => ({
          ...state,
          oneKey: key ?? '',
          intellinodeData: key !== null,
        }));
      },
      withContext: true,
      systemMessage: '',
      provider: 'openai',
      numberOfMessages: 4,
      messages: [],
      isSidebarOpen: false,
      azure: {
        name: 'azure',
        model: '',
        resourceName: '',
        embeddingName: '',
        apiKey: '',
      },
      cohere: {
        name: 'cohere',
        model: 'command',
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
        cohere: false,
      },
      clearMessages: () => {
        set((state) => ({
          ...state,
          messages: [],
        }));
      },
      setMessage: (message: Message) => {
        set((state) => ({
          ...state,
          messages: [...state.messages, message],
        }));
      },
      resetKeys: () => {
        set((state) => ({
          ...state,
          openai: { ...state.openai, apiKey: '' },
          replicate: { ...state.replicate, apiKey: '' },
          azure: { ...state.azure, apiKey: '' },
          cohere: { ...state.cohere, apiKey: '' },
        }));
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
            cohere: get().cohere,
          },
          systemMessage: get().systemMessage,
          n: get().numberOfMessages,
          withContext: get().withContext,
          oneKey: get().oneKey,
          intellinodeData: get().intellinodeData,
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
        } else if (provider === 'cohere') {
          return get().cohere;
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
        } else if (provider === 'cohere') {
          return get().cohere.model;
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
        cohere,
      }: {
        openai: boolean;
        replicate: boolean;
        cohere: boolean;
      }) => {
        set((state) => ({
          envKeyExist: {
            ...state.envKeyExist,
            openai,
            replicate,
            cohere,
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
      partialize: (state) =>
        Object.fromEntries(
          Object.entries(state).filter(
            ([key]) =>
              !['messages', 'oneKey', 'intellinodeData', 'setOneKey'].includes(
                key
              )
          )
        ),
      name: 'chat-settings',
    }
  )
);
