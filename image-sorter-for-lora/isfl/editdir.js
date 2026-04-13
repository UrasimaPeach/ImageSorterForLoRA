import fs from 'node:fs';
import path from 'node:path';

const CONFIGFILE_NAME = "isflConfig.json";

export const ensureTargetDirectory = (dirPath) => {
  let result = {}
  const filenames = fs.readdirSync(dirPath)
  const configFileName = filenames.find(filename => {
    return filename === CONFIGFILE_NAME
  })
  if(configFileName === CONFIGFILE_NAME) {
    result = readConfig(dirPath)
  } else {
    result = generateInitConfig()
    outputConfig(dirPath, result)
  }
  return result
}

export const generateInitConfig = () => {
  return {
    sharedRemoveTagsList: [], // string
    sharedExtraTagsList: [], // string
    currentShowingImageIndex: 0, // number
    copyTargetDirectoryResolutionPathList: [] // string
  }
}

export const outputConfig = (dirPath, outputDict) => {
  const outputText = JSON.stringify(outputDict);
  fs.writeFileSync(
    path.join(dirPath, CONFIGFILE_NAME),
    outputText,
  );
}

export const readConfig = (dirPath) => {
  const configText = fs.readFileSync(
    path.join(dirPath, CONFIGFILE_NAME),
    { encoding: "utf8"},
  );
  const parsedConfig = JSON.parse(configText);
  const defaultConfig = generateInitConfig();
  const result = {
    ...defaultConfig,
    ...parsedConfig
  }
  return result;
}
