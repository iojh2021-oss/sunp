// SunP local cognitive assistants: advisory only; Sun remains the decision-maker.
// BrainCog-inspired temporal signal sketch and explicit Hyperon-style symbolic rules.
// These browser-safe demonstrators are not the upstream BrainCog/Hyperon runtimes.
export const COGNITION_MODES = ["off", "braincog", "hyperon", "both"];
export const COGNITION_LABELS = {
  off: "خورشید تنها",
  braincog: "خورشید + BrainCog (تحلیل الگو)",
  hyperon: "خورشید + Hyperon (قواعد نمادین)",
  both: "خورشید + هر دو عامل کمکی",
};
const clamp = (v, lo=0, hi=1) => Math.max(lo, Math.min(hi, v));
const norm = (v, lo, hi) => clamp((v-lo)/(hi-lo));
export function getCognitiveAdvice(world, mode="both") {
  if (mode === "off") return { mode, policyScores: null, braincog: null, hyperon: null, summary: "عامل کمکی خاموش است؛ خورشید فقط از PPO و حافظه خودش استفاده می‌کند." };
  const e=world.env, pop=world.population;
  const producer=pop.filter(x=>x.role==="producer").length;
  const consumer=pop.filter(x=>x.role==="consumer").length;
  const aquatic=pop.filter(x=>x.species==="aquatic" || (x.species==="cancer"||x.species==="aquarius"||x.species==="pisces")).length;
  const avgHealth=pop.length?pop.reduce((s,x)=>s+x.health,0)/pop.length:0;
  const waterStress=1-norm(e.water,20,80), nutrientStress=1-norm(e.nutrients,20,80);
  const populationStress=1-norm(pop.length,10,90), healthStress=1-norm(avgHealth,35,90);
  // BrainCog-inspired LIF-like activation from present stress and recent stress persistence.
  const membrane=clamp(.34*waterStress+.25*healthStress+.22*populationStress+.19*nutrientStress);
  const spike=membrane>.52?1:membrane>.34?.55:.15;
  const temporalSignal={stress:membrane,spike,resourceTrend:clamp((e.water+e.soil+e.nutrients)/300)};
  // Symbolic helper rules, similar in spirit to explicit MeTTa rules; never returns an action.
  const rules=[];
  if(world.challenge?.type==="drought" || e.water<28) rules.push("خشکی/کم‌آبی ← توجه به صرفه‌جویی");
  if(world.challenge?.type==="blight" || e.nutrients<25) rules.push("فشار گیاهی/کمبود مواد ← توجه به تنوع");
  if(avgHealth<48 || pop.length<18) rules.push("سلامت یا جمعیت پایین ← توجه به ترمیم");
  if(Math.abs(producer-consumer)>Math.max(5,pop.length*.22)) rules.push("عدم توازن نقش‌ها ← توجه به تعادل");
  const scores={repair:0,conserve:0,balance:0,diversity:0};
  if(mode==="braincog"||mode==="both"){
    scores.conserve+=temporalSignal.stress*.85;
    scores.repair+=healthStress*.72+populationStress*.25;
    scores.diversity+=nutrientStress*.42;
    scores.balance+=Math.abs(producer-consumer)/Math.max(1,pop.length)*.55;
  }
  if(mode==="hyperon"||mode==="both"){
    if(rules.some(x=>x.includes("صرفه‌جویی")))scores.conserve+=.9;
    if(rules.some(x=>x.includes("ترمیم")))scores.repair+=.8;
    if(rules.some(x=>x.includes("تنوع")))scores.diversity+=.8;
    if(rules.some(x=>x.includes("تعادل")))scores.balance+=.8;
  }
  const max=Math.max(1,...Object.values(scores));
  for(const p of Object.keys(scores))scores[p]=scores[p]/max;
  const summary=[
    mode==="braincog"||mode==="both"?`BrainCog-مانند: فشار ${Math.round(membrane*100)}٪`:"",
    mode==="hyperon"||mode==="both"?`Hyperon-مانند: ${rules.length?rules.join("؛ "):"قاعده هشدار فعالی نبود"}.`:""
  ].filter(Boolean).join(" · ");
  return {mode,policyScores:scores,braincog:temporalSignal,hyperon:{rules},summary};
}
