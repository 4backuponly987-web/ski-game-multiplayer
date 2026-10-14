import {CREATIVE_RAILS} from './CreativeLines.js';
import { batchStatic } from './staticBatch.js';
import { RailPath,railShape,railClosest } from './railPath.js';
import * as THREE from 'three';
import { chairlineXAt, getRun } from './RunDefinitions.js';
import { rampOffset } from './featureMath.js';
import { createRockTextures } from './ProceduralTextures.js';

// The user should encounter something to hit on every descent, but the park is
// still the densest area. width is the broad takeoff width; the shaped snow
// shoulders extend beyond it so there are no vertical side walls to clip into.
// Transition gaps are calibrated against the actual 28% backside grade. The
// expected flight range uses the same bounded pop impulse as SkiPhysics and a
// target approach speed for each line. Landings start before the expected
// contact and continue well beyond it, so normal speed variation is caught.
export function expectedTransitionFlightRange(targetSpeed, boost, slope = 0.28) {
  const speed=Math.max(1,Number(targetSpeed)||1);
  const vertical=Math.min(3.4,(Number(boost)||0)*0.42);
  const airTime=2*(vertical+slope*speed)/9.81;
  return speed*Math.max(0,airTime);
}
function calibratedTransitionJump(def) {
  const expectedRange=expectedTransitionFlightRange(def.targetSpeed,def.boost);
  const lowRange=expectedTransitionFlightRange(def.targetSpeed*0.8,def.boost);
  const highRange=expectedTransitionFlightRange(def.targetSpeed*1.2,def.boost);
  // Compact-stadium calibration: keep real gaps, but shorten the dead snow between
  // features. A ±20% speed window still lands well inside the catch ramp.
  const gap=Math.round(THREE.MathUtils.clamp(lowRange-7,10,16));
  const landingLength=Math.round(THREE.MathUtils.clamp(highRange+7-gap,28,44));
  return Object.freeze({...def,gap,landingLength,expectedRange:Number(expectedRange.toFixed(2)),lowRange:Number(lowRange.toFixed(2)),highRange:Number(highRange.toFixed(2)),noPaint:true});
}
export const TRANSITION_JUMPS = Object.freeze([
 // Three interleaved lanes. Global feature spacing is ~40–50 m, while each
 // individual lane still has enough recovery room for its landing ramp.
 calibratedTransitionJump({run:'transition',z:-1810,offsetX:0,width:20,length:22,height:3.0,boost:4.1,targetSpeed:18,size:'DROP-IN GAP'}),
 calibratedTransitionJump({run:'transition',z:-1855,offsetX:-110,width:16,length:18,height:2.2,boost:3.6,targetSpeed:18,size:'WEST STEP'}),
 calibratedTransitionJump({run:'transition',z:-1900,offsetX:110,width:17,length:19,height:2.4,boost:3.8,targetSpeed:18,size:'EAST STEP'}),
 calibratedTransitionJump({run:'transition',z:-1945,offsetX:0,width:21,length:23,height:3.2,boost:4.2,targetSpeed:18,size:'CENTER BIG GAP'}),
 calibratedTransitionJump({run:'transition',z:-1990,offsetX:-115,width:16,length:18,height:2.3,boost:3.7,targetSpeed:18,size:'PIPE TRANSFER'}),
 calibratedTransitionJump({run:'transition',z:-2035,offsetX:115,width:18,length:20,height:2.6,boost:3.9,targetSpeed:18,size:'QUARTER EXIT'}),
 calibratedTransitionJump({run:'transition',z:-2080,offsetX:0,width:19,length:21,height:2.8,boost:4.0,targetSpeed:18,size:'STADIUM STEP'}),
 calibratedTransitionJump({run:'transition',z:-2080,offsetX:-112,width:16,length:18,height:2.2,boost:3.7,targetSpeed:18,size:'WEST PIPE STEP'}),
 calibratedTransitionJump({run:'transition',z:-2125,offsetX:115,width:17,length:19,height:2.4,boost:3.8,targetSpeed:18,size:'EAST HIP GAP'}),
 calibratedTransitionJump({run:'transition',z:-2170,offsetX:-115,width:17,length:19,height:2.4,boost:3.8,targetSpeed:18,size:'WEST HIP GAP'}),
 calibratedTransitionJump({run:'transition',z:-2215,offsetX:0,width:22,length:24,height:3.4,boost:4.3,targetSpeed:19,size:'PLAZA DOUBLE'}),
 calibratedTransitionJump({run:'transition',z:-2260,offsetX:112,width:16,length:18,height:2.2,boost:3.6,targetSpeed:18,size:'WALL-TO-FLOW GAP'}),
 calibratedTransitionJump({run:'transition',z:-2305,offsetX:-112,width:16,length:18,height:2.2,boost:3.6,targetSpeed:18,size:'WEST POCKET GAP'}),
 calibratedTransitionJump({run:'transition',z:-2350,offsetX:0,width:20,length:22,height:3.0,boost:4.1,targetSpeed:18,size:'SPINE TRANSFER'}),
 calibratedTransitionJump({run:'transition',z:-2395,offsetX:112,width:17,length:19,height:2.5,boost:3.8,targetSpeed:18,size:'EAST PLAZA GAP'}),
 calibratedTransitionJump({run:'transition',z:-2440,offsetX:-112,width:17,length:19,height:2.5,boost:3.8,targetSpeed:18,size:'WEST PLAZA GAP'}),
 calibratedTransitionJump({run:'transition',z:-2485,offsetX:0,width:21,length:23,height:3.2,boost:4.2,targetSpeed:18,size:'BOWL STEP'}),
 calibratedTransitionJump({run:'transition',z:-2530,offsetX:110,width:16,length:18,height:2.3,boost:3.7,targetSpeed:18,size:'MINI PIPE EXIT'}),
 calibratedTransitionJump({run:'transition',z:-2575,offsetX:-110,width:16,length:18,height:2.3,boost:3.7,targetSpeed:18,size:'LEFT TRANSFER'}),
 calibratedTransitionJump({run:'transition',z:-2620,offsetX:0,width:22,length:24,height:3.5,boost:4.4,targetSpeed:19,size:'LOWER DOUBLE'}),
 calibratedTransitionJump({run:'transition',z:-2665,offsetX:110,width:17,length:19,height:2.5,boost:3.8,targetSpeed:18,size:'BOWL EXIT'}),
 calibratedTransitionJump({run:'transition',z:-2710,offsetX:-110,width:17,length:19,height:2.5,boost:3.8,targetSpeed:18,size:'LOWER WEST STEP'}),
 calibratedTransitionJump({run:'transition',z:-2755,offsetX:0,width:20,length:22,height:3.0,boost:4.1,targetSpeed:18,size:'LOWER TRANSFER'}),
 calibratedTransitionJump({run:'transition',z:-2800,offsetX:110,width:16,length:18,height:2.3,boost:3.7,targetSpeed:18,size:'PIPE LINK GAP'}),
 calibratedTransitionJump({run:'transition',z:-2845,offsetX:-110,width:16,length:18,height:2.3,boost:3.7,targetSpeed:18,size:'LEFT PIPE STEP'}),
 calibratedTransitionJump({run:'transition',z:-2890,offsetX:0,width:21,length:23,height:3.2,boost:4.2,targetSpeed:18,size:'LOWER MAIN GAP'}),
 calibratedTransitionJump({run:'transition',z:-2935,offsetX:110,width:17,length:19,height:2.5,boost:3.8,targetSpeed:18,size:'FINISH STEP'}),
 calibratedTransitionJump({run:'transition',z:-2980,offsetX:-110,width:17,length:19,height:2.5,boost:3.8,targetSpeed:18,size:'FINISH SIDE GAP'}),
 calibratedTransitionJump({run:'transition',z:-3025,offsetX:0,width:22,length:24,height:3.4,boost:4.3,targetSpeed:19,size:'FINAL GAP'}),
]);
// v0.17.6: small, unmarked side hits inside the dedicated chairline powder
// glades. These stay low and narrow so they feel like hand-shaped snow pillows
// or natural wind lips rather than park kickers. Natural hits never receive the
// coloured edge stripes used to make formal piste/park takeoffs obvious.
export const OFFPISTE_KICKERS = Object.freeze([
  { glade:'ridge-chairline', run:'velocity', z:-690, offsetX:-2.5, width:8.5, length:14, height:1.05, boost:4.2, backRatio:0.34, size:'NATURAL POWDER POP', natural:true, noPaint:true },
  { glade:'ridge-chairline', run:'velocity', z:210, offsetX:3.2, width:9.5, length:15, height:1.25, boost:4.5, backRatio:0.36, size:'NATURAL POWDER POP', natural:true, noPaint:true },
  { glade:'pine-chairline', run:'pine', z:-610, offsetX:2.4, width:7.5, length:12, height:0.90, boost:3.9, backRatio:0.36, size:'TREE-LINE PILLOW', natural:true, noPaint:true },
  { glade:'pine-chairline', run:'pine', z:320, offsetX:-2.7, width:8.5, length:14, height:1.15, boost:4.3, backRatio:0.38, size:'TREE-LINE PILLOW', natural:true, noPaint:true },
  { glade:'glacier-chairline', run:'glacier', z:-760, offsetX:-2.1, width:8.5, length:14, height:1.00, boost:4.1, backRatio:0.36, size:'GLACIER POWDER LIP', natural:true, noPaint:true },
  { glade:'glacier-chairline', run:'glacier', z:260, offsetX:2.8, width:9.5, length:15, height:1.30, boost:4.6, backRatio:0.38, size:'GLACIER POWDER LIP', natural:true, noPaint:true },
  { glade:'park-chairline', run:'park', z:-590, offsetX:2.6, width:8.0, length:13, height:0.95, boost:4.0, backRatio:0.36, size:'CHAIRLINE POP', natural:true, noPaint:true },
  { glade:'park-chairline', run:'park', z:370, offsetX:-3.0, width:9.0, length:14, height:1.20, boost:4.4, backRatio:0.38, size:'CHAIRLINE POP', natural:true, noPaint:true },
  { glade:'woodland-chairline', run:'woodland', z:-670, offsetX:-2.5, width:7.5, length:12, height:0.85, boost:3.8, backRatio:0.38, size:'WOODLAND PILLOW', natural:true, noPaint:true },
  { glade:'woodland-chairline', run:'woodland', z:420, offsetX:2.4, width:8.5, length:14, height:1.10, boost:4.2, backRatio:0.40, size:'WOODLAND PILLOW', natural:true, noPaint:true },
  { glade:'avalanche-chairline', run:'avalanche', z:-720, offsetX:2.0, width:7.5, length:12, height:0.95, boost:4.0, backRatio:0.36, size:'RIDGE WIND LIP', natural:true, noPaint:true },
  { glade:'avalanche-chairline', run:'avalanche', z:250, offsetX:-2.2, width:8.0, length:13, height:1.15, boost:4.3, backRatio:0.38, size:'RIDGE WIND LIP', natural:true, noPaint:true },
  { glade:'basin-ridge-chairline', run:'glacier', z:-810, offsetX:-2.2, width:8.5, length:14, height:1.05, boost:4.1, backRatio:0.38, size:'BASIN PILLOW', natural:true, noPaint:true },
  { glade:'basin-ridge-chairline', run:'glacier', z:-120, offsetX:2.5, width:9.5, length:15, height:1.35, boost:4.6, backRatio:0.40, size:'BASIN PILLOW', natural:true, noPaint:true },
  { glade:'ridge-chairline', run:'velocity', z:610, offsetX:-2.0, width:8.0, length:12, height:0.90, boost:3.8, backRatio:0.36, size:'LOW POWDER LIP', natural:true, noPaint:true },
  { glade:'pine-chairline', run:'pine', z:-40, offsetX:2.0, width:8.0, length:13, height:1.00, boost:4.0, backRatio:0.36, size:'PINE PILLOW', natural:true, noPaint:true },
  { glade:'glacier-chairline', run:'glacier', z:690, offsetX:-2.2, width:9.0, length:14, height:1.15, boost:4.2, backRatio:0.38, size:'LOW GLACIER LIP', natural:true, noPaint:true },
  { glade:'park-chairline', run:'park', z:760, offsetX:2.3, width:8.5, length:13, height:1.00, boost:4.0, backRatio:0.36, size:'LOW CHAIRLINE POP', natural:true, noPaint:true },
  { glade:'woodland-chairline', run:'woodland', z:70, offsetX:-2.0, width:7.5, length:12, height:0.90, boost:3.9, backRatio:0.38, size:'FOREST PILLOW', natural:true, noPaint:true },
  { glade:'avalanche-chairline', run:'avalanche', z:650, offsetX:2.1, width:8.0, length:13, height:1.00, boost:4.0, backRatio:0.36, size:'LOW RIDGE LIP', natural:true, noPaint:true },
  { glade:'basin-ridge-chairline', run:'glacier', z:-350, offsetX:-3.0, width:9.0, length:14, height:1.10, boost:4.2, backRatio:0.38, size:'BASIN WIND LIP', natural:true, noPaint:true },

  // Second-mountain lift-line hits. These are intentionally unpainted so the
  // south powder remains freeride terrain rather than looking like a second
  // formal park everywhere.
  { glade:'south-west-chairline', run:'south-aurora', z:2750, offsetX:-2.4, width:9.0, length:14, height:1.05, boost:4.2, backRatio:.38, size:'SOUTH POWDER POP', natural:true, noPaint:true },
  { glade:'south-west-chairline', run:'south-aurora', z:1950, offsetX:2.6, width:10.0, length:15, height:1.25, boost:4.5, backRatio:.40, size:'AURORA PILLOW', natural:true, noPaint:true },
  { glade:'south-central-chairline', run:'south-meridian', z:2820, offsetX:2.2, width:9.5, length:14, height:1.10, boost:4.2, backRatio:.38, size:'MERIDIAN WIND LIP', natural:true, noPaint:true },
  { glade:'south-central-chairline', run:'south-meridian', z:2050, offsetX:-2.6, width:10.0, length:16, height:1.35, boost:4.6, backRatio:.40, size:'MERIDIAN PILLOW', natural:true, noPaint:true },
  { glade:'south-cedar-chairline', run:'south-cedar', z:2720, offsetX:-2.0, width:8.0, length:13, height:.95, boost:4.0, backRatio:.38, size:'CEDAR PILLOW', natural:true, noPaint:true },
  { glade:'south-cedar-chairline', run:'south-cedar', z:2260, offsetX:2.2, width:8.5, length:14, height:1.05, boost:4.2, backRatio:.40, size:'CEDAR WIND LIP', natural:true, noPaint:true },
  { glade:'south-park-chairline', run:'south-park', z:2790, offsetX:2.8, width:9.5, length:14, height:1.10, boost:4.2, backRatio:.38, size:'PARK POWDER POP', natural:true, noPaint:true },
  { glade:'south-park-chairline', run:'south-park', z:1880, offsetX:-2.5, width:10.0, length:15, height:1.25, boost:4.5, backRatio:.40, size:'LOW SOUTH POP', natural:true, noPaint:true },
  { glade:'south-raven-chairline', run:'south-raven', z:2670, offsetX:2.0, width:8.5, length:13, height:1.05, boost:4.2, backRatio:.38, size:'RAVEN WIND LIP', natural:true, noPaint:true },
  { glade:'south-raven-chairline', run:'south-raven', z:2150, offsetX:-2.2, width:9.0, length:14, height:1.20, boost:4.4, backRatio:.40, size:'RAVEN PILLOW', natural:true, noPaint:true },
  { glade:'south-transition-chairline', run:'south-transition', z:2660, offsetX:2.2, width:8.5, length:13, height:1.0, boost:4.1, backRatio:.38, size:'TRANSITION POWDER POP', natural:true, noPaint:true },
  { glade:'south-transition-chairline', run:'south-transition', z:1740, offsetX:-2.3, width:9.0, length:14, height:1.15, boost:4.3, backRatio:.40, size:'TRANSITION LOW PILLOW', natural:true, noPaint:true },
]);

