// 1) Paste your Google Apps Script web app URL here (see README).
const API="https://script.google.com/macros/s/AKfycbw6CXXKzylhJ3wHJWTFXqCdf44i0ZkqYTBv82DxSsGcBF7sNH8rbQwKt9lqaNB4g42K/exec";
const G=["A+","A-","B+","B-","AB+","AB-","O+","O-"];
const CAN={"O-":["O-"],"O+":["O+","O-"],"A-":["A-","O-"],"A+":["A+","A-","O+","O-"],"B-":["B-","O-"],"B+":["B+","B-","O+","O-"],"AB-":["AB-","A-","B-","O-"],"AB+":G};
const $=i=>document.getElementById(i);
const el=(t,c,x)=>{const e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e};
const q=p=>fetch(API+"?"+new URLSearchParams(p)).then(r=>r.json());
const post=b=>fetch(API,{method:"POST",body:JSON.stringify(b)}).then(r=>r.json());
let need="O-";

function tiles(){const t=$("tiles");t.innerHTML="";G.forEach(g=>{const b=el("button",0,g);b.type="button";b.setAttribute("aria-pressed",g===need);b.onclick=()=>{need=g;tiles()};t.appendChild(b)})}
if($("g"))G.forEach(g=>{const o=el("option",0,g);o.value=g;$("g").appendChild(o)});
if($("tiles"))tiles();

let pos=null;
function locate(){return new Promise(ok=>{if(!navigator.geolocation)return ok(null);navigator.geolocation.getCurrentPosition(p=>{pos={lat:p.coords.latitude,lng:p.coords.longitude};ok(pos)},()=>ok(null),{timeout:10000,maximumAge:300000})})}
async function search(){
  const r=$("res");r.innerHTML="";
  if(false){r.appendChild(el("div","note","Connect the site to your Google Sheet first. See README.md."));return}
  $("go").disabled=true;r.appendChild(el("div","note","Searching..."));
  try{
    const groups=$("compat").checked?CAN[need]:[need];
    const L=pos||await locate();
    const list=await q(Object.assign({action:"search",groups:groups.join(","),city:$("city").value.trim()},L?{lat:L.lat,lng:L.lng}:{}));
    r.innerHTML="";
    if(!list.length){r.appendChild(el("div","note","No available donors found for "+need+(groups.length>1?" or compatible groups":"")+". Try a wider area, or post the request in your community while you contact the nearest blood bank."));return}
    if(!L){list.sort((a,b)=>(b.group===need)-(a.group===need)||b.n-a.n);r.appendChild(el("div","sm","Location is off, so distances are not shown. Allow location access in your browser to see the nearest donors first."))}
    let k=0;list.forEach(d=>{
      const row=el("div","row"),i=el("div");row.style.animationDelay=(k++*70)+"ms";
      i.append(el("div","nm",d.name),el("div","sm",(d.km!=null?d.km+" km away - ":"")+[d.area,d.city].filter(Boolean).join(", ")+(d.n?" - "+d.n+" donation"+(d.n>1?"s":""):"")));
      if(d.group===need)i.firstChild.appendChild(el("span","pill","Exact match"));
      const act=el("div","act"),b=el("button","btn alt","Contact");
      b.onclick=async()=>{b.disabled=true;const x=await q({action:"contact",id:d.id});act.innerHTML="";
        if(x.phone){const ph=String(x.phone).replace(/[^\d+]/g,""),c=el("a","btn","Call "+x.phone);c.href="tel:"+ph;
          const w=el("a","btn alt","WhatsApp");w.style.marginLeft="8px";w.target="_blank";w.rel="noopener";
          w.href="https://wa.me/"+ph.replace("+","")+"?text="+encodeURIComponent("Hello "+d.name+", I found you on RaktSetu. We urgently need "+need+" blood. Can you help?");act.append(c,w)}
        else act.appendChild(el("span","sm",x.error||"Unavailable"))};
      act.appendChild(b);row.append(el("div","grp",d.group),i,act);r.appendChild(row)});
  }catch(e){r.innerHTML="";r.appendChild(el("div","note","Could not reach the server. Check your connection and try again."))}
  $("go").disabled=false;
}
if($("go")){$("go").onclick=search;$("city").addEventListener("keydown",e=>{if(e.key==="Enter")search()})}

function rankList(id,items,fn,empty){const o=$(id);o.innerHTML="";if(!items.length){o.appendChild(el("li","sm",empty));return}items.forEach((x,i)=>{o.appendChild(fn(x,i))})}
async function boards(){
  if(false)return;
  try{
    rankList("lb",await q({action:"board"}),(d,i)=>{const l=el("li");const s=el("div");s.append(el("div","nm",d.name),el("div","sm",d.group+", "+d.city));l.append(el("span","rk",i+1),s,el("span","ct",d.n));return l},"No donations recorded yet. Be the first.");
    rankList("fd",await q({action:"feed"}),d=>{const l=el("li");const s=el("div");s.append(el("div","nm",d.donor+" donated blood"),el("div","sm","For "+d.recipient+" on "+d.date));l.append(s);return l},"Nothing yet.");
  }catch(e){}
}
if($("lb"))boards();

