/* ICU Guide: pure calculators, ESICM items and timer rules (no DOM). Loaded before app.js. */
(function(G){'use strict';
const r1=x=>Math.round(x*10)/10,r2=x=>Math.round(x*100)/100;
const C={};
// ---- respiratory ----
C.pbw=(sex,hcm)=>r1((sex==='f'?45.5:50)+0.91*(hcm-152.4));
C.vt=(pbw,mlkg)=>Math.round(pbw*mlkg);
C.pf=(pao2,fio2,unit)=>{let p=+pao2;if(unit==='kPa')p=p*7.50062;let f=+fio2;if(f>1)f=f/100;return Math.round(p/f)};
C.berlin=(pf,peep)=>{if(peep!=null&&peep!==''&&+peep<5)return'PEEP < 5: Berlin severity needs PEEP/CPAP ≥ 5 cmH₂O';return pf>300?'Not in ARDS range (P/F > 300)':pf>200?'Mild ARDS (P/F 201–300)':pf>100?'Moderate ARDS (P/F 101–200)':'Severe ARDS (P/F ≤ 100)'};
C.dp=(pplat,peep)=>r1(pplat-peep);
C.crs=(vt,dp)=>dp>0?r1(vt/dp):null;
// ---- haemodynamics ----
C.map=(s,d)=>Math.round(+d+(s-d)/3);
// ---- scores ----
C.gcs=(e,v,m)=>(+e)+(+v)+(+m);
C.gcsCat=g=>g<=8?'Severe (3–8)':g<=12?'Moderate (9–12)':'Mild (13–15)';
C.qsofa=(rr,sbp,ams)=>(rr>=22?1:0)+(sbp<=100?1:0)+(ams?1:0);
C.sofa=o=>{const s={};const pf=+o.pf,sup=!!o.vent;
 s.resp=pf>=400?0:pf>=300?1:(pf<100&&sup)?4:(pf<200&&sup)?3:2;
 const pl=+o.plt;s.coag=pl>=150?0:pl>=100?1:pl>=50?2:pl>=20?3:4;
 let b=+o.bili;if(o.biliU==='umol')b=b/17.1;s.liver=b<1.2?0:b<2?1:b<6?2:b<12?3:4;
 const cv=o.cv||'none';s.cvs=cv==='high'?4:cv==='mid'?3:cv==='low'?2:(+o.map<70?1:0);
 const g=+o.gcs;s.cns=g>=15?0:g>=13?1:g>=10?2:g>=6?3:4;
 let c=+o.cr;if(o.crU==='umol')c=c/88.4;let rn=c<1.2?0:c<2?1:c<3.5?2:c<5?3:4;
 if(o.uo!==''&&o.uo!=null){const u=+o.uo;if(u<200)rn=Math.max(rn,4);else if(u<500)rn=Math.max(rn,3)}s.renal=rn;
 s.total=s.resp+s.coag+s.liver+s.cvs+s.cns+s.renal;return s};
// ---- renal ----
C.crcl=(age,wt,scr,sex,unit)=>{let c=+scr;if(unit==='umol')c=c/88.4;return r1((140-age)*wt*(sex==='f'?0.85:1)/(72*c))};
C.kdigo=o=>{const k=o.unit==='umol'?1/88.4:1;const b=o.base*k,c=o.cur*k,rise=(o.rise48||0)*k;let s=0,why=[];
 if(o.rrt){return{stage:3,why:['Starting RRT = automatic stage 3']}}
 const ratio=b>0?c/b:0;
 if(ratio>=3||c>=4){s=3;why.push(ratio>=3?'SCr ≥ 3 × baseline':'SCr ≥ 4.0 mg/dL (≥ 353.6 µmol/L)')}
 else if(ratio>=2){s=2;why.push('SCr 2.0–2.9 × baseline')}
 else if(ratio>=1.5||rise>=0.3){s=1;why.push(ratio>=1.5?'SCr 1.5–1.9 × baseline':'SCr rise ≥ 0.3 mg/dL (≥ 26.5 µmol/L) in 48 h')}
 const uo=o.uo,h=o.uoh||0;let u=0;
 if(o.anuriaH>=12||(uo!=null&&uo!==''&&uo<0.3&&h>=24))u=3;else if(uo!=null&&uo!==''&&uo<0.5&&h>=12)u=2;else if(uo!=null&&uo!==''&&uo<0.5&&h>=6)u=1;
 if(u){why.push('Urine output criterion → stage '+u)}
 return{stage:Math.max(s,u),ratio:r2(ratio),why}};
// ---- fluids ----
C.fb=o=>{const i=(+o.iv||0)+(+o.ent||0)+(+o.oth||0),out=(+o.uo||0)+(+o.dr||0)+(+o.oo||0)+(+o.ins||0);return{inn:i,out,net:i-out,cum:(+o.prev||0)+i-out}};
// ---- pancreatitis ----
C.atlanta=(of,local)=>of==='persistent'?'Severe':of==='transient'||local?'Moderately severe':'Mild';
// ---- acid–base ----
C.ag=(na,cl,hco3)=>r1(na-(+cl+(+hco3)));
C.agc=(ag,alb)=>r1(ag+2.5*(4-alb));
C.abg=o=>{const ph=+o.ph,co2=o.unit==='kPa'?o.pco2*7.50062:+o.pco2,h=+o.hco3;const out=[],rules=[];let prim='';
 const st=ph<7.35?'Acidaemia':ph>7.45?'Alkalaemia':'Normal pH (7.35–7.45)';out.push(st);
 if(ph<7.35){prim=h<22?'Metabolic acidosis':co2>45?'Respiratory acidosis':'Mixed / check values'}
 else if(ph>7.45){prim=h>26?'Metabolic alkalosis':co2<35?'Respiratory alkalosis':'Mixed / check values'}
 else{prim=(h<22&&co2<35)?'Possible mixed (metabolic acidosis + respiratory alkalosis) or compensated':(h>26&&co2>45)?'Possible mixed (metabolic alkalosis + respiratory acidosis) or compensated':(h<22||co2<35||h>26||co2>45)?'Abnormal HCO₃⁻/PaCO₂ with normal pH: consider mixed disorder':'No primary acid–base disorder'}
 out.push('Primary: '+prim);let exp='';
 if(prim==='Metabolic acidosis'){const e=1.5*h+8;exp=`Expected PaCO₂ = 1.5 × HCO₃⁻ + 8 ± 2 = ${r1(e-2)}–${r1(e+2)} mmHg`;out.push(exp);out.push(co2>e+2?'PaCO₂ higher than expected → additional respiratory acidosis':co2<e-2?'PaCO₂ lower than expected → additional respiratory alkalosis':'Appropriate respiratory compensation')}
 if(prim==='Metabolic alkalosis'){const e=0.7*h+21;exp=`Expected PaCO₂ = 0.7 × HCO₃⁻ + 21 ± 2 = ${r1(e-2)}–${r1(e+2)} mmHg`;out.push(exp);out.push(co2>e+2?'PaCO₂ higher than expected → additional respiratory acidosis':co2<e-2?'PaCO₂ lower than expected → additional respiratory alkalosis':'Appropriate respiratory compensation')}
 if(prim==='Respiratory acidosis'){const a=24+(co2-40)/10,c=24+3.5*(co2-40)/10;exp=`Expected HCO₃⁻: acute ≈ ${r1(a)} (+1 per 10 mmHg), chronic ≈ ${r1(c)} (+3.5 per 10 mmHg)`;out.push(exp);out.push(h<a-2?'HCO₃⁻ below acute expectation → additional metabolic acidosis':h>c+2?'HCO₃⁻ above chronic expectation → additional metabolic alkalosis':h<=a+2?'Fits acute respiratory acidosis':'Fits chronic (compensated) respiratory acidosis')}
 if(prim==='Respiratory alkalosis'){const a=24-2*(40-co2)/10,c=24-5*(40-co2)/10;exp=`Expected HCO₃⁻: acute ≈ ${r1(a)} (−2 per 10 mmHg), chronic ≈ ${r1(c)} (−5 per 10 mmHg)`;out.push(exp);out.push(h>a+2?'HCO₃⁻ above acute expectation → additional metabolic alkalosis':h<c-2?'HCO₃⁻ below chronic expectation → additional metabolic acidosis':h>=a-2?'Fits acute respiratory alkalosis':'Fits chronic (compensated) respiratory alkalosis')}
 let ag=null,agc=null,dr=null;
 if(o.na&&o.cl){ag=C.ag(o.na,o.cl,h);out.push(`Anion gap = Na⁺ − (Cl⁻ + HCO₃⁻) = ${ag} mmol/L`);let use=ag;
  if(o.alb){const a=o.albU==='gL'?o.alb/10:+o.alb;agc=C.agc(ag,a);use=agc;out.push(`Albumin-corrected AG = AG + 2.5 × (4 − albumin g/dL) = ${agc}`)}
  if(use>12){out.push('High anion gap (> 12): consider lactate, ketones, renal failure, toxins (methanol, ethylene glycol, salicylate). ACE: HD indicated in toxic alcohols if pH < 7.15 and/or AG > 24.');
   if(h<24){dr=r2((use-12)/(24-h));out.push(`Delta ratio = (AG − 12) / (24 − HCO₃⁻) = ${dr}: `+(dr<0.4?'< 0.4 → hyperchloraemic normal-AG acidosis':dr<1?'0.4–1 → mixed high-AG + normal-AG acidosis':dr<=2?'1–2 → pure high-AG acidosis':'> 2 → high-AG acidosis + metabolic alkalosis (or chronic resp. acidosis)'))}}
  else if(prim==='Metabolic acidosis')out.push('Normal anion gap (≤ 12): hyperchloraemic acidosis (e.g. saline, GI or renal HCO₃⁻ loss)')}
 return{st,prim,lines:out,ag,agc,dr}};
// ---- infusion ----
C.rate=(dose,unit,wt,amt,vol)=>{ // returns mL/h
 const perkg=/\/kg\//.test(unit),permin=/\/min$/.test(unit);const m=unit.split('/')[0];
 const conv={mcg:1000,ng:1e6,mU:1000,mg:1,units:1}[m];const conc=amt*conv/vol; // dose-units per mL
 const perh=dose*(perkg?wt:1)*(permin?60:1);return r2(perh/conc)};
C.doseFromRate=(rate,unit,wt,amt,vol)=>{const one=C.rate(1,unit,wt,amt,vol);return one?r2(rate/one*1):null};
const A1='ACE: Sepsis & Septic Shock › Vasopressors and inotropes (ACE Table 6)',A2='ACE: RV failure › drug table',A3='ACE: Hypertension › drug table',A4='ACE: PAD (pain, agitation, delirium)';
C.drugs=[
 {id:'ne',n:'Noradrenaline',u:'mcg/kg/min',amt:'mg',r:[[0.1,3,'start 0.1 · max 3 per ACE – verify',A1],[0.02,0.2,'RV failure range',A2]]},
 {id:'adr',n:'Adrenaline',u:'mcg/kg/min',amt:'mg',r:[[0.05,1,'Table 6 range',A1]]},
 {id:'phe',n:'Phenylephrine',u:'mcg/kg/min',amt:'mg',r:[[0.1,1,'Table 6 range',A1]]},
 {id:'dop',n:'Dopamine (α dose)',u:'mcg/kg/min',amt:'mg',r:[[10,20,'Table 6 range',A1]]},
 {id:'vpk',n:'Vasopressin (per kg)',u:'mU/kg/min',amt:'units',r:[[0.1,2,'Table 6 range',A1]]},
 {id:'vp',n:'Vasopressin (fixed)',u:'units/min',amt:'units',r:[[0.01,0.04,'RV failure 0.01–0.04; AKI chapter 0.02–0.04 U/min',A2]]},
 {id:'ang',n:'Angiotensin II',u:'ng/kg/min',amt:'mg',r:[[20,80,'Table 6 range',A1]]},
 {id:'dob',n:'Dobutamine',u:'mcg/kg/min',amt:'mg',r:[[2.5,10,'RV failure range',A2]]},
 {id:'mil',n:'Milrinone',u:'mcg/kg/min',amt:'mg',r:[[0.375,0.75,'RV failure range (loading dose ↑ hypotension)',A2]]},
 {id:'lev',n:'Levosimendan',u:'mcg/kg/min',amt:'mg',r:[[0.1,0.1,'infusion after load 6–12 mcg/kg over 10 min',A2]]},
 {id:'epo',n:'Epoprostenol (IV)',u:'ng/kg/min',amt:'mg',r:[[1,2,'IV range',A2]]},
 {id:'esm',n:'Esmolol',u:'mcg/kg/min',amt:'mg',r:[[50,300,'infusion after load 500 µg/kg over 1 min',A3]]},
 {id:'snp',n:'Nitroprusside',u:'mcg/kg/min',amt:'mg',r:[[0,3,'avoid > 3 for > 72 h; max 10 for ≤ 10 min',A3]]},
 {id:'vec',n:'Vecuronium',u:'mcg/kg/min',amt:'mg',r:[[0.8,1.4,'infusion range',A4]]},
 {id:'ket',n:'Ketamine (low-dose analgesia)',u:'mcg/kg/min',amt:'mg',r:[[0,10,'low dose < 5–10',A4]]}];
C.otherUnits=['mcg/kg/min','mcg/min','mg/h','mg/kg/h','units/h','units/kg/h'];
// ---- ESICM guideline items (clear recommendations only; source tag on every item) ----
const SSC='ESICM Surviving Sepsis Campaign adult guidelines, 2026',ARDS='ESICM ARDS guidelines, 2023',SH='ESICM Circulatory shock & haemodynamic monitoring guidelines, 2025',TR='ESICM Transfusion in non-bleeding critically ill adults, 2020';
G.ESICM=[
 ['01-sepsis',1,'h1','A','<b>MAP:</b> initial target 65 mmHg; age ≥ 65 y: suggest <b>60–65 mmHg</b> <span class="mut">(ACE: 65 mmHg)</span>',SSC],
 ['01-sepsis',0,'h1','C','<b>Measure blood lactate</b> in possible, probable or definite sepsis',SSC],
 ['01-sepsis',2,'h1','B','<b>Crystalloids first-line</b>; crystalloid alone over added albumin (albumin may suit large volumes or cirrhosis); <b>no starches</b>, suggest against gelatins',SSC],
 ['01-sepsis',6,'h6','B','Use <b>capillary refill time</b> as an adjunct to other perfusion measures to guide resuscitation',SSC],
 ['01-sepsis',4,'h1','B','<b>Noradrenaline first-line</b> over dopamine, adrenaline or selepressin; suggest against terlipressin',SSC],
 ['01-sepsis',10,'h24','D','Septic shock: suggest <b>IV corticosteroids</b> <span class="mut">(ACE: hydrocortisone 200 mg/day when vasopressor need persists)</span>',SSC],
 ['01-sepsis',10,'dy','D','Start <b>insulin at glucose ≥ 180 mg/dL (10 mmol/L)</b>',SSC],
 ['01-sepsis',10,'dy','E','<b>Restrictive transfusion</b> strategy over liberal',SSC],
 ['01-sepsis',10,'h24','E','<b>Early enteral nutrition within 72 h</b> (suggest)',SSC],
 ['01-sepsis',10,'h24','E','<b>Pharmacological VTE prophylaxis</b> unless contraindicated; pharmacological alone over adding mechanical (dose per CMH formulary)',SSC],
 ['01-sepsis',11,'no','E','Do not use IV vitamin C, blood purification (haemoperfusion, high-dose haemofiltration, plasma exchange) or probiotics (suggest against)',SSC],
 ['02-ards',3,'h6','D','<b>Low tidal volume</b> ventilation (6 mL/kg PBW rather than > 10 mL/kg) with <b>plateau pressure ≤ 30 cmH₂O</b>',ARDS+' · '+SSC],
 ['02-ards',6,'esc','B','P/F < 150 on PEEP ≥ 5 despite optimised settings → <b>prone position</b> (recommended)',ARDS],
 ['02-ards',6,'esc','B','Severe sepsis-ARDS failing conventional ventilation → suggest <b>VV-ECMO</b> in experienced centres',SSC],
 ['02-ards',13,'no','E','No prolonged high-pressure recruitment manoeuvres (≥ 35 cmH₂O for ≥ 1 min)',ARDS],
 ['02-ards',13,'no','E','No routine continuous NMBA infusion in moderate–severe ARDS not due to COVID-19',ARDS],
 ['02-ards',13,'no','E','No ECCO₂R outside randomised trials (ARDS not due to COVID-19)',ARDS],
 ['04-circulatory-shock',0,'h1','C','Use a <b>multimodal approach</b> to identify and assess shock',SH],
 ['04-circulatory-shock',0,'h6','C','<b>Echocardiography first-line</b> imaging for shock type and haemodynamic status (suggest); repeat serially',SH],
 ['04-circulatory-shock',0,'h6','C','Persistent shock after initial fluids: <b>test fluid responsiveness before more fluid</b>; dynamic over static measures; <b>PLR test</b> (ventilated, with or without spontaneous breaths); end-expiratory occlusion test if no spontaneous breaths; PPV/SVV only if no spontaneous breaths and VT ≥ 8 mL/kg',SH],
 ['04-circulatory-shock',0,'h6','D','<b>Individualise the blood pressure target</b>; with central + arterial lines, serial <b>Pv-aCO₂</b>',SH],
 ['04-circulatory-shock',0,'dy','E','Non-bleeding anaemia: <b>restrictive Hb trigger 7 g/dL</b> for most critically ill adults',TR]];
// ---- timers ----
// kind: due (min from admission), every (min interval), daily (by end of each ICU day)
G.TIMER=function(a){const t=(a.t||'').replace(/<[^>]+>/g,'').replace(/&lt;/g,'<').replace(/&gt;/g,'>');let m;
 if(/blood culture/i.test(t)&&/antibiotic/i.test(t))return{k:'due',m:60,l:'Cultures before antibiotics'};
 if(/\b(SBT|sedation break|daily awakening)\b/i.test(t)&&/daily/i.test(t))return{k:'daily',l:'Daily SAT / SBT'};
 if(/^Hourly UO/i.test(t))return{k:'every',m:60,l:'Hourly urine output'};
 if(/obs every 15 min/i.test(t))return{k:'every',m:15,l:'Neuro / vital obs'};
 if(/IAP:.*every 4 h/i.test(t))return{k:'every',m:240,l:'IAP if unstable'};
 if(/repeat every 15/i.test(t))return{k:'every',m:15,l:'Repeat ECG'};
 if(/no benefit|no better|usually|collapse|expected within|Success|not within|shown safe|predict|after 72|q\d|\bthen\b.*\bq/i.test(t))return null;
 if((m=t.match(/(?:within|≤|ideally <|<)\s*(\d+)(?:\s*[–-]\s*\d+)?\s*(h|min)\b/i))){const v=+m[1]*(m[2].toLowerCase()==='h'?60:1);if(v>0&&v<=4320)return{k:'due',m:v,l:t.split(/[:;,(]/)[0].slice(0,38)}}
 return null};
// calculator shortcuts for a plan item
G.SHORT=function(a){const t=(a.t+' '+(a.det||[]).join(' ')).replace(/<[^>]+>/g,'');const s=[];const add=x=>{if(!s.includes(x))s.push(x)};
 if(/PBW|tidal|\bVT\b|\bVt\b/i.test(t))add('pbw');if(/driving pressure|ΔP|Pplat|plateau/i.test(t))add('dp');if(/P\/F|PaO₂\/FiO₂|PaO2\/FiO2|ARDS/i.test(t))add('pf');
 if(/SOFA|organ dysfunction|Sepsis-3/i.test(t))add('sofa');if(/qSOFA|recognise sepsis/i.test(t))add('qsofa');
 if(/noradrenaline|norepinephrine|vasopressor|adrenaline|dobutamine|milrinone|esmolol|vasopressin|mcg\/kg\/min|µg\/kg\/min/i.test(t))add('inf');
 if(/\bMAP\b/.test(t))add('map');if(/\bGCS\b/.test(t))add('gcs');if(/KDIGO|\bAKI\b|SCr|creatinine/i.test(t))add('kdigo');
 if(/Cockcroft|drug dosing|CrCl/i.test(t))add('crcl');if(/anion gap|acid.?base|ABG|\bpH\b|lactate|bicarbonate/i.test(t))add('abg');
 if(/fluid balance|de-resuscitation|positive fluid/i.test(t))add('fb');if(/Atlanta/i.test(t))add('atl');
 if(/30 mL\/kg/.test(t))add('fl30');return s.slice(0,3)};
G.ICUCALC=C;
})(typeof window!=='undefined'?window:globalThis);
