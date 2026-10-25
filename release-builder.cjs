const pkg=require('./package.json');
const feed=require('./release-config.json');
module.exports={...pkg.build,publish:[{provider:'github',owner:feed.owner,repo:feed.repo,releaseType:'release'}],artifactName:'MYjong-Setup-${version}.${ext}'};
