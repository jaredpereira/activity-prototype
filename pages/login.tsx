import { useState } from "react";
import { LoginRequestBody, useAuthentication } from "backend/auth";

export default function LoginPage() {
  let [login, setLogin] = useState({ username: "", password: "" });
  let [incorrect, setIncorrect] = useState(false);
  let { data: auth, mutate } = useAuthentication();
  console.log(auth);

  return (
    <div>
      {auth?.loggedIn ? <div>username: {auth.token.username}</div> : null}
      <form
        className="grid"
        onSubmit={async (e) => {
          e.preventDefault();
          let body: LoginRequestBody = login;
          let res = await fetch("http://localhost:8787/v0/auth/login", {
            credentials: "include",
            method: "POST",
            body: JSON.stringify(body),
            headers: {
              "Content-Type": "application/json",
            },
          });
          if (res.status !== 200) setIncorrect(true);
          mutate();
        }}
      >
        <div>
          <input
            value={login.username}
            onChange={(e) => {
              setIncorrect(false);

              setLogin({ ...login, username: e.currentTarget.value });
            }}
          />
          {incorrect ? <span>Incorrect username or password </span> : null}
        </div>
        <input
          value={login.password}
          onChange={(e) =>
            setLogin({ ...login, password: e.currentTarget.value })
          }
        />
        <button type="submit">login</button>

        <button
          onClick={async () => {
            let body: LoginRequestBody = login;
            await fetch("http://localhost:8787/v0/auth/logout", {
              method: "POST",
              credentials: "include",
              body: JSON.stringify(body),
              headers: {
                "Content-Type": "application/json",
              },
            });
            mutate();
          }}
        >
          logout
        </button>
      </form>
    </div>
  );
}
