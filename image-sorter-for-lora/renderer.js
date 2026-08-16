import {
  tagListStringToTagList
} from './util/readpng.js'
import {
  applyIsflStatus
} from './isfl/htmllib/applyIsflStatus.js'
import {
  getCurrentInputValues
} from './isfl/htmllib/getCurrentInputValues.js'

const btnDirectorySelect = document.getElementById('btnDirectorySelect');
const btnSaveInputText = document.getElementById('btnSaveInputText');
const btnAddCopyTarget = document.getElementById('btnAddCopyTarget');
const textImageIndex = document.getElementById('checkingImageIndex');

btnDirectorySelect.addEventListener('click', async() => {
  await window.apis.runClickEventDirectorySelect();
});
btnSaveInputText.addEventListener('click', async() => {
  await window.apis.runClickEventSaveInputText();
})
btnAddCopyTarget.addEventListener('click', async() => {
  const currentValues = getCurrentInputValues();
  await window.apis.runClickEventAddCopyTarget(currentValues);
})
textImageIndex.addEventListener('input', async(e) => {
  const currentValues = getCurrentInputValues();
  await window.apis.runInputCheckingImageIndex({ indexString: e.target.value, currentValues});
})

window.apis.fetchIsflStatusFromCurrentInput((nise) => {
  let newIsflStatus = {
    ...nise.isflStatus
  };
  const currentValues = getCurrentInputValues();
  const {
    imageTagsString,
    extraTagsString,
    removeTagsString,
    selectionIndexOfUI,
  } = currentValues;
  const removeTags = tagListStringToTagList(removeTagsString);
  const extraTags = tagListStringToTagList(extraTagsString);
  let currentIndex = parseInt(selectionIndexOfUI);
  if (
    isNaN(currentIndex) ||
    (!Array.isArray(newIsflStatus.undeterminedImages))
  ) {
    currentIndex = 0;
  } else {
    if(currentIndex >= newIsflStatus.undeterminedImages) {
      currentIndex = newIsflStatus.undeterminedImages.length - 1;
    }
    if(currentIndex < 0) {
      currentIndex=0;
    }
  }
  newIsflStatus.selectionIndexOfUI = parseInt(currentIndex);
  newIsflStatus.imageTagsString = imageTagsString;
  newIsflStatus.removeTagsString = removeTagsString;
  newIsflStatus.extraTagsString = extraTagsString;
  newIsflStatus.configJson.currentShowingImageIndex = parseInt(currentIndex);
  newIsflStatus.configJson.sharedRemoveTagsList = removeTags;
  newIsflStatus.configJson.shareExtraTagsList = extraTags;
  const newNise = {
    ...nise,
    isflStatus: newIsflStatus,
    currentValues: currentValues
  }
  window.apis.niseCallback(newNise)
})
window.apis.applyIsflStatusToCurrentInput((nise) => {
  applyIsflStatus(nise.isflStatus);
  const newNise = {
    ...nise,
    currentValues: getCurrentInputValues()
  }
  window.apis.niseCallback(newNise)
})
