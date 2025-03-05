import type { AppProps } from 'next/app'
import '../app/globals.css'
import { Toaster } from 'react-hot-toast';

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <Toaster position="top-right" />
      <Component {...pageProps} />
    </>
  );
}

export default MyApp