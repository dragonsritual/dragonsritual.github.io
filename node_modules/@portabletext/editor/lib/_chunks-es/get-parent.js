import { isTextBlock } from "@portabletext/schema";
function isKeyedSegment(segment) {
  return typeof segment == "object" && segment !== null && "_key" in segment;
}
function serializePath(path) {
  return path.reduce((result, segment, index) => isKeyedSegment(segment) ? `${result}[_key=="${segment._key}"]` : `${result}${index === 0 ? "" : "."}${segment}`, "");
}
function isTypedObject(object) {
  return isRecord(object) && typeof object._type == "string";
}
function isRecord(value) {
  return !!value && (typeof value == "object" || typeof value == "function");
}
function getContainerChildren(containers, node, parent) {
  const resolved = resolveNodeContainer(containers, parent, node);
  if (!resolved)
    return;
  const fieldValue = node[resolved.field.name];
  if (Array.isArray(fieldValue))
    return {
      children: fieldValue,
      container: resolved
    };
}
function resolveNodeContainer(containers, parent, node) {
  if (parent?.of) {
    for (const entry of parent.of)
      if (entry.type === node._type)
        return "field" in entry ? entry : void 0;
  }
  return containers.get(node._type);
}
function getChildren(snapshot, path) {
  let currentChildren = snapshot.context.value, currentFieldName = "value", currentPath = [], isRoot = !0, currentParent;
  for (const segment of path) {
    if (typeof segment == "string")
      continue;
    let node;
    if (isKeyedSegment(segment)) {
      const candidatePath = isRoot ? [{
        _key: segment._key
      }] : [...currentPath, currentFieldName, {
        _key: segment._key
      }], index = snapshot.blockIndexMap.get(serializePath(candidatePath));
      node = index !== void 0 && currentChildren[index]?._key === segment._key ? currentChildren[index] : currentChildren.find((child) => child._key === segment._key);
    } else typeof segment == "number" && (node = currentChildren.at(segment));
    if (!node)
      return [];
    currentPath = isRoot ? [{
      _key: node._key
    }] : [...currentPath, currentFieldName, {
      _key: node._key
    }], isRoot = !1;
    const next = getNodeChildren(snapshot.context, node, currentParent);
    if (!next)
      return [];
    currentChildren = next.children, currentFieldName = next.fieldName, currentParent = next.parent;
  }
  return currentChildren.map((child) => ({
    node: child,
    path: isRoot ? [{
      _key: child._key
    }] : [...currentPath, currentFieldName, {
      _key: child._key
    }]
  }));
}
function getNodeChildren(context, node, parent) {
  if (isTextBlock(context, node))
    return {
      children: node.children,
      fieldName: "children",
      parent: void 0
    };
  if (isTypedObject(node)) {
    const result = getContainerChildren(context.containers, node, parent);
    if (result)
      return {
        children: result.children,
        fieldName: result.container.field.name,
        parent: result.container
      };
  }
  if ("value" in node && Array.isArray(node.value) && !("_key" in node) && !("_type" in node))
    return {
      children: node.value,
      fieldName: "value",
      parent: void 0
    };
}
function getNode(snapshot, path) {
  if (path.length === 0)
    return;
  const {
    context,
    blockIndexMap
  } = snapshot;
  let currentChildren = context.value, currentFieldName, node, currentParent;
  const resolvedPath = [];
  for (let i = 0; i < path.length; i++) {
    const segment = path[i];
    if (typeof segment == "string") {
      if (currentFieldName !== void 0 && segment === currentFieldName) {
        resolvedPath.push(segment);
        continue;
      }
      for (let j = i + 1; j < path.length; j++) {
        const s = path[j];
        if (isKeyedSegment(s) || typeof s == "number")
          return;
      }
      break;
    }
    if (isKeyedSegment(segment)) {
      resolvedPath.push(segment);
      const index = blockIndexMap.get(serializePath(resolvedPath));
      index !== void 0 && currentChildren[index]?._key === segment._key ? node = currentChildren[index] : (node = currentChildren.find((child) => child._key === segment._key), node && node._key !== void 0 && (resolvedPath[resolvedPath.length - 1] = {
        _key: node._key
      }));
    } else if (typeof segment == "number")
      node = currentChildren.at(segment), node && resolvedPath.push({
        _key: node._key
      });
    else
      return;
    if (!node)
      return;
    let hasMoreSegments = !1;
    for (let j = i + 1; j < path.length; j++) {
      const s = path[j];
      if (isKeyedSegment(s) || typeof s == "number") {
        hasMoreSegments = !0;
        break;
      }
    }
    if (hasMoreSegments) {
      const next = getNodeChildren(context, node, currentParent);
      if (!next)
        return;
      currentChildren = next.children, currentFieldName = next.fieldName, currentParent = next.parent;
    } else
      currentFieldName = void 0;
  }
  if (node) {
    for (; resolvedPath.length > 0 && typeof resolvedPath[resolvedPath.length - 1] == "string"; )
      resolvedPath.pop();
    return {
      node,
      path: resolvedPath
    };
  }
}
function parentPath(path) {
  if (path.length === 0)
    throw new Error(`Cannot get the parent path of the root path [${path}].`);
  let lastNodeIndex = -1;
  for (let i = path.length - 1; i >= 0; i--)
    if (isKeyedSegment(path[i]) || typeof path[i] == "number") {
      lastNodeIndex = i;
      break;
    }
  if (lastNodeIndex === -1)
    return [];
  const result = path.slice(0, lastNodeIndex);
  return result.length > 0 && typeof result[result.length - 1] == "string" ? result.slice(0, -1) : result;
}
function getParent(snapshot, path, options) {
  if (path.length === 0)
    return;
  const parent = parentPath(path);
  if (parent.length === 0)
    return;
  const entry = getNode(snapshot, parent);
  if (!entry)
    return;
  const result = {
    node: entry.node,
    path: entry.path
  };
  if (!(options?.match && !options.match(result.node, result.path)))
    return result;
}
export {
  getChildren,
  getContainerChildren,
  getNode,
  getNodeChildren,
  getParent,
  isKeyedSegment,
  isRecord,
  isTypedObject,
  parentPath,
  serializePath
};
//# sourceMappingURL=get-parent.js.map