if($("reg")){
function readFile(f){return new Promise((ok,no)=>{const r=new FileReader();r.onload=()=>ok({name:f.name,type:f.type,data:r.result.split(",")[1]});r.onerror=no;r.readAsDataURL(f)})}
function say(box,t,ok){box.className="msg "+(ok?"ok":"err");box.textContent=t}
let mine=null;
async function detect(){const s=$("ls");s.textContent="Detecting your location...";const L=await locate();
  if(!L){s.textContent="Could not get your location. Allow location access in your browser, or register without it. You will then be listed after nearer donors.";return}
  mine={lat:Math.round(L.lat*1000)/1000,lng:Math.round(L.lng*1000)/1000};s.textContent="Location captured.";
  try{const a=(await fetch("https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=14&lat="+L.lat+"&lon="+L.lng).then(r=>r.json())).address||{};
    if(!$("c").value)$("c").value=a.city||a.town||a.village||a.state_district||"";if(!$("a").value)$("a").value=a.suburb||a.neighbourhood||""}catch(e){}}
$("loc").onclick=detect;
let asked=false;$("reg").addEventListener("focusin",()=>{if(!asked&&!mine){asked=true;detect()}});
$("reg").addEventListener("submit",async ev=>{
  ev.preventDefault();const m=$("rm"),f=$("f").files[0];
  if(false)return say(m,"Connect the site to your Google Sheet first. See README.md.");
  if(!f)return say(m,"Please attach your blood group certificate.");
  if(f.size>3e6)return say(m,"The certificate file is larger than 3 MB. Please attach a smaller photo or PDF.");
  $("sub").disabled=true;m.className="msg hide";
  try{
    const r=await post({action:"register",name:$("n").value.trim(),email:$("e").value.trim(),phone:$("p").value.trim(),group:$("g").value,city:$("c").value.trim(),area:$("a").value.trim(),lat:mine&&mine.lat,lng:mine&&mine.lng,cert:await readFile(f)});
    if(r.ok){say(m,"Almost done. Check your email and tap the confirmation link. Your profile goes live after we verify your certificate.",1);$("reg").reset()}
    else say(m,r.error||"Something went wrong. Please try again.");
  }catch(e){say(m,"Could not reach the server. Please try again.")}
  $("sub").disabled=false;
});
}

// Donor management page: opened from the link in the confirmation email (?manage=TOKEN)
const tok=new URLSearchParams(location.search).get("manage");
if($("manage")&&tok)(async()=>{
  const box=$("manage"),p=box.firstChild,d=await q({action:"me",token:tok});box.classList.remove("hide");
  if(d.error){p.appendChild(el("h2",0,"This link is not valid"));return}
  p.append(el("h2",0,"Hello, "+d.name),el("p","sm",d.live?"Your profile is live. Donations recorded: "+d.n+".":"Your profile is not live yet. It appears after email confirmation and certificate approval."));
  const f=el("div","f");f.style.marginTop="12px";
  const r=el("div");r.innerHTML='<label for="rc">Who did you donate for? (optional)</label><input id="rc" placeholder="Patient name or hospital">';
  const b=el("button","btn","I donated blood today"),t=el("button","btn alt",d.available?"Pause my profile":"Make me available"),m=el("div","msg hide");
  b.onclick=async()=>{b.disabled=true;const x=await post({action:"donated",token:tok,recipient:r.querySelector("input").value.trim()});say(m,x.ok?"Thank you. You are hidden from search for 90 days and will reappear automatically.":x.error,x.ok)};
  t.onclick=async()=>{const x=await post({action:"available",token:tok,value:t.textContent.startsWith("Make")});say(m,x.ok?"Updated. Reload to see the change.":x.error,x.ok)};
  const lb=el("button","btn alt","Update my location");
  lb.onclick=async()=>{const L=await locate();if(!L)return say(m,"Could not get your location. Allow location access and try again.");
    const x=await post({action:"location",token:tok,lat:Math.round(L.lat*1000)/1000,lng:Math.round(L.lng*1000)/1000});say(m,x.ok?"Location updated.":x.error,x.ok)};
  f.append(r,b,t,lb);p.append(f,m);box.scrollIntoView();
})();

// scroll reveal for text and images
const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add("in");io.unobserve(e.target)}}),{threshold:.15});
document.querySelectorAll(".rv").forEach(n=>io.observe(n));
