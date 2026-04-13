import {
  tagListStringToTagList
} from './util/readpng.js'

const btnDirectorySelect = document.getElementById('btnDirectorySelect');
btnDirectorySelect.addEventListener('click', async() => {
  await window.apis.runClickEventDirectorySelect();
})
const btnUpdateConfig = document.getElementById('btnUpdateConfig');
btnUpdateConfig.addEventListener('click', async() => {
  await window.apis.runClickEventUpdateConfig();
})
const btnAddCopyTarget = document.getElementById('btnAddCopyTarget');
btnAddCopyTarget.addEventListener('click', async() => {
  await window.apis.runClickEventAddCopyTarget();
})
const textImageIndex = document.getElementById('checkingImageIndex');
textImageIndex.addEventListener('input', async(e) => {
  await window.apis.runInputCheckingImageIndex({ indexString: e.target.value});
})

window.apis.fetchIsflStatusFromCurrentInput((currentStatus) => {
  let newIsflStatus = {
    ...currentStatus
  };
  const removeTagsString = document.getElementById('sharedRemoveTagsOfImage').value;
  const extraTagsString = document.getElementById('sharedRemoveTagsOfImage').value;
  const removeTags = tagListStringToTagList(removeTagsString);
  const extraTags = tagListStringToTagList(extraTagsString);
  newIsflStatus.configJson.sharedRemoveTagsList = removeTags
  newIsflStatus.configJson.shareExtraTsgsList = extraTagsString
  window.apis.updateIsflStatus(newIsflStatus)
})
