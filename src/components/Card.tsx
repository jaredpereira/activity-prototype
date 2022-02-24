import { useFact } from "../useReplicache";
import Link from "next/link";

export function Card(props: { entityID: string }) {
  let title = useFact("eav", `${props.entityID}-name`)[0];
  let content = useFact("eav", `${props.entityID}-textContent`)[0];
  return (
    <Link href={`/c/${props.entityID}`}>
      <a>
        <div className="border-2 rounded-md p-4 w-64 h-80 overflow-scroll overflow-x-hidden grid gap-2">
          <h3 className={`${!content?.value.value ? "text-4xl" : "text-xl"}`}>
            {title?.value.value}
          </h3>
          <pre className="whitespace-pre-wrap">{content?.value.value}</pre>
        </div>
      </a>
    </Link>
  );
}
