const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
/** Accelerate angular momentum; letting go damps gently, opposing input brakes. */
export function angularVelocity(omega, input, dt, limit=4.4, response=3.5) {
  const target=clamp(input,-1,1)*limit;
  // Build rotation deliberately; opening the arms on release brakes over a
  // short, nonzero coast. response lets pipe/quarterpipe airs feel more
  // reactive without making ordinary piste jumps twitchy.
  const rate=Math.abs(input)>0.01 ? (omega*input<0 ? Math.max(10,response*1.7) : response) : 8;
  return omega+(target-omega)*(1-Math.exp(-rate*dt));
}
export function edgeResponse(speed, steer, grip, braking=false) {
  const requested=Math.abs(steer)*(0.95+speed*0.13);
  const available=(braking?3.5:6.5)*grip;
  const slip=clamp((requested-available)/Math.max(available,1),0,1);
  return { slip, coupling: (braking?2:7)*grip*(1-slip*0.78) };
}
export function transitionPump(charge,speed,ascending,load) {
  if (speed>=32 || speed<4 || charge<0.08) return 0;
  return ascending && load>0.3 ? charge*1.7*(1-speed/32) : -charge*0.65;
}
export function suspensionStep(value,rate,target,dt) {
  const acceleration=(clamp(target,0,1)-value)*110-rate*19;
  const velocity=rate+acceleration*dt;
  return {value:clamp(value+velocity*dt,0,1),rate:velocity};
}
