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
    <div className="p-6">
      <h1 className="text-4xl capitalize">
        {router.query.studio}&apos;s Studio
      </h1>
      <h4 className="text-sm text-grey-35 font-bold">JUST YOU</h4>
      <div className="flex flex-row flex-wrap">
        {activities.map((f) => (
          <Activity
            key={f.id}
            id={f.entity}
            activityId={f.value.value as string}
          />
        ))}
      </div>
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
      <a className="">
        <div className="p-4 rounded-md bg-white shadow-drop border-[1px] border-grey-55 max-w-sm w-max">
          <h3 className="text-xl font-bold ">{name.value.value}</h3>
        </div>
      </a>
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
