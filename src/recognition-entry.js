import * as tf from '@tensorflow/tfjs';
import * as faceapi from '@vladmandic/face-api/dist/face-api.esm-nobundle.js';
import * as coco from '@tensorflow-models/coco-ssd';
import {FACE_MODEL} from './photo-analysis.js';
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
  faces ||= Promise.all([faceapi.nets.ssdMobilenetv1.loadFromUri('./assets/models'),faceapi.nets.faceLandmark68Net.loadFromUri('./assets/models'),faceapi.nets.faceRecognitionNet.loadFromUri('./assets/models')]);
  await faces;
  progress('Finding faces');
  const detections=await faceapi.detectAllFaces(image,new faceapi.SsdMobilenetv1Options({minConfidence:.5,maxResults:20})).withFaceLandmarks(false).withFaceDescriptors();
  return detections.map(r=>({kind:'person',model:FACE_MODEL,score:r.detection.score,box:[r.detection.box.x,r.detection.box.y,r.detection.box.width,r.detection.box.height],descriptor:Array.from(r.descriptor)}));
}
export async function detectPets(image, progress=()=>{}) {
  progress('Preparing local recognition');
  await backend();
  progress('Loading bundled pet model');
  pets ||= coco.load({base:'lite_mobilenet_v2',modelUrl:'./assets/models/pets/model.json'});
  const model=await pets;progress('Finding pets');
  return (await model.detect(image,10,.55)).filter(p=>['cat','dog','bird','horse'].includes(p.class)).map(p=>({kind:p.class,score:p.score,box:p.bbox}));
}
