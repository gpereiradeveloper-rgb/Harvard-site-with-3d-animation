import {Matrix4, Quaternion, Vector3} from 'three';

export const BACKPACK_HEIGHT=.40;

/** A fixed floor place outside the reading chair's legs and walking corridor. */
export function backpackHomeAt(position,yaw=0,side=1){
 const x=side*.48,z=-.08,c=Math.cos(yaw),s=Math.sin(yaw);
 return{position:[position[0]+c*x+s*z,position[1]+.004,position[2]-s*x+c*z],yaw};
}

/** Bind once in the imported skeleton's rest space, never to an estimated pelvis. */
export function createBackpackSocket(spine,actorScale=1){
 if(!spine)return null;
 spine.updateWorldMatrix(true,false);
 const p=spine.getWorldPosition(new Vector3());
 const target=new Matrix4().compose(new Vector3(0,p.y-.11/actorScale,-.31/actorScale),new Quaternion(),new Vector3().setScalar(1/actorScale));
 return{bone:spine,bind:new Matrix4().copy(spine.matrixWorld).invert().multiply(target)};
}

export function backpackScratch(){
 return{matrix:new Matrix4(),inverse:new Matrix4(),position:new Vector3(),quaternion:new Quaternion(),scale:new Vector3(),axis:new Vector3(0,1,0)};
}

/** Home is in the actor parent's scene space; walking never drags a parked bag. */
export function updateBackpackTransform(root,actor,home,socket,worn,s){
 if(!root?.parent||!actor)return;
 root.parent.updateWorldMatrix(true,false);
 if(worn&&socket){
  socket.bone.updateWorldMatrix(true,false);
  s.matrix.copy(socket.bone.matrixWorld).multiply(socket.bind);
 }else{
  s.position.fromArray(home?.position||[0,0,0]);
  s.quaternion.setFromAxisAngle(s.axis,home?.yaw||0);
  s.scale.set(1,1,1);s.matrix.compose(s.position,s.quaternion,s.scale);
  if(actor.parent)s.matrix.premultiply(actor.parent.matrixWorld);
 }
 s.inverse.copy(root.parent.matrixWorld).invert();
 s.matrix.premultiply(s.inverse).decompose(root.position,root.quaternion,root.scale);
 // The inverse parent matrix cancels actor size, translation and heading.
 root.updateMatrix();root.updateMatrixWorld(true);
}