export const RAMP_LAYOUT = [
 ...OFFPISTE_KICKERS,
 ...TRANSITION_JUMPS.flatMap(def=>{const direction=def.run==='transition'?-1:1,landingLength=def.landingLength||28;return [def,{...def,z:def.z+direction*(def.length/2+def.gap+landingLength/2),worldX:getRun(def.run).centerAt(def.z)+(def.offsetX||0),length:landingLength,height:def.height*0.48,backRatio:0.15,size:def.size+' LANDING',landing:true}];}),
  { run: 'flow', z: -760, offsetX: -24, width: 15, length: 24, height: 2.1, boost: 5.7, size: 'S' },
  { run: 'flow', z: -590, offsetX: 18, width: 19, length: 30, height: 3.2, boost: 6.5, size: 'M' },
  { run: 'flow', z: -390, offsetX: -30, width: 13, length: 22, height: 1.8, boost: 5.3, size: 'S' },
  { run: 'flow', z: -180, offsetX: 22, width: 22, length: 35, height: 4.2, boost: 7.2, size: 'L' },
  { run: 'flow', z: 60, offsetX: -18, width: 16, length: 27, height: 2.7, boost: 6.1, size: 'M' },
  { run: 'flow', z: 300, offsetX: 27, width: 24, length: 40, height: 5.3, boost: 7.8, size: 'XL' },
  { run: 'flow', z: 560, offsetX: -21, width: 18, length: 29, height: 3.1, boost: 6.5, size: 'M' },
  { run: 'flow', z: 780, offsetX: 18, width: 14, length: 23, height: 2.0, boost: 5.6, size: 'S' },
  { run: 'flow', z: 430, offsetX: -56, width: 20, length: 27, height: 3.6, boost: 6.9, size: 'ROCK HIT', rockHit: true },

  { run: 'velocity', z: -720, offsetX: 20, width: 17, length: 27, height: 2.5, boost: 6.2, size: 'S' },
  { run: 'velocity', z: -465, offsetX: -18, width: 23, length: 37, height: 4.6, boost: 7.5, size: 'L' },
  { run: 'velocity', z: -185, offsetX: 16, width: 18, length: 30, height: 3.1, boost: 6.7, size: 'M' },
  { run: 'velocity', z: 115, offsetX: -12, width: 26, length: 43, height: 6.0, boost: 8.4, size: 'XL' },
  { run: 'velocity', z: 445, offsetX: 18, width: 21, length: 34, height: 4.1, boost: 7.2, size: 'L' },
  { run: 'velocity', z: 730, offsetX: -16, width: 16, length: 26, height: 2.5, boost: 6.1, size: 'S' },
  { run: 'velocity', z: 250, offsetX: 58, width: 24, length: 31, height: 4.2, boost: 7.4, size: 'ROCK HIT', rockHit: true },


  { run: 'pine', z: -745, offsetX: -20, width: 12, length: 20, height: 1.6, boost: 5.1, size: 'S' },
  { run: 'pine', z: -565, offsetX: 22, width: 16, length: 26, height: 2.7, boost: 6.0, size: 'M' },
  { run: 'pine', z: -350, offsetX: -18, width: 13, length: 22, height: 2.0, boost: 5.5, size: 'S' },
  { run: 'pine', z: -110, offsetX: 17, width: 18, length: 30, height: 3.4, boost: 6.6, size: 'M' },
  { run: 'pine', z: 155, offsetX: -19, width: 13, length: 22, height: 2.0, boost: 5.5, size: 'S' },
  { run: 'pine', z: 420, offsetX: 18, width: 19, length: 31, height: 3.6, boost: 6.8, size: 'M' },
  { run: 'pine', z: 700, offsetX: -15, width: 15, length: 25, height: 2.4, boost: 5.9, size: 'S' },
  { run: 'pine', z: -40, offsetX: 48, width: 18, length: 24, height: 3.0, boost: 6.4, size: 'ROCK HIT', rockHit: true },

  { run: 'glacier', z: -620, offsetX: -22, width: 20, length: 31, height: 3.2, boost: 6.5, size: 'GLACIER ROLLER' },
  { run: 'glacier', z: 140, offsetX: 28, width: 24, length: 37, height: 4.2, boost: 7.2, size: 'ICE LIP' },
  { run: 'woodland', z: -410, offsetX: 20, width: 13, length: 21, height: 1.8, boost: 5.4, size: 'FOREST HIT' },
  { run: 'woodland', z: 390, offsetX: -18, width: 15, length: 24, height: 2.3, boost: 5.9, size: 'FOREST HIT' },
  { run: 'avalanche', z: -350, offsetX: -122, width: 20, length: 28, height: 3.9, boost: 7.0, size: 'COULOIR EXIT' },
  { run: 'avalanche', z: 440, offsetX: 14, width: 22, length: 31, height: 4.5, boost: 7.5, size: 'RIDGE SEND' },
  { run: 'sunset', z: -520, offsetX: 30, width: 18, length: 28, height: 2.5, boost: 6.0, size: 'SCENIC ROLLER' },
  { run: 'sunset', z: 330, offsetX: -32, width: 20, length: 31, height: 3.0, boost: 6.4, size: 'SCENIC ROLLER' },

  // v0.17.4 front-side mountain hits: every major face now has optional
  // natural/park-style features without forcing a trip to Summit Park.
  { run: 'glacier', z: -900, offsetX: 30, width: 18, length: 27, height: 2.8, boost: 6.2, size: 'RIDGE POP' },
  { run: 'glacier', z: 545, offsetX: -25, width: 23, length: 34, height: 4.0, boost: 7.0, size: 'BASIN KICKER' },
  { run: 'woodland', z: -825, offsetX: -24, width: 14, length: 22, height: 2.0, boost: 5.6, size: 'TREE-LINE POP' },
  { run: 'woodland', z: 75, offsetX: 22, width: 18, length: 28, height: 3.0, boost: 6.4, size: 'GLADE KICKER' },
  { run: 'woodland', z: 690, offsetX: -21, width: 16, length: 25, height: 2.5, boost: 6.0, size: 'CHALET STEP DOWN' },
  { run: 'avalanche', z: -820, offsetX: 10, width: 16, length: 24, height: 2.8, boost: 6.3, size: 'RIDGE POP' },
  { run: 'avalanche', z: 120, offsetX: -9, width: 20, length: 30, height: 3.8, boost: 7.0, size: 'BLACK-LINE SEND' },
  { run: 'sunset', z: -880, offsetX: -28, width: 16, length: 24, height: 2.2, boost: 5.8, size: 'SUNSET POP' },
  { run: 'sunset', z: 710, offsetX: 27, width: 20, length: 30, height: 3.2, boost: 6.6, size: 'TERRACE KICKER' },

  // Summit Park is split into three readable skill lanes. Left = progression,
  // centre = flow, right = pro. Features overlap in Z so players can transfer
  // between lines instead of following one identical obstacle corridor.
  { run: 'park', z: -1010, offsetX: -52, width: 12, length: 20, height: 1.5, boost: 5.0, size: 'BEGINNER S' },
  { run: 'park', z: -710, offsetX: -52, width: 13, length: 22, height: 1.8, boost: 5.3, size: 'BEGINNER S' },
  { run: 'park', z: -390, offsetX: -52, width: 14, length: 23, height: 2.0, boost: 5.5, size: 'BEGINNER S' },
  { run: 'park', z: -60, offsetX: -52, width: 14, length: 24, height: 2.1, boost: 5.6, size: 'BEGINNER S' },
  { run: 'park', z: 275, offsetX: -52, width: 15, length: 24, height: 2.2, boost: 5.7, size: 'BEGINNER S' },
  { run: 'park', z: 610, offsetX: -52, width: 15, length: 25, height: 2.3, boost: 5.8, size: 'BEGINNER S' },
  { run: 'park', z: 935, offsetX: -52, width: 14, length: 23, height: 2.0, boost: 5.5, size: 'BEGINNER S' },

  { run: 'park', z: -925, offsetX: 0, width: 18, length: 29, height: 3.0, boost: 6.2, size: 'FLOW M' },
  { run: 'park', z: -535, offsetX: 0, width: 20, length: 32, height: 3.7, boost: 6.8, size: 'FLOW L' },
  { run: 'park', z: -145, offsetX: 0, width: 19, length: 30, height: 3.3, boost: 6.5, size: 'FLOW M' },
  { run: 'park', z: 245, offsetX: 0, width: 21, length: 34, height: 4.0, boost: 7.0, size: 'FLOW L' },
  { run: 'park', z: 635, offsetX: 0, width: 20, length: 33, height: 3.8, boost: 6.9, size: 'FLOW L' },
  { run: 'park', z: 970, offsetX: 0, width: 18, length: 29, height: 3.0, boost: 6.2, size: 'FLOW M' },

  { run: 'park', z: -820, offsetX: 52, width: 24, length: 39, height: 5.2, boost: 7.8, size: 'PRO XL' },
  { run: 'park', z: -400, offsetX: 52, width: 26, length: 43, height: 6.1, boost: 8.6, size: 'PRO XL' },
  { run: 'park', z: 20, offsetX: 52, width: 24, length: 40, height: 5.5, boost: 8.0, size: 'PRO XL' },
  { run: 'park', z: 445, offsetX: 52, width: 27, length: 45, height: 6.5, boost: 8.9, size: 'PRO XXL' },
  { run: 'park', z: 860, offsetX: 52, width: 25, length: 42, height: 5.9, boost: 8.4, size: 'PRO XL' },

  // v0.17.19 south-face features. The second mountain has enough hits to feel
  // deliberately designed, but only South Park is dense enough to read as a
  // formal terrain park. The other runs use clean side-hits and rollers.
  { run:'south-aurora', z:2920, offsetX:-24, width:17, length:26, height:2.5, boost:6.0, size:'AURORA POP' },
  { run:'south-aurora', z:2380, offsetX:26, width:20, length:31, height:3.4, boost:6.8, size:'BOWL KICKER' },
  { run:'south-aurora', z:1760, offsetX:-22, width:16, length:24, height:2.2, boost:5.7, size:'VALLEY POP' },

  { run:'south-talon', z:2860, offsetX:19, width:18, length:28, height:3.0, boost:6.5, size:'TALON LIP' },
  { run:'south-talon', z:2290, offsetX:-18, width:22, length:34, height:4.0, boost:7.2, size:'RED SEND' },
  { run:'south-talon', z:1670, offsetX:17, width:17, length:26, height:2.7, boost:6.1, size:'LOWER TALON' },

  { run:'south-meridian', z:2960, offsetX:-28, width:18, length:28, height:2.6, boost:6.1, size:'SUMMIT ROLLER' },
  { run:'south-meridian', z:2460, offsetX:27, width:23, length:35, height:4.1, boost:7.2, size:'MERIDIAN KICKER' },
  { run:'south-meridian', z:1950, offsetX:-25, width:19, length:29, height:3.0, boost:6.4, size:'MID-MOUNTAIN POP' },
  { run:'south-meridian', z:1510, offsetX:24, width:16, length:24, height:2.2, boost:5.7, size:'VALLEY ROLLER' },

  { run:'south-cedar', z:2840, offsetX:-18, width:14, length:22, height:2.0, boost:5.5, size:'TREE-LINE POP' },
  { run:'south-cedar', z:2330, offsetX:18, width:17, length:27, height:2.8, boost:6.2, size:'CEDAR GAP' },
  { run:'south-cedar', z:1790, offsetX:-17, width:15, length:24, height:2.3, boost:5.8, size:'GLADE HIT' },

  // South Park: three interleaved lanes, all descending toward the valley.
  { run:'south-park', z:2960, offsetX:-52, width:13, length:21, height:1.7, boost:5.2, size:'SOUTH BEGINNER' },
  { run:'south-park', z:2560, offsetX:-52, width:15, length:24, height:2.1, boost:5.6, size:'SOUTH BEGINNER' },
  { run:'south-park', z:2160, offsetX:-52, width:15, length:25, height:2.2, boost:5.7, size:'SOUTH BEGINNER' },
  { run:'south-park', z:1760, offsetX:-52, width:14, length:23, height:2.0, boost:5.5, size:'SOUTH BEGINNER' },
  { run:'south-park', z:2860, offsetX:0, width:19, length:30, height:3.2, boost:6.5, size:'SOUTH FLOW M' },
  { run:'south-park', z:2380, offsetX:0, width:22, length:35, height:4.2, boost:7.1, size:'SOUTH FLOW L' },
  { run:'south-park', z:1900, offsetX:0, width:20, length:32, height:3.7, boost:6.8, size:'SOUTH FLOW L' },
  { run:'south-park', z:2780, offsetX:52, width:25, length:40, height:5.4, boost:8.0, size:'SOUTH PRO XL' },
  { run:'south-park', z:2220, offsetX:52, width:27, length:44, height:6.2, boost:8.7, size:'SOUTH PRO XXL' },
  { run:'south-park', z:1660, offsetX:52, width:24, length:39, height:5.2, boost:7.9, size:'SOUTH PRO XL' },

  { run:'south-raven', z:2820, offsetX:13, width:17, length:26, height:3.0, boost:6.4, size:'RAVEN RIDGE POP' },
  { run:'south-raven', z:2210, offsetX:-14, width:22, length:32, height:4.3, boost:7.3, size:'BLACK SEND' },
  { run:'south-raven', z:1600, offsetX:12, width:18, length:28, height:3.1, boost:6.5, size:'RAVEN EXIT' },

  // v0.17.20: denser second-mountain feature rhythm. These are formal piste
  // jumps, so unlike natural powder hits they intentionally keep visible edge paint.
  { run:'south-aurora', z:2700, offsetX:22, width:16, length:24, height:2.2, boost:5.8, size:'AURORA STEP' },
  { run:'south-aurora', z:2070, offsetX:-25, width:18, length:27, height:2.8, boost:6.2, size:'AURORA MID' },
  { run:'south-talon', z:2610, offsetX:-18, width:17, length:25, height:2.6, boost:6.0, size:'TALON STEP' },
  { run:'south-talon', z:1980, offsetX:20, width:19, length:29, height:3.2, boost:6.5, size:'TALON MID' },
  { run:'south-meridian', z:2730, offsetX:25, width:17, length:26, height:2.4, boost:5.9, size:'MERIDIAN STEP' },
  { run:'south-meridian', z:2200, offsetX:-23, width:20, length:31, height:3.3, boost:6.6, size:'MERIDIAN FLOW' },
  { run:'south-meridian', z:1730, offsetX:22, width:18, length:27, height:2.6, boost:6.0, size:'MERIDIAN LOW' },
  { run:'south-cedar', z:2630, offsetX:16, width:14, length:22, height:2.0, boost:5.5, size:'CEDAR POP' },
  { run:'south-cedar', z:2050, offsetX:-17, width:16, length:25, height:2.5, boost:5.9, size:'CEDAR STEP' },
  { run:'south-raven', z:2580, offsetX:-12, width:17, length:26, height:3.0, boost:6.4, size:'RAVEN STEP' },
  { run:'south-raven', z:1920, offsetX:14, width:20, length:30, height:3.8, boost:7.0, size:'RAVEN MID' },

  // South Park now has a more continuous three-lane rhythm rather than only
  // a few widely spaced hits.
  { run:'south-park', z:2730, offsetX:-52, width:14, length:22, height:1.9, boost:5.4, size:'SOUTH BEGINNER' },
  { run:'south-park', z:2340, offsetX:-52, width:15, length:24, height:2.1, boost:5.6, size:'SOUTH BEGINNER' },
  { run:'south-park', z:1950, offsetX:-52, width:15, length:24, height:2.1, boost:5.6, size:'SOUTH BEGINNER' },
  { run:'south-park', z:2630, offsetX:0, width:20, length:31, height:3.5, boost:6.7, size:'SOUTH FLOW M' },
  { run:'south-park', z:2140, offsetX:0, width:21, length:33, height:3.9, boost:7.0, size:'SOUTH FLOW L' },
  { run:'south-park', z:1850, offsetX:52, width:25, length:40, height:5.4, boost:8.0, size:'SOUTH PRO XL' },

  // Dedicated south transition slope: close side kickers between the pipes,
  // quarters and spines so it has a genuine flowing line rather than isolated walls.
  { run:'south-transition', z:2920, offsetX:0, width:18, length:28, height:2.8, boost:6.2, size:'TRANSITION DROP POP' },
  { run:'south-transition', z:2490, offsetX:-43, width:16, length:25, height:2.4, boost:5.9, size:'SPINE SIDE HIT' },
  { run:'south-transition', z:2380, offsetX:42, width:17, length:26, height:2.6, boost:6.0, size:'QUARTER LINK' },
  { run:'south-transition', z:2180, offsetX:-40, width:16, length:25, height:2.4, boost:5.9, size:'PIPE LINK' },
  { run:'south-transition', z:1950, offsetX:42, width:18, length:28, height:3.0, boost:6.3, size:'TRANSFER POP' },
  { run:'south-transition', z:1780, offsetX:-38, width:17, length:26, height:2.6, boost:6.0, size:'BOWL LINK' },
  { run:'south-transition', z:1485, offsetX:0, width:18, length:28, height:2.8, boost:6.2, size:'FINISH POP' },


];

