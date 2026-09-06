//#region node_modules/refractor/lang/json.js
/**
* @import {Refractor} from '../lib/core.js'
*/
json.displayName = "json";
json.aliases = ["webmanifest"];
/** @param {Refractor} Prism */
function json(Prism) {
	Prism.languages.json = {
		property: {
			pattern: /(^|[^\\])"(?:\\.|[^\\"\r\n])*"(?=\s*:)/,
			lookbehind: true,
			greedy: true
		},
		string: {
			pattern: /(^|[^\\])"(?:\\.|[^\\"\r\n])*"(?!\s*:)/,
			lookbehind: true,
			greedy: true
		},
		comment: {
			pattern: /\/\/.*|\/\*[\s\S]*?(?:\*\/|$)/,
			greedy: true
		},
		number: /-?\b\d+(?:\.\d+)?(?:e[+-]?\d+)?\b/i,
		punctuation: /[{}[\],]/,
		operator: /:/,
		boolean: /\b(?:false|true)\b/,
		null: {
			pattern: /\bnull\b/,
			alias: "keyword"
		}
	};
	Prism.languages.webmanifest = Prism.languages.json;
}
//#endregion
export { json as default };
