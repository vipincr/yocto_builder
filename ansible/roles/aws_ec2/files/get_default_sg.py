#!/usr/bin/env python3
import boto3
import os
import sys

region = os.environ.get('AWS_REGION', 'ap-south-1')
vpc_id = os.environ.get('VPC_ID')

if not vpc_id:
    print("ERROR: VPC_ID not set", file=sys.stderr)
    sys.exit(1)

ec2 = boto3.client('ec2', region_name=region)

try:
    sgs = ec2.describe_security_groups(
        Filters=[
            {'Name': 'vpc-id', 'Values': [vpc_id]},
            {'Name': 'group-name', 'Values': ['default']}
        ]
    )
    
    if sgs['SecurityGroups']:
        print(sgs['SecurityGroups'][0]['GroupId'])
    else:
        print("", file=sys.stderr)
        sys.exit(1)
        
except Exception as e:
    print(f"ERROR: {str(e)}", file=sys.stderr)
    sys.exit(1)

