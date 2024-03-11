import { isObject } from "./utils.js";
import { StringToPath, stringToPath } from "./string-to-path.js";
import { AnyArray, AnyObject, Sequence, IsNumericKey } from "./types.js";
import { SetTuple, GetArrayValue, IsTuple } from "./tuple.js";

// `StringPath` doesn't get distributed inside `Set_`, do it manually here
export type Set<
  Obj extends AnyObject,
  StringPath extends string,
  Value
> = StringPath extends unknown
  ? Set_<Obj, StringToPath<StringPath>, Value>
  : never;

type Set_<
  Obj extends AnyObject,
  Path extends string[],
  Value,
  Index extends number = 0
> = {
  0: Obj extends AnyArray
    ? SetArray<Obj, Path, Value, Index>
    : {
        // writing this type inline because
        // ts preserves type aliases in unions since 4.2
        [K in keyof Obj | Path[Index]]: K extends Path[Index]
          ? Set_<
              GetNextObject<Obj[K], Path[Sequence[Index]]>,
              Path,
              Value,
              Sequence[Index]
            >
          : Obj[K];
      };
  1: Path["length"] extends 0 ? Obj : Value;
}[Index extends Path["length"] ? 1 : 0];

type SetArray<
  Arr extends AnyArray,
  Path extends string[],
  Value,
  Index extends number
> = IsNumericKey<Path[Index]> extends false
  ? // if object is an array but the key isn't numeric create and intersection type with object
    Arr & Set_<{}, Path, Value, Index>
  : IsTuple<Arr> extends false
  ? (
      | GetArrayValue<Arr>
      | Set_<
          GetNextObject<GetArrayValue<Arr>, Path[Sequence[Index]]>,
          Path,
          Value,
          Sequence[Index]
        >
    )[]
  : SetTuple<
      Arr,
      Path[Index],
      Set_<
        GetNextObject<Arr[Path[Index]], Path[Sequence[Index]]>,
        Path,
        Value,
        Sequence[Index]
      >
    >;

type GetNextObject<Value, NextKey extends string> = [Value] extends [never]
  ? DefaultObject<NextKey>
  : Value extends AnyObject
  ? Value
  : DefaultObject<NextKey>;

type DefaultObject<Key extends string> = IsNumericKey<Key> extends true
  ? []
  : {};

interface SetFunction {
  <Obj extends AnyObject, Path extends string, Value>(
    object: Obj,
    path: Path,
    value: Value
  ): Set<Obj, Path, Value>;
}

export const set: SetFunction = (object, stringPath, value) => {
  let index = -1;
  const path = stringToPath(stringPath);
  const lastIndex = path.length - 1;
  let currentObject: AnyObject = object;

  while (++index <= lastIndex) {
    const key = path[index]!;
    let newValue: unknown = value;

    if (index !== lastIndex) {
      const objValue = object[key]!;
      newValue = isObject(objValue)
        ? objValue
        : !isNaN(+path[index + 1]!)
        ? []
        : {};
    }
    currentObject[key] = newValue;
    currentObject = currentObject[key];
  }
  return object as any;
};

export declare type SetMany<
  Obj extends AnyObject,
  StringPaths extends string[],
  Values extends any[],
  Index extends number = 0
> = {
  0: StringPaths extends unknown
    ? SetMany<
        SetMany<Obj, StringPaths, Values>,
        StringPaths,
        Values,
        Sequence[Index]
      >
    : never;
  1: Obj;
}[Index extends StringPaths["length"] ? 1 : 0];

interface SetManyFunction {
  <Obj extends AnyObject, StringPaths extends string[], Values extends any[]>(
    object: Obj,
    paths: StringPaths,
    values: Values
  ): SetMany<Obj, StringPaths, Values>;
}

export const setMany: SetManyFunction = (obj, paths, values) => {
  let result = { ...obj };
  for (let i = 0; i < paths.length; i++) {
    result = set(result, paths[i], values[i]);
  }
  return result as SetMany<typeof obj, typeof paths, typeof values>;
};

type ObjType = { a: { b: 2; foo: { bar: "baz" } }; c: { d: 4 }; e: { f: 6 } };

type UpdatedManyObj = SetMany<
  ObjType,
  ["a.b", "c.d", "e.f", "a.foo.bar"],
  [3, 5, 7, 1000]
>;
