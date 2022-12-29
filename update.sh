#!/bin/sh

CUR=$(pwd)

CURRENT=$(cd "$(dirname "$0")" || exit;pwd)
echo "${CURRENT}"

cd "${CURRENT}" || exit
git pull --prune
result=$?
if [ $result -ne 0 ]; then
  cd "${CUR}" || exit
  exit $result
fi

cd "${CURRENT}" || exit
result=$?
if [ $result -ne 0 ]; then
  cd "${CUR}" || exit
  exit $result
fi
echo ""
pwd
yarn set version berry && git add .yarn/release && rm -rf node_modules yarn.lock .yarn/cache && touch yarn.lock && yarn install && yarn up -R && yarn build
result=$?
if [ $result -ne 0 ]; then
  cd "${CUR}" || exit
  exit $result
fi

cd "${CURRENT}"/common/cognito-singin || exit
result=$?
if [ $result -ne 0 ]; then
  cd "${CUR}" || exit
  exit $result
fi
echo ""
pwd
yarn set version berry && git add .yarn/release && rm -rf node_modules yarn.lock .yarn/cache && touch yarn.lock && yarn install && yarn up -R && yarn build
result=$?
if [ $result -ne 0 ]; then
  cd "${CUR}" || exit
  exit $result
fi

cd "${CURRENT}"/amplify/amplified_todo || exit
result=$?
if [ $result -ne 0 ]; then
  cd "${CUR}" || exit
  exit $result
fi
echo ""
pwd
yarn set version berry && git add .yarn/release && rm -rf node_modules yarn.lock .yarn/cache && touch yarn.lock && yarn install && yarn up -R
result=$?
if [ $result -ne 0 ]; then
  cd "${CUR}" || exit
  exit $result
fi

cd "${CURRENT}"/amplify/amplify_nextapp || exit
result=$?
if [ $result -ne 0 ]; then
  cd "${CUR}" || exit
  exit $result
fi
echo ""
pwd
yarn set version berry && git add .yarn/release && rm -rf node_modules yarn.lock .yarn/cache && touch yarn.lock && yarn install && yarn up -R
result=$?
if [ $result -ne 0 ]; then
  cd "${CUR}" || exit
  exit $result
fi

cd "${CURRENT}"/amplify/amplify-cdk/app || exit
result=$?
if [ $result -ne 0 ]; then
  cd "${CUR}" || exit
  exit $result
fi
echo ""
pwd
yarn set version berry && git add .yarn/release && rm -rf node_modules yarn.lock .yarn/cache && touch yarn.lock && yarn install && yarn up -R
result=$?
if [ $result -ne 0 ]; then
  cd "${CUR}" || exit
  exit $result
fi

cd "${CURRENT}"/amplify/amplify-cdk/infra || exit
result=$?
if [ $result -ne 0 ]; then
  cd "${CUR}" || exit
  exit $result
fi
echo ""
pwd
yarn set version berry && git add .yarn/release && rm -rf node_modules yarn.lock .yarn/cache && touch yarn.lock && yarn install && yarn up -R
result=$?
if [ $result -ne 0 ]; then
  cd "${CUR}" || exit
  exit $result
fi

cd "${CURRENT}"/cloud9 || exit
result=$?
if [ $result -ne 0 ]; then
  cd "${CUR}" || exit
  exit $result
fi
echo ""
pwd
yarn set version berry && git add .yarn/release && rm -rf node_modules yarn.lock .yarn/cache && touch yarn.lock && yarn install && yarn up -R
result=$?
if [ $result -ne 0 ]; then
  cd "${CUR}" || exit
  exit $result
fi

cd "${CURRENT}"/codebuild/codebuild-webhook-project/infra || exit
result=$?
if [ $result -ne 0 ]; then
  cd "${CUR}" || exit
  exit $result
fi
echo ""
pwd
yarn set version berry && git add .yarn/release && rm -rf node_modules yarn.lock .yarn/cache && touch yarn.lock && yarn install && yarn up -R
result=$?
if [ $result -ne 0 ]; then
  cd "${CUR}" || exit
  exit $result
fi

cd "${CURRENT}"/codebuild/custom-image-test || exit
result=$?
if [ $result -ne 0 ]; then
  cd "${CUR}" || exit
  exit $result
