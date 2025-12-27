#!/usr/bin/env python3
import boto3
import os
import sys

region = os.environ.get('AWS_REGION', 'ap-south-1')
sg_id = os.environ.get('SG_ID')

if not sg_id:
    print("ERROR: SG_ID not set", file=sys.stderr)
    sys.exit(1)

ec2 = boto3.client('ec2', region_name=region)

try:
    # Add HTTP and HTTPS rules
    for port in [80, 443]:
        try:
            ec2.authorize_security_group_ingress(
                GroupId=sg_id,
                IpPermissions=[{
                    'IpProtocol': 'tcp',
                    'FromPort': port,
                    'ToPort': port,
                    'IpRanges': [{'CidrIp': '0.0.0.0/0', 'Description': f'Port {port} access'}]
                }]
            )
            print(f"Added rule for port {port}")
        except Exception as e:
            if 'InvalidPermission.Duplicate' in str(e) or 'already exists' in str(e).lower():
                print(f"Port {port} rule already exists")
            else:
                raise
    print("SUCCESS")
except Exception as e:
    print(f"ERROR: {str(e)}", file=sys.stderr)
    sys.exit(1)

