// Hand-authored routes. Each disconnected rail piece is its own collision path;
// there is no grind constraint across open air.
export const CREATIVE_RAILS=[
 {run:'park',z:-810,offsetX:-104,length:42,height:.72,width:.15,shape:'long-s',kind:'RIBBON S'},
 {run:'park',z:-570,offsetX:-107,length:30,height:.8,width:.18,shape:'bank-c',kind:'BANK WRAP'},
 {run:'park',z:-305,offsetX:106,length:18,height:.75,width:.18,kind:'BROKEN LINE · IN',pair:'park-gap'},
 {run:'park',z:-284.4,offsetX:106,length:18,height:.72,width:.18,kind:'BROKEN LINE · OUT',pair:'park-gap',anchorZ:-305},
 {run:'park',z:40,offsetX:-106,length:12,height:.70,width:1.65,kind:'BUTTER BOX'},
 {run:'park',z:62,offsetX:-106,length:25,height:.75,width:.17,shape:'split-left',kind:'FORK · LEFT',anchorZ:40},
 {run:'park',z:62,offsetX:-106,length:25,height:.75,width:.17,shape:'split-right',kind:'FORK · RIGHT',anchorZ:40},
 {run:'park',z:400,offsetX:-102,length:40,height:1.4,width:.19,shape:'stair',kind:'STAIR LINK'},
 {run:'park',z:670,offsetX:-105,length:30,height:.95,width:.16,shape:'wall-c',kind:'CURVED WALL RAIL'},
 {run:'transition',z:-2060,offsetX:-190,length:28,height:.76,width:.16,shape:'long-s',kind:'WEST RIBBON'},
 {run:'transition',z:-2470,offsetX:185,length:27,height:.74,width:.17,shape:'bank-c',kind:'EAST WRAP'},
 {run:'transition',z:-2815,offsetX:-190,length:26,height:.76,width:.17,shape:'wall-c',kind:'WALL CURVE'},
 {run:'transition',z:-3185,offsetX:185,length:30,height:.80,width:.17,shape:'long-s',kind:'LOWER RIBBON'},
 {run:'pine',z:470,offsetX:-40,length:14,height:.55,width:.23,shape:'log',kind:'FALLEN FIR'},
 {run:'woodland',z:150,offsetX:36,length:16,height:.52,width:.25,shape:'log',kind:'WOODLAND LOG'},
 {run:'flow',z:560,offsetX:50,length:24,height:.72,width:.18,shape:'bank-c',kind:'SIDE BANK RAIL'},
 {run:'sunset',z:500,offsetX:-50,length:18,height:.64,width:.22,shape:'log',kind:'VALLEY LOG'},
];
export const PARK_LANES=[
 {offset:-104,name:'CREATIVE',color:0xefae56,description:'Forks · gaps · banks'},
 {offset:-52,name:'PROGRESSION',color:0x68b892,description:'Small jumps · boxes'},
 {offset:0,name:'FLOW',color:0x57accc,description:'Medium jumps · rails'},
 {offset:52,name:'FLIGHT',color:0xd16a72,description:'Large jumps · landings'},
 {offset:108,name:'TECHNICAL',color:0x9689c5,description:'Curves · presses · transfers'},
];
