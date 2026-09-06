# @sanity/lezer-groq

[Lezer](https://lezer.codemirror.net/) grammar for [GROQ](https://www.sanity.io/docs/groq), providing syntax highlighting, folding, and indentation for [CodeMirror 6](https://codemirror.net/).

## Install

```bash
npm install @sanity/lezer-groq
```

## Usage with CodeMirror

```ts
import {EditorView, basicSetup} from 'codemirror'
import {groq} from '@sanity/lezer-groq'

new EditorView({
  extensions: [basicSetup, groq()],
  parent: document.body,
})
```

## Exports

- `groq()` - returns a `LanguageSupport` instance with the GROQ parser, highlight tags, folding, and indentation configured
- `groqLanguage` - the raw `LRLanguage` instance for advanced configuration
- `parser` - the Lezer `LRParser` for direct access to the parse tables

## What's in the box

The Lezer grammar is an incremental LR parser that handles the full GROQ expression language:

- Filters, projections, pipes, dereferences, dot access, array traversal
- All operators with correct precedence (pipe, logical, comparison, arithmetic, exponentiation)
- Function calls and namespaced function calls (`math::sum()`, `pt::text()`)
- String literals with escape sequence highlighting
- Keyword specialization (`true`, `false`, `null`, `in`, `match`, `asc`, `desc`)
- Code folding for filters, projections, arrays, and objects
- Auto-indentation and bracket closing

## Build

The grammar source is `src/groq.grammar`. To regenerate the parser after editing:

```bash
pnpm build  # runs lezer-generator + rollup
```

## License

MIT
