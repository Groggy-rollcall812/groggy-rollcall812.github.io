/* ============================================================
   收藏夹 —— 记录看过的电影 / 电视剧 / 书，并按日期在日历上回看
   ------------------------------------------------------------
   数据结构（存在 localStorage 的 workbench.shelf）：
   {
     cats:  ['电影','电视剧','书籍', ...自定义],
     items: [{ id, title, cat, date:'YYYY-MM-DD', status,
                stars:0-5, note, cover, link, at }]
   }

   封面三层降级：手填/自动获取的链接 → 本地上传（压成缩略图存）
   → 都没有就用标题首字做排版封面。豆瓣接口不稳，所以它只是加速器，
   任何时候都能手动完成记录。
   ============================================================ */

const store = new Store('shelf');

const DEFAULT_CATS = ['电影', '电视剧', '书籍'];
const STATUSES = ['想看', '在看', '看完'];

/* ---------- 数据读写 ---------- */

// 导入的数据可能结构不对，统一收敛成合法形状，避免页面崩掉
function normalize(raw) {
  const d = (raw && typeof raw === 'object') ? raw : {};
  const cats = Array.isArray(d.cats) && d.cats.length ? d.cats.slice() : DEFAULT_CATS.slice();
  const items = (Array.isArray(d.items) ? d.items : []).map(it => ({
    id:     it.id || uid(),
    title:  String(it.title || '').trim(),
    cat:    cats.includes(it.cat) ? it.cat : cats[0],
    date:   /^\d{4}-\d{2}-\d{2}$/.test(it.date) ? it.date : today(),
    status: STATUSES.includes(it.status) ? it.status : '看完',
    stars:  Math.max(0, Math.min(5, Number(it.stars) || 0)),
    note:   String(it.note || ''),
    cover:  String(it.cover || ''),
    link:   String(it.link || ''),
    at:     it.at || Date.now()
  })).filter(it => it.title);

  return { cats, items };
}

let db = normalize(store.load(null));
const persist = () => store.save(db);

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function today() {
  const d = new Date();
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

const $ = id => document.getElementById(id);

/* ---------- 封面：没有图时用标题首字 ---------- */

function fillCover(el, item) {
  el.innerHTML = '';
  if (item.cover) {
    const img = document.createElement('img');
    img.src = item.cover;
    img.alt = '';
    img.loading = 'lazy';
    // 图挂了就退回排版封面，不留破图占位
    img.onerror = () => { el.innerHTML = ''; el.appendChild(charCover(item)); };
    el.appendChild(img);
  } else {
    el.appendChild(charCover(item));
  }
}

function charCover(item) {
  const s = document.createElement('span');
  s.className = 'ch';
  s.textContent = (item.title || '—').trim().charAt(0) || '—';
  return s;
}

/* ============================================================
   视图切换
   ============================================================ */

document.querySelectorAll('.tab').forEach(t => {
  t.onclick = () => {
    document.querySelectorAll('.tab').forEach(x => x.classList.toggle('on', x === t));
    const v = t.dataset.view;
    $('v-list').classList.toggle('on', v === 'list');
    $('v-cal').classList.toggle('on', v === 'cal');
    if (v === 'cal') renderCal();
  };
});

/* ============================================================
   清单视图
   ============================================================ */

let filterCat = '全部';

function renderFilter() {
  const box = $('filter');
  box.innerHTML = '';
  ['全部'].concat(db.cats).forEach(c => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip' + (c === filterCat ? ' on' : '');
    const n = c === '全部' ? db.items.length : db.items.filter(i => i.cat === c).length;
    b.textContent = n ? `${c} ${n}` : c;
    b.onclick = () => { filterCat = c; renderFilter(); renderList(); };
    box.appendChild(b);
  });
}

function renderList() {
  const listEl = $('list');
  listEl.innerHTML = '';

  const rows = db.items
    .filter(i => filterCat === '全部' || i.cat === filterCat)
    .sort((a, b) => b.date.localeCompare(a.date) || b.at - a.at);

  $('empty').style.display = rows.length ? 'none' : 'block';
  $('empty').innerHTML = db.items.length
    ? '这个分类下还没有记录'
    : '还没有记录<br>点上面「记一条」开始';

  rows.forEach(it => listEl.appendChild(itemRow(it)));

  const pad = n => String(n).padStart(2, '0');
  $('count').textContent = db.items.length ? `${pad(rows.length)} 条` : '';
}

