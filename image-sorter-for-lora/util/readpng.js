const CS_HEADR = 0;
const CS_SIZE = 1;
const CS_TYPE = 2;
const CS_DATA = 3;
const CS_CRC = 4;
const CM_WORD = 0;
const CM_SEPARATOR = 1;
const MAGNIFICATION = 2;
const WORD_EDGE = {
  "(": ")",
  "{": "}",
  "<": ">"
}
const SEPARATOR_PREFIX_REGEX = /[<{(]/
const SEPARATOR_SUFFIX_REGEX = /[>})]/
const SEPARATOR_CHARACTOR_REGEX = /[ \n\r,]/

const getChunkSize = (buffer, startIndex) => {
  return buffer.readUInt32BE(startIndex);
};

const getChunkType = (buffer, startIndex) => {
  return buffer.toString('utf8', startIndex , startIndex+4);
};

const getChunkData = (buffer, startIndex, chunkSize) => {
  return buffer.subarray(startIndex, chunkSize);
};

const checkHeaderIsPng = (buffer) => {
  const HEADER_1_4_BYTE_BE_INT = parseInt("0x89504E47", 16);
  const HEADER_5_8_BYTE_BE_INT = parseInt("0x0D0A1A0A", 16);
  const bufferHeader14 = buffer.readUInt32BE(0);
  const bufferHeader58 = buffer.readUInt32BE(4);
  return (bufferHeader14 === HEADER_1_4_BYTE_BE_INT) && (bufferHeader58 === HEADER_5_8_BYTE_BE_INT)
}

// データ構造はここを参照
// https://ja.wikipedia.org/wiki/Portable_Network_Graphics
export const bufferToPngInfo = (buffer) => {
  let result = null;
  let nowChunkState = CS_SIZE;
  let nowChunkSize = 0;
  let nowChunkType = "";
  let nowChunkData = null;

  const isPng = checkHeaderIsPng(buffer)
  if(isPng) {
    /* 先頭8byteはファイルヘッダなので省略*/
    let i=8;
    while(i<buffer.length) {
      let itelatorAdd = 1;
      switch(nowChunkState) {
        case CS_SIZE:
          itelatorAdd = 4;
          nowChunkSize=getChunkSize(buffer, i);
          if(nowChunkSize < 0) { // nowChunkSizeが負の数になったらearly returnで中断する。
            return null
          }
          nowChunkState=CS_TYPE;
          break;
        case CS_TYPE:
          itelatorAdd = 4;
          nowChunkType=getChunkType(buffer, i)
          nowChunkState=CS_DATA;
          break;
        case CS_DATA:
          itelatorAdd = nowChunkSize;
          nowChunkData = getChunkData(buffer, i, nowChunkSize);
          nowChunkState = CS_CRC;
          break;
        default: // CS_CRC
          itelatorAdd = 4;
          nowChunkState=CS_SIZE;
      }
      if ((nowChunkState === CS_SIZE) && (nowChunkType === "tEXt")) { // 最初に発見されたtEXt型のチャンクをPNGInfo扱いにする
        const tEXtString = nowChunkData.toString('utf8')
        return tEXtString
      }
    i += itelatorAdd;
    }
  }
  return null
}

