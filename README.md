## Methowcam

This is a side project to display images from my cameras in the Methow Valley.  Photos are uploaded to S3 from the cameras.  A simple Lambda function (exposed by API Gateway) compiles those photos into lists by day and camera name.  A React webapp reads those image lists from API Gateway and displays them. 

### Lambda function

The Lambda function is `get_images` in api.py, deployed with `lambda.sh`

### React webapp

See README.md in methowcam-app