// Low-profile grindable features in the powder glades. Most are fallen timber
// so the off-piste lines keep a freeride/backcountry feel rather than turning
// into another formal terrain park.
export const OFFPISTE_RAILS = Object.freeze([
  { glade:'ridge-chairline', run:'velocity', z:-260, offsetX:3.0, length:12, height:0.46, kind:'RIDGE FALLEN LOG', shape:'log', width:0.22, natural:true },
  { glade:'pine-chairline', run:'pine', z:-180, offsetX:-2.5, length:11, height:0.43, kind:'PINE FALLEN LOG', shape:'log', width:0.24, natural:true },
  { glade:'pine-chairline', run:'pine', z:650, offsetX:2.6, length:13, height:0.48, kind:'PINE POWDER LOG', shape:'log', width:0.23, natural:true },
  { glade:'glacier-chairline', run:'glacier', z:-300, offsetX:2.8, length:13, height:0.50, kind:'GLACIER LOW RAIL', width:0.15, natural:true },
  { glade:'park-chairline', run:'park', z:50, offsetX:-3.0, length:12, height:0.46, kind:'CHAIRLINE LOG', shape:'log', width:0.23, natural:true },
  { glade:'woodland-chairline', run:'woodland', z:-260, offsetX:2.5, length:12, height:0.44, kind:'WOODLAND FALLEN FIR', shape:'log', width:0.24, natural:true },
  { glade:'woodland-chairline', run:'woodland', z:720, offsetX:-2.4, length:11, height:0.44, kind:'LOW FOREST LOG', shape:'log', width:0.23, natural:true },
  { glade:'avalanche-chairline', run:'avalanche', z:-120, offsetX:-2.2, length:12, height:0.48, kind:'RIDGE LOW RAIL', width:0.15, natural:true },
  { glade:'basin-ridge-chairline', run:'glacier', z:-470, offsetX:2.4, length:13, height:0.45, kind:'BASIN FALLEN LOG', shape:'log', width:0.24, natural:true },
  { glade:'south-west-chairline', run:'south-aurora', z:2440, offsetX:2.4, length:13, height:.46, kind:'AURORA FALLEN LOG', shape:'log', width:.24, natural:true },
  { glade:'south-central-chairline', run:'south-meridian', z:2360, offsetX:-2.5, length:13, height:.48, kind:'MERIDIAN LOW RAIL', width:.15, natural:true },
  { glade:'south-cedar-chairline', run:'south-cedar', z:2480, offsetX:2.2, length:12, height:.44, kind:'CEDAR FALLEN FIR', shape:'log', width:.24, natural:true },
  { glade:'south-park-chairline', run:'south-park', z:2320, offsetX:-2.4, length:13, height:.46, kind:'SOUTH CHAIRLINE LOG', shape:'log', width:.23, natural:true },
  { glade:'south-raven-chairline', run:'south-raven', z:2400, offsetX:2.3, length:13, height:.48, kind:'RAVEN LOW RAIL', width:.15, natural:true },
  { glade:'south-transition-chairline', run:'south-transition', z:2010, offsetX:-2.2, length:12, height:.46, kind:'TRANSITION FALLEN LOG', shape:'log', width:.23, natural:true },
]);

