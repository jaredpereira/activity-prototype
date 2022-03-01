import "../styles/globals.css";
import type { AppProps } from "next/app";
import React, { useEffect, useRef } from "react";
import Link from "next/link";
import { ReplicacheProvider, useReplicache } from "../src/useReplicache";
import { useAuthentication } from "backend/auth";
import { LoginForm } from "src/components/LoginForm";
import { useRouter } from "next/router";
import useSWR from "swr";

function MyApp({ Component, pageProps }: AppProps) {
  let { data: auth } = useAuthentication();
  let router = useRouter();
  if (!auth?.loggedIn) return <LoginForm />;

  if (router.pathname === "/s/[studio]")
    return (
      <StudioProvider>
        <Layout>
          <Component {...pageProps} />
        </Layout>
      </StudioProvider>
    );
  if (router.pathname === "/s/[studio]/a/[activity]")
    return (
      <ActivityProvider>
        <Layout>
          <Component {...pageProps} />
        </Layout>
      </ActivityProvider>
    );

  return (
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
  );
}

const ActivityProvider: React.FC = (props) => {
  let router = useRouter();
  let studio = router.query.studio as string;
  let { data } = useSWR(
    `/v0/studio/${studio}/${router.query.activity}`,
    async (k) => {
      let res = await fetch(process.env.NEXT_PUBLIC_WORKER_URL + k);
      let data = (await res.json()) as { id: string };
      return data;
    }
  );

  let id = data?.id || null;
  return (
    <ReplicacheProvider activity={id}>
      <Socket id={id} />
      {props.children}
    </ReplicacheProvider>
  );
};

const StudioProvider: React.FC = (props) => {
  let router = useRouter();
  let studio = router.query.studio as string;
  let { data: auth } = useAuthentication();
  let { data } = useSWR(
    auth?.loggedIn && auth.token.username === studio
      ? null
      : `/v0/studio/${studio}`,
    async (k) => {
      let res = await fetch(process.env.NEXT_PUBLIC_WORKER_URL + k);
      let data = (await res.json()) as { id: string };
      return data;
    }
  );
  let id =
    auth?.loggedIn && auth.token.username === studio
      ? auth.token.studio
      : data?.id || null;
  return (
    <ReplicacheProvider activity={id}>
      <Socket id={id} />
      {props.children}
    </ReplicacheProvider>
  );
};

const Layout: React.FC = (props) => {
  return (
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
      {props.children}
      <Nav />
    </div>
  );
};

function Nav() {
  let { data: auth, mutate } = useAuthentication();
  return (
    <div
      style={{
        width: "100%",
        maxWidth: "100vw",
        height: "32px",
      }}
      className={`border-2 grid grid-flow-col gap-1 auto-cols-min justify-center bg-grey-55`}
    >
      <Link href={!auth?.loggedIn ? `/` : `/s/${auth.token.username}`}>
        <a>home</a>
      </Link>
      <Link href="/chat">
        <a>chat</a>
      </Link>
      <button
        onClick={async () => {
          await fetch(`${process.env.NEXT_PUBLIC_WORKER_URL}/v0/auth/logout`, {
            method: "POST",
            credentials: "include",
          });
          mutate();
        }}
      >
        logout
      </button>
    </div>
  );
}

const Socket = (props: { id: string | null }) => {
  let socket = useRef<WebSocket>();
  let rep = useReplicache();
  useEffect(() => {
    if (!props.id) return;
    socket.current = new WebSocket(
      `${process.env.NEXT_PUBLIC_WORKER_SOCKET}/v0/activity/${props.id}/poke`
    );
    socket.current.addEventListener("message", () => {
      rep.pull();
    });
    return () => {
      socket.current?.close();
    };
  }, [props.id]);
  return null;
};

export default MyApp;
