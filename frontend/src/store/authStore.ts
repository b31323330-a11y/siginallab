import { create } from 'zustand';

export interface User {
  id: number;
  email: string;
  full_name: string;
  group_name: string;
  variant_number: number;
  role: 'student' | 'teacher' | 'admin' | 'guest';
}

interface AuthState {
  user: User | null;
  token: string | null;
  selectedVariant: number;
  setUser: (user: User | null, token?: string | null) => void;
  setSelectedVariant: (variant: number) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => {
  const savedToken = localStorage.getItem('token');
  const savedUser = localStorage.getItem('user');
  let userObj: User | null = null;
  if (savedUser) {
    try {
      userObj = JSON.parse(savedUser);
    } catch {
      userObj = null;
    }
  }

  return {
    user: userObj,
    token: savedToken,
    selectedVariant: userObj?.variant_number || 1,
    setUser: (user, token) => {
      if (user) {
        localStorage.setItem('user', JSON.stringify(user));
        if (token) localStorage.setItem('token', token);
      } else {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
      }
      set({ user, token: token || null, selectedVariant: user?.variant_number || 1 });
    },
    setSelectedVariant: (variant) => set({ selectedVariant: variant }),
    logout: () => {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      set({ user: null, token: null, selectedVariant: 1 });
    }
  };
});

