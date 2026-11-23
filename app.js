(function(){
  const $  = (sel)=>document.querySelector(sel);
  const $$ = (sel)=>Array.from(document.querySelectorAll(sel));
  const storeKey = 'invite_manager_v2';
  const cloudBaseKey = 'invite_manager_cloud_base_v1';

  const MAIN_STATUS_LABEL = { pool:"遇到的", yes:"积极回复", maybe:"很少回复", no:"几乎不回" };
  const FALL_STATUS_LABEL = { pool:"遇到的", yes:"积极回复", maybe:"很少回复", no:"几乎不回" };
  let activeListKey = 'fall2026';

  function updateStatusHeadings(){
    const labels = activeListKey === 'main' ? MAIN_STATUS_LABEL : FALL_STATUS_LABEL;
    ['pool','yes','maybe','no'].forEach(status=>{
      const title = document.querySelector(`.col[data-status="${status}"] h3 span:first-child`);
      if(title) title.textContent = labels[status];
    });
  }

  function emptyListData(){
    return {
      people: [], statuses: {},
      order: { pool:[], yes:[], maybe:[], no:[] },
      personNotes: {}
    };
  }

  function getListData(state, key=activeListKey){
    if(key === 'main') return state;
    state.campaigns = state.campaigns || {};
    state.campaigns[key] = state.campaigns[key] || emptyListData();
    return state.campaigns[key];
  }

  // —— 下方分类映射：id -> 'member' | 'baptism' | 'friend'
  function ensureBottomTypes(state){
    if(!state.bottomTypes) state.bottomTypes = {};
    const fallPeople = state.campaigns?.fall2026?.people || [];
    const nyuPeople = state.campaigns?.nyuBrooklyn?.people || [];
    const flushingPeople = state.campaigns?.flushing?.people || [];
    const allPeople = (state.people||[]).concat(fallPeople, nyuPeople, flushingPeople);
    const valid = new Set(allPeople.map(p=>p.id));
    Object.keys(state.bottomTypes).forEach(id=>{ if(!valid.has(id)) delete state.bottomTypes[id]; });
    allPeople.forEach(p=>{ if(!state.bottomTypes[p.id]) state.bottomTypes[p.id] = 'friend'; });
  }

  // —— 载入（带自修复：四列顺序 + 底部分类/顺序）
  function load(){
    const raw = localStorage.getItem(storeKey);
    if(!raw){
      const init = {
        people: [], statuses: {}, history: [],
        order: { pool:[], yes:[], maybe:[], no:[] },
        bottomTypes: {},
        bottomOrder: { member:[], baptism:[], friend:[] },
        personNotes: {}, // personId -> note 文本
        deletedPeople: { main:[], fall2026:[], nyuBrooklyn:[], flushing:[] },
        campaigns: { fall2026: emptyListData(), nyuBrooklyn: emptyListData(), flushing: emptyListData() },
        servants: [],
        notices: [],
        prayerPeople: [],
        prayerSessions: []
      };
      localStorage.setItem(storeKey, JSON.stringify(init));
      return init;
    }
    let state; try{ state = JSON.parse(raw); }catch{ state = {}; }

    if(!Array.isArray(state.servants)) state.servants = [];
    if(!state.people)   state.people   = [];
    if(!state.statuses) state.statuses = {};
    if(!state.history)  state.history  = [];
    if(!state.order)    state.order    = { pool:[], yes:[], maybe:[], no:[] };
    if(!state.bottomTypes)  state.bottomTypes  = {};
    if(!state.bottomOrder)  state.bottomOrder  = { member:[], baptism:[], friend:[] };
    if(!state.personNotes) state.personNotes = {};
    if(!state.deletedPeople) state.deletedPeople = { main:[], fall2026:[], nyuBrooklyn:[], flushing:[] };
    if(!Array.isArray(state.deletedPeople.main)) state.deletedPeople.main = [];
    if(!Array.isArray(state.deletedPeople.fall2026)) state.deletedPeople.fall2026 = [];
    if(!Array.isArray(state.deletedPeople.nyuBrooklyn)) state.deletedPeople.nyuBrooklyn = [];
    if(!Array.isArray(state.deletedPeople.flushing)) state.deletedPeople.flushing = [];
    if(!state.campaigns) state.campaigns = {};
    if(!state.campaigns.fall2026) state.campaigns.fall2026 = emptyListData();
    if(!state.campaigns.nyuBrooklyn) state.campaigns.nyuBrooklyn = emptyListData();
    if(!state.campaigns.flushing) state.campaigns.flushing = emptyListData();
    if(!Array.isArray(state.notices)) state.notices = [];
    if(!Array.isArray(state.prayerPeople)) state.prayerPeople = [];
    if(!Array.isArray(state.prayerSessions)) state.prayerSessions = [];

    const fall = state.campaigns.fall2026;
    if(!fall.people) fall.people = [];
    if(!fall.statuses) fall.statuses = {};
    if(!fall.order) fall.order = { pool:[], yes:[], maybe:[], no:[] };
    if(!fall.personNotes) fall.personNotes = {};

    const nyu = state.campaigns.nyuBrooklyn;
    if(!nyu.people) nyu.people = [];
    if(!nyu.statuses) nyu.statuses = {};
    if(!nyu.order) nyu.order = { pool:[], yes:[], maybe:[], no:[] };
    if(!nyu.personNotes) nyu.personNotes = {};


    const flushing = state.campaigns.flushing;
    if(!flushing.people) flushing.people = [];
    if(!flushing.statuses) flushing.statuses = {};
    if(!flushing.order) flushing.order = { pool:[], yes:[], maybe:[], no:[] };
    if(!flushing.personNotes) flushing.personNotes = {};

    ensureBottomTypes(state);

    // 顶部四列顺序自修复
    const validIds = new Set(state.people.map(p=>p.id));
    const bySt = { pool:[], yes:[], maybe:[], no:[] };
    state.people.forEach(p=>{
      const st = state.statuses[p.id] || 'pool';
      bySt[st].push(p.id);
    });
    ['pool','yes','maybe','no'].forEach(st=>{
      state.order[st] = (state.order[st]||[]).filter(id => validIds.has(id) && bySt[st].includes(id));
      bySt[st].forEach(id=>{ if(!state.order[st].includes(id)) state.order[st].push(id); });
    });

    // 开学季四列顺序自修复（独立于主名单）
    const fallIds = new Set(fall.people.map(p=>p.id));
    const fallBySt = { pool:[], yes:[], maybe:[], no:[] };
    fall.people.forEach(p=> fallBySt[fall.statuses[p.id] || 'pool'].push(p.id));
    ['pool','yes','maybe','no'].forEach(st=>{
      fall.order[st] = (fall.order[st]||[]).filter(id=>fallIds.has(id) && fallBySt[st].includes(id));
      fallBySt[st].forEach(id=>{ if(!fall.order[st].includes(id)) fall.order[st].push(id); });
    });

    // NYU- Brooklyn 四列顺序自修复（独立名单）
    const nyuIds = new Set(nyu.people.map(p=>p.id));
    const nyuBySt = { pool:[], yes:[], maybe:[], no:[] };
    nyu.people.forEach(p=> nyuBySt[nyu.statuses[p.id] || 'pool'].push(p.id));
    ['pool','yes','maybe','no'].forEach(st=>{
      nyu.order[st] = (nyu.order[st]||[]).filter(id=>nyuIds.has(id) && nyuBySt[st].includes(id));
      nyuBySt[st].forEach(id=>{ if(!nyu.order[st].includes(id)) nyu.order[st].push(id); });
    });


    // Flushing 四列顺序自修复（独立名单）
    const flushingIds = new Set(flushing.people.map(p=>p.id));
    const flushingBySt = { pool:[], yes:[], maybe:[], no:[] };
    flushing.people.forEach(p=> flushingBySt[flushing.statuses[p.id] || 'pool'].push(p.id));
    ['pool','yes','maybe','no'].forEach(st=>{
      flushing.order[st] = (flushing.order[st]||[]).filter(id=>flushingIds.has(id) && flushingBySt[st].includes(id));
      flushingBySt[st].forEach(id=>{ if(!flushing.order[st].includes(id)) flushing.order[st].push(id); });
    });

    // Group 顺序自修复（主名单 + 开学季名单）
    const bottomValidIds = new Set([...validIds, ...fallIds, ...nyuIds, ...flushingIds]);
    ['member','baptism','friend'].forEach(k=>{
      state.bottomOrder[k] = [...new Set(state.bottomOrder[k]||[])]
        .filter(id=>bottomValidIds.has(id) && state.bottomTypes[id] === k);
    });
    state.people.concat(fall.people, nyu.people, flushing.people).forEach(p=>{
      const cat = state.bottomTypes[p.id] || 'friend';
      const arr = state.bottomOrder[cat];
      if(!arr.includes(p.id)) arr.push(p.id);
    });

    return state;
  }
  let autoSyncEnabled = false;
  let autoSyncTimer = null;
  let localChangesPending = false;
  let localRevision = 0;
  let syncInFlight = false;
  let syncRetryDelay = 2000;

  function save(state){
    localStorage.setItem(storeKey, JSON.stringify(state));
    localRevision += 1;
    if(autoSyncEnabled){
      localChangesPending = true;
      scheduleAutoSync();
    }
  }

  function loadCloudBase(){
    try{ return JSON.parse(localStorage.getItem(cloudBaseKey) || 'null'); }catch(_){ return null; }
  }

  function saveCloudBase(state){
    if(state) localStorage.setItem(cloudBaseKey, JSON.stringify(state));
  }

  function normalizedName(name){ return (name||'').trim().replace(/\s+/g,' '); }
  function existsByName(data, name){
    const target = name.toLowerCase();
    return data.people.some(p => (p.name||'').trim().toLowerCase() === target);
  }

  function addPerson(name, allowDup=false){
    const state = load();
    const data = getListData(state);
    const nm = normalizedName(name);
    if(!nm) return;
    if(!allowDup && existsByName(data, nm)) return;
    const id = 'p_' + Math.random().toString(36).slice(2,10);
    data.people.push({id, name: nm});
    data.statuses[id] = 'pool';

    // 最新添加的人放在“邀请”最前面。
    if(!data.order) data.order = { pool:[], yes:[], maybe:[], no:[] };
    data.order.pool.unshift(id);

    // 下方分类与顺序
    ensureBottomTypes(state);
    state.bottomTypes[id] = 'friend';
    if(!state.bottomOrder) state.bottomOrder = { member:[], baptism:[], friend:[] };
    state.bottomOrder.friend.unshift(id);

    save(state); render();
  }

  function bulkAdd(text, allowDup=false){
    const sep = /[,\n\r;、，；]+/;
    const parts = (text||'').split(sep).map(s => normalizedName(s)).filter(Boolean);
    const state = load();
    const data = getListData(state);
    const addedIds = [];
    parts.forEach(nm=>{
      if(!allowDup && existsByName(data, nm)) return;
      const id = 'p_' + Math.random().toString(36).slice(2,10);
      data.people.push({id, name: nm});
      data.statuses[id] = 'pool';
      if(!data.order) data.order = { pool:[], yes:[], maybe:[], no:[] };
      addedIds.push(id);
      ensureBottomTypes(state);
      if(!state.bottomOrder) state.bottomOrder = { member:[], baptism:[], friend:[] };
      state.bottomTypes[id] = 'friend';
    });
    // 整批放到最前面，并保持本次输入的姓名顺序。
    data.order.pool = addedIds.concat(data.order.pool);
    state.bottomOrder.friend = addedIds.concat(state.bottomOrder.friend);
    save(state); render();
  }

  function setStatus(id, status){
    const state = load();
    getListData(state).statuses[id] = status;
    save(state);
    render();
  }

  // —— 渲染
  function render(){
    const state = load();
    const data = getListData(state);
    const lists = { pool: $('#list-pool'), yes: $('#list-yes'), maybe: $('#list-maybe'), no: $('#list-no') };
    Object.values(lists).forEach(ul => ul.innerHTML='');

    const id2p = {}; (data.people||[]).forEach(p=> id2p[p.id]=p);

    ['pool','yes','maybe','no'].forEach(st=>{
      const ul = lists[st];
      let ids = (data.order && data.order[st]) ? data.order[st].slice() : [];
      if(!ids || ids.length === 0){
        ids = (data.people||[])
          .filter(p => (data.statuses[p.id] || 'pool') === st)
          .map(p => p.id);
      }
      let has = false;
      ids.forEach(id=>{
        const p = id2p[id];
        if(!p) return;
        const cur = data.statuses[p.id] || 'pool';
        if(cur !== st) return;
        const el = document.createElement('div');
        el.className = 'item' + (p.gender === 'male' ? ' gender-male' : (p.gender === 'female' ? ' gender-female' : ''));
        el.draggable = true; el.dataset.id = p.id;
        el.innerHTML = `
          <span class="person-summary">
            <span class="name">${escapeHTML(p.name)}</span>
            ${state.servants.some(servant=>servant.id === p.servantId) ? '' : '<span class="unassigned-badge" title="尚未分配服事者">未分配服事者</span>'}
          </span>
          <span class="actions">
            <button class="chip${(data.personNotes[p.id]||'').trim() ? ' has-note' : ''}" data-action="details">详情</button>
            <button class="chip icon-btn" data-action="rename" title="编辑姓名和备注" aria-label="编辑姓名和备注">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z"/></svg>
            </button>
          </span>`;
        ul.appendChild(el); has = true;
      });
      if(!has) ul.innerHTML = '<div class="empty">暂无名单，请先添加。</div>';
    });

    enableDnDSortable();     // 顶部四列：可插队拖拽 + 跨列
    enableItemActions();
    renderCounts();
    renderBottomPanel();
    renderNotices();
    renderServants();

  }

  function renderCounts(){
    const state = load();
    const data = getListData(state);
    const counts = { pool:0, yes:0, no:0, maybe:0 };
    data.people.forEach(p => { counts[data.statuses[p.id] || 'pool']++; });
    $('#count-pool').textContent = counts.pool;
    $('#count-yes').textContent = counts.yes;
    $('#count-no').textContent = counts.no;
    $('#count-maybe').textContent = counts.maybe;
  }

  function renderServants(){
    const state = load();
    const container = $('#servantColumns');
    container.replaceChildren();
    const sources = [['fall2026','哥大校园'],['main','Long Island City'],['nyuBrooklyn','NYU- Brooklyn'],['flushing','Flushing']];
    const people = sources.flatMap(([key, label])=>getListData(state,key).people.map(person=>({person, label, key})));
    if(!state.servants.length){
      const empty = document.createElement('p');
      empty.className = 'muted';
      empty.textContent = '还没有服事者，请先添加服事者名字。';
      container.appendChild(empty);
    }
    state.servants.forEach(servant=>{
      const members = people.filter(({person})=>person.servantId === servant.id);
      const column = document.createElement('section');
      column.className = 'servant-column';
      const heading = document.createElement('h3');
      heading.textContent = `${servant.name}（${members.length}）`;
      column.appendChild(heading);
      const memberList = document.createElement('div');
      memberList.className = 'servant-members';
      column.appendChild(memberList);
      members.forEach(({person,label,key})=>{
        const row = document.createElement('div');
        row.className = 'servant-person' + (person.gender === 'male' ? ' gender-male' : (person.gender === 'female' ? ' gender-female' : ''));
        const name = document.createElement('span');
        name.textContent = person.name;
        const source = document.createElement('small');
        source.textContent = label;
        name.appendChild(source);
        row.appendChild(name);
        const details = document.createElement('button');
        details.type = 'button';
        details.className = 'chip';
        details.textContent = '详情';
        details.setAttribute('aria-label', `查看${person.name}的详情`);
        details.addEventListener('click', ()=>openPersonNote(person.id, true, key));
        row.appendChild(details);
        memberList.appendChild(row);
      });
      if(!members.length){
        const empty = document.createElement('p');
        empty.className = 'muted';
        empty.textContent = '暂无人员，请在人员编辑中选择服事者。';
        memberList.appendChild(empty);
      }
      container.appendChild(column);
    });
  }

  $('#servantForm').addEventListener('submit', e=>{
    e.preventDefault();
    const input = $('#servantName');
    const name = normalizedName(input.value);
    if(!name) return;
    const state = load();
    if(state.servants.some(servant=>servant.name.toLowerCase() === name.toLowerCase())){
      alert('该服事者已存在');
      return;
    }
    state.servants.push({id:'s_' + crypto.randomUUID(), name});
    save(state);
    input.value = '';
    renderServants();
  });

  function renderNotices(){
    const state = load();
    document.querySelectorAll('[data-notice-section]').forEach(section=>{
      const list = section.querySelector('.notice-list');
      list.replaceChildren();
      const notices = state.notices.filter(n=>(n.section || 'public') === section.dataset.noticeSection)
        .slice().sort((a,b)=>(b.createdAt||'').localeCompare(a.createdAt||''));
      if(!notices.length){ list.innerHTML = '<div class="notice-empty">还没有发布负担</div>'; return; }
      notices.forEach(notice=>{
        const item = document.createElement('article'); item.className = 'notice-item';
        const text = document.createElement('p'); text.className = 'notice-text'; text.textContent = notice.text || '';
        const meta = document.createElement('div'); meta.className = 'notice-meta';
        const actions = document.createElement('span'); actions.className = 'notice-actions';
        actions.innerHTML = '<button type="button" data-action="edit">编辑</button><button type="button" data-action="delete">删除</button>';
        actions.addEventListener('click', e=>{
          const action = e.target.dataset.action; if(!action) return;
          const latest = load(); const target = latest.notices.find(n=>n.id===notice.id); if(!target) return;
          if(action === 'edit'){
            const value = prompt('编辑公告：', target.text || '');
            if(value === null || !value.trim()) return;
            target.text = value.trim(); target.updatedAt = new Date().toISOString();
          }else if(action === 'delete'){
            if(!confirm('确定删除这条公告？')) return;
            latest.notices = latest.notices.filter(n=>n.id!==notice.id);
          }
          save(latest); renderNotices();
        });
        meta.appendChild(actions); item.append(text, meta); list.appendChild(item);
      });
    });
    function renderPrayerPerson(person, list, unassigned){
      const tag = document.createElement('span'); tag.className = 'prayer-person';
      const name = document.createElement('span'); name.textContent = person.name;
      tag.appendChild(name);
      if(unassigned){
        const select = document.createElement('select'); select.setAttribute('aria-label', '为' + person.name + '选择地点');
        [['','选择地点'],['columbia','哥大校园'],['lic','Long Island City'],['flushing','Flushing']].forEach(([value,label])=>{
          const option = document.createElement('option'); option.value = value; option.textContent = label; select.appendChild(option);
        });
        select.addEventListener('change', ()=>{
          if(!select.value) return;
          const latest = load(); const target = latest.prayerPeople.find(p=>p.id === person.id);
          if(target){ target.section = select.value; save(latest); renderNotices(); }
        });
        tag.appendChild(select);
      }
      const remove = document.createElement('button'); remove.type = 'button'; remove.textContent = '×';
      remove.setAttribute('aria-label', '移除' + person.name);
      remove.addEventListener('click', ()=>{
        if(!confirm('确定移除 ' + person.name + '？')) return;
        const latest = load(); latest.prayerPeople = latest.prayerPeople.filter(p=>p.id !== person.id);
        save(latest); renderNotices();
      });
      tag.appendChild(remove); list.appendChild(tag);
    }
    document.querySelectorAll('[data-prayer-section]').forEach(section=>{
      const list = section.querySelector('.prayer-list'); list.replaceChildren();
      const people = state.prayerPeople.filter(p=>p.section === section.dataset.prayerSection);
      section.querySelector('.prayer-count').textContent = people.length + ' 人';
      people.forEach(person=>renderPrayerPerson(person, list, false));
      if(!people.length) list.textContent = '还没有添加参加祷告的人';
      const options = section.querySelector('.prayer-attendee-options');
      const selected = new Set(Array.from(options.querySelectorAll('input:checked'), input=>input.value));
      options.replaceChildren();
      people.forEach(person=>{
        const label = document.createElement('label'); label.className = 'prayer-attendee';
        const checkbox = document.createElement('input'); checkbox.type = 'checkbox'; checkbox.value = person.id;
        checkbox.checked = selected.has(person.id);
        const name = document.createElement('span'); name.textContent = person.name;
        label.append(checkbox, name); options.appendChild(label);
      });
      if(!people.length) options.textContent = '请先在上方添加姓名，再勾选本次参加的人。';
      const history = section.querySelector('.prayer-history'); history.replaceChildren();
      const sessions = state.prayerSessions.filter(session=>session.section === section.dataset.prayerSection)
        .slice().sort((a,b)=>b.prayedAt.localeCompare(a.prayedAt));
      if(!sessions.length) history.textContent = '还没有祷告记录';
      sessions.forEach(session=>{
        const item = document.createElement('article'); item.className = 'prayer-session';
        const time = document.createElement('time'); time.dateTime = session.prayedAt;
        // Store New York wall time as entered, without browser timezone conversion.
        const [date, clock] = session.prayedAt.split('T');
        const [year, month, day] = date.split('-');
        time.textContent = `${year}年${Number(month)}月${Number(day)}日 ${clock}（纽约时间）`;
        const names = document.createElement('p');
        names.textContent = '参加祷告：' + (session.people.length ? session.people.map(person=>person.name).join('、') : '未记录参加人');
        const remove = document.createElement('button'); remove.type = 'button'; remove.textContent = '删除记录';
        remove.setAttribute('aria-label', '删除' + time.textContent + '的祷告记录');
        remove.addEventListener('click', ()=>{
          if(!confirm('确定删除这次祷告记录？')) return;
          const latest = load(); latest.prayerSessions = latest.prayerSessions.filter(record=>record.id !== session.id);
          save(latest); renderNotices();
        });
        item.append(time, names, remove); history.appendChild(item);
      });
    });
    const unassigned = state.prayerPeople.filter(p=>!['columbia','lic','flushing'].includes(p.section));
    const unassignedSection = $('#unassignedPrayer'); unassignedSection.hidden = !unassigned.length;
    const unassignedList = unassignedSection.querySelector('.prayer-list'); unassignedList.replaceChildren();
    unassigned.forEach(person=>renderPrayerPerson(person, unassignedList, true));
  }

  document.querySelectorAll('[data-notice-section]').forEach(section=>{
    const form = section.querySelector('form'); const input = form.querySelector('textarea');
    form.addEventListener('submit', e=>{
      e.preventDefault(); const text = input.value.trim(); if(!text) return;
      const state = load(); state.notices.push({id:'n_' + crypto.randomUUID(), section:section.dataset.noticeSection, text, createdAt:new Date().toISOString()});
      input.value = ''; save(state); renderNotices();
    });
    input.addEventListener('keydown', e=>{ if((e.metaKey || e.ctrlKey) && e.key === 'Enter') form.requestSubmit(); });
  });
  function newYorkPrayerTime(){
    const parts = new Intl.DateTimeFormat('en-US', {timeZone:'America/New_York', year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', hourCycle:'h23'}).formatToParts(new Date());
    const values = Object.fromEntries(parts.map(part=>[part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}`;
  }
  document.querySelectorAll('[data-prayer-section]').forEach(section=>{
    const form = document.createElement('form'); form.className = 'prayer-session-form';
    const label = document.createElement('label'); label.textContent = '祷告日期和时间（纽约时间）';
    const dateInput = document.createElement('input'); dateInput.type = 'datetime-local'; dateInput.required = true;
    dateInput.value = newYorkPrayerTime(); label.appendChild(dateInput);
    const button = document.createElement('button'); button.type = 'submit'; button.textContent = '保存本次祷告';
    const attendees = document.createElement('fieldset'); attendees.className = 'prayer-attendees';
    const legend = document.createElement('legend'); legend.textContent = '本次实际参加的人（请勾选）';
    const options = document.createElement('div'); options.className = 'prayer-attendee-options';
    attendees.append(legend, options);
    form.append(label, attendees, button);
    const hint = document.createElement('p'); hint.className = 'muted'; hint.textContent = '仅保存本次勾选的人和所选时间；保存后清空勾选，历史记录不受影响。';
    const history = document.createElement('div'); history.className = 'prayer-history'; history.setAttribute('aria-live', 'polite');
    section.append(form, hint, history);
    form.addEventListener('submit', e=>{
      e.preventDefault(); if(!form.reportValidity()) return;
      const state = load(); const location = section.dataset.prayerSection;
      if(state.prayerSessions.some(session=>session.section === location && session.prayedAt === dateInput.value)){
        alert('这个时间的祷告已经记录了'); return;
      }
      const selected = new Set(Array.from(options.querySelectorAll('input:checked'), input=>input.value));
      const people = state.prayerPeople.filter(person=>person.section === location && selected.has(person.id))
        .map(person=>({id:person.id, name:person.name}));
      if(!people.length){ alert('请勾选本次实际参加祷告的人'); return; }
      state.prayerSessions.push({id:'ps_' + crypto.randomUUID(), section:location, prayedAt:dateInput.value,
        people,
        createdAt:new Date().toISOString()});
      save(state); options.querySelectorAll('input').forEach(input=>{ input.checked = false; });
      dateInput.value = newYorkPrayerTime(); renderNotices();
    });
    section.querySelector('.prayer-form').addEventListener('submit', e=>{
      e.preventDefault(); const input = e.currentTarget.querySelector('input'); const name = normalizedName(input.value); if(!name) return;
      const state = load(); const location = section.dataset.prayerSection;
      if(state.prayerPeople.some(p=>p.section === location && p.name.toLowerCase() === name.toLowerCase())){ alert('这个名字已经添加了'); return; }
      state.prayerPeople.push({id:'pr_' + crypto.randomUUID(), section:location, name, createdAt:new Date().toISOString()});
      input.value = ''; save(state); renderNotices();
    });
  });

  // —— 下方分类（按 bottomOrder 渲染 + 兜底）
  function renderBottomPanel(){
    const state = load();
    ensureBottomTypes(state);
    if(!state.bottomOrder) state.bottomOrder = { member: [], baptism: [], friend: [] };

    const memberList = document.getElementById('list-member');
    const baptismList = document.getElementById('list-baptism');
    const friendList = document.getElementById('list-friend');
    memberList.innerHTML = ''; baptismList.innerHTML = ''; friendList.innerHTML = '';

    const fallPeople = state.campaigns?.fall2026?.people || [];
    const nyuPeople = state.campaigns?.nyuBrooklyn?.people || [];
    const flushingPeople = state.campaigns?.flushing?.people || [];
    const allPeople = (state.people||[]).concat(fallPeople, nyuPeople, flushingPeople);
    const fallIds = new Set(fallPeople.map(p=>p.id));
    const id2p = {}; allPeople.forEach(p=> id2p[p.id]=p);

    let memberIds = (state.bottomOrder.member||[]).slice();
    let baptismIds = (state.bottomOrder.baptism||[]).slice();
    let friendIds = (state.bottomOrder.friend||[]).slice();

    allPeople.forEach(p=>{
      const cat = state.bottomTypes[p.id] || 'friend';
      if(cat === 'member'){
        if(!memberIds.includes(p.id)) memberIds.push(p.id);
      }else if(cat === 'baptism'){
        if(!baptismIds.includes(p.id)) baptismIds.push(p.id);
      }else{
        if(!friendIds.includes(p.id)) friendIds.push(p.id);
      }
    });

    let memberCnt=0, baptismCnt=0, friendCnt=0;
    const renderedIds = new Set();
    memberIds.forEach(id=>{
      const p = id2p[id]; if(!p || renderedIds.has(id)) return;
      renderedIds.add(id);
      const tag = document.createElement('div');
      tag.className = 'btag' + (p.gender === 'male' ? ' gender-male' : (p.gender === 'female' ? ' gender-female' : '')); tag.draggable = true; tag.dataset.id = id;
      tag.textContent = p.name || '';
      memberList.appendChild(tag); memberCnt++;
    });
    baptismIds.forEach(id=>{
      const p = id2p[id]; if(!p || renderedIds.has(id)) return;
      renderedIds.add(id);
      const tag = document.createElement('div');
      tag.className = 'btag' + (p.gender === 'male' ? ' gender-male' : (p.gender === 'female' ? ' gender-female' : '')); tag.draggable = true; tag.dataset.id = id;
      tag.textContent = p.name || '';
      baptismList.appendChild(tag); baptismCnt++;
    });
    friendIds.forEach(id=>{
      const p = id2p[id]; if(!p || renderedIds.has(id)) return;
      renderedIds.add(id);
      const tag = document.createElement('div');
      tag.className = 'btag' + (p.gender === 'male' ? ' gender-male' : (p.gender === 'female' ? ' gender-female' : '')); tag.draggable = true; tag.dataset.id = id;
      tag.textContent = p.name || '';
      friendList.appendChild(tag); friendCnt++;
    });

    document.getElementById('bcount-member').textContent = memberCnt;
    document.getElementById('bcount-baptism').textContent = baptismCnt;
    document.getElementById('bcount-friend').textContent = friendCnt;

    enableBottomDnDSortable();
  }

  // —— 顶部四列拖拽：列内排序 + 跨列移动 + 持久化
  function enableDnDSortable(){
    const cols = $$('.col .list');
    let draggingEl = null;
    let dropHandled = false;

    function getAfterElement(container, y){
      const els = [...container.querySelectorAll('.item:not(.dragging)')];
      let closest = {offset: Number.NEGATIVE_INFINITY, el: null};
      els.forEach(el=>{
        const box = el.getBoundingClientRect();
        const offset = y - (box.top + box.height/2);
        if(offset < 0 && offset > closest.offset){
          closest = {offset, el};
        }
      });
      return closest.el;
    }

    $$('.item').forEach(el=>{
      el.addEventListener('dragstart', e=>{
        draggingEl = el;
        dropHandled = false;
        el.classList.add('dragging');
        try{ e.dataTransfer.setData('text/plain', el.dataset.id); e.dataTransfer.effectAllowed='move'; }catch(_){}
      });
      el.addEventListener('dragend', ()=>{
        el.classList.remove('dragging');
        draggingEl = null;
        // drop 已经保存过时不再重复保存。
        if(!dropHandled) persistCurrentOrder();
        dropHandled = false;
      });
    });

    cols.forEach(list=>{
      list.addEventListener('dragover', e=>{
        e.preventDefault();
        list.querySelector('.empty')?.remove();
        const after = getAfterElement(list, e.clientY);
        if(!draggingEl) return;
        if(after == null) list.appendChild(draggingEl);
        else list.insertBefore(draggingEl, after);
      });

      list.addEventListener('drop', e=>{
        e.preventDefault();
        dropHandled = true;
        const id = (e.dataTransfer && e.dataTransfer.getData('text/plain')) || (draggingEl && draggingEl.dataset.id);
        const status = list.parentElement.dataset.status; // pool/yes/maybe/no
        if(!id || !status) return;

        const state = load();
        const data = getListData(state);
        if(!data.order) data.order = { pool:[], yes:[], maybe:[], no:[] };

        data.statuses[id] = status;
        ['pool','yes','maybe','no'].forEach(st=>{
          data.order[st] = (data.order[st]||[]).filter(x=>x!==id);
        });

        const ids = [...list.querySelectorAll('.item')].map(x=>x.dataset.id);
        data.order[status] = ids;

        save(state);
        renderCounts();
      });
    });

    function persistCurrentOrder(){
      const state = load();
      const data = getListData(state);
      ['pool','yes','maybe','no'].forEach(st=>{
        const list = document.querySelector(`.col[data-status="${st}"] .list`);
        if(!list) return;
        data.order[st] = [...list.querySelectorAll('.item')].map(x=>x.dataset.id);
      });
      save(state);
    }
  }

  // —— 下方分类拖拽：列内排序 + 跨列移动 + 持久化
  function enableBottomDnDSortable(){
    const memberList = document.getElementById('list-member');
    const baptismList = document.getElementById('list-baptism');
    const friendList = document.getElementById('list-friend');
    const lists = [memberList, baptismList, friendList];
    let draggingEl = null;
    let dropHandled = false;

    function getAfterElement(container, y){
      const els = [...container.querySelectorAll('.btag:not(.dragging)')];
      let closest = {offset: Number.NEGATIVE_INFINITY, el: null};
      els.forEach(el=>{
        const box = el.getBoundingClientRect();
        const offset = y - (box.top + box.height/2);
        if(offset < 0 && offset > closest.offset){
          closest = {offset, el};
        }
      });
      return closest.el;
    }

    lists.forEach(list=>{
      [...list.querySelectorAll('.btag')].forEach(el=>{
        el.addEventListener('dragstart', e=>{
          draggingEl = el;
          dropHandled = false;
          el.classList.add('dragging');
          try{ e.dataTransfer.setData('text/plain', el.dataset.id); e.dataTransfer.effectAllowed='move'; }catch(_){}
        });
        el.addEventListener('dragend', ()=>{
          el.classList.remove('dragging');
          draggingEl = null;
          if(!dropHandled) persistBottomOrder();
          dropHandled = false;
        });
      });
    });

    lists.forEach(list=>{
      list.addEventListener('dragover', e=>{
        e.preventDefault();
        const after = getAfterElement(list, e.clientY);
        if(!draggingEl) return;
        if(after == null) list.appendChild(draggingEl);
        else list.insertBefore(draggingEl, after);
        list.classList.add('drop-hint');
      });
      list.addEventListener('dragleave', e=>{
        if(!list.contains(e.relatedTarget)) list.classList.remove('drop-hint');
      });
      list.addEventListener('drop', e=>{
        e.preventDefault();
        dropHandled = true;
        list.classList.remove('drop-hint');

        const id = (e.dataTransfer && e.dataTransfer.getData('text/plain')) || (draggingEl && draggingEl.dataset.id);
        if(!id) return;

        const state = load();
        if(!state.bottomTypes) state.bottomTypes = {};
        if(!state.bottomOrder) state.bottomOrder = { member:[], baptism:[], friend:[] };

        const targetCat = list.id === 'list-member' ? 'member' : (list.id === 'list-baptism' ? 'baptism' : 'friend');
        state.bottomTypes[id] = targetCat;

        ['member','baptism','friend'].forEach(k=>{
          state.bottomOrder[k] = (state.bottomOrder[k]||[]).filter(x=>x!==id);
        });

        const ids = [...list.querySelectorAll('.btag')].map(x=>x.dataset.id);
        state.bottomOrder[targetCat] = ids;

        save(state);
        document.getElementById('bcount-member').textContent = memberList.querySelectorAll('.btag').length;
        document.getElementById('bcount-baptism').textContent = baptismList.querySelectorAll('.btag').length;
        document.getElementById('bcount-friend').textContent = friendList.querySelectorAll('.btag').length;
      });
    });

    function persistBottomOrder(){
      const state = load();
      if(!state.bottomOrder) state.bottomOrder = { member:[], baptism:[], friend:[] };
      state.bottomOrder.member = [...memberList.querySelectorAll('.btag')].map(x=>x.dataset.id);
      state.bottomOrder.baptism = [...baptismList.querySelectorAll('.btag')].map(x=>x.dataset.id);
      state.bottomOrder.friend = [...friendList.querySelectorAll('.btag')].map(x=>x.dataset.id);
      save(state);
    }
  }

  // 绑定卡片上的“改名 / 删除”两个按钮，并把顺序/分类一并维护
function enableItemActions(){
  // 先解绑旧事件，避免重复绑定（可选）
  $$('.item .actions .chip').forEach(btn => {
    btn.replaceWith(btn.cloneNode(true));
  });

  $$('.item .actions .chip').forEach(btn => {
    btn.addEventListener('click', ()=>{
      const action = btn.dataset.action;
      const id = btn.closest('.item').dataset.id;
      const state = load();

      if(action === 'details'){
        openPersonNote(id, true);
        return;
      }

      if(action === 'rename'){
        openPersonNote(id, false);
        return;
      }
    });
  });
}

  // —— 点击姓名编辑个人备注
  let editingPersonNoteId = null;
  let editingPersonListKey = null;

  function deletePerson(id, listKey=activeListKey){
    const state = load();
    const data = getListData(state, listKey);
    state.deletedPeople = state.deletedPeople || { main:[], fall2026:[], nyuBrooklyn:[], flushing:[] };
    const deletedKey = listKey;
    state.deletedPeople[deletedKey] = state.deletedPeople[deletedKey] || [];
    if(!state.deletedPeople[deletedKey].includes(id)) state.deletedPeople[deletedKey].push(id);
    data.people = (data.people||[]).filter(p=>p.id !== id);
    if(data.statuses) delete data.statuses[id];
    if(data.personNotes) delete data.personNotes[id];
    ['pool','yes','maybe','no'].forEach(st=>{
      data.order[st] = (data.order[st]||[]).filter(x=>x !== id);
    });
    if(state.bottomTypes) delete state.bottomTypes[id];
    ['member','baptism','friend'].forEach(cat=>{
      state.bottomOrder[cat] = (state.bottomOrder[cat]||[]).filter(x=>x !== id);
    });
    save(state);
  }

  function openPersonNote(id, readOnly=false, listKey=activeListKey){
    const state = load();
    const data = getListData(state, listKey);
    const person = (data.people||[]).find(p=>p.id === id);
    if(!person) return;
    editingPersonNoteId = id;
    editingPersonListKey = listKey;
    const dialog = $('#personNoteDialog');
    dialog.classList.toggle('view-mode', readOnly);
    dialog.classList.toggle('edit-mode', !readOnly);
    $('#personNoteTitle').textContent = readOnly ? (person.name || '详情') : '编辑资料';
    $('#personNoteHint').textContent = readOnly ? '个人详情' : '修改姓名、服事者与备注';
    const servantSelect = $('#personServantSelect');
    servantSelect.replaceChildren(new Option('未分配', ''));
    state.servants.forEach(servant=>servantSelect.add(new Option(servant.name, servant.id)));
    servantSelect.value = state.servants.some(servant=>servant.id === person.servantId) ? person.servantId : '';
    servantSelect.disabled = readOnly;
    $('#personServantDisplay').textContent = state.servants.find(servant=>servant.id === person.servantId)?.name || '未分配';
    $('#personNameInput').value = person.name || '';
    $$('input[name="personGender"]').forEach(input=>{
      input.checked = input.value === person.gender;
      input.disabled = readOnly;
    });
    $('#personNoteInput').value = (data.personNotes && data.personNotes[id]) || '';
    $('#personNoteDisplay').textContent = $('#personNoteInput').value || '暂无备注';
    $('#personNoteInput').placeholder = readOnly ? '暂无备注' : '记录联系方式、邀请进度或其他信息…';
    $('#personNameInput').readOnly = readOnly;
    $('#personNoteInput').readOnly = readOnly;
    $('#personNameInput').tabIndex = readOnly ? -1 : 0;
    $('#personNoteInput').tabIndex = readOnly ? -1 : 0;
    $('#editPersonNoteBtn').style.display = readOnly ? '' : 'none';
    $('#savePersonNoteBtn').style.display = readOnly ? 'none' : '';
    $('#savePersonNoteBtn').textContent = '保存';
    $('#deletePersonBtn').style.display = readOnly ? 'none' : '';
    $('#cancelPersonNoteBtn').textContent = readOnly ? '关闭' : '取消';
    $('#personNoteDialog').returnValue = '';
    if(!dialog.open) dialog.showModal();
    if(!readOnly) requestAnimationFrame(()=>$('#personNameInput').focus());
  }

  // —— 工具
  function escapeHTML(str){
    return (str||'').replace(/[&<>"']/g, s=>({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    })[s]);
  }

  // —— JSON 备份/恢复 & 下载本页
  function exportJSON(){
    const state = load();
    const blob = new Blob([JSON.stringify(state, null, 2)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'invite_manager_backup.json';
    a.click(); URL.revokeObjectURL(url);
  }
  function importJSON(file){
    const reader = new FileReader();
    reader.onload = (e)=>{
      try{
        const obj = JSON.parse(e.target.result);
        if(!obj.people || !obj.statuses || !Array.isArray(obj.history)){
          alert('文件格式不正确'); return;
        }
        if(!obj.order) obj.order = { pool:[], yes:[], maybe:[], no:[] };
        if(!obj.bottomTypes) obj.bottomTypes = {};
        if(!obj.bottomOrder) obj.bottomOrder = { member:[], baptism:[], friend:[] };
        if(!obj.notes) obj.notes = {};
        if(!obj.personNotes) obj.personNotes = {};
        save(obj); render(); alert('导入成功');
      }catch(err){ alert('解析失败：' + err.message); }
    };
    reader.readAsText(file);
  }
  // —— Google Sheet 云同步
  const GOOGLE_SCRIPT_URL_KEY = 'invite_manager_google_script_url';
  const DEFAULT_GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyMFQf63WaCWHGHMFWNIwab7Qda0cGupq4Q3upB5hS3ake43Xpe3K3Wkqka2vGh6Q-gTw/exec';

  function getGoogleScriptUrl(){
    return (localStorage.getItem(GOOGLE_SCRIPT_URL_KEY) || DEFAULT_GOOGLE_SCRIPT_URL).trim();
  }

  function setSyncStatus(msg){
    const el = document.getElementById('googleSyncStatus');
    if(el) el.textContent = msg || '';
  }

  function setupGoogleSync(){
    const current = getGoogleScriptUrl();
    const url = prompt('请粘贴部署后的 Google Apps Script Web App URL：', current);
    if(url === null) return;
    const v = url.trim();
    if(!v){
      localStorage.removeItem(GOOGLE_SCRIPT_URL_KEY);
      setSyncStatus('Google 同步地址已清除');
      return;
    }
    localStorage.setItem(GOOGLE_SCRIPT_URL_KEY, v);
    setSyncStatus('Google 同步已设置');
  }

  function scheduleAutoSync(){
    clearTimeout(autoSyncTimer);
    setSyncStatus('等待自动同步…');
    autoSyncTimer = setTimeout(()=>syncToGoogleSheet(true), 700);
  }

  function scheduleSyncRetry(){
    clearTimeout(autoSyncTimer);
    const delay = syncRetryDelay;
    setSyncStatus('上传失败，' + Math.ceil(delay / 1000) + ' 秒后自动重试…');
    autoSyncTimer = setTimeout(()=>syncToGoogleSheet(true), delay);
    syncRetryDelay = Math.min(syncRetryDelay * 2, 60000);
  }

  async function syncToGoogleSheet(silent=false){
    const url = getGoogleScriptUrl();
    if(!url){ alert('请先点击“设置 Google 同步”，粘贴 Apps Script Web App URL。'); return; }
    // 自动同步只允许由真实的本地编辑触发；单纯打开、停留或关闭页面绝不上传。
    if(silent && !localChangesPending) return;
    if(syncInFlight) return;
    syncInFlight = true;
    setSyncStatus('正在同步…');
    try{
      const state = load();
      const baseState = loadCloudBase();
      const revisionAtStart = localRevision;
      // 兼容 Google Sheet 旧版脚本：个人备注既保存在 personNotes，
      // 也附加到每个人的 note 字段，供表格的 note 列直接读取。
      state.personNotes = state.personNotes || {};
      state.people = (state.people||[]).map(person=>({
        ...person,
        note: state.personNotes[person.id] || ''
      }));
      const fallData = getListData(state, 'fall2026');
      fallData.people = (fallData.people||[]).map(person=>({
        ...person,
        note: fallData.personNotes[person.id] || '',
        category: state.bottomTypes?.[person.id] || 'friend'
      }));
      const nyuData = getListData(state, 'nyuBrooklyn');
      nyuData.people = (nyuData.people||[]).map(person=>({
        ...person,
        note: nyuData.personNotes[person.id] || '',
        category: state.bottomTypes?.[person.id] || 'friend'
      }));
      const flushingData = getListData(state, 'flushing');
      flushingData.people = (flushingData.people||[]).map(person=>({
        ...person,
        note: flushingData.personNotes[person.id] || '',
        category: state.bottomTypes?.[person.id] || 'friend'
      }));
      // 同步过程只更新本地缓存，不再调用 save()，避免触发下一轮自动同步。
      localStorage.setItem(storeKey, JSON.stringify(state));

      const controller = new AbortController();
      const timeoutId = setTimeout(()=>controller.abort(), 45000);
      const res = await fetch(url, {
        method:'POST',
        headers:{'Content-Type':'text/plain;charset=utf-8'},
        body: JSON.stringify({ action:'save', state, baseState }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if(!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      if(data && data.code === 'STALE_STATE'){
        setSyncStatus('云端已有更新，本地修改未同步');
        alert('云端数据已被更新，本地修改尚未同步。请先导出或记录本地修改，再读取云端数据并重新应用修改。');
        return;
      }
      if(!data || !data.ok) throw new Error((data && data.error) || '同步失败');
      syncRetryDelay = 2000;
      if(data.state) saveCloudBase(data.state);
      // 云端会合并其他设备刚保存的人员。当前同步期间若本机没有新改动，
      // 立即采用合并后的版本，避免下一次操作仍基于旧名单。
      if(data.state && localRevision === revisionAtStart){
        localStorage.setItem(storeKey, JSON.stringify(data.state));
        localChangesPending = false;
        render();
      }else if(data.state){
        // 请求发出后本机又发生了编辑：只接收新的云端版本号，
        // 保留本机较新的内容，并立刻安排下一轮同步。
        const latestLocal = load();
        latestLocal.cloudVersion = data.state.cloudVersion;
        localStorage.setItem(storeKey, JSON.stringify(latestLocal));
        localChangesPending = true;
        scheduleAutoSync();
      }else{
        localChangesPending = localRevision !== revisionAtStart;
        if(localChangesPending) scheduleAutoSync();
      }
      setSyncStatus(localChangesPending ? '有新修改，继续同步…' : '已同步 ' + new Date().toLocaleTimeString());
      if(!silent) alert('已同步到 Google Sheet');
    }catch(err){
      console.error(err);
      const message = err.name === 'AbortError' ? '请求超时' : err.message;
      setSyncStatus('同步失败：' + message);
      if(localChangesPending && autoSyncEnabled) scheduleSyncRetry();
      if(!silent) alert('同步失败：' + message + '\n\n系统会自动重试；请确认 Apps Script 已部署为 Web App，并允许访问。');
    }finally{
      syncInFlight = false;
    }
  }

  async function loadFromGoogleSheet(silent=false){
    const url = getGoogleScriptUrl();
    if(!url){ alert('请先点击“设置 Google 同步”，粘贴 Apps Script Web App URL。'); return; }
    if(!silent && !confirm('从 Google Sheet 读取会覆盖当前浏览器里的实时名单。继续吗？')) return;
    if(silent && localChangesPending) return;
    setSyncStatus('正在读取…');
    const revisionAtStart = localRevision;
    try{
      const sep = url.includes('?') ? '&' : '?';
      const res = await fetch(url + sep + 'action=load&_=' + Date.now());
      if(!res.ok) throw new Error('HTTP ' + res.status + '，请检查 Web App 部署和访问权限');
      let data;
      try{ data = await res.json(); }catch(_){ throw new Error('服务器没有返回有效数据，请检查 Web App 地址和访问权限'); }
      if(!data || !data.ok) throw new Error((data && data.error) || '读取失败');
      if(!data.state){
        if(localRevision !== revisionAtStart || (silent && localChangesPending)){
          setSyncStatus('本地有新修改，已取消读取');
          return;
        }
        // 空云端没有可读取的状态：只清除旧的比较基准，保留当前本地数据。
        localStorage.removeItem(cloudBaseKey);
        setSyncStatus('云端为空，本地数据已保留');
        if(!silent) alert('Google Sheet 中还没有云端数据。本地数据已保留；请确认表格和本地内容无误后，点击“同步到云端”建立云端数据。');
        return;
      }
      if(localRevision !== revisionAtStart || (silent && localChangesPending)){
        setSyncStatus('本地有新修改，已取消读取');
        return;
      }
      const cloudState = data.state;
      if(typeof cloudState !== 'object' || Array.isArray(cloudState) || !Array.isArray(cloudState.people)) throw new Error('云端数据格式不正确：缺少人员名单');
      const state = JSON.parse(JSON.stringify(cloudState));
      state.statuses = state.statuses || {};
      state.history = Array.isArray(state.history) ? state.history : [];
      // 兼容表格按 people[].note 返回个人备注的格式。
      state.personNotes = state.personNotes || {};
      state.people.forEach(person=>{
        if(person && person.id && typeof person.note === 'string'){
          state.personNotes[person.id] = person.note;
        }
      });
      const fallData = getListData(state, 'fall2026');
      fallData.people = Array.isArray(fallData.people) ? fallData.people : [];
      fallData.personNotes = fallData.personNotes || {};
      fallData.people.forEach(person=>{
        if(person && person.id && typeof person.note === 'string'){
          fallData.personNotes[person.id] = person.note;
        }
      });
      const nyuData = getListData(state, 'nyuBrooklyn');
      nyuData.people = Array.isArray(nyuData.people) ? nyuData.people : [];
      nyuData.personNotes = nyuData.personNotes || {};
      nyuData.people.forEach(person=>{
        if(person && person.id && typeof person.note === 'string'){
          nyuData.personNotes[person.id] = person.note;
        }
      });
      const flushingData = getListData(state, 'flushing');
      flushingData.people = Array.isArray(flushingData.people) ? flushingData.people : [];
      flushingData.personNotes = flushingData.personNotes || {};
      flushingData.people.forEach(person=>{
        if(person && person.id && typeof person.note === 'string'){
          flushingData.personNotes[person.id] = person.note;
        }
      });
      localStorage.setItem(storeKey, JSON.stringify(state));
      saveCloudBase(cloudState);
      localChangesPending = false;
      clearTimeout(autoSyncTimer);
      render();
      setSyncStatus('已读取 ' + new Date().toLocaleTimeString());
      if(!silent) alert('已从 Google Sheet 读取');
    }catch(err){
      console.error(err);
      const message = err instanceof TypeError ? '无法连接 Web App，请检查网络、部署地址和访问权限' : err.message;
      setSyncStatus('读取失败：' + message);
      if(!silent) alert('读取失败：' + message);
    }
  }

  async function startAutomaticGoogleSync(){
    autoSyncEnabled = true;
    setSyncStatus('正在读取云端数据…');
    await loadFromGoogleSheet(true);
  }

  // —— 事件绑定
  $('#addBtn').addEventListener('click', ()=>{
    const v = $('#newName').value.trim();
    const allowDup = $('#allowDup') ? $('#allowDup').checked : false;
    addPerson(v, allowDup);
    $('#newName').value='';
  });
  $('#newName').addEventListener('keypress', (e)=>{ if(e.key==='Enter') $('#addBtn').click(); });
  $('#toggleBulkBtn').addEventListener('click', ()=>{
    const box = $('#bulkBox');
    box.style.display = (box.style.display==='none' || !box.style.display) ? 'block' : 'none';
  });
  $('#bulkAddBtn').addEventListener('click', ()=>{ bulkAdd($('#bulkInput').value, $('#allowDup').checked); $('#bulkInput').value=''; });
  $('#exportBtn').addEventListener('click', exportJSON);
  $('#importBtn').addEventListener('click', ()=> $('#importFile').click());
  $('#importFile').addEventListener('change', (e)=>{ const f=e.target.files[0]; if(f) importJSON(f); e.target.value=''; });
  document.getElementById('googleSetupBtn')?.addEventListener('click', setupGoogleSync);
  document.getElementById('googleSaveBtn')?.addEventListener('click', ()=>syncToGoogleSheet(false));
  document.getElementById('googleLoadBtn')?.addEventListener('click', ()=>loadFromGoogleSheet(false));
  // 页面显示解锁码；这是前端显示控制，不是服务器端身份验证。
  const TAB_ACCESS_CODE = 'NYYG2026';
  let tabsUnlocked = false;
  let accessClickCount = 0;
  let lastAccessClick = 0;
  $('#brandAccessBtn').addEventListener('click', ()=>{
    if(tabsUnlocked) return;
    const now = Date.now();
    accessClickCount = now - lastAccessClick < 1000 ? accessClickCount + 1 : 1;
    lastAccessClick = now;
    if(accessClickCount < 5) return;
    accessClickCount = 0;
    $('#tabAccessDialog').showModal();
    $('#tabAccessCode').focus();
  });
  $('#cancelTabAccessBtn').addEventListener('click', ()=>$('#tabAccessDialog').close());
  $('#tabAccessDialog').addEventListener('close', ()=>{
    $('#tabAccessCode').value = '';
    $('#tabAccessCode').removeAttribute('aria-invalid');
    $('#tabAccessMessage').textContent = '';
  });
  $('#tabUnlockForm').addEventListener('submit', e=>{
    e.preventDefault();
    const input = $('#tabAccessCode');
    if(input.value !== TAB_ACCESS_CODE){
      $('#tabAccessMessage').textContent = 'Code 不正确，请重新输入。';
      input.setAttribute('aria-invalid', 'true');
      input.select();
      return;
    }
    tabsUnlocked = true;
    input.value = '';
    input.removeAttribute('aria-invalid');
    $('#tabAccessMessage').textContent = '';
    $('#tabAccessDialog').close();
    document.body.classList.remove('tabs-locked');
    $('[data-view-target="fall2026"]').focus();
  });
  $('#lockTabsBtn').addEventListener('click', ()=>{
    tabsUnlocked = false;
    document.body.classList.add('tabs-locked');
    $('[data-view-target="notice"]').click();
    $('#brandAccessBtn').focus();
  });
  $$('.view-tab').forEach(tab=>{
    tab.addEventListener('click', ()=>{
      const view = tab.dataset.viewTarget || 'board';
      if(!tabsUnlocked && view !== 'notice') return;
      activeListKey = view === 'fall2026' || view === 'nyuBrooklyn' || view === 'flushing' ? view : 'main';
      updateStatusHeadings();
      $('.workspace-layout').dataset.view = view;
      $('.add-group').hidden = view === 'servants';
      $('#toggleBulkBtn').hidden = view === 'servants';
      if(view === 'servants') $('#bulkBox').style.display = 'none';
      const titles = {
        board: ['Long Island City', '拖动姓名更新进度，点击详情查看个人备注。'],
        categories: ['分组整理', '在弟兄姊妹、预备受浸与福音朋友之间拖动姓名。'],
        fall2026: ['哥大校园', '独立的哥大校园福音名单。'],
        nyuBrooklyn: ['NYU- Brooklyn', '独立的 NYU Brooklyn 福音名单，初始为空。'],
        flushing: ['Flushing', '独立的 Flushing 福音名单，初始为空。'],
        servants: ['服事者', '添加服事者，在人员编辑中选择后，名单会自动显示在对应栏里。'],
        notice: ['祷告负担', '发布聚会安排、代祷和服事提醒。']
      };
      $('#workspaceTitle').textContent = titles[view][0];
      $('#workspaceDescription').textContent = titles[view][1];
      $('#newName').placeholder = view === 'fall2026' ? '添加到哥大校园…' : (view === 'nyuBrooklyn' ? '添加到 NYU- Brooklyn…' : (view === 'flushing' ? '添加到 Flushing…' : '添加到 Long Island City…'));
      $$('.view-tab').forEach(btn=>{
        const active = btn === tab;
        btn.classList.toggle('active', active);
        btn.setAttribute('aria-selected', active ? 'true' : 'false');
      });
      render();
    });
  });
  $('#editPersonNoteBtn').addEventListener('click', ()=>{
    if(editingPersonNoteId) openPersonNote(editingPersonNoteId, false, editingPersonListKey);
  });
  $('#cancelPersonNoteBtn').addEventListener('click', ()=>{
    editingPersonNoteId = null;
    $('#personNoteDialog').close();
  });
  $('#personNoteDialog').addEventListener('click', e=>{
    const dialog = $('#personNoteDialog');
    if(e.target === dialog && dialog.classList.contains('view-mode')){
      editingPersonNoteId = null;
      dialog.close();
    }
  });
  $('#deletePersonBtn').addEventListener('click', ()=>{
    if(!editingPersonNoteId) return;
    const state = load();
    const person = (getListData(state, editingPersonListKey).people||[]).find(p=>p.id === editingPersonNoteId);
    if(!confirm(`确定删除“${person?.name || '该对象'}”？`)) return;
    const id = editingPersonNoteId;
    editingPersonNoteId = null;
    $('#personNoteDialog').close();
    deletePerson(id, editingPersonListKey);
    render();
  });
  $('#personNoteDialog').addEventListener('close', ()=>{
    if($('#personNoteDialog').returnValue !== 'save' || !editingPersonNoteId || $('#personNameInput').readOnly){
      editingPersonNoteId = null;
      return;
    }
    const state = load();
    const data = getListData(state, editingPersonListKey);
    const person = (data.people||[]).find(p=>p.id === editingPersonNoteId);
    const servantId = $('#personServantSelect').value;
    if(person){
      if(state.servants.some(servant=>servant.id === servantId)) person.servantId = servantId;
      else delete person.servantId;
    }
    const name = normalizedName($('#personNameInput').value);
    if(person && name) person.name = name;
    const selectedGender = document.querySelector('input[name="personGender"]:checked');
    if(person){
      if(selectedGender) person.gender = selectedGender.value;
      else delete person.gender;
    }
    data.personNotes = data.personNotes || {};
    const note = $('#personNoteInput').value.trim();
    if(note) data.personNotes[editingPersonNoteId] = note;
    else delete data.personNotes[editingPersonNoteId];
    editingPersonNoteId = null;
    save(state);
    render();
  });

  // —— 初始化：刷新页面后重新锁定。
  $('[data-view-target="notice"]').click();
  startAutomaticGoogleSync();
})();
