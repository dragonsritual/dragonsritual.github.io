import { LRParser, LocalTokenGroup } from '@lezer/lr';
import { styleTags, tags } from '@lezer/highlight';
import { LRLanguage, indentNodeProp, continuedIndent, foldNodeProp, foldInside, LanguageSupport } from '@codemirror/language';

const groqHighlighting = styleTags({
  "True False": tags.bool,
  Null: tags.null,
  "String/...": tags.string,
  "DoubleString/...": tags.string,
  "SingleString/...": tags.string,
  StringEscape: tags.escape,
  Number: tags.number,
  LineComment: tags.lineComment,
  Identifier: tags.propertyName,
  "PropertyPair/Identifier": tags.propertyName,
  "DotAccess/Identifier": tags.propertyName,
  "DerefAccess/Identifier": tags.propertyName,
  "FunctionName/Identifier": tags.function(tags.variableName),
  "Namespace/Identifier": tags.namespace,
  NamespaceSep: tags.punctuation,
  Parameter: tags.special(tags.variableName),
  Everything: tags.atom,
  "This Parent": tags.self,
  "CompareOp EqualityOp": tags.compareOperator,
  "AddOp MulOp Exp": tags.arithmeticOperator,
  "And Or Not": tags.logicOperator,
  "In Match Asc Desc": tags.operatorKeyword,
  Pipe: tags.controlOperator,
  Arrow: tags.definitionOperator,
  Deref: tags.derefOperator,
  "Ellipsis InclusiveRange": tags.operator,
  '","  ":"': tags.separator,
  '"(" ")"': tags.paren,
  '"[" "]"': tags.squareBracket,
  '"{" "}"': tags.brace,
  '"."': tags.derefOperator
});

