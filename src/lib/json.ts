export type JsonValue =
  | string
  | number
  | boolean
  | null
  | { [key: string]: JsonValue }
  | JsonValue[];

export type JsonValueNonNull = Exclude<JsonValue, null>;
