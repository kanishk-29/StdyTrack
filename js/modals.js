// Modals
// ---------------- MODALS ----------------
function openModal(id){ document.getElementById(id).classList.add('show'); }
function closeModal(id){ document.getElementById(id).classList.remove('show'); }

// Lock background scrolling while any full-screen overlay is open so the page
// underneath doesn't scroll/glide on touch devices (mobile UX). Watches class
// changes instead of every opener, so any future overlay works automatically.
(function(){
  var overlays = '.overlay.show, .slide-overlay.show, .subjects-drawer-overlay.show, .focus-overlay.show, .login-screen.show';
  var locked = null;
  function refreshLock(){
    var has = !!document.querySelector(overlays);
    if(has === locked) return;
    locked = has;
    document.body.style.overflowY = has ? 'hidden' : '';
  }
  if(window.MutationObserver){
    var mo = new MutationObserver(refreshLock);
    mo.observe(document.body, { subtree:true, attributes:true, attributeFilter:['class'] });
    refreshLock();
  }
})();

function askConfirm(message, onYes, confirmLabel){
  document.getElementById('confirmMessage').textContent = message;
  const yesBtn = document.getElementById('confirmYesBtn');
  yesBtn.textContent = confirmLabel || 'Delete';
  const newYesBtn = yesBtn.cloneNode(true); // strip old listeners
  yesBtn.parentNode.replaceChild(newYesBtn, yesBtn);
  newYesBtn.addEventListener('click', async ()=>{
    closeModal('confirmOverlay');
    await onYes();
  });
  openModal('confirmOverlay');
}

function openAddSubject(){
  editState = {subjectId:null, unitId:null, lectureId:null, mode:'add'};
  document.getElementById('subjectModalTitle').textContent = 'New Subject';
  document.getElementById('subjectNameInput').value = '';
  foldersEnsure();
  populateFolderSelect(document.getElementById('subjectFolderInput'), activeFolderFilter || '');
  openModal('subjectOverlay');
  setTimeout(()=>document.getElementById('subjectNameInput').focus(), 50);
}

function openEditSubject(subjectId){
  const s = data.subjects.find(x=>x.id===subjectId);
  if(!s) return;
  editState = {subjectId, unitId:null, lectureId:null, mode:'edit-subject'};
  document.getElementById('subjectModalTitle').textContent = 'Edit Subject';
  document.getElementById('subjectNameInput').value = s.name;
  foldersEnsure();
  populateFolderSelect(document.getElementById('subjectFolderInput'), s.folderId || activeFolderFilter || '');
  openModal('subjectOverlay');
  setTimeout(()=>document.getElementById('subjectNameInput').select(), 50);
}

async function saveSubject(){
  const name = document.getElementById('subjectNameInput').value.trim();
  if(!name) return;
  const folderSel = document.getElementById('subjectFolderInput');
  const folderId = (folderSel && folderSel.value && folderSel.value !== '__new__') ? folderSel.value : null;
  if(editState && editState.mode==='edit-subject' && editState.subjectId){
    const s = data.subjects.find(x=>x.id===editState.subjectId);
    if(s){ s.name = name; s.folderId = folderId; }
    closeModal('subjectOverlay');
    renderAll();
    saveData();
    showToast('Subject updated ✎');
    return;
  }
  const newSubject = {
    id: uid(), name, folderId,
    units: [1,2,3,4,5].map(n=>({id:uid(), name:'Unit '+n, open:false, lectures:[]}))
  };
  data.subjects.push(newSubject);
  activeSubjectId = newSubject.id;
  closeModal('subjectOverlay');
  renderAll();
  saveData();
}

function openAddUnit(subjectId){
  editState = {subjectId, unitId:null, lectureId:null, mode:'add'};
  document.getElementById('unitModalTitle').textContent = 'New Unit';
  document.getElementById('unitNameInput').value = '';
  openModal('unitOverlay');
  setTimeout(()=>document.getElementById('unitNameInput').focus(), 50);
}

function openEditUnit(subjectId, unitId){
  const s = data.subjects.find(x=>x.id===subjectId);
  const u = s.units.find(x=>x.id===unitId);
  editState = {subjectId, unitId, lectureId:null, mode:'edit-unit'};
  document.getElementById('unitModalTitle').textContent = 'Rename Unit';
  document.getElementById('unitNameInput').value = u.name;
  openModal('unitOverlay');
  setTimeout(()=>{
    const input = document.getElementById('unitNameInput');
    input.focus();
    input.select();
  }, 50);
}

async function saveUnit(){
  const name = document.getElementById('unitNameInput').value.trim();
  if(!name) return;
  const s = data.subjects.find(x=>x.id===editState.subjectId);
  if(editState.mode==='edit-unit'){
    const u = s.units.find(x=>x.id===editState.unitId);
    u.name = name;
  } else {
    s.units.push({id:uid(), name, open:true, lectures:[], tests:[]});
  }
  closeModal('unitOverlay');
  renderAll();
  saveData();
}

function updateLinkPreview(){
  const url = document.getElementById('lectureLinkInput').value.trim();
  const thumb = youTubeThumb(url);
  const preview = document.getElementById('linkPreview');
  const img = document.getElementById('linkPreviewImg');
  if(thumb){
    img.style.display = '';
    img.src = thumb;
    preview.classList.add('show');
  } else {
    preview.classList.remove('show');
    img.src = '';
  }
}

function openBulkAdd(subjectId, unitId){
  editState = {subjectId, unitId, lectureId:null, mode:'bulk'};
  document.getElementById('bulkInput').value = '';
  openModal('bulkOverlay');
  setTimeout(()=>document.getElementById('bulkInput').focus(), 50);
}

async function saveBulkLectures(){
  const raw = document.getElementById('bulkInput').value;
  const lines = raw.split('\n').map(l=>l.trim()).filter(Boolean);
  if(!lines.length){ showToast('Add at least one line'); return; }
  const s = data.subjects.find(x=>x.id===editState.subjectId);
  const u = s.units.find(x=>x.id===editState.unitId);
  let added = 0;
  lines.forEach(line=>{
    const parts = line.split('|');
    const title = parts[0].trim();
    const link = parts.length>1 ? parts.slice(1).join('|').trim() : '';
    if(title){
      u.lectures.push({id:uid(), title, link, notes:'', completed:false, seconds:0, timerStart:null});
      added++;
    }
  });
  closeModal('bulkOverlay');
  renderAll();
  saveData();
  showToast(`${added} lecture(s) added 📚`);
}
