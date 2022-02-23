import "../styles/globals.css";
import type { AppProps } from "next/app";
import React, { useEffect, useRef } from "react";
import Link from "next/link";
import { ReplicacheProvider, useReplicache } from "../src/useReplicache";

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <ReplicacheProvider>
      <Socket />
      <Link href="/">
        <a>home</a>
      </Link>
      <Component {...pageProps} />
    </ReplicacheProvider>
  );
}

const Socket = () => {
  let socket = useRef<WebSocket>();
  let rep = useReplicache();
  useEffect(() => {
    socket.current = new WebSocket(
      `wss://activity-prototype.awarm.workers.dev/poke`
    );
    socket.current.addEventListener("message", () => {
      rep.pull();
    });
  }, []);
  return null;
};

export default MyApp;
