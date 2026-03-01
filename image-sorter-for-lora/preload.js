const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('apis', {
  runClickEventDirectorySelect: async () => ipcRenderer.invoke('click-event-ds'),
  runClickEventAddCopyTarget: async () => ipcRenderer.invoke('click-event-act'),
  runClickEventCopyToHere: async (targetDirectoryIndex, imageTagsString, removeTagsString) => {
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
