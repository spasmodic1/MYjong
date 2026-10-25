const {build,Platform,Arch}=require('electron-builder');
build({targets:Platform.WINDOWS.createTarget(['dir'],Arch.x64),publish:'never',config:{...require('../release-builder.cjs'),extraMetadata:{version:'0.8.9'},directories:{output:'test-results/update-old'}}})
  .then(()=>require('node:fs/promises').copyFile('dist/win-unpacked/resources/app-update.yml','test-results/update-old/win-unpacked/resources/app-update.yml'))
  .catch(e=>{console.error(e);process.exitCode=1;});
