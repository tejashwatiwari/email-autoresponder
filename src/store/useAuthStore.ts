import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface User {
  access_token: string;
  [key: string]: any;
}

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  setAuth: (isAuthenticated: boolean, user: User | null) => void;
  logout: () => void;
  checkAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      user: null,
      setAuth: (isAuthenticated: boolean, user: User | null) => {
        if (user?.access_token) {
          localStorage.setItem('gmail_token', user.access_token);
        }
        set({ isAuthenticated, user });
      },
      logout: () => {
        localStorage.removeItem('gmail_token');
        set({ isAuthenticated: false, user: null });
      },
      checkAuth: () => {
        const token = localStorage.getItem('gmail_token');
        if (token) {
          set({
            isAuthenticated: true,
            user: { access_token: token }
          });
        } else {
          set({
            isAuthenticated: false,
            user: null
          });
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        user: state.user,
      }),
    }
  )
);
