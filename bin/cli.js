#!/usr/bin/env node
"use strict";

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const moduleRoot = path.join(__dirname, 'build');
if (!fs.existsSync(path.join(moduleRoot, 'node_modules'))) {
    console.log("- Module install and setup ");
    try {
        execSync('npm install', { stdio: 'inherit', cwd: moduleRoot });
        console.log("- Install complete, build ... ");
        execSync('npm run build', { stdio: 'inherit', cwd: moduleRoot });
    } catch (error) {
        console.error('Error during dependency installation:', error.message);
        process.exit(1);
    }
    console.log("- Install and setup complete, run ... ");
}
require(path.join(moduleRoot,'build','index'));