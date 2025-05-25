const btnDirectorySelect = document.getElementById('btnDirectorySelect');
btnDirectorySelect.addEventListener('click', async() => {
  await window.apis.runClickEventDirectorySelect();
})
const btnAddCopyTarget = document.getElementById('btnAddCopyTarget');
btnAddCopyTarget.addEventListener('click', async() => {
  await window.apis.runClickEventAddCopyTarget();
})
const textImageIndex = document.getElementById('checkingImageIndex');
textImageIndex.addEventListener('input', async(e) => {
  await window.apis.runInputCheckingImageIndex({ indexString: e.target.value});
})
