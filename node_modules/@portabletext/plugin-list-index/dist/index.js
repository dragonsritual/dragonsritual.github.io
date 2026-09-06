import { jsx } from "react/jsx-runtime";
import { c } from "react/compiler-runtime";
import { useEditor } from "@portabletext/editor";
import { createContext, useEffect, useContext, useSyncExternalStore } from "react";
import { getContainerChildren } from "@portabletext/editor/traversal";
import { isKeyedSegment, isTextBlock } from "@portabletext/editor/utils";
function serializePath(path) {
  return path.reduce((result, segment, index) => isKeyedSegment(segment) ? `${result}[_key=="${segment._key}"]` : `${result}${index === 0 ? "" : "."}${segment}`, "");
}
function buildListIndexMap(context) {
  const listIndexMap = /* @__PURE__ */ new Map(), traversalContext = {
    schema: context.schema,
    containers: context.containers ?? /* @__PURE__ */ new Map()
  };
  return collectListIndexes(traversalContext, context.value, [], void 0, listIndexMap), listIndexMap;
}
function collectListIndexes(context, blocks, basePath, parent, listIndexMap) {
  const levelIndexMaps = /* @__PURE__ */ new Map();
  let previousListItem;
  for (const block of blocks) {
    if (block === void 0 || block._key === void 0)
      continue;
    const blockPath = [...basePath, {
      _key: block._key
    }];
    if (!isTextBlock(context, block) || block.listItem === void 0 || block.level === void 0) {
      levelIndexMaps.clear(), previousListItem = void 0;
      const childResult = getContainerChildren(context.containers, block, parent);
      childResult && collectListIndexes(context, childResult.children, [...blockPath, childResult.container.field.name], childResult.container, listIndexMap);
      continue;
    }
    if (!previousListItem) {
      const levelIndexMap2 = levelIndexMaps.get(block.listItem) ?? /* @__PURE__ */ new Map();
      levelIndexMap2.set(block.level, 1), levelIndexMaps.set(block.listItem, levelIndexMap2), listIndexMap.set(serializePath(blockPath), 1), previousListItem = {
        listItem: block.listItem,
        level: block.level
      };
      continue;
    }
    if (previousListItem.listItem === block.listItem && previousListItem.level < block.level) {
      const levelIndexMap2 = levelIndexMaps.get(block.listItem) ?? /* @__PURE__ */ new Map();
      levelIndexMap2.set(block.level, 1), levelIndexMaps.set(block.listItem, levelIndexMap2), listIndexMap.set(serializePath(blockPath), 1), previousListItem = {
        listItem: block.listItem,
        level: block.level
      };
      continue;
    }
    levelIndexMaps.forEach((levelIndexMap2, listItem) => {
      if (listItem === block.listItem)
        return;
      const levelsToDelete = [];
      levelIndexMap2.forEach((_, level) => {
        block.level !== void 0 && level >= block.level && levelsToDelete.push(level);
      }), levelsToDelete.forEach((level) => {
        levelIndexMap2.delete(level);
      });
    });
    const levelIndexMap = levelIndexMaps.get(block.listItem) ?? /* @__PURE__ */ new Map(), levelCounter = levelIndexMap.get(block.level) ?? 0;
    levelIndexMap.set(block.level, levelCounter + 1), levelIndexMaps.set(block.listItem, levelIndexMap), listIndexMap.set(serializePath(blockPath), levelCounter + 1), previousListItem = {
      listItem: block.listItem,
      level: block.level
    };
  }
}
function createListIndexStore(editor) {
  let listIndexMap = buildListIndexMap(editor.getSnapshot().context);
  const subscribers = /* @__PURE__ */ new Map();
  function rebuild() {
    const previousListIndexMap = listIndexMap;
    listIndexMap = buildListIndexMap(editor.getSnapshot().context);
    for (const [serializedPath, callbacks] of subscribers)
      if (previousListIndexMap.get(serializedPath) !== listIndexMap.get(serializedPath))
        for (const callback of callbacks)
          callback();
  }
  return {
    get: (serializedPath) => listIndexMap.get(serializedPath),
    subscribeKey: (serializedPath, callback) => {
      let bucket = subscribers.get(serializedPath);
      return bucket === void 0 && (bucket = /* @__PURE__ */ new Set(), subscribers.set(serializedPath, bucket)), bucket.add(callback), () => {
        bucket.delete(callback), bucket.size === 0 && subscribers.delete(serializedPath);
      };
    },
    subscribe: () => {
      rebuild();
      const subscription = editor.on("operation", (events) => {
        events.some((event) => event.operation.type !== "insert.text" && event.operation.type !== "remove.text") && rebuild();
      }, {
        batch: !0
      });
      return () => {
        subscription.unsubscribe();
      };
    }
  };
}
const ListIndexContext = createContext(void 0);
function ListIndexProvider(props) {
  const $ = c(8), editor = useEditor();
  let t0;
  $[0] !== editor ? (t0 = createListIndexStore(editor), $[0] = editor, $[1] = t0) : t0 = $[1];
  const store = t0;
  let t1, t2;
  $[2] !== store ? (t1 = () => store.subscribe(), t2 = [store], $[2] = store, $[3] = t1, $[4] = t2) : (t1 = $[3], t2 = $[4]), useEffect(t1, t2);
  let t3;
  return $[5] !== props.children || $[6] !== store ? (t3 = /* @__PURE__ */ jsx(ListIndexContext.Provider, { value: store, children: props.children }), $[5] = props.children, $[6] = store, $[7] = t3) : t3 = $[7], t3;
}
function useListIndex(path) {
  const $ = c(8), store = useContext(ListIndexContext);
  if (store === void 0)
    throw new Error("useListIndex must be used below a <ListIndexProvider>");
  let t0;
  $[0] !== path ? (t0 = serializePath(path), $[0] = path, $[1] = t0) : t0 = $[1];
  const serializedPath = t0;
  let t1;
  $[2] !== serializedPath || $[3] !== store ? (t1 = (callback) => store.subscribeKey(serializedPath, callback), $[2] = serializedPath, $[3] = store, $[4] = t1) : t1 = $[4];
  const subscribe = t1;
  let t2;
  $[5] !== serializedPath || $[6] !== store ? (t2 = () => store.get(serializedPath), $[5] = serializedPath, $[6] = store, $[7] = t2) : t2 = $[7];
  const getSnapshot = t2;
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
export {
  ListIndexProvider,
  useListIndex
};
//# sourceMappingURL=index.js.map
