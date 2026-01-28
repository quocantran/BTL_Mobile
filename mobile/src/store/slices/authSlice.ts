import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { IRegisterByHrRequest, IUser } from '../../types';
import { authService } from '../../services/authService';
import { TokenStorage } from '../../utils/tokenStorage';

interface AuthState {
  user: IUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isRegisterLoading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  isRegisterLoading: false,
  error: null,
};

export const login = createAsyncThunk(
  'auth/login',
  async ({ username, password }: { username: string; password: string }, { rejectWithValue }) => {
    try {
      const response = await authService.login({ username, password });
      const { access_token, refresh_token, user } = response.data;
      // Always save access token; only save refresh token when provided
      if (access_token) {
        await TokenStorage.setAccessToken(String(access_token));
      }
      if (refresh_token) {
        await TokenStorage.setRefreshToken(String(refresh_token));
      }
      return user;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Đăng nhập thất bại');
    }
  }
);

export const register = createAsyncThunk(
  'auth/register',
  async (data: { name: string; email: string; password: string; age?: number; gender?: string; address?: string }, { rejectWithValue }) => {
    try {
      const response = await authService.register(data);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Đăng ký thất bại');
    }
  }
);

export const registerByHr = createAsyncThunk(
  'auth/registerByHr',
  async (data: IRegisterByHrRequest, { rejectWithValue }) => {
    try {
      const response = await authService.registerByHr(data);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Đăng ký thất bại');
    }
  }
);

export const logout = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      await authService.logout();
      await TokenStorage.clearTokens();
    } catch (error: any) {
      await TokenStorage.clearTokens();
      return rejectWithValue(error.response?.data?.message || 'Đăng xuất thất bại');
    }
  }
);

export const getProfile = createAsyncThunk(
  'auth/getProfile',
  async (_, { rejectWithValue }) => {
    try {
      const response = await authService.getProfile();
      return response.data.user;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Lấy thông tin thất bại');
    }
  }
);


export const checkAuth = createAsyncThunk(
  'auth/checkAuth',
  async (_, { rejectWithValue }) => {
    try {
      const token = await TokenStorage.getAccessToken();
      if (!token) {
        throw new Error('No token');
      }
      const response = await authService.getProfile();
      return response.data.user;
    } catch (error: any) {
      await TokenStorage.clearTokens();
      return rejectWithValue('Phiên đăng nhập hết hạn');
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setUser: (state, action: PayloadAction<IUser>) => {
      state.user = action.payload;
      state.isAuthenticated = true;
    },
    clearAuth: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(login.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Register
      .addCase(register.pending, (state) => {
        state.isRegisterLoading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state) => {
        state.isRegisterLoading = false;
      })
      .addCase(register.rejected, (state, action) => {
        state.isRegisterLoading = false;
        state.error = action.payload as string;
      })
      // Register by HR
      .addCase(registerByHr.pending, (state) => {
        state.isRegisterLoading = true;
        state.error = null;
      })
      .addCase(registerByHr.fulfilled, (state) => {
        state.isRegisterLoading = false;
      })
      .addCase(registerByHr.rejected, (state, action) => {
        state.isRegisterLoading = false;
        state.error = action.payload as string;
      })

      // Logout
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.isAuthenticated = false;
      })
      // Get Profile
      .addCase(getProfile.fulfilled, (state, action) => {
        state.user = action.payload;
        state.isAuthenticated = true;
      })
      // Check Auth
      .addCase(checkAuth.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(checkAuth.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
      })
      .addCase(checkAuth.rejected, (state) => {
        state.isLoading = false;
        state.user = null;
        state.isAuthenticated = false;
      });
      
  },
});

export const { clearError, setUser, clearAuth } = authSlice.actions;
export default authSlice.reducer;
