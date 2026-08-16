export const getCurrentInputValues = () => {
  const imageTagsString = document.getElementById("checkingImageTags").value;
  const removeTagsString = document.getElementById('sharedRemoveTagsOfImage').value;
  const extraTagsString = document.getElementById('sharedExtraTagsOfImage').value;
  const selectionIndexOfUI = document.getElementById('checkingImageIndex').value;
  const result = {
    imageTagsString: imageTagsString,
    removeTagsString: removeTagsString,
    extraTagsString: extraTagsString,
    selectionIndexOfUI: selectionIndexOfUI,
  };
  return result;
}

