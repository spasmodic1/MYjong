// Build-time only: CC0 recordings, pinned to a reviewed VCSL revision.
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const revision='c1ea7bcc3c7309650ab0da9d15c9cd1fbc4a4c7e',directory='test-results/music-samples';
const samples=[];
for(const [pitch,midi] of [['C1',24],['F#1',30],['C2',36],['F#2',42],['C3',48],['F#3',54],['C4',60],['F#4',66],['C5',72],['F#5',78],['C6',84]])samples.push({instrument:'piano',midi,path:`Chordophones/Zithers/Grand Piano, Kawai/Sustains/GPiano_sus_${pitch}_v2_rr1_Player.wav`});
for(const [pitch,midi] of [['C3',48],['E3',52],['G3',55],['B3',59],['D4',62],['F4',65],['A4',69],['C5',72],['E5',76],['G5',79]])samples.push({instrument:'harp',midi,path:`Chordophones/Composite Chordophones/Concert Harp/KSHarp_${pitch}_mf${pitch==='C3'?3:1}.wav`});
for(const [pitch,midi] of [['G4',67],['C5',72],['G5',79],['C6',84]])samples.push({instrument:'bell',midi,path:`Idiophones/Struck Idiophones/Glockenspiel/glock_medium_${pitch}_01.wav`});
for(const [file,midi] of [['glass1_D#4_Fast_1_main.wav',63],['glass2_F#4_Fast_1_Main.wav',66],['glass3_A#4_Fast_1_Main.wav',70]])samples.push({instrument:'pad',midi,path:`Idiophones/Friction Idiophones/Wine Glasses/Sustains/Fast/${file}`});
samples.push({instrument:'sleigh',midi:60,path:'Idiophones/Struck Idiophones/Sleigh Bells/Sleighbells_Hit_rr1_Mid.wav'});
async function main(){
 await fs.mkdir(directory,{recursive:true});const manifest=[];
 for(const item of samples){
  if(['piano','bell','pad'].includes(item.instrument))item.midi+=12; // Verified concert pitch: these source filenames use C3 for middle C.
  const file=path.basename(item.path),target=path.join(directory,file),encoded=item.path.split('/').map(encodeURIComponent).join('/');
  let bytes=await fs.readFile(target).catch(()=>null);
  if(!bytes){const response=await fetch(`https://raw.githubusercontent.com/sgossner/VCSL/${revision}/${encoded}`);if(!response.ok)throw Error(`${response.status}: ${item.path}`);bytes=Buffer.from(await response.arrayBuffer());await fs.writeFile(target,bytes);}
  if(bytes.toString('ascii',0,4)!=='RIFF')throw Error('Not a WAV: '+item.path);
  manifest.push({...item,file,sha256:crypto.createHash('sha256').update(bytes).digest('hex')});console.log(file,bytes.length);
 }
 await fs.writeFile(path.join(directory,'manifest.json'),JSON.stringify(manifest,null,2));
 await fs.mkdir('assets/licenses',{recursive:true});const response=await fetch(`https://raw.githubusercontent.com/sgossner/VCSL/${revision}/LICENSE`);if(!response.ok)throw Error('Missing CC0 license');await fs.writeFile('assets/licenses/VCSL-CC0.txt',await response.text());
 await fs.writeFile('assets/music/sample-provenance.json',JSON.stringify({library:'Versilian Community Sample Library',url:'https://github.com/sgossner/VCSL',license:'CC0-1.0',revision,samples:manifest},null,2)+'\n');
}
main().catch(error=>{console.error(error);process.exitCode=1;});

