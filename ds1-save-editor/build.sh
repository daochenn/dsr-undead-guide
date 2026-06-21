#!/bin/bash
if [ "$CF_PAGES_BRANCH" = "master" ]; then
  npm run build
else
  npm run build:dev
fi