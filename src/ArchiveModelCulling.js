import {Box3,Sphere,Vector3} from 'three';

/** Give moving anatomy a conservative render envelope without changing its
 * measured dimensions. Box3 fitting uses boundingBox; frustum culling uses
 * boundingSphere, so only the latter may include the animation allowance.
 */
export function configureModelCulling(object){
 object.updateMatrixWorld(true);
 const bounds=new Box3().setFromObject(object);
 const margin=bounds.getSize(new Vector3()).y*.5;
 object.traverse(node=>{
  if(!node.isMesh)return;
  node.frustumCulled=true;
  if(!node.isSkinnedMesh)return;
  const envelope=bounds.clone().expandByScalar(margin).applyMatrix4(node.matrixWorld.clone().invert());
  node.boundingSphere=envelope.getBoundingSphere(new Sphere());
 });
}
