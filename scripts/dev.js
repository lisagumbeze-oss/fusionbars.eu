#!/usr/bin/env node
import { spawn } from 'child_process';

const args = ['dev'];
const rawArgs = process.argv.slice(2);

for (let i = 0; i < rawArgs.length; i++) {
  const arg = rawArgs[i];
  if (arg.startsWith('--host=')) {
    args.push('-H', arg.slice(7));
  } else if (arg === '--host' && i + 1 < rawArgs.length) {
    args.push('-H', rawArgs[++i]);
  } else {
    args.push(arg);
  }
}

// Ensure default port 3000 and hostname 0.0.0.0
if (!args.includes('-p') && !args.includes('--port')) {
  args.push('-p', '3000');
}
if (!args.includes('-H') && !args.includes('--hostname')) {
  args.push('-H', '0.0.0.0');
}

const proc = spawn('npx', ['next', ...args], {
  stdio: 'inherit',
  env: process.env,
  shell: process.platform === 'win32',
});
proc.on('exit', (code) => process.exit(code ?? 0));
