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

const createWindow = () => {
  const win = new BrowserWindow({
    width: 1200,
    height: 600,
    webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
    },
  });
  let selectionIndexOfUI = 0;
  let undeterminedDirPath = "";
  let undeterminedImages = [];
  let targetSpaceList = [];
  const setSelectionIndexOfUI = (indexAny) => {
    const indexInt = parseInt(indexAny)
    if (!isNaN(indexInt)) {
      const escapedDirPath = escapeToHtmlText(undeterminedDirPath)
      let currentImageName = "";
      let imageHtml = "";
      let tagString = "";
      if (0 <= indexInt && indexInt < undeterminedImages.length) {
        selectionIndexOfUI = indexInt;
        const imageBase64 = base64ImgSrc("png", undeterminedImages[indexInt].imageBase64)
        imageHtml = `
          <img src="${imageBase64}" width="512px" />
        `
        currentImageName = escapeToHtmlText(undeterminedImages[indexInt].fileName);
        tagString = escapeToHtmlText(positiveTagsToString(undeterminedImages[indexInt].tagList))
        console.log(tagString)
      }
      const lastImageIndex = undeterminedImages.length - 1;
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
    targetSpaceList.forEach((targetSpacePath, index) => {
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
    targetSpaceList.forEach((_value, index) => {
      executeScript = `${executeScript}
        document.getElementById('copyToHereButton${index}').addEventListener('click', async() => {
          const imageTagsString = document.getElementById('checkingImageTags').value;
          const removeTagsString = document.getElementById('removeImageTags').value;
          await window.apis.runClickEventCopyToHere(${index}, imageTagsString, removeTagsString);
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
        undeterminedDirPath = result.filePaths[0];
        const fileNames = fs.readdirSync(undeterminedDirPath);
        fileNames.sort();
        undeterminedImages = []
        fileNames.forEach((fileName) => {
          const filePath = `${undeterminedDirPath}${path.sep}${fileName}`
          if (fs.statSync(filePath).isFile()) {
            const imageBuffer = fs.readFileSync(filePath)
            const imageBase64 = imageBuffer.toString('base64')
            const pngInfo = bufferToPngInfo(imageBuffer)
            if (pngInfo !==null) {
              const tagList = pngInfoToPositiveTags(pngInfo)
              undeterminedImages.push({
                dirPath: undeterminedDirPath,
                fileName,
                filePath,
                imageBase64,
                pngInfo,
                tagList
              })
            }
          }
        })
        console.log("undeterminedimages", undeterminedImages)
        setSelectionIndexOfUI(0)
      }
    })
  });
  ipcMain.handle('click-event-act', async (_e, _arg) => {
    dialog.showOpenDialog({title: '', properties: ['openDirectory', 'showHiddenFiles', 'createDirectory']}).then(result => {
      if(!result.canceled) {
        targetSpaceList.push(result.filePaths[0]);
        reloadTargetSpaceList();
      }
    });
  });
  ipcMain.handle('click-event-cth', async (
    _e,
    targetDirectoryIndex,
    imageTagsString,
    removeTagsString
  ) => {
    const selectionImage = undeterminedImages[selectionIndexOfUI];
    const targetDirectoryPath = targetSpaceList[targetDirectoryIndex];
    const targetImageFilePath = path.join(targetDirectoryPath, selectionImage.fileName);
    const targetTagTextPath = `${targetImageFilePath.substring(0, targetImageFilePath.lastIndexOf("."))}.txt`;
    fs.copyFileSync(selectionImage.filePath, targetImageFilePath);
    const imageTags = tagListStringToTagList(imageTagsString);
    const removeTags = tagListStringToTagList(removeTagsString);
    const resultTags = removeTagList(imageTags, removeTags)
    const tagText = tagListToTagListString(resultTags);
    fs.writeFileSync(targetTagTextPath, tagText, { encoding: "utf8"});
    setSelectionIndexOfUI(selectionIndexOfUI+1);
  })
  ipcMain.handle('click-event-rta', async (_e, index) => {
    targetSpaceList.splice(index, 1)
    reloadTargetSpaceList();
  })
  ipcMain.handle('input-event-cii', async (_e, args) => {
    setSelectionIndexOfUI(args.indexString)
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
