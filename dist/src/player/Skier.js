import * as THREE from 'three';
import {createGarmentPatternTexture,createFabricMaterialMaps,createGoggleLensTexture} from '../world/ProceduralTextures.js';
import {garment,skiGeometry,skiPrint,roundedBox,jointBetween} from './skierGeometry.js';
import {grabPoseProfile,daffyLegPose,grindPoseProfile,cosmeticShapeProfile} from './freestylePoseMath.js';
const UP=new THREE.Vector3(0,1,0),V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);
const damp=(a,b,dt,rate=12)=>THREE.MathUtils.damp(a,b,rate,dt);

export class Skier {
 constructor(scene){
  this.root=new THREE.Group();this.root.name='Articulated alpine skier';this.pose=new THREE.Group();this.root.add(this.pose);scene.add(this.root);
  this.tmpMatrix=new THREE.Matrix4();this.tmpQuat=new THREE.Quaternion();this.airQuat=new THREE.Quaternion();this.up=V();this.forward=V();this.right=V();
  this.time=0;this.walkPhase=0;this.crouch=.2;this.lean=0;this.bodyYaw=0;this.switchLook=0;this.landing=0;this.landingSerial=0;this.wasAir=false;this.firstPersonMode=false;this.quality='high';this.grindPoseBlend={front:0,back:0,split:0};
  this.materials={};
  const make=(key,color,roughness=.8,metalness=0,extra={})=>this.materials[key]=new THREE.MeshStandardMaterial({color,roughness,metalness,...extra});
  make('jacket',0xd9d5c8,.88);make('jacketDark',0x202322,.91);make('jacketOlive',0x414639,.91);make('pants',0x424a38,.95);
  make('helmet',0x15191d,.78,.02);make('skin',0xc98e70,.92);make('balaclava',0x0c0f11,.96);
  this.materials.goggles=new THREE.MeshPhysicalMaterial({color:0xffffff,map:createGoggleLensTexture(),roughness:.075,metalness:.42,clearcoat:1,clearcoatRoughness:.025,iridescence:.38,iridescenceIOR:1.32,emissive:0x021126,emissiveIntensity:.10});
  make('boots',0x15191c,.38,.03);make('bootAccent',0xe4e0d6,.48,.04);make('bindings',0x11161a,.34,.28);make('sole',0x080a0b,.92,.0);
  make('poles',0x252b2f,.28,.74);make('metal',0xb9c0c3,.24,.86);make('gloves',0x111416,.92);make('trim',0x22272a,.62);make('accent',0xdcd8cc,.52,.03);make('white',0xe7e4da,.56);make('skis',0xffffff,.29,.12);
  const jacketMaps=createFabricMaterialMaps(4412,{repeatX:4.0,repeatY:6.8,weave:.72}),pantsMaps=createFabricMaterialMaps(7812,{repeatX:4.4,repeatY:7.6,weave:.85});
  for(const key of ['jacket','jacketDark','jacketOlive']){this.materials[key].bumpMap=jacketMaps.bumpMap;this.materials[key].bumpScale=.012;this.materials[key].roughnessMap=jacketMaps.roughnessMap;}
  this.materials.pants.bumpMap=pantsMaps.bumpMap;this.materials.pants.bumpScale=.018;this.materials.pants.roughnessMap=pantsMaps.roughnessMap;
  this.materials.jacket.map=createGarmentPatternTexture('plain',4412);this.materials.pants.map=createGarmentPatternTexture('plain',7812);this.materials.skis.map=skiPrint('reference');
  this.microDetails=[];this.highDetails=[];
  this.createModel();
  // v0.17.12 head overhaul: enlarge the entire head/equipment assembly and make
  // it slightly taller than it is wide. This avoids the old small "ball on a body"
  // silhouette while keeping goggles, straps and helmet variants registered.
  this.headRig.scale.set(1.15,1.20,1.17);
  // Animated limbs move far from their bind-pose geometry bounds. Disable
  // per-mesh frustum culling for this one small character hierarchy so parts
  // cannot randomly disappear while the camera or pose changes.
  this.root.traverse((obj)=>{ if(obj.isMesh||obj.isLine)obj.frustumCulled=false; });
 }
 mesh(parent,geometry,material,position=[0,0,0]){const m=new THREE.Mesh(geometry,typeof material==='string'?this.materials[material]:material);m.position.set(...position);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
 line(parent,points,radius,material){const path=new THREE.CatmullRomCurve3(points.map(p=>V(...p)));return this.mesh(parent,new THREE.TubeGeometry(path,Math.max(4,points.length*3),radius,5,false),material);}
 createModel(){
  this.hips=V(0,.84,0);
  this.pelvis=this.mesh(this.pose,garment([[-.08,.172,.118],[.00,.184,.132],[.08,.180,.130],[.15,.168,.119]],20,.030,6),'pants');
  this.upperBody=new THREE.Group();this.pose.add(this.upperBody);
  // v0.17.2 reference shell: relaxed shoulders, cream body, black yoke and real garment depth.
  this.torso=this.mesh(this.upperBody,garment([[0,.153,.112],[.07,.169,.121],[.18,.184,.132],[.31,.197,.140],[.42,.205,.143],[.50,.178,.120],[.56,.120,.097]],22,.025,6),'jacket');
  this.shoulderYoke=this.mesh(this.upperBody,garment([[.392,.218,.148],[.455,.214,.143],[.505,.190,.127],[.538,.127,.103]],22,.018,6),'jacketDark');
  this.jacketHem=this.mesh(this.upperBody,garment([[-.010,.184,.137],[.025,.193,.143],[.066,.188,.136]],20,.030,7),'jacket');
  this.collar=this.mesh(this.upperBody,garment([[.505,.126,.104],[.575,.116,.100],[.625,.105,.093]],20,.018,5),'jacket');
  this.hood=new THREE.Group();this.upperBody.add(this.hood);
  this.hoodRing=this.mesh(this.hood,new THREE.TorusGeometry(.112,.040,10,28,Math.PI*1.78),'jacket',[0,.563,-.072]);this.hoodRing.rotation.x=Math.PI/2;
  this.hoodBack=this.mesh(this.hood,roundedBox(.188,.145,.070,.034),'jacket',[0,.535,-.115]);this.hoodBack.rotation.x=-.10;
  this.hoodFold=this.line(this.hood,[[-.083,.604,-.110],[0,.637,-.126],[.083,.604,-.110]],.0055,'trim');
  this.highDetails.push(this.hoodFold);
  this.backpack=this.mesh(this.upperBody,roundedBox(.19,.27,.078,.028),'jacketDark',[0,.255,-.132]);this.backpack.visible=false;
  // Reference olive transition panels sit between black shoulder cloth and cream body.
  this.sidePanels=[];
  for(const side of [-1,1]){const panel=this.mesh(this.upperBody,roundedBox(.050,.185,.024,.010),'jacketOlive',[side*.178,.335,.134]);panel.rotation.z=-side*.08;this.sidePanels.push(panel);}
  // Silhouette-changing jacket pieces remain available to the existing cosmetics system.
  this.pufferBands=[];for(const y of [.10,.205,.31,.415]){const band=this.mesh(this.upperBody,garment([[y-.022,.166,.119],[y,.178,.126],[y+.022,.166,.119]],18,.012,5),'jacketDark');band.visible=false;this.pufferBands.push(band);}
  this.hoodiePocket=this.mesh(this.upperBody,roundedBox(.22,.105,.026,.025),'jacketDark',[0,.12,.125]);this.hoodiePocket.visible=false;
  this.oversizeHem=this.mesh(this.upperBody,garment([[-.035,.202,.145],[.025,.211,.151],[.085,.201,.142]],20,.025,6),'jacket');this.oversizeHem.visible=false;
  this.retroChestBand=this.mesh(this.upperBody,roundedBox(.33,.085,.022,.012),'accent',[0,.335,.132]);this.retroChestBand.visible=false;
  this.shellPocket=this.mesh(this.upperBody,roundedBox(.115,.075,.018,.010),'jacketDark',[.078,.31,.147]);this.shellPocket.rotation.z=-.12;this.shellPocket.visible=false;
  for(const side of [-1,1]){
   const seam=this.line(this.upperBody,[[side*.17,.49,.09],[side*.184,.34,.148],[side*.162,.10,.143]],.0045,'trim');this.highDetails.push(seam);
   const pocketZip=this.line(this.upperBody,[[side*.072,.145,.151],[side*.151,.260,.158]],.0043,'trim');this.highDetails.push(pocketZip);
  }
  this.centerZip=this.line(this.upperBody,[[0,.030,.151],[0,.28,.157],[0,.50,.137],[0,.605,.108]],.0050,'trim');
  this.zipPull=this.mesh(this.upperBody,roundedBox(.012,.034,.010,.004),'metal',[.012,.463,.157]);this.zipPull.rotation.z=.12;this.microDetails.push(this.zipPull);
  this.chestLogo=this.line(this.upperBody,[[.078,.388,.151],[.095,.404,.151],[.107,.392,.151],[.119,.407,.151],[.137,.386,.151]],.0037,'white');this.microDetails.push(this.chestLogo);
  this.headRig=new THREE.Group();this.upperBody.add(this.headRig);this.headRig.position.set(0,.655,.012);
  // Human head proportions are built from several overlapping ellipsoids rather
  // than a single sphere. The cranium is tall/oval, the mid-face projects forward,
  // and the jaw tapers toward a smaller chin. All pieces sit under the balaclava.
  this.neck=this.mesh(this.headRig,garment([[-.125,.091,.083],[.038,.087,.076]],20,.018,6),'balaclava');
  this.head=this.mesh(this.headRig,new THREE.SphereGeometry(.124,34,24),'balaclava',[0,.067,-.010]);this.head.scale.set(.82,1.16,.91);
  this.faceMid=this.mesh(this.headRig,new THREE.SphereGeometry(.104,30,20),'balaclava',[0,.018,.041]);this.faceMid.scale.set(.78,.88,.82);
  this.jaw=this.mesh(this.headRig,new THREE.SphereGeometry(.092,28,18),'balaclava',[0,-.041,.034]);this.jaw.scale.set(.73,.69,.78);
  this.chin=this.mesh(this.headRig,new THREE.SphereGeometry(.067,24,16),'balaclava',[0,-.096,.050]);this.chin.scale.set(.70,.52,.70);
  // Cheek and nose bridge volumes make the profile read like a face even though
  // the balaclava hides skin detail. They are intentionally subtle from distance.
  this.cheeks=[];for(const side of [-1,1]){const cheek=this.mesh(this.headRig,new THREE.SphereGeometry(.052,18,12),'balaclava',[side*.054,-.005,.078]);cheek.scale.set(.62,.72,.53);this.cheeks.push(cheek);}
  this.noseBridge=this.mesh(this.headRig,roundedBox(.036,.050,.050,.014),'balaclava',[0,.026,.109]);this.noseBridge.rotation.x=.08;
  this.faceMask=this.mesh(this.headRig,roundedBox(.168,.071,.077,.025),'balaclava',[0,-.008,.091]);this.faceMask.rotation.x=.105;
  // The helmet follows the oval skull instead of forming a round dome. A taller
  // crown, lower rear shell and defined brow give a much more believable ski-helmet profile.
  this.helmet=this.mesh(this.headRig,new THREE.SphereGeometry(.154,40,28,0,Math.PI*2,.07,Math.PI*.73),'helmet',[0,.118,-.034]);this.helmet.scale.set(.98,1.09,1.03);
  this.helmetLower=this.mesh(this.headRig,new THREE.SphereGeometry(.131,32,22),'helmet',[0,.043,-.054]);this.helmetLower.scale.set(1.00,.66,1.10);
  // Sloped forehead shell: the top sits farther back than the brow, giving the
  // front view/profile a real ski-helmet rake instead of a vertical toy dome.
  this.helmetForehead=this.mesh(this.headRig,roundedBox(.210,.128,.054,.022),'helmet',[0,.151,.092]);this.helmetForehead.rotation.x=-.30;
  this.helmetBrow=this.mesh(this.headRig,roundedBox(.220,.031,.068,.013),'helmet',[0,.093,.119]);this.helmetBrow.rotation.x=-.17;
  this.helmetBrim=this.mesh(this.headRig,roundedBox(.205,.013,.055,.008),'helmet',[0,.094,.145]);this.helmetBrim.rotation.x=-.16;
  this.helmetFrontVents=[];for(const side of [-1,0,1]){const vent=this.mesh(this.headRig,roundedBox(.026,.046,.008,.004),'sole',[side*.052,.176,.119]);vent.rotation.x=-.37;vent.rotation.z=side*.06;this.helmetFrontVents.push(vent);this.microDetails.push(vent);}
  this.helmetRear=this.mesh(this.headRig,roundedBox(.182,.086,.069,.024),'helmet',[0,.056,-.124]);this.helmetRear.visible=false;
  this.raceSpoiler=this.mesh(this.headRig,roundedBox(.105,.018,.08,.008),'helmet',[0,.135,-.138]);this.raceSpoiler.rotation.x=-.22;this.raceSpoiler.visible=false;
  this.retroEarPads=[];for(const side of [-1,1]){const pad=this.mesh(this.headRig,new THREE.SphereGeometry(.049,14,10),'helmet',[side*.143,.026,-.008]);pad.scale.set(.46,1.05,.86);pad.visible=false;this.retroEarPads.push(pad);}
  this.earGuards=[];for(const side of [-1,1]){const guard=this.mesh(this.headRig,new THREE.SphereGeometry(.051,14,10),'helmet',[side*.143,.027,-.018]);guard.scale.set(.38,1.06,.88);this.earGuards.push(guard);}
  this.catEars=[];for(const side of [-1,1]){const ear=this.mesh(this.headRig,new THREE.ConeGeometry(.048,.112,8),'helmet',[side*.078,.244,-.022]);ear.rotation.z=-side*.13;ear.visible=false;this.catEars.push(ear);}
  const strap=this.mesh(this.headRig,new THREE.TorusGeometry(.148,.0135,8,34),'gloves',[0,.078,-.007]);strap.rotation.x=Math.PI/2;strap.scale.set(1,1,.73);this.goggleStrap=strap;
  this.goggleInsignia=[];
  for(const side of [-1,1]){const mark=this.mesh(this.headRig,new THREE.TorusGeometry(.024,.0055,6,18),'white',[side*.149,.079,-.010]);mark.rotation.y=Math.PI/2;mark.scale.y=.62;this.goggleInsignia.push(mark);this.microDetails.push(mark);}
  const lp=[],luv=[],li=[],lensRows=7,lensCols=24;
  for(let j=0;j<=lensRows;j++)for(let i=0;i<=lensCols;i++){const a=(i/lensCols-.5)*1.95;const yy=(j/lensRows-.5)*.112;const verticalBulge=1-Math.pow(Math.abs(yy)/.056,1.8)*.030;lp.push(Math.sin(a)*.158,yy*1.08,Math.cos(a)*.158*verticalBulge+.014);luv.push(i/lensCols,1-j/lensRows);if(i<lensCols&&j<lensRows){const k=j*(lensCols+1)+i;li.push(k,k+1,k+lensCols+1,k+1,k+lensCols+2,k+lensCols+1);}}
  const lensShape=new THREE.BufferGeometry();lensShape.setAttribute('position',new THREE.Float32BufferAttribute(lp,3));lensShape.setAttribute('uv',new THREE.Float32BufferAttribute(luv,2));lensShape.setIndex(li);lensShape.computeVertexNormals();this.goggles=this.mesh(this.headRig,lensShape,'goggles',[0,.080,.004]);
  this.goggleFrame=this.mesh(this.headRig,new THREE.TorusGeometry(.130,.0095,8,34,Math.PI*1.16),'gloves',[0,.079,.108]);this.goggleFrame.rotation.set(Math.PI/2,0,.205);
  this.goggleBridge=this.mesh(this.headRig,roundedBox(.044,.014,.014,.004),'gloves',[0,.076,.155]);
  this.goggleSidePads=[];
  for(const side of [-1,1]){
   const sidePad=this.mesh(this.headRig,roundedBox(.034,.082,.075,.014),'gloves',[side*.143,.062,-.006]);this.goggleSidePads.push(sidePad);this.highDetails.push(sidePad);
  }
  for(const x of [-.056,0,.056]){const vent=this.mesh(this.headRig,roundedBox(.027,.061,.007,.004),'sole',[x,.239,-.014]);vent.rotation.x=-.56;vent.rotation.z=x*.8;this.microDetails.push(vent);}
  this.skis=[];this.legs=[];this.arms=[];this.poles=[];
  const bindingToeGeom=roundedBox(.116,.045,.090,.012),bindingTopGeom=roundedBox(.092,.020,.066,.007),bindingHeelGeom=roundedBox(.088,.090,.086,.013);
  const buckleBarGeom=roundedBox(.112,.015,.013,.005),buckleCatchGeom=roundedBox(.024,.034,.015,.004),pocketGeom=roundedBox(.074,.150,.034,.010),pocketFlapGeom=roundedBox(.078,.047,.038,.010);
  for(const side of [-1,1]){
   const ski=new THREE.Group();this.pose.add(ski);this.skis.push(ski);
   ski.edgeMesh=this.mesh(ski,skiGeometry(1.045,.014),'metal',[0,-.017,0]);
   ski.sidewall=this.mesh(ski,skiGeometry(1.015,.030),'sole',[0,-.008,0]);
   ski.topMesh=this.mesh(ski,skiGeometry(1,.022),'skis',[0,.005,0]);
   for(const [z,depth] of [[.17,.09],[-.17,.085]]){const base=this.mesh(ski,bindingToeGeom,'bindings',[0,.036,z]);base.scale.z=depth/.09;const top=this.mesh(ski,bindingTopGeom,'bootAccent',[0,.062,z]);top.scale.z=depth/.09;this.highDetails.push(top);}
   this.mesh(ski,bindingHeelGeom,'bindings',[0,.080,-.185]);
   const heelMetal=this.mesh(ski,roundedBox(.055,.018,.070,.006),'metal',[0,.126,-.196]);this.microDetails.push(heelMetal);

   const foot=new THREE.Group();this.pose.add(foot);
   this.mesh(foot,roundedBox(.137,.035,.307,.018),'sole',[0,.018,.037]);
   this.mesh(foot,roundedBox(.134,.058,.296,.022),'bindings',[0,.052,.035]);
   this.mesh(foot,garment([[.05,.066,.135,.030],[.105,.074,.137,.034],[.155,.071,.110,.010],[.205,.068,.082,-.025]],18,.010,5),'boots');
   this.mesh(foot,garment([[.155,.071,.082,-.024],[.225,.074,.078,-.035],[.285,.066,.070,-.042]],18,.012,5),'boots');
   const tongue=this.mesh(foot,roundedBox(.075,.145,.025,.010),'bootAccent',[0,.185,.071]);tongue.rotation.x=-.18;this.highDetails.push(tongue);
   const toeCap=this.mesh(foot,roundedBox(.122,.035,.090,.015),'bootAccent',[0,.092,.142]);toeCap.rotation.x=.08;this.highDetails.push(toeCap);
   for(let b=0;b<3;b++){const y=.132+b*.063;const bar=this.mesh(foot,buckleBarGeom,'metal',[0,y,b===0?.133:.052]);bar.rotation.z=side*.03;const latch=this.mesh(foot,buckleCatchGeom,'metal',[side*.071,y,b===0?.126:.043]);this.microDetails.push(bar,latch);}
   const powerStrap=this.mesh(foot,roundedBox(.128,.024,.018,.006),'bootAccent',[0,.263,.030]);this.microDetails.push(powerStrap);

   const leg={side,foot,hip:V(),knee:V(),ankle:V(),
    thigh:this.mesh(this.pose,garment([[-.5,.094,.100],[-.36,.112,.118],[-.12,.124,.129],[.15,.121,.127],[.36,.112,.119],[.5,.101,.108]],22,.050,7),'pants'),
    shin:this.mesh(this.pose,garment([[-.5,.082,.089],[-.36,.102,.108],[-.12,.111,.116],[.15,.108,.114],[.35,.104,.111],[.5,.099,.106]],22,.052,7),'pants')};
   leg.kneeCover=this.mesh(this.pose,new THREE.SphereGeometry(.100,16,12),'pants');leg.kneeCover.scale.set(1.04,1.10,1.06);
   leg.cargoPocket=this.mesh(leg.thigh,pocketGeom,'pants',[side*.108,-.045,.088]);
   leg.cargoFlap=this.mesh(leg.thigh,pocketFlapGeom,'pants',[side*.108,.043,.092]);
   leg.cargoSnap=this.mesh(leg.thigh,new THREE.CylinderGeometry(.009,.009,.005,10),'metal',[side*.108,.040,.116]);leg.cargoSnap.rotation.x=Math.PI/2;
   leg.cargoPatch=this.mesh(leg.thigh,roundedBox(.034,.022,.006,.004),'jacketDark',[side*.108,-.095,.111]);leg.cargoPatch.visible=side>0;
   if(side>0){leg.patchMark=this.line(leg.thigh,[[side*.096,-.098,.117],[side*.105,-.088,.117],[side*.112,-.095,.117],[side*.120,-.085,.117],[side*.127,-.098,.117]],.0018,'white');}
   leg.kneePatch=this.mesh(leg.thigh,roundedBox(.112,.110,.018,.012),'jacketDark',[0,-.28,.098]);leg.kneePatch.visible=false;
   leg.cuff=this.mesh(leg.shin,garment([[.28,.102,.109],[.38,.116,.121],[.46,.121,.125],[.50,.112,.116]],20,.055,7),'pants');leg.cuff.visible=false;
   leg.ankleFold=this.mesh(leg.shin,garment([[.28,.103,.110],[.315,.111,.117],[.345,.104,.111]],20,.060,8),'pants');leg.ankleFold.visible=false;
   this.legs.push(leg);

   const arm={side,shoulder:V(),elbow:V(),hand:V(side*.40,1,.3),
    upper:this.mesh(this.pose,garment([[-.5,.056,.061],[-.18,.069,.074],[.18,.073,.078],[.5,.064,.070]],20,.028,6),'jacketDark'),
    fore:this.mesh(this.pose,garment([[-.5,.047,.052],[-.18,.058,.062],[.18,.061,.065],[.5,.058,.061]],20,.030,6),'jacket'),glove:new THREE.Group()};
   arm.shoulderCover=this.mesh(this.pose,new THREE.SphereGeometry(.061,14,10),'jacketDark');arm.shoulderCover.scale.set(1.04,.88,.98);
   arm.elbowCover=this.mesh(this.pose,new THREE.SphereGeometry(.058,14,10),'jacket');
   arm.olivePanel=this.mesh(arm.upper,roundedBox(.034,.145,.018,.008),'jacketOlive',[side*.052,-.035,.067]);arm.olivePanel.rotation.z=-side*.05;
   this.pose.add(arm.glove);
   arm.glovePalm=this.mesh(arm.glove,new THREE.SphereGeometry(.058,14,11),'gloves');arm.glovePalm.scale.set(.78,1.05,.66);
   arm.gloveThumb=this.mesh(arm.glove,new THREE.CapsuleGeometry(.018,.032,3,7),'gloves',[side*.040,.014,.016]);
   arm.gloveCuff=this.mesh(arm.glove,new THREE.CylinderGeometry(.058,.064,.060,12),'gloves',[0,-.060,-.003]);
   arm.wristStrap=this.mesh(arm.glove,new THREE.TorusGeometry(.048,.0038,5,16),'trim',[0,-.030,0]);arm.wristStrap.rotation.x=Math.PI/2;this.microDetails.push(arm.wristStrap);
   this.arms.push(arm);

   const pole={shaft:this.mesh(this.pose,new THREE.CylinderGeometry(.0065,.008,1,8),'poles'),basket:this.mesh(this.pose,new THREE.TorusGeometry(.037,.0055,5,12),'bindings'),grip:this.mesh(this.pose,new THREE.CylinderGeometry(.017,.015,.115,9),'gloves'),tip:this.mesh(this.pose,new THREE.ConeGeometry(.012,.055,7),'metal')};
   this.poles.push(pole);
  }
  this.leftLeg=this.legs[0];this.rightLeg=this.legs[1];this.leftArm=this.arms[0];this.rightArm=this.arms[1];
 }
 segment(mesh,a,b){const dir=V().subVectors(b,a);mesh.position.copy(a).add(b).multiplyScalar(.5);mesh.scale.y=dir.length();mesh.quaternion.setFromUnitVectors(UP,dir.normalize());}
 setFirstPersonMode(enabled){this.firstPersonMode=Boolean(enabled);this.headRig.visible=!enabled;}
 setQuality(level='high'){
  this.quality=level;const showMicro=level==='ultra',showHigh=level!=='low';
  for(const detail of this.microDetails)detail.visible=showMicro;
  for(const detail of this.highDetails)detail.visible=showHigh;
 }
 applyLoadout(loadout){
  for(const k of ['skin','helmet','jacket','pants','skis','goggles','gloves'])if(loadout?.[k]?.color&&this.materials[k])this.materials[k].color.set(loadout[k].color);
  const pantsStyle=loadout?.pants?.style||'regular',jacketStyle=loadout?.jacket?.style||'regular',helmetStyle=loadout?.helmet?.style||'standard';
  const goggleStyle=loadout?.goggles?.style||'modern',gloveStyle=loadout?.gloves?.style||'standard',skiProfile=loadout?.skis?.profile||'allMountain';
  const shape=cosmeticShapeProfile({pants:pantsStyle,jacket:jacketStyle,helmet:helmetStyle,goggles:goggleStyle,gloves:gloveStyle,skiProfile});

  // Trousers alter the actual limb silhouette, not only the colour map. The
  // range is deliberately broad now: skinny genuinely hugs the leg, while
  // powder/extra-baggy trousers balloon through thigh, knee and boot cuff.
  for(const leg of this.legs){
   const baggy=['baggy','extraBaggy','powderBib','cargo'].includes(pantsStyle);
   const huge=['extraBaggy','powderBib'].includes(pantsStyle);
   const slim=['slim','skinny'].includes(pantsStyle);
   const depth=huge?1.16:baggy?1.09:slim?.90:1;
   leg.thigh.scale.x=shape.pantsScale;leg.thigh.scale.z=shape.pantsScale*depth;
   leg.shin.scale.x=shape.pantsScale*(huge?1.16:pantsStyle==='cargo'?1.08:slim?.92:1);leg.shin.scale.z=shape.pantsScale*(huge?1.15:baggy?1.08:slim?.89:1);
   leg.kneeCover.scale.x=shape.pantsScale*(huge?1.02:.90);leg.kneeCover.scale.z=shape.pantsScale*(huge?1.08:.92);
   const showCargo=['cargo','baggy','extraBaggy','powderBib'].includes(pantsStyle);
   leg.cargoPocket.visible=showCargo;leg.cargoFlap.visible=showCargo;leg.cargoSnap.visible=showCargo&&this.quality!=='low';
   leg.cargoPatch.visible=showCargo&&leg.side>0&&this.quality!=='low';if(leg.patchMark)leg.patchMark.visible=showCargo&&this.quality!=='low';
   leg.kneePatch.visible=pantsStyle==='retro';leg.cuff.visible=['baggy','extraBaggy','powderBib','retro','cargo'].includes(pantsStyle);leg.ankleFold.visible=leg.cuff.visible;
   if(leg.cuff){leg.cuff.scale.x=huge?1.38:baggy?1.18:1;leg.cuff.scale.z=huge?1.34:baggy?1.16:1;}
   if(leg.ankleFold){leg.ankleFold.scale.x=huge?1.34:baggy?1.16:1;leg.ankleFold.scale.z=huge?1.30:baggy?1.14:1;}
  }
  this.pelvis.scale.x=shape.pantsScale*(pantsStyle==='skinny'?.92:1);this.pelvis.scale.z=shape.pantsScale*(['extraBaggy','powderBib'].includes(pantsStyle)?1.12:pantsStyle==='skinny'?.88:1);

  // Jacket styles now differ in width AND length/depth, so a slim shell and an
  // oversized anorak read as different clothes at gameplay camera distance.
  const jacketLength={slim:.95,regular:1,baggy:1.06,oversized:1.13,puffer:1.04,retro:1.01,shell:.99,windbreaker:.97,hoodie:1.08,anorak:1.10}[jacketStyle]||1;
  this.torso.scale.set(shape.jacketScale,jacketLength,shape.jacketScale*(jacketStyle==='puffer'?1.10:1));
  this.shoulderYoke.scale.x=Math.min(1.42,shape.jacketScale*.98);this.shoulderYoke.scale.z=Math.min(1.40,shape.jacketScale*(jacketStyle==='puffer'?1.12:1));
  this.jacketHem.scale.x=shape.jacketScale*(jacketStyle==='oversized'||jacketStyle==='anorak'?1.07:1);this.jacketHem.scale.z=shape.jacketScale;
  for(const arm of this.arms){
   arm.upper.scale.x=shape.jacketScale;arm.upper.scale.z=shape.jacketScale;
   arm.fore.scale.x=Math.max(.88,shape.jacketScale*.94);arm.fore.scale.z=Math.max(.88,shape.jacketScale*.94);
   arm.shoulderCover.scale.set(.98*shape.jacketScale,.84, .92*shape.jacketScale);
   arm.glove.scale.setScalar(shape.gloveScale);
  }
  this.hood.visible=jacketStyle!=='retro'&&jacketStyle!=='puffer';this.hood.scale.setScalar(jacketStyle==='hoodie'||jacketStyle==='anorak'?1.16:1);
  for(const panel of this.sidePanels)panel.visible=!['retro','puffer','hoodie'].includes(jacketStyle);
  this.hoodiePocket.visible=jacketStyle==='hoodie'||jacketStyle==='anorak';this.oversizeHem.visible=['oversized','baggy','anorak'].includes(jacketStyle);
  this.retroChestBand.visible=jacketStyle==='retro';this.shellPocket.visible=jacketStyle==='shell'||jacketStyle==='windbreaker';
  for(const band of this.pufferBands)band.visible=jacketStyle==='puffer';

  // Helmet variants change profile and hardware, not just paint.
  const helmetDepth=helmetStyle==='race'?.96:helmetStyle==='retro'?1.06:helmetStyle==='oversized'?1.14:helmetStyle==='freeride'?1.10:helmetStyle==='visor'?1.16:1.04;
  const helmetHeight=helmetStyle==='race'?.88:helmetStyle==='retro'?1.05:helmetStyle==='oversized'?1.12:helmetStyle==='freeride'?1.02:helmetStyle==='visor'?.96:.98;
  this.helmet.scale.set(.98*shape.helmetScale,1.09*shape.helmetScale*helmetHeight,1.03*shape.helmetScale*helmetDepth);
  this.helmetLower.scale.set(1.00*shape.helmetScale,.66*shape.helmetScale*helmetHeight,1.10*shape.helmetScale*helmetDepth);
  this.helmetForehead.scale.set(shape.helmetScale,shape.helmetScale*helmetHeight,shape.helmetScale*(helmetStyle==='visor'?1.06:1));
  this.helmetForehead.rotation.x=helmetStyle==='race'?-.36:helmetStyle==='retro'?-.23:helmetStyle==='freeride'?-.32:-.30;
  this.helmetBrim.visible=!['race','visor'].includes(helmetStyle);
  this.helmetBrim.scale.set(helmetStyle==='freeride'?1.18:helmetStyle==='compact'?.90:1,1,helmetStyle==='freeride'?1.18:1);
  this.helmetRear.visible=['retro','oversized','freeride','visor'].includes(helmetStyle);this.helmetRear.scale.set(helmetStyle==='visor'?1.10:1,helmetStyle==='oversized'?1.22:1,helmetStyle==='freeride'?1.18:1);
  this.raceSpoiler.visible=helmetStyle==='race'||helmetStyle==='visor';this.raceSpoiler.scale.set(helmetStyle==='visor'?1.28:1,1,helmetStyle==='visor'?1.18:1);
  for(const pad of this.retroEarPads)pad.visible=helmetStyle==='retro';for(const guard of this.earGuards)guard.visible=helmetStyle!=='retro';
  for(const ear of this.catEars||[])ear.visible=helmetStyle==='cat';

  // Actual ski-goggle silhouettes: compact, frameless, cylindrical and race
  // lenses use clearly different aspect ratios and frame/strap treatments.
  const goggleAspect={small:[.78,.72,.80],modern:[1,1,1],frameless:[1.18,1.14,1.06],retro:[.93,.80,.90],cylindrical:[1.18,.92,.83],race:[.92,.70,.84]}[goggleStyle]||[1,1,1];
  this.goggles.scale.set(shape.goggleScale*goggleAspect[0],goggleAspect[1],shape.goggleScale*goggleAspect[2]);
  this.goggleStrap.scale.set(shape.goggleScale*(goggleStyle==='cylindrical'?1.10:1),goggleStyle==='race'?.82:1,goggleStyle==='retro'?.88:.74);
  this.goggleFrame.visible=goggleStyle!=='frameless';this.goggleFrame.scale.set(goggleAspect[0]*(goggleStyle==='retro'?1.08:1),goggleAspect[1],goggleAspect[2]);
  this.goggleBridge.visible=!['frameless','cylindrical'].includes(goggleStyle);
  for(const pad of this.goggleSidePads||[])pad.visible=goggleStyle!=='frameless';

  // Ski profiles are cosmetic only: visual width/length changes with no physics effect.
  for(const ski of this.skis){
   ski.scale.x=shape.skiWidth;ski.scale.z=shape.skiLength;
  }

  this.materials.jacket.map=createGarmentPatternTexture(loadout?.jacket?.pattern||'plain',4412);
  this.materials.pants.map=createGarmentPatternTexture(loadout?.pants?.pattern||'plain',7812);
  this.materials.helmet.map=helmetStyle==='sticker'?createGarmentPatternTexture('stickers',6154):null;
  this.materials.skis.map=skiPrint(loadout?.skis?.pattern||'reference');
  for(const mat of [this.materials.jacket,this.materials.pants,this.materials.helmet,this.materials.skis])mat.needsUpdate=true;
 }
 setHeightCm(value=180){
  const cm=THREE.MathUtils.clamp(Number(value)||180,165,195);
  this.heightCm=cm;
  const ratio=cm/180;
  // Scale around the feet/root so height changes do not move the skier off the snow.
  // Only the vertical dimension changes; ski length/width and physics stay consistent.
  this.pose.scale.set(1,ratio,1);
  return cm;
 }
 skiPoint(index,x=0,y=.035,z=0){
  const ski=this.skis[index];ski.updateMatrix();return V(x,y,z).applyMatrix4(ski.matrix);
 }

 update(s,input,dt,liftMode=false){
  dt=Math.min(.05,dt);this.time+=dt;
  this.root.visible=true;this.pose.visible=true;
  this.root.position.copy(s.position).addScaledVector(s.normal,s.grounded&&!liftMode?.01-.12*s.normal.y:-.11);
  this.up.copy(liftMode?UP:s.normal).normalize();
  this.forward.copy(s.forward).projectOnPlane(this.up).normalize();if(this.forward.lengthSq()<.01)this.forward.set(0,0,1);
  if(s.switchStance&&!liftMode&&s.skisEquipped)this.forward.negate();
  this.right.crossVectors(this.up,this.forward).normalize();this.tmpMatrix.makeBasis(this.right,this.up,this.forward);this.tmpQuat.setFromRotationMatrix(this.tmpMatrix);

  const cabin=liftMode&&String(s.activityMode).includes('gondola');
  const air=!s.grounded&&!s.grinding&&!liftMode,walking=!s.skisEquipped&&!liftMode,resting=Boolean(s.resting)&&s.grounded&&s.skisEquipped&&!liftMode,powder=s.surface==='POWDER'&&s.grounded&&s.skisEquipped&&!liftMode,grab=Boolean(s.currentGrab),flip=air&&Math.abs(s.pitchVelocity||0)>.25;
  const spreadFlight=air&&s.spreadEagle&&!s.skisEquipped;
  const grabProfile=grabPoseProfile(s.currentGrab,s.currentGrabTweak||{});
  const grindProfile=grindPoseProfile(s.grindType,s.grindYaw||0);
  this.grindPoseBlend.front=damp(this.grindPoseBlend.front,s.grinding&&s.grindType==='FRONT SKI OFF'?1:0,dt,10);
  this.grindPoseBlend.back=damp(this.grindPoseBlend.back,s.grinding&&s.grindType==='BACK SKI OFF'?1:0,dt,10);
  this.grindPoseBlend.split=damp(this.grindPoseBlend.split,s.grinding&&s.grindType==='SPLIT-SIDE SLIDE'?1:0,dt,10);

  if(air)this.tmpQuat.multiply(this.airQuat.setFromEuler(new THREE.Euler(s.airPitch,s.airYaw,0,'YXZ')));
  if(spreadFlight)this.tmpQuat.multiply(this.airQuat.setFromEuler(new THREE.Euler(1.02,0,0,'XYZ')));
  // Butter yaw is a stance rotation layered on top of downhill travel. On release
  // SkiPhysics converts half-turns into switchStance, so the visual pose stays continuous.
  if(!air&&s.manualType==='NOSE BUTTER')this.tmpQuat.multiply(this.airQuat.setFromAxisAngle(UP,s.butterYaw||0));
  this.root.quaternion.slerp(this.tmpQuat,1-Math.exp(-20*dt));

  const steer=input.steerAxis(),tuck=false,brake=s.grounded&&(input.isBrakeHeld?.() ?? (input.isDown('KeyS')||input.isDown('ControlLeft')||input.isDown('ControlRight'))),speed=Math.min(1,s.speed/35);
  const switchTarget=s.switchStance&&!air&&!liftMode&&s.skisEquipped?1:0;this.switchLook=damp(this.switchLook,switchTarget,dt,7);
  const switchSide=Math.sign(s.butterDirection||steer||1);
  if((s.landingSerial||0)!==this.landingSerial){this.landing=Math.min(1,(s.lastLandingImpact||0)/12);this.landingSerial=s.landingSerial||0;}this.landing*=Math.exp(-5*dt);
  const railImpact=s.grinding?Math.exp(-(s.grindAge||0)*8)*.65:0;
  const grindSpecial=Math.max(this.grindPoseBlend.front,this.grindPoseBlend.back,this.grindPoseBlend.split);
  let targetCrouch=resting?1:walking?.08:liftMode?(cabin?.12:.75):grab||flip?.88:s.crashed?1:Math.max(tuck?.95:brake?.62:air?.30:.26,Math.abs(steer)*speed*.62,(s.suspension||0)*.7,this.landing,railImpact,grindSpecial*.56);
  // The same surfy, compressed stance is used anywhere the terrain reports
  // POWDER: chairline glades, western basin and ordinary off-piste snow alike.
  if(powder&&!resting)targetCrouch=Math.max(targetCrouch,.42);
  this.crouch=damp(this.crouch,targetCrouch,dt);this.lean=damp(this.lean,resting?0:s.grounded&&!s.grinding?-steer*(.10+speed*.30):0,dt);

  let grabYaw=0;
  if(grab){
   grabYaw=grabProfile.handSide*.14*grabProfile.style+(grabProfile.method?grabProfile.handSide*.20*grabProfile.style:0)+(grabProfile.crossbone?-.28*grabProfile.style:0)+(grabProfile.nose?grabProfile.handSide*.10:0)+(grabProfile.tail?-grabProfile.handSide*.08:0);
  }
  const yaw=s.grinding?s.grindYaw||0:grab?grabYaw:0;this.bodyYaw=damp(this.bodyYaw,yaw,dt,10);
  this.pose.rotation.set(s.crashed?.85:0,this.bodyYaw,this.lean+(s.crashed?.6:0));
  this.pose.position.y=damp(this.pose.position.y,s.crashed?-.38:0,dt);
  if(walking)this.walkPhase+=s.speed*dt*3.2;

  const hipHeight=resting?.42:liftMode?(cabin?.88:.68):grab||flip?.765:walking?.87:.89-this.crouch*.225-(powder?.035:0);
  let grindHipShift=0;
  if(grindProfile.kind==='oneSki'){
   const blend=s.grindType==='FRONT SKI OFF'?this.grindPoseBlend.front:this.grindPoseBlend.back;
   grindHipShift=grindProfile.supportSide*.095*blend;
  }
  const noseButter=(!air&&!s.grinding&&s.manualType==='NOSE BUTTER');
  this.hips.set(-this.lean*.13+grindHipShift,hipHeight,resting?-.19:liftMode?0:noseButter?.165:-.085-this.crouch*.095-(powder?.025:0));
  this.pelvis.position.copy(this.hips);this.pelvis.rotation.set((resting?.16:.07)+grindSpecial*.05,this.lean*.12-grindHipShift*.8,grindHipShift*.75);
  this.upperBody.position.copy(this.hips);
  const grabFold=grab?(grabProfile.method?.48:grabProfile.nose?.52:grabProfile.tail?.34:grabProfile.front?.50:.42)+.10*(1-grabProfile.style):0;
  this.upperBody.rotation.x=damp(this.upperBody.rotation.x,resting?.08:liftMode?.02:walking?.07:s.skiJumpPose?.7:spreadFlight?.02:grab?grabFold:flip?.44:noseButter?.78:s.polePushing?.10:.18+this.crouch*.28,dt);
  const poleTorsoYaw=s.polePushing?(s.polePushSide==='left'?-.055:s.polePushSide==='right'?.055:0):0;
  const upperYaw=(s.grinding?-this.bodyYaw*.36-grindHipShift*.9:grab?-grabYaw*.55:-steer*.14)+this.switchLook*switchSide*.28+poleTorsoYaw;
  this.upperBody.rotation.y=damp(this.upperBody.rotation.y,upperYaw,dt,11);this.upperBody.rotation.z=-this.lean*.40-grindHipShift*.95;
  this.headRig.rotation.x=-this.upperBody.rotation.x*.58;this.headRig.rotation.y=(s.grinding?-this.bodyYaw*.18:grab?-grabYaw*.30:-steer*.08)+this.switchLook*switchSide*.46;this.upperBody.updateMatrix();

  const daffyAmount=s.daffy?THREE.MathUtils.clamp((s.daffyTime||0)*5.5,0,1):0;
  for(let i=0;i<2;i++){
   const leg=this.legs[i],ski=this.skis[i],side=leg.side,stride=walking?Math.sin(this.walkPhase+(i?Math.PI:0)):0;
   const spread=s.spreadEagle,daffy=s.daffy;
   let feetX=(resting?.245:spread?.62:s.skiJumpPose?.26:brake?.37:.205+(powder?.032:0))*side;
   let feetY=resting?.02:liftMode?(cabin?.025:-.05):grab||flip?.49:spread?.33:walking?Math.max(0,stride)*.095:.025;
   let feetZ=resting?.255:liftMode?(cabin?.06:.37):grab||flip?.22:walking?stride*.30:s.skiJumpPose?.32:noseButter?.14:.06+(powder?.035:0);
   let targetPitch=resting?.10:liftMode?(cabin?0:.58):grab||flip?-.18:noseButter?.34:0;
   let targetYaw=s.spreadEagle?-side*.25:s.crossSkis?-side*.40:s.skiJumpPose?side*.24:brake?-side*.46:s.grindType==='LEFT SKI'&&side>0?.18:s.grindType==='RIGHT SKI'&&side<0?-.18:0;
   let targetRoll=s.grounded&&!s.grinding?-steer*.12:0;

   if(daffy){
    const dp=daffyLegPose(side,daffyAmount);feetX=dp.x;feetY=dp.y;feetZ=dp.z;targetPitch=dp.pitch;targetYaw=dp.yaw;targetRoll=dp.roll;
   }
   if(spreadFlight){
    feetX=side*.84;feetY=.12;feetZ=-.06;targetPitch=-.10;targetYaw=-side*.58;targetRoll=side*.16;
   }

   if(grab){
    const t=grabProfile.style,hand=grabProfile.handSide;
    if(grabProfile.method){
     const grabbed=side===hand;
     feetX=side*(.225+.115*t)+(grabbed?hand*.035*t:0);
     feetY=.47+(grabbed?.015:.055)*t;
     feetZ=.20+(grabbed?-.20:.12)*t;
     targetPitch=-.16+(grabbed?-.14:.08)*t;
     targetYaw+=side*.12*t+hand*.16*t;
     targetRoll+=-hand*(grabbed?.36:.18)*t;
    }else if(grabProfile.stiffy){
     const grabbed=side===hand;
     feetX=side*(.22+.06*t);feetY=grabbed?.46:.50+.12*t;feetZ=grabbed?.24:.34+.22*t;
     targetPitch=grabbed?-.14:.10+.20*t;targetYaw+=side*.08*t;targetRoll+=hand*.08*t;
    }else if(grabProfile.crossbone){
     const cross=.06+.12*t;feetX=-side*cross;feetY=.45+(side>0?.03:.08)*t;feetZ=.20+(side>0?.08:-.02)*t;
     targetYaw+=-side*(.28+.34*t);targetRoll+=side*.11*t;
    }else if(grabProfile.nose){
     const grabbed=side===hand;feetX=side*(.21+.05*t);feetY=grabbed?.54:.47;feetZ=grabbed?.42:.13;
     targetPitch=grabbed?-.34:-.08;targetYaw+=hand*.18*t;targetRoll+=-hand*.12*t;
    }else if(grabProfile.tail){
     const grabbed=side===hand;feetX=side*(.23+.07*t);feetY=grabbed?.43:.54;feetZ=grabbed?-.10:.36;
     targetPitch=grabbed?.10:-.22;targetYaw+=-hand*.15*t;targetRoll+=hand*.15*t;
    }else if(grabProfile.front){
     const grabbed=side===hand;feetX=-side*(.035+.035*t);feetY=grabbed?.53:.47;feetZ=grabbed?.37:.20;
     targetPitch=grabbed?-.28:-.12;targetYaw+=-side*(.34+.16*t);targetRoll+=side*.12*t;
    }else if(grabProfile.double){
     feetX=side*(.215+.045*grabProfile.total);feetY=.47;feetZ=.18;targetRoll+=side*.06*grabProfile.total;
    }
   }

   // Rail specials use explicit support/free-leg weight transfer rather than only
   // moving a ski mesh. The hips above shift toward the loaded ski at the same time.
   if(s.grinding&&grindProfile.kind==='oneSki'){
    const blend=s.grindType==='FRONT SKI OFF'?this.grindPoseBlend.front:this.grindPoseBlend.back;
    if(side===grindProfile.freeSide){
     feetX=THREE.MathUtils.lerp(side*.205,side*.43,blend);feetY=THREE.MathUtils.lerp(.025,.255,blend);feetZ=THREE.MathUtils.lerp(.06,-grindProfile.supportSide*.16,blend);
     targetPitch=THREE.MathUtils.lerp(0,-.14,blend);targetRoll=THREE.MathUtils.lerp(0,-side*.18,blend);
    }else{
     feetX=THREE.MathUtils.lerp(side*.205,side*.155,blend);feetY=THREE.MathUtils.lerp(.025,-.01,blend);feetZ=THREE.MathUtils.lerp(.06,.025,blend);
     targetRoll=THREE.MathUtils.lerp(0,side*.06,blend);
    }
   }else if(s.grinding&&grindProfile.kind==='split'){
    const blend=this.grindPoseBlend.split;feetX=THREE.MathUtils.lerp(side*.205,side*.39,blend);feetY=THREE.MathUtils.lerp(.025,.105+(side>0?.035:0),blend);feetZ=THREE.MathUtils.lerp(.06,-side*.11,blend);
    targetYaw+=-side*.16*blend;targetRoll+=side*.16*blend;targetPitch=-.04*blend;
   }

   leg.foot.position.lerp(V(feetX,feetY,feetZ),1-Math.exp(-13*dt));
   if(s.manualType==='NOSE BUTTER')targetRoll+=-side*.10;
   leg.foot.rotation.set(damp(leg.foot.rotation.x,targetPitch,dt,13),damp(leg.foot.rotation.y,targetYaw,dt,13),damp(leg.foot.rotation.z,targetRoll,dt,13));
   if(!s.skisEquipped||cabin){ski.position.set(side*.07,this.hips.y+.28,-.33);ski.rotation.set(Math.PI/2,0,side*.055);}else{ski.position.copy(leg.foot.position);ski.quaternion.copy(leg.foot.quaternion);}
   leg.foot.updateMatrix();leg.ankle.set(0,.205,-.02).applyMatrix4(leg.foot.matrix);
   let hipSide=.13;
   if(s.grinding&&grindProfile.kind==='oneSki'&&side===grindProfile.supportSide)hipSide=.115;
   leg.hip.copy(this.hips).add(V(side*hipSide,.02,0));const target=leg.ankle.clone();
   const bendPole=V(side*(s.grinding&&grindProfile.kind==='oneSki'? .22:.14),grindSpecial?-.06:0,1);
   jointBetween(leg.hip,target,.435,.425,bendPole,leg.knee);
   this.segment(leg.thigh,leg.hip,leg.knee);this.segment(leg.shin,leg.knee,leg.ankle);leg.kneeCover.position.copy(leg.knee);
  }

  for(let i=0;i<2;i++){
   const arm=this.arms[i],side=arm.side,pole=this.poles[i];arm.shoulder.set(side*.187,.452,.0).applyMatrix4(this.upperBody.matrix);arm.shoulderCover.position.copy(arm.shoulder);
   let target=V(side*(powder?.43:.37),this.hips.y+.23+(powder?.045:0),.29+this.crouch*.09-(powder?.04:0));
   if(resting)target.set(side*.34,.58,.30);
   else if(liftMode)target.set(side*.27,.76,.36);
   else if(walking)target.set(side*.35,1.02,.08+Math.sin(this.walkPhase+(i?Math.PI:0))*.22);
   else if(spreadFlight)target.set(side*.98,.93,-.02);
   else if(s.spreadEagle)target.set(side*.72,1.18,.10);
   else if(s.daffy)target.set(side*.62,1.15,side<0?.02:.25);
   else if(s.skiJumpPose)target.set(side*.29,.90,-.43);
   else if(s.grinding){
    const sway=Math.sin(this.time*3.1)*.022+(s.grindBalance||0)*side*.09;
    if(grindProfile.kind==='oneSki'){
     const isSupport=side===grindProfile.supportSide;target.set(side*(isSupport?.53:.73),.98+sway+(isSupport?-.02:.08),isSupport?.02:-grindProfile.supportSide*.12);
    }else if(grindProfile.kind==='split')target.set(side*.72,1.06+sway,-side*.06);
    else target.set(side*.60,.99+sway,.08-side*Math.sin(this.bodyYaw)*.18);
   }
   else if(s.manualType==='NOSE BUTTER')target.set(side*.49,.98,.62);
   else if(s.polePushing){
     const active=s.polePushSide==='both'||(i===0?s.polePushSide==='left':s.polePushSide==='right');
     if(active){
      const phase=THREE.MathUtils.clamp(s.polePushPhase||0,0,1);
      const smooth=(v)=>v*v*(3-2*v);
      // Realistic alpine pole stroke: reach -> plant -> drive past hip -> relaxed recovery.
      // Hand stays below the shoulder and never teleports across the torso.
      let z=.26,y=.99,out=.39;
      if(phase<.18){
       const e=smooth(phase/.18);z=THREE.MathUtils.lerp(.26,.16,e);y=THREE.MathUtils.lerp(.99,.93,e);out=THREE.MathUtils.lerp(.39,.42,e);
      }else if(phase<.64){
       const e=smooth((phase-.18)/.46);z=THREE.MathUtils.lerp(.16,-.18,e);y=THREE.MathUtils.lerp(.93,.86,e);out=THREE.MathUtils.lerp(.42,.36,e);
      }else{
       const e=smooth((phase-.64)/.36);z=THREE.MathUtils.lerp(-.18,.24,e);y=THREE.MathUtils.lerp(.86,.99,e);out=THREE.MathUtils.lerp(.36,.39,e);
      }
      target.set(side*out,y,z);
     }
   }
   else if(this.landing>.08)target.set(side*(.40+.10*this.landing),this.hips.y+.22-.05*this.landing,.20-.10*this.landing);
   else if(s.grounded){target.x+=steer*.05+this.switchLook*switchSide*side*.035;target.y+=side*steer*.07;target.z-=this.switchLook*.055;}
   else if(air)target.set(side*(flip?.34:.50),1.01,.18);

   if(grab){
    const name=grabProfile.clean,both=grabProfile.double,left=name.startsWith('LEFT')||['MUTE','STALEFISH'].includes(name),right=name.startsWith('RIGHT')||['SAFETY','TAIL','NOSE','JAPAN'].includes(name);
    const active=both||(i===0&&left)||(i===1&&right);
    if(active){
     let idx=name==='MUTE'?1:name==='JAPAN'?0:i;
     let z=name==='TAIL'?-.37:name==='NOSE'?.43:THREE.MathUtils.clamp((s.currentGrabTweak?.y||0)*.34,-.34,.38);
     let edge=side*.038;
     if(grabProfile.method){idx=side<0?0:1;z=-.06-.10*grabProfile.style;edge=-side*(.018+.018*grabProfile.style);}
     if(grabProfile.stiffy){idx=side<0?0:1;z=.23+.10*grabProfile.style;edge=side*.026;}
     if(grabProfile.crossbone){idx=0;z=.08;edge=.018;}
     target.copy(this.skiPoint(idx,edge,.040,z));
     // The glove centre sits just above the topsheet; this avoids the old "grab below ski" look.
     target.y+=.012;
    }else if(grabProfile.method){
     // Non-grabbing arm opens away from the body for a readable Method silhouette.
     target.set(side*(.57+.12*grabProfile.style),1.05+.08*grabProfile.style,-.02-.12*grabProfile.style);
    }else if(grabProfile.stiffy||grabProfile.crossbone){target.set(side*.58,1.08,.08);}
   }

   arm.hand.lerp(target,1-Math.exp(-(grab?16:11)*dt));
   const polePushActive=s.polePushing&&(s.polePushSide==='both'||(i===0?s.polePushSide==='left':s.polePushSide==='right'));
   const elbowPole=polePushActive?V(side*1.08,-.03,.22):spreadFlight?V(side*.96,.02,-.10):V(side*.70,-.18,-.35);
   jointBetween(arm.shoulder,arm.hand,.302,.282,elbowPole,arm.elbow);
   this.segment(arm.upper,arm.shoulder,arm.elbow);this.segment(arm.fore,arm.elbow,arm.hand);arm.elbowCover.position.copy(arm.elbow);arm.glove.position.copy(arm.hand);arm.glove.quaternion.copy(arm.fore.quaternion);
   const show=s.skisEquipped&&!liftMode&&!s.crashed&&!s.skiJumpPose;for(const m of Object.values(pole))m.visible=show;
   if(show){
    const activePush=s.polePushing&&(s.polePushSide==='both'||(i===0?s.polePushSide==='left':s.polePushSide==='right'));
    const phase=THREE.MathUtils.clamp(s.polePushPhase||0,0,1);
    const seatedDrag=resting&&s.speed>2.2;
    let poleBack=grab||air?-.72:-.68,poleDrop=.85,poleSide=.12;
    if(seatedDrag){poleBack=-1.10;poleDrop=1.10;poleSide=.09;}
    else if(resting){poleBack=-.46;poleDrop=.62;poleSide=.22;}
    else if(activePush){
      // Tip is handled as a planted world/local point below; these values are
      // only the neutral fallback used during the final recovery frames.
      poleBack=-.48;poleDrop=.86;poleSide=.10;
    }
    let tip;
    if(activePush){
      const smooth=(v)=>v*v*(3-2*v);
      const plant=V(side*.44,.05,.12);
      const release=V(side*.38,.06,-.10);
      const neutral=arm.hand.clone().add(V(side*.10,-.80,-.48));
      if(phase<.16){
        const e=smooth(phase/.16);
        tip=neutral.lerp(plant,e);
      }else if(phase<.62){
        const e=smooth((phase-.16)/.46);
        tip=plant.clone().lerp(release,e*.35);
      }else{
        const e=smooth((phase-.62)/.38);
        tip=release.clone().lerp(neutral,e);
      }
    }else tip=arm.hand.clone().add(V(side*poleSide,-poleDrop,poleBack));
    this.segment(pole.shaft,arm.hand,tip);pole.grip.position.copy(arm.hand);pole.grip.quaternion.copy(pole.shaft.quaternion);
    pole.basket.position.copy(tip).lerp(arm.hand,.045);pole.basket.quaternion.copy(pole.shaft.quaternion).multiply(new THREE.Quaternion().setFromAxisAngle(V(1,0,0),Math.PI/2));
    pole.tip.position.copy(tip).addScaledVector(V().subVectors(tip,arm.hand).normalize(),.025);pole.tip.quaternion.copy(pole.shaft.quaternion);
   }
  }
  this.animationState=liftMode?(String(s.activityMode).includes('gondola')?'gondola':'chairlift'):resting?'resting on skis':walking?'walking':s.crashed?'bail':s.grinding?(Math.abs(s.grindYaw||0)>1?'boardslide':'grind'):s.spreadEagle?'spread eagle':s.daffy?'daffy':grab?'grab':flip?'flip':air?(Math.abs(s.yawVelocity||0)>.15?'spin':'airborne'):this.landing>.1?'landing':s.polePushing?'pole push':s.manualType||brake&&'braking'||tuck&&'crouch'||s.switchStance&&'switch riding'||powder&&'powder stance'||s.transition&&'transition'||Math.abs(steer)>.1&&'carve'||'neutral';
 }
}
