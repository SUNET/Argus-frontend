#!/bin/sh -x
env
npm config set registry http://registry.npmjs.org/
npm install --verbose
exec npm run-script dockerstart
