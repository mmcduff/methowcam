import functools
import json

import boto3

@functools.lru_cache()
def get_boto3_client():
  return boto3.client('s3', region_name='us-west-2')

def sign_s3_url(image):
  s3_client = get_boto3_client()
  return s3_client.generate_presigned_url(
    'get_object',
    Params={
      'Bucket': 'methowcam',
      'Key': image,
    },
    ExpiresIn=86400,
  )
  
def cloudfront_url(image):
  return 'https://static.methowcam.mmcduff.com/' + image

def get_images(event, context):
  camera = event['queryStringParameters']['camera']
  date = event['queryStringParameters']['date']
  s3_client = boto3.client('s3', region_name='us-west-2')
  response = s3_client.list_objects_v2(
    Bucket='methowcam',
    Prefix=f"{camera}/{date}",
  )
  images = sorted([x['Key'] for x in response.get('Contents', [])])
  images_with_urls = [(x, cloudfront_url(x)) for x in images]
  return {
    "isBase64Encoded": False,
    "statusCode": 200,
    "headers": {'Access-Control-Allow-Origin': '*'},
    "body": json.dumps(images_with_urls),
  }

