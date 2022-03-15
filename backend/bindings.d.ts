interface Bindings {
  ACTIVITY: DurableObjectNamespace;
  usernames_to_studios: KVNamespace;
}

declare global {
  function getMiniflareBindings(): Bindings;
  function getMiniflareDurableObjectStorage(
    id: DurableObjectId
  ): Promise<DurableObjectStorage>;
}

export { Bindings };
