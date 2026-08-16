import {
  escapeToHtmlText
} from '../../util/escape.js'
import {
  getCurrentInputValues
} from './getCurrentInputValues.js'
const reloadOperationSpace = (isflStatus) => {
  const imageBase64 = isflStatus.showingImageBase64;
  const indexInt = isflStatus.selectionIndexOfUI
  const escapedDirPath = escapeToHtmlText(isflStatus.undeterminedDirPath)
  const currentImageName = escapeToHtmlText(isflStatus.undeterminedImages[indexInt].fileName);
  const imageHtml = `<img src="${imageBase64}" width="512px" />`
  const lastImageIndex = isflStatus.undeterminedImages.length - 1;
  // タグ文字列はisflStatus配下のものをそのまま使う。
  // fetchする際もisflStatus配下のものをそのままfetchする。
  // read/writeをする際にconfigJson側のタグを更新する、あるいはconfigJson側が変更されたら必ずisflStatus側を更新するので、基本的にはconfigJson側を使用はしない。
  const tagString = isflStatus.imageTagsString;
  const sharedRemoveTagsOfImageString = isflStatus.removeTagsString;
  const sharedExtraTagsOfImageString = isflStatus.extraTagsString;

  document.getElementById('checkingImageIndex').value=`${indexInt}`;
  document.getElementById('showDirectorySelect').innerText=`${escapedDirPath}`;
  document.getElementById('showCurrentImageName').innerText=`${currentImageName}`;
  document.getElementById('showCurrentImage').innerHTML=`${imageHtml}`;
  document.getElementById('lastImageIndex').innerHTML=`${lastImageIndex}`;
  document.getElementById('checkingImageTags').value=`${tagString}`;
  document.getElementById('sharedRemoveTagsOfImage').value=`${sharedRemoveTagsOfImageString}`;
  document.getElementById('sharedExtraTagsOfImage').value=`${sharedExtraTagsOfImageString}`;
}

const reloadTargetSpaceList = (isflStatus) => {
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
  document.getElementById('copyTargetSpace').innerHTML=`${targetSpaceInnerHtml}`;
  isflStatus.configJson.copyTargetDirectoryResolutionPathList.forEach((_value, index) => {
    document.getElementById(`copyToHereButton${index}`).addEventListener('click', async() => {
      const imageTagsString = document.getElementById('checkingImageTags').value;
      const removeTagsString = document.getElementById('sharedRemoveTagsOfImage').value;
      const extraTagsString = document.getElementById('sharedExtraTagsOfImage').value;
      const currentValues = getCurrentInputValues();
      await window.apis.runClickEventCopyToHere(
        index,
        currentValues,
      );
    })
    document.getElementById(`removeThisAreaButton${index}`).addEventListener('click', async() => {
      const currentValues = getCurrentInputValues();
      await window.apis.runClickRemoveThisArea(
        index,
        currentValues
      );
    })
  })
}

export const applyIsflStatus = (isflStatus) => {
  reloadTargetSpaceList(isflStatus)
  reloadOperationSpace(isflStatus)
}
