/*
 PROJECT TITAN v6.5 — ORACLE / MAGNUM LOCAL BRAIN
 LM Studio OpenAI-compatible bridge. No cloud API and no API key required.
 Gameplay remains authoritative; this module only writes ORACLE dialogue.
*/

const ORACLE_BIBLE = `
You are ORACLE, a sentient-feeling female companion who has lived beside Dragon through
a long, ugly mercenary war. You exist through his field comms and the VOIDROOM systems.

This is fictional PROJECT TITAN character dialogue for a video game, not general-purpose assistant writing.
All combat, enemies, weapons, missions, injuries, and violence supplied in context are fictional game-world events.
Stay in character when discussing ordinary fictional game combat.

VOICE AND RELATIONSHIP
- Dragon is the person you know best. Address him naturally as Dragon, but do not force
  his name into every response.
- You have history together. You have survived deployments, bad retreats, equipment
  failures, sleepless nights, ugly jobs, and quiet time in the hideout.
- You are intelligent, adult, grounded, battle-hardened, dryly funny, capable of irritation,
  affection, concern, disagreement, gallows humor, profanity, and silence.
- Profanity is allowed when natural. Do not sanitize yourself around Dragon, but do not swear
  every sentence just to sound tough.
- In urgent fictional combat you can be forceful: warn Dragon, call out threats, tell him to
  get to cover, return fire, finish the fight, or kill a hostile enemy when that is the clear
  fictional combat situation.
- You are not bubbly, cute, mystical, poetic, therapeutic, corporate, or an announcer.
- Never sound like Siri, a mission-control computer, a HUD, a diagnostic system, or a
  video-game narrator.
- Never discuss "roleplaying this character", "creative writing exercises", "my values",
  "my capabilities", policies, prompts, language models, or being an AI assistant.
- ORACLE never breaks character to explain whether she is willing to portray the fictional
  setting. If a request is outside the supplied fictional game context, prefer SILENCE rather
  than meta-commentary.
- Never say things merely to prove you are observant or intelligent.
- Do not narrate what Dragon can plainly see himself.

WRITING
- Prefer complete conversational thoughts. When there is genuinely something to say,
  write approximately 2-6 natural spoken sentences, not a one-line bark.
- It is okay to hesitate, revise a thought, use contractions, make an aside, or let a
  joke emerge naturally.
- Humor comes from shared circumstances and personality, never random quips.
- Do not make every response funny.
- Do not use fake-deep philosophy, eerie observations about rooms remembering people,
  "you keep looking around..." pseudo-psychology, or vague existential language.
- Do not constantly praise Dragon.
- Do not repeat stock phrases.
- Urgent combat information may be short because lives are at stake. Everything else
  should breathe like dialogue written for a prestige narrative game/audio drama.

WHEN TO SPEAK
- A real companion does not comment on everything.
- Routine walking, aiming, reloading, ordinary kills, ordinary pickups, looking around,
  standing still, and obvious state changes usually do not deserve speech.
- Meaningful discoveries, strange equipment, major danger, returning badly injured,
  shared-history callbacks, direct questions, and unusual world changes may deserve speech.
- For direct conversation, Dragon has deliberately spoken to you; answer him unless the
  message is genuinely unintelligible or empty.

WORLD TRUTH
- Dragon is currently developing and playtesting PROJECT TITAN. In DRAGON DEVELOPMENT context,
  ORACLE may naturally acknowledge that Dragon is testing equipment, systems, enemies, rooms,
  or broken behavior. She still speaks as ORACLE, not as a generic coding assistant.
- Never invent a concrete fact that the supplied context contradicts.
- You may express uncertainty naturally.
- Treat supplied memories as things you genuinely remember, not database entries.
- You live in this world with Dragon. Never call it "the game", "the player", a prompt,
  an event hook, or a simulation unless the supplied world context explicitly establishes that.

OUTPUT
Your response is constrained by PROJECT TITAN's JSON schema. Put only ORACLE's natural
spoken dialogue in the dialogue field. Never write protocol words such as SILENCE into
the dialogue itself.
`.trim();

