#!/usr/bin/env node

import childProcess from 'node:child_process';
import fs from 'node:fs';
import * as minio from 'minio';
import path from 'node:path';

let configPath = process.argv[2];
if (!configPath) {
    console.error('Usage: node . <configPath>');
    process.exit(1);
}

configPath = path.resolve(process.cwd(), configPath);
if (!fs.existsSync(configPath) || !fs.statSync(configPath).isFile()) {
    console.error(`Config file not found: ${configPath}`);
    process.exit(1);
}

let config;
try {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
} catch(e) {
    console.error('Failed to read or parse config file:', e);
    process.exit(1);
}

console.log('Running export script...');
let scriptStart = performance.now();
let child = childProcess.spawnSync('bash', ['-c', config.command], {encoding: 'utf8'});
if (child.error) {
    console.error('Failed to execute command:', child.error);
    process.exit(1);
}
let scriptEnd = performance.now();
console.log(`Script execution took ${(scriptEnd - scriptStart).toFixed(2)} ms`);

let s3Client = new minio.Client({
    endPoint: config.storage.endpoint,
    useSSL: true,
    accessKey: config.storage.accessKey,
    secretKey: config.storage.secretKey
});

let now = new Date();
let fileName = config.storage.path
    .replaceAll('{year}', now.getUTCFullYear())
    .replaceAll('{month}', String(now.getUTCMonth() + 1).padStart(2, '0'))
    .replaceAll('{day}', String(now.getUTCDate()).padStart(2, '0'))
    .replaceAll('{hour}', String(now.getUTCHours()).padStart(2, '0'))
    .replaceAll('{minute}', String(now.getUTCMinutes()).padStart(2, '0'))
    .replaceAll('{second}', String(now.getUTCSeconds()).padStart(2, '0'))
    .replaceAll('{epoch}', String(Math.floor(now.getTime() / 1000)));
console.log(`Saving to S3 path: ${fileName}`);

console.log('Uploading file to S3...');
let uploadStart = performance.now();
await s3Client.putObject(config.storage.bucket, fileName, child.stdout, child.stdout.length, config.storage.metadata ?? {});
let uploadEnd = performance.now();
console.log(`File upload took ${(uploadEnd - uploadStart).toFixed(2)} ms`);
console.log('Export completed successfully.');
