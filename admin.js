/* ═══════════════════════════════════════════════════════════════════════════
   CloudForce Signature Designer — admin.js

   Architecture:
   - state          : single source of truth for all data
   - skinAccess     : create / read / update / delete / persist skins
   - stage          : renders signature into the canvas, handles selection
   - inspector      : renders right-side editor for current selection
   - skinList       : renders left-side skin list
   - actions        : import / export / templates / etc.
   - bootstrap      : event wiring + initial load
   ═══════════════════════════════════════════════════════════════════════════ */

(function(){
'use strict';

/* ─────────────────────────────────────────────────────────────────────────
   STATE — single global, mutated only via skinAccess helpers
   ───────────────────────────────────────────────────────────────────────── */
const state = {
  skins: [],
  currentId: null,
  selectedBlock: null,        // 'name', 'logo', 'contact', etc. – or null
  inspTab: 'general',         // 'general' | 'layout' | 'advanced' | 'block'
  view: 'desktop',            // 'desktop' | 'mobile'
  theme: 'light',             // 'light' | 'dark'
  filter: '',
  showCode: false,
};

const TEST_USER = {
  name: 'Martin Maryška',
  pronouns: 'on/jeho',
  title: 'Senior Developer',
  department: 'CloudForce Studio',
  phone: '+420 721 736 789',
  mobile: '+420 777 111 222',
  email: 'martin@cloudforce.cz',
  address: 'Stodolní 4, Ostrava',
  photo: 'https://i.pravatar.cc/120?img=12',
  social: { linkedin: 'martin-maryska', x: 'martinm', github: 'martinm' },
  lang: 'cs',
};

const LAYOUTS = [
  { id: 'two-column', label: 'Dva sloupce',  bars: [[40,18],[60,12],[80,12]] },
  { id: 'stacked',    label: 'Jeden sloupec',bars: [[60,12],[80,12],[40,12]] },
  { id: 'card',       label: 'Karta',        bars: [[100,16],[60,12],[80,12]] },
  { id: 'hero',       label: 'Hero',         bars: [[80,18],[40,4],[60,10]] },
  { id: 'bordered',   label: 'Rámeček',      bars: [[70,14],[70,12],[70,12]] },
  { id: 'left-bar',   label: 'Levá lišta',   bars: [[60,14],[70,12],[80,12]] },
  { id: 'letterhead', label: 'Letterhead',   bars: [[60,16],[80,12],[60,12]] },
];

const SOCIAL_PLATFORMS = [
  { id:'linkedin',  label:'LinkedIn',  letter:'in', color:'#0A66C2' },
  { id:'x',         label:'X / Twitter',letter:'X', color:'#000000' },
  { id:'facebook',  label:'Facebook',  letter:'f',  color:'#1877F2' },
  { id:'instagram', label:'Instagram', letter:'IG', color:'#E4405F' },
  { id:'github',    label:'GitHub',    letter:'GH', color:'#181717' },
  { id:'youtube',   label:'YouTube',   letter:'YT', color:'#FF0000' },
];

const FONT_OPTIONS = [
  ["'Segoe UI', Arial, sans-serif",         'Segoe UI'],
  ["Arial, Helvetica, sans-serif",          'Arial'],
  ["Georgia, 'Times New Roman', serif",     'Georgia'],
  ["'Times New Roman', Times, serif",       'Times New Roman'],
  ["Verdana, Geneva, sans-serif",           'Verdana'],
  ["Tahoma, Geneva, sans-serif",            'Tahoma'],
  ["'Courier New', Courier, monospace",     'Courier'],
  ["'Trebuchet MS', sans-serif",            'Trebuchet'],
];

const TEMPLATES = [
  { name:'CloudForce', sub:'Originál, dva sloupce', apply: s => s },
  { name:'Tmavý',      sub:'Pro tmavé pozadí',      apply: s => {
      s.name='Tmavý'; s.layout='stacked';
      Object.assign(s.styles, {
        nameColor:'#fff', darkBg:'#111827',
        accentColor:'#6366f1', titleColor:'#9ca3af', contactColor:'#cbd5e1',
        dividerColor:'#6366f1'
      });
      s.company.logoInvert=true; s.blocks.menu=false; s.blocks.photo=true;
      return s;
  }},
  { name:'Minimalistický', sub:'Levý zelený okraj', apply: s => {
      s.name='Minimalistický'; s.layout='stacked';
      Object.assign(s.styles, {
        nameUppercase:false, nameColor:'#111827',
        titleColor:'#6b7280', contactColor:'#374151',
        borderColor:'#059669', accentColor:'#059669', dividerWidth:0
      });
      s.blocks.menu=false; s.blocks.social=false;
      return s;
  }},
  { name:'Karta', sub:'Barevná hlavička', apply: s => {
      s.name='Karta'; s.layout='card';
      Object.assign(s.styles, {
        cardHeaderBg:'#be123c', cardHeaderTextColor:'#fff',
        accentColor:'#f59e0b', primaryColor:'#be123c'
      });
      s.blocks.menu=false;
      return s;
  }},
  { name:'S fotem', sub:'Kulaté foto profilu', apply: s => {
      s.name='S fotem'; s.blocks.photo=true;
      return s;
  }},
  { name:'S QR', sub:'QR vizitka', apply: s => {
      s.name='S QR'; s.blocks.qr=true; s.qr.enabled=true;
      return s;
  }},
];

/* ─────────────────────────────────────────────────────────────────────────
   SKIN ACCESS — pure data ops
   ───────────────────────────────────────────────────────────────────────── */
const skinAccess = {
  base(){
    return {
      id: 'skin_' + Date.now() + Math.random().toString(36).slice(2,7),
      name: 'Nový skin',
      layout: 'two-column',
      default: false,
      disclaimer: '',
      styles: {
        primaryColor:'#23457a', accentColor:'#1fc09f',
        fontFamily:"'Segoe UI', Arial, Helvetica, sans-serif",
        nameSize:16, nameBold:true, nameUppercase:true, nameColor:'#23457a',
        titleSize:14, titleItalic:true, titleColor:'#000000',
        contactSize:14, contactColor:'#23457a',
        dividerColor:'#1fc09f', dividerWidth:58, separatorColor:'#bfc0c5',
        cardHeaderBg:'#23457a', cardHeaderTextColor:'#ffffff', cardBodyBg:'#f8fafc',
        darkBg:'', borderColor:'',
        photoSize:64, photoRound:true,
      },
      company: {
        logoUrl:'https://cloudforce.cz/wp-content/uploads/2026/05/logo-cloudforce.png',
        logoWidth:200, logoLink:'https://cloudforce.cz/', logoInvert:false,
        websiteUrl:'https://cloudforce.cz/', websiteLabel:'www.cloudforce.cz',
        phoneIconUrl:'https://cloudforce.cz/wp-content/uploads/2026/05/icon-phone.png',
        emailIconUrl:'https://cloudforce.cz/wp-content/uploads/2026/05/icon-email.png',
        webIconUrl:'https://cloudforce.cz/wp-content/uploads/2026/05/icon-web.png',
      },
      blocks: {
        name:true, pronouns:true, title:true, department:true,
        divider:true, logo:true, phone:true, mobile:true,
        email:true, web:true, address:true, menu:true,
        photo:false, social:true, qr:false,
      },
      menu: { enabled:true, items:[
        { label:'M365',     url:'https://cloudforce.cz/microsoft-365/' },
        { label:'LICENCE',  url:'https://cloudforce.cz/produkt-kategorie/licence-office-365/' },
        { label:'APLIKACE', url:'https://cloudforce.cz/produkt-kategorie/aplikace/' },
        { label:'SLUŽBY',   url:'https://cloudforce.cz/produkt-kategorie/sluzby/' },
      ]},
      social: { enabled:true, platforms:['linkedin','x','github'] },
      qr: { enabled:false },
      banner: { enabled:false, imageUrl:'', link:'', alt:'', width:500, startDate:'', endDate:'' },
      darkVariant: { enabled:false, styles:{} },
      translations: {},
    };
  },
  current(){ return state.skins.find(s => s.id === state.currentId) || null; },
  save(){ localStorage.setItem('cf_admin_skins', JSON.stringify(state.skins)); },
  load(){
    const cached = localStorage.getItem('cf_admin_skins');
    if (cached){ try { state.skins = JSON.parse(cached); return Promise.resolve(); } catch(e){} }
    return fetch('skins.json').then(r => r.json()).then(d => { state.skins = d; this.save(); }).catch(()=>{
      state.skins = [this.base()];
      state.skins[0].name = 'CloudForce Original';
      state.skins[0].default = true;
      this.save();
    });
  },
  add(skin){ state.skins.push(skin); this.save(); },
  duplicate(id){
    const src = state.skins.find(s => s.id === id);
    if (!src) return null;
    const copy = JSON.parse(JSON.stringify(src));
    copy.id = 'skin_' + Date.now();
    copy.name = src.name + ' (kopie)';
    copy.default = false;
    state.skins.push(copy); this.save();
    return copy;
  },
  remove(id){
    state.skins = state.skins.filter(s => s.id !== id);
    if (state.currentId === id) state.currentId = state.skins[0]?.id || null;
    this.save();
  },
  setDefault(id){
    state.skins.forEach(s => s.default = (s.id === id));
    this.save();
  },
};

/* ─────────────────────────────────────────────────────────────────────────
   STAGE — render signature into the canvas
   ───────────────────────────────────────────────────────────────────────── */
const stage = {
  el(){ return document.getElementById('sigStage'); },
  wrap(){ return document.getElementById('canvasWrap'); },

  render(){
    const skin = skinAccess.current();
    const el = this.el(); if (!el) return;
    if (!skin){ el.innerHTML = ''; document.getElementById('codeOut').textContent = ''; return; }

    const user = { ...TEST_USER, lang: document.getElementById('langSel').value || 'cs' };
    const html = renderSignatureHTML(skin, user, {
      editor: true,
      dark: state.theme === 'dark',
    });
    el.innerHTML = html;
    document.getElementById('codeOut').textContent = renderSignatureHTML(skin, user, { dark: state.theme==='dark' }).trim();

    // Re-apply selection highlight after re-render
    if (state.selectedBlock){
      const sel = el.querySelector(`[data-cf-block="${state.selectedBlock}"]`);
      if (sel) sel.classList.add('selected');
    }

    // Update canvas chrome
    const wrap = this.wrap();
    wrap.classList.toggle('dark', state.theme === 'dark');
    wrap.classList.toggle('mobile', state.view === 'mobile');
  },

  bindClicks(){
    const el = this.el();
    el.addEventListener('click', e => {
      const block = e.target.closest('[data-cf-block]');
      if (block){
        e.stopPropagation();
        const name = block.getAttribute('data-cf-block');
        this.select(name);
      } else {
        this.deselect();
      }
    });
  },

  select(blockName){
    state.selectedBlock = blockName;
    state.inspTab = 'block';
    this.render();
    inspector.render();
  },
  deselect(){
    state.selectedBlock = null;
    if (state.inspTab === 'block') state.inspTab = 'general';
    this.render();
    inspector.render();
  },
};

/* ─────────────────────────────────────────────────────────────────────────
   INSPECTOR — right-side panel; field renderers
   ───────────────────────────────────────────────────────────────────────── */

// helpers
function elt(tag, props, ...kids){
  const e = document.createElement(tag);
  if (props) for (const k in props){
    if (k === 'class') e.className = props[k];
    else if (k === 'html') e.innerHTML = props[k];
    else if (k.startsWith('on') && typeof props[k] === 'function') e.addEventListener(k.slice(2).toLowerCase(), props[k]);
    else if (k === 'style' && typeof props[k] === 'object') Object.assign(e.style, props[k]);
    else if (k === 'attrs') for (const a in props[k]) e.setAttribute(a, props[k][a]);
    else e[k] = props[k];
  }
  for (const k of kids) if (k != null) e.appendChild(typeof k === 'string' ? document.createTextNode(k) : k);
  return e;
}

function patch(skin, path, value){
  // path like 'styles.primaryColor', 'company.logoUrl', 'blocks.name'
  const parts = path.split('.');
  let o = skin;
  for (let i = 0; i < parts.length - 1; i++){
    if (!o[parts[i]]) o[parts[i]] = {};
    o = o[parts[i]];
  }
  o[parts[parts.length - 1]] = value;
  skinAccess.save();
}

/* Field components */
const F = {
  text(skin, path, label, opts){
    opts = opts || {};
    const v = path.split('.').reduce((o,k)=>o?.[k], skin) || '';
    const input = elt('input', { type:'text', value:v, attrs:{ placeholder: opts.placeholder||'' },
      oninput: e => { patch(skin, path, e.target.value); refreshLight(); } });
    return elt('div', { class:'field' }, elt('label', {}, label), input);
  },
  textarea(skin, path, label, opts){
    opts = opts || {};
    const v = path.split('.').reduce((o,k)=>o?.[k], skin) || '';
    const ta = elt('textarea', { attrs:{ rows:opts.rows||3, placeholder: opts.placeholder||'' },
      oninput: e => { patch(skin, path, e.target.value); refreshLight(); } });
    ta.value = v;
    return elt('div', { class:'field' }, elt('label', {}, label), ta);
  },
  url(skin, path, label, opts){
    opts = opts || {};
    const v = path.split('.').reduce((o,k)=>o?.[k], skin) || '';
    const input = elt('input', { type:'url', value:v, attrs:{ placeholder: opts.placeholder||'https://…' },
      oninput: e => { patch(skin, path, e.target.value); refreshLight(); } });
    return elt('div', { class:'field' }, elt('label', {}, label), input);
  },
  num(skin, path, label, opts){
    opts = opts || {};
    const v = path.split('.').reduce((o,k)=>o?.[k], skin);
    const input = elt('input', { type:'number', value: v||opts.def||0,
      attrs:{ min: opts.min||0, max: opts.max||999, step: opts.step||1 },
      oninput: e => { patch(skin, path, parseInt(e.target.value)||0); refreshLight(); } });
    const inc = elt('button', { type:'button', onclick: () => {
      const n = parseInt(input.value)||0; input.value = Math.min(opts.max||999, n+(opts.step||1));
      input.dispatchEvent(new Event('input'));
    }}, '+');
    const dec = elt('button', { type:'button', onclick: () => {
      const n = parseInt(input.value)||0; input.value = Math.max(opts.min||0, n-(opts.step||1));
      input.dispatchEvent(new Event('input'));
    }}, '−');
    return elt('div', { class:'field' }, elt('label', {}, label),
      elt('div', { class:'num-stepper' }, dec, input, inc));
  },
  color(skin, path, label){
    const v = path.split('.').reduce((o,k)=>o?.[k], skin) || '#000000';
    const sw = elt('div', { class:'color-swatch', style:{ background: v } });
    const picker = elt('input', { type:'color', value: v });
    const text = elt('input', { type:'text', class:'color-text', value: v });
    const update = newVal => {
      patch(skin, path, newVal);
      sw.style.background = newVal;
      picker.value = newVal;
      text.value = newVal;
      refreshLight();
    };
    picker.addEventListener('input', e => update(e.target.value));
    text.addEventListener('change', e => {
      const val = e.target.value.trim();
      if (/^#[0-9a-f]{6}$/i.test(val)) update(val);
      else text.value = v;
    });
    sw.appendChild(picker);
    return elt('div', { class:'field' }, elt('label', {}, label),
      elt('div', { class:'color-field' }, sw, text));
  },
  toggleGroup(skin, path, label, options){
    const current = path.split('.').reduce((o,k)=>o?.[k], skin);
    const grp = elt('div', { class:'toggle-grp' });
    options.forEach(([val, lbl]) => {
      const b = elt('button', { type:'button', class: current === val ? 'on' : '',
        onclick: () => {
          patch(skin, path, val);
          grp.querySelectorAll('button').forEach(x => x.classList.remove('on'));
          b.classList.add('on');
          refreshLight();
        }}, lbl);
      grp.appendChild(b);
    });
    return elt('div', { class:'field' }, elt('label', {}, label), grp);
  },
  check(skin, path, label, desc){
    const v = !!path.split('.').reduce((o,k)=>o?.[k], skin);
    const inp = elt('input', { type:'checkbox', checked: v,
      onchange: e => { patch(skin, path, e.target.checked); refreshLight(); } });
    const box = elt('span', { class:'box' });
    const lbl = elt('div', { class:'lbl', style:{flex:'1'} }, label);
    if (desc) lbl.appendChild(elt('div', { class:'desc' }, desc));
    return elt('label', { class:'chk' }, inp, box, lbl);
  },
  select(skin, path, label, options){
    const v = path.split('.').reduce((o,k)=>o?.[k], skin);
    const sel = elt('select', { onchange: e => { patch(skin, path, e.target.value); refreshLight(); } });
    options.forEach(([val, lbl]) => {
      const o = elt('option', { value: val }, lbl);
      if (val === v) o.selected = true;
      sel.appendChild(o);
    });
    return elt('div', { class:'field' }, elt('label', {}, label), sel);
  },
};

const inspector = {
  render(){
    const body = document.getElementById('inspBody');
    const skin = skinAccess.current();
    body.innerHTML = '';
    body.classList.add('fade-in');
    setTimeout(()=>body.classList.remove('fade-in'), 250);

    // Update title bar
    const eyebrow = document.getElementById('inspEyebrow');
    const title = document.getElementById('inspTitle');
    if (!skin){
      eyebrow.textContent = 'Inspektor';
      title.textContent = 'Žádný výběr';
      body.appendChild(elt('div', { class:'insp-empty', html:'<span class="ic">«</span><p>Vyberte skin v levém panelu nebo klikněte na prvek v náhledu.</p>' }));
      return;
    }
    eyebrow.textContent = state.selectedBlock ? 'Vybraný prvek' : 'Skin';
    title.textContent = state.selectedBlock ? BLOCK_LABEL[state.selectedBlock] || state.selectedBlock : skin.name;

    // Tabs visibility
    this.renderTabs();

    if (state.selectedBlock){
      // Block-specific inspector
      body.appendChild(this.blockHeader(state.selectedBlock));
      this.renderBlockEditor(body, skin, state.selectedBlock);
      return;
    }

    if (state.inspTab === 'general') this.renderGeneral(body, skin);
    else if (state.inspTab === 'layout') this.renderLayout(body, skin);
    else if (state.inspTab === 'advanced') this.renderAdvanced(body, skin);
  },

  renderTabs(){
    const tabsEl = document.getElementById('inspTabs');
    tabsEl.innerHTML = '';
    if (state.selectedBlock){
      // show only block tab
      const t = elt('button', { class:'insp-tab active' }, '· Prvek');
      tabsEl.appendChild(t);
      return;
    }
    const tabs = [['general','Skin'],['layout','Layout'],['advanced','Pokročilé']];
    tabs.forEach(([id, lbl]) => {
      const t = elt('button', { class:'insp-tab' + (state.inspTab === id ? ' active' : ''),
        onclick: () => { state.inspTab = id; this.render(); }}, lbl);
      tabsEl.appendChild(t);
    });
  },

  blockHeader(block){
    return elt('div', { class:'insp-block-header' },
      elt('span', { class:'badge' }, BLOCK_LABEL_SHORT[block] || block),
      elt('span', { class:'nm' }, BLOCK_LABEL[block] || block),
      elt('button', { class:'x', onclick: () => stage.deselect() }, '✕'));
  },

  /* ── GENERAL TAB ── */
  renderGeneral(body, skin){
    const s1 = section('Identifikace');
    s1.appendChild(F.text(skin, 'name', 'Název skinu'));
    s1.appendChild(F.check(skin, 'default', '★ Výchozí skin', 'Předvybere se uživatelům'));
    body.appendChild(s1);

    const s2 = section('Barva & písmo');
    s2.appendChild(F.color(skin, 'styles.primaryColor', 'Primární barva'));
    s2.appendChild(F.color(skin, 'styles.accentColor', 'Akcent (čára, tečky)'));
    s2.appendChild(this.brandSwatches(skin));
    s2.appendChild(F.select(skin, 'styles.fontFamily', 'Písmo', FONT_OPTIONS));
    body.appendChild(s2);

    const s3 = section('Firma — globální');
    s3.appendChild(F.url(skin, 'company.logoUrl', 'URL loga'));
    s3.appendChild(this.logoDropzone(skin));
    s3.appendChild(F.num(skin, 'company.logoWidth', 'Šířka loga (px)', { min:50, max:500 }));
    s3.appendChild(F.url(skin, 'company.logoLink', 'Odkaz loga'));
    s3.appendChild(F.check(skin, 'company.logoInvert', 'Invertovat logo (pro tmavé pozadí)'));
    s3.appendChild(F.url(skin, 'company.websiteUrl', 'URL webu'));
    s3.appendChild(F.text(skin, 'company.websiteLabel', 'Text odkazu webu'));
    body.appendChild(s3);

    const s4 = section('Validace');
    const val = validate(skin);
    s4.appendChild(this.valBar(val));
    body.appendChild(s4);
  },

  /* ── LAYOUT TAB ── */
  renderLayout(body, skin){
    const s1 = section('Rozvržení');
    s1.appendChild(this.layoutCards(skin));
    body.appendChild(s1);

    const s2 = section('Zobrazené prvky');
    const blocks = [
      ['name','Jméno'],['pronouns','Zájmena'],['title','Pozice'],['department','Oddělení'],
      ['divider','Čára pod jménem'],['logo','Logo'],['photo','Foto profilu'],
      ['phone','Telefon'],['mobile','Mobil'],['email','Email'],['web','Web'],['address','Adresa'],
      ['menu','Navigační menu'],['social','Sociální sítě'],['qr','QR vizitka'],
    ];
    blocks.forEach(([k,l]) => s2.appendChild(F.check(skin, `blocks.${k}`, l)));
    body.appendChild(s2);

    if (skin.layout === 'card'){
      const s3 = section('Karta — barvy');
      s3.appendChild(F.color(skin, 'styles.cardHeaderBg', 'Pozadí hlavičky'));
      s3.appendChild(F.color(skin, 'styles.cardHeaderTextColor', 'Text hlavičky'));
      s3.appendChild(F.color(skin, 'styles.cardBodyBg', 'Pozadí těla karty'));
      body.appendChild(s3);
    }
    if (skin.layout === 'stacked'){
      const s3 = section('Sloupec — speciální');
      s3.appendChild(F.color(skin, 'styles.borderColor', 'Levý okraj (prázdné = vypnuto)'));
      s3.appendChild(F.color(skin, 'styles.darkBg', 'Tmavé pozadí (prázdné = vypnuto)'));
      body.appendChild(s3);
    }
  },

  /* ── ADVANCED TAB ── */
  renderAdvanced(body, skin){
    const s1 = section('Banner / kampaň');
    s1.appendChild(F.check(skin, 'banner.enabled', 'Zobrazit banner pod podpisem'));
    s1.appendChild(F.url(skin, 'banner.imageUrl', 'URL obrázku'));
    s1.appendChild(F.url(skin, 'banner.link', 'Odkaz po kliknutí'));
    s1.appendChild(F.num(skin, 'banner.width', 'Šířka (px)', { min:100, max:700 }));
    const dates = elt('div', { class:'field-row' });
    dates.appendChild(F.text(skin, 'banner.startDate', 'Platí od'));
    dates.appendChild(F.text(skin, 'banner.endDate', 'Platí do'));
    s1.appendChild(dates);
    body.appendChild(s1);

    const s2 = section('Sociální sítě');
    s2.appendChild(F.check(skin, 'social.enabled', 'Zobrazit ikony soc. sítí'));
    s2.appendChild(this.socialPlatforms(skin));
    body.appendChild(s2);

    const s3 = section('QR vizitka');
    s3.appendChild(F.check(skin, 'qr.enabled', 'Zobrazit QR kód s vCard'));
    body.appendChild(s3);

    const s4 = section('Disclaimer / patička');
    s4.appendChild(F.textarea(skin, 'disclaimer', 'Text disclaimeru', { rows:4 }));
    body.appendChild(s4);

    const s5 = section('Navigační menu');
    s5.appendChild(F.check(skin, 'menu.enabled', 'Zobrazit menu pod logem'));
    s5.appendChild(this.menuItems(skin));
    body.appendChild(s5);

    const s6 = section('Jazykové varianty');
    s6.appendChild(this.langEditor(skin));
    body.appendChild(s6);

    const s7 = section('Dark mode varianta');
    s7.appendChild(F.check(skin, 'darkVariant.enabled', 'Mít zvlášť variantu pro dark mode'));
    if (skin.darkVariant?.enabled){
      s7.appendChild(F.color(skin, 'darkVariant.styles.darkBg', 'Pozadí (dark)'));
      s7.appendChild(F.color(skin, 'darkVariant.styles.nameColor', 'Barva jména (dark)'));
      s7.appendChild(F.color(skin, 'darkVariant.styles.contactColor', 'Kontakt (dark)'));
      s7.appendChild(F.color(skin, 'darkVariant.styles.accentColor', 'Akcent (dark)'));
    }
    body.appendChild(s7);
  },

  /* ── BLOCK-SPECIFIC EDITOR ── */
  renderBlockEditor(body, skin, block){
    if (block === 'name'){
      const s1 = section('Styl jména');
      s1.appendChild(F.num(skin, 'styles.nameSize', 'Velikost (px)', { min:10, max:32 }));
      s1.appendChild(F.color(skin, 'styles.nameColor', 'Barva'));
      s1.appendChild(F.check(skin, 'styles.nameBold', 'Tučné'));
      s1.appendChild(F.check(skin, 'styles.nameUppercase', 'VERZÁLKY'));
      body.appendChild(s1);

      const s2 = section('Pozice & oddělení');
      s2.appendChild(F.num(skin, 'styles.titleSize', 'Velikost pozice', { min:9, max:24 }));
      s2.appendChild(F.color(skin, 'styles.titleColor', 'Barva pozice'));
      s2.appendChild(F.check(skin, 'styles.titleItalic', 'Kurzíva'));
      s2.appendChild(F.check(skin, 'blocks.pronouns', 'Zobrazit zájmena vedle jména'));
      s2.appendChild(F.check(skin, 'blocks.department', 'Zobrazit oddělení vedle pozice'));
      body.appendChild(s2);
    }
    else if (block === 'divider'){
      const s = section('Oddělovací čára');
      s.appendChild(F.color(skin, 'styles.dividerColor', 'Barva čáry'));
      s.appendChild(F.num(skin, 'styles.dividerWidth', 'Šířka (px)', { min:0, max:300 }));
      s.appendChild(elt('div', { class:'field', html:'<small style="color:var(--ink-2);">Nastavte šířku na 0 pro skrytí.</small>' }));
      body.appendChild(s);
    }
    else if (block === 'logo'){
      const s = section('Logo');
      s.appendChild(F.url(skin, 'company.logoUrl', 'URL loga'));
      s.appendChild(this.logoDropzone(skin));
      s.appendChild(F.num(skin, 'company.logoWidth', 'Šířka (px)', { min:50, max:500 }));
      s.appendChild(F.url(skin, 'company.logoLink', 'Odkaz loga'));
      s.appendChild(F.check(skin, 'company.logoInvert', 'Invertovat (pro tmavé pozadí)'));
      body.appendChild(s);
    }
    else if (block === 'menu'){
      const s = section('Položky menu');
      s.appendChild(F.check(skin, 'menu.enabled', 'Zobrazit menu'));
      s.appendChild(this.menuItems(skin));
      body.appendChild(s);
    }
    else if (block === 'contact'){
      const s = section('Kontaktní údaje');
      s.appendChild(F.num(skin, 'styles.contactSize', 'Velikost textu', { min:9, max:20 }));
      s.appendChild(F.color(skin, 'styles.contactColor', 'Barva textu'));
      s.appendChild(F.url(skin, 'company.phoneIconUrl', 'Ikonka telefonu (URL)'));
      s.appendChild(F.url(skin, 'company.emailIconUrl', 'Ikonka emailu (URL)'));
      s.appendChild(F.url(skin, 'company.webIconUrl', 'Ikonka webu (URL)'));
      body.appendChild(s);
      const s2 = section('Zobrazené řádky');
      ['phone','mobile','email','web','address'].forEach(k =>
        s2.appendChild(F.check(skin, `blocks.${k}`, BLOCK_LABEL[k]||k))
      );
      body.appendChild(s2);
    }
    else if (block === 'social'){
      const s = section('Sociální sítě');
      s.appendChild(F.check(skin, 'social.enabled', 'Zobrazit ikony'));
      s.appendChild(this.socialPlatforms(skin));
      body.appendChild(s);
    }
    else if (block === 'photo'){
      const s = section('Foto profilu');
      s.appendChild(F.num(skin, 'styles.photoSize', 'Velikost (px)', { min:32, max:120 }));
      s.appendChild(F.check(skin, 'styles.photoRound', 'Kulaté foto'));
      body.appendChild(s);
    }
    else if (block === 'qr'){
      const s = section('QR vizitka');
      s.appendChild(F.check(skin, 'qr.enabled', 'Zapnout'));
      s.appendChild(elt('div', { html:'<small style="color:var(--amber);display:block;padding:8px 10px;background:rgba(255,181,71,0.06);border-radius:5px;border:1px solid rgba(255,181,71,0.2);">⚠ Klasický Outlook na Windows může base64 QR obrázky blokovat. Otestujte před nasazením.</small>' }));
      body.appendChild(s);
    }
    else if (block === 'banner'){
      const s = section('Banner / kampaň');
      s.appendChild(F.check(skin, 'banner.enabled', 'Zapnutý'));
      s.appendChild(F.url(skin, 'banner.imageUrl', 'URL obrázku'));
      s.appendChild(F.url(skin, 'banner.link', 'Odkaz po kliknutí'));
      s.appendChild(F.num(skin, 'banner.width', 'Šířka (px)', { min:100, max:700 }));
      s.appendChild(F.text(skin, 'banner.startDate', 'Platí od (YYYY-MM-DD)'));
      s.appendChild(F.text(skin, 'banner.endDate', 'Platí do (YYYY-MM-DD)'));
      body.appendChild(s);
    }
  },

  /* ── Sub-components ── */
  brandSwatches(skin){
    const colors = JSON.parse(localStorage.getItem('cf_brand_colors')||'[]');
    const wrap = elt('div', { class:'swatches' });
    colors.forEach(c => {
      const sw = elt('div', { class:'brand-sw', style:{background:c}, attrs:{title:c},
        onclick: () => { navigator.clipboard.writeText(c); toast(`Zkopírováno: ${c}`); }});
      sw.appendChild(elt('span', { class:'x', onclick: e => {
        e.stopPropagation();
        const next = colors.filter(x => x !== c);
        localStorage.setItem('cf_brand_colors', JSON.stringify(next));
        this.render();
      }}, '×'));
      wrap.appendChild(sw);
    });
    const add = elt('button', { class:'brand-sw-add', onclick: () => {
      const p = skin.styles.primaryColor, a = skin.styles.accentColor;
      const next = [...colors];
      if (p && !next.includes(p)) next.push(p);
      if (a && !next.includes(a)) next.push(a);
      localStorage.setItem('cf_brand_colors', JSON.stringify(next.slice(0,18)));
      this.render();
      toast('Barvy uloženy do palety');
    }}, '+');
    wrap.appendChild(add);
    return elt('div', { class:'field' }, elt('label', {}, 'Paleta značky'), wrap);
  },

  logoDropzone(skin){
    const drop = elt('div', { class:'dropzone' });
    drop.appendChild(elt('div', { class:'lbl' }, '↑ Nahrát logo (drag & drop)'));
    drop.appendChild(elt('div', { class:'sub' }, 'PNG, JPG, SVG — base64 inline'));
    if (skin.company.logoUrl){
      const img = elt('img', { class:'logo-prev', attrs:{src: skin.company.logoUrl} });
      drop.appendChild(img);
    }
    const file = elt('input', { type:'file', style:{display:'none'}, attrs:{accept:'image/*'}});
    drop.appendChild(file);
    drop.addEventListener('click', () => file.click());
    file.addEventListener('change', e => {
      if (!e.target.files[0]) return;
      const r = new FileReader();
      r.onload = ev => {
        patch(skin, 'company.logoUrl', ev.target.result);
        toast('Logo nahráno — pro produkci nahrajte na hosting');
        inspector.render();
      };
      r.readAsDataURL(e.target.files[0]);
    });
    ['dragover','dragenter'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('drag'); }));
    ['dragleave','drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('drag'); }));
    drop.addEventListener('drop', e => {
      const f = e.dataTransfer.files[0]; if (!f) return;
      const r = new FileReader();
      r.onload = ev => { patch(skin, 'company.logoUrl', ev.target.result); inspector.render(); };
      r.readAsDataURL(f);
    });
    return elt('div', { class:'field' }, drop);
  },

  layoutCards(skin){
    const wrap = elt('div', { class:'layout-cards' });
    LAYOUTS.forEach(layout => {
      const card = elt('div', { class:'layout-card' + (skin.layout === layout.id ? ' active' : ''),
        onclick: () => { patch(skin, 'layout', layout.id); refreshLight(); this.render(); }});
      const ico = elt('div', { class:'ico' });
      // Generic icon renderer: stack of bars defined per layout
      if (layout.id === 'two-column'){
        ico.style.flexDirection = 'row';
        ico.appendChild(elt('div', { style:{width:'10px',height:'24px'} }));
        ico.appendChild(elt('div', { style:{width:'14px',height:'24px'} }));
      } else if (layout.id === 'card'){
        ico.style.flexDirection = 'column';
        ico.style.gap = '0';
        ico.appendChild(elt('div', { style:{width:'28px',height:'8px',background:'currentColor',opacity:'1'} }));
        ico.appendChild(elt('div', { style:{width:'28px',height:'14px',background:'rgba(255,255,255,0.1)',border:'1px solid currentColor',marginTop:'-1px'} }));
      } else if (layout.id === 'hero'){
        ico.style.flexDirection = 'column';
        ico.style.alignItems = 'center';
        ico.appendChild(elt('div', { style:{width:'22px',height:'5px'} }));
        ico.appendChild(elt('div', { style:{width:'10px',height:'2px',marginTop:'2px'} }));
        ico.appendChild(elt('div', { style:{width:'16px',height:'3px',marginTop:'3px'} }));
      } else if (layout.id === 'bordered'){
        ico.appendChild(elt('div', { style:{width:'26px',height:'24px',border:'1.5px solid currentColor',background:'transparent'} }));
      } else if (layout.id === 'left-bar'){
        ico.style.flexDirection = 'row';
        ico.style.alignItems = 'stretch';
        ico.appendChild(elt('div', { style:{width:'4px',height:'24px',opacity:'1'} }));
        ico.appendChild(elt('div', { style:{display:'flex',flexDirection:'column',gap:'3px',justifyContent:'center',marginLeft:'4px'} },
          elt('div',{style:{width:'18px',height:'3px'}}),
          elt('div',{style:{width:'14px',height:'2px'}}),
          elt('div',{style:{width:'16px',height:'2px'}}),
        ));
      } else if (layout.id === 'letterhead'){
        ico.style.flexDirection = 'column';
        ico.style.alignItems = 'center';
        ico.appendChild(elt('div', { style:{width:'24px',height:'1px',background:'currentColor',opacity:'1'} }));
        ico.appendChild(elt('div', { style:{width:'14px',height:'4px',marginTop:'2px'} }));
        ico.appendChild(elt('div', { style:{width:'24px',height:'1px',background:'currentColor',opacity:'1',marginTop:'2px'} }));
        ico.appendChild(elt('div', { style:{width:'16px',height:'2px',marginTop:'3px'} }));
      } else { /* stacked */
        ico.style.flexDirection = 'column';
        ico.appendChild(elt('div', { style:{width:'24px',height:'4px'} }));
        ico.appendChild(elt('div', { style:{width:'18px',height:'3px'} }));
        ico.appendChild(elt('div', { style:{width:'22px',height:'3px'} }));
      }
      card.appendChild(ico);
      card.appendChild(elt('div', { class:'lbl' }, layout.label));
      wrap.appendChild(card);
    });
    return wrap;
  },

  socialPlatforms(skin){
    const wrap = elt('div');
    SOCIAL_PLATFORMS.forEach(p => {
      const checked = (skin.social.platforms||[]).includes(p.id);
      const lbl = elt('label', { class:'soc-chk' });
      const cb = elt('input', { type:'checkbox', checked,
        onchange: e => {
          let list = skin.social.platforms || [];
          if (e.target.checked && !list.includes(p.id)) list = [...list, p.id];
          else list = list.filter(x => x !== p.id);
          patch(skin, 'social.platforms', list);
          refreshLight();
        }});
      lbl.appendChild(cb);
      lbl.appendChild(elt('span', { class:'badge2', style:{background:p.color} }, p.letter));
      lbl.appendChild(elt('span', { class:'nm2' }, p.label));
      lbl.appendChild(elt('span', { class:'pip' }));
      wrap.appendChild(lbl);
    });
    return wrap;
  },

  menuItems(skin){
    const wrap = elt('div');
    (skin.menu?.items || []).forEach((item, i) => {
      const row = elt('div', { class:'repeat-item' });
      const lbl = elt('input', { type:'text', value: item.label, attrs:{placeholder:'Label'},
        oninput: e => { skin.menu.items[i].label = e.target.value; skinAccess.save(); refreshLight(); }});
      const url = elt('input', { type:'url', value: item.url, attrs:{placeholder:'https://…'},
        oninput: e => { skin.menu.items[i].url = e.target.value; skinAccess.save(); refreshLight(); }});
      const del = elt('button', { class:'del', onclick: () => {
        skin.menu.items.splice(i, 1); skinAccess.save(); inspector.render(); refreshLight();
      }}, '×');
      row.appendChild(lbl); row.appendChild(url); row.appendChild(del);
      wrap.appendChild(row);
    });
    const add = elt('button', { class:'add-item', onclick: () => {
      if (!skin.menu) skin.menu = { enabled:true, items:[] };
      skin.menu.items.push({ label:'NOVÁ', url:'https://' });
      skinAccess.save(); inspector.render(); refreshLight();
    }}, '+ Přidat položku');
    wrap.appendChild(add);
    return wrap;
  },

  langEditor(skin){
    const wrap = elt('div');
    ['en','de','sk'].forEach(lng => {
      const t = (skin.translations && skin.translations[lng]) || {};
      const card = elt('div', { style:{ background:'var(--bg-2)', border:'1px solid var(--line)', borderRadius:'6px', padding:'10px', marginBottom:'8px' } });
      card.appendChild(elt('div', { style:{ fontFamily:'var(--mono)', fontSize:'10px', letterSpacing:'0.16em', color:'var(--ink-2)', marginBottom:'8px', textTransform:'uppercase' } }, lng));
      const lbl = elt('input', { type:'text', value: t.websiteLabel||'', attrs:{placeholder:'www.firma.com'},
        oninput: e => {
          if (!skin.translations) skin.translations = {};
          if (!skin.translations[lng]) skin.translations[lng] = {};
          skin.translations[lng].websiteLabel = e.target.value;
          skinAccess.save(); refreshLight();
        }});
      card.appendChild(elt('div', { class:'field' }, elt('label', {}, 'Text webu'), lbl));
      const mn = elt('input', { type:'text', value: (t.menu||[]).join(', '), attrs:{placeholder:'M365, LICENSES, APPS, SERVICES'},
        oninput: e => {
          if (!skin.translations) skin.translations = {};
          if (!skin.translations[lng]) skin.translations[lng] = {};
          skin.translations[lng].menu = e.target.value.split(',').map(x=>x.trim()).filter(Boolean);
          skinAccess.save(); refreshLight();
        }});
      card.appendChild(elt('div', { class:'field' }, elt('label', {}, 'Menu (čárkou oddělené)'), mn));
      const dc = elt('input', { type:'text', value: t.disclaimer||'', attrs:{placeholder:'This e-mail may contain…'},
        oninput: e => {
          if (!skin.translations) skin.translations = {};
          if (!skin.translations[lng]) skin.translations[lng] = {};
          skin.translations[lng].disclaimer = e.target.value;
          skinAccess.save(); refreshLight();
        }});
      card.appendChild(elt('div', { class:'field' }, elt('label', {}, 'Disclaimer'), dc));
      wrap.appendChild(card);
    });
    return wrap;
  },

  valBar(issues){
    if (!issues.length) return elt('div', { class:'valbar ok' }, '✓ Skin vypadá v pořádku.');
    const wrap = elt('div', { class:'valbar warn' });
    wrap.appendChild(elt('div', {}, `⚠ Nalezeno ${issues.length} upozornění:`));
    const ul = elt('ul');
    issues.forEach(i => ul.appendChild(elt('li', {}, i)));
    wrap.appendChild(ul);
    return wrap;
  },
};

const BLOCK_LABEL = {
  name:'Jméno a pozice', divider:'Oddělovací čára', logo:'Logo', menu:'Navigační menu',
  contact:'Kontaktní údaje', social:'Sociální sítě', photo:'Foto profilu',
  qr:'QR vizitka', banner:'Banner', phone:'Telefon', mobile:'Mobil',
  email:'Email', web:'Web', address:'Adresa',
};
const BLOCK_LABEL_SHORT = {
  name:'NAME', divider:'LINE', logo:'LOGO', menu:'MENU', contact:'CONTACT',
  social:'SOCIAL', photo:'PHOTO', qr:'QR', banner:'BANNER',
};

function section(title){
  const s = elt('div', { class:'insp-section' });
  s.appendChild(elt('div', { class:'insp-section-title' }, title));
  return s;
}

function validate(skin){
  const issues = [];
  if (!skin.name || skin.name === 'Nový skin') issues.push('Skin nemá vlastní název.');
  if (skin.blocks.logo !== false && !skin.company.logoUrl) issues.push('Logo je zapnuté, ale chybí URL.');
  [['logoUrl','URL loga'],['websiteUrl','URL webu'],['logoLink','Odkaz loga']].forEach(([k,n]) => {
    const v = skin.company[k];
    if (v && !/^https?:\/\//i.test(v) && !/^data:/i.test(v)) issues.push(`${n} není platná URL.`);
  });
  if (skin.banner?.enabled && !skin.banner.imageUrl) issues.push('Banner je zapnutý, ale chybí obrázek.');
  if (skin.banner?.startDate && skin.banner?.endDate && skin.banner.startDate > skin.banner.endDate)
    issues.push('Banner: „Platí od" je po „Platí do".');
  if (skin.social?.enabled && !(skin.social.platforms||[]).length) issues.push('Sociální sítě zapnuté, ale není vybraná žádná platforma.');
  if ((skin.company?.logoWidth||0) > 600) issues.push('Logo je širší než 600px (mobilní problém).');
  if (skin.banner?.enabled && (skin.banner.width||0) > 600) issues.push('Banner je širší než 600px.');
  if (skin.qr?.enabled) issues.push('QR kód: ověřte zobrazení v klasickém Outlooku.');
  return issues;
}

/* ─────────────────────────────────────────────────────────────────────────
   SKIN LIST (LEFT)
   ───────────────────────────────────────────────────────────────────────── */
const skinList = {
  render(){
    const el = document.getElementById('skinList');
    const ct = document.getElementById('skinCount');
    el.innerHTML = '';
    const filter = state.filter.toLowerCase();
    const filtered = state.skins.filter(s => !filter || s.name.toLowerCase().includes(filter));
    ct.textContent = String(filtered.length).padStart(2,'0');
    if (!filtered.length){
      el.appendChild(elt('div', { style:{padding:'30px 14px', color:'var(--ink-3)', fontSize:'11px', textAlign:'center'} },
        filter ? 'Nic neodpovídá filtru.' : 'Zatím žádné skiny.'));
      return;
    }
    filtered.forEach(skin => {
      const row = elt('div', { class:'skin-row' + (skin.id === state.currentId ? ' active' : ''),
        onclick: () => selectSkin(skin.id) });
      const sw = elt('div', { class:'skin-swatch', style:{background: skin.styles?.primaryColor||'#444'} });
      const swInner = elt('div', { style:{position:'absolute',right:'0',top:'0',bottom:'0',width:'35%',background:skin.styles?.accentColor||'#999'} });
      sw.appendChild(swInner);
      row.appendChild(sw);
      const meta = elt('div', { class:'skin-meta' });
      const nm = elt('div', { class:'nm' }, skin.name);
      if (skin.default) nm.appendChild(elt('span', { class:'star' }, '★'));
      meta.appendChild(nm);
      meta.appendChild(elt('div', { class:'lo' }, (LAYOUTS.find(l=>l.id===skin.layout)?.label||skin.layout)));
      row.appendChild(meta);
      const actions = elt('div', { class:'skin-actions' });
      actions.appendChild(elt('button', { attrs:{title:'Výchozí'}, onclick: e => { e.stopPropagation(); skinAccess.setDefault(skin.id); skinList.render(); toast('★ Výchozí skin nastaven.'); }}, '★'));
      actions.appendChild(elt('button', { attrs:{title:'Exportovat'}, onclick: e => { e.stopPropagation(); exportOne(skin.id); }}, '↓'));
      actions.appendChild(elt('button', { attrs:{title:'Duplikovat'}, onclick: e => { e.stopPropagation(); const c = skinAccess.duplicate(skin.id); if (c) selectSkin(c.id); }}, '⧉'));
      actions.appendChild(elt('button', { class:'del', attrs:{title:'Smazat'}, onclick: e => { e.stopPropagation(); if (confirm('Smazat skin „'+skin.name+'"?')) { skinAccess.remove(skin.id); render(); }}}, '×'));
      row.appendChild(actions);
      el.appendChild(row);
    });
  }
};

/* ─────────────────────────────────────────────────────────────────────────
   ACTIONS — import / export / templates / toasts
   ───────────────────────────────────────────────────────────────────────── */
function selectSkin(id){
  state.currentId = id;
  state.selectedBlock = null;
  state.inspTab = 'general';
  render();
}

function exportSkins(){
  const blob = new Blob([JSON.stringify(state.skins, null, 2)], { type:'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'skins.json';
  a.click();
  toast('skins.json stažen — nahrajte ho na hosting.');
}

function exportOne(id){
  const s = state.skins.find(x => x.id === id);
  if (!s) return;
  const blob = new Blob([JSON.stringify([s], null, 2)], { type:'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'skin-' + (s.name||'export').replace(/\s+/g,'-').toLowerCase() + '.json';
  a.click();
  toast(`Skin „${s.name}" exportován.`);
}

function importSkins(input){
  const file = input.files[0];
  if (!file) return;
  const r = new FileReader();
  r.onload = e => {
    try {
      const d = JSON.parse(e.target.result);
      if (!Array.isArray(d)) throw 0;
      state.skins = d;
      state.currentId = state.skins[0]?.id || null;
      skinAccess.save();
      render();
      toast(`Importováno ${state.skins.length} skinů.`);
    } catch(err){ toast('Chybný formát souboru.', true); }
  };
  r.readAsText(file);
  input.value = '';
}

function openTemplates(){
  const grid = document.getElementById('tmplGrid');
  grid.innerHTML = '';
  TEMPLATES.forEach((t, i) => {
    const s = t.apply(skinAccess.base());
    const card = elt('div', { class:'tmpl-card', onclick: () => useTemplate(i) });
    const prev = elt('div', { class:'tmpl-prev', style:{background: s.styles.primaryColor} });
    const inner = elt('div', { style:{padding:'10px',height:'100%',display:'flex',flexDirection:'column',justifyContent:'space-between'} });
    inner.appendChild(elt('div', { style:{height:'7px',width:'60%',background:s.styles.accentColor,borderRadius:'2px'} }));
    inner.appendChild(elt('div', { style:{display:'flex',flexDirection:'column',gap:'3px'} },
      elt('div', { style:{height:'3px',width:'45%',background:'rgba(255,255,255,0.4)',borderRadius:'1px'} }),
      elt('div', { style:{height:'3px',width:'70%',background:'rgba(255,255,255,0.4)',borderRadius:'1px'} }),
    ));
    prev.appendChild(inner);
    card.appendChild(prev);
    card.appendChild(elt('div', { class:'nm' }, t.name));
    card.appendChild(elt('div', { class:'desc' }, t.sub));
    grid.appendChild(card);
  });
  document.getElementById('tmplModal').classList.add('show');
}
function closeTemplates(){ document.getElementById('tmplModal').classList.remove('show'); }

function useTemplate(i){
  const s = TEMPLATES[i].apply(skinAccess.base());
  s.id = 'skin_' + Date.now();
  skinAccess.add(s);
  closeTemplates();
  selectSkin(s.id);
  toast(`Vytvořen skin podle šablony „${TEMPLATES[i].name}"`);
}

function setView(view){
  state.view = view;
  document.getElementById('vw-desktop').classList.toggle('active', view==='desktop');
  document.getElementById('vw-mobile').classList.toggle('active', view==='mobile');
  document.getElementById('canvasWrap').classList.toggle('mobile', view==='mobile');
}

function setTheme(t){
  state.theme = t;
  document.getElementById('th-light').classList.toggle('active', t==='light');
  document.getElementById('th-dark').classList.toggle('active', t==='dark');
  stage.render();
}

function alignStage(side){
  const stageEl = document.querySelector('.stage');
  stageEl.style.justifyContent = side === 'left' ? 'flex-start' : side === 'right' ? 'flex-end' : 'center';
  document.querySelectorAll('.stage-toolbar .toggle').forEach(b => b.classList.remove('on'));
  event.target.classList.add('on');
}

function toggleCodePane(){
  state.showCode = !state.showCode;
  document.getElementById('codePane').classList.toggle('show', state.showCode);
}

function toast(msg, danger){
  const t = document.getElementById('toast');
  const dot = t.querySelector('.dot');
  dot.style.background = danger ? 'var(--rose)' : 'var(--accent)';
  document.getElementById('toastMsg').textContent = msg;
  t.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove('show'), 3200);
}

/* ─────────────────────────────────────────────────────────────────────────
   RENDER LOOP — full vs. light
   ───────────────────────────────────────────────────────────────────────── */
function render(){
  skinList.render();
  stage.render();
  inspector.render();
}
// Light refresh: re-render only the stage (faster on each keystroke)
function refreshLight(){
  stage.render();
  // also refresh skinList row name if changed
  const row = document.querySelector('.skin-row.active .nm');
  if (row && skinAccess.current()){
    row.firstChild.textContent = skinAccess.current().name;
  }
}

/* ─────────────────────────────────────────────────────────────────────────
   BOOTSTRAP
   ───────────────────────────────────────────────────────────────────────── */
window.exportSkins = exportSkins;
window.importSkins = importSkins;
window.openTemplates = openTemplates;
window.closeTemplates = closeTemplates;
window.useTemplate = useTemplate;
window.setView = setView;
window.setTheme = setTheme;
window.alignStage = alignStage;
window.toggleCodePane = toggleCodePane;
window.liveUpdate = refreshLight;

document.getElementById('skinFilter').addEventListener('input', e => {
  state.filter = e.target.value;
  skinList.render();
});

skinAccess.load().then(() => {
  state.currentId = state.skins.find(s => s.default)?.id || state.skins[0]?.id || null;
  stage.bindClicks();
  render();
});
})();