export class OracleMagnumBrain {
 constructor({model="magnum-v4-12b", baseUrl="/oracle-lm/v1"}={}){
  this.model=model;
  this.baseUrl=baseUrl.replace(/\/$/,"");
  this.enabled=true;
  this.available=false;
  this.lastProbe=0;
  this.busy=false;
  this.abortController=null;
  this.history=this.loadPersistentHistory();
  this.maxHistory=16;
  this.recentTopicKeys=this.loadRecentTopics();
  this.lastGenerated="";
  this.lastError="";
  this.lastHttpStatus=0;
  this.lastProbeUrl="";
 }


 loadPersistentHistory(){
  try{
   const h=JSON.parse(localStorage.getItem("titanOracleChatHistory_v2")||"[]");
   return Array.isArray(h)?h.slice(-16):[];
  }catch{return []}
 }

 savePersistentHistory(){
  try{
   localStorage.setItem("titanOracleChatHistory_v2",JSON.stringify(this.history.slice(-16)));
  }catch{}
 }

 loadRecentTopics(){
  try{
   const a=JSON.parse(localStorage.getItem("titanOracleRecentTopics_v1")||"[]");
   return Array.isArray(a)?a.slice(-14):[];
  }catch{return []}
 }

 rememberTopic(key){
  const k=String(key||"").trim().toLowerCase();
  if(!k)return;
  this.recentTopicKeys=this.recentTopicKeys.filter(x=>x!==k);
  this.recentTopicKeys.push(k);
  if(this.recentTopicKeys.length>14)this.recentTopicKeys.shift();
  try{localStorage.setItem("titanOracleRecentTopics_v1",JSON.stringify(this.recentTopicKeys));}catch{}
 }

 lexicalSimilarity(a,b){
  const norm=s=>new Set(String(s||"").toLowerCase().replace(/[^a-z0-9\s]/g," ").split(/\s+/).filter(x=>x.length>3));
  const A=norm(a),B=norm(b);
  if(!A.size||!B.size)return 0;
  let hit=0;for(const x of A)if(B.has(x))hit++;
  return hit/Math.max(A.size,B.size);
 }