function itemRow(it) {
  const li = document.createElement('li');

  const cov = document.createElement('div');
  cov.className = 'cover';
  fillCover(cov, it);

  const main = document.createElement('div');
  main.className = 'it-main';

  const t = document.createElement('div');
  t.className = 'it-title';
  t.textContent = it.title;

  const meta = document.createElement('div');
  meta.className = 'it-meta';
  meta.append(document.createTextNode(it.cat));
  meta.appendChild(dot());
  meta.append(document.createTextNode(it.date.slice(5).replace('-', '/')));
  meta.appendChild(dot());
  meta.append(document.createTextNode(it.status));
  if (it.stars) {
    meta.appendChild(dot());
    const s = document.createElement('span');
    s.className = 'stars';
    s.textContent = '●'.repeat(it.stars);
    meta.appendChild(s);
  }

  main.append(t, meta);

  if (it.note) {
    const n = document.createElement('div');
    n.className = 'it-note';
    n.textContent = it.note;
    main.appendChild(n);
  }

  const acts = document.createElement('div');
  acts.className = 'it-acts';

  const ed = document.createElement('button');
  ed.className = 'iconbtn'; ed.type = 'button';
  ed.textContent = '✎'; ed.title = '编辑';
  ed.onclick = () => openForm(it.id);

  const del = document.createElement('button');
  del.className = 'iconbtn'; del.type = 'button';
  del.textContent = '×'; del.title = '删除';
  del.onclick = () => {
    if (!confirm(`删除「${it.title}」？`)) return;
    db.items = db.items.filter(x => x.id !== it.id);
    persist(); renderAll();
  };

  acts.append(ed, del);
  li.append(cov, main, acts);
  return li;
}

function dot() {
  const s = document.createElement('span');
  s.className = 'dot';
  s.textContent = '·';
  return s;
}

/* ============================================================
   表单：新增 / 编辑共用
   ============================================================ */

let editingId = null;
let draft = blankDraft();

function blankDraft() {
  return {
    title: '', cat: db.cats[0], date: today(),
    status: '看完', stars: 0, note: '', cover: '', link: ''
  };
}

function renderCatPicker() {
  const box = $('f-cats');
  box.innerHTML = '';
  db.cats.forEach(c => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip' + (c === draft.cat ? ' on' : '');
    b.textContent = c;
    b.onclick = () => { draft.cat = c; renderCatPicker(); };
    box.appendChild(b);
  });

  const add = document.createElement('button');
  add.type = 'button';
  add.className = 'chip ghost';
  add.textContent = '＋ 新分类';
  add.onclick = () => {
    const name = (prompt('新分类叫什么？比如 播客、展览、游戏') || '').trim();
    if (!name) return;
    if (db.cats.includes(name)) { draft.cat = name; renderCatPicker(); return; }
    db.cats.push(name);
    draft.cat = name;
    persist(); renderCatPicker(); renderFilter();
  };
  box.appendChild(add);
}

function renderStatusPicker() {
  const box = $('f-status');
  box.innerHTML = '';
  STATUSES.forEach(s => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip' + (s === draft.status ? ' on' : '');
    b.textContent = s;
    b.onclick = () => { draft.status = s; renderStatusPicker(); };
    box.appendChild(b);
  });
}

function renderStars() {
  $('f-stars').querySelectorAll('button[data-v]').forEach(b => {
    b.classList.toggle('lit', Number(b.dataset.v) <= draft.stars);
  });
}

function renderCoverPrev() {
  fillCover($('f-cov-prev'), { title: $('f-title').value || draft.title, cover: draft.cover });
}

function syncForm() {
  $('f-title').value = draft.title;
  $('f-date').value  = draft.date;
  $('f-note').value  = draft.note;
  $('f-cover').value = draft.cover.startsWith('data:') ? '' : draft.cover;
  $('f-cover').placeholder = draft.cover.startsWith('data:')
    ? '已用上传的图片'
    : '粘贴图片链接，或直接上传';
  renderCatPicker();
  renderStatusPicker();
  renderStars();
  renderCoverPrev();
  $('sugg').style.display = 'none';
  $('sugg').innerHTML = '';
}

