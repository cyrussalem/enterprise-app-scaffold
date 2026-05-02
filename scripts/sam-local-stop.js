const { execSync } = require('child_process');

const lines = execSync('docker ps --format "{{.ID}} {{.Image}}"', { encoding: 'utf8' })
  .trim()
  .split('\n')
  .filter(Boolean);

const ids = lines
  .filter(l => /lambda\/nodejs|sam\/emulation-nodejs/.test(l))
  .map(l => l.split(' ')[0]);

if (!ids.length) {
  console.log('No SAM lambda/nodejs containers found.');
  process.exit(0);
}

execSync(`docker rm -f ${ids.join(' ')}`, { stdio: 'inherit' });
