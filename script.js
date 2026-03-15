// ─── State ───────────────────────────────────────────────────────
const COLS = ['todo','doing','done'];
const ALL_TAGS = ['high','medium','low','design','dev','qa','docs','review'];
let tasks = {};
let dragId = null;
let editId = null;
let activeForm = null;
let selectedTags = [];
let editTags = [];

function uid(){ return 'id_' + Math.random().toString(36).slice(2,9) + Date.now().toString(36); }
function dateStr(){ return new Date().toLocaleDateString('en-GB',{day:'numeric',month:'short'}); }
function save(){ localStorage.setItem('kanban_v3', JSON.stringify(tasks)); }
function findTask(id){ for(const c of COLS){ const t=tasks[c].find(x=>x.id===id); if(t) return t; } }
function findCol(id){ return COLS.find(c=>tasks[c].some(t=>t.id===id)); }
function escH(s){ return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

function initState(){
  const s = localStorage.getItem('kanban_v3');
  if(s){
    tasks = JSON.parse(s);
    COLS.forEach(c=>{ if(!tasks[c]) tasks[c]=[]; });
  } else {
    tasks = {
      todo:[
        {id:uid(),text:'Set up project repository & README',tags:['dev'],created:dateStr()},
        {id:uid(),text:'Design wireframes for the dashboard UI',tags:['design','high'],created:dateStr()},
        {id:uid(),text:'Write API documentation for all endpoints',tags:['docs','medium'],created:dateStr()},
      ],
      doing:[
        {id:uid(),text:'Implement user authentication flow',tags:['dev','high'],created:dateStr()},
        {id:uid(),text:'Review open pull requests',tags:['review'],created:dateStr()},
      ],
      done:[
        {id:uid(),text:'Project kickoff and planning meeting',tags:['low'],created:dateStr()},
        {id:uid(),text:'Set up CI/CD pipeline with GitHub Actions',tags:['dev'],created:dateStr()},
      ]
    };
    save();
  }
}

// ─── Render ──────────────────────────────────────────────────────
function render(){
  COLS.forEach(col=>{
    const list = tasks[col];
    const el = document.getElementById('tasks-'+col);
    const emojis = {todo:'📝',doing:'⚡',done:'✅'};
    const empties = {todo:'No tasks yet — hit + to add one!',doing:'Nothing in progress',done:'No completed tasks yet'};
    if(!list.length){
      el.innerHTML=`<div class="empty-state"><div class="empty-icon">${emojis[col]}</div><span>${empties[col]}</span></div>`;
    } else {
      el.innerHTML=list.map(t=>cardHTML(t,col)).join('');
    }
    document.getElementById('cnt-'+col).textContent=list.length;
  });
  document.getElementById('stat-todo').textContent=tasks.todo.length;
  document.getElementById('stat-doing').textContent=tasks.doing.length;
  document.getElementById('stat-done').textContent=tasks.done.length;
}

function cardHTML(t,col){
  const tagsHTML = t.tags.map(tag=>`<span class="tag tag-${tag}">${tag}</span>`).join('');
  const isDone = col==='done';
  return `<div class="task-card" id="${t.id}" draggable="true"
    ondragstart="onDragStart(event,'${t.id}')" ondragend="onDragEnd(event)">
    <div class="task-top">
      <span class="task-text${isDone?' done-text':''}">${escH(t.text)}</span>
      <div class="task-actions">
        <button class="action-btn edit-btn" onclick="openEdit('${t.id}')" title="Edit task">✏️</button>
        <button class="action-btn del-btn" onclick="deleteTask('${t.id}')" title="Delete task">🗑️</button>
      </div>
    </div>
    <div class="task-footer">
      <div class="tags">${tagsHTML}</div>
      <span class="task-date">${t.created||''}</span>
    </div>
  </div>`;
}

// ─── Add Form ────────────────────────────────────────────────────
function showAddForm(col){
  if(activeForm===col){ hideForm(col); return; }
  if(activeForm) hideForm(activeForm);
  activeForm=col; selectedTags=[];
  const chips = ALL_TAGS.map(t=>`<button class="opt-chip chip-${t}" onclick="toggleTag(this,'${t}')">${t}</button>`).join('');
  document.getElementById('form-'+col).innerHTML=`
    <div class="add-form">
      <textarea id="new-task-text" placeholder="What needs to be done?" rows="2"></textarea>
      <div class="form-options">${chips}</div>
      <div class="form-actions">
        <button class="btn-cancel" onclick="hideForm('${col}')">Cancel</button>
        <button class="btn-save" onclick="addTask('${col}')">Add Task</button>
      </div>
    </div>`;
  const ta = document.getElementById('new-task-text');
  ta.focus();
  ta.addEventListener('keydown', e=>{
    if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); addTask(col); }
    if(e.key==='Escape') hideForm(col);
  });
}

