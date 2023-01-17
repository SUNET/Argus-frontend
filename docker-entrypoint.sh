#!/bin/sh -x
env
npm install --verbose
npm audit fix
exec npm run-script dockerstart
