import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as k from './kit.mjs';
import * as G from './lathe.mjs';
import { tubePieces, tubeSvg } from './tube.mjs';
import * as A from './audit.mjs';

// Standalone illustrative machine. Real payout state is in server.ts, lib/devtool.ts and lib/address.ts.
const OUT = join(dirname(fileURLToPath(import.meta.url)), '../web/public/anatomy');
const W = 1030, H = 690;
const BED = { x:-255, y:-137, w:510, d:274, r:14 };
const P = k.fitProjection([...k.boxCorners(BED,-24,0),[-245,-125,168],[245,120,168]], W,H,{pad:42,azimuth:43,elevation:32});
const R = A.recorder(P);
const at = p => k.iso(p,P);
const mid = (a,b) => (a+b)/2;
const shape = s => R.solid(s);
let parts=0;
function put(name, ref, svg, geometry, attrs='') {
  parts++;
  R.put({name,at:ref,svg,shapes:[shape(geometry)],piece:'machine',attrs});
}
function box(name,x0,y0,z0,x1,y1,z1,tone='mid',opts={}) {
  const p={x:x0,y:y0,w:x1-x0,d:y1-y0,r:opts.r??1};
  const g=A.slab(p,z0,z1-z0,{name,owner:opts.owner,ground:opts.ground},4);
  const drawing=k.solidSvg(k.slabOf(p,z0,z1-z0,P,4,opts.bevel??0.5),{tone,className:opts.className,inner:opts.inner??''});
  put(name,[mid(x0,x1),mid(y0,y1),mid(z0,z1)],drawing,g,opts.attrs??'');
  return g;
}
function turned(name, origin, axis, s0,s1,r,tone='mid',opts={}) {
  const F=G.frameAlong(origin,axis);
  const profile=opts.profile??[[s0,r],[s1,r]];
  const g=A.solid(F,profile,{name,owner:opts.owner,ground:opts.ground});
  const art=k.solidSvg(G.solidOf(profile,F,P,{bevel:opts.bevel??0.35,smooth:opts.smooth??false}),{tone,className:opts.className,inner:opts.inner??''});
  put(name,G.add3(origin,G.mul3(F.a,mid(s0,s1))),art,g,opts.attrs??'');
  return g;
}
function ring(name,origin,axis,s0,s1,inside,outside,tone='mid',opts={}) {
  const F=G.frameAlong(origin,axis);
  const g=A.ring(F,s0,s1,inside,outside,{name,owner:opts.owner});
  const art=k.solidSvg(G.ringBand(s0,s1,inside,outside,F,P),{tone,className:opts.className});
  put(name,G.add3(origin,G.mul3(F.a,mid(s0,s1))),art,g,opts.attrs??'');
  return g;
}
function ball(name,centre,r,tone='mid',opts={}){
  const g=A.ball(centre,r,{name,owner:opts.owner});
  put(name,centre,k.solidSvg(G.sphereOf(centre,r,P),{tone,className:opts.className}),g,opts.attrs??'');
}
function dots(points,size=.55,tone='lo'){
  R.items.at(-1).svg+=k.dotsSvg(points.map(at),{size,tone});
}
function mark(name, points, tone='lo', free=true){
  R.put({name,at:points[0],svg:k.lineSvg(k.pathOf(points.map(at)),{tone,free}),shapes:[A.tube(points,.25,{name})],piece:'machine'});
}
// Foundation: the whole instrument has real feet, a thick bed and fastened edge rails.
const halo=`<path class="iso-halo" d="${k.haloOf(BED,-24,15,P)}"/>`;
for(const [i,[x,y]] of k.corners(BED,28).entries()){
  turned(`stand.foot.${i}`,[x,y,-24],[0,0,1],0,6,11,'lo',{ground:true});
  turned(`stand.footCollar.${i}`,[x,y,-18],[0,0,1],0,3,8,'mid',{owner:`stand.foot.${i}`});
}
box('stand.bed',-255,-137,-15,255,137,0,'lo',{r:14,bevel:1.4,ground:true,inner:k.lineSvg(k.sideSeam(BED,-5,P,8),{tone:'faint'})});
box('stand.innerBed',-246,-128,0,246,128,4,'mid',{r:10,bevel:.8,owner:'stand.bed'});
for(const [x,y] of k.corners(BED,17)) dots([[x,y,4]],.55,'lo');
// Vault: an axial drum, with an open top window between circular bands and four distinct note canisters.
box('vault.saddle.0',-212,-104,4,-96,-88,18,'lo',{r:2,owner:'stand.innerBed'});
turned('vault.back',[-155,-98,82],[0,1,0],0,6,61,'lo',{owner:'vault.saddle.0',bevel:1});
ring('vault.rearRim',[-155,-98,82],[0,1,0],6,12,53,64,'mid',{owner:'vault.back'});
ring('vault.frontRim',[-155,-98,82],[0,1,0],73,80,53,64,'mid',{owner:'vault.back'});
for(const [i,ang] of [-140,-90,-40,90].entries()){
  const rad=ang*Math.PI/180;
  const x=-155+59*Math.cos(rad), z=82+59*Math.sin(rad);
  turned(`vault.longitudinalRib.${i}`,[x,-90,z],[0,1,0],0,70,2.4,'lo',{owner:'vault.back'});
}
for(let i=0;i<4;i++){
  const x=-181+i*17;
  const F=G.frameAlong([x,-87,136],[0,1,0]);
  const inner=k.lineSvg([12,38].map(s=>G.arcOf(F,s,6.3,P)).join(''),{tone:'faint'});
  turned(`vault.canister.${i}`,[x,-87,136],[0,1,0],0,49,6.3,'hi',{owner:'vault.back',bevel:.8,inner});
  turned(`vault.canisterEnd.${i}`,[x,-38,136],[0,1,0],0,2,5.3,'mid',{owner:`vault.canister.${i}`});
  R.items.at(-1).svg+=k.dotsSvg(G.dotsOf(F,51,3.4,4,P,{all:true}),{size:.34,tone:'lo'});
}
// Window perimeter has a lintel, two short jambs and inset corner fasteners.
for(const [i,x] of [-197,-113].entries()) box(`vault.windowJamb.${i}`,x,-85,128,x+3,-29,144,'lo',{r:.3,owner:'vault.back'});
box('vault.windowLintel',-196,-86,144,-111,-82,148,'mid',{r:.5,owner:'vault.back'});
box('vault.windowSill',-196,-28,127,-111,-25,132,'mid',{r:.5,owner:'vault.back'});
for(const x of [-194,-114]) dots([[x,-83,148]],.4,'hi');
turned('vault.door',[-155,-18,82],[0,1,0],0,7,53,'mid',{owner:'vault.frontRim',bevel:1.2});
R.items.at(-1).svg+=k.lineSvg(G.arcOf(G.frameAlong([-155,-11,82],[0,1,0]),0,36,P),{tone:'faint'});
ring('vault.doorLip',[-155,-18,82],[0,1,0],7,9,45,52,'hi',{owner:'vault.door'});
turned('vault.lockBoss',[-155,-11,82],[0,1,0],0,5,11,'hi',{owner:'vault.door',bevel:.5});
turned('vault.spokeHub',[-155,-6,82],[0,1,0],0,4,5,'lo',{owner:'vault.lockBoss'});
for(let i=0;i<4;i++){
  const a=i*Math.PI/2, x=-155+28*Math.cos(a),z=82+28*Math.sin(a);
  const axis=[Math.cos(a),0,Math.sin(a)];
  turned(`vault.spoke.${i}`,[-155,-2,82],axis,5,28,2.5,'hi',{owner:'vault.spokeHub'});
  ball(`vault.spokeKnob.${i}`,[x,-2,z],3.7,'hi',{owner:`vault.spoke.${i}`});
}
for(let i=0;i<4;i++){
  const a=(i+.5)*Math.PI/2;
  turned(`vault.lockBolt.${i}`,[-155+45*Math.cos(a),-9,82+45*Math.sin(a)],[0,1,0],0,2.5,2.9,'lo',{owner:'vault.doorLip'});
}
for(let i=0;i<2;i++) turned(`vault.hingeBarrel.${i}`,[-110,-14,54+i*42],[0,0,1],0,17,3.8,'hi',{owner:'vault.door'});
turned('vault.hingePin',[-110,-14,52],[0,0,1],0,89,1.7,'lo',{owner:'vault.door'});
// A positive mechanical outlet beside the barrel. It is blank when a seal merely exists.
box('vault.releasePedestal',-88,-100,4,-61,-55,72,'lo',{r:3,owner:'stand.innerBed'});
turned('vault.releaseValve',[-72,-77,72],[0,0,1],0,16,10,'hi',{owner:'vault.releasePedestal'});
ring('vault.releaseCollar',[-72,-77,72],[0,0,1],16,20,5,11,'mid',{owner:'vault.releaseValve'});
turned('vault.releasePort',[-72,-77,92],[0,0,1],0,8,8,'hi',{owner:'vault.releaseValve'});
// Seal carousel: three claim seals occupy a machined seven-position wheel, beside a fingerprint-only drum.
turned('carousel.pedestal',[-134,73,4],[0,0,1],0,10,43,'lo',{owner:'stand.innerBed'});
turned('carousel.bearing',[-134,73,14],[0,0,1],0,3,51,'mid',{owner:'carousel.pedestal'});
turned('carousel.deck',[-134,73,17],[0,0,1],0,4,53,'lo',{owner:'carousel.bearing'});
ring('carousel.outerRace',[-134,73,21],[0,0,1],0,2,50,52,'hi',{owner:'carousel.deck'});
turned('carousel.spindle',[-134,73,21],[0,0,1],0,15,6,'mid',{owner:'carousel.deck'});
turned('carousel.crown',[-134,73,36],[0,0,1],0,3,11,'hi',{owner:'carousel.spindle'});
for(let i=0;i<3;i++){
  const a=(-135+i*120)*Math.PI/180;
  const x=-134+40*Math.cos(a), y=73+40*Math.sin(a);
  turned(`carousel.socket.${i}`,[x,y,21],[0,0,1],0,2,12,'mid',{owner:'carousel.deck'});
  if(i<3){
    // The only gold anywhere: two actual half seals meeting at a fine straight break.
    for(let side=0;side<2;side++){
      const polygon=[];
      const a0=side?Math.PI/2:-Math.PI/2, a1=side?3*Math.PI/2:Math.PI/2;
      polygon.push([x,y]);
      for(let step=0;step<=16;step++){
        const t=a0+(a1-a0)*step/16;
        polygon.push([x+9.2*Math.cos(t),y+9.2*Math.sin(t)]);
      }
      const g=A.extruded(polygon,23,2.5,{name:`seal.${i}.${side}`,owner:`carousel.socket.${i}`});
      const inset=[[x,y],...Array.from({length:17},(_,step)=>{const t=a0+(a1-a0)*step/16;return [x+2.3*Math.cos(t),y+2.3*Math.sin(t)]})];
      const gleam=side?'':`<path class="seal-glint" d="${k.onTop([...Array.from({length:9},(_,step)=>{const t=-1.08+step*.105;return [x+8.3*Math.cos(t),y+8.3*Math.sin(t)]}),...Array.from({length:9},(_,step)=>{const t=-.24-step*.105;return [x+7.1*Math.cos(t),y+7.1*Math.sin(t)]})],25.6,P,true)}"/>`;
      const art=k.solidSvg(k.extrude(polygon,23,2.5,P,{bevel:.5}),{tone:'hi',className:'seal-gold'})+`<path class="seal-obsidian" d="${k.onTop(inset,25.6,P,true)}"/>`+gleam;
      put(`seal.${i}.${side}`,[x+(side?-2:2),y,24],art,g,` data-seal="${i}" data-half="${side}"`);
    }
  }
}
box('ledger.stand',-69,50,4,-20,89,28,'lo',{r:3,owner:'stand.innerBed'});
turned('ledger.drum',[-45,66,47],[0,1,0],0,22,17,'mid',{owner:'ledger.stand'});
ring('ledger.leftRim',[-45,66,47],[0,1,0],0,2,16,19,'hi',{owner:'ledger.drum'});
ring('ledger.rightRim',[-45,66,47],[0,1,0],20,22,16,19,'hi',{owner:'ledger.drum'});
for(let i=0;i<4;i++){
  const y=69+i*4.5;
  // Closed shallow glyphs, no token text and no full address.
  box(`ledger.fingerprint.${i}`,-49,y,60,-47.5,y+1.1,61,'lo',{r:.2,owner:'ledger.drum'});
}
box('ledger.stampArm',-25,87,28,-17,95,50,'lo',{r:1,owner:'ledger.stand'});
box('ledger.stampBeam',-40,92,41,-21,95,45,'mid',{r:.5,owner:'ledger.stampArm'});
turned('ledger.stampHead',[-40,92,43],[0,-1,0],0,2,3,'hi',{owner:'ledger.stampBeam',attrs:' data-stamp="head"'});
// Address inspection gate. The glass card exists only as a visual contrast; neither card contains a real address.
box('reader.plinth',-20,10,4,83,69,12,'lo',{r:5,owner:'stand.innerBed'});
box('reader.floor',-14,15,12,77,64,16,'mid',{r:3,owner:'reader.plinth'});
for(const [i,x] of [-13,70].entries()){
  box(`reader.cheek.${i}`,x,22,16,x+7,58,66,'mid',{r:1,owner:'reader.floor'});
  turned(`reader.sensingRing.${i}`,[x+3,40,57],[0,0,1],0,3,6,'hi',{owner:`reader.cheek.${i}`});
}
box('reader.bridge',-13,22,66,77,58,71,'hi',{r:2,owner:'reader.cheek.0'});
box('reader.slot',-7,27,16,70,53,25,'lo',{r:1,owner:'reader.floor'});
for(const [i,x] of [-6,67].entries()) box(`reader.guide.${i}`,x,29,25,x+3,51,28,'mid',{r:.4,owner:'reader.slot'});
for(const [i,x] of [-8,71].entries()) turned(`reader.screw.${i}`,[x,24,71],[0,0,1],0,1,2.1,'lo',{owner:'reader.bridge'});
turned('reader.leverAxle',[77,44,30],[1,0,0],0,5,4,'lo',{owner:'reader.cheek.1'});
turned('reader.leverHandle',[82,44,30],[0,0,1],0,28,2,'hi',{owner:'reader.leverAxle',attrs:' data-lever="handle"'});
ball('reader.leverKnob',[82,44,60],4,'hi',{owner:'reader.leverHandle'});
box('reader.leverStop',80,32,12,87,37,19,'lo',{owner:'reader.plinth'});
// Separate reject tray under the trip lever.
box('reject.tray',83,10,4,149,67,7,'lo',{r:2,owner:'stand.innerBed'});
for(const [i,y] of [10,64].entries()) box(`reject.rail.${i}`,83,y,7,149,y+3,14,'mid',{owner:'reject.tray'});
for(const [i,x] of [87,145].entries()) turned(`reject.endstop.${i}`,[x,39,7],[0,0,1],0,3,2,'hi',{owner:'reject.tray'});
// Visual card geometry is separate from the reader so the active state can slide or fall.
box('card.opaque',-1,31,25,59,81,26.4,'hi',{r:1,owner:'reader.slot',className:'address-card opaque-card',attrs:' data-card="opaque"'});
// Opaque pneumatic pipe with real curved tube sections and gapped collars.
const raw=[[-72,-77,100],[-72,-77,125],[-47,-104,125],[18,-105,125],[113,-103,125],[177,-91,115],[193,-68,105],[193,-68,79]];
const route=G.fillet(raw,16,20,{P,tube:5});
const total=G.pathLength(route);
const collarAt=[.22,.44,.64,.82].map(f=>total*f);
const gaps=collarAt.map(s=>[s-1.5,s+1.5]);
R.route('pneumatic.main',route,5,{gaps,owner:'pneumatic.main',piece:'machine'});
tubePieces(route,5,P,{maxLength:18,spacing:1.2,gaps}).forEach((section,i)=>{
  const geom=A.tube(section.points,section.radii,{name:`pneumatic.segment.${i}`,owner:'pneumatic.main'});
  put(`pneumatic.segment.${i}`,section.mid,tubeSvg(section,{tone:'hi'}),geom);
});
for(const [i,s] of collarAt.entries()){
  const p=G.pointAlong(route,s), tangent=G.tangentAlong(route,s);
  turned(`pneumatic.collar.${i}`,p,tangent,-1.5,1.5,7.4,'mid',{owner:'pneumatic.main'});
}
for(const [i,x] of [12,82].entries()){
  box(`pneumatic.stanchion.${i}`,x,-119,4,x+6,-112,109,'lo',{r:.6,owner:'stand.innerBed'});
  box(`pneumatic.cradle.${i}`,x-3,-119,109,x+9,-110,117,'mid',{r:1,owner:`pneumatic.stanchion.${i}`});
  turned(`pneumatic.clampScrew.${i}`,[x+3,-115,115],[0,0,1],0,2,2.5,'hi',{owner:`pneumatic.cradle.${i}`});
}
// Capsule is visible only before it enters the opaque transfer pipe.
turned('pneumatic.capsule',[-70,-60,72],[0,0,1],0,15,4.5,'hi',{profile:[[0,2],[2,4.5],[13,4.5],[15,2]],smooth:true,owner:'vault.releasePedestal',attrs:' data-capsule="true"'});
// Lockbox: the recipient wallet receives the sealed transfer after mining.
box('wallet.foot',151,-86,4,235,-8,10,'lo',{r:5,owner:'stand.innerBed'});
box('wallet.body',155,-82,10,231,-12,72,'mid',{r:5,owner:'wallet.foot'});
box('wallet.door',177,-10,17,225,-8,65,'lo',{r:2,owner:'wallet.body'});
box('wallet.doorInset',183,-8,23,219,-6,59,'mid',{r:2,owner:'wallet.door'});
turned('wallet.lock',[208,-6,41],[0,1,0],0,2,5,'hi',{owner:'wallet.doorInset'});
for(const [i,z] of [21,54].entries()) turned(`wallet.hinge.${i}`,[174,-9,z],[0,0,1],0,9,3,'hi',{owner:'wallet.door'});
for(const [i,x] of [161,224].entries()) turned(`wallet.topBolt.${i}`,[x,-76,72],[0,0,1],0,1.5,2.3,'lo',{owner:'wallet.body'});
turned('wallet.receiverMouth',[193,-68,72],[0,0,1],0,7,10,'hi',{owner:'wallet.body'});
// Block clock on its own pillar; small raised metal indices are anchored on the dial.
box('clock.pedestal',70,-77,4,103,-54,97,'lo',{r:2,owner:'stand.innerBed'});
turned('clock.case',[86,-54,120],[0,1,0],0,6,29,'mid',{owner:'clock.pedestal'});
ring('clock.bezel',[86,-48,120],[0,1,0],0,3,25,29,'hi',{owner:'clock.case'});
turned('clock.face',[86,-48,120],[0,1,0],0,4,24,'lo',{owner:'clock.case'});
for(let i=0;i<8;i++){
  const a=(i*Math.PI/4), x=86+20*Math.sin(a), z=120+20*Math.cos(a);
  turned(`clock.index.${i}`,[x,-44,z],[0,1,0],0,1.2,i%3===0?1.7:1.1,'hi',{owner:'clock.face'});
}
turned('clock.needleBoss',[86,-43.9,120],[0,1,0],0,1.6,3,'hi',{owner:'clock.face'});
mark('clock.needle',[[86,-42,120],[86,-42,100]],'hi',true);
// Shredder is a cutter, not a shred icon: two transverse drums and interleaving teeth.
box('shred.case',86,70,4,180,120,12,'lo',{r:3,owner:'stand.innerBed'});
box('shred.nearWall',86,112,12,180,120,54,'mid',{r:.5,owner:'shred.case'});
box('shred.farWall',86,70,12,180,77,54,'mid',{r:.5,owner:'shred.case'});
box('shred.leftWall',86,77,12,93,112,54,'mid',{r:.5,owner:'shred.case'});
box('shred.rightWall',173,77,12,180,112,54,'mid',{r:.5,owner:'shred.case'});
for(const [i,y] of [86,102].entries()){
  turned(`shred.cutter.${i}`,[93,y,40],[1,0,0],0,80,5,'hi',{owner:'shred.case',attrs:` data-cutter="${i}"`});
  for(let j=0;j<4;j++) ring(`shred.tooth.${i}.${j}`,[99+j*20,y,40],[1,0,0],0,2,5,7,'mid',{owner:`shred.cutter.${i}`});
  turned(`shred.bearing.${i}`,[170,y,40],[1,0,0],0,3,7.4,'lo',{owner:`shred.cutter.${i}`});
}
box('shred.bin',101,120,10,165,123,28,'mid',{r:1,owner:'shred.nearWall'});
// Expiry dial and return track are mechanically separate from the vault release.
box('expiry.pedestal',-65,96,4,-23,134,20,'lo',{r:3,owner:'stand.innerBed'});
turned('expiry.case',[-44,115,20],[0,0,1],0,4,17,'mid',{owner:'expiry.pedestal'});
ring('expiry.bezel',[-44,115,24],[0,0,1],0,2,13.5,17,'hi',{owner:'expiry.case'});
turned('expiry.face',[-44,115,24],[0,0,1],0,2.5,13,'lo',{owner:'expiry.case'});
turned('expiry.needleBoss',[-44,115,26.5],[0,0,1],0,1.4,2.4,'hi',{owner:'expiry.face'});
mark('expiry.needle',[[-44,115,27.9],[-44,103,27.9]],'hi',true);
box('expiry.returnRail',-84,121,4,-64,123,10,'mid',{r:.3,owner:'stand.innerBed'});
box('expiry.returnPocket',-84,123,4,-70,133,8,'lo',{r:1,owner:'expiry.returnRail'});

