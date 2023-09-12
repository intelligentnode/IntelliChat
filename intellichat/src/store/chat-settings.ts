import { OpenAI, Replicate, defaultProvider } from '@/lib/chat-providers';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
  withContext: boolean;
  setEnvKeyExist: ({
    openai,
    replicate,
  }: {
    openai: boolean;
    replicate: boolean;
  }) => void;
  updateChatSettings: (settings: Partial<ChatSettingsState>) => void;
  toggleSidebar: () => void;
};

export const useChatSettings = create<ChatSettingsState>()(
  persist(
    (set, get) => ({
      withContext: true,
      systemMessage: '',
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
