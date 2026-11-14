import {MathUtils,Quaternion} from 'three';

/** Sample the downloaded skeletal clip at a distance-derived time, never delta time. */
export function createAuthoredLocomotion(root,animations){
 const clip=animations.find(c=>c.name==='Walk_Relaxed')||animations.find(c=>c.name==='Walk_Brisk');
 if(!clip)return null;
 const tracks=[];
 for(const track of clip.tracks){
  if(!track.name.endsWith('.quaternion'))continue;
  const name=track.name.slice(0,-11),bone=root.getObjectByName(name);
  if(!bone?.isBone||/^(Root|foot_|ball_)/.test(name))continue;
  tracks.push({bone,interpolant:track.createInterpolant(),sample:new Quaternion(),arm:/^(upperarm|lowerarm|hand|clavicle|index|middle|pinky|ring|thumb)/.test(name)});
 }
 return{clip,tracks,phase:0,weight:0,armTask:1};
}

export function applyAuthoredLocomotion(motion,pose){
 if(!motion)return 0;
 // Explicit metadata distinguishes an actual walk from a seated/working pose.
 const weight=Number.isFinite(pose?.walkDistance)?MathUtils.clamp(pose.walkWeight||0,0,1):0;
 motion.weight=weight;motion.armTask=MathUtils.clamp(pose?.handTaskWeight??1,0,1);
 if(weight===0)return 0;
 const stride=Math.max(.25,pose.walkStride||.44);
 // These supplied clips contain two repeating gait cycles. At +1/4 duration
 // the left foot is forward, matching the task foot-contact convention.
 const period=motion.clip.duration/2;
 motion.phase=((pose.walkDistance/stride*period+period*.5)%motion.clip.duration+motion.clip.duration)%motion.clip.duration;
 for(const entry of motion.tracks){
  entry.sample.fromArray(entry.interpolant.evaluate(motion.phase)).normalize();
  entry.bone.quaternion.slerp(entry.sample,weight);
 }
 return weight;
}
