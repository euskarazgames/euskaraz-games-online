/* Portrait framing for the existing camera rigs; restored after each render. */
window.EGMobileView=function(renderer,camera){
 if(!renderer||!camera?.isPerspectiveCamera||camera.__egPortrait)return;
 camera.__egPortrait=true;
 const focus=camera.position.clone(),saved=camera.position.clone(),forward=camera.position.clone();let hasFocus=false;
 const lookAt=camera.lookAt;
 camera.lookAt=function(x,y,z){if(x?.isVector3)focus.copy(x);else focus.set(x,y,z);hasFocus=true;return lookAt.apply(this,arguments)};
 const render=renderer.render;
 renderer.render=function(scene,view){
  if(view===camera)window.EGPad.frames++;
  const aspect=camera.aspect;
  if(view!==camera||aspect>=1||aspect<=0||!Number.isFinite(aspect))return render.apply(this,arguments);
  const baseFov=camera.fov,baseNear=camera.near; saved.copy(camera.position);
  // Preserve more horizontal play space without an extreme wide-angle lens.
  const nativeTan=Math.tan(baseFov*Math.PI/360),wanted=nativeTan*1.45/aspect;
  const adjusted=Math.min(wanted,Math.tan(92*Math.PI/360));
  const pullback=Math.min(1.85,Math.max(1,wanted/adjusted));
  camera.fov=Math.atan(adjusted)*360/Math.PI;
  if(hasFocus&&pullback>1){
   camera.getWorldDirection(forward);
   const distance=Math.max(.5,saved.distanceTo(focus));
   camera.position.addScaledVector(forward,-distance*(pullback-1));
  }
  camera.updateProjectionMatrix();camera.updateMatrixWorld(true);
  try{return render.apply(this,arguments)}finally{
   camera.position.copy(saved);camera.fov=baseFov;camera.near=baseNear;
   camera.updateProjectionMatrix();camera.updateMatrixWorld(true);
  }
 };
};
