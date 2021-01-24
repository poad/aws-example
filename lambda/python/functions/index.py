import json
import boto3
from time import sleep
from itertools import chain

client = boto3.client('ec2')

def list_instances(tags=None):
    if tags is not None:
        response = client.describe_instances(
            Filters=[
                {
                    'Name': 'tag:SubSystem',
                    'Values': tags
                },
            ]
        )
    else:
        response = client.describe_instances()

    instance_list = list(
        chain.from_iterable(
            map(
                lambda items: items['Instances'],
                response['Reservations']
            )
        )
    )

    instances = list(
        map(
            lambda instance: instance['InstanceId'],
            filter(
                lambda instance: instance['State'] == 'pending' or instance['State']['Name'] == 'running',
                instance_list
            )
        )
    )

    return instances

def stop_instances(instanceIds, sleep_in_sec=10):
    stopping_instances = list(
        map(
            lambda instance: instance['InstanceId'],
            client.stop_instances(
                InstanceIds=instanceIds
            )['StoppingInstances']
        )
    )
    sleep(sleep_in_sec)

    counter = 0
    while counter < 6 and len(stopping_instances) <= 0:
        response = client.describe_instances(
            InstanceIds=stopping_instances
        )
        instances = list(
            map(
                lambda instance: instance['InstanceId'],
                filter(
                    lambda instance: instance['State']['Name'] == 'pending' or instance['State']['Name'] == 'running' or instance['State']['Name'] == 'shutting-down',
                    chain.from_iterable(
                        map(
                            lambda items: items['Instances'],
                            response['Reservations']
                        )
                    )
                )
            )
        )
        if len(instances) > 0 and counter >= 3:
            raise Exception('Maximum number of retries exceeded') 

def terminate_instances(instances, sleep_in_sec=10):
    terminating_instances = list(
        map(
            lambda instance: instance['InstanceId'],
            client.terminate_instances(InstanceIds=instances)['TerminatingInstances']
        )
    )

    sleep(sleep_in_sec)

    counter = 0
    while counter < 6 and len(terminating_instances) <= 0:
        response = client.describe_instances(
            InstanceIds=terminating_instances
        )
        terminating_instances = list(
            map(
                lambda instance: instance['InstanceId'],
                filter(
                    lambda instance: instance['State']['Name'] != 'terminated',
                    chain.from_iterable(
                        map(
                            lambda items: items['Instances'],
                            response['Reservations']
                        )
                    )
                )
            )
        )
        if len(terminating_instances) > 0 and counter >= 3:
            raise Exception('Maximum number of retries exceeded') 

def sendResponse(success , statusCode , message , responseData):
    return {
        'success' : success,
        'statusCode' : statusCode,
        'message': message,
        'responseData' : responseData
    }

def handler(event, context):
    try:
        print('event: {0}'.format(json.dumps(event)))
        # print('context: {0}'.format(json.dumps(context)))
        if event['tags'] is not None:
            tags = event['tags']
        else:
            tags = None

        instances = list_instances(tags)
        if len(instances) > 0:
            stop_instances(instanceIds=instances)
            print('Stopped instances')

            terminate_instances(instances=instances)
            print('Terminated instances')

        return sendResponse(True, 200, 'Appointments found', '')
    except Exception as error:
        return sendResponse(False, 500, 'Error in fetch booked appointments', str(error))

