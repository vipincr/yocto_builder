#!/usr/bin/env python3
import boto3
import os
import sys
from datetime import datetime

region = os.environ.get('AWS_REGION', 'ap-south-1')

ec2 = boto3.client('ec2', region_name=region)

try:
    response = ec2.describe_images(
        Owners=['099720109477'],  # Canonical
        Filters=[
            {'Name': 'name', 'Values': ['ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*']},
            {'Name': 'architecture', 'Values': ['x86_64']},
            {'Name': 'virtualization-type', 'Values': ['hvm']},
            {'Name': 'state', 'Values': ['available']}
        ]
    )
    
    # Sort by creation date (newest first)
    images = sorted(
        response['Images'],
        key=lambda x: x['CreationDate'],
        reverse=True
    )
    
    if images:
        print(images[0]['ImageId'])
    else:
        print("ERROR: No Ubuntu 22.04 AMI found", file=sys.stderr)
        sys.exit(1)
        
except Exception as e:
    print(f"ERROR: {str(e)}", file=sys.stderr)
    sys.exit(1)

