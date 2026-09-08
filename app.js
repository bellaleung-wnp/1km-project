import * as THREE from './three.module.js';
import { stories } from './stories.js';
const $ = id => document.getElementById(id);
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
let selected = 0, pendingOpen = null, engaged = false;
const storyDialog=$('storyDialog'), indexDialog=$('indexDialog'), helpDialog=$('helpDialog');
const modals=[storyDialog,indexDialog,helpDialog];
const engage=()=>{engaged=true;$('intro').classList.add('gone');$('world').style.opacity='1';};
$('world').style.opacity='.35';
$('world').style.transition='opacity .6s';
for(const dialog of modals){dialog.querySelector('.close').onclick=()=>dialog.close();dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});}
function showStory(i){selected=(i+stories.length)%stories.length;const s=stories[selected];$('storyMeta').textContent=`${s.author} — ${s.place}`;$('storyTitle').textContent=s.title;$('storyBody').textContent=s.body;if(!storyDialog.open)storyDialog.showModal();}
$('previous').onclick=()=>focusStory(selected-1,true);$('next').onclick=()=>focusStory(selected+1,true);
$('indexButton').onclick=()=>indexDialog.showModal();$('fallbackIndex').onclick=()=>indexDialog.showModal();$('help').onclick=()=>helpDialog.showModal();
stories.forEach((s,i)=>{const b=document.createElement('button');const n=document.createElement('span');n.textContent=String(i+1).padStart(2,'0');b.append(n,document.createTextNode(s.title));b.onclick=()=>{indexDialog.close();focusStory(i);};$('storyList').append(b);});
let scene,camera,renderer,world,raycaster;
const home={yaw:-.18,pitch:0,distance:33};
const view={...home}, goal={...home};
const velocity={x:0,y:0}, nodes=[], anchors=[];
const clamp=THREE.MathUtils.clamp;
function focusStory(i,immediate=false){engage();selected=(i+stories.length)%stories.length;const a=anchors[selected];if(a){const desired=-a.angle;goal.yaw=view.yaw+Math.atan2(Math.sin(desired-view.yaw),Math.cos(desired-view.yaw));goal.pitch=clamp(Math.atan2(a.y,16),-.55,.55);goal.distance=26;velocity.x=velocity.y=0;}
 clearTimeout(pendingOpen);pendingOpen=null;if(immediate||reduced||!renderer)showStory(selected);else pendingOpen=setTimeout(()=>{pendingOpen=null;showStory(selected);},650);
}
function cancelPending(){clearTimeout(pendingOpen);pendingOpen=null;}
function reset(){cancelPending();goal.yaw=view.yaw+Math.atan2(Math.sin(home.yaw-view.yaw),Math.cos(home.yaw-view.yaw));goal.pitch=0;goal.distance=home.distance;velocity.x=velocity.y=0;$('intro').classList.remove('gone');$('world').style.opacity='.35';engaged=false;}
$('reset').onclick=reset;
function zoom(delta){engage();cancelPending();goal.distance=clamp(goal.distance+delta,23,52);}
$('zoomIn').onclick=()=>zoom(-3);$('zoomOut').onclick=()=>zoom(3);
function textTexture(text,card=false,index=0){const c=document.createElement('canvas');c.width=card?768:2048;c.height=card?640:128;const ctx=c.getContext('2d');
 if(card){const colors=['#e9cbc1','#c5d7d7','#dedaba','#c8cfdf'];ctx.fillStyle=colors[index%4];ctx.fillRect(0,0,c.width,c.height);ctx.fillStyle='#363b3b';ctx.font='24px Arial';ctx.fillText('PERSPECTIVE / '+String(index+1).padStart(2,'0'),48,65);ctx.font='54px Georgia';let words=text.split(' '),line='',y=285;for(const word of words){if(ctx.measureText(line+word).width>655){ctx.fillText(line,48,y);line='';y+=66;}line+=word+' ';}ctx.fillText(line,48,y);ctx.font='24px Arial';ctx.fillText('Read the story  ↗',48,580);
 }else{ctx.fillStyle='#343a3b';ctx.font=index%3===0?'italic 49px Georgia':'45px Arial';ctx.textBaseline='middle';ctx.fillText(text,8,64,2028);}
 const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;return tex;}
