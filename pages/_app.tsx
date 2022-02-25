import "../styles/globals.css";
import type { AppProps } from "next/app";
import React, { useEffect, useRef } from "react";
import Link from "next/link";
import { ReplicacheProvider, useReplicache } from "../src/useReplicache";

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <ReplicacheProvider>
      <Socket />
      <Component {...pageProps} />
      <Nav />
    </ReplicacheProvider>
  );
}

function Nav() {
  return (
    <div style={{ bottom: '16px', width: "100%", maxWidth: '800px' }} className=" p-4 border-2 grid grid-flow-col gap-1 auto-cols-min justify-center absolute">
      <Link href="/">
        <a>home</a>
      </Link>
      <Link href="/chat">
        <a>chat</a>
      </Link>
    </div>
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
