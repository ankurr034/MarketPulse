import { createSlice } from '@reduxjs/toolkit';

const token = localStorage.getItem('marketpulse_token') || null;

const initialState = {
  token,
  user: null,
  isAuthenticated: !!token,
  loading: false,
  error: null,
  authModalOpen: false,
  authModalTab: 'login' // 'login' | 'signup'
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action) => {
      const { token, user } = action.payload;
      if (token) {
        state.token = token;
        state.isAuthenticated = true;
        localStorage.setItem('marketpulse_token', token);
      }
      if (user) {
        state.user = user;
      }
      state.loading = false;
      state.error = null;
      state.authModalOpen = false;
    },
    setUser: (state, action) => {
      state.user = action.payload;
    },
    logout: (state) => {
      state.token = null;
      state.user = null;
      state.isAuthenticated = false;
      state.loading = false;
      state.error = null;
      localStorage.removeItem('marketpulse_token');
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
      state.loading = false;
    },
    setAuthModalOpen: (state, action) => {
      state.authModalOpen = action.payload;
      if (action.payload) {
        state.error = null;
      }
    },
    setAuthModalTab: (state, action) => {
      state.authModalTab = action.payload;
      state.error = null;
    }
  }
});

export const {
  setCredentials,
  setUser,
  logout,
  setLoading,
  setError,
  setAuthModalOpen,
  setAuthModalTab
} = authSlice.actions;

export default authSlice.reducer;
