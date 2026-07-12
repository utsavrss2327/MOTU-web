'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export interface UserProfile {
  name: string;
  picture: string;
  email: string;
}

interface AuthContextType {
  accessToken: string | null;
  user: UserProfile | null;
  login: (token: string, profile: UserProfile) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    // Rehydrate from localStorage on mount
    const storedToken = localStorage.getItem('freenotes_access_token');
    const storedUser = localStorage.getItem('freenotes_user_profile');
    
    if (storedToken) {
      setAccessToken(storedToken);
    }
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error('Failed to parse user profile from local storage');
      }
    }
  }, []);

  const login = (token: string, profile: UserProfile) => {
    setAccessToken(token);
    setUser(profile);
    localStorage.setItem('freenotes_access_token', token);
    localStorage.setItem('freenotes_user_profile', JSON.stringify(profile));
  };

  const logout = () => {
    setAccessToken(null);
    setUser(null);
    localStorage.removeItem('freenotes_access_token');
    localStorage.removeItem('freenotes_user_profile');
  };

  return (
    <AuthContext.Provider value={{ accessToken, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
