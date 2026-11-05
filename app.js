import * as THREE from "three";
import { GLTFLoader } from "https://cdn.jsdelivr.net/npm/three@0.160.1/examples/jsm/loaders/GLTFLoader.js";
const stage=document.querySelector("#stage"),canvas=document.querySelector("#field"),overlay=document.querySelector("#overlay"),scoreLabel=document.querySelector("#score"),notice=document.querySelector("#notice");
let W=1,H=1,mode="idle",paused=false,score=0,last=0,angle=0,targetAngle=0,elapsed=0,noticeUntil=0;
const speed=115,head=new THREE.Vector3(),goal=new THREE.Vector3(),trail=[];
let renderer;
try{renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:"high-performance"});}catch(e){notice.textContent="Il dispositivo non supporta la grafica 3D WebGL";throw e}
renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.7));renderer.outputColorSpace=THREE.SRGBColorSpace;
const scene=new THREE.Scene();scene.background=new THREE.Color(0x345a24);
const camera=new THREE.OrthographicCamera(-1,1,1,-1,.1,2000);camera.position.set(0,0,650);camera.lookAt(0,0,0);
scene.add(new THREE.HemisphereLight(0xfff5d6,0x283b24,2.2));
const sun=new THREE.DirectionalLight(0xffffff,2.2);sun.position.set(-180,240,300);scene.add(sun);
const grass=new THREE.Mesh(new THREE.PlaneGeometry(2400,2400),new THREE.MeshStandardMaterial({color:0xffffff,roughness:1}));
grass.position.z=-18;scene.add(grass);
new THREE.TextureLoader().load("assets/erba.jpg",t=>{t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(12,12);t.colorSpace=THREE.SRGBColorSpace;grass.material.map=t;grass.material.needsUpdate=true;});
const apple=new THREE.Group();scene.add(apple);
const appleBall=new THREE.Mesh(new THREE.SphereGeometry(17,22,14),new THREE.MeshStandardMaterial({color:0xd71d16,roughness:.23,metalness:.06}));
appleBall.scale.set(.95,1.02,.65);apple.add(appleBall);
const leaf=new THREE.Mesh(new THREE.SphereGeometry(6,12,8),new THREE.MeshStandardMaterial({color:0x3b8a25}));leaf.scale.set(1.8,.55,.2);leaf.position.set(6,18,3);leaf.rotation.z=.45;apple.add(leaf);
const snake=new THREE.Group();scene.add(snake);
const skin=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.68,metalness:0,side:THREE.DoubleSide});
let bodyMesh=null,externalSnake=null,snakeMixer=null,loadedSnake=false;
new GLTFLoader().load("assets/cobra.glb",gltf=>{
 const model=gltf.scene;
 // Il GLB include 32 cubi di controllo Blender: non sono parti del cobra.
 model.traverse(obj=>{if(obj.isMesh&&obj.name!=="COBRA")obj.visible=false;});
 model.updateMatrixWorld(true);
 const cobraMesh=model.getObjectByName("COBRA");
 if(!cobraMesh){console.warn("Mesh COBRA non trovata");return;}
 const bounds=new THREE.Box3().setFromObject(cobraMesh);
 const size=bounds.getSize(new THREE.Vector3());
 const center=bounds.getCenter(new THREE.Vector3());
 const longest=Math.max(size.x,size.y,size.z);
 if(!longest||!Number.isFinite(longest))return;
 const scale=240/longest;
 const centerGroup=new THREE.Group();
 centerGroup.position.copy(center).multiplyScalar(-1);
 centerGroup.add(model);
 const orientation=new THREE.Group();
 const tilt=new THREE.Group();
 tilt.rotation.x=Math.PI/2;
 tilt.add(centerGroup);
 orientation.rotation.z=Math.PI/2;
 orientation.add(tilt);
 const scaled=new THREE.Group();
 scaled.scale.setScalar(scale);
 scaled.add(orientation);
 const pivot=new THREE.Group();
 pivot.add(scaled);
 snake.add(pivot);
 externalSnake=pivot;
 loadedSnake=true;
 headGroup.visible=true;
 if(bodyMesh)bodyMesh.visible=true;
 const clip=gltf.animations.find(x=>x.name==="ArmatureAction");
 if(clip){snakeMixer=new THREE.AnimationMixer(model);snakeMixer.clipAction(clip).play();}
 flash("🐍 Cobra 3D caricato");
},undefined,e=>console.warn("Modello 3D esterno non disponibile",e));

