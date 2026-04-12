import { generateInitConfig } from './editdir.js'

export const generateInitStatus = () => {
  const initConfig = generateInitConfig()
  const result = {
    selectionIndexOfUI: 0,
    undeterminedDirPath: "",
    undeterminedImages: [],
    targetSpaceList: [],
    configJson: initConfig
  }
  return result
}
