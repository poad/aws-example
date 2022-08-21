# Welcome to your CDK TypeScript project

This is a blank project for CDK development with TypeScript.

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Useful commands

* `yarn build`      compile typescript to js
* `yarn watch`      watch for changes and compile
* `cdk deploy`      deploy this stack to your default AWS account/region
* `cdk diff`        compare deployed stack with current state
* `cdk synth`       emits the synthesized CloudFormation template

### test locally (mo working)

```
sam local start-lambda -t ./cdk.out/ApolloServerApiGatewayStack.template.json
```

```
sam local invoke -t ./cdk.out/ApolloServerApiGatewayStack.template.json ApolloLambdaFunction
```

