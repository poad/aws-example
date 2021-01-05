import json

def handler(event, context):
    print('event: {0}'.format(json.dumps(event)))
    print('context: {0}'.format(json.dumps(context)))