export const RAIL_LAYOUT = [
 ...OFFPISTE_RAILS,
 ...CREATIVE_RAILS,
  ...['rainbow','flat-down','down-flat-down','kink','curved','c','s','up'].map((shape,i)=>({run:'park',z:-1010+i*240,offsetX:108,length:shape==='s'?38:28,height:1.0,kind:shape.toUpperCase()+' RAIL',shape,width:0.17})),
  {run:'transition',z:-1790,offsetX:-70,length:22,height:0.72,kind:'DROP-IN BOX',width:1.25},
  {run:'transition',z:-1840,offsetX:78,length:24,height:0.76,kind:'STADIUM DOWN RAIL',shape:'flat-down',width:0.17},
  {run:'transition',z:-1890,offsetX:-72,length:22,height:0.72,kind:'QUARTER DECK BOX',width:1.15},
  {run:'transition',z:-1940,offsetX:78,length:24,height:0.78,kind:'PIPE KINK',shape:'kink',width:0.17},
  {run:'transition',z:-1990,offsetX:-75,length:26,height:0.80,kind:'PIPE DECK RAIL',shape:'long-s',width:0.17},
  {run:'transition',z:-2040,offsetX:72,length:22,height:0.72,kind:'TRANSFER BOX',width:1.16},
  {run:'transition',z:-2090,offsetX:-76,length:25,height:0.80,kind:'PLAZA KINK',shape:'down-flat-down',width:0.17},
  {run:'transition',z:-2140,offsetX:78,length:23,height:0.74,kind:'HIP EXIT RAIL',shape:'bank-c',width:0.17},
  {run:'transition',z:-2190,offsetX:-72,length:22,height:0.70,kind:'WEST WALL BOX',width:1.10},
  {run:'transition',z:-2240,offsetX:75,length:25,height:0.78,kind:'BOWL RIBBON',shape:'long-s',width:0.17},
  {run:'transition',z:-2290,offsetX:-74,length:24,height:0.76,kind:'LOWER PLAZA RAIL',shape:'flat-down',width:0.17},
  {run:'transition',z:-2340,offsetX:73,length:22,height:0.70,kind:'PIPE LINK BOX',width:1.08},
  {run:'transition',z:-2390,offsetX:-75,length:24,height:0.78,kind:'FINISH KINK',shape:'kink',width:0.17},
  {run:'transition',z:-2440,offsetX:74,length:22,height:0.70,kind:'FINAL BOX',width:1.18},
  {run:'transition',z:-2490,offsetX:-78,length:26,height:0.78,kind:'PLAZA DOWN RAIL',shape:'flat-down',width:0.17},
  {run:'transition',z:-2540,offsetX:75,length:23,height:0.72,kind:'MINI PIPE BOX',width:1.08},
  {run:'transition',z:-2590,offsetX:-74,length:24,height:0.76,kind:'BOWL ENTRY RAIL',shape:'kink',width:0.17},
  {run:'transition',z:-2640,offsetX:76,length:22,height:0.70,kind:'BOWL EXIT BOX',width:1.10},
  {run:'transition',z:-2690,offsetX:-72,length:25,height:0.78,kind:'LOWER KINK',shape:'down-flat-down',width:0.17},
  {run:'transition',z:-2740,offsetX:74,length:23,height:0.72,kind:'LOWER BOX',width:1.08},
  {run:'transition',z:-2790,offsetX:-76,length:24,height:0.76,kind:'PIPE ENTRY RAIL',shape:'flat-down',width:0.17},
  {run:'transition',z:-2840,offsetX:75,length:22,height:0.70,kind:'PIPE EXIT BOX',width:1.10},
  {run:'transition',z:-2890,offsetX:-75,length:25,height:0.78,kind:'FINISH DOWN RAIL',shape:'flat-down',width:0.17},
  {run:'transition',z:-2940,offsetX:74,length:22,height:0.70,kind:'FINISH BOX',width:1.12},
  {run:'transition',z:-2990,offsetX:-72,length:24,height:0.76,kind:'FINAL KINK',shape:'kink',width:0.17},
  {run:'transition',z:-3040,offsetX:72,length:22,height:0.70,kind:'EXIT BOX',width:1.14},
  // Summit Park rail lines mirror the jump lanes: easier boxes on the left,
  // mixed flow features in the middle and longer technical rails on the right.
  { run: 'park', z: -940, offsetX: -50, length: 24, height: 0.72, kind: 'BEGINNER BOX', width: 1.3 },
  { run: 'park', z: -610, offsetX: -50, length: 26, height: 0.76, kind: 'BEGINNER BOX', width: 1.3 },
  { run: 'park', z: -285, offsetX: -50, length: 22, height: 0.72, kind: 'BEGINNER BOX', width: 1.3 },
  { run: 'park', z: 70, offsetX: -50, length: 27, height: 0.78, kind: 'BEGINNER BOX', width: 1.3 },
  { run: 'park', z: 430, offsetX: -50, length: 26, height: 0.78, kind: 'BEGINNER BOX', width: 1.3 },
  { run: 'park', z: 790, offsetX: -50, length: 24, height: 0.74, kind: 'BEGINNER BOX', width: 1.3 },

  { run: 'park', z: -790, offsetX: 0, length: 31, height: 0.94, kind: 'FLOW RAIL', width: 0.17 },
  { run: 'park', z: -480, offsetX: 0, length: 34, height: 0.88, kind: 'FLOW BOX', width: 1.15 },
  { run: 'park', z: -160, offsetX: 0, length: 36, height: 1.02, kind: 'FLOW RAIL', width: 0.17 },
  { run: 'park', z: 170, offsetX: 0, length: 38, height: 0.90, kind: 'FLOW BOX', width: 1.15 },
  { run: 'park', z: 515, offsetX: 0, length: 40, height: 1.08, kind: 'FLOW RAIL', width: 0.18 },
  { run: 'park', z: 840, offsetX: 0, length: 34, height: 0.92, kind: 'FLOW BOX', width: 1.15 },

  { run: 'park', z: -700, offsetX: 50, length: 38, height: 1.12, kind: 'PRO DOWN RAIL', width: 0.17 },
  { run: 'park', z: -340, offsetX: 50, length: 46, height: 1.20, kind: 'PRO LONG RAIL', width: 0.18 },
  { run: 'park', z: 20, offsetX: 50, length: 40, height: 1.16, kind: 'PRO DOWN RAIL', width: 0.17 },
  { run: 'park', z: 385, offsetX: 50, length: 50, height: 1.28, kind: 'PRO LONG RAIL', width: 0.18 },
  { run: 'park', z: 745, offsetX: 50, length: 43, height: 1.20, kind: 'PRO FINISH RAIL', width: 0.18 },

  // A few side-hit rails outside the park make the resort feel less empty.
  { run: 'flow', z: -720, offsetX: 42, length: 24, height: 0.82, kind: 'SIDE BOX', width: 1.12 },
  { run: 'flow', z: -300, offsetX: 34, length: 27, height: 0.82, kind: 'SIDE BOX', width: 1.15 },
  { run: 'flow', z: -40, offsetX: -43, length: 31, height: 0.94, kind: 'SIDE RAIL', width: 0.16 },
  { run: 'flow', z: 220, offsetX: -38, length: 30, height: 0.95, kind: 'SIDE RAIL', width: 0.16 },
  { run: 'flow', z: 430, offsetX: 41, length: 34, height: 1.0, kind: 'SIDE RAIL', width: 0.17 },
  { run: 'flow', z: 650, offsetX: 35, length: 24, height: 0.78, kind: 'SIDE BOX', width: 1.1 },

  { run: 'velocity', z: -625, offsetX: 31, length: 30, height: 0.92, kind: 'SPEED RAIL', width: 0.17 },
  { run: 'velocity', z: -135, offsetX: -31, length: 26, height: 0.8, kind: 'SPEED BOX', width: 1.08 },
  { run: 'velocity', z: 360, offsetX: 28, length: 35, height: 1.0, kind: 'SPEED RAIL', width: 0.17 },
  { run: 'velocity', z: 755, offsetX: -29, length: 24, height: 0.8, kind: 'SPEED BOX', width: 1.08 },

  { run: 'pine', z: -690, offsetX: 31, length: 23, height: 0.78, kind: 'FOREST BOX', width: 1.02 },
  { run: 'pine', z: -285, offsetX: -29, length: 25, height: 0.9, kind: 'FOREST RAIL', width: 0.16 },
  { run: 'pine', z: 55, offsetX: -31, length: 29, height: 0.92, kind: 'FOREST RAIL', width: 0.16 },
  { run: 'pine', z: 330, offsetX: 30, length: 28, height: 0.82, kind: 'FOREST BOX', width: 1.05 },
  { run: 'pine', z: 650, offsetX: 30, length: 27, height: 0.94, kind: 'FOREST RAIL', width: 0.16 },

  // Front-side freeride features distributed around the new mountain hubs.
  { run: 'glacier', z: -540, offsetX: 28, length: 30, height: 0.88, kind: 'ICE BOX', width: 1.05 },
  { run: 'glacier', z: 390, offsetX: -30, length: 36, height: 1.02, kind: 'GLACIER RAIL', width: 0.17 },
  { run: 'woodland', z: -570, offsetX: -24, length: 25, height: 0.80, kind: 'LOG BOX', width: 0.92 },
  { run: 'woodland', z: 170, offsetX: 25, length: 31, height: 0.94, kind: 'FOREST RAIL', width: 0.16 },
  { run: 'woodland', z: 625, offsetX: -24, length: 29, height: 0.88, kind: 'HUB BOX', width: 1.10 },
  { run: 'avalanche', z: -510, offsetX: 18, length: 27, height: 0.96, kind: 'RIDGE RAIL', width: 0.16 },
  { run: 'avalanche', z: 260, offsetX: -16, length: 33, height: 1.05, kind: 'BLACK RAIL', width: 0.17 },
  { run: 'sunset', z: -420, offsetX: -30, length: 28, height: 0.82, kind: 'SCENIC BOX', width: 1.10 },
  { run: 'sunset', z: 185, offsetX: 29, length: 35, height: 0.98, kind: 'TERRACE RAIL', width: 0.17 },
  { run: 'sunset', z: 675, offsetX: -27, length: 26, height: 0.82, kind: 'CRUISE BOX', width: 1.08 },

  // Decommissioned/station-side lift beams: intentionally static grind
  // structures near lift corridors. Moving chair cables remain non-grindable.
  { run: 'flow', z: 900, offsetX: -86, length: 34, height: 1.15, kind: 'LIFT BEAM', width: 0.20 },
  { run: 'velocity', z: 900, offsetX: 68, length: 32, height: 1.18, kind: 'LIFT BEAM', width: 0.20 },
  { run: 'pine', z: 900, offsetX: 54, length: 30, height: 1.08, kind: 'LIFT BEAM', width: 0.20 },
  { run: 'park', z: 900, offsetX: 92, length: 42, height: 1.20, kind: 'LIFT BEAM', width: 0.20 },

  // South-face rails and boxes. South Park gets the highest density; the other
  // pistes only receive occasional side hits so they still ski like runs.
  { run:'south-aurora', z:2620, offsetX:34, length:28, height:.84, kind:'AURORA BOX', width:1.10 },
  { run:'south-aurora', z:1890, offsetX:-33, length:31, height:.94, kind:'AURORA RAIL', width:.16 },
  { run:'south-talon', z:2520, offsetX:-28, length:30, height:.96, kind:'TALON RAIL', width:.17 },
  { run:'south-talon', z:1810, offsetX:27, length:26, height:.82, kind:'TALON BOX', width:1.08 },
  { run:'south-meridian', z:2700, offsetX:36, length:30, height:.86, kind:'MERIDIAN BOX', width:1.12 },
  { run:'south-meridian', z:2100, offsetX:-36, length:35, height:1.0, kind:'MERIDIAN RAIL', width:.17 },
  { run:'south-meridian', z:1580, offsetX:34, length:27, height:.82, kind:'VALLEY BOX', width:1.10 },
  { run:'south-cedar', z:2590, offsetX:-27, length:25, height:.82, kind:'CEDAR LOG BOX', width:1.00 },
  { run:'south-cedar', z:1980, offsetX:28, length:30, height:.94, kind:'CEDAR RAIL', width:.16 },
  { run:'south-raven', z:2500, offsetX:20, length:31, height:1.0, kind:'RAVEN RAIL', width:.17 },
  { run:'south-raven', z:1880, offsetX:-19, length:28, height:.88, kind:'RAVEN BOX', width:1.05 },

  { run:'south-park', z:2900, offsetX:-50, length:24, height:.74, kind:'SOUTH BEGINNER BOX', width:1.28 },
  { run:'south-park', z:2500, offsetX:-50, length:26, height:.78, kind:'SOUTH BEGINNER BOX', width:1.28 },
  { run:'south-park', z:2100, offsetX:-50, length:24, height:.76, kind:'SOUTH BEGINNER BOX', width:1.28 },
  { run:'south-park', z:1700, offsetX:-50, length:25, height:.76, kind:'SOUTH BEGINNER BOX', width:1.28 },
  { run:'south-park', z:2790, offsetX:0, length:34, height:.92, kind:'SOUTH FLOW RAIL', width:.17 },
  { run:'south-park', z:2310, offsetX:0, length:38, height:.96, kind:'SOUTH FLOW BOX', width:1.15 },
  { run:'south-park', z:1830, offsetX:0, length:40, height:1.04, kind:'SOUTH FLOW RAIL', width:.18 },
  { run:'south-park', z:2650, offsetX:52, length:42, height:1.18, kind:'SOUTH PRO DOWN RAIL', width:.18 },
  { run:'south-park', z:2050, offsetX:52, length:48, height:1.24, kind:'SOUTH PRO LONG RAIL', width:.18 },
  { run:'south-park', z:1530, offsetX:52, length:39, height:1.10, kind:'SOUTH PRO FINISH RAIL', width:.18 },

  // v0.17.20 extra south-face rails: enough to find something interesting on
  // every piste without turning the whole face into one continuous park.
  { run:'south-aurora', z:2790, offsetX:-31, length:24, height:.78, kind:'AURORA SIDE BOX', width:1.06 },
  { run:'south-aurora', z:2150, offsetX:30, length:29, height:.92, kind:'AURORA SIDE RAIL', width:.16 },
  { run:'south-talon', z:2710, offsetX:25, length:27, height:.90, kind:'TALON SIDE RAIL', width:.16 },
  { run:'south-talon', z:2050, offsetX:-25, length:25, height:.82, kind:'TALON SIDE BOX', width:1.06 },
  { run:'south-meridian', z:2860, offsetX:-35, length:28, height:.84, kind:'MERIDIAN SIDE BOX', width:1.10 },
  { run:'south-meridian', z:2300, offsetX:35, length:33, height:.98, kind:'MERIDIAN SIDE RAIL', width:.17 },
  { run:'south-cedar', z:2730, offsetX:24, length:24, height:.80, kind:'CEDAR SIDE BOX', width:1.02 },
  { run:'south-cedar', z:2170, offsetX:-24, length:28, height:.92, kind:'CEDAR SIDE RAIL', width:.16 },
  { run:'south-raven', z:2680, offsetX:-18, length:29, height:.96, kind:'RAVEN SIDE RAIL', width:.17 },
  { run:'south-raven', z:2050, offsetX:18, length:26, height:.86, kind:'RAVEN SIDE BOX', width:1.04 },

  { run:'south-park', z:2710, offsetX:-50, length:25, height:.76, kind:'SOUTH BEGINNER BOX', width:1.28 },
  { run:'south-park', z:2260, offsetX:-50, length:25, height:.78, kind:'SOUTH BEGINNER BOX', width:1.28 },
  { run:'south-park', z:2550, offsetX:0, length:36, height:.96, kind:'SOUTH FLOW RAIL', width:.17 },
  { run:'south-park', z:2070, offsetX:0, length:38, height:1.00, kind:'SOUTH FLOW BOX', width:1.15 },
  { run:'south-park', z:2440, offsetX:52, length:45, height:1.20, kind:'SOUTH PRO RAIL', width:.18 },
  { run:'south-park', z:1850, offsetX:52, length:44, height:1.18, kind:'SOUTH PRO RAIL', width:.18 },

  // Rail transfers on the dedicated south transition line.
  { run:'south-transition', z:2870, offsetX:-45, length:28, height:.92, kind:'TRANSITION ENTRY RAIL', width:.17 },
  { run:'south-transition', z:2570, offsetX:43, length:30, height:.98, kind:'PIPE DECK RAIL', width:.17 },
  { run:'south-transition', z:2400, offsetX:-42, length:26, height:.86, kind:'QUARTER BOX', width:1.08 },
  { run:'south-transition', z:2190, offsetX:42, length:31, height:1.00, kind:'MINI PIPE RAIL', width:.17 },
  { run:'south-transition', z:2000, offsetX:-40, length:28, height:.90, kind:'TRANSFER BOX', width:1.08 },
  { run:'south-transition', z:1810, offsetX:40, length:32, height:1.02, kind:'BOWL RAIL', width:.17 },
  { run:'south-transition', z:1535, offsetX:-36, length:27, height:.88, kind:'FINISH RAIL', width:.17 },
];