function openForm(id) {
  editingId = id || null;
  draft = id
    ? Object.assign({}, db.items.find(i => i.id === id))
    : blankDraft();
  syncForm();
  $('form').classList.add('on');
  $('add-open').textContent = id ? '（正在编辑）' : '＋ 记一条';
  $('form').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function closeForm() {
  $('form').classList.remove('on');
  $('add-open').textContent = '＋ 记一条';
  editingId = null;
}

$('add-open').onclick  = () => openForm(null);
$('f-cancel').onclick  = closeForm;

$('f-stars').querySelectorAll('button[data-v]').forEach(b => {
  b.onclick = () => {
    const v = Number(b.dataset.v);
    draft.stars = (draft.stars === v) ? v - 1 : v;   // 点当前分再点一次少一颗
    renderStars();
  };
});
$('f-star-clr').onclick = () => { draft.stars = 0; renderStars(); };

$('f-cover').oninput = () => {
  draft.cover = $('f-cover').value.trim();
  renderCoverPrev();
  // 豆瓣图直链在页面里显示不出来（防盗链），粘进来就顺手抓成本地图
  if (/doubanio\.com/.test(draft.cover)) scheduleCache(draft.cover);
};

// 输入还在继续时不要急着发请求，停手 700ms 再抓
let cacheTimer = null;
function scheduleCache(url) {
  clearTimeout(cacheTimer);
  cacheTimer = setTimeout(async () => {
    if (draft.cover !== url) return;
    const prev = $('f-cover').placeholder;
    $('f-cover').placeholder = '正在存封面…';
    const data = await cacheImage(url);
    if (draft.cover !== url) return;              // 期间改过就作废
    if (data) {
      draft.cover = data;
      $('f-cover').value = '';
      $('f-cover').placeholder = '已存下豆瓣封面';
      renderCoverPrev();
    } else {
      $('f-cover').placeholder = prev;
      alert('这张豆瓣图没抓下来（豆瓣有防盗链，得借第三方中转，时好时坏）。\n可以稍后再试，或者直接上传一张图。');
    }
  }, 700);
}
$('f-title').oninput = () => { draft.title = $('f-title').value; renderCoverPrev(); };
$('f-cov-clr').onclick = () => {
  draft.cover = '';
  $('f-cover').value = '';
  $('f-cover').placeholder = '粘贴图片链接，或直接上传';
  renderCoverPrev();
};

$('f-save').onclick = () => {
  const title = $('f-title').value.trim();
  if (!title) { alert('至少写个标题'); $('f-title').focus(); return; }

  const rec = {
    id:     editingId || uid(),
    title,
    cat:    draft.cat,
    date:   $('f-date').value || today(),
    status: draft.status,
    stars:  draft.stars,
    note:   $('f-note').value.trim(),
    cover:  draft.cover,
    link:   draft.link,
    at:     editingId ? (db.items.find(i => i.id === editingId).at) : Date.now()
  };

  if (editingId) {
    db.items = db.items.map(i => i.id === editingId ? rec : i);
  } else {
    db.items.unshift(rec);
  }

  if (!persist()) return;
  closeForm();
  renderAll();
};

/* ---------- 本地上传：压成缩略图，别把 localStorage 撑爆 ---------- */

$('f-upload').onclick = () => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = () => {
    const file = input.files && input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        // 列表里最大显示 58px 宽，200px 足够清晰，体积约 10-20KB
        const W = 200;
        const H = Math.round(img.height * (W / img.width));
        const cv = document.createElement('canvas');
        cv.width = W; cv.height = H;
        cv.getContext('2d').drawImage(img, 0, 0, W, H);
        draft.cover = cv.toDataURL('image/jpeg', 0.75);
        $('f-cover').value = '';
        $('f-cover').placeholder = '已用上传的图片';
        renderCoverPrev();
      };
      img.onerror = () => alert('这个图片读不出来，换一张试试');
      img.src = reader.result;
    };
    reader.onerror = () => alert('读取图片失败');
    reader.readAsDataURL(file);
  };
  input.click();
};

/* ---------- 豆瓣：能自动就自动，不能就手动，绝不阻塞 ---------- */

