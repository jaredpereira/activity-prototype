import { useRouter } from "next/router";
import { ulid } from "src/ulid";
import {
  useActivityURL,
  useFact,
  useHomeStudio,
  useReplicache,
} from "src/useReplicache";

export default function JoinPage() {
  let router = useRouter();
  let code = router.query.code as string;
  let name = useFact<"this/name">("aev", "this/name")[0];
  let activityURL = useActivityURL();

  let rep = useReplicache();
  let homeStudio = useHomeStudio();

  if (!code) return <span>"no code!"</span>;
  if (!homeStudio.loggedIn) return <span>Log in to join this activity</span>;
  return (
    <button
      className="text-4xl border-2 rounded-sm p-2"
      onClick={async () => {
        if (!homeStudio.loggedIn) return;
        let res = await fetch(`${activityURL}/join`, {
          method: "POST",
          credentials: "include",
          body: JSON.stringify({ code }),
        });
        if (res.status === 200) {
          let { activity } = (await res.json()) as { activity: string };
          homeStudio.rep.mutate.addActivity({
            activityID: activity,
            studio: router.query.studio as string,
            name: name.value.value as string,
            entityID: ulid(),
          });
          rep.pull();
          router.push(`/s/${router.query.studio}/a/${router.query.activity}`);
        }
      }}
    >
      join
    </button>
  );
}