// Fixed subassemblies are one painter item each. Their individual true solids remain in the audit.
function assembly(name, member, attrs=''){
  const selected=R.items.filter(item=>member(item.name));
  if(!selected.length)return;
  const first=R.items.indexOf(selected[0]);
  R.items=R.items.filter(item=>!member(item.name));
  R.items.splice(first,0,{
    name,piece:'machine',at:selected[0].at,key:selected.reduce((sum,item)=>sum+item.key,0)/selected.length,
    move:[0,0,0],ride:'machine',attrs,
    svg:selected.map(item=>item.svg).join(''),shapes:selected.flatMap(item=>item.shapes),
  });
}
assembly('vault.shell',name=>name==='vault.back'||name==='vault.rearRim'||name==='vault.frontRim'||name.startsWith('vault.longitudinalRib')||name.startsWith('vault.canister')||name.startsWith('vault.window'));
assembly('vault.doorAssembly',name=>name.startsWith('vault.door')||name.startsWith('vault.lock')||name.startsWith('vault.spoke')||name.startsWith('vault.hinge'));
assembly('ledger.case',name=>name==='ledger.stand'||name==='ledger.drum'||name.startsWith('ledger.leftRim')||name.startsWith('ledger.rightRim')||name.startsWith('ledger.fingerprint'));
{
  const ledger=R.items.find(item=>item.name==='ledger.case');
  const p=[];
  for(const [row,columns] of [[0,[-51,-47,-43,-39]],[1,[-51,-45,-39]],[2,[-49,-45,-41]]])
    for(const x of columns)p.push(at([x,88.2,40+row*6]));
  ledger.svg+=k.dotsSvg(p,{size:.55,tone:'lo'});
  ledger.svg+=`<path class="ledger-imprint" d="${k.pathOf([[-53,88.25,43],[-50,88.25,40],[-46,88.25,44],[-39,88.25,35],[-36,88.25,38],[-46,88.25,50]].map(at),true)}"/>`;
}
// The moving card changes depth as it leaves the reader; reuse its drawing above the tray.
const cardSvg=R.items.find(item=>item.name==='card.opaque').svg;
assembly('reader.base',name=>['reader.plinth','reader.floor','reader.slot'].includes(name)||name.startsWith('reader.guide')||name==='reader.leverStop');
assembly('reader.arch',name=>name.startsWith('reader.cheek')||name.startsWith('reader.sensingRing')||name==='reader.bridge'||name.startsWith('reader.screw'));
assembly('reader.lever',name=>name.startsWith('reader.lever')&&name!=='reader.leverStop',' data-lever="handle"');
{
  const members=['reader.base','card.opaque','reader.arch'].map(name=>R.items.find(item=>item.name===name));
  const first=R.items.indexOf(members[0]);
  R.items=R.items.filter(item=>!members.includes(item));
  R.items.splice(first,0,{name:'reader.frame',piece:'machine',key:members.reduce((sum,item)=>sum+item.key,0)/members.length,move:[0,0,0],ride:'machine',svg:members.map(item=>item.svg).join(''),shapes:members.flatMap(item=>item.shapes)});
}
assembly('clock.dial',name=>name.startsWith('clock.')&&name!=='clock.needle');
assembly('expiry.dial',name=>name.startsWith('expiry.')&&name!=='expiry.needle'&&!name.startsWith('expiry.return'));
for(let i=0;i<2;i++)assembly(`shred.rotor.${i}`,name=>name===`shred.cutter.${i}`||name.startsWith(`shred.tooth.${i}.`)||name===`shred.bearing.${i}`,` data-cutter="${i}"`);
A.settle(R,P);
R.items.sort((a,b)=>a.key-b.key);
const svg=k.figureSvg({width:W,height:H,label:'Cachet treasury vault payout machine with four Ironwood note canisters, seal carousel, fingerprint ledger, address inspection reader, opaque pneumatic tube, receiver lockbox, block clock, shredder and expiry return.',body:[halo,...R.items.flatMap(item=>[`<g class="machine-part" data-name="${item.name}"${item.attrs??''}>${item.svg}</g>`,...(item.name==='reject.tray'?[`<g class="card-motion">${cardSvg}</g>`]:[])])]});
const stampShift=k.axisVector(P,[0,-2,0]);
const rejectShift=k.axisVector(P,[89,-15,-11]);
const holdShift=k.axisVector(P,[0,-15,0]);
const shredShift=k.axisVector(P,[105,39,29]);
const shredEnd=k.axisVector(P,[105,39,10]);
const expiryCss=Array.from({length:3},(_,i)=>{
  const a=(-135+i*120)*Math.PI/180;
  const [dx,dy]=k.axisVector(P,[-77-(-134+40*Math.cos(a)),128-(73+40*Math.sin(a)),-15]);
  return `.machine-part[data-state="expired"][data-seal="${i}"]{transform:translate(${dx.toFixed(2)}px,${dy.toFixed(2)}px)}`;
}).join('');
const css=`
.iso{--anatomy-page:#0e0b09;--anatomy-card:#1a1410;--anatomy-text:#d8cbb7;--anatomy-strong:#f3e9d8;--anatomy-muted:#9a8468;--anatomy-paper:#1a1410;--anatomy-face:#32281f;--anatomy-top:#3b2e23;--anatomy-shade-0:#17110d;--anatomy-shade-1:#211910;--anatomy-shade-2:#2a2017;--anatomy-shade-3:#34281c;--anatomy-hi:#e6d3b7;--anatomy-mid:#aa947a;--anatomy-lo:#75614e;--anatomy-faint:#51402e;--anatomy-lit:#fff4df;--anatomy-halo:#070503;--anatomy-dot:#dfcfb8}
.iso[data-theme="light"]{--anatomy-page:#e9deca;--anatomy-card:#f7efdf;--anatomy-text:#544432;--anatomy-strong:#241b12;--anatomy-muted:#79664f;--anatomy-paper:#f7efdf;--anatomy-face:#fff9ee;--anatomy-top:#f4e9d5;--anatomy-shade-0:#c4b39d;--anatomy-shade-1:#d5c5af;--anatomy-shade-2:#e2d3bd;--anatomy-shade-3:#eee0cb;--anatomy-hi:#2d2117;--anatomy-mid:#735d47;--anatomy-lo:#a58e73;--anatomy-faint:#cdbb9f;--anatomy-lit:#20180f;--anatomy-halo:#74634c;--anatomy-dot:#31251a}
.iso-page{width:min(1120px,100% - 24px);margin:24px auto 60px}.iso-plate{padding:46px 20px 54px;border:1px solid var(--anatomy-faint);box-shadow:0 20px 70px #0003}.iso-svg{max-height:74vh}.iso-plate-corner[data-corner="readout"]{max-width:62%;text-align:right;overflow:hidden;text-overflow:ellipsis}.iso-legend{gap:12px;margin-top:18px}.iso-caption{max-width:90ch}
.machine-part[data-seal]{cursor:pointer;outline:none}.machine-part[data-seal]:hover{filter:drop-shadow(0 0 5px #f0c35c)}.machine-part[data-seal]:focus-visible{filter:drop-shadow(0 0 7px #f0c35c)}
.seal-gold .iso-fill{fill:#6f4a10}.seal-gold .iso-top{fill:#c48a26}.seal-gold .iso-shade{fill:#9b6818}.seal-gold .iso-shade[data-shade="0"]{fill:#6f4a10}.seal-gold .iso-shade[data-shade="3"]{fill:#d89a30}.seal-gold .iso-edge,.seal-gold .iso-crease,.seal-gold .iso-bevel{stroke:#f0c35c}.seal-obsidian{fill:#16110d;stroke:#6f4a10;stroke-width:.28}.seal-glint{fill:#f0c35c;opacity:.75}.ledger-imprint{fill:var(--anatomy-hi);opacity:0;transition:opacity .25s}.iso-stage[data-any-delivered="true"] .ledger-imprint{opacity:1}${expiryCss}.machine-part[data-state="split"][data-half="0"]{transform:translate(8px,0)}.machine-part[data-state="split"][data-half="1"]{transform:translate(-8px,0)}.machine-part[data-seal]{transition:transform .6s cubic-bezier(.2,.75,.1,1),opacity .4s}
.address-card{transition:opacity .25s,transform .55s cubic-bezier(.2,.75,.1,1)}.card-motion{visibility:hidden;pointer-events:none}.iso-stage:is([data-phase="rejected"],[data-phase="queued"],[data-phase="sent"],[data-phase="delivered"]) [data-name="reader.frame"] .address-card{visibility:hidden}.iso-stage:is([data-phase="rejected"],[data-phase="queued"],[data-phase="sent"],[data-phase="delivered"]) .card-motion{visibility:visible}.opaque-card .iso-top{fill:#120f0d}.opaque-card .iso-edge{stroke:#e8dcc8}.iso-stage[data-card-kind="glass"] .opaque-card .iso-fill{fill:#6fb6bd;opacity:.4}.iso-stage[data-card-kind="glass"] .opaque-card .iso-top{fill:#75bec6;opacity:.42}.iso-stage[data-card-kind="glass"] .opaque-card .iso-shade{fill:#4a8995;opacity:.4}.iso-stage[data-card-kind="glass"] .opaque-card .iso-edge{stroke:#428c98}.iso-stage[data-phase="rejected"] .opaque-card{transform:translate(${rejectShift[0].toFixed(2)}px,${rejectShift[1].toFixed(2)}px)}.iso-stage[data-phase="queued"] .opaque-card,.iso-stage[data-phase="sent"] .opaque-card{transform:translate(${holdShift[0].toFixed(2)}px,${holdShift[1].toFixed(2)}px)}.iso-stage[data-phase="delivered"] .opaque-card{animation:card-shred 1.25s cubic-bezier(.25,.8,.2,1) forwards}@keyframes card-shred{0%{opacity:1;transform:translate(${holdShift[0].toFixed(2)}px,${holdShift[1].toFixed(2)}px)}65%{opacity:1;transform:translate(${shredShift[0].toFixed(2)}px,${shredShift[1].toFixed(2)}px)}100%{opacity:0;transform:translate(${shredEnd[0].toFixed(2)}px,${shredEnd[1].toFixed(2)}px)}}
.machine-part[data-capsule]{opacity:0;transition:opacity .25s,transform .7s}.iso-stage[data-phase="queued"] .machine-part[data-capsule]{opacity:1}.iso-stage[data-phase="sent"] .machine-part[data-capsule]{opacity:0;transform:translate(20px,-4px)}.machine-part[data-stamp]{transition:transform .25s}.iso-stage[data-any-delivered="true"] .machine-part[data-stamp]{transform:translate(${stampShift[0].toFixed(2)}px,${stampShift[1].toFixed(2)}px)}.iso-stage[data-phase="rejected"] .machine-part[data-lever]{transform:rotate(12deg);transform-box:fill-box;transform-origin:center}.machine-part[data-cutter]{transform-box:fill-box;transform-origin:center}.iso-stage[data-phase="delivered"] .machine-part[data-cutter="0"]{animation:cutter .38s ease-in-out 3}.iso-stage[data-phase="delivered"] .machine-part[data-cutter="1"]{animation:cutter .38s ease-in-out 3 reverse}@keyframes cutter{to{transform:rotate(50deg)}}
.controls{display:flex;flex-wrap:wrap;align-items:end;gap:8px;margin:18px 0}.controls fieldset{border:0;padding:0;margin:0;display:flex;gap:6px}.controls legend{font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--anatomy-muted);margin-bottom:4px}.controls button{font:inherit;min-height:40px;padding:7px 12px;background:var(--anatomy-card);border:1px solid var(--anatomy-lo);color:var(--anatomy-strong);cursor:pointer}.controls button:hover,.controls button[aria-pressed="true"]{border-color:var(--anatomy-hi)}.controls button:disabled{opacity:.38;cursor:default}.controls .primary{background:var(--anatomy-strong);color:var(--anatomy-page)}.status{min-height:24px;color:var(--anatomy-strong)}.facts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px 24px;margin-top:28px}.facts p{border-top:1px solid var(--anatomy-faint);padding-top:10px;margin:0}.facts strong{display:block;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--anatomy-strong)}
@media(max-width:640px){.iso-page{width:calc(100% - 12px);margin:8px auto 40px}.iso-plate{padding:44px 0 84px}.iso-svg{width:120%;max-width:none;margin-left:-10%}.iso-plate-corner[data-corner="hint"]{bottom:31px;white-space:normal;max-width:43%;line-height:1.25}.iso-plate-corner[data-corner="readout"]{bottom:15px;white-space:normal;max-width:54%;line-height:1.25}.facts{grid-template-columns:1fr}}
@media(prefers-reduced-motion:reduce){.iso *, .iso *::before,.iso *::after{animation:none!important;transition:none!important}.iso-stage[data-phase="delivered"] .opaque-card{opacity:0}}
`;
const clockCenter=[86,-42,120];
const needlePaths=Array.from({length:12},(_,i)=>{
  const a=i*Math.PI/6;
  return k.pathOf([at(clockCenter),at([86+19*Math.sin(a),-42,120-19*Math.cos(a)])]);
});
const live=`
const stage=document.querySelector('.iso-stage');
const readout=document.querySelector('[data-readout]');
const status=document.querySelector('.status');
const seals=[...stage.querySelectorAll('[data-seal]')];
const buttons=[...document.querySelectorAll('[data-kind-choice]')];
const submit=document.querySelector('[data-action="insert"]');
const expire=document.querySelector('[data-action="expire"]');
const needle=stage.querySelector('[data-name="clock.needle"] path');
const needlePaths=${JSON.stringify(needlePaths)};
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let links=['sealed','sealed','sealed'], selected=-1, kind='opaque', phase='sealed', visible=true, idle=0, timers=[], tick=0, tour=false;
function later(fn,ms){const t=setTimeout(fn,reduced.matches?0:ms);timers.push(t)}
function clear(){timers.forEach(clearTimeout);timers=[]}
function say(s){status.textContent=s}
function render(){
 stage.dataset.phase=phase;stage.dataset.cardKind=kind;stage.dataset.anyDelivered=String(links.includes('delivered'));
 seals.forEach(el=>{const i=+el.dataset.seal;el.dataset.state=links[i]==='expired'?'expired':['queued','sent','delivered'].includes(links[i])?'split':'sealed';el.setAttribute('aria-disabled',links[i]==='sealed'?'false':'true')});
 buttons.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.kindChoice===kind)));
 submit.disabled=selected<0||links[selected]!=='sealed'||!['open','rejected'].includes(phase);
 expire.disabled=!links.includes('sealed')||['queued','sent'].includes(phase);
 const n=x=>links.filter(s=>s===x).length;
 readout.textContent=n('sealed')+' unclaimed · '+(n('queued')+n('sent'))+' sending · '+n('delivered')+' paid · addresses stored '+(n('queued')+n('sent'))+(n('expired')?' · '+n('expired')+' expired':'');
 stage.setAttribute('aria-label','Illustrative Cachet vault. '+readout.textContent+'. '+status.textContent);
}
function touch(){idle=Date.now();if(tour){tour=false;clear()}}
function reset(){clear();links=['sealed','sealed','sealed'];selected=-1;kind='opaque';phase='sealed';tick=0;needle.setAttribute('d',needlePaths[0]);say('A sample batch of three payout links. Pick a gold coin to claim one.');render()}
function open(i,automatic=false){if(!automatic)touch();if(links[i]!=='sealed'||['queued','sent'].includes(phase))return;selected=i;phase='open';say('Link picked. Cachet showed this link once and stores only its fingerprint. Nothing has been paid yet.');render()}
function choose(next){touch();kind=next;phase=selected<0?'sealed':'open';say(next==='glass'?'Transparent address: the payment would be public, so Cachet will refuse it.':'Shielded address: a unified address on the right network is accepted.');render()}
function insert(automatic=false){if(!automatic)touch();if(selected<0||links[selected]!=='sealed'||!['open','rejected'].includes(phase))return;
 if(kind==='glass'){phase='rejected';say('Refused. A transparent address would make the payment public. Sapling-only and wrong-network addresses are refused too, and no funds move.');render();return}
 links[selected]='queued';phase='queued';say('Accepted. Cachet keeps the address only while it sends the shielded payment.');render();
 later(()=>{links[selected]='sent';phase='sent';say('One capsule enters the opaque Ironwood tube: 20,000 zats to the recipient, 10,000-zat fee, encrypted memo.');render()},850);
 later(()=>{links[selected]='delivered';phase='delivered';say('Confirmed in a block. The link is marked paid and the address is deleted.');render()},3100);
}
function expireOne(automatic=false){if(!automatic)touch();const i=links.findIndex((s,j)=>s==='sealed'&&j!==selected);if(i<0)return;links[i]='expired';say('An unclaimed link expired. Its coin goes back whole and the money never left the treasury.');render()}
seals.forEach(el=>{el.setAttribute('tabindex','0');el.setAttribute('role','button');el.setAttribute('aria-label','Pick payout link '+(+el.dataset.seal+1));el.addEventListener('click',()=>open(+el.dataset.seal));el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open(+el.dataset.seal)}})});
buttons.forEach(b=>b.addEventListener('click',()=>choose(b.dataset.kindChoice)));
submit.addEventListener('click',()=>insert());expire.addEventListener('click',()=>expireOne());document.querySelector('[data-action="reset"]').addEventListener('click',()=>{touch();reset()});
stage.addEventListener('pointerenter',touch);stage.addEventListener('focusin',touch);
new IntersectionObserver(es=>{visible=es[es.length-1].isIntersecting},{rootMargin:'120px'}).observe(stage);
setInterval(()=>{if(!visible||reduced.matches)return;if(phase==='sent'){tick=(tick+1)%12;needle.setAttribute('d',needlePaths[tick])}},320);
setInterval(()=>{if(!visible||reduced.matches||tour||Date.now()-idle<9000)return;tour=true;reset();open(0,true);later(()=>insert(true),900);later(()=>expireOne(true),4300);later(()=>{tour=false;idle=Date.now()-5000},6500)},1300);
reset();idle=Date.now();
`;
const body=k.plateHtml({fig:'Fig 1',title:'Inside a shielded payout',hint:'Pick a link · choose an address type',readout:'3 unclaimed · 0 sending · 0 paid · addresses stored 0',keys:[{mark:'raised',label:'Gold coins are payout links'},{mark:'line',label:'The closed tube is the shielded Ironwood payment'}],caption:'Each link releases one payment, and only to a valid shielded address. Once a block confirms it, the address is deleted. A link that expires unclaimed never moves the treasury.',body:`<div class="iso-stage" data-phase="sealed" role="group">${svg}</div>`})+`<div class="controls"><fieldset><legend>Address type</legend><button type="button" data-kind-choice="opaque" aria-pressed="true">Shielded (u1…)</button><button type="button" data-kind-choice="glass" aria-pressed="false">Transparent (t1…)</button></fieldset><button type="button" class="primary" data-action="insert" disabled>Claim</button><button type="button" data-action="expire">Let one expire</button><button type="button" data-action="reset">Reset</button></div><p class="status" role="status" aria-live="polite"></p><div class="facts"><p><strong>Links and treasury</strong>Each link is a random 22-character token, shown once; Cachet stores only its SHA-256 fingerprint. Creating links moves no funds. The Ironwood treasury targets four notes so payouts can go back to back.</p><p><strong>Address check</strong>Transparent, Sapling-only and wrong-network addresses are refused. A unified address on the right network must contain an Orchard receiver.</p><p><strong>Payment</strong>Example payout: 20,000 zats plus a 10,000-zat fee, with an encrypted memo. The observed on-chain v6 transaction had 0 transparent, 0 Sapling, 0 Orchard, 2 Ironwood actions; only the fee was public.</p><p><strong>Confirmation and expiry</strong>Paid means confirmed in a block; the stored address is then deleted. Typical blocks: 75 s mainnet, 25 s NU7 testnet, about 8 s regtest demo. Unclaimed links expire after 1–90 days and their funds stay in the treasury. Animation is compressed.</p></div>`;
for(const theme of ['dark','light']){
  let page=k.pageHtml({title:'Cachet payout anatomy',theme,body,script:live,width:1120});
  page=page.replace('</style>',css+'</style>').replace('<meta name="viewport" content="width=device-width, initial-scale=1">','<meta name="viewport" content="width=device-width, initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'unsafe-inline\'; style-src \'unsafe-inline\'; img-src data:; font-src \'none\'; connect-src \'none\'; form-action \'none\'; base-uri \'none\'">');
  writeFileSync(join(OUT,theme==='dark'?'index.html':'index-light.html'),page);
}
console.log(`built dark + light · ${parts} solid parts · ${R.tubes.length} tube runs · ${R.items.length} items`);
A.auditOrExit(R,P);
