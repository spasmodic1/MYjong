import * as tf from '@tensorflow/tfjs';
import * as faceapi from '@vladmandic/face-api/dist/face-api.esm-nobundle.js';
import * as coco from '@tensorflow-models/coco-ssd';
let faces, pets;
async function backend() {
  if (!tf.getBackend()) {
    try { await tf.setBackend('webgl'); await tf.ready(); } catch { await tf.setBackend('cpu'); await tf.ready(); }
  }
}
export async function detectFaces(image, progress=()=>{}) {
  progress('Preparing local recognition');
  await backend();
  progress('Loading bundled face models');
  faces ||= Promise.all([faceapi.nets.tinyFaceDetector.loadFromUri('./assets/models'),faceapi.nets.faceLandmark68TinyNet.loadFromUri('./assets/models'),faceapi.nets.faceRecognitionNet.loadFromUri('./assets/models')]);
  await faces;
  progress('Finding faces');
  const detections=await faceapi.detectAllFaces(image,new faceapi.TinyFaceDetectorOptions({inputSize:608,scoreThreshold:.55})).withFaceLandmarks(true).withFaceDescriptors();
  return detections.map(r=>({kind:'person',score:r.detection.score,box:[r.detection.box.x,r.detection.box.y,r.detection.box.width,r.detection.box.height],descriptor:Array.from(r.descriptor)}));
}
export async function detectPets(image, progress=()=>{}) {
  progress('Preparing local recognition');
  await backend();
  progress('Loading bundled pet model');
  pets ||= coco.load({base:'lite_mobilenet_v2',modelUrl:'./assets/models/pets/model.json'});
  const model=await pets;progress('Finding pets');
  return (await model.detect(image,10,.55)).filter(p=>['cat','dog','bird','horse'].includes(p.class)).map(p=>({kind:p.class,score:p.score,box:p.bbox}));
}
