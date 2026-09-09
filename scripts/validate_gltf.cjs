const fs = require('node:fs');
const path = require('node:path');
const validator = require(process.argv[2] || 'gltf-validator');

async function main() {
  const root = path.resolve(__dirname, '..');
  const results = [];
  for (const name of ['cardholder', 'key', 'hero-scene']) {
    const filename = path.join(root, 'assets', 'models', `${name}.glb`);
    const bytes = fs.readFileSync(filename);
    const report = await validator.validateBytes(new Uint8Array(bytes), {
      uri: `${name}.glb`,
      maxIssues: 1000,
    });
    results.push({ name, ...report });
    console.log(`${name}: ${report.issues.numErrors} errors, ${report.issues.numWarnings} warnings, ${bytes.length} bytes`);
  }
  fs.writeFileSync(path.join(root, 'assets', 'models', 'gltf-validation.json'), JSON.stringify(results, null, 2));
  if (results.some(report => report.issues.numErrors || report.issues.numWarnings)) {
    throw new Error('GLB validation reported errors or warnings; see gltf-validation.json');
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
