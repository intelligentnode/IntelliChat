import type {
  Azure,
  Cohere,
  Google,
  OpenAI,
  Replicate,
} from '@/lib/chat-providers';
import type { Message } from '@/lib/types';
import type {
  PostMessagePayload,
  azureType,
  cohereType,
  googleType,
  openAIType,
  replicateType,
} from '@/lib/validators';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type ChatSettingsState = {
  messages: Message[];
  isSidebarOpen: boolean;
  systemMessage: string;
  provider: 'openai' | 'replicate' | 'azure' | 'cohere' | 'google';
  numberOfMessages: number;
  openai: openAIType;
  replicate: replicateType;
  azure: azureType;
  cohere: cohereType;
  google: googleType;
  envKeyExist: {
    openai: boolean;
    replicate: boolean;
    azure: boolean;
    cohere: boolean;
    google: boolean;
  };
  withContext: boolean;
  intellinodeData: boolean;
  oneKey: string;
  setEnvKeyExist: ({
    openai,
    replicate,
    cohere,
    google,
  }: {
    openai: boolean;
    replicate: boolean;
    cohere: boolean;
    google: boolean;
  }) => void;
  getModel: () => string;
  getExistsInEnv: () => boolean;
  getSettings: () => Omit<PostMessagePayload, 'messages'>;
  getProvider: () => Azure | OpenAI | Replicate | Cohere | Google;
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
      withContext: false,
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
      cohere: { name: 'cohere', model: 'command', apiKey: '' },
      openai: { name: 'openai', model: 'gpt-3.5-turbo', apiKey: '' },
      replicate: { name: 'replicate', model: '70b-chat', apiKey: '' },
      google: { name: 'google', model: 'gemini', apiKey: '' },
      envKeyExist: {
        openai: false,
        replicate: false,
        azure: false,
        cohere: false,
        google: false,
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
          google: { ...state.google, apiKey: '' },
          oneKey: '',
          intellinodeData: false,
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
            google: get().google,
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
        if (!provider) {
          return get().openai;
        }
        return get()[provider];
      },
      getModel: () => {
        const provider = get().provider;
        if (!provider) {
          return get().openai.model;
        }
        return get()[provider].model;
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
        google,
      }: {
        openai: boolean;
        replicate: boolean;
        cohere: boolean;
        google: boolean;
      }) => {
        set((state) => ({
          envKeyExist: {
            ...state.envKeyExist,
            openai,
            replicate,
            cohere,
            google,
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
            ([key]) => !['messages', 'intellinodeData'].includes(key)
          )
        ),
      name: 'chat-settings',
    }
  )
);
