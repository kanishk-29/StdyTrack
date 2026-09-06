// Unified back navigation for Study Tracker.
// 1. A single, always-consistent back button (fixed bottom-left) appears every
//    time there is something to go back to — a modal, slide, drawer, folder
//    dashboard, subjects landing, subject page, or a non-default sub-view.
// 2. The browser/hardware back button is wired the same way: opening a surface
//    pushes a history entry; pressing Back pops it and closes that surface.
//
// HOW IT STAYS SAFE
//  - Only user-driven surface/openings push history (never boot or re-renders).
//  - UI close paths (Esc, ✕, backdrop, restoreOpener) collapse the pushed entry
//    so the history stack stays exactly as deep as what is open.
//  - popstate only acts when we know a surface entry exists (navDepth > 0), so
//    unrelated history entries and reloads are ignored.
(function(){
  if(window.__backNavInstalled) return;
  window.__backNavInstalled = true;

  var suppress = false; // true while handling popstate, so close→open cascades don't push
  var pending = false;  // true for a few ms after a push, so delegated opens don't double-push
  var navDepth = 0;

  function id(n){ return document.getElementById(n); }

  // Which context is open right now (priority order mirrors the global Escape
  // close chain, extended with the subject page and sub-view fallback).
  function shownState(){
    var f = id('focusOverlay');
    if(f && f.classList.contains('show')) return { tag:'focus', close:function(){ if(typeof closeFocusMode==='function') closeFocusMode(); } };
    var p = id('progressOverlay');
    if(p && p.classList.contains('show')) return { tag:'progress', close:function(){ if(typeof closeProgressSlide==='function') closeProgressSlide(); } };
    var slide = document.querySelector('.slide-overlay.show:not(#progressOverlay)');
    if(slide) return { tag:'slide-'+slide.id, close:function(){ if(typeof closeModal==='function') closeModal(slide.id); } };
    var d = id('subjectsDrawerOverlay');
    if(d && d.classList.contains('show')) return { tag:'drawer', close:function(){ if(typeof closeSubjectsDrawer==='function') closeSubjectsDrawer(); } };
    var fd = id('folderDashboard');
    if(fd && fd.style.display !== 'none') return { tag:'folder', close:function(){ if(typeof fdBack==='function') fdBack(); else fd.style.display='none'; } };
    var la = id('subjectsLanding');
    if(la && la.style.display !== 'none'){
      var manage = id('mslManagePanel');
      if(manage && manage.style.display !== 'none') return { tag:'manage', close:function(){ if(typeof mslCloseManage==='function') mslCloseManage(); } };
      return { tag:'landing', close:function(){ if(typeof closeMySubjectsLanding==='function') closeMySubjectsLanding(); } };
    }
    var ov = document.querySelector('.overlay.show');
    if(ov) return { tag:'overlay-'+ov.id, close:function(){ if(typeof closeModal==='function') closeModal(ov.id); } };
    if(window.subjectPageOpen === true) return { tag:'subject', close:function(){ if(typeof exitSubjectPage==='function') exitSubjectPage(); } };
    if(typeof currentView !== 'undefined' && currentView && currentView !== 'study') return { tag:'view-'+currentView, close:function(){ if(typeof showView==='function') showView('study'); } };
    return null;
  }

  function closeTopmost(){
    var s = shownState();
    if(!s) return false;
    try{ s.close(); }catch(e){}
    return true;
  }

  function collapseTop(){
    if(navDepth <= 0) return;
    navDepth--;
    try{ history.replaceState({}, '', location.pathname + location.search); }catch(e){}
    updateBtn();
  }

  function pushNav(){
    if(suppress || pending) return;
    pending = true;
    setTimeout(function(){ pending = false; }, 40);
    try{ history.pushState({ __stNav:true }, '', location.pathname + location.search); }catch(e){}
    navDepth++;
    updateBtn();
  }

  window.addEventListener('popstate', function(){
    if(navDepth <= 0) return; // not one of ours — ignore
    navDepth--;
    suppress = true;
    var before = shownState();
    try{ closeTopmost(); }catch(err){}
    var after = shownState();
    suppress = false;
    if(before && (!after || after.tag !== before.tag)) navDepth = Math.max(navDepth, 0);
    updateBtn();
  });

  function updateBtn(){
    var btn = id('navBackBtn');
    if(!btn) return;
    btn.classList.toggle('show', navDepth > 0 || !!shownState());
  }

  function navBack(){
    if(navDepth > 0){
      try{ history.back(); }catch(e){ closeTopmost(); }
    } else {
      closeTopmost();
    }
    updateBtn();
  }
  window.navBack = navBack;
  window.__navBackState = shownState; // (for tests)
  window.navBackDepth = function(){ return navDepth; };

  // Keep the button's visibility + the history stack in sync after every close
  // path: if the closest surface actually went away, collapse its history entry.
  var closers = ['closeModal','closeSubjectsDrawer','closeMySubjectsLanding','closeFolderDashboard','fdBack','exitSubjectPage','closeFocusMode','closeProgressSlide','mslCloseManage'];
  closers.forEach(function(name){
    var orig = window[name];
    if(typeof orig !== 'function') return;
    window[name] = function(){
      if(suppress) return orig.apply(this, arguments);
      var before = shownState();
      var r = orig.apply(this, arguments);
      var after = shownState();
      if(before && (!after || after.tag !== before.tag)) collapseTop();
      else updateBtn();
      return r;
    };
  });

  // Push a history entry (which also makes the back button appear) whenever a
  // page-level surface is opened by the user — and only if it really opened.
  var openers = ['openModal','openMySubjectsLanding','openFolderDashboard','openSubjectsDrawer','jumpToSubject','openProgressSlide','openFocusMode','openSettings','mslOpenManage'];
  openers.forEach(function(name){
    var orig = window[name];
    if(typeof orig !== 'function') return;
    window[name] = function(){
      if(suppress) return orig.apply(this, arguments);
      var before = shownState();
      var r = orig.apply(this, arguments);
      var after = shownState();
      if(after && (!before || after.tag !== before.tag)) pushNav();
      else updateBtn();
      return r;
    };
  });

  // Sub-view switching (Today / Gym & Reading): push on an onward switch,
  // collapse when coming back to the default Study view.
  var origShowView = window.showView;
  if(typeof origShowView === 'function'){
    window.showView = function(view){
      if(suppress) return origShowView.apply(this, arguments);
      var prev = window.currentView;
      var r = origShowView.apply(this, arguments);
      if(prev !== view && (view === 'priority' || view === 'habits')) pushNav();
      else if(prev !== view && (prev === 'priority' || prev === 'habits') && view === 'study') collapseTop();
      else updateBtn();
      return r;
    };
  }

  updateBtn();
})();