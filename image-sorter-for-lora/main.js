const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('path')
const fs = require('fs')
const {
  bufferToPngInfo,
  pngInfoToPositiveTags,
  positiveTagsToString,
  tagListToTagListString,
  tagListStringToTagList,
  removeTagList
} = require('./util/readpng')
const { escapeToHtmlText } = require('./util/escape')
const { base64ImgSrc } = require('./util/imageSrc')
const {
  ensureTargetDirectory,
  outputConfig
} = require('./isfl/editdir')
const {
  generateInitStatus,
  overwriteIsflStatus,
  initUndeterminedImages,
  loadUndeterminedImage
} = require('./isfl/status')

const createWindow = () => {
  const win = new BrowserWindow({
    width: 1200,
    height: 700,
    webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
    },
  });
  // 現在のmain処理(ファイルアクセスが可能なjavascript側の処理)において認識されている画面状態を管理するための変数。
  // この内容を変更した後、render側(html操作が可能なjavascript側の処理)にその内容を反映するにはapplyIsflStatusToHtmlをコールする必要がある。
  // 逆に、画面側の実際の値を取得したい場合にはfetchIsflStatusFromHtmlをコールし、そのコールバック内で参照する必要がある。
  let isflStatus = generateInitStatus();

  // isflStatusをrender側と送受信する際、その送受信に使うラッパーをniseという名前で呼ぶ。
  // 名前の由来はこの関数であり、isflStatusとコールバック時に何を行うかと行う内容に合わせた引数を格納したjsonStringが格納されている。
  // rendererから帰って来るniseには現在最新の入力値がcurrentValuesに格納されて帰ってくる。
  // 形式はisfl/htmllib/getCurrentInputValues.jsのgetCurrentInputValuesを参照。
  const newIsflStatusEvent = (callbackJsonString=`{
      "callbackType": "overwrite",
      "args": {}
    }`
  ) => {
    const isflStatusEvent = {
      isflStatus,
      callbackJsonString,
      // currentValues: undefined
    }
    return isflStatusEvent
  }
  // isflStatusEventをfetchあるいはapplyする関数(後述する下記の2つ)をコールしたあと、rendererからコールされるapply後の処理を行う関数。
  // 引数はnise型なのでそこでデータのやり取りも行う。
  // コールしてから取得あるいは反映されるまでは非同期なので、この関数をコールすることで順序を保証する。
  // 呼び出し先はこの関数で固定だが、呼び出し元によって期待される後続の処理が変わるのでnise.callbackJsonStringの内容をパースして条件分岐することによって後続の処理を決定している。
  // callbackTypeの種類によって下記の処理が行われる。
  // overwrite: デフォルトだとこのcallbackTypeとなる。設定ファイルに現在のisflStatusを上書きする。
  // なお、callbackTypeの先頭にFETCHED_と付与されていればisflStatusは引数のniseに更新される。
  // 該当関数(下記2つをコールしている関数も含む)
  // applyIsflStatusToHtml
  // fetchIsflStatusFromHtml
  const niseCallback = (nise) => {
    const callbackJson = JSON.parse(nise.callbackJsonString);
    // if callbackName's prefix is fetch, then update isflStatus.
    const prefixIsFetchRegex = /FETCHED_*/;
    if(callbackJson["callbackType"].match(prefixIsFetchRegex)) {
      isflStatus = nise.isflStatus
    }
    if(callbackJson.callbackType === "overwrite" || callbackJson.callbackType === "FETCHED_overwrite") {
      isflStatus = {
        ...isflStatus,
        ...nise.isflStatus
      }
      overwriteIsflStatus(isflStatus);
    } else if( callbackJson.callbackType === "setSelectionIndexOfUI") {
      if(isNaN(latestInputIndex) || (latestInputIndex === isflStatus.selectionIndexOfUI)) {
        finallyFunction();
      } else {
        updateToCurrentIndex(latestInputIndex);
        const nise = newIsflStatusEvent(`{
          "callbackType": "setSelectionIndexOfUI",
          "args": {}
        }`);
        applyIsflStatusToHtml(nise);
      }
    }
  }
  // 現状のHTMLの入力内容に合わせて後続の処理を行うための関数。引数となるniseは現在main側の処理で使用しているisflStatusを格納したniseを指定する。
  // 引数のnise.callbackJsonStringによってコールバック処理が行われる。
  // コールバック処理がどう行われるかの詳細はniseCallback関数側のコメントを参照。
  const fetchIsflStatusFromHtml = (nise) => {
    console.log("fire fetch")
    win.webContents.send(
      'fetch-isfl-status-from-current-input', nise)
  }
  // main側のisflStatusをrender側に適用する関数。引数となるniseは現在main側の処理で使用しているisflStatusを格納したniseを指定する。
  // 引数のnise.callbackJsonStringによってコールバック処理が行われる。
  // コールバック処理がどう行われるかの詳細はniseCallback関数側のコメントを参照。
  const applyIsflStatusToHtml = (nise) => {
    console.log("fire apply")
    win.webContents.send('apply-isfl-status-to-current-input', nise)
  }
  // 画像のインデックスを変更する関数。
  // 画面側から変更されたときこのイベントがコールされるが、順序が保証されない。(画面側で上ボタンを2回クリックしたとき、このイベントが2回コールされるが、コールされたイベントのうち画面の現状と比較した際の一つ前の状態が最後に終了したら画面状態とmain側の反映にズレが生じる。なのでmain側にisProcessingとlatestInputIndexを保持して下記の処理を行う。
  // 0 関数の外側にlatestInputIndexとisProcessingを定義する
  // 1 画面からコールされた際latestInputIndexを更新(number型かつインデックスの範囲内の場合に限る)
  // 2 isProcessingがtrueならここで処理を終える(ここでスルーはされるが、あとで再実行されるか確認する)
  // 3 インデックスに応じて入力内容のisflStatusを更新(ここで重い処理が走るので、その間にユーザーの入力によって1がコールされる可能性がある)
  // 4 latestInputIndexとインデックスを比較し、latestInputIndexに新しい値が入れられていた場合もう一度isflStatusの更新処理を行う処理を繰り返す(while文の条件はlatestInputIndexがisflに格納されているインデックスと不一致)
  // 5 finally句でisProcessingをfalse、latestInputIndexをnullに変更して解除
  // main側で画像のインデックスを変えるための関数。
  // 引数として指定された画像のインデックスが正常であればisflStatusにインデックスを反映する。
  // インデックスを反映する際、画像の変更とtagStringの変更のための画像データ読み込み、解析処理を行う。
  // 正常でなければスルーする。
  // 画面に反映するのはこの関数の後に最後にapplyIsflStatusToHtmlをコールしてから。
  // なのでこれをコールした場合そのあと他にisflStatusを変更する処理がないならば必ずapplyIsflStatusToHtmlをコールする。
  // ただし、この関数が複数回コールされる箇所を前提としているなら、複数回のapplyIsflStatusToHtmlがコールされてしまうので、その予防のためにfinnaly句でhtmlを更新する処理を入れることができる。
  // それを望む場合、args.applyToHtmlをtrueにしてこの関数をコールすること。
  // 引数の型
  // args {
  //   indexAny: any; // 更新後のindex。string型を渡すことが想定されるためanyを想定し、中でparseIntする。パースした結果範囲外のインデックスあるいはNaNだった場合何もしない。
  //   applyToHtml: boolean | undefiend; // この関数の最後にhtmlへの反映を行う。overwriteはしない。ただし、コールバックの際に他の入力欄をisflStatus.configJsonに反映する
  // }
  let latestInputIndex = null;
  let isProcessing = false;
  const finallyFunction = () => {
    isProcessing = false;
    latestInputIndex = null;
  }
  const setSelectionIndexOfUI = (args) => {
    let indexInt = parseInt(args.indexAny)
    let currentIndex = 0;
    if (isNaN(indexInt)) {
      // indexIntがintではない場合latestInputIndexを更新しない
      currentIndex = -1; // その意図を表すためにcurrentIndexを-1にする。
    } else {
      if (indexInt <= 0) {
        currentIndex = 0;
      } else if(indexInt > isflStatus.undeterminedImages.length) {
        currentIndex = isflStatus.undeterminedImages.length - 1;
      } else {
        currentIndex = indexInt;
      }
      latestInputIndex = currentIndex;
    }
    if(isProcessing != true && (currentIndex >=0)) {
      try {
        isProcessing = true;
        updateToCurrentIndex(currentIndex);
        if (args.applyToHtml != true) {
          while (isflStatus.selectionIndexOfUI != latestInputIndex) {
            currentIndex = latestInputIndex;
            updateToCurrentIndex(currentIndex);
          }
        } // applyToHtmlがtrueの場合コールバック内で再確認処理とfinallyFunctionのコールを行う。
      } finally {
        // 通常、画面に反映するのはこの関数の後に行うのでここでは画面への反映処理をコールしない
        // ただし引数で指定されている場合には反映処理をコールする
        if (args.applyToHtml === true) {
          // finallyFunctionのコールはコールバック内で行う
          const nise = newIsflStatusEvent(`{
            "callbackType": "setSelectionIndexOfUI",
            "args": {}
          }`);
          applyIsflStatusToHtml(nise);
        } else {
          finallyFunction();
        }
      }
    } // 別のコールスレッドが実行中ならその中でlatestInputIndexを再度使用するので、このスレッドでは処理を終える
  }
  // isflStatus.selectionIndexOfUIとそれに伴うパラメータを実際に変更する処理
  // この処理の後に値が古かった場合もう一度この関数を実行する。
  const updateToCurrentIndex = (currentIndex) => {
    const escapedDirPath = escapeToHtmlText(isflStatus.undeterminedDirPath)
    let currentImageName = "";
    let imageHtml = "";
    const fileName = isflStatus.undeterminedImages[currentIndex].fileName
    const undeterminedImage = loadUndeterminedImage(
      isflStatus.undeterminedDirPath,
      fileName
    );
    isflStatus.undeterminedImages[currentIndex] = undeterminedImage
    const imageBase64 = base64ImgSrc("png", isflStatus.undeterminedImages[currentIndex].imageBase64)
    isflStatus.showingImageBase64 = imageBase64;
    isflStatus.selectionIndexOfUI = currentIndex;
    // タグ入力欄を同期するためにtagStringを更新する。
    // ただしremoveとExtraはファイルの読み出しの際に変更されないし、現状の入力内容から変更しないために、この関数では更新しない。
    // 更新するのはtagStringのみ。
    isflStatus.imageTagsString = escapeToHtmlText(tagListToTagListString(isflStatus.undeterminedImages[currentIndex].tagList))

    isflStatus.configJson = {
      ...isflStatus.configJson,
      currentShowingImageIndex: currentIndex
    }
  }
  // directory select event
  ipcMain.handle('click-event-ds', async (_e, _arg) => {
    dialog.showOpenDialog({title: '', properties: ['openDirectory', 'showHiddenFiles']}).then(result => {
      if(!result.canceled) {
        // load dir config
        isflStatus.undeterminedDirPath = result.filePaths[0];
        const fileNames = fs.readdirSync(isflStatus.undeterminedDirPath);
        fileNames.sort();
        isflStatus.configJson = ensureTargetDirectory(isflStatus.undeterminedDirPath);
        // set config values
        const removeTagStringRaw =  tagListToTagListString(
          isflStatus.configJson.sharedRemoveTagsList
        );
        isflStatus.removeTagsString = escapeToHtmlText(removeTagStringRaw);
        isflStatus.extraTagsString = escapeToHtmlText(tagListToTagListString(
          isflStatus.configJson.sharedExtraTagsList
        ));
        isflStatus.undeterminedImages = initUndeterminedImages(isflStatus.undeterminedDirPath)
        // load current image
        setSelectionIndexOfUI({ indexAny: isflStatus.configJson.currentShowingImageIndex});
        const nise = newIsflStatusEvent(`{
          "callbackType": "none",
          "args": {}
        }`)
        // apply to renderer html
        applyIsflStatusToHtml(nise)
      }
    })
  });
  // add copy target and overwrite config
  ipcMain.handle('click-event-act', async (_e, currentValues) => {
    // TODO: applyを実行する前に、現在の入力内容を引数からisflStatusに必要がある
    dialog.showOpenDialog({title: '', properties: ['openDirectory', 'showHiddenFiles', 'createDirectory']}).then(result => {
      if(!result.canceled) {
        isflStatus.configJson.copyTargetDirectoryResolutionPathList.push(
          result.filePaths[0]
        );
        const nise = newIsflStatusEvent();
        applyIsflStatusToHtml(nise);
      }
    });
  });
  // copy to here button
  // overwrite config and image move
  ipcMain.handle('click-event-cth', async (
    _e,
    targetDirectoryIndex,
    currentValues
  ) => {
    const {
      imageTagsString,
      removeTagsString,
      extraTagsString
    } = currentValues
    // TODO: applyを実行する前に、現在の入力内容をisflStatusに反映する必要がある
    const selectionImage = isflStatus.undeterminedImages[isflStatus.selectionIndexOfUI];
    const targetDirectoryPath = isflStatus.configJson.copyTargetDirectoryResolutionPathList[targetDirectoryIndex];
    const targetImageFilePath = path.join(targetDirectoryPath, selectionImage.fileName);
    const targetTagTextPath = `${targetImageFilePath.substring(0, targetImageFilePath.lastIndexOf("."))}.txt`;
    fs.copyFileSync(selectionImage.filePath, targetImageFilePath);
    const imageTags = tagListStringToTagList(imageTagsString);
    const removeTags = tagListStringToTagList(removeTagsString);
    const extraTags = tagListStringToTagList(extraTagsString);
    let resultTags = removeTagList(imageTags, removeTags)
    resultTags = resultTags.concat(extraTags)
    const tagText = tagListToTagListString(resultTags);
    fs.writeFileSync(targetTagTextPath, tagText, { encoding: "utf8"});
    setSelectionIndexOfUI({indexAny: isflStatus.selectionIndexOfUI+1});

    isflStatus.configJson.sharedRemoveTagsList = removeTags;
    isflStatus.configJson.sharedExtraTagsList = extraTags;
    isflStatus.configJson.currentShowingImageIndex = isflStatus.selectionIndexOfUI;
    outputConfig(
      isflStatus.undeterminedDirPath,
      isflStatus.configJson
    );
    const nise = newIsflStatusEvent();
    applyIsflStatusToHtml(nise)
  })
  ipcMain.handle('click-event-rta', async (_e, index, currentValues) => {
    // TODO: applyを実行する前に、現在の入力内容をisflStatusに反映する必要がある
    isflStatus.configJson.copyTargetDirectoryResolutionPathList.splice(index, 1)
    const nise = newIsflStatusEvent();
    applyIsflStatusToHtml(nise)
  })
  ipcMain.handle('input-event-cii', async (_e, args) => {
    // TODO: applyを実行する前に、現在の入力内容をargs.currentValuesから反映する必要がある
    const newArgs = {
      indexAny: args.indexString,
      applyToHtml: true
    }
    setSelectionIndexOfUI(newArgs)
  })
  ipcMain.handle('click-event-sit', async (_e, args) => {
    // htmlからfetchしてisflStatusに反映し、configJsonに書き込みを行う
    const nise = newIsflStatusEvent(`{
      "callbackType": "FETCHED_overwrite",
      "args": {}
    }`)
    fetchIsflStatusFromHtml(nise)
  })
  ipcMain.handle('nise-callback', async (_e, nise) => {
    niseCallback(nise);
  })

  ipcMain.on('close', () => {
    app.quit();
  });

  win.loadFile('index.html');

  // win.webContents.openDevTools();
};

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
if (require('electron-squirrel-startup')) app.quit();

