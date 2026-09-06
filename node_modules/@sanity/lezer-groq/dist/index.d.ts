import type {LRParser} from '@lezer/lr'
import type {LRLanguage, LanguageSupport} from '@codemirror/language'

export declare const parser: LRParser
export declare const groqLanguage: LRLanguage
export declare function groq(): LanguageSupport
