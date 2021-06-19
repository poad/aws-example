#!/usr/bin/env sh

CUR=$(pwd)

YARN_PROJECTS="\
  cognito/cognito-admin/app\
  cognito/cognito-admin/infra\
  codebuild/custom-image-test\
  lambda/cognito-console\
  lambda/cognito-lambda\
  lambda/cognito-lambda/lambda\
  lambda/container/hello-rust-lambda\
  lambda/container/sample\
  lambda/container/sample/lambda\
  lambda/python
"

which jq >> /dev/null
if [ $? -ne 0 ]
then
  echo "not found jq command"
  exit 1
fi

# parse package.json
dev_modules=$(echo -n $(cat package.json | jq -r ".devDependencies | to_entries | .[].key"))
echo ${dev_modules}

modules=$(echo -n $(cat package.json | jq -r ".dependencies | to_entries | .[].key"))
echo ${modules}

for target in ${YARN_PROJECTS}
do
  cd ${CUR}/${target}
  yarn install
  yarn add --dev ${dev_modules}
  yarn add ${modules}
  yarn upgrade
done

# To solve the problem of not being able to delete the node_modules directory
rm -rf node_modules

cd ${CUR}
