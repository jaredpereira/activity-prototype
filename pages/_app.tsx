import "../styles/globals.css";
import type { AppProps } from "next/app";
import React from "react";
import Link from "next/link";
import { HomeStudioProvider, ReplicacheProvider } from "../src/useReplicache";
import { useAuthentication } from "backend/auth";
import { LoginForm } from "src/components/LoginForm";
import { useRouter } from "next/router";
import useSWR from "swr";
import { ChatBubble, Deck, House, Information } from "src/Icons";

function MyApp({ Component, pageProps }: AppProps) {
  let { data: auth } = useAuthentication();
  let router = useRouter();
  if (!auth?.loggedIn) return <LoginForm />;

  if (router.pathname === "/s/[studio]")
    return (
      <HomeStudioProvider>
        <StudioProvider>
          <Layout>
            <Component {...pageProps} />
          </Layout>
        </StudioProvider>
      </HomeStudioProvider>
    );
  if (router.pathname.startsWith("/s/[studio]/a/[activity]"))
    return (
      <HomeStudioProvider>
        <ActivityProvider>
          <Layout>
            <Component {...pageProps} />
          </Layout>
        </ActivityProvider>
      </HomeStudioProvider>
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
        paddingBottom: "16px",
        alignItems: "stretch",
        position: "relative",
      }}
      className="bg-background"
    >
      <div className="overflow-y-scroll h-full">{props.children}</div>
      <Nav />
    </div>
  );
};

function Nav() {
  let { data: auth } = useAuthentication();
  let router = useRouter();
  if (!router.pathname.startsWith("/s/[studio]/a/[activity]")) return null;
  return (
    <div
      style={{
        width: "100%",
        maxWidth: "100vw",
      }}
      className={`grid items-center grid-cols-[1fr,1fr,1fr] gap-1  bg-background border-t-2 px-4 border-grey-15`}
    >
      <Link href={!auth?.loggedIn ? `/` : `/s/${auth.token.username}`}>
        <a className="justify-self-start">
          <House className="text-grey-55" />
        </a>
      </Link>

      <div className="justify-self-center flex flex-row">
        <Link href={`/s/${router.query.studio}/a/${router.query.activity}`}>
          <a className="border-2 border-t-0 rounded-b-lg px-2 relative -top-0.5 bg-background border-grey-15">
            <Deck />
          </a>
        </Link>

        <Link href="/chat">
          <a>
            <ChatBubble />
          </a>
        </Link>
      </div>
      <Link href="/">
        <a className="justify-self-end">
          <Information className="text-grey-55" />
        </a>
      </Link>
    </div>
  );
}

export default MyApp;