function hideForm(col){
  document.getElementById('form-'+col).innerHTML='';
  activeForm=null; selectedTags=[];
}

function toggleTag(btn,tag){
  const i=selectedTags.indexOf(tag);
  if(i>-1){ selectedTags.splice(i,1); btn.classList.remove('selected'); }
  else { selectedTags.push(tag); btn.classList.add('selected'); }
}

function addTask(col){
  const txt = document.getElementById('new-task-text').value.trim();
  if(!txt){ const el=document.getElementById('new-task-text'); el.style.outline='2px solid #FF6B6B'; el.style.borderRadius='8px'; setTimeout(()=>el.style.outline='',600); return; }
  tasks[col].unshift({id:uid(),text:txt,tags:[...selectedTags],created:dateStr()});
  save(); hideForm(col); render();
  showToast('Task added ✨');
}

// ─── Edit Modal ──────────────────────────────────────────────────
function openEdit(id){
  const task=findTask(id); if(!task) return;
  editId=id; editTags=[...task.tags];
  document.getElementById('modal-text').value=task.text;
  document.getElementById('modal-chips').innerHTML=ALL_TAGS.map(t=>`
    <button class="opt-chip chip-${t}${editTags.includes(t)?' selected':''}" onclick="toggleEditTag(this,'${t}')">${t}</button>
  `).join('');
  document.getElementById('modal').style.display='flex';
  setTimeout(()=>document.getElementById('modal-text').focus(),50);
}

function toggleEditTag(btn,tag){
  const i=editTags.indexOf(tag);
  if(i>-1){ editTags.splice(i,1); btn.classList.remove('selected'); }
  else { editTags.push(tag); btn.classList.add('selected'); }
}

function saveEdit(){
  const txt=document.getElementById('modal-text').value.trim();
  if(!txt) return;
  const task=findTask(editId);
  if(task){ task.text=txt; task.tags=[...editTags]; }
  save(); render();
  document.getElementById('modal').style.display='none';
  showToast('Task updated 💾');
}

function closeModal(e){ if(e.target.id==='modal') document.getElementById('modal').style.display='none'; }

// ─── Delete ───────────────────────────────────────────────────────
function deleteTask(id){
  COLS.forEach(c=>{ tasks[c]=tasks[c].filter(t=>t.id!==id); });
  save(); render();
  showToast('Task deleted 🗑️');
}

// ─── Drag & Drop ──────────────────────────────────────────────────
function onDragStart(e,id){
  dragId=id; e.dataTransfer.effectAllowed='move';
  setTimeout(()=>{ const el=document.getElementById(id); if(el) el.classList.add('dragging'); },0);
}
function onDragEnd(e){
  if(dragId){ const el=document.getElementById(dragId); if(el) el.classList.remove('dragging'); }
  COLS.forEach(c=>{
    document.getElementById('col-'+c).classList.remove('drag-over');
    document.getElementById('tasks-'+c).classList.remove('drag-active');
  });
  dragId=null;
}
function onDragOver(e,col){
  e.preventDefault(); e.dataTransfer.dropEffect='move';
  document.getElementById('col-'+col).classList.add('drag-over');
  document.getElementById('tasks-'+col).classList.add('drag-active');
}
function onDragLeave(e){
  const col=e.currentTarget.id.replace('col-','');
  document.getElementById('col-'+col).classList.remove('drag-over');
  document.getElementById('tasks-'+col).classList.remove('drag-active');
}
function onDrop(e,toCol){
  e.preventDefault(); if(!dragId) return;
  const fromCol=findCol(dragId); if(!fromCol) return;
  if(fromCol===toCol){ onDragEnd(e); return; }
  const task=tasks[fromCol].find(t=>t.id===dragId);
  tasks[fromCol]=tasks[fromCol].filter(t=>t.id!==dragId);
  tasks[toCol].unshift(task);
  save(); render(); onDragEnd(e);
  const names={todo:'To Do',doing:'Doing',done:'Done'};
  showToast(`Moved to ${names[toCol]} ✅`);
}

// ─── Toast ───────────────────────────────────────────────────────
let toastTimer;
function showToast(msg){
  let t=document.querySelector('.toast'); if(t) t.remove();
  t=document.createElement('div'); t.className='toast'; t.textContent=msg;
  document.body.appendChild(t);
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>{ t.style.opacity='0'; t.style.transition='opacity 0.4s'; setTimeout(()=>t.remove(),400); },2400);
}

// ─── Init ────────────────────────────────────────────────────────
initState();
render();
document.addEventListener('keydown', e=>{
  if(e.key==='Escape') document.getElementById('modal').style.display='none';
});