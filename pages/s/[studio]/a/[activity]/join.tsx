import { useRouter } from "next/router";
import { useActivityURL, useReplicache } from "src/useReplicache";

export default function JoinPage() {
  let router = useRouter();
  let code = router.query.code as string;
  let activityURL = useActivityURL();
  let rep = useReplicache();
  if (!code) return <span>"no code!"</span>;
  return (
    <button
      className="text-4xl border-2 rounded-sm p-2"
      onClick={async () => {
        let res = await fetch(`${activityURL}/join`, {
          method: "POST",
          credentials: "include",
          body: JSON.stringify({ code }),
        });
        console.log("res");
        if (res.status === 200) {
          rep.pull();
          router.push(`/s/${router.query.studio}/a/${router.query.activity}`);
        }
      }}
    >
      join
    </button>
  );
}
