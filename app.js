const state = { pool: [], index: 0, score: 0, answered: 0, selections: {}, submitted: {}, correct: {}, mode: 'menu', infinite: false, study: false, autoMoving: false, timer: null };
const $ = (id) => document.getElementById(id);
const alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

function shuffle(arr){
  const a=[...arr];
  for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; }
  return a;
}
function sample(arr,n){ return shuffle(arr).slice(0, Math.min(n, arr.length)); }
function show(id){ ['home','quiz','result'].forEach(x=>$(x).classList.toggle('hidden', x!==id)); }
function makeQuestion(q){ return {...q, displayOptions: $('jumble').checked ? shuffle(q.options) : [...q.options]}; }

function start(mode,count){
  const all = QUESTIONS.map(makeQuestion);
  clearTimeout(state.timer); state.autoMoving=false; state.mode=mode; state.infinite=false; state.study=mode==='study'; state.index=0; state.score=0; state.answered=0; state.selections={}; state.submitted={}; state.correct={};
  if(mode==='sequence') state.pool = all;
  else if(mode==='random') state.pool = sample(all, count==='all'?all.length:Number(count));
  else state.pool = all;
  $('modeLabel').textContent = mode==='study'?'Study MCQs': mode==='sequence'?'Sequence':'Random';
  show('quiz');
  if(state.study) renderStudy(); else render();
}

function current(){ return state.pool[state.index]; }
function answerSet(q){ return new Set((q.answer||'').replace(/[^A-Z]/g,'').split('')); }
function selectionSet(q){ return new Set(state.selections[q.id] || []); }
function setsEqual(a,b){ if(a.size!==b.size) return false; for(const x of a){ if(!b.has(x)) return false; } return true; }
function correctText(q){ return q.options.filter(o=>answerSet(q).has(o.id)).map(o=>`${o.id}. ${o.text}`).join(' | '); }

function render(){
  const q=current(); if(!q) return finish();
  document.querySelector('.topbar').classList.remove('study-topbar');
  $('questionText').textContent=q.question;
  $('score').textContent=state.score; $('answered').textContent=state.answered;
  $('qCounter').textContent = `${state.index+1}/${state.pool.length}`;
  $('progressFill').style.width = `${((state.index+1)/state.pool.length)*100}%`;
  const multi = answerSet(q).size > 1;
  const submitted = !!state.submitted[q.id];
  const selected = selectionSet(q);
  $('options').className='options';
  $('options').innerHTML='';
  q.displayOptions.forEach((opt,i)=>{
    const label=document.createElement('label'); label.className='option';
    if(submitted){
      const ans=answerSet(q);
      if(ans.has(opt.id)) label.classList.add('correct');
      else if(selected.has(opt.id)) label.classList.add('wrong');
    }
    label.innerHTML = `<input type="${multi?'checkbox':'radio'}" name="opt" value="${opt.id}" ${selected.has(opt.id)?'checked':''} ${submitted?'disabled':''}> <span class="letter">${opt.id}.</span><span>${escapeHtml(opt.text)}</span>`;
    label.querySelector('input').addEventListener('change', e => choose(opt.id, multi, e.target.checked));
    $('options').appendChild(label);
  });
  $('submitBtn').classList.add('hidden');
  $('prevBtn').classList.remove('hidden');
  $('nextBtn').classList.remove('hidden');
  $('prevBtn').disabled = state.index===0 || state.autoMoving;
  $('nextBtn').disabled = state.autoMoving;
  $('nextBtn').textContent = state.autoMoving ? 'Moving...' : (state.index===state.pool.length-1?'Finish':'Next');
  renderFeedback();
}

