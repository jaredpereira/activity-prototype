import { useAuthentication } from "backend/auth";
import { useRouter } from "next/router";
import { useState } from "react";
import { useFact, useReplicache } from "src/useReplicache";
import Link from "next/link";

export default function StudioPage() {
  let router = useRouter();
  let activities = useFact("ave", "activity");
  let { data: auth } = useAuthentication();
  return (
    <div>
      {activities.map((f) => (
        <Activity
          key={f.id}
          id={f.entity}
          activityId={f.value.value as string}
        />
      ))}
      {auth?.loggedIn && auth.token.username === router.query.studio ? (
        <CreateActivity studioID={auth.token.studio} />
      ) : null}
    </div>
  );
}

const Activity = (props: { id: string; activityId: string }) => {
  let router = useRouter();
  let name = useFact("eav", `${props.id}-name`)[0];
  if (!name) return null;
  return (
    <Link href={`/s/${router.query.studio}/a/${name.value.value}`}>
      <a>{name.value.value}</a>
    </Link>
  );
};

const CreateActivity = (props: { studioID: string }) => {
  let rep = useReplicache();
  let [newActivity, setNewActivity] = useState("");
  return (
    <div>
      <input
        className="border-2"
        value={newActivity}
        onChange={(e) => setNewActivity(e.currentTarget.value)}
      />

      <button
        onClick={async () => {
          await fetch(
            `${process.env.NEXT_PUBLIC_WORKER_URL}/v0/activity/${props.studioID}/activity`,
            {
              method: "POST",
              body: JSON.stringify({ name: newActivity }),
              headers: {
                "Content-Type": "application/json",
              },
            }
          );
          rep.pull();
        }}
      >
        create
      </button>
    </div>
  );
};
