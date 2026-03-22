const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('apis', {
  runClickEventDirectorySelect: async () => ipcRenderer.invoke('click-event-ds'),
  runClickEventAddCopyTarget: async () => ipcRenderer.invoke('click-event-act'),
  runClickEventUpdateConfig: async() => ipcRenderer.invoke('click-event-sit'),
  runClickEventCopyToHere: async (
    targetDirectoryIndex,
    imageTagsString,
    removeTagsString,
    extraTagsString
  ) => {
	return ipcRenderer.invoke(
		'click-event-cth',
		targetDirectoryIndex,
		imageTagsString,
		removeTagsString,
		extraTagsString
	)
  },
  runClickRemoveThisArea: async (index) => ipcRenderer.invoke('click-event-rta', index),
  runInputCheckingImageIndex: async (indexJson) => ipcRenderer.invoke('input-event-cii', indexJson)
});
