import { ComponentPage } from "./index";
export { getStaticProps, ComponentPage } from "./index";

const Buttons = () => {
  return (
    <>
      <div className="grid gap-4">
        <Button>this is a button</Button>
        <Button>this is another button</Button>
      </div>
    </>
  );
};

const Button: React.FC = (props) => {
  return (
    <button className="border-4 p-2 w-fit border-black rounded">
      {props.children}
    </button>
  );
};

export default ComponentPage(Buttons, { name: "Buttons" });
