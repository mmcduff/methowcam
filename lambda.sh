#!/bin/bash

ZIP=`mktemp`
zip -g $ZIP.zip api.py

aws lambda update-function-code --function-name get_images --zip-file fileb://$ZIP.zip
