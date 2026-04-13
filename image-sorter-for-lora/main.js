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
  generateInitStatus
} = require('./isfl/status')

const createWindow = () => {
  const win = new BrowserWindow({
    width: 1200,
    height: 600,
    webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
    },
  });
  let isflStatus = generateInitStatus();
  const updateIsflStatus = (newIsflStatus) => {
    isflStatus = {
      ...isflStatus,
      newIsflStatus
    }
  }
  const updateConfigJsonCurrent = () => {
    console.log(isflStatus.undeterminedDirPath)
    console.log(isflStatus.configJson)
    if (
      (isflStatus.undeterminedDirPath != null) &&
      (!isNaN(isflStatus.undeterminedDirPath.length)) &&
      isflStatus.undeterminedDirPath.length > 0
    ) {
      outputConfig(
        isflStatus.undeterminedDirPath,
        isflStatus.configJson
      )
    }
  }
  const setSelectionIndexOfUI = (indexAny) => {
    const indexInt = parseInt(indexAny)
    if (!isNaN(indexInt)) {
      const escapedDirPath = escapeToHtmlText(isflStatus.undeterminedDirPath)
      let currentImageName = "";
      let imageHtml = "";
      let tagString = "";
      if (0 <= indexInt && indexInt < isflStatus.undeterminedImages.length) {
        isflStatus.selectionIndexOfUI = indexInt;
        const imageBase64 = base64ImgSrc("png", isflStatus.undeterminedImages[indexInt].imageBase64)
        imageHtml = `
          <img src="${imageBase64}" width="512px" />
        `
        currentImageName = escapeToHtmlText(isflStatus.undeterminedImages[indexInt].fileName);
        tagString = escapeToHtmlText(positiveTagsToString(isflStatus.undeterminedImages[indexInt].tagList))
        console.log(tagString)
      }
      const lastImageIndex = isflStatus.undeterminedImages.length - 1;
      let executeScript = `
        document.getElementById('showDirectorySelect').innerText=\`${escapedDirPath}\`;
        document.getElementById('showCurrentImageName').innerText=\`${currentImageName}\`;
        document.getElementById('showCurrentImage').innerHTML=\`${imageHtml}\`;
        document.getElementById('checkingImageIndex').value=\`${indexInt}\`;
        document.getElementById('lastImageIndex').innerHTML=\`${lastImageIndex}\`;
        document.getElementById('checkingImageTags').value=\`${tagString}\`;
      `;
      win.webContents.executeJavaScript(executeScript);
    }
  }
  const reloadTargetSpaceList = () => {
    let targetSpaceInnerHtml = `<p>select copy target directory</p>`
    targetSpaceInnerHtml = "";
    isflStatus.configJson.copyTargetDirectoryResolutionPathList.forEach((targetSpacePath, index) => {
      const escapedPath = escapeToHtmlText(targetSpacePath)
      const targetSpaceButtonAreaHtml = `
        <h3>${escapedPath}</h3>
        <button class="copy-to-here-button" id="copyToHereButton${index}">
          SetTagAndImageToHere
        </button>
        <button class="remove-this-area-button" id="removeThisAreaButton${index}">
          RemoveThisArea
        </button>`;
      targetSpaceInnerHtml = `${targetSpaceInnerHtml}${targetSpaceButtonAreaHtml}`;
    });
    let executeScript = `
      document.getElementById('copyTargetSpace').innerHTML=\`${targetSpaceInnerHtml}\`;
    `;
    isflStatus.configJson.copyTargetDirectoryResolutionPathList.forEach((_value, index) => {
      executeScript = `${executeScript}
        document.getElementById('copyToHereButton${index}').addEventListener('click', async() => {
          const imageTagsString = document.getElementById('checkingImageTags').value;
          const removeTagsString = document.getElementById('sharedRemoveTagsOfImage').value;
          const extraTagsString = document.getElementById('sharedExtraTagsOfImage').value;
          await window.apis.runClickEventCopyToHere(
            ${index},
            imageTagsString,
            removeTagsString,
            extraTagsString
          );
        })
        document.getElementById('removeThisAreaButton${index}').addEventListener('click', async() => {
          await window.apis.runClickRemoveThisArea(${index});
        })`
    })
    win.webContents.executeJavaScript(executeScript);
  }
  ipcMain.handle('click-event-ds', async (_e, _arg) => {
    dialog.showOpenDialog({title: '', properties: ['openDirectory', 'showHiddenFiles']}).then(result => {
      if(!result.canceled) {
        isflStatus.undeterminedDirPath = result.filePaths[0];
        isflStatus.configJson = ensureTargetDirectory(isflStatus.undeterminedDirPath);
        // TODO: reflect remove tag
        // TODO: reflect extra tag
        // TODO: reflect index
        reloadTargetSpaceList();
        const fileNames = fs.readdirSync(isflStatus.undeterminedDirPath);
        fileNames.sort();
        isflStatus.undeterminedImages = []
        fileNames.forEach((fileName) => {
          const filePath = `${isflStatus.undeterminedDirPath}${path.sep}${fileName}`
          if (fs.statSync(filePath).isFile()) {
            const imageBuffer = fs.readFileSync(filePath)
            const imageBase64 = imageBuffer.toString('base64')
            const pngInfo = bufferToPngInfo(imageBuffer)
            if (pngInfo !==null) {
              const tagList = pngInfoToPositiveTags(pngInfo)
              isflStatus.undeterminedImages.push({
                dirPath: isflStatus.undeterminedDirPath,
                fileName,
                filePath,
                imageBase64,
                pngInfo,
                tagList
              })
            }
          }
        })
        setSelectionIndexOfUI(0)
      }
    })
  });
  ipcMain.handle('click-event-act', async (_e, _arg) => {
    dialog.showOpenDialog({title: '', properties: ['openDirectory', 'showHiddenFiles', 'createDirectory']}).then(result => {
      if(!result.canceled) {
        isflStatus.configJson.copyTargetDirectoryResolutionPathList.push(
          result.filePaths[0]
        );
        reloadTargetSpaceList();
      }
    });
  });
  ipcMain.handle('click-event-cth', async (
    _e,
    targetDirectoryIndex,
    imageTagsString,
    removeTagsString,
    extraTagsString
  ) => {
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
    console.log(imageTags)
    console.log(removeTags)
    console.log(extraTags)
    fs.writeFileSync(targetTagTextPath, tagText, { encoding: "utf8"});
    setSelectionIndexOfUI(isflStatus.selectionIndexOfUI+1);

    isflStatus.configJson.sharedRemoveTagsList = removeTags
    isflStatus.configJson.sharedExtraTagsList = extraTags
    updateConfigJsonCurrent();
  })
  ipcMain.handle('sync-value-to-status', async (_e, args) => {
    const removeTagsString = args["removeTagsString"];
    if(removeTagsString != null) {
      const extraTags = tagListStringToTagList(extraTagsString);
      isflStatus.configJson.sharedRemoveTagsList = removeTags;
    }
    const extraTagsString = args["extraTagsString"];
    if(extraTagsString != null) {
      const removeTags = tagListStringToTagList(removeTagsString);
      isflStatus.configJson.sharedExtraTagsList = extraTags;
    }
  })
  ipcMain.handle('click-event-rta', async (_e, index) => {
    isflStatus.configJson.copyTargetDirectoryResolutionPathList.splice(index, 1)
    reloadTargetSpaceList();
    updateConfigJsonCurrent();
  })
  ipcMain.handle('input-event-cii', async (_e, args) => {
    setSelectionIndexOfUI(args.indexString)
  })
  ipcMain.handle('click-event-sit', async (_e, args) => {
    updateConfigJsonCurrent();
  })
  ipcMain.handle('update-isfl-status', async (_e, newIsflStatus) => {
    updateIsflStatus(newIsflStatus);
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