const headGroup=new THREE.Group();snake.add(headGroup);
const headMesh=new THREE.Mesh(new THREE.SphereGeometry(1,24,16),new THREE.MeshStandardMaterial({color:0x9b7245,roughness:.55}));
headMesh.scale.set(24,13,10);headGroup.add(headMesh);
const snout=new THREE.Mesh(new THREE.SphereGeometry(1,18,12),new THREE.MeshStandardMaterial({color:0xb58a56,roughness:.6}));
snout.scale.set(13,9,7);snout.position.x=19;headGroup.add(snout);
for(const s of [-1,1]){const eye=new THREE.Mesh(new THREE.SphereGeometry(3.4,12,10),new THREE.MeshStandardMaterial({color:0x0c0a08,roughness:.12}));eye.position.set(8,s*10,7);headGroup.add(eye);const glint=new THREE.Mesh(new THREE.SphereGeometry(.9,8,8),new THREE.MeshBasicMaterial({color:0xffffff}));glint.position.set(9,s*10.9,9.6);headGroup.add(glint)}
const shade=new THREE.Mesh(new THREE.CircleGeometry(1,32),new THREE.MeshBasicMaterial({color:0x071707,transparent:true,opacity:.27,depthWrite:false}));shade.scale.set(31,15,1);shade.position.z=-10;snake.add(shade);
function resize(){W=stage.clientWidth;H=stage.clientHeight;renderer.setSize(W,H,false);camera.left=-W/2;camera.right=W/2;camera.top=H/2;camera.bottom=-H/2;camera.updateProjectionMatrix();}
function setGoal(){goal.set((Math.random()-.5)*Math.max(120,W-120),(Math.random()-.5)*Math.max(120,H-240),0);apple.position.copy(goal);apple.position.z=4}
function initTrail(){trail.length=0;for(let i=0;i<52;i++){trail.push(new THREE.Vector3(head.x-i*5,head.y+Math.sin(i*.22)*8,0))}}
function start(m){mode=m;paused=false;score=0;scoreLabel.textContent="0";head.set(-W*.2,0,0);angle=0;targetAngle=0;elapsed=0;initTrail();setGoal();overlay.classList.add("hidden");document.querySelector("#pause").textContent="⏸";last=0}
document.querySelector("#start").onclick=()=>start("play");document.querySelector("#demo").onclick=()=>start("demo");
document.querySelector("#auto").onclick=()=>{if(mode==="idle")start("demo");else{mode=mode==="demo"?"play":"demo";flash(mode==="demo"?"Modalità automatica":"Controllo manuale")}};
document.querySelector("#pause").onclick=()=>{if(mode==="idle")return;paused=!paused;document.querySelector("#pause").textContent=paused?"▶":"⏸"};
document.querySelector("#fullscreen").onclick=async()=>{try{if(!document.fullscreenElement)await stage.requestFullscreen();else await document.exitFullscreen()}catch(e){flash("Schermo intero non disponibile")}};
const dirs={up:Math.PI/2,down:-Math.PI/2,left:Math.PI,right:0};
function steer(a){if(mode==="play")targetAngle=a}
document.querySelectorAll("[data-dir]").forEach(b=>b.addEventListener("pointerdown",e=>{e.preventDefault();steer(dirs[b.dataset.dir])}));
window.addEventListener("keydown",e=>{const d={ArrowUp:"up",ArrowDown:"down",ArrowLeft:"left",ArrowRight:"right",w:"up",s:"down",a:"left",d:"right"}[e.key];if(d){e.preventDefault();steer(dirs[d])}});
let touch=null;canvas.addEventListener("pointerdown",e=>{touch={x:e.clientX,y:e.clientY}});canvas.addEventListener("pointerup",e=>{if(!touch)return;const dx=e.clientX-touch.x,dy=e.clientY-touch.y;if(Math.hypot(dx,dy)>20)steer(Math.atan2(-dy,dx));touch=null});
function flash(t){notice.textContent=t;noticeUntil=performance.now()+1400}
function bodyGeometry(){const pts=[];for(let i=0;i<trail.length;i+=2){const p=trail[i].clone();const f=i/(trail.length-1);p.y+=Math.sin(elapsed*7-i*.36)*Math.sin(f*Math.PI)*3;pts.push(p)}if(pts.length<4)return;
const curve=new THREE.CatmullRomCurve3(pts);const segments=65,sides=10;const positions=[],colors=[],indices=[];
const tan=new THREE.Color(0xb98b54),brown=new THREE.Color(0x33251b),gold=new THREE.Color(0xe2b476);
for(let i=0;i<=segments;i++){const t=i/segments,p=curve.getPoint(t),tangent=curve.getTangent(t);const normal=new THREE.Vector3(-tangent.y,tangent.x,0).normalize();const taper=Math.pow(Math.max(.018,1-t),.65);const radius=(11+5*Math.sin(Math.PI*t))*taper;for(let j=0;j<=sides;j++){const a=j/sides*Math.PI*2;const q=p.clone().addScaledVector(normal,Math.cos(a)*radius);q.z+=Math.sin(a)*radius*.78+2;positions.push(q.x,q.y,q.z);
const bands=Math.sin(t*18*Math.PI)+.35*Math.sin(t*37*Math.PI);const patch=Math.sin(a*3+t*47);const c=bands>.08&&patch>-.72?brown:((patch>.4)?gold:tan);colors.push(c.r,c.g,c.b);
if(i<segments&&j<sides){const k=i*(sides+1)+j;indices.push(k,k+sides+1,k+1,k+1,k+sides+1,k+sides+2)}}}
const g=new THREE.BufferGeometry();g.setAttribute("position",new THREE.Float32BufferAttribute(positions,3));g.setAttribute("color",new THREE.Float32BufferAttribute(colors,3));g.setIndex(indices);g.computeVertexNormals();if(bodyMesh){snake.remove(bodyMesh);bodyMesh.geometry.dispose()}bodyMesh=new THREE.Mesh(g,skin);snake.add(bodyMesh)}
function frame(t){requestAnimationFrame(frame);const dt=last?Math.min((t-last)/1000,.04):0;last=t;
if(mode!=="idle"&&!paused){elapsed+=dt;if(mode==="demo")targetAngle=Math.atan2(goal.y-head.y,goal.x-head.x);
const diff=Math.atan2(Math.sin(targetAngle-angle),Math.cos(targetAngle-angle));angle+=THREE.MathUtils.clamp(diff,-3.1*dt,3.1*dt);
head.x+=Math.cos(angle)*speed*dt;head.y+=Math.sin(angle)*speed*dt;
if(Math.abs(head.x)>W/2+25||Math.abs(head.y)>H/2+25){head.x=THREE.MathUtils.clamp(head.x,-W/2+30,W/2-30);head.y=THREE.MathUtils.clamp(head.y,-H/2+30,H/2-30);targetAngle=Math.atan2(-head.y,-head.x)}
trail.unshift(head.clone());while(trail.length>65)trail.pop();
if(head.distanceTo(goal)<35){score++;scoreLabel.textContent=score;setGoal();flash("🍎 Bravo!")}}
headGroup.position.copy(head);headGroup.position.z=13;headGroup.rotation.z=angle;shade.position.set(head.x,head.y,-9);
if(trail.length>3)bodyGeometry();if(loadedSnake&&snakeMixer&&!paused&&mode!=="idle")snakeMixer.update(dt);if(externalSnake){externalSnake.position.set(head.x,head.y,0);externalSnake.rotation.z=angle}apple.rotation.z=Math.sin(t*.001)*.08;
renderer.render(scene,camera);if(t>noticeUntil)notice.textContent=""}
window.addEventListener("resize",resize);resize();head.set(-70,0,0);initTrail();setGoal();requestAnimationFrame(frame);
