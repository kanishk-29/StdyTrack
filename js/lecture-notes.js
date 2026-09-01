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
  try{ document.execCommand('styleWithCSS', false, true); }catch(e){}
  applyNotesPaper();
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
  notesSyncCurrent();
  notesSavedRange = null;
  notesCurrentPage = i;
  const editor = document.getElementById('notesEditor');
  if(editor) editor.innerHTML = (notesPages[i] || '');
  updateNotesToolbarState();
  notesRenderPageBar();
  const editorEl = document.getElementById('notesEditor');
  if(editorEl){ editorEl.scrollTop = 0; editorEl.focus(); }
}
function notesAddPage(){
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
  const cur = notesCurrentHtml();
  if(cur && cur.replace(/<[^>]*>/g,'').trim()){
    if(!confirm('Delete this page and all its content?')) return;
  }
  notesPages.splice(notesCurrentPage, 1);
  if(notesCurrentPage >= notesPages.length) notesCurrentPage = notesPages.length - 1;
  notesSavedRange = null;
  const editor = document.getElementById('notesEditor');
  if(editor) editor.innerHTML = (notesPages[notesCurrentPage] || '');
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
  handleNotesInput();
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
    document.execCommand('insertHTML', false, sanitizeNotesHtml(html));
  } else {
    document.execCommand('insertText', false, text);
  }
  handleNotesInput();
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
    notesSyncCurrent();
    notesCurrentPage = match.page;
    editor.innerHTML = (notesPages[match.page] || '');
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
  const wasOpen = menu.classList.contains('show');
  closeUnitMenus();
  closeUnitSortMenus();
  closeLectureMenus();
  if(!wasOpen){
    menu.classList.add('show');
    if(row) row.classList.add('menu-active'); // lift this card above its siblings so the popover isn't covered by the next row
  }
}

function openFocusMode(subjectId, unitId, lectureId){
  rememberOpener('focusOverlay');
  const s = data.subjects.find(x=>x.id===subjectId);
  const u = s.units.find(x=>x.id===unitId);
  const l = u.lectures.find(x=>x.id===lectureId);
  if(!l) return;
  focusRef = {subjectId, unitId, lectureId};
  document.getElementById('focusSubjectUnit').textContent = `${s.name.toUpperCase()} · ${u.name.toUpperCase()}`;
  document.getElementById('focusTitle').textContent = l.title;
  const vidWrap = document.getElementById('focusVideoWrap');
  const ytId = getYouTubeId(l.link);
  if(ytId){
    vidWrap.innerHTML = `<iframe src="https://www.youtube.com/embed/${ytId}?rel=0" title="${escapeAttr(l.title)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
  } else if(l.link){
    vidWrap.innerHTML = `<div class="focus-no-video">This resource isn't a YouTube link.<br><a class="btn primary focus-open-btn" href="${escapeAttr(safeHref(l.link))}" target="_blank" rel="noopener">Open Resource ↗</a></div>`;
  } else {
    vidWrap.innerHTML = `<div class="focus-no-video">No link attached to this lecture yet.</div>`;
  }
  renderFocusControls();
  document.getElementById('focusNotes').textContent = l.notes || '';
  document.getElementById('focusOverlay').classList.add('show');
  if(typeof mascotOnFocusEnter === 'function') mascotOnFocusEnter(subjectId, unitId, lectureId);
}

function renderFocusControls(){
  if(!focusRef) return;
  const l = getLecture(focusRef.subjectId, focusRef.unitId, focusRef.lectureId);
  if(!l) return;
  const isRunning = !!l.timerStart;
  const liveSec = liveLectureSeconds(l);
  const controls = document.getElementById('focusControls');
  controls.innerHTML = `
    <div class="timer-pill large ${isRunning?'running':(liveSec>0?'has-time':'')}">
      <button class="timer-btn" onclick="sparkAt(this,'${isRunning?'var(--pencil)':'var(--green)'}'); toggleTimer('${focusRef.subjectId}','${focusRef.unitId}','${focusRef.lectureId}'); renderFocusControls();" title="${isRunning?'Stop timer':'Start timer'}">${isRunning?'⏸':'▶'}</button>
      <span class="timer-time" id="focusTimerDisplay">${isRunning ? formatCompactLive(liveSec) : formatHuman(liveSec)}</span>
      ${isRunning ? ekgLine('focus') : ''}
    </div>
    <div class="omr ${l.completed?'done':''}" onclick="sparkAt(this,'${l.completed?'var(--ink-soft)':'var(--green)'}'); toggleLecture('${focusRef.subjectId}','${focusRef.unitId}','${focusRef.lectureId}'); renderFocusControls();" title="Mark ${l.completed?'incomplete':'complete'}">${l.completed ? mythicalCheckGlyph('focus-'+focusRef.lectureId) : ''}</div>
  `;
}

function closeFocusMode(){
  document.getElementById('focusOverlay').classList.remove('show');
  document.getElementById('focusVideoWrap').innerHTML = '';
  focusRef = null;
  restoreOpener('focusOverlay');
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
  return (str||'').replace(/"/g,'&quot;');
}
function safeHref(url){
  const s = String(url || '').trim();
  return /^(https?:\/\/|mailto:|#|\/)/i.test(s) && !/javascript:/i.test(s) ? s : '';
}