function makeCylinderBetween(start, end, radius, material, radialSegments = 10) {
  const direction = new THREE.Vector3().subVectors(end, start);
  const length = direction.length();
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, radialSegments), material);
  mesh.position.copy(start).add(end).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  mesh.castShadow = false;
  return mesh;
}

function createSnowRampGeometry(terrain, ramp) {
  const xSegments = 24;
  const zSegments = 44;
  const outerHalf = ramp.width * 0.72;
  const totalZ = ramp.backEndZ - ramp.startZ;
  const vertices = [];
  const uvs = [];
  const indices = [];

  for (let iz = 0; iz <= zSegments; iz += 1) {
    const vz = iz / zSegments;
    const worldZ = ramp.startZ + totalZ * vz;
    const t = (worldZ - ramp.startZ) / (ramp.length*ramp.direction);
    for (let ix = 0; ix <= xSegments; ix += 1) {
      const ux = ix / xSegments;
      const localX = THREE.MathUtils.lerp(-outerHalf, outerHalf, ux);
      const worldX = ramp.x + localX;
      const base = terrain.getHeight(worldX, worldZ);
      const y = base + rampOffset(localX, t, ramp.width, ramp.height, ramp.backRatio, ramp.landing) + 0.025;
      vertices.push(localX, y - ramp.anchorY, worldZ - ramp.centerZ);
      uvs.push(worldX/18, worldZ/18);
    }
  }

  const row = xSegments + 1;
  for (let iz = 0; iz < zSegments; iz += 1) {
    for (let ix = 0; ix < xSegments; ix += 1) {
      const a = iz * row + ix;
      const b = a + 1;
      const c = a + row;
      const d = c + 1;
      if(ramp.direction<0)indices.push(a,b,c,b,d,c);else indices.push(a,c,b,b,c,d);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

function createRampPaintGeometry(terrain, ramp, centerLocalX, stripeWidth = 0.24) {
  const segments = 26;
  const totalZ = ramp.backEndZ - ramp.startZ;
  const vertices = [];
  const indices = [];
  for (let i = 0; i <= segments; i += 1) {
    const v = i / segments;
    const worldZ = ramp.startZ + totalZ * v;
    const t = (worldZ - ramp.startZ) / (ramp.length*ramp.direction);
    for (const side of [-1, 1]) {
      const localX = centerLocalX + side * stripeWidth * 0.5;
      const worldX = ramp.x + localX;
      const y = terrain.getHeight(worldX, worldZ) +
        rampOffset(localX, t, ramp.width, ramp.height, ramp.backRatio, ramp.landing) + 0.075;
      vertices.push(localX, y - ramp.anchorY, worldZ - ramp.centerZ);
    }
  }
  for (let i = 0; i < segments; i += 1) {
    const a = i * 2;
    const b = a + 1;
    const c = a + 2;
    const d = a + 3;
    if(ramp.direction<0)indices.push(a,b,c,b,d,c);else indices.push(a,c,b,b,c,d);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

export class FreestyleFeatures {
  constructor(scene, terrain) {
    this.scene = scene;
    const initialChildren=new Set(scene.children);
    this.terrain = terrain;
    this.ramps = [];
    this.rails = [];
    this.rampCooldown = new Map();
    this.railSafetyTimer = 0;
    this.tmp = new THREE.Vector3();
    this.tmp2 = new THREE.Vector3();
    this.createRamps();
    this.createRails();
    batchStatic(scene,scene.children.filter(o=>!initialChildren.has(o)));
  }

  createRamps() {
    // Keep shaped park snow clean and non-repeating. The old compact texture
    // could create obvious parallel lines on broad landings at grazing angles.
    const snowMat = new THREE.MeshStandardMaterial({
      color: 0xf1f6f8,
      roughness: 0.96,
      metalness: 0,
      side: THREE.DoubleSide,
    });
    const rockTextures = createRockTextures();
    const rockLipMat = new THREE.MeshStandardMaterial({ color: 0x5e6a70, map: rockTextures.map, roughness: 0.98 });
    const paintMaterials = {
      regular: new THREE.MeshStandardMaterial({ color: 0x24a9ff, roughness: 0.72, emissive: 0x06334a, emissiveIntensity: 0.0, side: THREE.DoubleSide }),
      park: new THREE.MeshStandardMaterial({ color: 0xd75dff, roughness: 0.72, emissive: 0x35113e, emissiveIntensity: 0.0, side: THREE.DoubleSide }),
      red: new THREE.MeshStandardMaterial({ color: 0xff4e59, roughness: 0.72, emissive: 0x431014, emissiveIntensity: 0.0, side: THREE.DoubleSide }),
      black: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.68, emissive: 0x2a3138, emissiveIntensity: 0.0, side: THREE.DoubleSide }),
      transition: new THREE.MeshStandardMaterial({ color: 0x43e1d5, roughness: 0.70, emissive: 0x0b3b39, emissiveIntensity: 0.0, side: THREE.DoubleSide }),
      wild: new THREE.MeshStandardMaterial({ color: 0xff7a2f, roughness: 0.72, emissive: 0x4b1c05, emissiveIntensity: 0.0, side: THREE.DoubleSide }),
    };

    RAMP_LAYOUT.forEach((def, index) => {
      const run = getRun(def.run);
      const gladeX = def.glade ? chairlineXAt(def.glade, def.z) : null;
      const x = def.worldX ?? ((gladeX ?? run.centerAt(def.z)) + (def.offsetX || 0));
      const direction=run.downhillDirection ?? (def.run==='transition'?-1:1);
      const startZ = def.z - direction*def.length / 2;
      const lipZ = def.z + direction*def.length / 2;
      const backLength = Math.max(3.5, def.length * (def.backRatio||0.32));
      const backEndZ = lipZ + direction*backLength;
      const anchorY = this.terrain.getHeight(x, def.z);
      const ramp = {
        ...def, direction,
        id: `ramp-${index}`,
        x,
        startZ,
        lipZ,
        backEndZ,
        centerZ: (startZ + backEndZ) / 2,
        anchorY,
        backRatio: backLength / def.length,
        run,
      };

      const mesh = new THREE.Mesh(createSnowRampGeometry(this.terrain, ramp), snowMat);
      mesh.position.set(x, anchorY, ramp.centerZ);
      mesh.castShadow = false;
      mesh.receiveShadow = true;
      mesh.name = def.natural ? `${def.glade || run.name} natural powder kicker ${index + 1}` : `${run.name} ${def.size} shaped snow kicker ${index + 1}`;
      this.scene.add(mesh);

      if (def.rockHit) {
        // These are natural rock outcrops with a snow-loaded approach. The skiable
        // surface is still the same continuous ramp sampler, so the rock hit is a
        // real jump rather than another solid obstacle that stops the player.
        const lipY = this.terrain.getHeight(x, lipZ) + def.height * 0.72;
        const rockLip = new THREE.Mesh(new THREE.DodecahedronGeometry(1.5, 0), rockLipMat);
        rockLip.position.set(x, lipY - 1.05, lipZ + 0.8);
        rockLip.scale.set(def.width * 0.32, Math.max(1.2, def.height * 0.52), 2.7);
        rockLip.rotation.set(0.08, 0, 0.03);
        rockLip.castShadow = false;
        rockLip.receiveShadow = true;
        rockLip.name = `${run.name} skiable natural rock hit`;
        this.scene.add(rockLip);
      }

      // Painted snow-edge guides make the usable takeoff lane obvious from a
      // distance. They follow the exact same surface as the ramp, so they never
      // float above or disappear into the kicker.
      if (!def.noPaint && !def.natural) {
        // Formal kickers use one high-contrast blue guide colour everywhere.
        // Natural/off-piste hits remain unpainted. A universal blue reads much
        // more clearly at speed than white lines on black pistes or mixed colours.
        const difficulty=String(run.difficulty||'').toUpperCase();
        void difficulty;
        const paintMat = paintMaterials.regular;
        const lineX = ramp.width * 0.35;
        for (const side of [-1, 1]) {
          const stripe = new THREE.Mesh(createRampPaintGeometry(this.terrain, ramp, side * lineX, 0.11), paintMat);
          stripe.position.set(x, anchorY, ramp.centerZ);
          stripe.name = `${run.name} ramp edge paint`;
          stripe.renderOrder = 3;
          this.scene.add(stripe);
        }
      }

      this.ramps.push(ramp);
    });
  }

  createRails() {
    const steel=new THREE.MeshStandardMaterial({color:0x274351,metalness:0.75,roughness:0.29});
    const timber=new THREE.MeshStandardMaterial({color:0x6d4931,roughness:.96});
    const top=new THREE.MeshStandardMaterial({color:0x96c2cd,metalness:0.28,roughness:0.4});
    RAIL_LAYOUT.forEach((def,index)=>{
      const run=getRun(def.run),direction=run.downhillDirection ?? (def.run==='transition'?-1:1);
      const anchorZ=def.anchorZ??def.z;
      const gladeX=def.glade?chairlineXAt(def.glade,anchorZ):null;
      const x=(gladeX??run.centerAt(anchorZ))+(def.offsetX||0);
      const points=[];
      const n=def.shape?40:16;
      for(let i=0;i<=n;i++){
        const t=i/n,shape=railShape(def.shape,t,def.length);
        const px=x+shape.x,pz=def.z+direction*(t-0.5)*def.length;
        points.push(new THREE.Vector3(px,this.terrain.getHeight(px,pz)+Math.max(0.4,def.height+shape.y),pz));
      }
      const path=new RailPath(points),isBox=def.kind.includes('BOX');
      const offsets=def.shape==='shotgun'?[-0.20,0.20]:def.shape==='double'?[-0.52,0.52]:[0];
      if(isBox){
        for(let i=1;i<points.length;i++){
          const a=points[i-1],b=points[i];
          const mesh=new THREE.Mesh(new THREE.BoxGeometry(def.width,0.20,a.distanceTo(b)+0.035),top);
          mesh.position.copy(a).add(b).multiplyScalar(0.5);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),b.clone().sub(a).normalize());mesh.castShadow=false;this.scene.add(mesh);
        }
      }else for(const offset of offsets){
        const curve=new THREE.Curve();curve.getPoint=(t,target=new THREE.Vector3())=>path.point(t,target).add(new THREE.Vector3(offset,0,0));
        const mesh=new THREE.Mesh(new THREE.TubeGeometry(curve,Math.max(16,n),def.width,10,false),(def.shape==='log'||def.natural)?timber:steel);mesh.castShadow=false;mesh.name=run.name+' '+def.kind;this.scene.add(mesh);
      }
      for(const t of [0.12,0.5,0.88]){
        const p=path.point(t),ground=this.terrain.getHeight(p.x,p.z);
        this.scene.add(makeCylinderBetween(new THREE.Vector3(p.x,ground,p.z),p,0.055,steel,6));
      }
      for(const [lane,offset] of offsets.entries()){
       const ridePoints=offset?points.map(p=>p.clone().add(new THREE.Vector3(offset,0,0))):points;
       const ridePath=offset?new RailPath(ridePoints):path;
       this.rails.push({id:`rail-${index}${offsets.length>1?'-'+lane:''}`,run:def.run,kind:def.kind,isBox,path:ridePath,start:ridePoints[0],end:ridePoints.at(-1),direction:ridePath.tangent(0),length:ridePath.length,pair:def.pair,shape:def.shape,
        catchRadius:isBox?Math.max(.65,def.width*.5+.3):.66,collisionRadius:isBox?def.width*.5+.42:def.width+.42,grindHeight:isBox?.13:def.width+.055});
      }
    });
  }


  addLiftCableRails(cableDefs = []) {
    for (const def of cableDefs) {
      if (!def?.curve) continue;
      // Sample a modest number of points from the already-built chair cable.
      // This is collision/grind data only; the LiftSystem's visible cable mesh
      // is reused, keeping launch time fast.
      const points = [];
      const samples = 28;
      for (let i = 0; i <= samples; i += 1) points.push(def.curve.getPointAt(i / samples).clone());
      const path = new RailPath(points);
      this.rails.push({
        id: def.id,
        run: 'lift-network',
        kind: def.kind || 'CHAIRLIFT CABLE',
        isLiftCable: true,
        isBox: false,
        path,
        start: points[0],
        end: points.at(-1),
        direction: path.tangent(0),
        length: path.length,
        catchRadius: 0.72,
        collisionRadius: 0.22,
        grindHeight: 0.08,
      });
    }
  }

  rampAbsoluteHeight(ramp, x, z) {
    const localX = x - ramp.x;
    if (Math.abs(localX) > ramp.width * 0.72) return null;
    if (z < Math.min(ramp.startZ,ramp.backEndZ) || z > Math.max(ramp.startZ,ramp.backEndZ)) return null;
    const t = (z - ramp.startZ) / (ramp.length*ramp.direction);
    const offset = rampOffset(localX, t, ramp.width, ramp.height, ramp.backRatio, ramp.landing);
    if (offset <= 0.001) return null;
    return this.terrain.getHeight(x, z) + offset;
  }

  // Used by SkiPhysics. Visual mesh and collision height are generated from the
  // same function, so the skier no longer passes through the visible ramp.
  sampleSurface(x, z) {
    let best = null;
    for (const ramp of this.ramps) {
      const height = this.rampAbsoluteHeight(ramp, x, z);
      if (height == null || (best && height <= best.height)) continue;

      const d = 0.35;
      const left = this.rampAbsoluteHeight(ramp, x - d, z) ?? this.terrain.getHeight(x - d, z);
      const right = this.rampAbsoluteHeight(ramp, x + d, z) ?? this.terrain.getHeight(x + d, z);
      const back = this.rampAbsoluteHeight(ramp, x, z - d) ?? this.terrain.getHeight(x, z - d);
      const front = this.rampAbsoluteHeight(ramp, x, z + d) ?? this.terrain.getHeight(x, z + d);
      const normal = new THREE.Vector3(left - right, d * 2, back - front).normalize();
      const t = (z - ramp.startZ) / (ramp.length*ramp.direction);
      best = { height, normal, ramp, t };
    }
    return best;
  }

  step(dt, physics) {
    for (const [id, remaining] of this.rampCooldown.entries()) {
      const next = remaining - dt;
      if (next <= 0) this.rampCooldown.delete(id);
      else this.rampCooldown.set(id, next);
    }
    this.railSafetyTimer = Math.max(0, this.railSafetyTimer - dt);
    this.recatchTimer=Math.max(0,(this.recatchTimer||0)-dt);

    let state = physics.getState();
    if (state.grinding || state.crashed || !state.skisEquipped) return null;

    // Pop only after physically climbing the collision surface to its lip.
    if (state.grounded && state.speed > 6.5 && Math.abs(state.velocity.z) > 1.5) {
      const contact = this.sampleSurface(state.position.x, state.position.z);
      const ramp = contact?.ramp;
      if (ramp && !ramp.landing && state.velocity.z*ramp.direction>1.5 && !this.rampCooldown.has(ramp.id) && contact.t > 0.9 && contact.t <= 1.035) {
        physics.launchFromRamp(ramp.boost);
        this.rampCooldown.set(ramp.id, 1.0);
        state = physics.getState();
      }
    }

    // After a rail bail there is a short immunity window. This prevents the
    // old infinite-bail loop where the skier stood up inside the same box and
    // immediately crashed again.
    if (state.justEndedGrind) {
      this.recatchTimer=0.45;this.ignoreRail=physics.lastExitedRail;
      return null;
    }

    if (this.railSafetyTimer > 0) return null;

    if (!state.grinding && this.tryCatchRail(physics)) return null;
    if (!physics.getState().grinding) return this.tryRailCrash(physics);
    return null;
  }

  tryCatchRail(physics) {
    const state = physics.getState();
    if (state.speed < 5.2 || state.crashed || !state.skisEquipped) return false;

    for (const rail of this.rails) {
      if(rail.path && !rail.path.bounds.containsPoint(state.position))continue;
      const hit=railClosest(rail,state.position),t=hit.t,closest=hit.point;
      if(this.recatchTimer>0&&rail.id===this.ignoreRail)continue;
      const horizontalDistance=hit.distance;
      const verticalOffset=state.position.y-(closest.y+rail.grindHeight);
      const velocityDir=state.velocity.clone().normalize();
      const signedAlignment=velocityDir.dot(hit.tangent),alignment=Math.abs(signedAlignment);
      if(state.grounded && (signedAlignment>0?t>0.22:t<0.78))continue;
      const lateralSpeed=Math.abs(state.velocity.x*hit.tangent.z-state.velocity.z*hit.tangent.x);
      const slideIntent = physics.input?.isDown?.('KeyA') || physics.input?.isDown?.('KeyD');
      const minVertical = state.grounded ? -1.35 : -0.96;
      const maxVertical = state.grounded ? 0.72 : 1.28;
      const alignmentMin = slideIntent ? 0.30 : 0.45;
      const lateralLimit = slideIntent ? Math.max(17.5, state.speed * 1.02) : Math.max(14.5, state.speed * 0.92);

      if (
        horizontalDistance < rail.catchRadius &&
        verticalOffset > minVertical && verticalOffset < maxVertical &&
        alignment > alignmentMin && lateralSpeed < lateralLimit
      ) {
        physics.beginGrind(rail, t);
        return true;
      }
    }
    return false;
  }

  tryRailCrash(physics) {
    const state = physics.getState();
    if (state.speed < 5.5 || state.grinding || state.crashed || !state.skisEquipped || this.railSafetyTimer > 0) return null;

    for (const rail of this.rails) {
      if(rail.path && !rail.path.bounds.containsPoint(state.position))continue;
      const hit=railClosest(rail,state.position),closest=hit.point;
      const horizontalDistance=hit.distance;
      const railTop = closest.y + rail.grindHeight;
      const feetDelta = state.position.y - railTop;

      // Only a genuine side/body impact should bail. Coming down on top of a
      // feature gets another chance to catch it, and merely brushing a box while
      // changing grind style no longer destroys the line.
      const velocityDir = state.velocity.clone().normalize();
      const alignment = Math.abs(velocityDir.dot(hit.tangent));
      const lateralSpeed = Math.abs(state.velocity.x * hit.tangent.z - state.velocity.z * hit.tangent.x);
      const bodyIntoSide = feetDelta < -0.10 && feetDelta > -0.95;
      const severeCrossHit = alignment < 0.22 && lateralSpeed > 7.0;
      if (
        horizontalDistance < rail.collisionRadius * 0.62 &&
        bodyIntoSide && severeCrossHit
      ) {
        this.railSafetyTimer = 2.6;
        return { type: 'rail-crash', rail, speed: state.speed };
      }
    }
    return null;
  }
}
