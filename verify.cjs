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