fi
echo ""
pwd
yarn set version berry && git add .yarn/release && rm -rf node_modules yarn.lock .yarn/cache && touch yarn.lock && yarn install && yarn up -R
result=$?
if [ $result -ne 0 ]; then
  cd "${CUR}" || exit
  exit $result
fi

cd "${CURRENT}"/codepipeline/adoptium-temurin-jib/infra || exit
result=$?
if [ $result -ne 0 ]; then
  cd "${CUR}" || exit
  exit $result
fi
echo ""
pwd
yarn set version berry && git add .yarn/release && rm -rf node_modules yarn.lock .yarn/cache && touch yarn.lock && yarn install && yarn up -R
result=$?
if [ $result -ne 0 ]; then
  cd "${CUR}" || exit
  exit $result
fi

cd "${CURRENT}"/codepipeline/codebuild-custom-image/java-adopt-base/infra || exit
result=$?
if [ $result -ne 0 ]; then
  cd "${CUR}" || exit
  exit $result
fi
echo ""
pwd
yarn set version berry && git add .yarn/release && rm -rf node_modules yarn.lock .yarn/cache && touch yarn.lock && yarn install && yarn up -R
result=$?
if [ $result -ne 0 ]; then
  cd "${CUR}" || exit
  exit $result
fi

cd "${CURRENT}"/codepipeline/codebuild-github-tag/infra || exit
result=$?
if [ $result -ne 0 ]; then
  cd "${CUR}" || exit
  exit $result
fi
echo ""
pwd
yarn set version berry && git add .yarn/release && rm -rf node_modules yarn.lock .yarn/cache && touch yarn.lock && yarn install && yarn up -R
result=$?
if [ $result -ne 0 ]; then
  cd "${CUR}" || exit
  exit $result
fi

cd "${CURRENT}"/codepipeline/docker-build/infra || exit
result=$?
if [ $result -ne 0 ]; then
  cd "${CUR}" || exit
  exit $result
fi
echo ""
pwd
yarn set version berry && git add .yarn/release && rm -rf node_modules yarn.lock .yarn/cache && touch yarn.lock && yarn install && yarn up -R
result=$?
if [ $result -ne 0 ]; then
  cd "${CUR}" || exit
  exit $result
fi

cd "${CURRENT}"/codepipeline/vulnerability-scan/infra || exit
result=$?
if [ $result -ne 0 ]; then
  cd "${CUR}" || exit
  exit $result
fi
echo ""
pwd
yarn set version berry && git add .yarn/release && rm -rf node_modules yarn.lock .yarn/cache && touch yarn.lock && yarn install && yarn up -R
result=$?
if [ $result -ne 0 ]; then
  cd "${CUR}" || exit
  exit $result
fi

# cd "${CURRENT}"/cognito/authorizer-example/api || exit
# result=$?
# if [ $result -ne 0 ]; then
#   cd "${CUR}" || exit
#   exit $result
# fi
# echo ""
# pwd
# rm -rf node_modules yarn.lock .yarn/cache && touch yarn.lock && yarn install && yarn up -R
# result=$?
# if [ $result -ne 0 ]; then
#   cd "${CUR}" || exit
#   exit $result
# fi

cd "${CURRENT}"/cognito/authorizer-example/front || exit
result=$?
if [ $result -ne 0 ]; then
  cd "${CUR}" || exit
  exit $result
fi
echo ""
pwd
yarn set version berry && git add .yarn/release && rm -rf node_modules yarn.lock .yarn/cache && touch yarn.lock && yarn install && yarn up -R
result=$?
if [ $result -ne 0 ]; then
  cd "${CUR}" || exit
  exit $result
fi

cd "${CURRENT}"/cognito/cognito-admin/app || exit
result=$?
if [ $result -ne 0 ]; then
  cd "${CUR}" || exit
  exit $result
fi
echo ""
pwd
yarn set version berry && git add .yarn/release && rm -rf node_modules yarn.lock .yarn/cache && touch yarn.lock && yarn install && yarn up -R
result=$?
if [ $result -ne 0 ]; then
  cd "${CUR}" || exit
  exit $result
fi

cd "${CURRENT}"/cognito/cognito-admin/infra || exit
result=$?
if [ $result -ne 0 ]; then
  cd "${CUR}" || exit
  exit $result
