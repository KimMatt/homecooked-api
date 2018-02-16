#!/bin/bash

# Set up sengrid env variables
echo "export SENDGRID_API_KEY='SG.nZz9TOHDTiubdd-GTnNVQA.GornD8dSYANPIDMvpMFpNyQiOnSyy1uD0FfvM8OnbAk'" > sendgrid.env
echo "sendgrid.env" >> .gitignore
source ./sendgrid.env

service mysql start
node ./app/server.js