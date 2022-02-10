import { InferGetStaticPropsType } from "next";
import Link from "next/link";
import path from "path";
import fs from "fs/promises";

type Props = InferGetStaticPropsType<typeof getStaticProps>;

type Metadata = {
  name: string;
};

export const ComponentPage = (Child: React.ComponentType, meta: Metadata) => {
  const Component = (props: Props) => {
    return (
      <>
        <h1 className="text-4xl">Component Library</h1>
        <div style={{ display: "grid", gridTemplateColumns: "200px auto" }}>
          <ul>
            {props.components.map((c) => {
              return (
                <li key={c.path}>
                  <Link href={c.path}>
                    <a>{c.metadata.name}</a>
                  </Link>
                </li>
              );
            })}
          </ul>
          <div>
            <Child />
          </div>
        </div>
      </>
    );
  };
  Component.metadata = meta;
  return Component;
};

const IndexPage = () => {
  return <div>hello</div>;
};

export default ComponentPage(IndexPage, { name: "Home" });

export async function getStaticProps() {
  let componentLibraryPath = path.join(
    process.cwd(),
    "/pages/development/library"
  );
  let componentFiles = await fs.readdir(componentLibraryPath);
  let components = await Promise.all(
    componentFiles.map(async (c) => {
      let component = await import("./" + c);
      console.log(component);
      return {
        path: `/development/library/${
          c === "index.tsx" ? "" : c.split(".")[0]
        }`,
        metadata: component.default.metadata as Metadata,
      };
    })
  );
  return { props: { components } };
}