// 豆瓣两处都对网页不友好：
//   1. suggest 接口不返回 CORS 头，也不支持 JSONP
//   2. 封面图有防盗链，非豆瓣 referer 直接 403 / 418
// 所以都得借公共代理。这些是免费服务、随时可能挂，排成一列逐个试，
// 全挂就退回手动，不影响记录本身。
const PROXIES = [
  u => 'https://proxy.cors.sh/' + u,
  u => 'https://api.allorigins.win/raw?url=' + encodeURIComponent(u),
  u => 'https://api.codetabs.com/v1/proxy?quest=' + encodeURIComponent(u),
  u => 'https://corsproxy.io/?url=' + encodeURIComponent(u)
];

function doubanUrl(q, kind) {
  const host = kind === 'book' ? 'book.douban.com' : 'movie.douban.com';
  return `https://${host}/j/subject_suggest?q=${encodeURIComponent(q)}`;
}

// 代理卡住时不能一直转圈，给每次请求一个上限。
// AbortSignal.timeout 在旧版 Chrome 上没有，退回手动 AbortController。
function timeoutSignal(ms) {
  if (AbortSignal.timeout) return AbortSignal.timeout(ms);
  const ac = new AbortController();
  setTimeout(() => ac.abort(), ms);
  return ac.signal;
}

async function fetchJSON(url) {
  for (const wrap of PROXIES) {
    try {
      const res = await fetch(wrap(url), { signal: timeoutSignal(8000) });
      if (!res.ok) continue;
      const data = await res.json();
      if (Array.isArray(data)) return data;
    } catch { /* 换下一个代理 */ }
  }
  return null;
}

/**
 * 把豆瓣封面抓下来转成本地 data URL。
 *
 * 直接把豆瓣图片地址写进 <img src> 是不行的 —— 实测无 referer 返 418，
 * 带我们自己域名的 referer 返 403，浏览器侧还会被 ORB 拦掉。
 * 但代理能拿到真实图片字节且带 CORS 头，所以这里抓完就地压成缩略图存下来。
 * 存成本地图后，以后显示不再依赖豆瓣和代理，图不会哪天突然全白。
 *
 * @returns {Promise<string|null>} data URL，失败返回 null
 */
async function cacheImage(url) {
  if (!url || url.startsWith('data:')) return url || null;

  for (const wrap of PROXIES) {
    try {
      const res = await fetch(wrap(url), { signal: timeoutSignal(9000) });
      if (!res.ok) continue;

      const blob = await res.blob();
      // 防盗链失败时豆瓣会回一个十几字节的空响应，按失败处理
      if (!blob.type.startsWith('image/') || blob.size < 800) continue;

      return await shrinkBlob(blob);
    } catch { /* 换下一个代理 */ }
  }
  return null;
}

/** 缩到 200px 宽的 jpeg，控制 localStorage 占用（一张约 10-20KB） */
function shrinkBlob(blob) {
  return new Promise(resolve => {
    const fr = new FileReader();
    fr.onload = () => {
      const img = new Image();
      img.onload = () => {
        const W = 200;
        const H = Math.max(1, Math.round(img.height * (W / img.width)));
        const cv = document.createElement('canvas');
        cv.width = W; cv.height = H;
        cv.getContext('2d').drawImage(img, 0, 0, W, H);
        try {
          resolve(cv.toDataURL('image/jpeg', 0.75));
        } catch { resolve(null); }
      };
      img.onerror = () => resolve(null);
      img.src = fr.result;
    };
    fr.onerror = () => resolve(null);
    fr.readAsDataURL(blob);
  });
}

