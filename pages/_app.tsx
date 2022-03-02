import "../styles/globals.css";
import type { AppProps } from "next/app";
import React from "react";
import Link from "next/link";
import { ReplicacheProvider } from "../src/useReplicache";
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
  if (router.pathname.startsWith("/s/[studio]/a/[activity]"))
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
  let activity = router.query.activity as string;
  let { data } = useSWR(
    !studio || !activity
      ? null
      : `/v0/studio/${studio}/${router.query.activity}`,
    async (k) => {
      let res = await fetch(process.env.NEXT_PUBLIC_WORKER_URL + k);
      console.log(res.status);
      if (res.status !== 200) return { found: false } as const;
      let data = (await res.json()) as { id: string };
      return { ...data, found: true };
    }
  );
  if (data === undefined) return <div>loading</div>;
  if (!data.found) return <div>404</div>;

  return (
    <ReplicacheProvider activity={data.id}>{props.children}</ReplicacheProvider>
  );
};

const StudioProvider: React.FC = (props) => {
  let router = useRouter();
  let studio = router.query.studio as string;
  let { data: auth } = useAuthentication();
  let { data } = useSWR(
    (auth?.loggedIn && auth.token.username === studio) || !studio
      ? null
      : `/v0/studio/${studio}`,
    async (key) => {
      let res = await fetch(process.env.NEXT_PUBLIC_WORKER_URL + key);
      if (res.status !== 200) return { found: false } as const;
      let data = (await res.json()) as { id: string };
      return { ...data, found: true };
    }
  );
  if (data === undefined && !auth) return <div>loading</div>;
  if (data && !data.found) return <div>404</div>;

  let id =
    auth?.loggedIn && auth.token.username === studio
      ? auth.token.studio
      : data?.id || null;
  return (
    <ReplicacheProvider activity={id}>{props.children}</ReplicacheProvider>
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

export default MyApp;
