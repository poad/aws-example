# Cognito UserPool Admin UI

## 仕組み

- ユーザープール「AdminUsers」のユーザーを使用し、ユーザープール「EndUsers」のユーザー管理を行う
- ユーザープール「EndUsers」の 外部 IdP として、ユーザープール「AdminUsers」を OIDC プロバイダーとして登録する
- ユーザープール「AdminUsers」のユーザーは、AWSコンソールまたはAWS CLIから作成する
- ユーザープール「AdminUsers」のユーザーは、ユーザープール「EndUsers」にも登録される
  - ユーザープール「AdminUsers」の Post Authentication イベントトリガー内で、AdminCeateUser 及び AdminLinkProviderForUser API を使用して、ユーザープール「EndUsers」へユーザーの作成及びユーザープール間の紐付けを行う
  - ユーザープール「EndUsers」側にいきなりログインしようとした場合は ユーザープール「EndUsers」の Pre SetUp イベントトリガーにて弾く
