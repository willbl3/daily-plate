// No dependencies. Exercise the real app's calculation and persistence logic in an isolated DOM stub.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const elements=new Map(),memory=new Map();
function el(id){if(!elements.has(id))elements.set(id,{value:({servings:'1',eaten:'1',mealType:'Lunch',units:'imperial',direction:'cut'}[id]||''),hidden:false,style:{setProperty(){}},classList:{toggle(){}},firstChild:{},addEventListener(){},scrollIntoView(){},textContent:'',innerHTML:''});return elements.get(id);}
const context={console,document:{getElementById:el,querySelectorAll:()=>[],querySelector:()=>el('dummy'),createElement:()=>({click(){}})},localStorage:{getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)},window:{scrollTo(){},addEventListener(){}},crypto:require('node:crypto').webcrypto,structuredClone,confirm:()=>true,setTimeout:()=>0,clearTimeout(){},URL,Blob};
vm.createContext(context);vm.runInContext(fs.readFileSync('app.js','utf8'),context);
function run(code){return vm.runInContext(code,context);}
let count=0;function test(name,fn){fn();count++;console.log('PASS '+name);}
const profile={units:'imperial',weight:190,height:72,age:22,sex:'male',activity:1.55,direction:'cut',pace:1,tolerance:5,override:null};context.profile=profile;
test('Mifflin calculation / cut target',()=>{const g=run('calculate(profile)');assert.equal(g.maintenance,2945);assert.equal(g.k,2440);assert.equal(g.p,155);assert.equal(g.f,68);});
test('Metric and imperial parity',()=>{assert.equal(run('calculate({...profile,units:"metric",weight:190*.45359237,height:182.88}).k'),2440);});
test('Maintain and gain targets',()=>{assert.equal(run('calculate({...profile,direction:"maintain"}).k'),2940);assert.equal(run('calculate({...profile,direction:"gain",pace:.5}).k'),3190);});
test('Aggressive pace cap and low-calorie floor',()=>{assert.equal(run('calculate({...profile,pace:2}).k'),2210);assert.equal(run('calculate({...profile,weight:100,height:60,age:60,activity:1.2,pace:2}).k'),1500);assert.throws(()=>run('calculate({...profile,override:1000})'));});
test('Weighted recipe and portion math',()=>{const t=run('mealTotals({servings:3,eaten:1,items:[{k:165,p:31,c:0,f:3.6,basis:100,qty:6,unit:"oz"},{k:130,p:2.7,c:28.2,f:.3,basis:100,qty:300,unit:"g"}]})');assert.ok(Math.abs(t.k-223.5534263125)<.001);assert.ok(Math.abs(t.p-20.2767043375)<.001);});
test('Fast food serving multiplication',()=>{assert.equal(run('mealTotals({servings:1,eaten:1,items:[{...fast[0],qty:2,unit:"serving"}]}).k'),840);});
run('state.goals=[{date:"2026-01-01",k:2000,tolerance:5},{date:today,k:2400,tolerance:5}];state.days[today]={complete:true,meals:[{servings:1,eaten:1,items:[{k:2400,p:150,c:300,f:60,basis:1,qty:1,unit:"serving"}]}]};');
test('Goal date history preserved',()=>{assert.equal(run('goalAt("2026-01-02").k'),2000);assert.equal(run('goalAt(today).k'),2400);});
test('Green, red, pending and empty calendar states',()=>{assert.equal(run('dayStatus(today)'),'green');run('state.days[today].meals[0].items[0].k=1000');assert.equal(run('dayStatus(today)'),'red');run('state.days[today].complete=false');assert.equal(run('dayStatus(today)'),'pending');assert.equal(run('dayStatus("2026-01-03")'),'neutral');});
test('HTML escaping of custom names',()=>assert.equal(run('esc("<img onerror=alert(1)>")'),'&lt;img onerror=alert(1)&gt;'));
test('Malformed backups rejected',()=>{assert.throws(()=>run('validate({})'));assert.throws(()=>run('validate({version:1,days:{"2026-02-31":{complete:false,meals:[]}},goals:[],custom:[]})'));});
test('Meal saves and local persistence',()=>{run('state={version:1,days:{},goals:[],custom:[]};addFood(foods[0]);');el('mealName').value='Test meal';el('saveMeal').onclick();assert.equal(run('state.days[today].meals.length'),1);assert.equal(run('totals(state.days[today]).k'),165);assert.equal(JSON.parse(memory.get('daily-plate-v1')).days[run('today')].meals[0].name,'Test meal');assert.equal(run('draft.length'),0);});
test('Valid exported data can be reloaded',()=>{context.backup=memory.get('daily-plate-v1');assert.equal(run('validate(JSON.parse(backup)).version'),1);});
test('Full year calendar renders 12 months and leap day',()=>{run('year=2028;renderCalendar()');assert.equal((el('months').innerHTML.match(/class="card month"/g)||[]).length,12);assert.ok(el('months').innerHTML.includes('data-date="2028-02-29"'));});
console.log(`${count} checks passed.`);

