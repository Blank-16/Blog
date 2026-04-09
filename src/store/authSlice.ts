import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Models } from 'appwrite';

interface AuthState {
  status: boolean;
  loading: boolean;
  userData: Models.User<Models.Preferences> | null;
}

interface LoginPayload {
  userData: Models.User<Models.Preferences>;
}

const initialState: AuthState = {
  status: false,
  loading: true,
  userData: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    login: (state, action: PayloadAction<LoginPayload>) => {
      state.status = true;
      state.loading = false;
      state.userData = action.payload.userData;
    },
    logout: (state) => {
      state.status = false;
      state.loading = false;
      state.userData = null;
    },
    setAuthLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
  },
});

export const { login, logout, setAuthLoading } = authSlice.actions;
export type { AuthState };
export default authSlice.reducer;
