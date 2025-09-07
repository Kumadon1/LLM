import { create } from 'zustand';

interface Notification {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: Date;
}

interface User {
  id: string;
  name: string;
  email: string;
}

interface AppState {
  notifications: Notification[];
  user: User | null;
  isLoading: boolean;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  notifications: [],
  user: { id: '1', name: 'User', email: 'user@example.com' },
  isLoading: false,
  
  addNotification: (notification) => set((state) => ({
    notifications: [
      ...state.notifications,
      {
        ...notification,
        id: Date.now().toString(),
        timestamp: new Date(),
      },
    ],
  })),
  
  removeNotification: (id) => set((state) => ({
    notifications: state.notifications.filter((n) => n.id !== id),
  })),
  
  setUser: (user) => set({ user }),
  
  setLoading: (loading) => set({ isLoading: loading }),
}));