fi
echo ""
pwd
yarn set version berry && git add .yarn/release && rm -rf node_modules yarn.lock .yarn/cache && touch yarn.lock && yarn install && yarn up -R
result=$?
if [ $result -ne 0 ]; then
  cd "${CUR}" || exit
  exit $result
fi

cd "${CURRENT}"/cognito/cognito-saml-next-js/webapp || exit
result=$?
if [ $result -ne 0 ]; then
  cd "${CUR}" || exit
  exit $result
fi
echo ""
pwd
yarn set version berry && git add .yarn/release && rm -rf node_modules yarn.lock .yarn/cache && touch yarn.lock && yarn install && yarn up -R
result=$?
if [ $result -ne 0 ]; then
  cd "${CUR}" || exit
  exit $result
fi

cd "${CURRENT}"/cognito/cognito-saml-next-js/infra || exit
result=$?
if [ $result -ne 0 ]; then
  cd "${CUR}" || exit
  exit $result
fi
echo ""
pwd
yarn set version berry && git add .yarn/release && rm -rf node_modules yarn.lock .yarn/cache && touch yarn.lock && yarn install && yarn up -R
result=$?
if [ $result -ne 0 ]; then
  cd "${CUR}" || exit
  exit $result
fi

cd "${CURRENT}"/cognito/tiny-device-flow || exit
result=$?
if [ $result -ne 0 ]; then
  cd "${CUR}" || exit
  exit $result
fi
echo ""
pwd
yarn set version berry && git add .yarn/release && rm -rf node_modules yarn.lock .yarn/cache && touch yarn.lock && yarn install && yarn up -R
result=$?
if [ $result -ne 0 ]; then
  cd "${CUR}" || exit
  exit $result
fi

cd "${CURRENT}"/cognito/tiny-device-flow/pages || exit
result=$?
if [ $result -ne 0 ]; then
  cd "${CUR}" || exit
  exit $result
fi
echo ""
pwd
yarn set version berry && git add .yarn/release && rm -rf node_modules yarn.lock .yarn/cache && touch yarn.lock && yarn install && yarn up -R
result=$?
if [ $result -ne 0 ]; then
  cd "${CUR}" || exit
  exit $result
fi

cd "${CURRENT}"/cognito/trigger-examples || exit
result=$?
if [ $result -ne 0 ]; then
  cd "${CUR}" || exit
  exit $result
fi
echo ""
pwd
yarn set version berry && git add .yarn/release && rm -rf node_modules yarn.lock .yarn/cache && touch yarn.lock && yarn install && yarn up -R
result=$?
if [ $result -ne 0 ]; then
  cd "${CUR}" || exit
  exit $result
fi

cd "${CURRENT}"/infra/ecs || exit
result=$?
if [ $result -ne 0 ]; then
  cd "${CUR}" || exit
  exit $result
fi
echo ""
pwd
yarn set version berry && git add .yarn/release && rm -rf node_modules yarn.lock .yarn/cache && touch yarn.lock && yarn install && yarn up -R
result=$?
if [ $result -ne 0 ]; then
  cd "${CUR}" || exit
  exit $result
fi

cd "${CURRENT}"/infra/s3 || exit
result=$?
if [ $result -ne 0 ]; then
  cd "${CUR}" || exit
  exit $result
fi
echo ""
pwd
yarn set version berry && git add .yarn/release && rm -rf node_modules yarn.lock .yarn/cache && touch yarn.lock && yarn install && yarn up -R
result=$?
if [ $result -ne 0 ]; then
  cd "${CUR}" || exit
  exit $result
fi

cd "${CURRENT}"/lambda/apollo-server-api-gateway || exit
result=$?
if [ $result -ne 0 ]; then
  cd "${CUR}" || exit
  exit $result
fi
echo ""
pwd
yarn set version berry && git add .yarn/release && rm -rf node_modules yarn.lock .yarn/cache && touch yarn.lock && yarn install && yarn up -R
result=$?
if [ $result -ne 0 ]; then
  cd "${CUR}" || exit
  exit $result
fi

cd "${CURRENT}"/lambda/apollo-server-url || exit
result=$?
if [ $result -ne 0 ]; then
  cd "${CUR}" || exit
  exit $result