$('f-fetch').onclick = async () => {
  const q = $('f-title').value.trim();
  if (!q) { alert('先写标题再找封面'); $('f-title').focus(); return; }

  const btn = $('f-fetch');
  btn.disabled = true;
  btn.textContent = '搜索中';

  // 书籍走 book 库，其余走 movie 库
  const kind = draft.cat === '书籍' ? 'book' : 'movie';
  const raw = await fetchJSON(doubanUrl(q, kind));

  btn.disabled = false;
  btn.textContent = '找封面';

  const box = $('sugg');
  box.style.display = 'block';

  if (!raw) {
    box.innerHTML =
      '<p class="sugg-note">自动搜索没通（豆瓣不对网页开放，得借第三方中转，' +
      '这些免费服务时好时坏）。可以点「去豆瓣搜」，复制封面图片地址贴到下面封面栏，' +
      '也能存下来；或者直接上传一张图。不填封面也完全能用。</p>';
    return;
  }

  const list = raw.slice(0, 6).map(r => ({
    title: r.title || '',
    cover: '',                            // 缩略图抓到后再填，先用排版封面占位
    remote: r.img || r.pic || '',
    sub:   [r.year, r.author_name, r.episode ? r.episode + ' 集' : ''].filter(Boolean).join(' · '),
    link:  (r.url || '').split('?')[0]
  })).filter(r => r.title);

  if (!list.length) {
    box.innerHTML = '<p class="sugg-note">没搜到，换个更完整的名字试试。</p>';
    return;
  }

  box.innerHTML = '';
  const ul = document.createElement('ul');
  ul.className = 'sugg-list';

  list.forEach(r => {
    const li = document.createElement('li');

    const cov = document.createElement('div');
    cov.className = 'cover';
    fillCover(cov, r);

    const txt = document.createElement('div');
    const t = document.createElement('div');
    t.className = 'sugg-t'; t.textContent = r.title;
    const s = document.createElement('div');
    s.className = 'sugg-s'; s.textContent = r.sub;
    txt.append(t, s);

    li.append(cov, txt);
    li.onclick = () => {
      draft.title = r.title;
      draft.cover = r.cover;          // 已抓到就是 data URL，没抓到是空
      draft.link  = r.link;
      $('f-title').value = r.title;
      $('f-cover').value = '';
      $('f-cover').placeholder = r.cover ? '已存下豆瓣封面' : '粘贴图片链接，或直接上传';
      renderCoverPrev();
      box.style.display = 'none';
    };

    ul.appendChild(li);
  });

  box.appendChild(ul);
  const note = document.createElement('p');
  note.className = 'sugg-note';
  note.textContent = '点一条把名字填进去。封面在后台试着抓，抓到了小图会自己变出来；'
    + '豆瓣防盗链挺严，抓不到属正常，用「上传图片」最稳。';
  box.appendChild(note);

  // 封面逐张抓，抓到哪张换哪张，不阻塞选择
  list.forEach(async (r, i) => {
    if (!r.remote) return;
    const data = await cacheImage(r.remote);
    if (!data) return;
    r.cover = data;
    const cell = ul.children[i];
    if (cell) fillCover(cell.querySelector('.cover'), r);
  });
};

$('f-douban').onclick = () => {
  const q = $('f-title').value.trim();
  const kind = draft.cat === '书籍' ? 'book' : 'movie';
  const url = q
    ? `https://${kind}.douban.com/subject_search?search_text=${encodeURIComponent(q)}`
    : `https://${kind}.douban.com/`;
  window.open(url, '_blank', 'noopener');
};

/* ---------- 分类管理 ---------- */

$('mng-cat').onclick = () => {
  const name = (prompt(
    '现有分类：' + db.cats.join('、') +
    '\n\n输入新名字添加；输入已有名字则删除（该分类下的记录会移到第一个分类）。'
  ) || '').trim();
  if (!name) return;

  if (db.cats.includes(name)) {
    if (db.cats.length === 1) { alert('至少留一个分类'); return; }
    const n = db.items.filter(i => i.cat === name).length;
    if (!confirm(`删除分类「${name}」？其中 ${n} 条记录会移到「${db.cats.find(c => c !== name)}」`)) return;
    db.cats = db.cats.filter(c => c !== name);
    db.items.forEach(i => { if (i.cat === name) i.cat = db.cats[0]; });
    if (filterCat === name) filterCat = '全部';
  } else {
    db.cats.push(name);
  }

  persist(); renderAll();
};

/* ============================================================
   日历视图
   ============================================================ */

let curY, curM, selDate = null;
(() => { const d = new Date(); curY = d.getFullYear(); curM = d.getMonth(); })();

