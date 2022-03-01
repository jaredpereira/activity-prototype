import cookie from "cookie";
import useSWR from "swr";

export type Token = {
  username: string;
  id: string;
  studio: string;
};

export type LoginRequestBody = {
  username: string;
  password: string;
};

const cookieKey = "hyperlink_tok";

export function removeToken(res: Response) {
  res.headers.append(
    "Set-Cookie",
    cookie.serialize(cookieKey, "", {
      path: "/",
      sameSite: "none",
      httpOnly: true,
      secure: true,
      expires: new Date(Date.now() - 1000),
    })
  );
}

function setToken(res: Response, token: Token) {
  res.headers.set(
    "Set-Cookie",
    cookie.serialize(cookieKey, JSON.stringify(token), {
      path: "/",
      expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30), // 30 days
      httpOnly: true,
      sameSite: "none",
      secure: true,
    })
  );
}

export function getToken(req: Request) {
  const cookies = req.headers.get("Cookie");
  if (!cookies) return;

  const login_token = cookie.parse(cookies)[cookieKey];
  if (login_token) return JSON.parse(login_token) as Token;
  return;
}

export async function handleLoginRequest(request: Request, env: Bindings) {
  let body = (await request.json()) as LoginRequestBody;
  let token = getToken(request);
  if (token) return new Response(JSON.stringify({}), { status: 200 });
  if (body.password !== "password")
    return new Response(JSON.stringify({ errors: ["Incorrect password"] }), {
      status: 401,
    });
  console.log(env);
  let studio = await env.usernames_to_studios.get(body.username);
  if (!studio) {
    let newID = env.COUNTER.newUniqueId();
    console.log("creating new DO");
    studio = newID.toString();
    env.usernames_to_studios.put(body.username, studio);
  }
  console.log(studio);
  token = { username: body.username, id: body.username, studio };
  let res = new Response(JSON.stringify(token), {});
  setToken(res, token);
  console.log(res.headers.get("Set-Cookie"));
  return res;
}

export async function handleLogoutRequest(_request: Request, _env: Bindings) {
  let res = new Response(JSON.stringify({}));
  console.log("loggin out!");
  removeToken(res);
  return res;
}

export type Session =
  | {
      loggedIn: false;
    }
  | {
      loggedIn: true;
      token: Token;
    };

export async function handleSessionRequest(request: Request, _env: Bindings) {
  let token = getToken(request);
  if (token) return new Response(JSON.stringify({ loggedIn: true, token }));
  else return new Response(JSON.stringify({ loggedIn: false }));
}

export const useAuthentication = () => {
  return useSWR<Session>("/v0/auth/session", async (key) => {
    let res = await fetch(process.env.NEXT_PUBLIC_WORKER_URL + key, {
      credentials: "include",
    });
    let result = await res.json();
    return result as Session;
  });
};
