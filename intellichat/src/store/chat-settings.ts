import { AIProviders, envKeys, providerNames, type ProviderName, type Vendor } from '@/lib/ai-providers';
import type { Message } from '@/lib/types';
import type {
  CodeSettings,
  ImagesSettings,
  PostMessagePayload,
  ProviderSettings,
  SpeechSettings,
  SupportedProvidersNamesType,
  SupportedProvidersType,
} from '@/lib/validators';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ChatSettingsState = {
  messages: Message[];
  isSidebarOpen: boolean;
  systemMessage: string;
  provider: SupportedProvidersNamesType;
  numberOfMessages: number;
  providers: SupportedProvidersType;
  withContext: boolean;
  stream: boolean;
  images: ImagesSettings;
  speech: SpeechSettings;
  code: CodeSettings;
  envKeys: Record<Vendor, boolean>;
  // true once /api answered which keys exist in .env
  envKeysLoaded: boolean;
  getModel: () => string | undefined;
  getSettings: () => Omit<PostMessagePayload, 'messages'>;
  getProvider: () => ProviderSettings | undefined;
  updateChatSettings: (settings: Partial<ChatSettingsState>) => void;
  toggleSidebar: () => void;
  setMessage: (message: Message) => void;
  updateMessage: (id: string, patch: Partial<Message>) => void;
  setEnvKeys: (envKeys: Record<Vendor, boolean>) => void;
  clearMessages: () => void;
  resetState: () => void;
};

// Default settings of every chat provider: the first model of its list, its default base URL, no key.
export function defaultProviderSettings(name: ProviderName): ProviderSettings {
  const config = AIProviders[name] as { models?: readonly string[]; baseUrl?: string };
  const base = { name, model: config.models?.[0] || '', apiKey: '', baseUrl: config.baseUrl || '' };
  if (name === 'azure') return { ...base, resourceName: '', embeddingName: '' } as ProviderSettings;
  return base as ProviderSettings;
}

const initialProviders = Object.fromEntries(
  providerNames.map((name) => [name, defaultProviderSettings(name)])
) as SupportedProvidersType;

const initialImages: ImagesSettings = { provider: 'openai', apiKey: '' };
const initialSpeech: SpeechSettings = { provider: 'openai', voice: 'alloy', readAloud: false, apiKey: '' };
const initialCode: CodeSettings = { github: false, githubToken: '', localFiles: true, allowEdits: false };

const initialState = {
  withContext: false,
  stream: true,
  systemMessage: '',
  provider: 'openai' as SupportedProvidersNamesType,
  numberOfMessages: 4,
  messages: [] as Message[],
  isSidebarOpen: false,
  providers: initialProviders,
  images: initialImages,
  speech: initialSpeech,
  code: initialCode,
};

export const useChatSettings = create<ChatSettingsState>()(
  persist(
    (set, get) => ({
      ...initialState,
      envKeys,
      envKeysLoaded: false,
      clearMessages: () => set((state) => ({ ...state, messages: [] })),
      setMessage: (message: Message) => {
        set((state) => ({ ...state, messages: [...state.messages, message] }));
      },
      updateMessage: (id: string, patch: Partial<Message>) => {
        set((state) => ({ ...state, messages: state.messages.map((m) => (m.id === id ? { ...m, ...patch } : m)) }));
      },
      resetState: () => {
        const { messages, ...rest } = initialState;
        set((state) => ({ ...state, ...rest }));
      },
      getSettings: () => {
        const settings: Omit<PostMessagePayload, 'messages'> = {
          provider: get().provider,
          providers: get().providers,
          systemMessage: get().systemMessage,
          n: get().numberOfMessages,
          withContext: get().withContext,
          stream: get().stream,
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
      setEnvKeys: (envKeys: Record<Vendor, boolean>) => {
        set((state) => ({ ...state, envKeys: { ...state.envKeys, ...envKeys }, envKeysLoaded: true }));
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
          Object.entries(state).filter(([key]) => !['messages', 'envKeys', 'envKeysLoaded'].includes(key))
        ),
      name: 'chat-settings',
      // persisted settings from an older version can name models or providers that no longer exist
      version: 4,
      migrate: (persistedState) => {
        const state = (persistedState || {}) as Partial<ChatSettingsState> & Record<string, unknown>;
        const providers = { ...initialProviders } as Record<string, ProviderSettings>;
        for (const [key, saved] of Object.entries(state.providers || {})) {
          if (!saved || !(key in providers)) continue;
          const config = AIProviders[key as ProviderName] as { models?: readonly string[]; kind: string };
          const known = config.kind === 'cloud' ? config.models : undefined;
          const model = known && saved.model && !known.includes(saved.model) ? known[0] : saved.model;
          providers[key] = { ...providers[key], ...saved, model: model || providers[key].model };
        }
        const provider = state.provider && state.provider in providers ? state.provider : 'openai';
        // intellicloud (one key) was removed; drop its fields
        const { intellinodeData, oneKey, ...rest } = state;
        return {
          ...rest,
          provider,
          providers: providers as SupportedProvidersType,
          images: { ...initialImages, ...(state.images || {}) },
          speech: { ...initialSpeech, ...(state.speech || {}) },
          code: { ...initialCode, ...(state.code || {}) },
        } as ChatSettingsState;
      },
    }
  )
);
