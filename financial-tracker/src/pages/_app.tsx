import type { AppProps } from 'next/app';
import { Provider } from 'react-redux';
import { store } from '@/store';
import '@/styles/globals.css';
import { SessionContextProvider } from '@supabase/auth-helpers-react';
import { supabase } from '@/utils/supabase';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <SessionContextProvider supabaseClient={supabase} initialSession={pageProps.initialSession}>
      <Provider store={store}>
        <Component {...pageProps} />
      </Provider>
    </SessionContextProvider>
  );
}
