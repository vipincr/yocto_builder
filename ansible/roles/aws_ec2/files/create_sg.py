#!/usr/bin/env python3
import boto3
import json
import os
import sys

region = os.environ.get('AWS_REGION', 'ap-south-1')
sg_name = os.environ.get('SECURITY_GROUP_NAME', 'yocto-builder-sg')
vpc_id = os.environ.get('VPC_ID')
ssh_cidr = os.environ.get('SSH_CIDR', '0.0.0.0/0')

if not vpc_id:
    print("ERROR: VPC_ID not set", file=sys.stderr)
    sys.exit(1)

ec2 = boto3.client('ec2', region_name=region)

try:
    # Check if security group already exists
    sgs = ec2.describe_security_groups(
        Filters=[
            {'Name': 'group-name', 'Values': [sg_name]},
            {'Name': 'vpc-id', 'Values': [vpc_id]}
        ]
    )
    
    if sgs['SecurityGroups']:
        print(sgs['SecurityGroups'][0]['GroupId'])
        sys.exit(0)
    
    # Create security group
    sg = ec2.create_security_group(
        GroupName=sg_name,
        Description='Security group for Yocto Builder platform',
        VpcId=vpc_id
    )
    sg_id = sg['GroupId']
    
    # Add ingress rules
    ec2.authorize_security_group_ingress(
        GroupId=sg_id,
        IpPermissions=[
            {
                'IpProtocol': 'tcp',
                'FromPort': 22,
                'ToPort': 22,
                'IpRanges': [{'CidrIp': ssh_cidr, 'Description': 'SSH access'}]
            },
            {
                'IpProtocol': 'tcp',
                'FromPort': 80,
                'ToPort': 80,
                'IpRanges': [{'CidrIp': '0.0.0.0/0', 'Description': 'HTTP access'}]
            },
            {
                'IpProtocol': 'tcp',
                'FromPort': 443,
                'ToPort': 443,
                'IpRanges': [{'CidrIp': '0.0.0.0/0', 'Description': 'HTTPS access'}]
            }
        ]
    )
    
    print(sg_id)
    
except Exception as e:
    print(f"ERROR: {str(e)}", file=sys.stderr)
    sys.exit(1)

