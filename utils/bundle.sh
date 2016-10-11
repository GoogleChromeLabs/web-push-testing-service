#!/bin/bash
set -e

if [ "$BASH_VERSION" = '' ]; then
 echo "    Please run this script via this command: './<Script Location>/<Script Name>.sh'"
 exit 1;
fi

if [ -z "$1" ]; then
  echo "    Bad input: Expected a directory as the first argument for the path to put the final bundle files into (i.e. ./tagged-release)";
  exit 1;
fi

# Copy over files that we want in the release
cp -r ./src $1
cp LICENSE $1
cp package.json $1
cp README.md $1