// Exercise the upgrade with a minimal DOM surface, without network or user data.
for(const element of elements.values()){
 element.closest=()=>({insertBefore(){}});element.setAttribute=()=>{};element.getAttribute=()=>'';
 element.showModal=()=>{element.open=true;};element.close=()=>{element.open=false;};element.reset=()=>{};
 element.classList.add=()=>{};element.classList.remove=()=>{};element.querySelector=()=>({onclick:null,setAttribute(){}});
}
const originalEl=el;
context.document.getElementById=id=>{const e=originalEl(id);e.closest??=()=>({insertBefore(){}});e.setAttribute??=()=>{};e.getAttribute??=()=>'';e.showModal??=()=>{e.open=true;};e.close??=()=>{e.open=false;};e.reset??=()=>{};e.classList.add??=()=>{};e.classList.remove??=()=>{};return e;};
context.document.addEventListener=()=>{};
context.document.createElement=()=>({className:'',innerHTML:'',querySelector:()=>({setAttribute(){}})});
context.setInterval=()=>{};context.navigator={onLine:true};context.document.visibilityState='visible';
context.localStorage.removeItem=k=>memory.delete(k);
run(fs.readFileSync('food-data.js','utf8'));run(fs.readFileSync('extras.js','utf8'));
test('Weight conversion round trip',()=>assert.ok(Math.abs(run('weightIn(toKg(190,"lb"),"lb")')-190)<.00001));
test('Weight-only day remains neutral in calorie calendar',()=>{run('state.days[today]={complete:false,meals:[],weight:{kg:80,note:"test"}}');assert.equal(run('dayStatus(today)'),'neutral');});
test('Weigh-in trend uses an actual seven-calendar-day window',()=>{run('state.days={"2026-10-01":{complete:false,meals:[],weight:{kg:90,note:""}},"2026-10-15":{complete:false,meals:[],weight:{kg:80,note:""}},"2026-10-17":{complete:false,meals:[],weight:{kg:82,note:""}}}');assert.equal(run('weightStats().average'),81);assert.equal(run('weightStats().latest'),82);});
test('Every meal-prep recipe has valid ingredients and positive portion macros',()=>{assert.ok(run('prepRecipes.every(r=>r.items.every(validFood)&&mealTotals({...r,eaten:1}).k>0)'));});
test('Saved recipes and weights survive backup validation',()=>{assert.equal(run('validate({...state,recipes:[prepRecipes[0]]}).recipes.length'),1);});
test('Malformed recipe quantities and weights rejected',()=>{assert.throws(()=>run('validate({...state,recipes:[{...prepRecipes[0],items:[{...prepRecipes[0].items[0],qty:-1}]}]})'));assert.throws(()=>run('validate({...state,days:{[today]:{complete:false,meals:[],weight:{kg:NaN,note:""}}}})'));});
test('Food catalog includes tacos and spaghetti with labeled estimate ranges',()=>{assert.ok(run('research.commonMeals.some(m=>m.name==="Tacos"&&m.calorieRange.length===2)'));assert.ok(run('research.commonMeals.some(m=>m.name==="Spaghetti"&&m.kind==="rough estimate")'));});
test('Local directory has broad coverage and every listing has a source',()=>assert.ok(run('places.length>=70&&places.every(p=>p.source&&p.locationUrl)')));
run(fs.readFileSync('accounts.js','utf8'));
test('Account caches use distinct keys',()=>assert.notEqual(run('accountKey("user-a")'),run('accountKey("user-b")')));
console.log(`${count} total functional checks passed.`);

