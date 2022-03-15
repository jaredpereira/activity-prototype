import {
  handleLoginRequest,
  handleSessionRequest,
  handleLogoutRequest,
} from "./auth";
import { Bindings } from "./bindings";

export default {
  fetch: handleRequest,
};

export { ActivityDurableObject } from "./ActivityDurableObject";

const setDefaultHeaders = (request: Request, response: Response) => {
  response.headers.append(
    "Access-Control-Allow-Origin",
    request.headers.get("origin") || "*"
  );
  response.headers.append(
    "Access-Control-Allow-Methods",
    "GET,HEAD,POST,OPTIONS"
  );
  response.headers.append("Content-Type", "application/json;charset=UTF-8");
  response.headers.append("Access-Control-Allow-Credentials", "true");
};

// https://URL/v1/${entityID}/operation
async function handleRequest(request: Request, env: Bindings) {
  let url = new URL(request.url);
  let path = url.pathname.split("/");

  if (request.method === "OPTIONS") return handleOptions(request);
  let res: Response;
  switch (path[2]) {
    case "auth": {
      switch (path[3]) {
        case "login": {
          res = await handleLoginRequest(request, env);
          break;
        }
        case "logout": {
          res = await handleLogoutRequest(request, env);
          break;
        }
        case "session": {
          res = await handleSessionRequest(request, env);
          break;
        }
        default: {
          res = new Response("Not found", {
            status: 404,
          });
        }
      }
      break;
    }
    case "studio": {
      // fetch just the studio name
      let studio = await env.usernames_to_studios.get(path[3]);
      if (!studio) {
        res = new Response(JSON.stringify({}), { status: 404 });
        break;
      }
      if (!path[4]) {
        res = new Response(JSON.stringify({ id: studio }), { status: 200 });
      } else {
        let obj = env.ACTIVITY.get(env.ACTIVITY.idFromString(studio));
        let result = await obj.fetch(
          new Request("http://internal/activity/" + path[4])
        );
        if (result.status !== 200)
          res = new Response(JSON.stringify({}), { status: 404 });
        else res = new Response(JSON.stringify({ id: await result.text() }));
      }
      break;
    }
    case "activity": {
      try {
        let id = env.ACTIVITY.idFromString(path[3]);
        let newUrl = new URL(request.url);
        newUrl.pathname = "/" + path.slice(4).join("/");

        let obj = env.ACTIVITY.get(id);
        let activityRes = await obj.fetch(
          new Request(newUrl.toString(), new Request(request))
        );
        res = new Response(activityRes.body, activityRes);
      } catch (e) {
        res = new Response(
          JSON.stringify({ errors: [`No activity with id: ${path[3]} found`] }),
          { status: 404 }
        );
      }
      break;
    }
    default: {
      res = new Response("Not found", {
        status: 404,
      });
    }
  }

  setDefaultHeaders(request, res);
  return res;
}

function handleOptions(request: Request) {
  // Make sure the necessary headers are present
  // for this to be a valid pre-flight request
  let headers = request.headers;
  if (
    headers.get("Origin") !== null &&
    headers.get("Access-Control-Request-Method") !== null &&
    headers.get("Access-Control-Request-Headers") !== null
  ) {
    let respHeaders = {
      "Access-Control-Allow-Origin": request.headers.get("origin") || "",
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS",
      "Access-Control-Max-Age": "86400",
      "Access-Control-Allow-Headers":
        request.headers.get("Access-Control-Request-Headers") || "",
    };

    return new Response(null, {
      headers: respHeaders,
    });
  } else {
    // Handle standard OPTIONS request.
    // If you want to allow other HTTP Methods, you can do that here.
    return new Response(null, {
      headers: {
        Allow: "GET, HEAD, POST, OPTIONS",
      },
    });
  }
}
