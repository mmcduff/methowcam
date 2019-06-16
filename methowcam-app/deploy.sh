#!/bin/bash
npm run build
aws s3 cp build s3://methowcam.mmcduff.com --recursive
