#!/usr/bin/env bash
# exit on error
set -o errexit

# Only try to install node stuff if npm is available
if command -v npm &> /dev/null
then
    npm install
    npm run build
fi

pip install -r requirements.txt