// After-Build Script für Post-Build-Aufgaben
// Wird von electron-builder nach allen Builds aufgerufen

const fs = require('fs');
const path = require('path');

module.exports = async function afterAllArtifactBuild(context) {
  console.log('After-build script running...');
  
  const { artifactPaths, packager } = context;
  
  // Liste alle erstellten Artifakte
  console.log('Created artifacts:');
  artifactPaths.forEach(artifactPath => {
    const fileName = path.basename(artifactPath);
    const fileSize = fs.statSync(artifactPath).size;
    const fileSizeMB = (fileSize / (1024 * 1024)).toFixed(2);
    console.log(`  ${fileName} (${fileSizeMB} MB)`);
  });
  
  // Erstelle eine Build-Info Datei
  const buildInfo = {
    timestamp: new Date().toISOString(),
    version: packager?.appInfo?.version || '1.0.0',
    platform: process.platform,
    arch: process.arch,
    artifacts: artifactPaths.map(p => path.basename(p))
  };
  
  const buildInfoPath = path.join(process.cwd(), 'release', 'build-info.json');
  fs.writeFileSync(buildInfoPath, JSON.stringify(buildInfo, null, 2));
  
  console.log('Build info saved to release/build-info.json');
  console.log('After-build script completed successfully!');
};
