#!/bin/sh -x
env
npm audit fix
exec npm run-script dockerstart
