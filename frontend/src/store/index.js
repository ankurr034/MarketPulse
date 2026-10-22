import { configureStore } from '@reduxjs/toolkit';
import marketReducer from './slices/marketSlice.js';
import authReducer from './slices/authSlice.js';

const store = configureStore({
  reducer: {
    market: marketReducer,
    auth: authReducer
  }
});

export default store;
