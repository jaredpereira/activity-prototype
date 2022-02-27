import React, { useState } from "react";
import { useFact } from "src/useReplicache";
import { AddCardButton } from "src/components/Section";
import { Combobox, RadioGroup } from "@headlessui/react";
import Textarea from "./AutosizeTextarea";

export const AddSection = (props: {
  createNewSection: (args: {
    name: string;
    type: "cards" | "text";
    initialValue: string;
  }) => void;
}) => {
  let [state, setState] = useState({
    name: "",
    type: "text" as "text" | "cards",
  });
  const sectionNames = useFact("ave", "name");
  const sectionTypes = useFact("aev", "type");
  let sections = sectionNames.reduce((acc, name) => {
    let type = sectionTypes.find((f) => f.entity === name.entity);
    if (type)
      acc[name.value.value as string] = { type: type.value.value as string };
    return acc;
  }, {} as { [k: string]: { type: string } });

  return (
    <div>
      <div className="">
        <SectionNameSelector
          selectedName={state.name}
          sections={Object.keys(sections)}
          onChange={(e) => {
            let type: "cards" | "text" | undefined;
            if (sections[e]) {
              if (sections[e].type === "reference") type = "cards";
              else type = "text";
            }
            setState({ ...state, name: e, type: type || state.type });
          }}
        />
        <TypeSelector
          disabled={!!sections[state.name]}
          type={state.type}
          setType={(t) => setState({ ...state, type: t })}
        />
      </div>

      {!state.name ? null : state.type === "cards" ? (
        <AddCardButton
          onAdd={(id) => {
            setState({ name: "", type: "text" });
            props.createNewSection({
              type: state.type,
              name: state.name,
              initialValue: id,
            });
          }}
        />
      ) : (
        <input
          className="w-full"
          onChange={(e) => {
            setState({ name: "", type: "text" });
            props.createNewSection({
              type: state.type,
              name: state.name,
              initialValue: e.currentTarget.value,
            });
          }}
        />
      )}
    </div>
  );
};

const SectionNameSelector = (props: {
  selectedName: string;
  sections: string[];
  onChange: (s: string) => void;
}) => {
  const [query, setQuery] = useState("");
  const filteredSections =
    query === ""
      ? props.sections
      : props.sections.filter((section) => {
        return section.toLowerCase().includes(query.toLowerCase());
      });
  if (!filteredSections.includes(query)) filteredSections.push(query);

  return (
    <div>
      <Combobox value={props.selectedName} onChange={props.onChange}>
        <Combobox.Input
          as={Textarea}
          className="text-xl"
          placeholder="New Section"
          onChange={(event) => setQuery(event.target.value)}
        />
        <Combobox.Options className="bg-white p-2 border-2">
          {filteredSections.map((section) => (
            <Combobox.Option key={section} value={section}>
              {({ active }) => (
                <span
                  className={`${active ? "bg-blue-500 text-white" : "bg-white text-black"
                    }`}
                >
                  {section}
                </span>
              )}
            </Combobox.Option>
          ))}
        </Combobox.Options>
      </Combobox>
    </div>
  );
};

const TypeSelector = (props: {
  type: "text" | "cards";
  setType: (s: "text" | "cards") => void;
  disabled: boolean;
}) => {
  return (
    <RadioGroup
      className="grid grid-flow-col auto-cols-min gap-2"
      value={props.type}
      disabled={props.disabled}
      onChange={(e) => props.setType(e)}
    >
      <RadioGroup.Option value="cards">
        {({ checked }) => (
          <>
            <span
              className={`${checked ? "underline " : ""} w-4 h-4 rounded-full`}
            >
              cards
            </span>
          </>
        )}
      </RadioGroup.Option>
      <RadioGroup.Option value="text">
        {({ checked }) => (
          <>
            <span
              className={`${checked ? "underline" : ""} w-4 h-4 rounded-full`}
            >
              text
            </span>
          </>
        )}
      </RadioGroup.Option>
    </RadioGroup>
  );
};
