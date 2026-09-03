// Core in-memory state and constants
// ---------------- DATA ----------------
const STORAGE_KEY = 'study-tracker-data';
// Demo/trial mode is fully isolated: it uses its own local-only storage key,
// never touches the cloud, and self-cleans on exit — so a reviewer poking
// around a demo session can never overwrite or leak a real user's data.
let DEMO_MODE = false;
function isDemoMode(){ return DEMO_MODE; }
// When a user is signed in (Firebase auth), scope the local cache to their
// account so signing out and back in as someone else never mixes data.
function studyDataCacheKey(){
  if(DEMO_MODE) return STORAGE_KEY + ':demo';
  try{
    if(typeof firebase !== 'undefined' && typeof firebase.auth === 'function'){
      const u = firebase.auth().currentUser;
      if(u && u.uid) return STORAGE_KEY + ':' + u.uid;
    }
  }catch(e){}
  return STORAGE_KEY;
}
let data = null;
let activeSubjectId = null;
let activeFolderFilter = null; // folder id when sidebar/subjects are being viewed scoped to one folder ('' = unsorted, null = show all)
let folderSubjectFilter = 'all'; // 'all' | 'progress' | 'completed' — tab filter on the "Your Subjects" folder page
let folderSubjectSortMode = 'none'; // 'none' | 'asc' | 'desc' — toggled by the folder page's sort/filter button
let closedFolderIds = new Set(); // folder ids currently collapsed in the sidebar drawer
let editState = { subjectId:null, unitId:null, lectureId:null, mode:null };
let expandedTests = new Set();
let chartRange = 14;
let currentView = 'study';
let lbRange = 7;

function toggleTestExpand(testId){
  if(expandedTests.has(testId)) expandedTests.delete(testId);
  else expandedTests.add(testId);
  renderMain();
  animateRings();
}

function openProgressSlide(){
  rememberOpener('progressOverlay');
  const eyebrowEl = document.getElementById('acEyebrow');
  const titleEl = document.getElementById('acTitle');
  const subEl = document.getElementById('acHeaderSub');
  const avatarEl = document.getElementById('acHeaderAvatar');
  const ringTitleEl = document.getElementById('acRingCardTitle');
  const subjectSection = document.getElementById('subjectGraphsSection');

  eyebrowEl.textContent = 'ANALYTICS';
  titleEl.textContent = 'Analytics Centre';
  subEl.style.display = 'none';
  avatarEl.style.display = 'none';
  ringTitleEl.textContent = 'Overall completion';
  if(subjectSection) subjectSection.style.display = '';

  document.getElementById('progressOverlay').classList.add('show');
  document.querySelectorAll('#progressOverlay .range-btn').forEach(b=>{
    b.classList.toggle('active', Number(b.dataset.range) === chartRange);
  });
  renderProgressChart(chartRange);
}
function closeProgressSlide(){
  document.getElementById('progressOverlay').classList.remove('show');
  restoreOpener('progressOverlay');
}
