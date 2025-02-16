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
if ! (pnpm install -r && pnpm up -r && pnpm -r build); then
  cd "${CUR}" || exit
  exit 1
fi

cd "${CURRENT}" || exit
result=$?
if [ $result -ne 0 ]; then
  cd "${CUR}" || exit
  exit $result
fi
if ! (git pull --prune && git commit -am "Bumps node modules" && git push); then
  cd "${CUR}" || exit
  exit 1
fi

cd "${CUR}" || exit