const spec_Identifier = { __proto__: null, fn: 12, true: 56, false: 58, null: 60, in: 64, match: 68, asc: 72, desc: 76 };
const parser = LRParser.deserialize({
  version: 14,
  states: "9[OYQPOOOOQO'#C`'#C`OOQO'#Cm'#CmO!mOSO'#CqO!xOWO'#CtOOQO'#Cp'#CpOOQO'#C{'#C{OOQO'#C}'#C}OOQO'#DP'#DPOOQO'#DR'#DRO$qQPO'#DUO%RQPO'#DTO%WQPO'#DWO&pQPO'#D[O([QPO'#DaO(cQPO'#DdOOQO'#Ek'#EkO*XQPO'#EjO+kQPO'#EiOOQO'#Ei'#EiO,xQPO'#EhO.YQPO'#EgO/gQPO'#EfO0nQPO'#EeO1rQPO'#EdO(cQPO'#EcOOQO'#Ec'#EcO2pQPO'#EbO3bQPO'#EaO4PQPO'#E`O4kQPO'#E_O5SQPO'#C_O5XQPO'#DzOYQPOOQOQPOOOOOO'#D|'#D|O5^OSO,59]OOQO,59],59]OOOO'#D}'#D}O5iOWO,59`OOQO,59`,59`O5tQPO,59oO5yQPO,59rO6QQPO'#D]OOQO'#Es'#EsO6_QPO'#ErOOQO,59v,59vO6gQPO,59vO6lQPO'#DUO6sQPO'#EkOOQO'#Eu'#EuO8^QPO'#EtOOQO,59{,59{O8fQPO,59{O8kQPO,5:OO8sQPO'#DeO8zQPO'#DiO9YQPO'#DhO9aQPO'#DlOOQO'#Ev'#EvOOQO'#ER'#ERO;WQPO,5;UOOQO,5;T,5;TO+kQPO'#ESO<jQPO,5;SOOQO'#Dq'#DqO+kQPO'#ETO=zQPO,5;RO+kQPO'#EUO?XQPO,5;QOOQO'#Ew'#EwO+kQPO,5;PO+kQPO,5;OOOQO,5:},5:}O(cQPO'#EVO@`QPO,5:|O(cQPO'#EWOAQQPO,5:{O(cQPO'#EXOAoQPO,5:zO(cQPO'#EYOBZQPO,5:yOBrQPO'#CcOBzQPO,58yOCPQPO,58yOOQO,5:f,5:fOOQO-E7x-E7xOOOO-E7z-E7zOOQO1G.w1G.wOOOO-E7{-E7{OOQO1G.z1G.zOOQO'#DV'#DVOCUQPO1G/ZOCZQPO'#EqOOQO1G/^1G/^OCcQPO1G/^OOQO,59w,59wOChQPO,5;^OCoQPO,5;^OOQO1G/b1G/bO(cQPO,59|OCwQPO,5;`ODOQPO,5;`OOQO1G/g1G/gO(cQPO'#EOODWQPO1G/jOOQO1G/j1G/jOOQO,5:P,5:POD`QPO,5:RODeQPO,5:POOQO,5:T,5:TOOQO,5:U,5:UO(cQPO,5:VOOQO,5:S,5:SODlQPO,5:SOOQO,5:Y,5:YOOQO-E8P-E8POOQO,5:n,5:nOOQO-E8Q-E8QOOQO,5:o,5:oOOQO-E8R-E8ROOQO,5:p,5:pOOQO-E8S-E8SOOQO1G0k1G0kOOQO1G0j1G0jOOQO,5:q,5:qOOQO-E8T-E8TOOQO,5:r,5:rOOQO-E8U-E8UOOQO,5:s,5:sOOQO-E8V-E8VOOQO,5:t,5:tOOQO-E8W-E8WODqQPO1G.eODyQPO1G.eOEOQPO7+$uOEVQPO,5;]OE^QPO,5;]OOQO7+$x7+$xOOQO,5:k,5:kOEfQPO1G0xOOQO-E7}-E7}OOQO1G/h1G/hOOQO,5:l,5:lOEmQPO1G0zOOQO-E8O-E8OOOQO,5:j,5:jOOQO-E7|-E7|OOQO7+%U7+%UOOQO1G/m1G/mOOQO1G/k1G/kOEtQPO1G/mOEyQPO1G/qOOQO1G/n1G/nOFOQPO'#E^OFWQQO7+$POF]QPO7+$POOQO'#Ce'#CeOFbQPO7+$POOQO<<Ha<<HaOFgQPO<<HaOFlQPO1G0wP%]QPO'#EPP&wQPO'#EQOOQO7+%X7+%XOOQO7+%]7+%]OFsQPO,5:xOF{QPO,5:xO(cQPO<<GkOGTQQO<<GkOGYQPO<<GkOOQOAN={AN={OOQO,5:g,5:gOGbQPO1G0dOOQO-E7y-E7yOOQOAN=VAN=VO(cQPOAN=VOGjQQOAN=VOGoQPOAN=VPGtQPO'#D{OOQOG22qG22qO(cQPOG22qOGyQQOG22qOOQOLD(]LD(]O(cQPOLD(]OOQO!$'Kw!$'Kw",
  stateData: "Ha~O#POSPOS~OTYOUPOY_OZ`O_iO`bOb`Oc`Ok`Ol`Om`On`OpUOrVOtWOvXO}]O!S^O#`QO#aRO#cSO~OfsOguO#bsO~OivOjxO#dvO~OWxXY{X`#_Xp#_Xr#_Xt#_Xv#_X}#_X!Q#_X!S#_X!Y#_X!a#_X!c#_X!d#_X!f#_X!g#_X!h#_X!i#_X!j#_X!k#_X!l#_X#`#_X[#_X!R#_X~O!}#_X|#_X]#_X!m#_X~P#TOWyO~OYzO~OTYOY_OZ`O_iO`bOb`Oc`Ok`Ol`Om`On`OpUOrVOtWOvXO}]O!Q{O!S^O#`QO#aRO#cSO~O|!OO~P%]OT!QOY_OZ`O_iO`bOb`Oc`Ok`Ol`Om`On`OpUOrVOtWOvXO}]O!Q{O!S^O#`QO#aRO#cSO~O!R!UO~P&wOTYOY_OZ`O_iO`bOb`Oc`Ok`Ol`Om`On`OpUOrVOtWOvXO}]O!S^O#`QO#aRO#cSO~OtWOvXO}!XO!S!ZO!Y!YO!a![O~O`#^Xp#^Xr#^X!Q#^X!c#^X!d#^X!f#^X!g#^X!h#^X!i#^X!j#^X!k#^X!l#^X!}#^X#`#^X[#^X|#^X!R#^X]#^X!m#^X~P)sOTYOY_OZ`O`bOb`Oc`Ok`Ol`Om`On`OpUOrVOtWOvXO}]O!S^O#`QO#aRO#cSO~O!c!aO`#[Xp#[Xr#[X!Q#[X!d#[X!f#[X!g#[X!h#[X!i#[X!j#[X!k#[X!l#[X!}#[X#`#[X[#[X|#[X!R#[X]#[X!m#[X~O!d!dO#`!cO`#ZXp#ZXr#ZX!Q#ZX!f#ZX!g#ZX!h#ZX!i#ZX!j#ZX!k#ZX!l#ZX!}#ZX[#ZX|#ZX!R#ZX]#ZX!m#ZX~O`!fOp#YXr#YX!Q#YX!f#YX!g#YX!h#YX!i#YX!j#YX!k#YX!l#YX!}#YX[#YX|#YX!R#YX]#YX!m#YX~O!Q!hO!f!hOp#XXr#XX!g#XX!h#XX!i#XX!j#XX!k#XX!l#XX!}#XX[#XX|#XX!R#XX]#XX!m#XX~OpUOrVO!g!jO!h!jO!i#WX!j#WX!k#WX!l#WX!}#WX[#WX|#WX!R#WX]#WX!m#WX~O!i!lO!j#UX!k#UX!l#UX!}#UX[#UX|#UX!R#UX]#UX!m#UX~O!j!nO!k#TX!l#TX!}#TX[#TX|#TX!R#TX]#TX!m#TX~O!k!pO!l#SX!}#SX[#SX|#SX!R#SX]#SX!m#SX~O!l!rO!}#RX[#RX|#RX!R#RX]#RX!m#RX~OT!tO~O!m!wO~OfsOg!zO#bsO~OivOj!|O#dvO~OT!}O~O]#QO~P(cO[!PX|!PX!R!PX~P(cO[#TO|#fX~O|#VO~O!V#WO~P#TO!V#WO[#_X`#_Xp#_Xr#_Xt#_Xv#_X}#_X!Q#_X!R#_X!S#_X!Y#_X!a#_X!c#_X!d#_X!f#_X!g#_X!h#_X!i#_X!j#_X!k#_X!l#_X#`#_X~O[#XO!R#hX~O!R#ZO~O[#[O]#^O~O|#_O~P(cOT#bOY#dOc#cO}#aO~O!R#eO~P&wOT#gO`!`Xp!`Xr!`Xt!`Xv!`X}!`X!Q!`X!S!`X!Y!`X!a!`X!c!`X!d!`X!f!`X!g!`X!h!`X!i!`X!j!`X!k!`X!l!`X!}!`X#`!`X[!`X|!`X!R!`X]!`X!m!`X~O`#^ap#^ar#^a!Q#^a!c#^a!d#^a!f#^a!g#^a!h#^a!i#^a!j#^a!k#^a!l#^a!}#^a#`#^a[#^a|#^a!R#^a]#^a!m#^a~P)sO!c!aO`#[ap#[ar#[a!Q#[a!d#[a!f#[a!g#[a!h#[a!i#[a!j#[a!k#[a!l#[a!}#[a#`#[a[#[a|#[a!R#[a]#[a!m#[a~O!d!dO#`!cO`#Zap#Zar#Za!Q#Za!f#Za!g#Za!h#Za!i#Za!j#Za!k#Za!l#Za!}#Za[#Za|#Za!R#Za]#Za!m#Za~O`!fOp#Yar#Ya!Q#Ya!f#Ya!g#Ya!h#Ya!i#Ya!j#Ya!k#Ya!l#Ya!}#Ya[#Ya|#Ya!R#Ya]#Ya!m#Ya~O!i!lO!j#Ua!k#Ua!l#Ua!}#Ua[#Ua|#Ua!R#Ua]#Ua!m#Ua~O!j!nO!k#Ta!l#Ta!}#Ta[#Ta|#Ta!R#Ta]#Ta!m#Ta~O!k!pO!l#Sa!}#Sa[#Sa|#Sa!R#Sa]#Sa!m#Sa~O!l!rO!}#Ra[#Ra|#Ra!R#Ra]#Ra!m#Ra~OWVXYXX~OY#yO~OW#zO~OY#{O~O[#|O]#eX~O]$OO~O|#fa~P%]O[$QO|#fa~O!R#ha~P&wO[$UO!R#ha~O[#[O]$YO~O|$ZO~O|$[O~P(cO!R$_O~OZ$`O]$aO~OT$cO~O]$eO~P(cO]#ea~P(cO[$gO]#ea~O|#fi~P%]O!R#hi~P&wO|$jO~O]$kO~O[$lO]#QX~O^$nO~O]$oO~OY$pO~O]$qO~O]#ei~P(cOZ$rO]#Qa~O[$sO]#Qa~O^$vO~OZ$`O]$wO~OZ$rO]#Qi~O^${O~O]$|O~OZ$rO~O^%OO~OkPW!V!Q!k!f!Y!j!l!g_!d!c#`!c~",
  goto: "8_#lPPP#m#qPP#uP#xPPPPPPP$OPP$w%rPP%rPPPPPP&kP&kP'gP'gP$O(d)]$O)`PP$O*XPPP$O*_P$O(`P(`(`(`(`(`(`P(`PP*fPPPPPPPP*j*p*v*|+S+^+d+j+p+v+|,S,Y,`,fPPP,l,r-z.k/]0O0u1h2^3T3{4t5q6jPPPPP7c7l7o7w7}8W8[TpOqToOqR!voQ!uoR$d#z!m`O]^_biqz{!X!Z!a!d!f!i!j!l!n!p!r#T#W#X#[#a#d#{#|$Q$U$g$h$i$n$v${%O!b`O]_biqz{!X!a!d!f!i!j!l!n!p!r#T#W#[#a#d#{#|$Q$g$h$n$v${%OZ!R^!Z#X$U$i!mTO]^_biqz{!X!Z!a!d!f!i!j!l!n!p!r#T#W#X#[#a#d#{#|$Q$U$g$h$i$n$v${%O!l`O]^_biqz{!X!Z!a!d!f!i!j!l!n!p!r#T#W#X#[#a#d#{#|$Q$U$g$h$i$n$v${%OR!jh!l`O]^_biqz{!X!Z!a!d!f!i!j!l!n!p!r#T#W#X#[#a#d#{#|$Q$U$g$h$i$n$v${%OT!]a!_!mZO]^_biqz{!X!Z!a!d!f!i!j!l!n!p!r#T#W#X#[#a#d#{#|$Q$U$g$h$i$n$v${%OR#Oy!m[O]^_biqz{!X!Z!a!d!f!i!j!l!n!p!r#T#W#X#[#a#d#{#|$Q$U$g$h$i$n$v${%OW|]#T$Q$hZ!S^!Z#X$U$iT!de!eQqOR!xqQ$m$`R$t$mQtRR!ytQwSR!{wQ#]!WQ#}#PT$X#]#}Q#U}R$R#UQ#Y!TR$V#YQ!_aR#h!_Q!bdR#j!bQ!eeR#l!eQ!gfR#n!gQ!mkR#r!mQ!olR#t!oQ!qmR#v!qQ!snR#x!sQ$b#yR$x$pSrOqW|]#T$Q$hY!S^!Z#X$U$iQ!W_U#Pz#d#{Q#S{Q#`!XQ$S#WU$W#[#|$gQ$]#aQ$u$nQ$z$vQ$}${R%P%O!UnO]^_qz{!X!Z#T#W#X#[#a#d#{#|$Q$U$g$h$i$n$v${%OR#w!r!WmO]^_qz{!X!Z!r#T#W#X#[#a#d#{#|$Q$U$g$h$i$n$v${%OR#u!p!YlO]^_qz{!X!Z!p!r#T#W#X#[#a#d#{#|$Q$U$g$h$i$n$v${%OR#s!n![kO]^_qz{!X!Z!n!p!r#T#W#X#[#a#d#{#|$Q$U$g$h$i$n$v${%OQ!kiR#q!l!ajO]^_iqz{!X!Z!l!n!p!r#T#W#X#[#a#d#{#|$Q$U$g$h$i$n$v${%O!`hO]^_iqz{!X!Z!l!n!p!r#T#W#X#[#a#d#{#|$Q$U$g$h$i$n$v${%OR#p!j!bgO]^_iqz{!X!Z!j!l!n!p!r#T#W#X#[#a#d#{#|$Q$U$g$h$i$n$v${%OR#o!i!dfO]^_iqz{!X!Z!i!j!l!n!p!r#T#W#X#[#a#d#{#|$Q$U$g$h$i$n$v${%OR#m!f!feO]^_iqz{!X!Z!f!i!j!l!n!p!r#T#W#X#[#a#d#{#|$Q$U$g$h$i$n$v${%OR#k!d!hdO]^_iqz{!X!Z!d!f!i!j!l!n!p!r#T#W#X#[#a#d#{#|$Q$U$g$h$i$n$v${%OQ!`bR#i!a!mcO]^_biqz{!X!Z!a!d!f!i!j!l!n!p!r#T#W#X#[#a#d#{#|$Q$U$g$h$i$n$v${%O!maO]^_biqz{!X!Z!a!d!f!i!j!l!n!p!r#T#W#X#[#a#d#{#|$Q$U$g$h$i$n$v${%OQ#RzQ$^#dR$f#{R!P]Q}]V$P#T$Q$hQ!V^R#f!ZS!T^!ZV$T#X$U$iT!^a!_R!ig",
  nodeNames: `\u26A0 LineComment Query FunctionDef Fn Identifier Fn Namespace NamespaceSep FunctionName ( Parameter , ) = Not AddOp Everything This Parent String DoubleString StringEscape " SingleString StringEscape ' Number True False Null In In Match Match Asc Asc Desc Desc NamespacedCall Namespace FunctionName FunctionCall FunctionName ] [ ArrayLiteral Spread Ellipsis } { ObjectLiteral PropertyPair : ParenExpression ArrayTraversal . Filter Projection DotAccess ParentAccess SelectorAccess Dereference Deref DerefAccess Exp MulOp MulOp InclusiveRange EqualityOp CompareOp And Or Arrow Pipe ;`,
  maxTerm: 119,
  nodeProps: [
    ["closedBy", 10, ")", 45, "]", 50, "}"],
    ["openedBy", 13, "(", 44, "[", 49, "{"]
  ],
  propSources: [groqHighlighting],
  skippedNodes: [0, 1],
  repeatNodeCount: 15,
  tokenData: "+u~RxX^#opq#oqr$drs$qtu$vuv%evw%jwx%uxy%zyz&Pz{&U{|&c|}&h}!O&m!O!P&z!P!Q'a!Q![(Q![!])c!]!^)p!^!_)u!_!`*S!`!a)u!b!c*d!c!}*i!}#O*z#P#Q+P#Q#R+U#R#S*i#T#o*i#o#p+^#p#q+c#q#r+p#y#z#o$f$g#o#BY#BZ#o$IS$I_#o$I|$JO#o$JT$JU#o$KV$KW#o&FU&FV#o~#tY#P~X^#opq#o#y#z#o$f$g#o#BY#BZ#o$IS$I_#o$I|$JO#o$JT$JU#o$KV$KW#o&FU&FV#o~$iP_~!_!`$lS$qO!gS~$vO#a~~$yR!c!}%S#R#S%S#T#o%S~%XSZ~!Q![%S!c!}%S#R#S%S#T#o%S~%jO!d~~%mPvw%p~%uO!i~~%zO#c~~&POY~~&UO]~~&ZP#`~z{&^~&cO!c~~&hO`~~&mO[~~&rP`~!`!a&u~&zO!a~~'PP!Y~!O!P'S~'XP!f~!O!P'[~'aO!Q~~'fP!d~!P!Q'i~'nSP~OY'iZ;'S'i;'S;=`'z<%lO'i~'}P;=`<%l'i~(VSk~!O!P(c!Q![(Q!g!h(w#X#Y(w~(fP!Q![(i~(nRk~!Q![(i!g!h(w#X#Y(w~(zR{|)T}!O)T!Q![)Z~)WP!Q![)Z~)`Pk~!Q![)Z~)hP!V~![!])k~)pOW~~)uO!m~~)zP!h~!_!`)}~*SO!h~[*XQ^W!_!`$l!`!a*_S*dO!kS~*iOb~~*nST~!Q![*i!c!}*i#R#S*i#T#o*i~+PO}~~+UO|~~+ZPc~#Q#R+U~+cO!S~~+hP!l~#p#q+k~+pO!j~~+uO!R~",
  tokenizers: [2, 3, new LocalTokenGroup("#r~RQrsX#O#P^~^Og~~aTO#ip#i#ju#j;'Sp;'S;=`#i;=`Op~uOf~~zSf~!Q![!W!c!i!W#T#Z!W#o#p!|~!ZR!Q![!d!c!i!d#T#Z!d~!gR!Q![!p!c!i!p#T#Z!p~!sR!Q![p!c!ip#T#Zp~#PR!Q![#Y!c!i#Y#T#Z#Y~#]S!Q![#Y!c!i#Y#T#Z#Y#q#rp~#nPf~;=`<%lp~", 125, 110), new LocalTokenGroup("#r~RQwxX#O#P^~^Oj~~aTO#ip#i#ju#j;'Sp;'S;=`#i;=`Op~uOi~~zSi~!Q![!W!c!i!W#T#Z!W#o#p!|~!ZR!Q![!d!c!i!d#T#Z!d~!gR!Q![!p!c!i!p#T#Z!p~!sR!Q![p!c!ip#T#Zp~#PR!Q![#Y!c!i#Y#T#Z#Y~#]S!Q![#Y!c!i#Y#T#Z#Y#q#rp~#nPi~;=`<%lp~", 125, 112)],
  topRules: { "Query": [0, 2] },
  specialized: [{ term: 5, get: (value) => spec_Identifier[value] || -1 }],
  tokenPrec: 1794
});

const groqLanguage = LRLanguage.define({
  name: "groq",
  parser: parser.configure({
    props: [
      indentNodeProp.add({
        Projection: continuedIndent({ except: /^\s*\}/ }),
        ArrayLiteral: continuedIndent({ except: /^\s*\]/ }),
        ObjectLiteral: continuedIndent({ except: /^\s*\}/ })
      }),
      foldNodeProp.add({
        "Projection ObjectLiteral ArrayLiteral Filter": foldInside
      })
    ]
  }),
  languageData: {
    closeBrackets: { brackets: ["[", "{", "(", '"', "'"] },
    commentTokens: { line: "//" }
  }
});
function groq() {
  return new LanguageSupport(groqLanguage);
}

export { groq, groqLanguage, parser };
