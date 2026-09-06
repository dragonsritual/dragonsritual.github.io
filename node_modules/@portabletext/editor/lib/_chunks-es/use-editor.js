import React, { createContext } from "react";
function createGloballyScopedContext(key, defaultValue) {
  const symbol = Symbol.for(key);
  if (typeof document > "u")
    return createContext(defaultValue);
  const scope = globalThis;
  return scope[symbol] = scope[symbol] ?? createContext(defaultValue), scope[symbol];
}
const EditorContext = createGloballyScopedContext("@portabletext/editor/context/editor", null);
function useEditor() {
  const editor = React.useContext(EditorContext);
  if (!editor)
    throw new Error("No Editor set. Use EditorProvider to set one.");
  return editor;
}
export {
  EditorContext,
  useEditor
};
//# sourceMappingURL=use-editor.js.map
