#!/usr/bin/env python3
import boto3
import os
import sys
import json
import time

region = os.environ.get('AWS_REGION', 'ap-south-1')
instance_type = os.environ.get('INSTANCE_TYPE', 'm5.2xlarge')
key_name = os.environ.get('KEY_NAME')
image_id = os.environ.get('IMAGE_ID', '').strip().strip('"').strip("'")
sg_id = os.environ.get('SG_ID')
instance_name = os.environ.get('INSTANCE_NAME', 'yocto-builder')
volume_size = int(os.environ.get('VOLUME_SIZE', '100'))

if not all([key_name, image_id, sg_id]):
    print("ERROR: Missing required parameters", file=sys.stderr)
    sys.exit(1)

ec2 = boto3.client('ec2', region_name=region)

try:
    # Create instance with Name tag
    response = ec2.run_instances(
        ImageId=image_id,
        MinCount=1,
        MaxCount=1,
        InstanceType=instance_type,
        KeyName=key_name,
        SecurityGroupIds=[sg_id],
        BlockDeviceMappings=[
            {
                'DeviceName': '/dev/sda1',
                'Ebs': {
                    'VolumeSize': volume_size,
                    'VolumeType': 'gp3',
                    'DeleteOnTermination': True
                }
            }
        ],
        TagSpecifications=[
            {
                'ResourceType': 'instance',
                'Tags': [
                    {'Key': 'Name', 'Value': instance_name},
                    {'Key': 'Application', 'Value': 'yocto-builder'}
                ]
            }
        ]
    )
    
    instance_id = response['Instances'][0]['InstanceId']
    
    # Wait for instance to be running
    print(f"Waiting for instance {instance_id} to be running...", file=sys.stderr)
    waiter = ec2.get_waiter('instance_running')
    waiter.wait(InstanceIds=[instance_id], WaiterConfig={'Delay': 10, 'MaxAttempts': 60})
    
    # Get instance details
    instances = ec2.describe_instances(InstanceIds=[instance_id])
    instance = instances['Reservations'][0]['Instances'][0]
    
    result = {
        'instance_id': instance_id,
        'public_ip': instance.get('PublicIpAddress', ''),
        'private_ip': instance.get('PrivateIpAddress', ''),
        'state': instance['State']['Name']
    }
    
    print(json.dumps(result))
    
except Exception as e:
    print(f"ERROR: {str(e)}", file=sys.stderr)
    sys.exit(1)

