import { useFact } from "../useReplicache";
import Link from "next/link";

export function Card(props: { entityID: string }) {
  let title = useFact("eav", `${props.entityID}-name`)[0];
  let content = useFact("eav", `${props.entityID}-textContent`)[0];
  return (
    <Link href={`/c/${props.entityID}`}>
      <a>
        <div className="border-2 rounded-md p-4 max-w-md">
          <h3 className="text-xl">{title?.value.value}</h3>
          {content?.value.value}
        </div>
      </a>
    </Link>
  );
}
