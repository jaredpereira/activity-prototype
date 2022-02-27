import { useFact } from "../useReplicache";
import Link from "next/link";

export function Card(props: { href: string; entityID: string }) {
  let title = useFact("eav", `${props.entityID}-name`)[0];
  let content = useFact("eav", `${props.entityID}-textContent`)[0];
  return (
    <Link href={props.href}>
      <a>
        <div className="border-[1] border-grey-80 shadow-drop rounded-md p-2 w-36 h-24 overflow-y-auto overflow-x-hidden grid gap-2">
          <h3 className={"text-sm uppercase font-bold"}>
            {title?.value.value}
          </h3>
          <pre className="whitespace-pre-wrap">{content?.value.value}</pre>
        </div>
      </a>
    </Link>
  );
}
