import { jsxs, jsx } from "react/jsx-runtime";
import { c } from "react/compiler-runtime";
import { defineBehavior, effect, forward } from "@portabletext/editor/behaviors";
import { BehaviorPlugin } from "@portabletext/editor/plugins";
import { getFocusInlineObject, isSelectionCollapsed, getFocusTextBlock, getFocusSpan, getFragment, isSelectionExpanded, getSelectionStartBlock, getSelectionEndBlock, isOverlappingSelection, getFocusBlock, getSelectedBlocks, isSelectingEntireBlocks } from "@portabletext/editor/selectors";
import { getBlockEndPoint, getBlockStartPoint, isKeyedSegment } from "@portabletext/editor/utils";
import { createContext, useEffect, useContext, useSyncExternalStore } from "react";
function getDragSelection({
  eventSelection,
  snapshot
}) {
  let dragSelection = eventSelection;
  if (getFocusInlineObject({
    ...snapshot,
    context: {
      ...snapshot.context,
      selection: eventSelection
    }
  }))
    return dragSelection;
  const draggingCollapsedSelection = isSelectionCollapsed({
    ...snapshot,
    context: {
      ...snapshot.context,
      selection: eventSelection
    }
  }), draggedTextBlock = getFocusTextBlock({
    ...snapshot,
    context: {
      ...snapshot.context,
      selection: eventSelection
    }
  }), draggedSpan = getFocusSpan({
    ...snapshot,
    context: {
      ...snapshot.context,
      selection: eventSelection
    }
  });
  draggingCollapsedSelection && draggedTextBlock && draggedSpan && (dragSelection = {
    anchor: getBlockStartPoint({
      context: snapshot.context,
      block: draggedTextBlock
    }),
    focus: getBlockEndPoint({
      context: snapshot.context,
      block: draggedTextBlock
    })
  });
  const selectedBlocks = getFragment(snapshot);
  if (snapshot.context.selection && isSelectionExpanded(snapshot) && selectedBlocks.length > 1) {
    const selectionStartBlock = getSelectionStartBlock(snapshot), selectionEndBlock = getSelectionEndBlock(snapshot);
    if (!selectionStartBlock || !selectionEndBlock)
      return dragSelection;
    const selectionStartPoint = getBlockStartPoint({
      context: snapshot.context,
      block: selectionStartBlock
    }), selectionEndPoint = getBlockEndPoint({
      context: snapshot.context,
      block: selectionEndBlock
    });
    isOverlappingSelection(eventSelection)({
      ...snapshot,
      context: {
        ...snapshot.context,
        selection: {
          anchor: selectionStartPoint,
          focus: selectionEndPoint
        }
      }
    }) && (dragSelection = {
      anchor: selectionStartPoint,
      focus: selectionEndPoint
    });
  }
  return dragSelection;
}
function createDropPositionStore() {
  let current;
  const subscribers = /* @__PURE__ */ new Map();
  function notify(serializedPath) {
    if (serializedPath === void 0)
      return;
    const bucket = subscribers.get(serializedPath);
    if (bucket !== void 0)
      for (const callback of bucket)
        callback();
  }
  return {
    get: (serializedPath) => current?.serializedPath === serializedPath ? current.position : void 0,
    subscribeKey: (serializedPath, callback) => {
      let bucket = subscribers.get(serializedPath);
      return bucket === void 0 && (bucket = /* @__PURE__ */ new Set(), subscribers.set(serializedPath, bucket)), bucket.add(callback), () => {
        bucket.delete(callback), bucket.size === 0 && subscribers.delete(serializedPath);
      };
    },
    set: (next) => {
      const previous = current;
      current = next ? {
        serializedPath: serializePath(next.path),
        position: next.position
      } : void 0, !(previous?.serializedPath === current?.serializedPath && previous?.position === current?.position) && (previous?.serializedPath !== current?.serializedPath && notify(previous?.serializedPath), notify(current?.serializedPath));
    }
  };
}
function createDropPositionBehaviors(setDropPosition) {
  return [defineBehavior({
    on: "drag.dragover",
    guard: ({
      snapshot,
      event
    }) => {
      const dropFocusBlock = getFocusBlock({
        ...snapshot,
        context: {
          ...snapshot.context,
          selection: event.position.selection
        }
      });
      if (!dropFocusBlock)
        return !1;
      const dragOrigin = event.dragOrigin;
      if (!dragOrigin)
        return !1;
      const dragSelection = getDragSelection({
        eventSelection: dragOrigin.selection,
        snapshot
      });
      return getSelectedBlocks({
        ...snapshot,
        context: {
          ...snapshot.context,
          selection: dragSelection
        }
      }).some((draggedBlock) => draggedBlock.node._key === dropFocusBlock.node._key) || !isSelectingEntireBlocks({
        ...snapshot,
        context: {
          ...snapshot.context,
          selection: dragSelection
        }
      }) ? !1 : {
        dropFocusBlock
      };
    },
    actions: [({
      event
    }, {
      dropFocusBlock
    }) => [effect(() => {
      setDropPosition({
        path: dropFocusBlock.path,
        position: event.position.block
      });
    }), forward(event)]]
  }), defineBehavior({
    on: "drag.*",
    guard: ({
      event
    }) => event.type !== "drag.dragover",
    actions: [({
      event
    }) => [effect(() => {
      setDropPosition(void 0);
    }), forward(event)]]
  })];
}
const DndContext = createContext(void 0);
function DndProvider(props) {
  const $ = c(7);
  let t0;
  $[0] === /* @__PURE__ */ Symbol.for("react.memo_cache_sentinel") ? (t0 = createDropPositionStore(), $[0] = t0) : t0 = $[0];
  const store = t0;
  let t1;
  $[1] === /* @__PURE__ */ Symbol.for("react.memo_cache_sentinel") ? (t1 = createDropPositionBehaviors(store.set), $[1] = t1) : t1 = $[1];
  const behaviors = t1;
  let t2, t3;
  $[2] === /* @__PURE__ */ Symbol.for("react.memo_cache_sentinel") ? (t2 = () => () => {
    store.set(void 0);
  }, t3 = [store], $[2] = t2, $[3] = t3) : (t2 = $[2], t3 = $[3]), useEffect(t2, t3);
  let t4;
  $[4] === /* @__PURE__ */ Symbol.for("react.memo_cache_sentinel") ? (t4 = /* @__PURE__ */ jsx(BehaviorPlugin, { behaviors }), $[4] = t4) : t4 = $[4];
  let t5;
  return $[5] !== props.children ? (t5 = /* @__PURE__ */ jsxs(DndContext.Provider, { value: store, children: [
    t4,
    props.children
  ] }), $[5] = props.children, $[6] = t5) : t5 = $[6], t5;
}
function useDropPosition(path) {
  const $ = c(8), store = useContext(DndContext);
  if (store === void 0)
    throw new Error("useDropPosition must be used below a <DndProvider>");
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
function serializePath(path) {
  return path.reduce((result, segment, index) => isKeyedSegment(segment) ? `${result}[_key=="${segment._key}"]` : `${result}${index === 0 ? "" : "."}${segment}`, "");
}
export {
  DndProvider,
  useDropPosition
};
//# sourceMappingURL=index.js.map
