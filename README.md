# 開発環境テンプレート

概要

# 使用方法


# 以下技術者(開発者)向け

## Requirements

docker, sh

## 開発環境

このプロダクトではdockerを使って開発と動作確認が行われます。
リポジトリのルートディレクトリは開発環境内でマウントしているので、root権限で実行すれば通常通りソースコードの編集などの作業が可能です。
devContainer等使うほうが行儀がいいと思いますが、管理人はVSCodeよりもvimを使いたいので開発環境内コマンドでvimを使って開発を進めています。
VSCodeを使いたい人はRemote Desktopなどを使うと良いでしょう。(その場合は追加のymlファイルなどPRくださればレビューします。)

## 実行方法

1. 「コマンド」の「コンテナのビルド」
2. 「コマンド」の「コンテナの実行」
3. 「コマンド」の「コンテナへのアクセス」

(「コマンド」の「コンテナのビルド」は初回だけでOKです。)

## コマンド

### コンテナのビルド

以下のコマンドでコンテナを立ち上げることで実行環境が出来上がります。

```
docker compoose build
```

### コンテナの実行

以下のコマンドで開発環境兼実行環境をデーモンとして実行します。

```
docker compose up -d
```

### コンテナへのアクセス

以下のコマンドで開発環境のDockerにアクセスする。

```
./scripts/ad.sh
```

最初にコンテナにアクセスした時、コンテナ内でvimの設定ファイルの初期化を行う。
また、npmの設定もコピーする。

```
./scripts/init_in_container.sh
PROJECT_NAME=hoge # 任意のプロジェクト名を指定する
mkdir ${PROJECT_NAME}
cp package.json.example ${PROJECT_NAME}/package.json 
cp forge.config.js.example ${PROJECT_NAME}/forge.config.js
cd ${PROJECT_NAME}
npm install
echo 'console.log("hello world");' > main.js
```

### コンテナの終了

以下のコマンドで開発環境兼実行環境のデーモンを落とします。

```
docker-compose down
```

### 開発環境内コマンド

#### 開発環境内でvimを使う。

```
vim src/example.tsx
```

#### 依存ライブラリのライセンスを出力する

```
cd urasima-peach-girhub-page
npm install -g yarn # 基本的にnpmを使う想定のコンテナだが、ライセンスを出力するために一時的にyarnをコンテナにインストール
yarn licenses generate-disclaimer > public/THIRD_PARTY_LICENSES.txt
```

#### Electron製のアプリの動作確認

動作確認のコンテナ内にはフォントがないので、日本語を含むデータを確認したい場合はビルドを行ってください。

```
npm run start
```

#### Electron製アプリをmakeして実行ファイルを出力する

```
npm run make
```

#### Electron製アプリをpackageして配布形式にする

```
npm run package
```

# LISCENCE

MIT License

# Author

UrasimaPeach
