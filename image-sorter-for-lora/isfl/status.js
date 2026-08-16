import fs from 'node:fs'
import path from 'node:path'
import {
  generateInitConfig,
  outputConfig
} from './editdir.js'
import {
  bufferToPngInfo,
  pngInfoToPositiveTags,
} from '../util/readpng.js'

export const generateInitStatus = () => {
  const initConfig = generateInitConfig();
  const result = {
    selectionIndexOfUI: 0, // inputField
    undeterminedDirPath: "", // loadedImages
    undeterminedImages: [], // loadedImages
    configJson: initConfig, // saveTextJson
    imageTagsString: "", // inputField
    removeTagsString: "", // inputField
    extraTagsString: ""  // inputField
  };
  // undeterminedImages {
  //   dirPath: string, // フォルダを指定した際に格納。main.jsではここを参照する。configJsonには記録しない。
  //   fileName: string, // フォルダを指定した際に格納。main.jsではここを参照する。configJsonには記録しない。
  //   filePath: string, // フォルダを指定した際に格納。main.jsではここを参照する。configJsonには記録しない。
  //   imageBase64: string, // フォルダを指定した際には格納しない。なのでロードされてない可能性があるので、使うときには直前にloadUndeterminedImageでロードする
  //   pngInfo: string, // フォルダを指定した際には格納しない。なのでロードされてない可能性があるので、使うときには直前にloadUndeterminedImageでロードする
  //   tagList: string[] // フォルダを指定した際には格納しない。ロードされてない可能性があるので、使うときには直前にloadUndeterminedImageでロードする
  // }
  // タグ文字列は、isflStatus配下のinputFieldとloadedImagesをそのまま使う。
  // fetchする際もisflStatus配下のものをそのままfetchする。
  // read/writeをする際にconfigJson側のタグを更新する、あるいはconfigJson側が変更されたら必ずisflStatus側を更新する方針を取りたいので、基本的にはconfigJson側を使用はしない。
  // ただしconfigJson.copyTargetDirectoryResolutionPathListは直接使う。
  return result
}

export const overwriteIsflStatus = (isflStatus) => {
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

export const initUndeterminedImages = (
  dirPath,
  loadImages=false
) => {
  const fileNames = fs.readdirSync(dirPath);
  fileNames.sort();
  const undeterminedImages = []
  fileNames.forEach((fileName) => {
    const filePath = `${dirPath}${path.sep}${fileName}`
    if (fs.statSync(filePath).isFile()) {
      let undeterminedImage = {
        dirPath,
        fileName,
        filePath,
        imageBase64: "",
        pngInfo: "",
        tagList: []
      };
      let fileNameIsPng = false
      if (loadImages === true) {
        // 画像ファイルを読み込めた場合、imageBase64に代入されていれば要素として挿入する。
        undeterminedImage = loadUndeterminedImage(dirPath, fileName);
      } else {
        // 画像ファイルを読み込んでいない場合、ファイル名の末尾が.pngであるか否かでindexの付与(要素の挿入を行うか否か)を決める。
        const splitedFileName = fileName.split(".");
        if(splitedFileName.length > 0) {
          const extensionUpperCase = splitedFileName[splitedFileName.length - 1].toUpperCase();
          if (extensionUpperCase === "PNG") {
            fileNameIsPng = true
          }
        }
      }
      const isPng = (loadImages && undeterminedImage.imageBase64.length > 0) || ((!loadImages) && fileNameIsPng)
      undeterminedImages.push(undeterminedImage);
    }
  })
  return undeterminedImages
}

export const loadUndeterminedImage = (dirPath, fileName) => {
  const filePath = `${dirPath}${path.sep}${fileName}`
  let result = {
      dirPath,
      fileName,
      filePath,
      imageBase64: "",
      pngInfo: "",
      tagList: []
  }
  try {
    const imageBuffer = fs.readFileSync(filePath)
    const imageBase64 = imageBuffer.toString('base64')
    const pngInfo = bufferToPngInfo(imageBuffer)
    if (pngInfo !== null) {
      const tagList = pngInfoToPositiveTags(pngInfo);
      result = {
        dirPath,
        fileName,
        filePath,
        imageBase64,
        pngInfo,
        tagList
      };
    }
  } catch (e) {
    console.log(e);
    console.log("failed load");
  }
  return result;
}
