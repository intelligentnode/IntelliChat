import { AIProviders, envKeys } from '@/lib/ai-providers';
import type { Message } from '@/lib/types';
import type {
  PostMessagePayload,
  SupportedProvidersNamesType,
  SupportedProvidersType,
} from '@/lib/validators';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type ChatSettingsState = {
  messages: Message[];
  isSidebarOpen: boolean;
  systemMessage: string;
  provider: SupportedProvidersNamesType;
  numberOfMessages: number;
  providers: SupportedProvidersType;
  withContext: boolean;
  stream : boolean;
  intellinodeData: boolean;
  oneKey: string;
  envKeys: Record<SupportedProvidersNamesType, boolean>;
  getModel: () => string | undefined;
  getSettings: () => Omit<PostMessagePayload, 'messages'>;
  getProvider: () => SupportedProvidersType[SupportedProvidersNamesType];
  updateChatSettings: (settings: Partial<ChatSettingsState>) => void;
  toggleSidebar: () => void;
  setMessage: (message: Message) => void;
  setOneKey: (key: string | null) => void;
  setEnvKeys: (envKeys: Record<SupportedProvidersNamesType, boolean>) => void;
  clearMessages: () => void;
  resetState: () => void;
};

const initialProviders: ChatSettingsState['providers'] = {
  cohere: { name: 'cohere', model: 'command-a-03-2025', apiKey: '' },
  openai: { name: 'openai', model: 'gpt-5.5', apiKey: '' },
  replicate: {
    name: 'replicate',
    model: '70b-chat',
    apiKey: '',
  },
  google: { name: 'google', model: 'gemini-3.6-flash', apiKey: '' },
  
  azure: {
    name: 'azure',
    model: '',
    apiKey: '',
    resourceName: '',
    embeddingName: '',
  },
  mistral: { name: 'mistral', model: 'mistral-medium-latest', apiKey: '' },
  anthropic: { name: 'anthropic', model: 'claude-sonnet-5', apiKey: '' },
  vllm: {
    name: 'vllm',
    model: '',
    baseUrl: '',
    apiKey: '',
  },
};

const initialState = {
  intellinodeData: false,
  oneKey: '',
  withContext: false,
  stream: false,
  systemMessage: '',
  provider: 'openai' as SupportedProvidersNamesType,
  numberOfMessages: 4,
  messages: [],
  isSidebarOpen: false,
  providers: initialProviders,
};

export const useChatSettings = create<ChatSettingsState>()(
  persist(
    (set, get) => ({
      ...initialState,
      envKeys,
      clearMessages: () => set((state) => ({ ...state, messages: [] })),
      setMessage: (message: Message) => {
        set((state) => ({ ...state, messages: [...state.messages, message] }));
      },
      resetState: () => {
        const { messages, ...rest } = initialState;
        set((state) => ({ ...state, ...rest }));
      },
      getSettings: () => {
        let settings: Omit<PostMessagePayload, 'messages'> = {
          provider: get().provider,
          providers: get().providers,
          systemMessage: get().systemMessage,
          n: get().numberOfMessages,
          withContext: get().withContext,
          oneKey: get().oneKey,
          stream :get().stream,
          intellinodeData: get().intellinodeData,
        };
        return settings;
      },
      getProvider: () => {
        const provider = get().provider;
        const providers = get().providers;
        return provider ? providers[provider] : providers.openai;
      },
      getModel: () => {
        const provider = get().provider;
        const providers = get().providers;
        return provider ? providers[provider]?.model : providers.openai?.model;
      },
      setEnvKeys: (envKeys: Record<SupportedProvidersNamesType, boolean>) => {
        set((state) => ({ ...state, envKeys }));
      },
      setOneKey: (key: string | null) => {
        set((state) => ({
          ...state,
          oneKey: key ?? '',
          intellinodeData: key !== null,
        }));
      },
      updateChatSettings: (settings: Partial<ChatSettingsState>) => {
        set((state) => ({ ...state, ...settings }));
      },
      toggleSidebar: () => {
        set((state) => ({ isSidebarOpen: !state.isSidebarOpen }));
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
      // persisted settings from an older version can name models that no longer exist; fall back to the defaults
      version: 2,
      migrate: (persistedState) => {
        const state = (persistedState || {}) as Partial<ChatSettingsState>;
        const providers = { ...initialProviders } as Record<string, any>;
        for (const [key, saved] of Object.entries(state.providers || {})) {
          if (!saved || !(key in providers)) continue;
          const known = (AIProviders as Record<string, { models?: readonly string[] }>)[key]?.models;
          const model = known && saved.model && !known.includes(saved.model) ? known[0] : saved.model;
          providers[key] = { ...providers[key], ...saved, model };
        }
        return { ...state, providers } as ChatSettingsState;
      },
    }
  )
);
