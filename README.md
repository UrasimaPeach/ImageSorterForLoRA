# ImageSorterForLoRA

StableDuffusion WebUI(AUTOMATIC1111)を用いて自動生成した画像ファイルが格納されたフォルダを対象に、LoRA用の画像として人間の手で破綻していない画像のみを指定のディレクトリのコピー(仕分け)するためのプログラムです。
タグ用のテキストファイルはコピーボタンを押した時に、png内に自動で書き込まれるプロンプトから生成します。

# 使用方法

[TODO]

# 以下技術者(開発者)向け

## Requirements

docker, sh

## 開発環境

このプロダクトではdockerを使って開発と動作確認が行われます。
リポジトリのルートディレクトリは開発環境内でマウントしているので、下記のコマンドでユーザーグループに追加したあと再起動することでユーザーにdockerコンテナへの実行権限を与えてください。

```
sudo groupadd docker
sudo usermod -aG docker `whoami`;grep docker /etc/group
```

devContainer等使うほうが行儀がいいと思いますが、管理人はVSCodeよりもvimを使いたいので開発環境内コマンドでvimを使って開発を進めています。
VSCodeを使いたい人はRemote Desktopなどを使うと良いでしょう。(その場合は追加のymlファイルなどPRくださればレビューします。)

## 実行方法

1. 「コマンド」の「コンテナのビルド」
2. 「コマンド」の「コンテナの実行」
3. 「コマンド」の「コンテナへのアクセス」

(「コマンド」の「コンテナのビルド」は初回だけでOKです。)

## コマンド

### コンテナのビルド

以下のコマンドでコンテナを立ち上げることでユーザー用の実行環境が出来上がります。

```
echo "USERNAME=`whoami`" > ./.build_env;echo "UID=`id -u`" >> ./.build_env;echo "GID=`id -g`" >> ./.build_env
cat ./.build_env >> .env
docker compose --env-file ./.build_env build
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
chmod 700 ./scripts/init_in_container.sh
./scripts/init_in_container.sh
cd image_sorter_for_lora
npm install
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
cd ImageSorterForLoRA
npm install -g yarn # 基本的にnpmを使う想定のコンテナだが、ライセンスを出力するために一時的にyarnをコンテナにインストール
yarn licenses generate-disclaimer > public/THIRD_PARTY_LICENSES.txt
```

#### 動作確認

動作確認のコンテナ内にはフォントがないので、日本語を含むデータを使って動作を確認したい場合はmakeを行ってください。
また、Ubuntu上でこれを実行する場合、実行する前にUbuntu側で`xhost +local:`を実行して下さい。
(WSL上ではnpm installしたらそのまま以下のコマンドを実行してください。)

```
npm run start
```

#### アプリをmakeして実行ファイルを出力する

Windows上では、以下のコマンドを実行したあと生成される`image-sorter-for-lora/out/make/squirrel.windows/x64/*.exe`を使用する。
Linux上では、以下のコマンドを実行したあと生成される`image-soter-for-lora/out/make/dev/x64/*.deb`をインストールする。

```
npm run make
```

# LICENSE

MIT License

# Author

UrasimaPeach