fi
echo ""
pwd
yarn set version berry && git add .yarn/release && rm -rf node_modules yarn.lock .yarn/cache && touch yarn.lock && yarn install && yarn up -R
result=$?
if [ $result -ne 0 ]; then
  cd "${CUR}" || exit
  exit $result
fi

cd "${CURRENT}"/lambda/eventbridge-lambda || exit
result=$?
if [ $result -ne 0 ]; then
  cd "${CUR}" || exit
  exit $result
fi
echo ""
pwd
yarn set version berry && git add .yarn/release && rm -rf node_modules yarn.lock .yarn/cache && touch yarn.lock && yarn install && yarn up -R
result=$?
if [ $result -ne 0 ]; then
  cd "${CUR}" || exit
  exit $result
fi

cd "${CURRENT}"/lambda/lambda-examples || exit
result=$?
if [ $result -ne 0 ]; then
  cd "${CUR}" || exit
  exit $result
fi
echo ""
pwd
yarn set version berry && git add .yarn/release && rm -rf node_modules yarn.lock .yarn/cache && touch yarn.lock && yarn install && yarn up -R
result=$?
if [ $result -ne 0 ]; then
  cd "${CUR}" || exit
  exit $result
fi

cd "${CURRENT}"/lambda/lambda-examples/lambda/container/simple || exit
result=$?
if [ $result -ne 0 ]; then
  cd "${CUR}" || exit
  exit $result
fi
echo ""
pwd
yarn set version berry && git add .yarn/release && rm -rf node_modules yarn.lock .yarn/cache && touch yarn.lock && yarn install && yarn up -R
result=$?
if [ $result -ne 0 ]; then
  cd "${CUR}" || exit
  exit $result
fi

cd "${CURRENT}"/lambda/layer/functions/function || exit
result=$?
if [ $result -ne 0 ]; then
  cd "${CUR}" || exit
  exit $result
fi
echo ""
pwd
yarn set version berry && git add .yarn/release && rm -rf node_modules yarn.lock .yarn/cache && touch yarn.lock && yarn install && yarn up -R
result=$?
if [ $result -ne 0 ]; then
  cd "${CUR}" || exit
  exit $result
fi

cd "${CURRENT}"/lambda/layer/functions/function/handler || exit
result=$?
if [ $result -ne 0 ]; then
  cd "${CUR}" || exit
  exit $result
fi
echo ""
pwd
yarn set version berry && git add .yarn/release && rm -rf node_modules yarn.lock .yarn/cache && touch yarn.lock && yarn install && yarn up -R
result=$?
if [ $result -ne 0 ]; then
  cd "${CUR}" || exit
  exit $result
fi

cd "${CURRENT}"/lambda/layer/layer || exit
result=$?
if [ $result -ne 0 ]; then
  cd "${CUR}" || exit
  exit $result
fi
echo ""
pwd
yarn set version berry && git add .yarn/release && rm -rf node_modules yarn.lock .yarn/cache && touch yarn.lock && yarn install && yarn up -R
result=$?
if [ $result -ne 0 ]; then
  cd "${CUR}" || exit
  exit $result
fi

cd "${CURRENT}"/lambda/layer/layer/src/nodejs || exit
result=$?
if [ $result -ne 0 ]; then
  cd "${CUR}" || exit
  exit $result
fi
echo ""
pwd
yarn set version berry && git add .yarn/release && rm -rf node_modules yarn.lock .yarn/cache && touch yarn.lock && yarn install && yarn up -R
result=$?
if [ $result -ne 0 ]; then
  cd "${CUR}" || exit
  exit $result
fi

cd "${CURRENT}"/node-sign-v4 || exit
result=$?
if [ $result -ne 0 ]; then
  cd "${CUR}" || exit
  exit $result
fi
echo ""
pwd
yarn set version berry && git add .yarn/release && rm -rf node_modules yarn.lock .yarn/cache && touch yarn.lock && yarn install && yarn up -R
result=$?
if [ $result -ne 0 ]; then
  cd "${CUR}" || exit
  exit $result
fi

cd "${CURRENT}" || exit
result=$?
if [ $result -ne 0 ]; then
  cd "${CUR}" || exit
  exit $result
fi
git pull --prune && git commit -am "Bumps node modules" && git push
result=$?
if [ $result -ne 0 ]; then
  cd "${CUR}" || exit
  exit $result
fi

cd "${CUR}" || exit