// Workout and Apple Health import regression checks.
context.TextDecoder=TextDecoder;context.TextEncoder=TextEncoder;
el('workoutKind').value='walk';el('workoutMinutes').value='30';el('workoutEffort').value='moderate';
run(fs.readFileSync('activity.js','utf8'));
run('state={version:1,days:{},goals:[calculate(profile)],custom:[],recipes:[]};state.days[today]={complete:false,meals:[{id:"meal",name:"Food",type:"Lunch",servings:1,eaten:1,items:[{name:"Food",k:1000,p:50,c:100,f:20,basis:1,qty:1,unit:"serving"}]}],workouts:[{id:"w1",name:"Run",minutes:30,activeKcal:300,source:"manual"},{id:"w2",name:"Walk",minutes:30,activeKcal:200,source:"manual"}]};');
test('Calories out adds resting plus workout active calories',()=>{assert.equal(run('dailyBalance(today).out'),2400);assert.equal(run('dailyBalance(today).net'),-1400);});
test('Move ring replaces rather than doubles workout calories',()=>{run('state.days[today].activity={moveKcal:600,source:"manual",sourceName:"Move ring"}');assert.equal(run('dailyBalance(today).active'),600);assert.equal(run('dailyBalance(today).out'),2500);});
test('Explicit resting energy replaces the profile estimate',()=>{run('state.days[today].activity.restingKcal=1800');assert.equal(run('dailyBalance(today).out'),2400);});
test('Zero Move calories is a valid daily override',()=>{run('state.days[today].activity.moveKcal=0');assert.equal(run('dailyBalance(today).active'),0);});
test('Net workout estimate excludes resting calories',()=>assert.equal(run('workoutBurn("walk","moderate",30,80)'),105));
test('Missing profile/resting calories produces unknown total out',()=>{run('state.goals=[];delete state.days[today].activity');assert.equal(run('dailyBalance(today).out'),null);});
test('Apple energy units convert correctly',()=>{assert.ok(Math.abs(run('healthEnergy(418.4,"kJ")')-100)<.001);assert.equal(run('healthEnergy(4184,"J")'),1);assert.equal(run('healthEnergy(10,"unknown")'),null);});
context.fixtureXML=`<?xml version="1.0"?><HealthData locale="en_US">
<Record type="HKQuantityTypeIdentifierActiveEnergyBurned" sourceName="My Watch" device="&lt;HKDevice > watch&gt;" unit="kcal" startDate="2026-10-17 10:00:00 -0500" endDate="2026-10-17 10:05:00 -0500" value="100"/>
<Record type="HKQuantityTypeIdentifierActiveEnergyBurned" sourceName="My Watch" device="&lt;HKDevice > watch&gt;" unit="kcal" startDate="2026-10-17 10:00:00 -0500" endDate="2026-10-17 10:05:00 -0500" value="100"/>
<Record type="HKQuantityTypeIdentifierActiveEnergyBurned" sourceName="My Phone" unit="kcal" startDate="2026-10-17 10:00:00 -0500" endDate="2026-10-17 10:05:00 -0500" value="900"/>
<Record type="HKQuantityTypeIdentifierBasalEnergyBurned" sourceName="My Watch" unit="kcal" startDate="2026-10-17 00:00:00 -0500" endDate="2026-10-17 23:59:00 -0500" value="1600"/>
<Record type="HKQuantityTypeIdentifierActiveEnergyBurned" sourceName="My Watch" unit="kcal" startDate="2020-10-17 10:00:00 -0500" value="999"/>
<ActivitySummary dateComponents="2026-10-17" activeEnergyBurned="600" activeEnergyBurnedGoal="500" activeEnergyBurnedUnit="kcal" appleExerciseTime="45"/>
<Workout workoutActivityType="HKWorkoutActivityTypeRunning" sourceName="My Watch" duration="30" durationUnit="min" startDate="2026-10-17 10:00:00 -0500" endDate="2026-10-17 10:30:00 -0500"><WorkoutStatistics type="HKQuantityTypeIdentifierActiveEnergyBurned" sum="300" unit="kcal"/></Workout>
</HealthData>`;
run('var sampleReader=makeHealthReader("2026-10-16","2026-10-18");for(var i=0;i<fixtureXML.length;i+=73)sampleReader.push(fixtureXML.slice(i,i+73));sampleReader.push("",true);pendingHealth=sampleReader.result();');
test('Streaming XML handles split tags, dates and exact sample duplicates',()=>{assert.equal(run('pendingHealth.sources.get("My Watch").get("2026-10-17").moveKcal'),100);assert.equal(run('pendingHealth.sources.get("My Watch").size'),1);});
test('Health import uses ring summary and one selected energy source',()=>{assert.equal(run('reviewedHealth("My Watch").get("2026-10-17").moveKcal'),600);assert.equal(run('reviewedHealth("My Watch").get("2026-10-17").restingKcal'),1600);});
test('Modern Apple workout statistics are read without duplicating the ring',()=>assert.equal(run('reviewedHealth("My Watch").get("2026-10-17").workouts[0].activeKcal'),300));
test('Non-Health XML is rejected',()=>assert.throws(()=>run('makeHealthReader("2026-01-01",today).push("<other/>",true)')));
test('Reimport preserves meals and weight and does not duplicate workouts',()=>{run('state.days["2026-10-17"]={complete:false,meals:structuredClone(state.days[today].meals),weight:{kg:80,note:"kept"}}');el('healthSource').value='My Watch';el('confirmHealthImport').onclick();run('pendingHealth=sampleReader.result()');el('confirmHealthImport').onclick();assert.equal(run('state.days["2026-10-17"].workouts.length'),1);assert.equal(run('state.days["2026-10-17"].meals.length'),1);assert.equal(run('state.days["2026-10-17"].weight.kg'),80);assert.equal(run('dailyBalance("2026-10-17").out'),2200);});
test('Workout/activity fields round trip and reject bad values',()=>{assert.equal(run('validate(JSON.parse(JSON.stringify(state))).days["2026-10-17"].activity.moveKcal'),600);assert.throws(()=>run('validate({...state,days:{[today]:{complete:false,meals:[],activity:{source:"manual",sourceName:"test",moveKcal:-1}}}})'));});
context.setTimeout=(fn,ms)=>ms===0?setTimeout(fn,0):0;
run(fs.readFileSync('vendor-fflate.js','utf8'));context.window.fflate=context.fflate;
(async()=>{
 const zip=run('fflate.zipSync({"apple_health_export/export.xml":new TextEncoder().encode(fixtureXML),"apple_health_export/other.xml":new TextEncoder().encode("ignored")})');
 const blob=new Blob([zip]);blob.name='export.zip';context.zipFixture=blob;
 const parsed=await run('readHealthFile(zipFixture,"2026-10-16","2026-10-18",()=>{})');
 assert.equal(parsed.summaries.get('2026-10-17').moveKcal,600);count++;console.log('PASS ZIP import extracts export.xml and reads ring summaries');
 console.log(`${count} total checks passed.`);
})().catch(e=>{console.error(e);process.exitCode=1;});

