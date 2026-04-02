const ci = require('miniprogram-ci');
const path = require('path');

(async () => {
  const projectPath = path.resolve(__dirname);
  const privateKeyPath = path.resolve(__dirname, 'private.wx9221c6714e5f1169.key');

  const project = new ci.Project({
    appid: 'wx9221c6714e5f1169',
    type: 'miniProgram',
    projectPath: projectPath,
    privateKeyPath: privateKeyPath,
    ignores: ['node_modules/**/*', 'miniprogram_npm/**/*'],
  });

  console.log('开始上传代码...');
  const uploadResult = await ci.upload({
    project,
    version: '1.0.1',
    desc: '初始版本 - 选题雷达',
    setting: {
      es6: true,
      es7: true,
      minifyJS: true,
      minifyWXML: true,
      minifyWXSS: true,
      autoPrefixWXSS: true,
    },
    onProgressUpdate: (progress) => {
      console.log(`上传进度: ${progress}%`);
    },
  });

  console.log('上传成功!');
  console.log('版本信息:', JSON.stringify(uploadResult.subPackageInfo, null, 2));
})().catch(err => {
  console.error('上传失败:', err.message);
  process.exit(1);
});