function ribbon(width,height){const geo=new THREE.PlaneGeometry(width,height,48,1);const p=geo.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i);p.setXYZ(i,16*Math.sin(x/16),p.getY(i),16*(Math.cos(x/16)-1));}geo.computeVertexNormals();return geo;}
function place(mesh,angle,y,id){mesh.position.set(Math.sin(angle)*16,y,Math.cos(angle)*16);mesh.rotation.y=angle;mesh.userData.story=id;world.add(mesh);nodes.push(mesh);}
try{
 scene=new THREE.Scene();scene.background=new THREE.Color('#f7f8f8');scene.fog=new THREE.Fog('#f7f8f8',24,62);
 camera=new THREE.PerspectiveCamera(48,innerWidth/innerHeight,.1,100);renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(innerWidth,innerHeight);renderer.outputColorSpace=THREE.SRGBColorSpace;$('world').append(renderer.domElement);
 world=new THREE.Group();scene.add(world);raycaster=new THREE.Raycaster();
 for(let row=0;row<8;row++)for(let col=0;col<8;col++){const i=(row*8+col)%stories.length, angle=col*Math.PI/4+(row%2)*.19, y=8.1-row*2.3;const mat=new THREE.MeshBasicMaterial({map:textTexture(stories[i].quote,false,i),transparent:true,side:THREE.DoubleSide,depthWrite:false,alphaTest:.03});const mesh=new THREE.Mesh(ribbon(10.7,.67),mat);place(mesh,angle,y,i);}
 stories.forEach((s,i)=>{const angle=i*Math.PI*2/12+.24,y=i%2===0?10.3:-10.3;const mat=new THREE.MeshBasicMaterial({map:textTexture(s.title,true,i),side:THREE.DoubleSide});const mesh=new THREE.Mesh(new THREE.PlaneGeometry(3.4,2.83),mat);place(mesh,angle,y,i);anchors.push({angle,y});
 // Image panels can be enabled by adding an image URL to a story in stories.js.
 if(s.image)new THREE.TextureLoader().load(s.image,tex=>{tex.colorSpace=THREE.SRGBColorSpace;mat.map.dispose();mat.map=tex;mat.needsUpdate=true;},undefined,()=>console.warn('Story image unavailable:',s.title));
 });
 // Focus text within the normal field of view, rather than the outer title panels.
 for(let i=0;i<stories.length;i++){const row=Math.floor(i/8)+3,col=i%8;anchors[i]={angle:col*Math.PI/4+(row%2)*.19,y:8.1-row*2.3};}
 const points=[];let seed=9;const rnd=()=>{seed=(seed*16807)%2147483647;return(seed-1)/2147483646;};for(let i=0;i<600;i++)points.push((rnd()-.5)*65,(rnd()-.5)*40,(rnd()-.5)*50);const pg=new THREE.BufferGeometry();pg.setAttribute('position',new THREE.Float32BufferAttribute(points,3));world.add(new THREE.Points(pg,new THREE.PointsMaterial({color:'#a7afb1',size:.026,transparent:true,opacity:.32})));
 const el=$('world'),pointers=new Map();let lastX=0,lastY=0,moved=0,lastTime=0,pinch=0,gesture=false,hover=null;
 function hit(x,y){const p=new THREE.Vector2(x/innerWidth*2-1,-y/innerHeight*2+1);raycaster.setFromCamera(p,camera);const results=raycaster.intersectObjects(nodes);return results.find(r=>r.distance<40)?.object??null;}
 function clearHover(){if(hover)hover.material.color.set('#ffffff');hover=null;$('tooltip').style.opacity='0';}
 el.addEventListener('pointerdown',e=>{if(e.button!==0)return;engage();cancelPending();el.focus({preventScroll:true});pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});el.setPointerCapture(e.pointerId);lastX=e.clientX;lastY=e.clientY;lastTime=performance.now();moved=0;velocity.x=velocity.y=0;clearHover();el.classList.add('dragging');if(pointers.size===2){gesture=true;const p=[...pointers.values()];pinch=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);}});
 el.addEventListener('pointermove',e=>{if(pointers.has(e.pointerId)){pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===2){const p=[...pointers.values()],d=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);goal.distance=clamp(goal.distance-(d-pinch)*.035,23,52);pinch=d;moved=100;return;}
 const dx=e.clientX-lastX,dy=e.clientY-lastY,dt=Math.max(performance.now()-lastTime,8);moved+=Math.abs(dx)+Math.abs(dy);goal.yaw+=dx*.0035;goal.pitch=clamp(goal.pitch+dy*.0025,-.75,.75);velocity.x=dx*.0035/dt*16;velocity.y=dy*.0025/dt*16;lastX=e.clientX;lastY=e.clientY;lastTime=performance.now();return;}
 const obj=hit(e.clientX,e.clientY);if(obj!==hover){clearHover();hover=obj;if(obj)obj.material.color.set('#cf675b');}el.style.cursor=obj?'pointer':'grab';if(obj){const s=stories[obj.userData.story];$('tooltip').textContent=s.author+' — '+s.place;$('tooltip').style.left=Math.min(e.clientX+15,innerWidth-230)+'px';$('tooltip').style.top=Math.max(10,e.clientY-38)+'px';$('tooltip').style.opacity='1';}});
 function finish(e){if(!pointers.has(e.pointerId))return;const click=e.type==='pointerup'&&moved<7&&!gesture;pointers.delete(e.pointerId);if(pointers.size){const p=[...pointers.values()][0];lastX=p.x;lastY=p.y;}else{el.classList.remove('dragging');gesture=false;if(performance.now()-lastTime>90)velocity.x=velocity.y=0;}
 if(e.type==='pointercancel'){velocity.x=velocity.y=0;return;}if(click){const obj=hit(e.clientX,e.clientY);if(obj)focusStory(obj.userData.story);}}
 el.addEventListener('pointerup',finish);el.addEventListener('pointercancel',finish);el.addEventListener('lostpointercapture',finish);el.addEventListener('pointerleave',clearHover);
 el.addEventListener('wheel',e=>{e.preventDefault();zoom(clamp(e.deltaY,-100,100)*.025);clearHover();},{passive:false});
 el.addEventListener('keydown',e=>{const actions={ArrowLeft:()=>goal.yaw-=.12,ArrowRight:()=>goal.yaw+=.12,ArrowUp:()=>goal.pitch=clamp(goal.pitch-.09,-.75,.75),ArrowDown:()=>goal.pitch=clamp(goal.pitch+.09,-.75,.75),'+':()=>zoom(-2),'=':()=>zoom(-2),'-':()=>zoom(2),Home:reset};if(actions[e.key]){e.preventDefault();cancelPending();engage();actions[e.key]();}});
 addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
 renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();$('fallback').hidden=false;});
 let previous=performance.now();function animate(now){requestAnimationFrame(animate);const dt=Math.min((now-previous)/16.667,3);previous=now;if(!pointers.size&&!modals.some(d=>d.open)&&!pendingOpen){if(!reduced){goal.yaw+=velocity.x*dt;goal.pitch=clamp(goal.pitch+velocity.y*dt,-.75,.75);}velocity.x*=Math.pow(.91,dt);velocity.y*=Math.pow(.91,dt);}
 const lerp=reduced?1:1-Math.pow(.89,dt);view.yaw+=(goal.yaw-view.yaw)*lerp;view.pitch+=(goal.pitch-view.pitch)*lerp;view.distance+=(goal.distance-view.distance)*lerp;world.rotation.y=view.yaw;camera.position.set(0,Math.sin(view.pitch)*view.distance,Math.cos(view.pitch)*view.distance);camera.lookAt(0,0,0);renderer.render(scene,camera);}
 requestAnimationFrame(animate);
}catch(error){console.error(error);$('fallback').hidden=false;$('intro').classList.add('gone');}
