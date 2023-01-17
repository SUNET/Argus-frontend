#!/bin/sh -x
env
npm install --verbose
exec npm run-script dockerstart
