"use strict";
const canvas=document.querySelector("#field"),ctx=canvas.getContext("2d"),stage=document.querySelector("#stage"),overlay=document.querySelector("#overlay"),scoreLabel=document.querySelector("#score"),notice=document.querySelector("#notice");
const assets={};for(const [k,f] of Object.entries({grass:"erba.jpg",snake:"pitone.png",apple:"mela.png"})){const im=new Image();im.src="assets/"+f;assets[k]=im}
let W=0,H=0,head={x:0,y:0},angle=0,goal={x:0,y:0},score=0,mode="idle",paused=false,last=0,noticeUntil=0,keys={};
const speed=125;
function resize(){const d=Math.min(devicePixelRatio||1,2);W=stage.clientWidth;H=stage.clientHeight;canvas.width=Math.round(W*d);canvas.height=Math.round(H*d);ctx.setTransform(d,0,0,d,0,0);if(mode==="idle"){head={x:W*.48,y:H*.5};goal={x:W*.75,y:H*.4}}}
function randomGoal(){goal={x:Math.max(55,Math.random()*(W-110)+55),y:Math.max(120,Math.random()*(H-240)+120)}}
function start(m){mode=m;paused=false;score=0;scoreLabel.textContent="0";head={x:W*.42,y:H*.5};angle=0;randomGoal();overlay.classList.add("hidden");document.querySelector("#pause").textContent="⏸";last=0}
document.querySelector("#start").onclick=()=>start("play");document.querySelector("#demo").onclick=()=>start("demo");
document.querySelector("#auto").onclick=()=>{if(mode==="idle")start("demo");else{mode=mode==="demo"?"play":"demo";flash(mode==="demo"?"Modalità automatica":"Controllo manuale")}};
document.querySelector("#pause").onclick=()=>{if(mode==="idle")return;paused=!paused;document.querySelector("#pause").textContent=paused?"▶":"⏸"};
document.querySelector("#fullscreen").onclick=async()=>{try{if(!document.fullscreenElement)await stage.requestFullscreen();else await document.exitFullscreen()}catch(e){flash("Schermo intero non disponibile")}};
const dirs={up:-Math.PI/2,down:Math.PI/2,left:Math.PI,right:0};
document.querySelectorAll("[data-dir]").forEach(b=>{b.addEventListener("pointerdown",e=>{e.preventDefault();if(mode==="play")angle=dirs[b.dataset.dir]})});
window.addEventListener("keydown",e=>{const dir={ArrowUp:"up",ArrowDown:"down",ArrowLeft:"left",ArrowRight:"right",w:"up",s:"down",a:"left",d:"right"}[e.key];if(dir){e.preventDefault();if(mode==="play")angle=dirs[dir]}});
let touch=null;canvas.addEventListener("touchstart",e=>{touch={x:e.touches[0].clientX,y:e.touches[0].clientY}},{passive:true});
canvas.addEventListener("touchend",e=>{if(!touch||mode!=="play")return;const dx=e.changedTouches[0].clientX-touch.x,dy=e.changedTouches[0].clientY-touch.y;if(Math.hypot(dx,dy)>22)angle=Math.atan2(dy,dx);touch=null},{passive:true});
function flash(t){notice.textContent=t;noticeUntil=performance.now()+1400}
function drawBackground(){if(assets.grass.complete&&assets.grass.naturalWidth){const p=ctx.createPattern(assets.grass,"repeat");ctx.fillStyle=p;ctx.fillRect(0,0,W,H)}else{ctx.fillStyle="#376126";ctx.fillRect(0,0,W,H)}}
function draw(){ctx.clearRect(0,0,W,H);drawBackground();if(assets.apple.complete&&assets.apple.naturalWidth){ctx.drawImage(assets.apple,goal.x-27,goal.y-31,54,60)}else{ctx.fillStyle="red";ctx.beginPath();ctx.arc(goal.x,goal.y,18,0,Math.PI*2);ctx.fill()}
if(assets.snake.complete&&assets.snake.naturalWidth){const size=Math.min(360,Math.max(220,W*.38));ctx.save();ctx.translate(head.x,head.y);ctx.rotate(angle);ctx.drawImage(assets.snake,-size*.82,-size*.25,size,size*.5);ctx.restore()}else{ctx.fillStyle="#ad8552";ctx.beginPath();ctx.arc(head.x,head.y,16,0,Math.PI*2);ctx.fill()}}
function tick(t){if(!last)last=t;const dt=Math.min((t-last)/1000,.05);last=t;if(mode!=="idle"&&!paused){if(mode==="demo"){const target=Math.atan2(goal.y-head.y,goal.x-head.x);let diff=Math.atan2(Math.sin(target-angle),Math.cos(target-angle));angle+=Math.max(-2.8*dt,Math.min(2.8*dt,diff))}head.x+=Math.cos(angle)*speed*dt;head.y+=Math.sin(angle)*speed*dt;head.x=(head.x+W)%W;head.y=(head.y+H)%H;if(Math.hypot(head.x-goal.x,head.y-goal.y)<33){score++;scoreLabel.textContent=score;randomGoal();flash("🍎 Bravo!")} }draw();if(t>noticeUntil)notice.textContent="";requestAnimationFrame(tick)}
window.addEventListener("resize",resize);resize();requestAnimationFrame(tick);
