import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';

/**
 * makeStore creates a fresh Redux store instance.
 * Used by StoreProvider (one per request in SSR) and by the type exports below.
 * Do NOT import the default export at runtime - use StoreProvider instead.
 */
export function makeStore() {
  return configureStore({
    reducer: {
      auth: authReducer,
    },
  });
}

// Derive types from the factory so hooks.ts, tests, and other consumers
// always match the actual store shape regardless of which instance is used.
export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];
