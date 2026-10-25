const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
const {_electron:electron}=require('@playwright/test');
const root=path.resolve(__dirname,'..');
(async()=>{
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'myjong-screenshots-'));
  const stamp=new Date().toISOString().slice(0,19).replaceAll(':','-');
  const folder=path.join(root,'Screenshots',stamp);await fs.mkdir(folder,{recursive:true});
  const application=await electron.launch({args:[root],env:{...process.env,MYJONG_TEST_DATA:dir,MYJONG_SMOKE:'1'}});
  try{
    const page=await application.firstWindow();page.setDefaultTimeout(15000);await page.waitForSelector('.tile');
    await application.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setSize(1366,768));
    const catalog=JSON.parse(await fs.readFile(path.join(root,'photo-catalog.json'),'utf8'));
    for(const name of [...new Set(catalog.map(p=>p.name))]) {
      const files=catalog.filter(p=>p.name===name).map(p=>path.resolve(root,p.src));
      await application.evaluate(({dialog},files)=>{dialog.showOpenDialog=async()=>({canceled:false,filePaths:files});},files);
      await page.evaluate(async name=>{
        const imported=await window.myjong.importPhotos();
        const lib=await window.myjong.changePhoto({type:'subject',name,kind:'pet',included:true}),subject=lib.subjects.at(-1);
        for(const photo of imported.library.photos.filter(p=>!p.subjectId))await window.myjong.changePhoto({type:'photo',id:photo.id,subjectId:subject.id,included:true});
      },name);
    }
    await page.reload();await page.waitForSelector('.tile');
    await page.locator('#new').click();await page.locator('#difficulty').selectOption('2');await page.locator('#layout').selectOption('Terrace');
    await page.getByRole('button',{name:'Start puzzle',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('#new-dialog').open);await page.waitForTimeout(400);
    await page.screenshot({path:path.join(folder,'01-pet-game-green.png')});
    await page.locator('#photos').click();await page.waitForFunction(()=>document.querySelector('.photo-card img')?.naturalWidth>0);
    await page.screenshot({path:path.join(folder,'02-photo-collection.png')});
    await page.locator('.photo-card').first().getByRole('button',{name:'Frame photo',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#crop-image').naturalWidth>0);
    await page.screenshot({path:path.join(folder,'03-crop-editor.png')});
    await page.locator('#crop-dialog [data-close]').click();await page.locator('#library-dialog [data-close]').click();
    await page.locator('#settings').click();await page.screenshot({path:path.join(folder,'04-settings.png')});
    await page.locator('#theme').selectOption('blue');await page.locator('#settings-dialog [data-close]').click();
    await page.screenshot({path:path.join(folder,'05-pet-game-blue.png')});
    await page.locator('#new').click();await page.screenshot({path:path.join(folder,'06-new-puzzle.png')});await page.locator('#new-dialog [data-close]').first().click();
    await page.locator('#photos').click();await page.locator('#discover-faces').click();await page.locator('#recognition-start').click();
    await page.waitForFunction(()=>document.querySelector('#recognition-status').textContent.includes('review groups'),null,{timeout:180000});
    await page.screenshot({path:path.join(folder,'08-local-pet-suggestions.png')});
    // Known names are available in this private development collection. Apply only
    // reviewed, single-pet detections in this disposable screenshot library.
    const groups=page.locator('.recognition-group');
    for(let i=0;i<await groups.count();i++) {
      const group=groups.nth(i),input=group.locator('input:not([type=checkbox])');
      if(await input.inputValue())await group.getByRole('button',{name:'Confirm selected photos',exact:true}).click();
    }
    await page.locator('#recognition-close').click();await page.locator('#library-dialog [data-close]').click();
    await page.locator('#new').click();await page.locator('#difficulty').selectOption('1');await page.locator('#collection').selectOption('mixed');
    await page.getByRole('button',{name:'Start puzzle',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('#new-dialog').open);await page.waitForTimeout(400);
    await page.screenshot({path:path.join(folder,'09-relaxed-pet-game.png')});
    const privateFolder=path.join(root,'Private-Gift');await fs.mkdir(privateFolder,{recursive:true});
    await application.evaluate(({dialog},target)=>{dialog.showSaveDialog=async()=>({canceled:false,filePath:target});},path.join(privateFolder,'starter.zip'));
    await page.evaluate(()=>window.myjong.backup());
    await application.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setSize(1920,1080));await page.waitForTimeout(300);
    await page.screenshot({path:path.join(folder,'07-pet-game-1080p.png')});
    await fs.writeFile(path.join(folder,'README.md'),'# MYjong screenshots · October 25, 2026\n\nPrivate development captures using the supplied pet collection. Keep these out of public releases.\n\n'+['01-pet-game-green.png','02-photo-collection.png','03-crop-editor.png','04-settings.png','05-pet-game-blue.png','06-new-puzzle.png','07-pet-game-1080p.png','08-local-pet-suggestions.png','09-relaxed-pet-game.png'].map(f=>`- [${f}](./${f})`).join('\n')+'\n');
    console.log('Saved screenshots to',folder);
  }finally{await application.close();await fs.rm(dir,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
