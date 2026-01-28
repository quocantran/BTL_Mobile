import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

const isWeb = Platform.OS === 'web';

export const TokenStorage = {
  async getAccessToken(): Promise<string | null> {
    try {
      if (isWeb) {
        const v = localStorage.getItem(ACCESS_TOKEN_KEY);
        return v;
      }
      return await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
    } catch (e) {
      return null;
    }
  },

  async setAccessToken(token: string): Promise<void> {
    try {
      const value = String(token ?? '');
      if (isWeb) {
        localStorage.setItem(ACCESS_TOKEN_KEY, value);
        return;
      }
      await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, value);
    } catch (error) {
      console.error('Error saving access token:', error);
    }
  },

  async getRefreshToken(): Promise<string | null> {
    try {
      if (isWeb) {
        const v = localStorage.getItem(REFRESH_TOKEN_KEY);
        return v;
      }
      return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    } catch (e) {
      return null;
    }
  },

  async setRefreshToken(token: string): Promise<void> {
    try {
      const value = String(token ?? '');
      if (isWeb) {
        localStorage.setItem(REFRESH_TOKEN_KEY, value);
        return;
      }
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, value);
    } catch (error) {
      console.error('Error saving refresh token:', error);
    }
  },

  async setTokens(accessToken: string, refreshToken: string): Promise<void> {
    await this.setAccessToken(accessToken);
    if (refreshToken) {
      await this.setRefreshToken(refreshToken);
    }
  },

  async clearTokens(): Promise<void> {
    try {
      if (isWeb) {
        localStorage.removeItem(ACCESS_TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
        return;
      }
      await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    } catch (error) {
      console.error('Error clearing tokens:', error);
    }
  },
};
