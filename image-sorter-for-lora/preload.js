const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('apis', {
  runClickEventDirectorySelect: async () => ipcRenderer.invoke('click-event-ds'),
  runClickEventAddCopyTarget: async (currentValues) => ipcRenderer.invoke('click-event-act', currentValues),
  runClickEventSaveInputText: async() => ipcRenderer.invoke('click-event-sit'),
  runClickEventCopyToHere: async (
    targetDirectoryIndex,
    currentValues
  ) => {
	  return ipcRenderer.invoke(
		  'click-event-cth',
		  targetDirectoryIndex,
      currentValues
	  )
  },
  runClickRemoveThisArea: async (index, currentValues) => ipcRenderer.invoke('click-event-rta', index, currentValues),
  runInputCheckingImageIndex: async (indexJson) => ipcRenderer.invoke('input-event-cii', indexJson),
  niseCallback: async (nise) => ipcRenderer.invoke('nise-callback', nise),
  fetchIsflStatusFromCurrentInput: (callback) => ipcRenderer.on(
    'fetch-isfl-status-from-current-input',
    (_e, nise) => callback(nise)
  ),
  applyIsflStatusToCurrentInput: (callback) => ipcRenderer.on(
    'apply-isfl-status-to-current-input',
    (_e, nice) => callback(nice)
  )
});
