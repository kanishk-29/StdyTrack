// Lecture notes rich-text notepad
// ---------------- LECTURE NOTES (rich-text notepad) ----------------
// A per-lecture notepad for pasting book/reading content — separate from
// the short plain-text "notes" field in the edit form. Uses execCommand,
// which is deprecated but still the simplest way to get real bold/underline/
// highlight/color editing without pulling in a rich-text library.
let notesEditorTarget = null;
let notesSavedRange = null;
let notesAutosaveTimer = null;
// ---- Multi-page notes ----
// One lecture can hold many pages, each its own rich-text editor. We keep a
// single live #notesEditor DOM element and swap its content on page change.
// notesPages holds the HTML of every page (index 0 = page 1); page 1 is also
// mirrored to l.richNotes so the existing "has notes" flag, settings sanitize
// and tooltip preview keep working against the first page.
let notesPages = [];
let notesCurrentPage = 0;
// ---- Focus session (strict countdown) ----
let focusSession = { mode:'idle', totalSec:0, remainingSec:0, warnCount:0, timerId:null, digitsId:null, paused:false };

function openNotesEditor(subjectId, unitId, lectureId){
  closeLectureMenus();
  const s = data.subjects.find(x=>x.id===subjectId);
  const u = s && s.units.find(x=>x.id===unitId);
  const l = u && u.lectures.find(x=>x.id===lectureId);
  if(!l) return;
  notesEditorTarget = { subjectId, unitId, lectureId };
  notesSavedRange = null;
  const ctx = document.getElementById('notesLectureContext');
  const titleEl = document.getElementById('notesLectureTitle');
  if(ctx) ctx.textContent = (s.name + ' · ' + u.name).toUpperCase();
  if(titleEl) titleEl.textContent = l.title;
  // Load the page set: prefer a persisted notesPages array, else fall back to
  // the legacy single richNotes string (becomes page 1). Page 1 always mirrors
  // richNotes for backward-compat consumers.
  if(Array.isArray(l.notesPages) && l.notesPages.length){
    notesPages = l.notesPages.filter(p => typeof p === 'string');
    if(!notesPages.length) notesPages = [l.richNotes || ''];
  } else {
    notesPages = [(l.richNotes || '')];
  }
  notesCurrentPage = 0;
  const editor = document.getElementById('notesEditor');
  if(editor) editor.innerHTML = (notesPages[0] || '');
  notesEnsureWhiteTail();
  try{ document.execCommand('styleWithCSS', false, true); }catch(e){}
  applyNotesPaper();
  notesApplyColorGlyph();
  notesRenderPageBar();
  const status = document.getElementById('notesSaveStatus');
  if(status) status.classList.remove('show');
  updateNotesStat();
  document.getElementById('notesOverlay').classList.add('show');
  updateNotesToolbarState();
}
function closeNotesEditor(){
  clearTimeout(notesAutosaveTimer);
  if(notesPen) notesFinishDrawing(true);
  notesClosePopovers();
  saveNotesEditor(true);
  document.getElementById('notesOverlay').classList.remove('show');
  notesEditorTarget = null;
  notesSavedRange = null;
  document.getElementById('notesDrawPalette').style.display = 'none';
}
function handleNotesKeydown(e){
  if(notesPen && e.key === 'Escape'){ e.preventDefault(); notesFinishDrawing(false); return; }
  if(e.key === 'Escape'){ e.preventDefault(); closeNotesEditor(); return; }
  if((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's'){ e.preventDefault(); saveNotesEditor(); return; }
  if((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f'){ e.preventDefault(); notesToggleFind(); return; }
  if((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k'){ e.preventDefault(); notesInsertLink(); }
  // Inside a quote box, Enter at the end should drop you onto the normal white page.
  if(e.key === 'Enter' && !e.ctrlKey && !e.metaKey && !e.shiftKey){
    const sel = window.getSelection && window.getSelection();
    const editor = document.getElementById('notesEditor');
    if(sel && sel.rangeCount && editor){
      let node = sel.anchorNode;
      let bq = node && node.nodeType === 3 ? node.parentElement : node;
      while(bq && bq !== editor && bq.tagName !== 'BLOCKQUOTE') bq = bq.parentElement;
      if(bq && bq.tagName === 'BLOCKQUOTE'){
        const atEnd = sel.isCollapsed && (()=>{ try{ const r = sel.getRangeAt(0); const end = document.createRange(); end.selectNodeContents(bq); end.collapse(false); return r.compareBoundaryPoints(Range.END_TO_END, end) === 0 || bq.textContent.slice(-1) === '' || r.endOffset === (r.endContainer.textContent||'').length; } catch(_){ return false; } })();
        // If blockquote is the last thing in the editor, ensure a white tail exists.
        if(!bq.nextElementSibling){
          const p = document.createElement('p');
          p.innerHTML = '<br>';
          bq.parentNode.insertBefore(p, bq.nextSibling);
        }
        if(atEnd){
          e.preventDefault();
          const p = bq.nextElementSibling;
          const range = document.createRange();
          range.setStart(p, 0); range.collapse(true);
          sel.removeAllRanges(); sel.addRange(range);
          p.scrollIntoView({ block: 'nearest' });
        }
      }
    }
  }
}
function notesEnsureWhiteTail(){
  const editor = document.getElementById('notesEditor');
  if(!editor) return;
  const last = editor.lastElementChild;
  if(last && last.tagName === 'BLOCKQUOTE'){
    const p = document.createElement('p');
    p.innerHTML = '<br>';
    editor.appendChild(p);
  }
}

// ---- Page management ----
function notesCurrentHtml(){
  const e = document.getElementById('notesEditor');
  return e ? e.innerHTML : '';
}
function notesSyncCurrent(){
  notesPages[notesCurrentPage] = notesCurrentHtml();
}
function notesRenderPageBar(){
  const bar = document.getElementById('notesPageBar');
  if(!bar) return;
  const total = Math.max(1, notesPages.length);
  const label = document.getElementById('notesPageLabel');
  if(label) label.textContent = 'Page ' + (notesCurrentPage + 1) + ' of ' + total;
  const prevBtn = document.getElementById('notesPagePrev');
  const nextBtn = document.getElementById('notesPageNext');
  if(prevBtn) prevBtn.disabled = (notesCurrentPage <= 0);
  if(nextBtn) nextBtn.disabled = (notesCurrentPage >= total - 1);
  const addBtn = document.getElementById('notesPageAdd');
  const delBtn = document.getElementById('notesPageDelete');
  if(delBtn) delBtn.disabled = (total <= 1);
  if(bar){
    // Re-render the page-number chits (clickable) with latest count.
    const chips = document.getElementById('notesPageChips');
    if(chips){
      chips.innerHTML = '';
      for(let i=0;i<total;i++){
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'notes-page-chip' + (i===notesCurrentPage ? ' active' : '');
        b.textContent = (i+1);
        b.title = 'Go to page ' + (i+1);
        b.onclick = ()=> notesGoPage(i);
        chips.appendChild(b);
      }
    }
  }
  updateNotesStat();
}
function notesGoPage(i){
  if(i < 0 || i >= notesPages.length || i === notesCurrentPage) return;
  if(notesPen) notesFinishDrawing(false);
  notesSyncCurrent();
  notesSavedRange = null;
  notesCurrentPage = i;
  const editor = document.getElementById('notesEditor');
  if(editor) editor.innerHTML = (notesPages[i] || '');
  notesEnsureWhiteTail();
  updateNotesToolbarState();
  notesRenderPageBar();
  const editorEl = document.getElementById('notesEditor');
  if(editorEl){ editorEl.scrollTop = 0; editorEl.focus(); }
}
function notesAddPage(){
  if(notesPen) notesFinishDrawing(false);
  notesSyncCurrent();
  notesPages.push('');
  notesCurrentPage = notesPages.length - 1;
  const editor = document.getElementById('notesEditor');
  if(editor) editor.innerHTML = '';
  notesSavedRange = null;
  notesRenderPageBar();
  const editorEl = document.getElementById('notesEditor');
  if(editorEl){ editorEl.focus(); }
  saveNotesEditor(true);
}
function notesDeletePage(){
  if(notesPages.length <= 1) return;
  if(notesPen) notesFinishDrawing(false);
  const cur = notesCurrentHtml();
  if(cur && cur.replace(/<[^>]*>/g,'').trim()){
    if(!confirm('Delete this page and all its content?')) return;
  }
  notesPages.splice(notesCurrentPage, 1);
  if(notesCurrentPage >= notesPages.length) notesCurrentPage = notesPages.length - 1;
  notesSavedRange = null;
  const editor = document.getElementById('notesEditor');
  if(editor) editor.innerHTML = (notesPages[notesCurrentPage] || '');
  notesEnsureWhiteTail();
  notesRenderPageBar();
  saveNotesEditor(true);
}
function notesGoPrevPage(){ notesGoPage(notesCurrentPage - 1); }
function notesGoNextPage(){ notesGoPage(notesCurrentPage + 1); }
// Toolbar buttons already keep the caret alive via onmousedown preventDefault,
// so notesExec can just act on the live selection. Color pickers steal focus
// to open their native dialog, so those go through notesSaveSelection /
// notesExecColor instead to restore exactly where the caret was.
function notesExec(cmd, value){
  const editor = document.getElementById('notesEditor');
  if(editor) editor.focus();
  document.execCommand(cmd, false, value || null);
  updateNotesToolbarState();
  handleNotesInput();
}
function notesSaveSelection(){
  const sel = window.getSelection();
  if(!sel || sel.rangeCount === 0) return;
  const range = sel.getRangeAt(0);
  const editor = document.getElementById('notesEditor');
  if(editor && editor.contains(range.commonAncestorContainer)){
    notesSavedRange = range.cloneRange();
  }
}
function notesExecColor(cmd, value){
  const editor = document.getElementById('notesEditor');
  if(editor) editor.focus();
  if(notesSavedRange){
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(notesSavedRange);
  }
  document.execCommand(cmd, false, value);
  const glyph = document.getElementById(cmd === 'foreColor' ? 'notesTextColorGlyph' : 'notesHighlightGlyph');
  if(glyph){
    if(cmd === 'foreColor'){ glyph.style.color = value; }
    else{ glyph.style.background = value; glyph.style.borderRadius = '3px'; glyph.style.padding = '0 3px'; }
  }
  notesRecordColor(cmd, value);
  handleNotesInput();
}
// ---- Color palettes: 7 quick presets each for text & highlight ----
// The last color you used is remembered and shown as the active default, so you
// can re-apply it with one click instead of re-picking from the colour circle.
const NOTES_TEXT_COLORS = ['#1a1a2e', '#2f6fed', '#d3382f', '#1f9d55', '#7c3aed', '#b45309', '#0f766e'];
const NOTES_HILITE_COLORS = ['#fff176', '#a5dcf4', '#b9f6ca', '#ffb3c0', '#ffd8a8', '#d1c4ff', '#c4f0ea'];
const NOTES_TEXT_COLOR_KEY = 'notesLastTextColor';
const NOTES_HILITE_COLOR_KEY = 'notesLastHiliteColor';
let notesLastTextColor = '#1a1a2e';
let notesLastHiliteColor = '#fff176';
try{ notesLastTextColor = localStorage.getItem(NOTES_TEXT_COLOR_KEY) || '#1a1a2e'; }catch(e){}
try{ notesLastHiliteColor = localStorage.getItem(NOTES_HILITE_COLOR_KEY) || '#fff176'; }catch(e){}

function notesRecordColor(cmd, value){
  const key = cmd === 'foreColor' ? NOTES_TEXT_COLOR_KEY : NOTES_HILITE_COLOR_KEY;
  if(cmd === 'foreColor') notesLastTextColor = value;
  else notesLastHiliteColor = value;
  try{ localStorage.setItem(key, value); }catch(e){}
}

function notesBuildColorRow(modeId, isText, presets, lastUsed){
  const row = document.getElementById(modeId);
  if(!row) return;
  row.innerHTML = '';
  presets.forEach(hex => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'notes-color-dot' + (hex.toLowerCase() === lastUsed.toLowerCase() ? ' active' : '');
    b.style.background = hex;
    b.title = (isText ? 'Text color' : 'Highlight') + ' ' + hex;
    b.onclick = ()=> notesApplyPresetColor(isText ? 'foreColor' : 'hiliteColor', hex);
    row.appendChild(b);
  });
}

function notesBuildColorMenu(){
  notesBuildColorRow('notesTextColorSwatches', true, NOTES_TEXT_COLORS, notesLastTextColor);
  notesBuildColorRow('notesHighlightColorSwatches', false, NOTES_HILITE_COLORS, notesLastHiliteColor);
}

function notesToggleColorMenu(e){
  if(e && e.stopPropagation) e.stopPropagation();
  const menu = document.getElementById('notesColorMenu');
  if(!menu) return;
  const wasOpen = menu.classList.contains('show');
  notesClosePopovers();
  if(!wasOpen){
    notesBuildColorMenu();
    menu.classList.add('show');
    document.addEventListener('click', notesClosePopovers, { once:true });
  }
}

function notesApplyPresetColor(mode, hex){
  notesExecColor(mode, hex);
  notesClosePopovers();
  const editor = document.getElementById('notesEditor');
  if(editor) editor.focus();
}

function notesApplyColorGlyph(){
  const t = document.getElementById('notesTextColorGlyph');
  if(t) t.style.color = notesLastTextColor;
  const h = document.getElementById('notesHighlightGlyph');
  if(h){ h.style.background = notesLastHiliteColor; h.style.borderRadius = '3px'; h.style.padding = '0 3px'; }
}
// Reflects which formats are active at the caret so the toolbar shows what's
// actually applied, not just what was last clicked.
function updateNotesToolbarState(){
  const editor = document.getElementById('notesEditor');
  const overlay = document.getElementById('notesOverlay');
  if(!editor || !overlay || !overlay.classList.contains('show')) return;
  const sel = window.getSelection();
  if(!sel.rangeCount || !editor.contains(sel.anchorNode)) return;
  ['bold','italic','underline','strikeThrough','insertUnorderedList','insertOrderedList'].forEach(cmd=>{
    const btn = document.querySelector(`.notes-toolbar button[data-cmd="${cmd}"]`);
    if(!btn) return;
    let isActive = false;
    try{ isActive = document.queryCommandState(cmd); }catch(e){}
    btn.classList.toggle('active', isActive);
  });
}
// Throttle the toolbar sync to one call per frame — selectionchange fires on
// every caret blink/move inside the editor, and each call hits 6 synchronous
// queryCommandState reads. Coalescing to a single rAF keeps the toolbar
// responsive without thrashing on every micro-cursor movement.
let _notesTbRaf = 0;
document.addEventListener('selectionchange', ()=>{
  if(_notesTbRaf) return;
  _notesTbRaf = requestAnimationFrame(()=>{ _notesTbRaf = 0; updateNotesToolbarState(); });
});

function saveNotesEditor(silent){
  if(!notesEditorTarget) return;
  const { subjectId, unitId, lectureId } = notesEditorTarget;
  const s = data.subjects.find(x=>x.id===subjectId);
  const u = s && s.units.find(x=>x.id===unitId);
  const l = u && u.lectures.find(x=>x.id===lectureId);
  if(!l) return;
  const editor = document.getElementById('notesEditor');
  const html = editor ? editor.innerHTML : '';
  // Persist the multi-page set; clamp page 1's mirror into richNotes so the
  // "has notes" flag / tooltip / settings sanitize stay in sync with page 1.
  notesPages[notesCurrentPage] = html;
  l.notesPages = notesPages.slice();
  l.richNotes = (notesPages[0] || '');
  saveData();
  // Only rebuild the subject-detail panel on explicit save; the 1.2s autosave
  // fires while the user is typing — tearing down the live editor mid-stroke
  // forces a full panel rebuild + re-parse the contenteditable DOM, which
  // wastes a re-render that has no visible benefit while the overlay stays open.
  if(!silent) renderMain();
  const status = document.getElementById('notesSaveStatus');
  if(!silent){
    showToast('Notes saved 📝');
    if(status){ status.textContent = 'Saved ✓'; status.classList.add('show'); setTimeout(()=>{ if(status) status.classList.remove('show'); }, 1500); }
  } else if(status){
    status.textContent = 'Autosaved'; status.classList.add('show');
    setTimeout(()=>{ if(status) status.classList.remove('show'); }, 1000);
  }
}
// Runs on every keystroke: (1) collapses the stray empty node contenteditable
// browsers leave behind after you delete all text, so the placeholder
// actually reappears instead of staying blank forever, and (2) debounces an
// autosave so work survives even if the panel gets closed unexpectedly.
function handleNotesInput(){
  const editor = document.getElementById('notesEditor');
  if(!editor) return;
  if(editor.textContent.trim() === '' && !editor.querySelector('img') && editor.innerHTML !== ''){
    editor.innerHTML = '';
  }
  clearTimeout(notesAutosaveTimer);
  notesAutosaveTimer = setTimeout(()=> saveNotesEditor(true), 1200);
  updateNotesStat();
}
// Clipboard content (e.g. copied from a book/PDF/webpage) can carry scripts,
// event handlers, and styling we don't want persisted — strip it down to a
// small safe allowlist before it ever touches the note.
function sanitizeNotesHtml(html){
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  const allowedTags = new Set(['B','STRONG','I','EM','U','S','STRIKE','SPAN','DIV','P','BR','UL','OL','LI','MARK',
                               'A','H1','H2','H3','H4','H5','H6','BLOCKQUOTE','CODE','PRE','HR']);
  const allowedStyleProps = /^(color|background-color|font-weight|text-decoration|font-style)\s*:/i;
  (function clean(node){
    [...node.childNodes].forEach(child=>{
      if(child.nodeType === 1){
        if(!allowedTags.has(child.tagName)){
          while(child.firstChild) node.insertBefore(child.firstChild, child);
          node.removeChild(child);
          return;
        }
        [...child.attributes].forEach(attr=>{
          if(attr.name === 'style'){
            const safe = attr.value.split(';').filter(rule=>allowedStyleProps.test(rule.trim())).join(';');
            if(safe) child.setAttribute('style', safe); else child.removeAttribute('style');
          } else if(child.tagName === 'A' && attr.name === 'href'){
            // Links survive, but only safe destinations — never javascript: or data:.
            const v = attr.value.trim();
            if(/^(https?:\/\/|mailto:|#|\/)/i.test(v) && !/javascript:/i.test(v)) child.setAttribute('href', v);
          } else {
            child.removeAttribute(attr.name);
          }
        });
        clean(child);
      } else if(child.nodeType !== 3){
        node.removeChild(child);
      }
    });
  })(tmp);
  return tmp.innerHTML;
}
function handleNotesPaste(e){
  e.preventDefault();
  const cd = e.clipboardData || window.clipboardData;
  const html = cd.getData('text/html');
  const text = cd.getData('text/plain');
  if(html){
    document.execCommand('insertHTML', false, sanitizeNotesPasteHtml(html));
  } else {
    document.execCommand('insertText', false, text);
  }
  handleNotesInput();
  notesEnsureWhiteTail();
}

// Paste sanitizer: cleans copied HTML the same way as notes, then also drops
// box/theme backgrounds the source app (ChatGPT, docs, PDF viewers…) put on
// wrapper elements. Without this, pasting a "boxed" answer would paint a
// full-width coloured block into the note and trap typing inside it. The
// accents users add themselves with the highlight picker are unaffected.
// Also unwraps <blockquote> wrappers so pasted quotes sit as normal paragraphs
// on the white page — you can scroll and type below them, not trapped inside.
function sanitizeNotesPasteHtml(html){
  const tmp = document.createElement('div');
  tmp.innerHTML = sanitizeNotesHtml(html);
  const stripBgs = function(node){
    [...node.children].forEach(child=>{
      const st = child.getAttribute && child.getAttribute('style');
      if(st){
        const kept = st.split(';').map(s=>s.trim()).filter(s => s && !/^(background|background-color)\s*:/i.test(s));
        if(kept.length) child.setAttribute('style', kept.join(';'));
        else child.removeAttribute('style');
      }
      stripBgs(child);
    });
  };
  stripBgs(tmp);
  // Unwrap pasted blockquotes — keep the text, drop the boxed chrome.
  tmp.querySelectorAll('blockquote').forEach(bq=>{
    const parent = bq.parentNode;
    while(bq.firstChild) parent.insertBefore(bq.firstChild, bq);
    parent.removeChild(bq);
  });
  return tmp.innerHTML;
}

// ---------------- EXTRA NOTE FEATURES ----------------
// Live word/char/reading-time stat, aggregated across the whole multi-page note.
function notesAllPagesText(){
  const parts = [];
  notesPages.forEach((p, i) => {
    // Build a temp node to read plain text from each page's HTML so the total
    // stays correct without loading each page into the live editor.
    const tmp = document.createElement('div');
    tmp.innerHTML = p || '';
    parts.push((tmp.innerText || ''));
  });
  return parts.join(' ');
}
function updateNotesStat(){
  const stat = document.getElementById('notesStat');
  if(!stat) return;
  notesSyncCurrent();
  const text = notesAllPagesText();
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const chars = text.length;
  const mins = words ? Math.max(1, Math.ceil(words / 200)) : 0;
  const pages = Math.max(1, notesPages.length);
  stat.textContent = pages + ' page' + (pages===1?'':'s') + ' · ' + words + ' words · ' + chars.toLocaleString() + ' chars · ~' + mins + ' min read';
}

// Restore the caret that toolbar clicks (or prompt dialogs) may have displaced.
function restoreNotesSelection(focus){
  if(notesSavedRange){
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(notesSavedRange);
  }
  const editor = document.getElementById('notesEditor');
  if(focus && editor) editor.focus();
}

function notesInsertCode(){
  const editor = document.getElementById('notesEditor');
  if(!editor) return;
  restoreNotesSelection(true);
  const sel = window.getSelection();
  const text = sel && sel.rangeCount ? sel.toString() : '';
  if(text){
    document.execCommand('insertHTML', false, '<code>' + escapeHtml(text) + '</code>');
  } else {
    document.execCommand('insertHTML', false, '<code></code>');
  }
  handleNotesInput();
}

function notesInsertLink(){
  const editor = document.getElementById('notesEditor');
  if(!editor) return;
  restoreNotesSelection(false);
  const url = prompt && window.prompt('Paste the link URL (https://…):');
  if(url === null){ editor.focus(); return; }
  let href = String(url).trim();
  if(!href){ editor.focus(); return; }
  if(!/^(https?:\/\/|mailto:|#|\/)/i.test(href)) href = 'https://' + href;
  editor.focus();
  document.execCommand('createLink', false, href);
  handleNotesInput();
}

function notesInsertTimestamp(){
  const editor = document.getElementById('notesEditor');
  if(!editor) return;
  restoreNotesSelection(true);
  const stamp = new Date().toLocaleString(undefined, { weekday:'short', month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' });
  document.execCommand('insertText', false, '\n[' + stamp + ']\n');
  handleNotesInput();
}

// --- Find-in-note: non-destructive (selects + jumps, never rewrites the DOM) ---
let notesFindMatches = [];
let notesFindIndex = -1;

function notesToggleFind(forceClose){
  const bar = document.getElementById('notesFindBar');
  const overlay = document.getElementById('notesOverlay');
  if(!bar || !overlay || !overlay.classList.contains('show')) return;
  const willOpen = forceClose ? false : (bar.style.display === 'none');
  bar.style.display = willOpen ? '' : 'none';
  if(willOpen){
    const input = document.getElementById('notesFindInput');
    if(input){ input.focus(); input.select(); }
  } else {
    notesFindMatches = [];
    notesFindIndex = -1;
    const count = document.getElementById('notesFindCount');
    if(count) count.textContent = '';
  }
}

// Aggregate find across the whole multi-page note. Each match records which
// page it lives on and its occurrence index within that page (text-node refs
// can't survive a page swap, so we navigate to the right page then re-select).
function notesCollectPageMatches(pageHtml, q){
  const matches = [];
  if(!pageHtml || !q) return matches;
  const tmp = document.createElement('div');
  tmp.innerHTML = pageHtml;
  const walker = document.createTreeWalker(tmp, NodeFilter.SHOW_TEXT);
  let node;
  while((node = walker.nextNode())){
    const text = node.nodeValue || '';
    const lower = text.toLowerCase();
    let idx = lower.indexOf(q);
    while(idx !== -1){
      matches.push({ node, offset: idx, len: q.length });
      idx = lower.indexOf(q, idx + q.length);
    }
  }
  return matches;
}

function notesFindCollect(query){
  const matches = [];
  if(!query) return matches;
  notesSyncCurrent();
  notesPages.forEach((p, i) => {
    const pm = notesCollectPageMatches(p, query.toLowerCase());
    for(let k=0;k<pm.length;k++){
      matches.push({ page: i, withinPageIndex: k, count: pm.length });
    }
  });
  return matches;
}

function notesFindSelectMatch(match){
  const editor = document.getElementById('notesEditor');
  if(!editor || !match) return;
  // Ensure we're on the right page before touching the live DOM.
  if(match.page !== undefined && match.page !== notesCurrentPage){
    if(notesPen) notesFinishDrawing(false);
    notesSyncCurrent();
    notesSavedRange = null;
    notesCurrentPage = match.page;
    editor.innerHTML = (notesPages[match.page] || '');
    notesEnsureWhiteTail();
    notesRenderPageBar();
  }
  const inp = document.getElementById('notesFindInput');
  const q = inp ? inp.value.trim() : '';
  const liveWin = notesCollectPageMatches((notesPages[notesCurrentPage] || ''), q);
  if(!liveWin.length) return;
  const target = liveWin[match.withinPageIndex % liveWin.length];
  if(!target) return;
  const range = document.createRange();
  range.setStart(target.node, target.offset);
  range.setEnd(target.node, target.offset + target.len);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
  if(target.node.parentElement){
    try{ target.node.parentElement.scrollIntoView({ block:'center' }); }catch(e){}
  }
  editor.focus();
}

function notesFindUpdate(){
  const input = document.getElementById('notesFindInput');
  const q = input ? input.value.trim() : '';
  notesFindMatches = notesFindCollect(q);
  notesFindIndex = notesFindMatches.length ? 0 : -1;
  const count = document.getElementById('notesFindCount');
  if(!count) return;
  count.textContent = notesFindMatches.length ? '1 / ' + notesFindMatches.length : (q ? 'No matches' : '');
  if(q && notesFindMatches.length) notesFindSelectMatch(notesFindMatches[0]);
}

function notesFindNav(dir){
  if(!notesFindMatches.length) return;
  notesFindIndex = (notesFindIndex + dir + notesFindMatches.length) % notesFindMatches.length;
  const count = document.getElementById('notesFindCount');
  if(count) count.textContent = (notesFindIndex + 1) + ' / ' + notesFindMatches.length;
  notesFindSelectMatch(notesFindMatches[notesFindIndex]);
}

function notesFindKeydown(e){
  if(e.key === 'Enter'){ e.preventDefault(); notesFindNav(e.shiftKey ? -1 : 1); }
  else if(e.key === 'Escape'){ e.preventDefault(); notesToggleFind(true); try{ document.getElementById('notesEditor').focus(); }catch(err){} }
}

// --- Export: save the note as .txt / .md / .html, or copy its text ---
function notesToggleExport(e){
  if(e && e.stopPropagation) e.stopPropagation();
  const menu = document.getElementById('notesExportMenu');
  if(!menu) return;
  const wasOpen = menu.classList.contains('show');
  menu.classList.remove('show');
  if(!wasOpen){
    menu.classList.add('show');
    document.addEventListener('click', function closeMenu(){
      menu.classList.remove('show');
      document.removeEventListener('click', closeMenu);
    });
  }
}

function exportNotes(kind){
  const menu = document.getElementById('notesExportMenu');
  if(menu) menu.classList.remove('show');
  const titleEl = document.getElementById('notesLectureTitle');
  const title = titleEl ? titleEl.textContent : 'lecture-notes';
  const filename = title.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'notes';
  // Merge every page into one temp editor so export/plain text cover the whole
  // note regardless of which page is currently visible.
  notesSyncCurrent();
  const merged = document.createElement('div');
  notesPages.forEach((p, i) => {
    if(i > 0){
      const hr = document.createElement('hr');
      merged.appendChild(hr);
    }
    const tmp = document.createElement('div');
    tmp.innerHTML = p || '';
    merged.appendChild(tmp);
  });
  const plain = merged.innerText || '';
  if(kind === 'copy'){
    if(navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(plain).then(()=> showToast('Notes copied to clipboard 📋')).catch(()=> showToast('Could not copy'));
    } else {
      const ta = document.createElement('textarea');
      ta.value = plain;
      document.body.appendChild(ta);
      ta.select();
      try{ document.execCommand('copy'); showToast('Notes copied to clipboard 📋'); }catch(e){ showToast('Could not copy'); }
      ta.remove();
    }
    return;
  }
  const body = kind === 'markdown' ? htmlToMarkdown(merged) : kind === 'html' ? wrapNotesHtml(merged.innerHTML) : plain;
  const blob = new Blob([body], { type: (kind === 'html' ? 'text/html' : 'text/plain') + ';charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename + (kind === 'markdown' ? '.md' : kind === 'html' ? '.html' : '.txt');
  document.body.appendChild(a);
  a.click();
  setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  showToast('Exported ' + a.download);
}

function wrapNotesHtml(inner){
  return '<!DOCTYPE html><html><head><meta charset="utf-8">' +
    '<title>Study notes</title>' +
    '<style>body{font-family:Georgia,serif;max-width:760px;margin:40px auto;line-height:1.65;padding:0 20px}' +
    'p{margin:0 0 10px}mark{background:#fff176}code,pre{font-family:Consolas,monospace;background:#f1f1f6;border-radius:4px}' +
    'pre{padding:10px;overflow-x:auto}</style></head><body>' + inner + '</body></html>';
}

function htmlToMarkdown(root){
  const lines = [];
  function inline(node){
    let out = '';
    [...node.childNodes].forEach(c=>{
      if(c.nodeType === 3){ out += c.nodeValue; return; }
      const tag = c.tagName ? c.tagName.toLowerCase() : '';
      const inner = inline(c);
      if(tag === 'strong' || tag === 'b') out += '**' + inner + '**';
      else if(tag === 'em' || tag === 'i') out += '*' + inner + '*';
      else if(tag === 'u') out += '<u>' + inner + '</u>';
      else if(tag === 'code') out += '`' + inner.replace(/`/g, '') + '`';
      else if(tag === 'a') out += '[' + inner + '](' + (c.getAttribute('href') || '') + ')';
      else if(tag === 'mark') out += '==' + inner + '==';
      else if(tag === 's' || tag === 'strike') out += '~~' + inner + '~~';
      else out += inner;
    });
    return out;
  }
  function block(node, depth){
    const tag = node.tagName ? node.tagName.toLowerCase() : '';
    if(tag === 'ul' || tag === 'ol'){
      [...node.children].forEach(li => block(li, depth + 1));
      return;
    }
    if(tag === 'li'){
      const ordered = node.parentElement && node.parentElement.tagName.toLowerCase() === 'ol';
      lines.push('  '.repeat(Math.max(depth - 1, 0)) + (ordered ? '1. ' : '- ') + inline(node));
      return;
    }
    if(tag === 'pre'){ lines.push('```'); lines.push(node.innerText || ''); lines.push('```'); return; }
    if(/^h[1-6]$/.test(tag)){ lines.push('#'.repeat(+tag[1]) + ' ' + inline(node)); return; }
    if(tag === 'blockquote'){ lines.push('> ' + inline(node).replace(/\n/g, '\n> ')); return; }
    if(tag === 'br'){ lines.push(''); return; }
    if(tag === 'hr'){ lines.push('---'); return; }
    const txt = (tag === 'p' || tag === 'div' || tag === '') ? inline(node).replace(/\s+/g, ' ').trim() : '';
    if(txt) lines.push(txt);
  }
  [...root.childNodes].forEach(n=>{
    if(n.nodeType === 3){
      const txt = n.nodeValue.replace(/\s+/g, ' ').trim();
      if(txt) lines.push(txt);
    } else if(n.nodeType === 1){
      block(n, 0);
    }
  });
  return lines.join('\n') + '\n';
}

// ---------------- PAPER STYLES (lines / grid / dots) ----------------
const NOTES_PAPER_KEY = 'notesPaperStyle';
let notesPaperStyle = 'blank';
try{ notesPaperStyle = localStorage.getItem(NOTES_PAPER_KEY) || 'blank'; }catch(e){}

function applyNotesPaper(){
  const editor = document.getElementById('notesEditor');
  if(!editor) return;
  editor.classList.remove('paper-lined','paper-grid','paper-dots');
  if(notesPaperStyle !== 'blank') editor.classList.add('paper-' + notesPaperStyle);
  document.querySelectorAll('#notesPaperMenu button[data-paper]').forEach(b=>{
    b.classList.toggle('active', b.dataset.paper === notesPaperStyle);
  });
  const paperBtn = document.querySelector('.notes-paper-btn');
  if(paperBtn){
    const glyph = { blank:'▢', lined:'▤', grid:'▦', dots:'≋' }[notesPaperStyle] || '▦';
    paperBtn.textContent = glyph;
  }
}
function notesChoosePaper(style){
  notesPaperStyle = style;
  try{ localStorage.setItem(NOTES_PAPER_KEY, style); }catch(e){}
  applyNotesPaper();
  notesClosePopovers();
}
function notesTogglePaperMenu(e){
  if(e && e.stopPropagation) e.stopPropagation();
  const menu = document.getElementById('notesPaperMenu');
  if(!menu) return;
  const wasOpen = menu.classList.contains('show');
  notesClosePopovers();
  if(!wasOpen){
    menu.classList.add('show');
    document.addEventListener('click', notesClosePopovers, { once:true });
  }
}
function notesClosePopovers(){
  document.querySelectorAll('.notes-paper-menu.show').forEach(m=>m.classList.remove('show'));
  const menu = document.getElementById('notesExportMenu');
  if(menu) menu.classList.remove('show');
  const colorMenu = document.getElementById('notesColorMenu');
  if(colorMenu) colorMenu.classList.remove('show');
}
function handleNotesPaperClick(e){
  const b = e.target.closest('[data-paper]');
  if(b) notesChoosePaper(b.dataset.paper);
}
document.addEventListener('click', handleNotesPaperClick);

// ---------------- DRAWING (pen / marker / eraser) ----------------
// A canvas floats over the whole note while drawing; strokes are stored in
// memory, then rendered into an inline SVG that gets inserted into the note's
// HTML, so a sketch is saved, syncs, and exports like any other content.
const NOTES_PEN_SIZES = { S:2, M:4, L:7 };
let notesPen = null;

function notesToggleDraw(){
  if(notesPen) notesFinishDrawing(false);
  else notesStartDrawing();
}

function notesStartDrawing(){
  const editor = document.getElementById('notesEditor');
  const overlay = document.getElementById('notesOverlay');
  if(!editor || notesPen || !overlay || !overlay.classList.contains('show')) return;
  const palette = document.getElementById('notesDrawPalette');
  editor.setAttribute('contenteditable','false');
  editor.classList.add('drawing');
  const dpr = window.devicePixelRatio || 1;
  const cv = document.createElement('canvas');
  cv.className = 'notes-draw-canvas';
  const w = editor.clientWidth, h = Math.max(editor.scrollHeight, editor.clientHeight);
  cv.style.width = w + 'px';
  cv.style.height = h + 'px';
  cv.width = Math.round(w * dpr);
  cv.height = Math.round(h * dpr);
  editor.appendChild(cv);
  const ctx = cv.getContext('2d');
  ctx.scale(dpr, dpr);
  notesPen = {
    editor, canvas: cv, ctx,
    w, h,
    strokes: [],
    current: null,
    color: '#1a1a2e',
    marker: false,
    size: 'M',
    eraser: false
  };
  cv.addEventListener('pointerdown', notesPenPointerDown);
  cv.addEventListener('pointermove', notesPenPointerMove);
  cv.addEventListener('pointerup', notesPenPointerUp);
  cv.addEventListener('pointercancel', notesPenPointerUp);
  palette.style.display = 'flex';
  if(editor.blur) editor.blur();
}

function notesPenPoint(e){
  const r = notesPen.canvas.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
}
function notesPenRadius(){
  const base = NOTES_PEN_SIZES[notesPen.size] || 4;
  return notesPen.marker ? Math.max(10, base * 2.4) : base;
}
function notesPenPointerDown(e){
  e.preventDefault();
  try{ notesPen.canvas.setPointerCapture(e.pointerId); }catch(err){}
  if(notesPen.eraser) return;
  const p = notesPenPoint(e);
  const r = notesPenRadius();
  notesPen.current = {
    pts: [p],
    color: notesPen.color,
    size: r,
    alpha: notesPen.marker ? 0.42 : 1
  };
  const c = notesPen.ctx;
  c.fillStyle = notesPen.color;
  c.globalAlpha = notesPen.current.alpha;
  c.beginPath(); c.arc(p.x, p.y, r / 2, 0, Math.PI * 2); c.fill();
  c.globalAlpha = 1;
}
function notesPenDrawSeg(a, b){
  const ctx = notesPen.ctx;
  ctx.globalAlpha = notesPen.current.alpha;
  ctx.strokeStyle = notesPen.current.color;
  ctx.lineWidth = notesPen.current.size;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  ctx.globalAlpha = 1;
}
function notesPenPointerMove(e){
  if(!notesPen) return;
  if(notesPen.eraser){
    const p = notesPenPoint(e);
    const radius = notesPenRadius() + 8;
    const before = notesPen.strokes.length;
    notesPen.strokes = notesPen.strokes.filter(s=>{
      return !s.pts.some(pt => Math.hypot(pt.x - p.x, pt.y - p.y) < radius);
    });
    if(notesPen.strokes.length !== before) notesPenRedrawAll();
    return;
  }
  if(!notesPen.current) return;
  const p = notesPenPoint(e);
  notesPen.current.pts.push(p);
  notesPenDrawSeg(notesPen.current.pts[notesPen.current.pts.length - 2], p);
}
function notesPenPointerUp(){
  if(!notesPen) return;
  if(notesPen.current){
    notesPen.strokes.push(notesPen.current);
    notesPen.current = null;
  }
}
function notesPenRedrawAll(){
  const c = notesPen.ctx;
  c.clearRect(0, 0, notesPen.w, notesPen.h);
  notesPen.strokes.forEach(s=>{
    if(!s.pts.length) return;
    c.globalAlpha = s.alpha;
    c.strokeStyle = s.color;
    c.lineWidth = s.size;
    c.lineCap = 'round';
    c.lineJoin = 'round';
    c.beginPath();
    s.pts.forEach((p, i)=>{ if(i === 0) c.moveTo(p.x, p.y); else c.lineTo(p.x, p.y); });
    c.stroke();
  });
  c.globalAlpha = 1;
}
function notesPenClear(){
  if(!notesPen) return;
  notesPen.strokes = [];
  notesPenRedrawAll();
}
function notesPenSetColor(color, btn){
  if(!notesPen) return;
  notesPen.color = color;
  if(btn){
    const wrap = btn.parentElement;
    if(wrap){ [...wrap.children].forEach(b=>b.classList.remove('active')); }
    btn.classList.add('active');
  }
}
function notesPenSetSize(size, btn){
  if(!notesPen) return;
  notesPen.size = size;
  if(btn){
    const wrap = btn.parentElement;
    if(wrap){ [...wrap.children].forEach(b=>b.classList.remove('active')); }
    btn.classList.add('active');
  }
}
function notesPenToggleMarker(btn){
  if(!notesPen) return;
  notesPen.marker = !notesPen.marker;
  if(btn) btn.classList.toggle('active', notesPen.marker);
}
function notesPenToggleEraser(btn){
  if(!notesPen) return;
  notesPen.eraser = !notesPen.eraser;
  if(btn) btn.classList.toggle('active', notesPen.eraser);
  notesPen.canvas.style.cursor = notesPen.eraser ? 'not-allowed' : 'crosshair';
}
function handleNotesPaletteClick(e){
  const b = e.target.closest('[data-role]');
  if(!b) return;
  const role = b.dataset.role;
  if(role === 'done'){ e.preventDefault(); notesFinishDrawing(false); return; }
  if(!notesPen) return;
  if(role === 'color') notesPenSetColor(b.dataset.color, b);
  else if(role === 'size') notesPenSetSize(b.dataset.size, b);
  else if(role === 'marker') notesPenToggleMarker(b);
  else if(role === 'eraser') notesPenToggleEraser(b);
  else if(role === 'clear') notesPenClear();
}
document.addEventListener('click', handleNotesPaletteClick);

function notesFinishDrawing(discard){
  if(!notesPen) return;
  const strokes = notesPen.strokes;
  const editor = notesPen.editor;
  const cv = notesPen.canvas;
  if(cv && cv.parentNode) cv.parentNode.removeChild(cv);
  notesPen = null;
  document.getElementById('notesDrawPalette').style.display = 'none';
  if(!editor) return;
  editor.setAttribute('contenteditable','true');
  editor.classList.remove('drawing');
  if(!discard && strokes.length){
    editor.focus();
    const sel = window.getSelection();
    try{ sel.selectAllChildren(editor); sel.collapseToEnd(); }catch(e){}
    const svg = buildNotesDrawingSvg(strokes, editor.clientWidth || 640);
    try{ document.execCommand('insertHTML', false, '<div class="notes-drawing">' + svg + '</div>'); }catch(e){}
  }
  handleNotesInput();
}

function buildNotesDrawingSvg(strokes, maxW){
  let minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
  strokes.forEach(s=> s.pts.forEach(p=>{
    if(p.x < minX) minX = p.x; if(p.x > maxX) maxX = p.x;
    if(p.y < minY) minY = p.y; if(p.y > maxY) maxY = p.y;
  }));
  const pad = 12;
  const w = Math.max(1, maxX - minX + pad * 2);
  const h = Math.max(1, maxY - minY + pad * 2);
  const paths = strokes.map(s=>{
    if(!s.pts.length) return '';
    const d = s.pts.map((p, i)=> (i ? 'L' : 'M') +
      (p.x - minX + pad).toFixed(1) + ',' + (p.y - minY + pad).toFixed(1)).join(' ');
    return `<path d="${d}" fill="none" stroke="${s.color}" stroke-width="${s.size.toFixed(1)}" stroke-linecap="round" stroke-linejoin="round"${s.alpha < 1 ? ' opacity="' + s.alpha + '"' : ''}/>`;
  }).join('');
  const displayW = Math.min(w, maxW);
  const displayH = h * (displayW / w);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w.toFixed(1)} ${h.toFixed(1)}" width="${displayW.toFixed(1)}" height="${displayH.toFixed(1)}" style="max-width:100%;height:auto">${paths}</svg>`;
}

function closeLectureMenus(){
  document.querySelectorAll('.lecture-kebab-menu.show').forEach(m=>m.classList.remove('show'));
  document.querySelectorAll('.lecture.menu-active').forEach(l=>l.classList.remove('menu-active'));
}
function toggleLectureMenu(lectureId){
  const menu = document.getElementById('lectureMenu-'+lectureId);
  const row = document.getElementById('lecture-'+lectureId);
  if(!menu) return;
  const wasOpen = menu.classList.contains('show');
  closeUnitMenus();
  closeUnitSortMenus();
  closeLectureMenus();
  if(!wasOpen){
    menu.classList.add('show');
    if(row) row.classList.add('menu-active'); // lift this card above its siblings so the popover isn't covered by the next row
  }
}

// ---- Focus session helpers ----
function fuSecondsText(sec){
  sec = Math.max(0, Math.floor(Number(sec) || 0));
  const m = Math.floor(sec/60), s = sec%60;
  return String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0');
}
function fuFocusPct(){
  const s = focusSession;
  if(s.mode === 'done') return 100;
  return s.totalSec ? Math.round((s.remainingSec / s.totalSec) * 100) : 0;
}
function updateFocusRing(){
  const ring = document.getElementById('focusRing');
  const pct = fuFocusPct();
  if(ring) ring.style.background = 'conic-gradient(var(--green) 0 ' + pct + '%, rgba(255,255,255,.14) ' + pct + '% 100%)';
  const txt = document.getElementById('focusTimerText');
  if(txt) txt.textContent = fuSecondsText(focusSession.remainingSec);
  const sub = document.getElementById('focusTimerSub');
  if(sub) sub.textContent = focusSession.paused ? 'paused' : (focusSession.mode==='done' ? 'completed' : 'remaining');
  const bar = document.getElementById('focusProgBar');
  if(bar) bar.style.width = pct + '%';
  const railNum = document.getElementById('focusRailNum');
  if(railNum) railNum.textContent = fuSecondsText(focusSession.mode === 'done' ? 0 : focusSession.remainingSec);
  const railLbl = document.getElementById('focusRailLabel');
  if(railLbl) railLbl.textContent = focusSession.mode === 'done' ? 'completed' : (focusSession.paused ? 'paused' : 'remaining');
  const ov = document.getElementById('focusOverlay');
  if(ov) ov.classList.toggle('focus-running', focusSession.mode === 'running' || focusSession.mode === 'done');
}
function focusSessionRender(){
  const box = document.getElementById('focusSession');
  if(!box) return;
  const s = focusSession;
  if(s.mode === 'idle'){
    box.innerHTML = `
      <div class="focus-sess-head">
        <div class="focus-sess-title"><b>Focus session</b><span>Pick your timer — strict, it won't let you skip early</span></div>
      </div>
      <div class="focus-chips">
        ${[15,25,50,60,90].map(m=>'<button class="focus-chip" onclick="focusSessionStart('+m+')">'+m+' min</button>').join('')}
        <span class="focus-custom">Custom <input id="focusCustomMin" type="number" min="1" max="300" step="5" value="50"> min</span>
        <button class="focus-start" onclick="focusSessionStart(document.getElementById('focusCustomMin').value)">Start</button>
      </div>`;
    return;
  }
  if(s.mode === 'running' || s.mode === 'done'){
    box.innerHTML = `
      <div class="focus-sess-head">
        <div class="focus-sess-title"><b>Focus session</b><span>${s.mode==='done' ? 'Complete — you can exit now 🎉' : (s.paused ? 'Paused — resume whenever you are ready' : 'Locked in — quitting early needs 2 warnings')}</span></div>
        ${s.mode==='running' ? '<button class="focus-quit-btn" onclick="focusWarnExit()">Quit early</button>' : ''}
      </div>
      <div class="focus-count">
        <div class="focus-ring" id="focusRing"><div class="focus-ring-in"><b id="focusTimerText"></b><span id="focusTimerSub">remaining</span></div></div>
        <div class="focus-progress"><i id="focusProgBar"></i></div>
        <div class="focus-count-actions">
          ${s.mode==='running' ? '<button class="focus-pause" onclick="focusSessionPause()">'+ (s.paused ? 'Resume' : 'Pause') +'</button>' : ''}
        </div>
      </div>`;
    updateFocusRing();
    return;
  }
}
function focusSessionStart(min){
  min = Math.max(1, Math.min(300, parseInt(min,10) || 50));
  const s = focusSession;
  s.totalSec = min*60;
  s.remainingSec = s.totalSec;
  s.warnCount = 0;
  s.mode = 'running';
  s.paused = false;
  s.committed = false;
  clearFocusQuitBox();
  if(s.timerId) clearInterval(s.timerId);
  s.timerId = setInterval(focusSessionTick, 1000);
  if(typeof fuBHStart === 'function') fuBHStart();
  focusSessionRender();
  updateFocusRing();
  if(typeof renderFocusControls === 'function') renderFocusControls();
  showToast(min + '-minute focus locked in. Stay with it.');
}
function focusSessionPause(){
  const s = focusSession;
  if(s.mode !== 'running') return;
  s.paused = !s.paused;
  focusSessionRender();
  if(typeof renderFocusControls === 'function') renderFocusControls();
}
function focusSessionTick(){
  const s = focusSession;
  if(s.mode !== 'running' || s.paused) return;
  s.remainingSec--;
  if(s.remainingSec <= 0){
    s.remainingSec = 0;
    s.mode = 'done';
    if(s.timerId){ clearInterval(s.timerId); s.timerId = null; }
    const banked = focusCommitTimeToLecture();
    updateFocusRing();
    focusSessionRender();
    if(typeof renderFocusControls === 'function') renderFocusControls();
    showToast('Focus session complete 🎉' + (banked > 0 ? ' · ' + formatHuman(banked) + ' added to lecture time' : ''));
    if(typeof mascotCelebrate === 'function'){ try{ mascotCelebrate(); }catch(e){} }
    return;
  }
  updateFocusRing();
}
function focusSessionReset(){
  focusSessionStop();
  focusSessionRender();
}
function focusSessionStop(){
  const s = focusSession;
  if(s.timerId){ clearInterval(s.timerId); s.timerId = null; }
  fuStop();
  s.mode = 'idle'; s.totalSec = 0; s.remainingSec = 0; s.warnCount = 0; s.paused = false; s.committed = false;
  clearFocusQuitBox();
}
function clearFocusQuitBox(){ const b = document.getElementById('focusQuitBox'); if(b) b.innerHTML = ''; }
function focusQuitDismiss(){ clearFocusQuitBox(); }
function focusWarnExit(){
  const s = focusSession;
  if(s.mode !== 'running'){ forceCloseFocusMode(); return; }
  s.warnCount++;
  if(s.warnCount < 3){
    const box = document.getElementById('focusQuitBox');
    if(box) box.innerHTML = `
      <div class="fq-overlay">
        <div class="fq-card">
          <div class="fq-num">Warning ${s.warnCount} of 2</div>
          <div class="fq-title">Focus is still running</div>
          <div class="fq-sub">${fuSecondsText(s.remainingSec)} left. You can't skip this session until it completes.</div>
          <div class="fq-actions">
            <button class="fq-keep" onclick="focusQuitDismiss()">Keep focusing</button>
            <button class="fq-quit" onclick="focusWarnExit()">Quit anyway</button>
          </div>
        </div>
      </div>`;
    showToast('Strict focus — you can\'t skip yet (warning ' + s.warnCount + ' of 2).');
    return;
  }
  forceCloseFocusMode();
}

// ---- Universe placeholder (shown when a lecture has no playable video) ----
function fuDigitsLine(){
  let hex = '';
  for(let i=0;i<6;i++) hex += (Math.floor(Math.random()*256)).toString(16).toUpperCase().padStart(2,'0') + ' ';
  let bin = '';
  for(let i=0;i<14;i++) bin += Math.round(Math.random());
  let ts = '';
  if(focusSession.mode === 'running' || focusSession.mode === 'done') ts = 'T-' + fuSecondsText(focusSession.mode === 'done' ? 0 : focusSession.remainingSec);
  return hex.trim() + '\n' + bin + '\n' + (ts || 'SIG: LOCKED');
}
function fuStart(){
  fuSatStart();
  if(focusSession.digitsId) return;
  const el = document.getElementById('fuDigits');
  if(el) el.textContent = fuDigitsLine();
  focusSession.digitsId = setInterval(function(){
    const t = document.getElementById('fuDigits');
    if(t) t.textContent = fuDigitsLine();
  }, 900);
}
function fuStop(){
  fuSatStop();
  if(focusSession.digitsId){ clearInterval(focusSession.digitsId); focusSession.digitsId = null; }
}
function focusUniverseHtml(extra){
  return `
    <div class="focus-universe">
      <canvas id="fuSat"></canvas>
      <div class="fu-hud"><span>SYS:// GALAXY LOCKED</span><span>BH 4.3M SUN · R 0.08 AU</span><span>LSH: ${fuSecondsText(focusSession.totalSec || 0)}</span></div>
      <div class="fu-digits" id="fuDigits"></div>
      <div class="fu-center-label">${extra || 'No link attached — deep focus engaged'}</div>
    </div>`;
}

// ---- Universe placeholder — a calm spiral galaxy a black hole slowly devours ----
let fuSatId = null, fuSatLast = null, fuSatT = 0;
let fuStars = null, fuBH = null;
const FU2PI = Math.PI * 2;
const FU_FALL = 1.5;
function fuEase(x){ return x < 0 ? 0 : x > 1 ? 1 : x * x * (3 - 2 * x); }
function fuEnsureScene(){
  if(!fuStars){
    fuStars = [];
    const rng = (a, b) => a + Math.random() * (b - a);
    const push = (x, y, r, kind, ph) => fuStars.push({ x, y, r, kind, ph });
    for(let i = 0; i < 96; i++) push(rng(0, 800), rng(0, 450), rng(0.4, 1.25), 0, rng(0, FU2PI));
    for(let a = 0; a < 2; a++){
      const ang0 = a * Math.PI;
      for(let i = 0; i < 52; i++){
        const rr = rng(0.42, 1) * 205;
        const ang = ang0 + rr / 52 + rng(-0.18, 0.18);
        push(400 + Math.cos(ang) * rr, 225 + Math.sin(ang) * rr * 0.62, rng(0.5, 1.5), 1, rng(0, FU2PI));
      }
    }
    for(let i = 0; i < 20; i++){
      const ang = rng(0, FU2PI), rr = rng(0, 26);
      push(400 + Math.cos(ang) * rr, 225 + Math.sin(ang) * rr * 0.7, rng(0.6, 1.4), 2, rng(0, FU2PI));
    }
  }
  if(!fuBH){
    fuBH = { active:false, birth:0, eatAt:[], last:0 };
  }
}
function fuBHStart(){
  fuEnsureScene();
  if(!fuBH) return;
  fuBH.active = true;
  fuBH.birth = fuSatT || 0.0001;
  fuBH.eatAt = [];
  fuBH.last = 0;
}
function fuSatDraw(ctx, W, H, t){
  const s = focusSession;
  const done = s.mode === 'done';
  const run = s.mode === 'running';
  const prog = done ? 1 : run ? (1 - s.remainingSec / Math.max(1, s.totalSec)) : 0;
  const cx = W * 0.60, cy = H * 0.52;
  const appear = (fuBH && fuBH.active) ? fuEase((t - fuBH.birth) / 2.2) : 0;
  // The black hole's whole life spans the chosen session: a longer session grows
  // a bigger hole, and it collapses away exactly when the countdown hits zero.
  const durMin = Math.max(1, (s.totalSec || 0) / 60);
  const sizeK = 0.7 + 0.8 * Math.min(1, durMin / 90);
  const endFade = 1 - fuEase(Math.max(0, Math.min(1, (prog - 0.94) / 0.06)));

  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#070b22'); bg.addColorStop(0.55, '#0a1130'); bg.addColorStop(1, '#030409');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

  const dimA = 1 - prog * 0.45;
  const neb = (x, y, r, c) => {
    const g = ctx.createRadialGradient(x, y, 6, x, y, r);
    g.addColorStop(0, c); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  };
  neb(W * 0.22, H * 0.16, W * 0.55, 'rgba(130,160,255,' + (0.10 * dimA) + ')');
  neb(W * 0.86, H * 0.78, W * 0.48, 'rgba(210,120,240,' + (0.07 * dimA) + ')');
  neb(W * 0.08, H * 0.88, W * 0.40, 'rgba(70,230,210,' + (0.05 * dimA) + ')');

  const sc = Math.min(W, H) * 0.64, rot = t * 0.018;
  for(let p = 0; p < 2; p++){
    for(let a = 0; a < 2; a++){
      const ang0 = a * Math.PI + rot;
      ctx.beginPath();
      for(let i = 0; i <= 44; i++){
        const rr = (i / 44) * sc;
        const x = cx + Math.cos(ang0 + rr / sc * 2.6) * rr;
        const y = cy + Math.sin(ang0 + rr / sc * 2.6) * rr * 0.62;
        if(i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = p ? 'rgba(150,180,255,' + (0.05 * dimA) + ')' : 'rgba(120,160,255,' + (0.09 * dimA) + ')';
      ctx.lineWidth = p ? 3.4 : 1.1;
      ctx.stroke();
    }
  }

  const bulg = ctx.createRadialGradient(cx, cy, 2, cx, cy, sc * 0.30);
  bulg.addColorStop(0, 'rgba(255,226,182,' + Math.max(0, (0.30 - 0.24 * appear) * dimA) + ')');
  bulg.addColorStop(0.5, 'rgba(255,190,140,' + (0.10 * dimA) + ')');
  bulg.addColorStop(1, 'rgba(255,190,140,0)');
  ctx.fillStyle = bulg; ctx.fillRect(0, 0, W, H);

  const B_START = 0.28, B_MERGE = 0.85;
  const insp = Math.max(0, Math.min(1, (prog - B_START) / (B_MERGE - B_START)));
  const inInsp = prog >= B_START && prog < B_MERGE;
  const mergedF = Math.max(0, Math.min(1, (prog - B_MERGE) / (1 - B_MERGE)));

  const bhO = sc * 0.42 * appear * sizeK;
  const primR = bhO * (0.55 + 0.30 * prog + 0.25 * insp);
  const orbR = bhO * (1.9 - 1.15 * insp);
  const orbA = t * 1.25 + insp * 30;
  const sx = cx + Math.cos(orbA) * orbR;
  const sy = cy + Math.sin(orbA) * orbR * 0.82;
  const secR = bhO * Math.max(0.10, 0.40 * (1 - insp * 0.35));
  const spin = t * (inInsp ? 1.9 : 0.9) + insp * 18;
  const ringR = primR;
  const lensR = primR * 2.6;
  const secLensR = secR * 2.6;

  const total = fuStars.length;
  const eatD = appear * prog;
  const eatN = eatD > 0 ? Math.floor(fuEase(eatD) * total) : 0;
  if(fuBH && eatN > fuBH.last){
    for(let i = fuBH.last; i < eatN; i++) fuBH.eatAt[i] = t;
    fuBH.last = eatN;
  }
  const kx = W / 800, ky = H / 450;

  ctx.globalAlpha = 1;
  for(let i = 0; i < total; i++){
    const st = fuStars[i];
    const sx0 = st.x * kx, sy0 = st.y * ky;
    const baseR = st.r * (st.kind === 1 ? 1.15 : st.kind === 2 ? 1.3 : 1);
    if(i < eatN){
      const f0 = fuBH.eatAt[i];
      const u = f0 != null && f0 <= t ? Math.min(1, (t - f0) / FU_FALL) : 1;
      if(u >= 1) continue;
      const e = u * u * u;
      const exx = sx0 + (cx - sx0) * e, eyy = sy0 + (cy - sy0) * e;
      const swa = u * 2.1;
      const ddx = exx - cx, ddy = eyy - cy;
      ctx.globalAlpha = (1 - u) * (0.7 + 0.3 * Math.abs(Math.sin(t * 2 + st.ph)));
      ctx.fillStyle = st.kind === 2 ? '#ffe9b8' : (st.kind === 1 ? '#cfe4ff' : '#ffffff');
      ctx.beginPath();
      ctx.arc(cx + ddx * Math.cos(swa) - ddy * Math.sin(swa), cy + ddx * Math.sin(swa) + ddy * Math.cos(swa), baseR * (1 - u * 0.7), 0, FU2PI);
      ctx.fill();
      continue;
    }
    const dx = sx0 - cx, dy = sy0 - cy;
    const d = Math.sqrt(dx * dx + dy * dy);
    let px = sx0, py = sy0;
    if(appear > 0 && d < lensR && lensR > 0.01){
      const nd = ringR + (lensR - ringR) * (d / lensR) * (d / lensR);
      const k = nd / Math.max(0.001, d);
      px = cx + dx * k;
      py = cy + dy * k;
    }
    if(inInsp){
      const dx2 = px - sx, dy2 = py - sy;
      const d2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
      if(d2 < secLensR && secLensR > 0.01){
        const nd2 = secR * 1.06 + (secLensR - secR * 1.06) * (d2 / secLensR) * (d2 / secLensR);
        const k2 = nd2 / Math.max(0.001, d2);
        px = sx + dx2 * k2;
        py = sy + dy2 * k2;
      }
    }
    // Gravitational-wave ripple washing over the field: every star gets nudged
    // as the wave passes (steady ripples during the inspiral, a sharp pulse at
    // the moment the two holes collide).
    let wDisp = 0;
    if(inInsp){
      wDisp = Math.sin(d * 0.045 - t * 5) * (2.6 * insp) * Math.max(0, 1 - d / (sc * 3.4));
    } else if(mergedF > 0){
      const front = bhO * (1.1 + mergedF * 3.0);
      wDisp = Math.exp(-Math.abs(d - front) / Math.max(20, bhO)) * 8 * (1 - mergedF);
    }
    if(wDisp !== 0 && d > 0.001){
      px += (dx / d) * wDisp;
      py += (dy / d) * wDisp;
    }
    ctx.globalAlpha = 0.35 + 0.65 * Math.abs(Math.sin(t * (st.kind === 1 ? 1.5 : 2.2) + st.ph));
    ctx.fillStyle = st.kind === 2 ? '#ffe9b8' : (st.kind === 1 ? '#cde3ff' : '#ffffff');
    ctx.beginPath(); ctx.arc(px, py, baseR, 0, FU2PI); ctx.fill();
  }
  ctx.globalAlpha = 1;

  const fuDrawHole = (hx, hy, hr, rotN, br, cph) => {
    const shadowR = hr * 0.62;
    const photonR = hr;
    const diskIn  = hr * 1.12;
    const diskOut = hr * 2.55;
    const glowR   = hr * 3.3;
    const clumpA  = (cph == null ? rotN : cph);
    ctx.save();
    ctx.translate(hx, hy);

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const halo = ctx.createRadialGradient(0, 0, hr * 0.25, 0, 0, glowR);
    halo.addColorStop(0, 'rgba(255,180,95,' + (0.42 * br) + ')');
    halo.addColorStop(0.3, 'rgba(255,130,70,' + (0.16 * br) + ')');
    halo.addColorStop(1, 'rgba(255,130,70,0)');
    ctx.fillStyle = halo; ctx.fillRect(-glowR, -glowR, glowR * 2, glowR * 2);
    ctx.restore();

    ctx.save();
    ctx.rotate(rotN);
    ctx.scale(1, 0.34);
    const dg = ctx.createLinearGradient(0, -diskOut, 0, diskOut);
    dg.addColorStop(0, 'rgba(255,160,90,0)');
    dg.addColorStop(0.34, 'rgba(255,120,50,' + (0.10 * br) + ')');
    dg.addColorStop(0.46, 'rgba(255,150,70,' + (0.18 * br) + ')');
    dg.addColorStop(0.52, 'rgba(255,205,140,' + (0.34 * br) + ')');
    dg.addColorStop(0.58, 'rgba(255,246,220,' + (0.60 * br) + ')');
    dg.addColorStop(0.64, 'rgba(255,180,100,' + (0.24 * br) + ')');
    dg.addColorStop(0.74, 'rgba(255,120,50,' + (0.10 * br) + ')');
    dg.addColorStop(1, 'rgba(255,90,40,0)');
    ctx.fillStyle = dg;
    ctx.beginPath();
    ctx.ellipse(0, 0, diskOut, diskOut, 0, 0, FU2PI);
    ctx.ellipse(0, 0, diskIn, diskIn, 0, 0, FU2PI);
    ctx.fill('evenodd');

    ctx.lineWidth = hr * 0.05;
    ctx.strokeStyle = 'rgba(255,240,210,' + (0.16 * br) + ')';
    ctx.beginPath(); ctx.ellipse(0, 0, diskIn * 1.06, diskIn * 1.06, 0, 0, FU2PI); ctx.stroke();
    for(let b = 1; b <= 5; b++){
      const bk = b / 6;
      const rad = diskIn + (diskOut - diskIn) * (0.16 + 0.84 * bk * bk);
      ctx.lineWidth = 1.1 + bk * 1.8;
      ctx.strokeStyle = 'rgba(' + Math.round(255 - 30 * bk) + ',' + Math.round(150 + 70 * bk) + ',' + Math.round(70 + 20 * bk) + ',' + ((0.05 + 0.05 * bk) * br) + ')';
      ctx.beginPath(); ctx.ellipse(0, 0, rad, rad, 0, 0, FU2PI); ctx.stroke();
    }

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.85 * br;
    ctx.strokeStyle = '#fff7e8';
    ctx.lineWidth = hr * 0.16;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(0, 0, diskIn * 1.28, clumpA + 0.28, clumpA + 1.05); ctx.stroke();
    ctx.globalAlpha = 0.42 * br;
    ctx.lineWidth = hr * 0.10;
    ctx.beginPath(); ctx.arc(0, 0, diskIn * 1.28, clumpA + 2.85, clumpA + 3.5); ctx.stroke();
    ctx.restore();
    ctx.restore();

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = 'rgba(255,170,105,' + (0.13 * br) + ')';
    ctx.lineWidth = hr * 0.10;
    ctx.beginPath(); ctx.arc(0, 0, photonR * 1.1, 0, FU2PI); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,236,205,' + (0.85 * br) + ')';
    ctx.lineWidth = hr * 0.022;
    ctx.beginPath(); ctx.arc(0, 0, photonR, 0, FU2PI); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,' + (0.38 * br) + ')';
    ctx.lineWidth = hr * 0.010;
    ctx.beginPath(); ctx.arc(0, 0, photonR * 0.99, 0, FU2PI); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,246,224,' + (0.25 * br) + ')';
    ctx.lineWidth = hr * 0.016;
    ctx.beginPath(); ctx.arc(0, 0, photonR, 0.9, 2.3); ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = 'rgba(255,190,120,' + (0.14 * br) + ')';
    ctx.lineWidth = hr * 0.02;
    ctx.beginPath(); ctx.ellipse(0, hr * 0.08, shadowR * 0.42, shadowR * 0.17, 0, 0, FU2PI); ctx.stroke();
    ctx.restore();

    ctx.beginPath(); ctx.arc(0, 0, shadowR, 0, FU2PI);
    ctx.fillStyle = '#000'; ctx.fill();
    ctx.restore();
  };

  if(appear > 0.001 && endFade > 0.001){
    const al = fuEase(Math.min(1, appear * 1.4)) * endFade;

    if(inInsp){
      const pr = (0.5 + 0.5 * Math.sin(t * 3)) * bhO * 1.6;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.beginPath(); ctx.arc(cx, cy, pr, 0, FU2PI);
      ctx.strokeStyle = 'rgba(180,220,255,' + (0.10 * insp) + ')';
      ctx.lineWidth = 0.9;
      ctx.stroke();
      ctx.restore();
    }

    if(inInsp) fuDrawHole(sx, sy, secR, spin + 0.75, al * 0.85, t * 3.3 + 0.9);
    fuDrawHole(cx, cy, primR, spin, al, t * 2.7);

    if(mergedF > 0){
      const fl = Math.exp(-mergedF * 4.2);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const flash = ctx.createRadialGradient(cx, cy, 2, cx, cy, bhO * 3.2);
      flash.addColorStop(0, 'rgba(255,240,220,' + (0.85 * fl) + ')');
      flash.addColorStop(0.4, 'rgba(255,180,120,' + (0.35 * fl) + ')');
      flash.addColorStop(1, 'rgba(255,160,110,0)');
      ctx.fillStyle = flash; ctx.fillRect(cx - bhO * 3.4, cy - bhO * 3.4, bhO * 6.8, bhO * 6.8);
      ctx.globalCompositeOperation = 'source-over';
      ctx.restore();
      for(let k = 0; k < 3; k++){
        const rw = bhO * (1.1 + mergedF * (3.4 + k * 1.1));
        ctx.beginPath(); ctx.arc(cx, cy, rw, 0, FU2PI);
        ctx.strokeStyle = 'rgba(190,225,255,' + (0.34 * Math.max(0, 1 - mergedF * (1.6 + k * 0.4))) + ')';
        ctx.lineWidth = 1.3 - k * 0.3;
        ctx.stroke();
      }
    }
  }

  const grd = ctx.createRadialGradient(W * 0.5, H * 0.5, H * 0.12, W * 0.5, H * 0.5, H * 0.72);
  grd.addColorStop(0, 'rgba(2,4,12,0)');
  grd.addColorStop(1, 'rgba(2,4,12,.42)');
  ctx.fillStyle = grd; ctx.fillRect(0, 0, W, H);
}
function fuSatStart(){
  const cv = document.getElementById('fuSat');
  if(!cv || typeof cv.getContext !== 'function' || fuSatId) return;
  const ctx = cv.getContext('2d');
  if(!ctx || typeof ctx.createRadialGradient !== 'function') return;
  fuBH = null;
  fuEnsureScene();
  let reduced = false;
  if(typeof matchMedia === 'function'){ try{ reduced = matchMedia('(prefers-reduced-motion: reduce)').matches; }catch(e){} }
  const draw = (now) => {
    if(fuSatLast == null) fuSatLast = now;
    const dt = Math.min(0.1, (now - fuSatLast) / 1000);
    fuSatLast = now;
    fuSatT += dt;
    const r = cv.parentElement ? cv.parentElement.getBoundingClientRect() : { width: 440, height: 248 };
    const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
    const W = Math.max(40, Math.round(r.width)), H = Math.max(40, Math.round(r.height));
    const cw = Math.round(W * dpr), ch = Math.round(H * dpr);
    if(cv.width !== cw || cv.height !== ch){ cv.width = cw; cv.height = ch; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    try{ fuSatDraw(ctx, W, H, fuSatT); }catch(e){}
    if(reduced) return;
    fuSatId = requestAnimationFrame(draw);
  };
  fuSatId = requestAnimationFrame(draw);
}
function fuSatStop(){
  if(fuSatId){ cancelAnimationFrame(fuSatId); fuSatId = null; }
  fuSatLast = null;
}

function openFocusMode(subjectId, unitId, lectureId){
  rememberOpener('focusOverlay');
  const s = (data.subjects||[]).find(x=>x.id===subjectId);
  const u = s ? (Array.isArray(s.units) ? s.units : []).find(x=>x && x.id===unitId) : null;
  const l = u ? (Array.isArray(u.lectures) ? u.lectures : []).find(x=>x && x.id===lectureId) : null;
  if(!l) return;
  focusRef = {subjectId, unitId, lectureId};
  focusSessionReset();
  document.getElementById('focusSubjectUnit').textContent = `${s.name.toUpperCase()} · ${u.name.toUpperCase()}`;
  document.getElementById('focusTitle').textContent = l.title;
  const vidWrap = document.getElementById('focusVideoWrap');
  const ytId = getYouTubeId(l.link);
  if(ytId){
    fuStop();
    vidWrap.innerHTML = `<iframe src="https://www.youtube.com/embed/${ytId}?rel=0" title="${escapeAttr(l.title)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
  } else if(l.link){
    vidWrap.innerHTML = focusUniverseHtml('<a class="fu-link-btn" href="' + escapeAttr(safeHref(l.link)) + '" target="_blank" rel="noopener">Open Resource ↗</a>');
    fuStart();
  } else {
    vidWrap.innerHTML = focusUniverseHtml('<span class="fu-no-link-label">No link attached — deep focus engaged</span>');
    fuStart();
  }
  renderFocusControls();
  document.getElementById('focusNotes').textContent = l.notes || '';
  const ov = document.getElementById('focusOverlay');
  ov.classList.add('mode-immersive');
  ov.classList.toggle('mode-video', !!ytId);
  ov.classList.toggle('mode-universe', !ytId);
  ov.classList.add('show');
  if(typeof mascotOnFocusEnter === 'function') mascotOnFocusEnter(subjectId, unitId, lectureId);
}

function renderFocusControls(){
  if(!focusRef) return;
  const l = getLecture(focusRef.subjectId, focusRef.unitId, focusRef.lectureId);
  if(!l) return;
  const isRunning = !!l.timerStart;
  const liveSec = liveLectureSeconds(l);
  const sess = focusSession;
  const immersive = document.getElementById('focusOverlay').classList.contains('mode-immersive');
  const controls = document.getElementById('focusControls');
  controls.innerHTML = `
    <div class="timer-pill large ${isRunning?'running':(liveSec>0?'has-time':'')}">
      <button class="timer-btn" onclick="sparkAt(this,'${isRunning?'var(--pencil)':'var(--green)'}'); toggleTimer('${focusRef.subjectId}','${focusRef.unitId}','${focusRef.lectureId}'); renderFocusControls();" title="${isRunning?'Stop timer':'Start timer'}">${isRunning?'⏸':'▶'}</button>
      <span class="timer-time" id="focusTimerDisplay">${isRunning ? formatCompactLive(liveSec) : formatHuman(liveSec)}</span>
      ${isRunning ? ekgLine('focus') : ''}
    </div>
    ${(immersive && sess.mode === 'running') ? `<button class="focus-pause" onclick="focusSessionPause();" title="${sess.paused?'Resume session':'Pause session'}">${sess.paused ? '▶ Resume' : '⏸ Pause'}</button>` : ''}
    <div class="omr ${l.completed?'done':''}" onclick="sparkAt(this,'${l.completed?'var(--ink-soft)':'var(--green)'}'); toggleLecture('${focusRef.subjectId}','${focusRef.unitId}','${focusRef.lectureId}'); renderFocusControls();" title="Mark ${l.completed?'incomplete':'complete'}">${l.completed ? mythicalCheckGlyph('focus-'+focusRef.lectureId) : ''}</div>
  `;
}

function closeFocusMode(){
  if(focusSession.mode === 'running'){
    focusWarnExit();
    return;
  }
  forceCloseFocusMode();
}
// Bank the focus session's elapsed time into the lecture's tracked seconds
// and daily log. Returns the number of focus-seconds that were banked (0 if
// nothing was added — session was idle, already committed, or banked via the
// lecture's own manual timer which stopTimer() handled).
function focusCommitTimeToLecture(){
  const s = focusSession;
  const ref = focusRef;
  if(!ref || s.committed) return 0;
  const l = getLecture(ref.subjectId, ref.unitId, ref.lectureId);
  let sec = 0;
  if(s.mode === 'done'){
    sec = s.totalSec || 0;
  } else if(s.mode === 'running'){
    sec = Math.max(0, (s.totalSec || 0) - (s.remainingSec || 0));
  }
  if(sec <= 0) return 0;
  s.committed = true;
  if(l && l.timerStart && runningRef && runningRef.lectureId === ref.lectureId){
    stopTimer();
    return sec;
  }
  if(l){
    l.seconds = (l.seconds || 0) + sec;
    addToDailyLog(ref.subjectId, sec);
    saveData();
    try{ renderToday(); renderScorecard(); }catch(e){}
  }
  return sec;
}
function forceCloseFocusMode(){
  const banked = focusCommitTimeToLecture();
  focusSessionStop();
  const ov = document.getElementById('focusOverlay');
  ov.classList.remove('show');
  ov.classList.remove('mode-immersive', 'mode-video', 'mode-universe', 'focus-running');
  document.getElementById('focusVideoWrap').innerHTML = '';
  focusRef = null;
  restoreOpener('focusOverlay');
  if(banked > 0) showToast(formatHuman(banked) + ' of focus added to lecture time ✓');
  if(typeof mascotOnFocusExit === 'function') mascotOnFocusExit();
}

function testRow(subjectId, unitId, t, idx){
  const pct = testPct(t);
  const hasQ = t.questions && t.questions.trim().length>0;
  const isOpen = expandedTests.has(t.id);
  return `
    <div class="test-item" style="--i:${idx||0}">
      <div class="test-row">
        <div class="test-icon">🏆</div>
        <div class="test-mid">
          <div class="test-name-row">
            <span class="test-name">${escapeHtml(t.name || 'Test')}</span>
            <span class="test-badge">Completed</span>
          </div>
        </div>
        <div class="test-score-block">
          <span class="test-score">${t.obtained}/${t.total}</span>
          <span class="test-pct">${Math.round(pct)}%</span>
        </div>
        <div class="test-actions" onclick="event.stopPropagation()">
          <button class="icon-btn" title="Edit" onclick="openEditTest('${subjectId}','${unitId}','${t.id}')">✎</button>
          <button class="icon-btn" title="Delete" onclick="deleteTest('${subjectId}','${unitId}','${t.id}')">✕</button>
        </div>
      </div>
      <div class="test-stats-row">
        <div class="test-stat"><b>${t.total}</b><span>Total Questions</span></div>
        <div class="test-stat"><b>${t.obtained}</b><span>Your Score</span></div>
        <div class="test-stat"><b>${Math.round(pct)}%</b><span>Accuracy</span></div>
      </div>
      ${hasQ ? `<button class="test-details-btn" onclick="toggleTestExpand('${t.id}')">${isOpen?'▾ Hide details':'📈 View Details'}</button>` : ''}
      ${(hasQ && isOpen) ? `<div class="test-questions">${escapeHtml(t.questions)}</div>` : ''}
    </div>`;
}

const HTML_ESCAPE_MAP = { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' };
function escapeHtml(str){
  return (str === null || str === undefined ? '' : String(str)).replace(/[&<>"']/g, (ch) => HTML_ESCAPE_MAP[ch]);
}
function ekgLine(uid){
  const d = 'M0,12 L8,12 L11,9 L14,15 L17,12 L23,12 L26,3 L29,21 L32,12 L38,12 L41,9 L44,15 L47,12 L60,12 '
           + 'M60,12 L68,12 L71,9 L74,15 L77,12 L83,12 L86,3 L89,21 L92,12 L98,12 L101,9 L104,15 L107,12 L120,12';
  return `<span class="ekg-wrap"><svg class="ekg-svg" viewBox="0 0 120 22" preserveAspectRatio="none">
    <defs><linearGradient id="ekgGrad-${uid}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#ff5f6d"/>
      <stop offset="35%" stop-color="#ffb648"/>
      <stop offset="65%" stop-color="#39c98f"/>
      <stop offset="100%" stop-color="#7c5cbf"/>
    </linearGradient></defs>
    <path d="${d}" fill="none" stroke="url(#ekgGrad-${uid})" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg></span>`;
}
function escapeAttr(str){
  return (str||'').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function safeHref(url){
  const s = String(url || '').trim();
  return /^(https?:\/\/|mailto:|#|\/)/i.test(s) && !/javascript:/i.test(s) ? s : '';
}
