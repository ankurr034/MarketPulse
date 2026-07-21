import { configureStore } from '@reduxjs/toolkit';
import marketReducer from './slices/marketSlice.js';

const store = configureStore({
  reducer: {
    market: marketReducer
  }
});

export default store;
