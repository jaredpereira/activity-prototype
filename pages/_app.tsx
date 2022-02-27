import "../styles/globals.css";
import type { AppProps } from "next/app";
import React, { useEffect, useRef } from "react";
import Link from "next/link";
import { ReplicacheProvider, useReplicache } from "../src/useReplicache";

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <ReplicacheProvider>
      <Socket />
      <div
        style={{
          width: "100vw",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          paddingBottom: "32px",
          alignItems: "stretch",
          position: "relative",
        }}
        className="bg-background"
      >
        <Component {...pageProps} />
        <Nav />
      </div>
    </ReplicacheProvider>
  );
}

function Nav() {
  return (
    <div
      style={{
        width: "100%",
        maxWidth: "100vw",
        height: "32px",
      }}
      className={`border-2 grid grid-flow-col gap-1 auto-cols-min justify-center bg-grey-55`}
    >
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