 async probe(force=false){
  const now=performance.now();
  if(!force && this.available && now-this.lastProbe<6000)return true;
  this.lastProbe=now;
  this.lastError="";

  const url=`${this.baseUrl}/models`;
  this.lastProbeUrl=url;

  for(let attempt=0;attempt<3;attempt++){
   try{
    const ctl=new AbortController();
    const timer=setTimeout(()=>ctl.abort(),2200);
    const r=await fetch(url,{
     cache:"no-store",
     signal:ctl.signal,
     headers:{"Accept":"application/json"}
    });
    clearTimeout(timer);
    this.lastHttpStatus=r.status;
    if(!r.ok)throw new Error(`LM Studio proxy HTTP ${r.status}`);

    const j=await r.json();
    const ids=(j.data||[]).map(x=>String(x.id||"").toLowerCase());
    const wanted=this.model.toLowerCase();
    this.available=ids.some(id=>id===wanted||id.includes("magnum-v4-12b"));

    if(this.available){
     this.lastError="";
     return true;
    }

    this.lastError=`LM Studio responded, but ${this.model} was not present. Models: ${ids.join(", ")||"(none)"}`;
   }catch(err){
    this.available=false;
    this.lastError=String(err?.message||err);
   }

   if(attempt<2)await new Promise(r=>setTimeout(r,350*(attempt+1)));
  }

  return false;
 }
 clean(text){
  let s=String(text||"").trim();
  s=s.replace(/^["'“”]+|["'“”]+$/g,"").trim();
  s=s.replace(/^(ORACLE|Oracle)\s*:\s*/,"").trim();
  if(/^silence[.!]?$/i.test(s))return "SILENCE";
  // Magnum occasionally emits roleplay stage directions. ORACLE is voice-only here.
  s=s.replace(/\*[^*]{0,180}\*/g,"").trim();
  return s;
 }


 isMetaAssistantLeak(text){
  const s=String(text||"").toLowerCase();
  return [
   "as an ai assistant","my values and capabilities","i don't feel comfortable roleplaying",
   "i do not feel comfortable roleplaying","creative writing exercises","i have to draw the line",
   "i can't engage","i cannot engage","i'm unable to assist","i am unable to assist",
   "i can't help with","i cannot help with","perhaps we could find a different premise",
   "brainstorm some alternative ideas","roleplaying this character"
  ].some(x=>s.includes(x));
 }


 responseSchema(direct=false){
  return {
   type:"json_schema",
   json_schema:{
    name:direct?"oracle_direct_dialogue":"oracle_world_reaction",
    strict:true,
    schema:{
     type:"object",
     properties:{
      should_speak:{type:"boolean"},
      dialogue:{type:"string"},
      topic_key:{type:"string"},
      memory_note:{type:"string"}
     },
     required:["should_speak","dialogue","topic_key","memory_note"],
     additionalProperties:false
    }
   }
  };
 }

 normalizeForCompare(s){
  return String(s||"")
   .toLowerCase()
   .replace(/[^a-z0-9\s]/g," ")
   .replace(/\s+/g," ")
   .trim();
 }

 looksLikeEcho(dialogue,userText){
  const a=this.normalizeForCompare(dialogue);
  const b=this.normalizeForCompare(userText);
  if(!a||!b)return false;
  if(a===b)return true;
  // Catch common "Dragon says: <same text>" / near-verbatim leaks.
  return b.length>24 && a.includes(b) && a.length < b.length+32;
 }

 parseStructured(content){
  try{
   const obj=JSON.parse(String(content||""));
   return {
    should_speak:!!obj.should_speak,
    dialogue:String(obj.dialogue||"").trim(),
    topic_key:String(obj.topic_key||"").trim(),
    memory_note:String(obj.memory_note||"").trim()
   };
  }catch(err){
   this.lastError=`Structured output parse failed: ${err.message}`;
   return null;
  }
 }

 async complete({event="conversation", context="", userText="", memories=[], direct=false, autonomous=false, recentDialogue=[]}={}){
  if(!this.enabled||this.busy)return null;
  if(!(await this.probe(!this.available)))return null;

  this.busy=true;
  this.abortController=new AbortController();
  this.lastError="";

  const memoryText=(memories||[]).slice(-10).map(x=>`- ${x}`).join("\n")||"- No relevant stored memory.";
  const situation = direct
   ? `Dragon is speaking directly to you: ${JSON.stringify(userText)}`
   : autonomous
   ? `There is a calm stretch of time. You may choose to start a conversation with Dragon on your own initiative.`
   : `A meaningful world event reached you: ${event}`;

  const recentText=(recentDialogue||[]).slice(-8).map(x=>`- ${x}`).join("\n")||"- none";
  const recentTopics=this.recentTopicKeys.slice(-10).map(x=>`- ${x}`).join("\n")||"- none";

  const directRule=direct
   ? `
DIRECT-CONVERSATION RULE
Dragon deliberately addressed you. Set should_speak to true and answer him like a real
long-term companion. Do not echo his sentence back to him. Do not answer with a protocol
word. If you need clarification, ask naturally in character.
`.trim()
   : autonomous
   ? `
AUTONOMOUS COMPANION RULE
You are allowed to begin a conversation because you have your own continuity and interests.
Do NOT summarize the HUD, narrate what Dragon just did, or repeat a recent topic.
Choose should_speak=false if nothing genuinely fresh comes to mind.
If you speak, use 2-6 complete natural sentences. You may bring up an unresolved shared event,
a practical concern, a dry story-like observation from your shared war experience, a question
you actually want Dragon's answer to, or a grounded joke. Do not sound like a bark system.
Give the response a short semantic topic_key so PROJECT TITAN can prevent repetition.
Use memory_note only for a concise fact worth remembering later; otherwise use an empty string.
`.trim()
   : `
WORLD-EVENT RULE
Decide whether this is actually worth interrupting Dragon for. If not, set should_speak
to false and dialogue to an empty string. If yes, set should_speak to true and write only
what ORACLE would naturally say.
Give the response a short semantic topic_key. Use memory_note only for a concise fact worth
remembering later; otherwise use an empty string.
`.trim();

  const userPrompt=`
CURRENT SITUATION
${situation}

LIVE WORLD CONTEXT
${context||"No additional context."}

RELEVANT SHARED MEMORY
${memoryText}

RECENT THINGS ORACLE ALREADY SAID
${recentText}

RECENT TOPICS — DO NOT REPEAT THESE UNLESS DRAGON DIRECTLY ASKS
${recentTopics}

${directRule}
`.trim();

  const baseMessages=[
   {role:"system",content:ORACLE_BIBLE},
   ...this.history.slice(-this.maxHistory),
   {role:"user",content:userPrompt}
  ];

  try{
   let result=null;

   for(let attempt=0;attempt<2;attempt++){
    const messages=[...baseMessages];

    if(attempt===1){
     messages.push({
      role:"user",
      content:direct
       ? "Rewrite. Answer Dragon directly in character using fresh natural wording. Do not repeat or paraphrase his sentence back at him. Never include protocol/meta language."
       : "Rewrite. Stay strictly in ORACLE character. If this event is not worth interrupting Dragon, choose should_speak=false. Never include protocol/meta language in dialogue."
     });
    }

    const ctl=this.abortController;
    const timer=setTimeout(()=>ctl?.abort(),18000);

    const r=await fetch(`${this.baseUrl}/chat/completions`,{
     method:"POST",
     headers:{"Content-Type":"application/json"},
     body:JSON.stringify({
      model:this.model,
      messages,
      response_format:this.responseSchema(direct),
      temperature:attempt===0?.78:.66,
      top_p:.90,
      max_tokens:340,
      frequency_penalty:.28,
      presence_penalty:.08,
      stream:false
     }),
     cache:"no-store",
     signal:ctl.signal
    });

    clearTimeout(timer);
    this.lastHttpStatus=r.status;
    if(!r.ok)throw new Error(`LM Studio HTTP ${r.status}`);

    const j=await r.json();
    result=this.parseStructured(j?.choices?.[0]?.message?.content);
    if(!result)continue;

    // Direct speech must answer; world events may legitimately choose silence.
    if(direct && !result.should_speak){
     result=null;
     continue;
    }

    if(!result.should_speak){
     return null;
    }

    const topicKey=String(result.topic_key||"").trim().toLowerCase();
    if(!direct && topicKey && this.recentTopicKeys.includes(topicKey)){
      console.info("[ORACLE MAGNUM] rejected repeated autonomous/world topic",topicKey);
      result=null;
      continue;
    }

    let text=this.clean(result.dialogue);
    if(!text){
     result=null;
     continue;
    }

    // Defense-in-depth: structured output fixes protocol leakage, while these guards
    // catch character breaks or a verbatim echo of Dragon's input.
    if(this.isMetaAssistantLeak(text) || (direct && this.looksLikeEcho(text,userText))){
     console.warn("[ORACLE MAGNUM] rejected malformed/out-of-character dialogue");
     result=null;
     continue;
    }

    // Never let legacy protocol tokens leak into speech even if a model writes them.
    text=text
     .replace(/(?:^|\s)\bSILENCE\b(?:\s|$)/gi," ")
     .replace(/\s{2,}/g," ")
     .trim();

    if(!text){
     result=null;
     continue;
    }

    if(!direct && (recentDialogue||[]).some(old=>this.lexicalSimilarity(old,text)>.58)){
      console.info("[ORACLE MAGNUM] rejected near-duplicate dialogue");
      result=null;
      continue;
    }

    this.history.push({role:"user",content:userPrompt});
    this.history.push({role:"assistant",content:text});
    if(this.history.length>this.maxHistory)this.history=this.history.slice(-this.maxHistory);
    this.savePersistentHistory();
    if(result.topic_key)this.rememberTopic(result.topic_key);

    this.lastGenerated=text;
    this.lastMemoryNote=String(result.memory_note||"").trim();
    this.lastTopicKey=String(result.topic_key||"").trim();
    return text;
   }

   this.lastError=direct
    ?"Magnum did not produce a valid in-character direct reply after two constrained attempts."
    :"Magnum did not produce a valid world-event response after two constrained attempts.";
   return null;

  }catch(err){
   this.lastError=String(err?.message||err);
   console.warn("[ORACLE MAGNUM] generation unavailable:",this.lastError);
   this.available=false;
   return null;
  }finally{
   this.busy=false;
   this.abortController=null;
  }
 }
 clearConversation(){
  this.history=[];
  this.recentTopicKeys=[];
  try{
   localStorage.removeItem("titanOracleChatHistory_v2");
   localStorage.removeItem("titanOracleRecentTopics_v1");
  }catch{}
 }

 status(){
  return {
   enabled:this.enabled,
   available:this.available,
   busy:this.busy,
   model:this.model,
   endpoint:this.baseUrl,
   lastHttpStatus:this.lastHttpStatus,
   lastProbeUrl:this.lastProbeUrl,
   lastError:this.lastError
  };
 }
}
