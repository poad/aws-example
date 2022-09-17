# The Ubuntu 22.04 base EC2 instance for Cloud9

CDK for deploy the Ubuntu 22.04 base Cloud9 EC2 instance.

## Useage

1. deploy
2. Add the Cloud9 environment from AWS Management console

### deploy

configure your AWS account ID and default region in cdk.json

```sh
yarn install
cdk deploy -c name={Your EC2 Instance name for Cloud9}
```

### Add the Cloud9 environment from AWS Management console

1. Open <https://console.aws.amazon.com/ec2/home>
2. Switch the AWS region
3. Select the Deployed EC2 instance
4. Copy the Public IP address of the Deployed EC2 instance
5. Connect to EC2 instance by Session Manager
6. Open <https://console.aws.amazon.com/cloud9/home/product> in n another tab or window
7. Create environment
  a. Select `Create and run in remote server (SSH connection)` to Environment type
  b. Input the follow values to SSH server connection
  | Item | Value | Description |
  |:-----|-------|-------------|
  | User | ubuntu | |
  | Host | Public IP address of the copied EC2 instance |  |
  c. Click `Copy key to clipboard`
  d. Switch the window or tab to Session Manager
  e. Input the `sudo -u ubuntu -s`
  f. Type the following and append the keys copied to the clipboard to /home/ubuntu/.ssh/authorized_keys

　　  ```sh
　　  cat << EOS >> /home/ubuntu/.ssh/authorized_keys
  　　${key in clipboard}
  　　EOS
　　  ```

   g. Click 'Next Step'
   h. Click 'Create environment'
