export const setSelectionIndexOfUICallback => (isflStatus, callbackJson) {
  let result = {
    newIndex: isflStatus.selectionIndexOfUI,
    newImage: ""
  }
  const indexInt = parseInt(callbackJson.newIndex);
  if (!isNaN(indexInt)) {
    if (0 <= indexInt && indexInt < isflStatus.undeterminedImages.length) {
      isflStatus.selectionIndexOfUI = indexInt;
      const imageBase64 = base64ImgSrc("png", isflStatus.undeterminedImages[indexInt].imageBase64)
      const base64Regex = /^[0-9a-zA-Z]+$/
      if (imageBase64.match(base64Regex)) {
        result = {
          newIndex: indexInt,
          newImage: imageBase64
        }
      }
    }
  }
  return result
}
