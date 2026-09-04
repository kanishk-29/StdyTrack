// Test score actions
// ---------------- TEST SCORE ACTIONS ----------------
function openAddTest(subjectId, unitId){
  editState = {subjectId, unitId, testId:null, mode:'add-test'};
  document.getElementById('testModalTitle').textContent = 'New Test Score';
  document.getElementById('testNameInput').value = '';
  document.getElementById('testObtainedInput').value = '';
  document.getElementById('testTotalInput').value = '';
  document.getElementById('testQuestionsInput').value = '';
  openModal('testOverlay');
  updateScorePreview();
  setTimeout(()=>document.getElementById('testObtainedInput').focus(), 50);
}

function openEditTest(subjectId, unitId, testId){
  const s = data.subjects.find(x=>x.id===subjectId);
  if(!s) return;
  const u = (s.units||[]).find(x=>x.id===unitId);
  if(!u) return;
  const t = (u.tests||[]).find(x=>x.id===testId);
  if(!t) return;
  editState = {subjectId, unitId, testId, mode:'edit-test'};
  document.getElementById('testModalTitle').textContent = 'Edit Test Score';
  document.getElementById('testNameInput').value = t.name || '';
  document.getElementById('testObtainedInput').value = t.obtained;
  document.getElementById('testTotalInput').value = t.total;
  document.getElementById('testQuestionsInput').value = t.questions || '';
  openModal('testOverlay');
  updateScorePreview();
}

function updateScorePreview(){
  const el = document.getElementById('scorePreview');
  if(!el) return;
  const obtained = parseFloat(document.getElementById('testObtainedInput').value);
  const total = parseFloat(document.getElementById('testTotalInput').value);
  if(isNaN(obtained) || isNaN(total) || total<=0){
    el.className = 'score-preview empty';
    el.textContent = 'Enter your marks to see the score';
    return;
  }
  const pct = Math.max(0, Math.min(100, (obtained/total)*100));
  let tier = 'low', emoji = '💪';
  if(pct>=90){ tier='great'; emoji='🎉'; }
  else if(pct>=75){ tier='good'; emoji='✨'; }
  else if(pct>=50){ tier='okay'; emoji='🙂'; }
  el.className = 'score-preview ' + tier;
  el.innerHTML = `<span class="sp-emoji">${emoji}</span> ${Math.round(pct)}% — ${obtained}/${total}`;
}

async function saveTest(){
  const name = document.getElementById('testNameInput').value.trim();
  const obtained = parseFloat(document.getElementById('testObtainedInput').value);
  const total = parseFloat(document.getElementById('testTotalInput').value);
  const questions = document.getElementById('testQuestionsInput').value.trim();
  if(isNaN(obtained) || isNaN(total) || total<=0){
    showToast('Enter valid marks');
    return;
  }
  const s = data.subjects.find(x=>x.id===editState.subjectId);
  if(!s) return;
  const u = (s.units||[]).find(x=>x.id===editState.unitId);
  if(!u) return;
  if(!u.tests) u.tests = [];
  if(editState.mode==='edit-test'){
    const t = u.tests.find(x=>x.id===editState.testId);
    t.name = name; t.obtained = obtained; t.total = total; t.questions = questions;
  } else {
    u.tests.push({id:uid(), name: name || ('Test '+(u.tests.length+1)), obtained, total, questions});
    showToast('Test score logged 📝');
    if(typeof mascotOnQuizSaved === 'function') mascotOnQuizSaved(obtained, total, editState.subjectId);
  }
  closeModal('testOverlay');
  renderAll();
  saveData();
}

function deleteTest(subjectId, unitId, testId){
  const s = data.subjects.find(x=>x.id===subjectId);
  if(!s) return;
  const u = (s.units||[]).find(x=>x.id===unitId);
  if(!u) return;
  const t = (u.tests||[]).find(x=>x.id===testId);
  askConfirm(`Delete "${t ? (t.name||'this test') : 'this test'}" score?`, ()=>{
    u.tests = u.tests.filter(x=>x.id!==testId);
    renderAll();
    saveData();
  });
}