export const pngInfoToPositiveTags = (pngInfo) => {
  // parametersという文字列のあと、0x00が区切り文字として存在
  // Negative prompt: の文字列が見えたところからNegative Prompt (LFの次にSteps:の文字列が見えたところが末尾だが、タグ付けを行うならばNegative Promptは不要なのでNPの開始が実質的な末尾)
  // ()あるいは{}の中の文字列中、:を区切って左側
  // ()あるいは{}の文字列中でない場合、スペースあるいはカンマあるいはLFが区切り文字。
  // 区切り文字が連続している箇所(単語長0)の場合無視する
  // <>の中身は他のloraなので無視
  //
  // タグファイル側の区切り文字はカンマ
  // なお、タグつけの際には()に含めることにして、アンダースコアをスペースに変換する。
  const positiveTags = []
  try {
    const afterParameter = pngInfo.split("\0")[1]
    const beforeNegativePrompt = afterParameter.split("Negative prompt:")[0]
    let nowCharMode = CM_SEPARATOR
    // nowCharModeがCM_WORDである場合に、単語の接頭辞がどれなのかを保持する。
    let nowWordEdge = "" // "(", "<", "{", ""
    let nowWordFirstIndex = 0;
    for (let i=0;i<beforeNegativePrompt.length;i++) {
      const charactor = beforeNegativePrompt.charAt(i);
      if (nowCharMode === CM_SEPARATOR) {
        if (SEPARATOR_PREFIX_REGEX.test(charactor)) {
          nowWordEdge = charactor;
          nowCharMode = CM_WORD;
        } else if (SEPARATOR_CHARACTOR_REGEX.test(charactor)) {
          nowWordEdge = "";
        } else {
          nowCharMode = CM_WORD;
        }
        nowWordFirstIndex = i;
      } else if(nowCharMode === CM_WORD) {
        if (nowWordEdge === "") {
          const wordend = SEPARATOR_CHARACTOR_REGEX.test(charactor)
          if (wordend) {
            nowCharMode = CM_SEPARATOR;
            const tokenString = beforeNegativePrompt.substring(nowWordFirstIndex, i)
            const tagString = tokenString.split(":")[0].replaceAll("_", " ")
            positiveTags.push(tagString)
          }
        } else if(SEPARATOR_SUFFIX_REGEX.test(charactor) && WORD_EDGE[nowWordEdge] === charactor) {
            nowCharMode = CM_SEPARATOR;
            const tokenString = beforeNegativePrompt.substring(nowWordFirstIndex+1, i)
            const tagString = tokenString.split(":")[0].replaceAll("_", " ")
            if (nowWordEdge !== "<") {
              positiveTags.push(tagString)
            }
        }
      } else {
        throw new Error("unexpected nor char mode");
      }
    }
  } catch(err) {
    console.log(err)
  }
  return positiveTags
}

export const positiveTagsToString = (positiveTags, removeTags) => {
  const removeTagsIsArray = Array.isArray(removeTags);
  const filteredPositiveTags = positiveTags.filter((tag) => {
    if (removeTagsIsArray) {
      const isRemove = removeTags.find((removeTag) => {
        return removeTag === tag
      });
      return isRemove === false;
    }
    return true
  });
  const result = filteredPositiveTags.join(",\n");
  return result
}

export const tagListToTagListString = (tagList) => {
  return tagList.join(",")
}

export const tagListStringToTagList = (tagListString) => {
  const separatorRegexAfter = /,[ ]+/g
  const separatorRegexBefore = /[ ]+,/g
  const escapedString = tagListString.replaceAll("\n","").replaceAll(separatorRegexAfter, ",").replaceAll(separatorRegexBefore, ",")
  return tagListString.split(",")
}

export const removeTagList = (tagList, removeTagList) => {
  /*
    tagListとremoveTagListはstring型の配列を想定。
    重複排除し、ソートする。
  */
  const sortedTagList = Array.from(new Set(tagList)).sort();
  const sortedRemoveTagList = Array.from(new Set(removeTagList)).sort();
  const result = []
  /*
    配列はソート済みなので、一度比較したら再び比較する必要はないので、二重ループの中でイテレータはリセットされない。
    (これで計算量がsortedTagList.length * sortedRemoveTagList.lengthからsortedTagList.length + sortedRemoveTagListになる)
  */
  let tagListIndex = 0;
  let removeTagListIndex = 0;
  for(tagListIndex=0;tagListIndex<sortedTagList.length;tagListIndex++) {
    let thisTagIsResult = true;
    while(removeTagListIndex<sortedRemoveTagList.length && sortedRemoveTagList[removeTagListIndex]<=sortedTagList[tagListIndex]) {
      if(sortedRemoveTagList[removeTagListIndex] === sortedTagList[tagListIndex]) {
        thisTagIsResult = false;
      }
      removeTagListIndex++;
    }
    if(thisTagIsResult) {
      result.push(sortedTagList[tagListIndex])
    }
  }
  return result
}
