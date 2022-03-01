import { LoginRequestBody, useAuthentication } from "backend/auth";
import { useState } from "react";

export function LoginForm() {
  let [login, setLogin] = useState({ username: "", password: "" });
  let [incorrect, setIncorrect] = useState(false);
  let { data: auth, mutate } = useAuthentication();
  console.log(auth);

  return (
    <div>
      {auth?.loggedIn ? <div>username: {auth.token.username}</div> : null}
      <form
        className="grid p-8"
        onSubmit={async (e) => {
          e.preventDefault();
          let body: LoginRequestBody = login;
          let res = await fetch(
            `${process.env.NEXT_PUBLIC_WORKER_URL}/v0/auth/login`,
            {
              credentials: "include",
              method: "POST",
              body: JSON.stringify(body),
              headers: {
                "Content-Type": "application/json",
              },
            }
          );
          if (res.status !== 200) setIncorrect(true);
          mutate();
        }}
      >
        <div className="flex flex-row">
          username:
          <input
            value={login.username}
            className="border-2 p-2"
            onChange={(e) => {
              setIncorrect(false);

              setLogin({ ...login, username: e.currentTarget.value });
            }}
          />
          {incorrect ? <span>Incorrect username or password </span> : null}
        </div>
        <div className="flex flex-row">
          password:
          <input
            className="border-2 p-2"
            value={login.password}
            onChange={(e) =>
              setLogin({ ...login, password: e.currentTarget.value })
            }
          />
        </div>
        <button type="submit">login</button>
        <button
          onClick={async () => {
            await fetch(
              `${process.env.NEXT_PUBLIC_WORKER_URL}/v0/auth/logout`,
              {
                method: "POST",
                credentials: "include",
              }
            );
            mutate();
          }}
        >
          logout
        </button>
      </form>
    </div>
  );
}