function renderCal() {
  $('cal-title').textContent = `${curY} 年 ${curM + 1} 月`;

  const grid = $('grid');
  grid.innerHTML = '';

  const first = new Date(curY, curM, 1);
  const lead  = (first.getDay() + 6) % 7;              // 周一为一周起点
  const days  = new Date(curY, curM + 1, 0).getDate();
  const p = n => String(n).padStart(2, '0');

  // 按日期分组，日历里只需要查
  const byDate = {};
  db.items.forEach(i => { (byDate[i.date] = byDate[i.date] || []).push(i); });

  for (let i = 0; i < lead; i++) {
    const c = document.createElement('div');
    c.className = 'cell pad';
    grid.appendChild(c);
  }

  for (let d = 1; d <= days; d++) {
    const key = `${curY}-${p(curM + 1)}-${p(d)}`;
    const list = byDate[key] || [];

    const cell = document.createElement('button');
    cell.type = 'button';
    cell.className = 'cell'
      + (key === today() ? ' today' : '')
      + (key === selDate ? ' sel' : '')
      + (list.length ? '' : ' empty0');

    const num = document.createElement('span');
    num.className = 'dnum';
    num.textContent = d;
    cell.appendChild(num);

    // 宽屏显示标题，窄屏显示圆点（CSS 控制哪个可见）
    list.slice(0, 2).forEach(it => {
      const m = document.createElement('div');
      m.className = 'mini';
      m.textContent = it.title;
      cell.appendChild(m);
    });
    if (list.length > 2) {
      const m = document.createElement('div');
      m.className = 'mini';
      m.style.color = 'var(--text-sec)';
      m.textContent = `+${list.length - 2}`;
      cell.appendChild(m);
    }

    if (list.length) {
      const dots = document.createElement('div');
      dots.className = 'dots';
      list.slice(0, 6).forEach(() => dots.appendChild(document.createElement('i')));
      cell.appendChild(dots);
    }

    cell.onclick = () => {
      selDate = (selDate === key) ? null : key;
      renderCal();
    };

    grid.appendChild(cell);
  }

  renderDayPanel(byDate);
}

function renderDayPanel(byDate) {
  const box = $('day-panel');
  box.innerHTML = '';

  // 没选具体某天时，展示当月全部，按日期倒序
  const isDay = !!selDate;
  const rows = isDay
    ? (byDate[selDate] || [])
    : db.items
        .filter(i => i.date.startsWith(`${curY}-${String(curM + 1).padStart(2, '0')}`))
        .sort((a, b) => b.date.localeCompare(a.date) || b.at - a.at);

  const label = document.createElement('span');
  label.className = 'overline sec';
  label.textContent = isDay
    ? selDate.replace(/-/g, ' / ')
    : `${curM + 1} 月 · ${rows.length} 条`;
  box.appendChild(label);

  if (!rows.length) {
    const e = document.createElement('div');
    e.className = 'empty';
    e.style.padding = '38px 26px';
    e.innerHTML = isDay ? '这天没有记录' : '这个月还没有记录';
    box.appendChild(e);
    return;
  }

  const ul = document.createElement('ul');
  ul.className = 'items';
  rows.forEach(it => ul.appendChild(itemRow(it)));
  box.appendChild(ul);
}

$('cal-prev').onclick = () => {
  curM--; if (curM < 0) { curM = 11; curY--; }
  selDate = null; renderCal();
};
$('cal-next').onclick = () => {
  curM++; if (curM > 11) { curM = 0; curY++; }
  selDate = null; renderCal();
};
$('cal-today').onclick = () => {
  const d = new Date();
  curY = d.getFullYear(); curM = d.getMonth(); selDate = today();
  renderCal();
};

/* ============================================================
   备份
   ============================================================ */

$('export').onclick = () => store.exportFile();

$('import').onclick = () => {
  store.importFile(data => {
    const incoming = normalize(data);
    if (!incoming.items.length) { alert('备份里没有可导入的记录'); return; }

    let next;
    if (db.items.length) {
      const merge = confirm(
        `备份里有 ${incoming.items.length} 条，当前有 ${db.items.length} 条。\n\n` +
        '确定 = 合并（保留现有，去重后追加）\n取消 = 用备份完全替换'
      );
      if (merge) {
        const seen = new Set(db.items.map(i => i.title + '|' + i.date));
        const add = incoming.items.filter(i => !seen.has(i.title + '|' + i.date));
        const cats = db.cats.slice();
        incoming.cats.forEach(c => { if (!cats.includes(c)) cats.push(c); });
        next = { cats, items: db.items.concat(add) };
        alert(`已合并，新增 ${add.length} 条`);
      } else {
        next = incoming;
        alert(`已替换为备份内容，共 ${incoming.items.length} 条`);
      }
    } else {
      next = incoming;
      alert(`已恢复 ${incoming.items.length} 条`);
    }

    db = next;
    persist(); renderAll();
  });
};

/* ---------- 启动 ---------- */

function renderAll() {
  renderFilter();
  renderList();
  if ($('v-cal').classList.contains('on')) renderCal();
}

renderAll();
