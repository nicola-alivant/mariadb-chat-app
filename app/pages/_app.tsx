import '../globals.css';
import type { AppProps } from 'next/app';
import { useEffect } from "react";

export default function App({ Component, pageProps }: AppProps) {
  useEffect(() => {
    fetch("/pages/api/socket");
  }, []);

  return <Component {...pageProps} />;
}
