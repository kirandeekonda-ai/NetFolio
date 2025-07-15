require('./logger.js');
const { spawn } = require('child_process');

const nextProcess = spawn('npx', ['next', 'dev'], {
  shell: true
});

// Pipe stdout and stderr to the current process so they get logged
nextProcess.stdout.on('data', (data) => {
  console.log(data.toString().trim());
});

nextProcess.stderr.on('data', (data) => {
  console.error(data.toString().trim());
});

nextProcess.on('close', (code) => {
  console.log(`Next.js process exited with code ${code}`);
});

nextProcess.on('error', (error) => {
  console.error('Failed to start Next.js:', error);
});