function renderStudy(){
  document.querySelector('.topbar').classList.add('study-topbar');
  $('qCounter').textContent = `${state.pool.length} questions`;
  $('progressFill').style.width = '100%';
  $('score').textContent='0'; $('answered').textContent='0';
  $('questionText').textContent='Study MCQs - scroll all questions';
  $('feedback').className='feedback hidden'; $('explanationBox').classList.add('hidden');
  $('prevBtn').classList.add('hidden'); $('submitBtn').classList.add('hidden'); $('nextBtn').classList.add('hidden');
  $('options').className='study-list';
  $('options').innerHTML='';
  state.pool.forEach((q, qi)=>{
    const card=document.createElement('div'); card.className='study-card';
    const opts = q.displayOptions.map((opt,i)=>{
      const isCorrect = answerSet(q).has(opt.id);
      return `<div class="study-option ${isCorrect?'correct':''}"><span class="letter">${opt.id}.</span><span>${escapeHtml(opt.text)}</span>${isCorrect?'<span class="badge">Correct</span>':''}</div>`;
    }).join('');
    card.innerHTML = `<div class="q-meta">Question ${qi+1} / ${state.pool.length}</div><h3>${escapeHtml(q.question)}</h3><div class="study-options">${opts}</div><div class="feedback good">Correct answer: ${correctText(q)}</div>`;
    $('options').appendChild(card);
  });
}

function choose(id,multi,checked){
  const q=current();
  let s = state.selections[q.id] || [];
  if(multi){ s = checked ? [...new Set([...s,id])] : s.filter(x=>x!==id); }
  else s=[id];
  state.selections[q.id]=s;
}
function submit(){
  const q=current();
  if(!q) return false;
  if((state.selections[q.id]||[]).length===0){ alert('Please select an option first.'); return false; }
  if(!state.submitted[q.id]){
    const ok = setsEqual(selectionSet(q), answerSet(q));
    state.submitted[q.id]=true;
    state.correct[q.id]=ok;
    state.answered++;
    if(ok) state.score++;
  }
  render();
  state.autoMoving = true;
  clearTimeout(state.timer);
  state.timer = setTimeout(advanceNow, 2500);
  render();
  return true;
}
function renderFeedback(){
  const q=current(); const submitted=!!state.submitted[q.id];
  $('feedback').className='feedback hidden'; $('explanationBox').classList.add('hidden');
  if(!submitted) return;
  const ok = !!state.correct[q.id];
  $('feedback').className = `feedback ${ok?'good':'bad'}`;
  if(ok){
    $('feedback').textContent = 'Correct! Your selected option is correct.';
  } else {
    const chosen = [...selectionSet(q)].map(id => {
      const opt = q.options.find(o => o.id === id);
      return opt ? `${id}. ${opt.text}` : id;
    }).join(' | ');
    $('feedback').textContent = `Wrong. Your answer: ${chosen}. Correct answer: ${correctText(q)}`;
  }
  $('explanationBox').classList.remove('hidden');
  $('explanationText').textContent = q.explanation || '';
}
function advanceNow(){
  state.autoMoving = false;
  if(state.index < state.pool.length-1){
    state.index++;
    render();
  } else {
    finish();
  }
}
function next(){
  if(state.autoMoving) return;
  const q=current();
  if(!q) return finish();
  if(!state.submitted[q.id]){
    if(!submit()) return;
  } else {
    advanceNow();
  }
}
function prev(){ if(state.index>0){ state.index--; render(); } }
function finish(){
  const pct = state.answered ? Math.round((state.score/state.answered)*100) : 0;
  $('finalScore').textContent=pct;
  $('finalText').textContent=`You scored ${state.score} out of ${state.answered}.`;
  show('result');
}
function escapeHtml(s){ return String(s).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch])); }

document.querySelectorAll('[data-mode]').forEach(btn=>btn.addEventListener('click',()=>start(btn.dataset.mode, btn.dataset.count)));
$('submitBtn').addEventListener('click', submit); $('nextBtn').addEventListener('click', next); $('prevBtn').addEventListener('click', prev);
$('backBtn').addEventListener('click', ()=>{ clearTimeout(state.timer); state.autoMoving=false; show('home'); }); $('restartBtn').addEventListener('click', ()=>{ clearTimeout(state.timer); state.autoMoving=false; show('home'); });
if ($('totalCount')) $('totalCount').textContent = QUESTIONS.length;
