import {analyzeDeadEnd} from './solver.js';
self.onmessage=event=>{
  try{self.postMessage({plan:analyzeDeadEnd(event.data)});}
  catch{self.postMessage({plan:null});}
};
