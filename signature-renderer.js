/**
 * CloudForce Signature Renderer  (v2)
 * Shared between admin.html and taskpane.html
 *
 *   renderSignatureHTML(skin, user, opts)
 *     skin  – skin definition object
 *     user  – { name, title, phone, email, photo, social:{linkedin,...}, lang }
 *     opts  – { dark:bool }  optional; picks dark variant if skin has one
 *
 * Depends on lib-qrcode.js ONLY if a skin enables QR (window.qrcode).
 */

/* Marker class wrapped around every signature so we can detect / replace / remove it. */
var CF_SIG_MARKER = 'cf-signature-block';

/* ---------- helpers ---------- */
function _esc(s){ return (s==null?'':String(s)).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

/* Built-in UI strings per language (used for tel:/mailto labels etc. if needed) */
const I18N = {
  cs: { phone:'Telefon', email:'Email', web:'Web' },
  en: { phone:'Phone',   email:'Email', web:'Web' },
  de: { phone:'Telefon', email:'E-Mail', web:'Web' },
  sk: { phone:'Telefón',  email:'Email', web:'Web' }
};

/* Social platform metadata: brand colour + initial used for the chip */
const SOCIAL_META = {
  linkedin: { color:'#0A66C2', letter:'in', base:'https://www.linkedin.com/in/' },
  x:        { color:'#000000', letter:'X',  base:'https://x.com/' },
  facebook: { color:'#1877F2', letter:'f',  base:'https://facebook.com/' },
  instagram:{ color:'#E4405F', letter:'IG', base:'https://instagram.com/' },
  github:   { color:'#181717', letter:'GH', base:'https://github.com/' },
  youtube:  { color:'#FF0000', letter:'YT', base:'https://youtube.com/@' }
};

/* Merge dark-variant overrides over the base skin when opts.dark */
function _resolveSkin(skin, opts){
  if (opts && opts.dark && skin.darkVariant && skin.darkVariant.enabled){
    const merged = JSON.parse(JSON.stringify(skin));
    merged.styles = Object.assign({}, skin.styles, skin.darkVariant.styles || {});
    if (skin.darkVariant.company) merged.company = Object.assign({}, skin.company, skin.darkVariant.company);
    return merged;
  }
  return skin;
}

/* Apply translations for a chosen language onto company labels */
function _applyLang(skin, lang){
  if (!lang || !skin.translations || !skin.translations[lang]) return skin;
  const t = skin.translations[lang];
  const out = JSON.parse(JSON.stringify(skin));
  if (t.websiteLabel) out.company.websiteLabel = t.websiteLabel;
  if (t.disclaimer) out.disclaimer = t.disclaimer;
  if (t.menu && Array.isArray(t.menu)){
    t.menu.forEach((label,i)=>{ if(out.menu && out.menu.items[i]) out.menu.items[i].label = label; });
  }
  return out;
}

/* ---------- QR (vCard) ---------- */
function _buildVCardQR(user, sizePx){
  if (typeof window === 'undefined' || typeof window.qrcode !== 'function') return '';
  const v = [
    'BEGIN:VCARD','VERSION:3.0',
    'N:'+(user.name||''),
    'FN:'+(user.name||''),
    user.title ? 'TITLE:'+user.title : '',
    user.phone ? 'TEL;TYPE=WORK,VOICE:'+user.phone : '',
    user.email ? 'EMAIL;TYPE=WORK:'+user.email : '',
    'END:VCARD'
  ].filter(Boolean).join('\n');
  try{
    const qr = window.qrcode(0,'M');
    qr.addData(v); qr.make();
    return qr.createDataURL(4, 0); // cellSize, margin -> data URI PNG
  }catch(e){ return ''; }
}

/* ---------- contact / social / photo / banner blocks ---------- */
function _contactTable(skin, user){
  const st=skin.styles, co=skin.company, bl=skin.blocks||{};
  const ff=st.fontFamily||"'Segoe UI',Arial,sans-serif";
  const cs=st.contactSize||14, cc=st.contactColor||'#23457a';
  const ic=(url,emoji)=> url
    ? `<img src="${_esc(url)}" width="16" height="16" alt="" style="display:block;border:0;">`
    : `<span style="font-size:13px;line-height:16px;">${emoji}</span>`;

  const rows=[];
  if (bl.phone!==false && user.phone) rows.push(
    `<tr><td style="padding:0 6px 6px 0;vertical-align:top;">${ic(co.phoneIconUrl,'📞')}</td>
      <td style="padding-bottom:8px;vertical-align:top;"><a href="tel:${_esc((user.phone||'').replace(/\s/g,''))}" style="font-size:${cs}px;color:${cc};text-decoration:underline;">${_esc(user.phone)}</a></td></tr>`);
  if (bl.mobile!==false && user.mobile) rows.push(
    `<tr><td style="padding:0 6px 6px 0;vertical-align:top;">${ic(co.phoneIconUrl,'📱')}</td>
      <td style="padding-bottom:8px;vertical-align:top;"><a href="tel:${_esc((user.mobile||'').replace(/\s/g,''))}" style="font-size:${cs}px;color:${cc};text-decoration:underline;">${_esc(user.mobile)}</a></td></tr>`);
  if (bl.email!==false && user.email) rows.push(
    `<tr><td style="padding:0 6px 6px 0;vertical-align:top;">${ic(co.emailIconUrl,'✉')}</td>
      <td style="padding-bottom:8px;vertical-align:top;"><a href="mailto:${_esc(user.email)}" style="font-size:${cs}px;color:${cc};text-decoration:underline;">${_esc(user.email)}</a></td></tr>`);
  if (bl.web!==false && co.websiteUrl) rows.push(
    `<tr><td style="padding:0 6px 0 0;vertical-align:top;">${ic(co.webIconUrl,'🌐')}</td>
      <td style="vertical-align:top;"><a href="${_esc(co.websiteUrl)}" target="_blank" style="font-size:${cs}px;color:${cc};text-decoration:underline;">${_esc(co.websiteLabel||co.websiteUrl)}</a></td></tr>`);
  if (bl.address!==false && user.address) rows.push(
    `<tr><td style="padding:6px 6px 0 0;vertical-align:top;"><span style="font-size:13px;line-height:16px;">📍</span></td>
      <td style="padding-top:6px;vertical-align:top;font-size:${cs}px;color:${cc};">${_esc(user.address)}</td></tr>`);

  return `<table cellpadding="0" cellspacing="0" border="0" style="font-family:${ff};font-size:${cs}px;line-height:15px;color:${cc};border-collapse:collapse;">${rows.join('')}</table>`;
}

function _socialRow(skin, user){
  const bl=skin.blocks||{};
  if (bl.social===false || !skin.social || !skin.social.enabled) return '';
  const enabled = skin.social.platforms || [];
  const chips = enabled.map(p=>{
    const handle = (user.social||{})[p];
    if (!handle) return '';
    const meta = SOCIAL_META[p]; if(!meta) return '';
    const url = /^https?:/i.test(handle) ? handle : meta.base + handle.replace(/^@/,'');
    return `<a href="${_esc(url)}" target="_blank" style="text-decoration:none;display:inline-block;margin-right:6px;">
      <span style="display:inline-block;width:22px;height:22px;line-height:22px;text-align:center;border-radius:5px;background:${meta.color};color:#fff;font-size:10px;font-weight:700;font-family:Arial,sans-serif;">${meta.letter}</span></a>`;
  }).filter(Boolean).join('');
  if (!chips) return '';
  return `<div style="padding-top:8px;">${chips}</div>`;
}

function _photoCell(skin, user){
  const bl=skin.blocks||{};
  if (bl.photo===false || !user.photo) return '';
  const sz = (skin.styles && skin.styles.photoSize) || 64;
  const round = (skin.styles && skin.styles.photoRound!==false);
  return `<img src="${_esc(user.photo)}" width="${sz}" height="${sz}" alt="" style="display:block;border:0;width:${sz}px;height:${sz}px;object-fit:cover;${round?'border-radius:50%;':'border-radius:6px;'}">`;
}

function _qrCell(skin, user){
  const bl=skin.blocks||{};
  if (bl.qr!==true || !skin.qr || !skin.qr.enabled) return '';
  const data = _buildVCardQR(user, 80);
  if (!data) return '';
  return `<img src="${data}" width="80" height="80" alt="QR vizitka" style="display:block;border:0;width:80px;height:80px;">`;
}

function _bannerRow(skin){
  const b = skin.banner;
  if (!b || !b.enabled || !b.imageUrl) return '';
  // date window check
  const now = new Date();
  if (b.startDate && now < new Date(b.startDate)) return '';
  if (b.endDate   && now > new Date(b.endDate+'T23:59:59')) return '';
  const img = `<img src="${_esc(b.imageUrl)}" alt="${_esc(b.alt||'')}" width="${b.width||500}" style="display:block;border:0;max-width:100%;margin-top:12px;">`;
  return b.link ? `<a href="${_esc(b.link)}" target="_blank" style="text-decoration:none;">${img}</a>` : img;
}

/* ---------- disclaimer / legal footer ---------- */
function _disclaimer(skin){
  if (!skin.disclaimer) return '';
  const txt = String(skin.disclaimer).replace(/\n/g,'<br>');
  return `<div style="margin-top:12px;padding-top:8px;border-top:1px solid #e5e7eb;font-family:Arial,sans-serif;font-size:10px;line-height:1.4;color:#9ca3af;max-width:600px;">${txt}</div>`;
}

/* ---------- short signature (for replies) ---------- */
function _shortSignature(skin, user){
  const st=skin.styles||{}, ff=st.fontFamily||"'Segoe UI',Arial,sans-serif";
  const parts=[];
  if (user.title) parts.push(_esc(user.title));
  if (user.phone) parts.push(`<a href="tel:${_esc((user.phone||'').replace(/\s/g,''))}" style="color:${st.contactColor||'#23457a'};text-decoration:none;">${_esc(user.phone)}</a>`);
  if (user.email) parts.push(`<a href="mailto:${_esc(user.email)}" style="color:${st.contactColor||'#23457a'};text-decoration:none;">${_esc(user.email)}</a>`);
  return `<table cellpadding="0" cellspacing="0" border="0" style="font-family:${ff};border-collapse:collapse;">
    <tr><td style="font-size:${st.nameSize?Math.min(st.nameSize,14):14}px;font-weight:700;color:${st.nameColor||'#23457a'};padding-bottom:2px;">${_esc(user.name||'')}</td></tr>
    <tr><td style="font-size:12px;color:${st.contactColor||'#555'};">${parts.join(' &nbsp;|&nbsp; ')}</td></tr>
  </table>`;
}

/* ---------- name / title / divider / logo / menu ---------- */
function _nameBlock(skin, user){
  const st=skin.styles, bl=skin.blocks||{};
  let h='';
  if (bl.name!==false){
    const pron = (bl.pronouns!==false && user.pronouns) ? ` <span style="font-size:${Math.round((st.nameSize||16)*0.7)}px;font-weight:400;color:${st.titleColor||'#777'};">(${_esc(user.pronouns)})</span>` : '';
    h+=`<div style="font-size:${st.nameSize||16}px;line-height:${st.nameSize||16}px;font-weight:${st.nameBold!==false?700:400};color:${st.nameColor||'#23457a'};${st.nameUppercase!==false?'text-transform:uppercase;':''}">${_esc(user.name||'Vaše Jméno')}${pron}</div>`;
  }
  if (bl.title!==false && (user.title || user.department)){
    const line = [user.title, (bl.department!==false?user.department:'')].filter(Boolean).join(' · ');
    h+=`<div style="font-size:${st.titleSize||14}px;line-height:${st.titleSize||14}px;${st.titleItalic!==false?'font-style:italic;':''}color:${st.titleColor||'#000'};padding-top:5px;">${_esc(line)}</div>`;
  }
  return h;
}
function _divider(skin){
  const st=skin.styles, bl=skin.blocks||{};
  if (bl.divider===false || !(st.dividerWidth>0)) return '';
  const c=st.dividerColor||st.accentColor||'#1fc09f';
  return `<table cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;"><tr><td height="7" style="height:7px;line-height:7px;font-size:1px;">&nbsp;</td></tr><tr><td width="${st.dividerWidth||58}" style="border-top:2px solid ${c};height:0;line-height:0;font-size:0;">&nbsp;</td></tr></table>`;
}
function _logo(skin){
  const co=skin.company, bl=skin.blocks||{};
  if (bl.logo===false || !co.logoUrl) return '';
  return `<a href="${_esc(co.logoLink||'#')}" target="_blank" style="text-decoration:none;"><img src="${_esc(co.logoUrl)}" alt="Logo" width="${co.logoWidth||200}" style="display:block;border:0;outline:none;${co.logoInvert?'filter:brightness(0) invert(1);':''}margin:-4px 0 3px 0;"></a>`;
}
function _menu(skin){
  const st=skin.styles, bl=skin.blocks||{};
  if (bl.menu===false || !skin.menu || !skin.menu.enabled || !(skin.menu.items||[]).length) return '';
  return `<table cellpadding="0" cellspacing="0" border="0" style="padding-top:10px;"><tr>${
    skin.menu.items.map((it,i)=>(i>0?`<td style="padding:0 6px;color:${st.accentColor||'#1fc09f'};font-size:16px;font-weight:700;">•</td>`:'')+
      `<td><a href="${_esc(it.url)}" target="_blank" style="font-size:13px;font-weight:700;color:${st.primaryColor||'#23457a'};text-decoration:underline;">${_esc(it.label)}</a></td>`).join('')
  }</tr></table>`;
}

/* ---------- main entry ---------- */
function renderSignatureHTML(skin, user, opts){
  opts = opts || {};
  skin = _resolveSkin(skin, opts);
  skin = _applyLang(skin, user.lang);
  user = user || {};
  const E = !!opts.editor;
  const tag = (name, html) => E && html ? `<span data-cf-block="${name}" style="display:inline-block;">${html}</span>` : html;

  // Short signature for replies/forwards
  if (opts.short){
    return `<div class="${CF_SIG_MARKER}">${_shortSignature(skin, user)}${_disclaimer(skin)}</div>`;
  }

  const st=skin.styles||{}, ff=st.fontFamily||"'Segoe UI',Arial,sans-serif";
  const sep=st.separatorColor||'#bfc0c5';

  const nameBlock=tag('name', _nameBlock(skin,user));
  const divider=tag('divider', _divider(skin));
  const logo=tag('logo', _logo(skin));
  const menu=tag('menu', _menu(skin));
  const contact=tag('contact', _contactTable(skin,user));
  const social=tag('social', _socialRow(skin,user));
  const photo=tag('photo', _photoCell(skin,user));
  const qr=tag('qr', _qrCell(skin,user));
  const banner=tag('banner', _bannerRow(skin));

  let body='';

  if (skin.layout==='two-column'){
    body=`<table cellpadding="0" cellspacing="0" border="0" style="font-family:${ff};color:${st.primaryColor||'#23457a'};border-collapse:collapse;">
      <tr><td style="padding:0 0 14px 0;">${photo?`<table cellpadding=0 cellspacing=0 border=0><tr><td style="padding-right:12px;vertical-align:top;">${photo}</td><td style="vertical-align:top;">${nameBlock}${divider}</td></tr></table>`:`${nameBlock}${divider}`}</td></tr>
      <tr><td><table cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;"><tr>
        <td style="vertical-align:top;padding-right:12px;">${logo}${menu}</td>
        <td style="width:1px;background:${sep};font-size:1px;line-height:1px;">&nbsp;</td>
        <td style="vertical-align:middle;padding-left:12px;padding-top:3px;">${contact}${social}${qr?`<div style="padding-top:8px;">${qr}</div>`:''}</td>
      </tr></table></td></tr>
      ${banner?`<tr><td>${banner}</td></tr>`:''}
    </table>`;
  } else if (skin.layout==='card'){
    const hBg=st.cardHeaderBg||st.primaryColor||'#23457a', hTxt=st.cardHeaderTextColor||'#fff', bBg=st.cardBodyBg||'#f8fafc';
    const nameH=nameBlock.replace(/color:[^;'"]+/,'color:'+hTxt);
    body=`<table cellpadding="0" cellspacing="0" border="0" style="font-family:${ff};border-collapse:collapse;">
      <tr><td style="background:${hBg};padding:10px 16px;border-radius:6px 6px 0 0;">
        <table cellpadding=0 cellspacing=0 border=0><tr>${photo?`<td style="padding-right:10px;vertical-align:middle;">${photo}</td>`:''}<td style="vertical-align:middle;">${nameH}</td></tr></table>
      </td></tr>
      <tr><td style="background:${bBg};padding:10px 16px;border:1px solid rgba(0,0,0,.1);border-top:none;border-radius:0 0 6px 6px;">
        <table cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;width:100%;"><tr>
          <td style="vertical-align:middle;">${contact}${social}</td>
          <td style="text-align:right;vertical-align:middle;padding-left:12px;">${logo}${qr}</td>
        </tr></table>${menu}
      </td></tr>
      ${banner?`<tr><td>${banner}</td></tr>`:''}
    </table>`;
  } else if (skin.layout==='hero'){
    /* HERO — display-style: large centered name, generous spacing, line, info row */
    const heroAccent = st.accentColor || st.primaryColor || '#23457a';
    const heroName = nameBlock.replace(/font-size:\d+px;line-height:\d+px;/, `font-size:${(st.nameSize||16)+10}px;line-height:${(st.nameSize||16)+12}px;letter-spacing:0.02em;`);
    body=`<table cellpadding="0" cellspacing="0" border="0" style="font-family:${ff};color:${st.primaryColor||'#23457a'};border-collapse:collapse;width:100%;max-width:560px;">
      <tr><td align="center" style="padding:6px 0 4px 0;">${photo?`<div style="margin-bottom:10px;">${photo}</div>`:''}${heroName}</td></tr>
      <tr><td align="center" style="padding:10px 0 14px 0;">
        <table cellpadding="0" cellspacing="0" border="0"><tr><td width="80" style="border-top:2px solid ${heroAccent};height:0;line-height:0;font-size:0;">&nbsp;</td></tr></table>
      </td></tr>
      <tr><td align="center" style="padding-bottom:10px;">${contact}</td></tr>
      ${social?`<tr><td align="center">${social}</td></tr>`:''}
      ${logo?`<tr><td align="center" style="padding-top:10px;">${logo}</td></tr>`:''}
      ${menu?`<tr><td align="center" style="padding-top:6px;">${menu}</td></tr>`:''}
      ${qr?`<tr><td align="center" style="padding-top:10px;">${qr}</td></tr>`:''}
      ${banner?`<tr><td>${banner}</td></tr>`:''}
    </table>`;
  } else if (skin.layout==='bordered'){
    /* BORDERED — entire signature wrapped in a thin frame */
    const borderColor = st.borderColor || st.primaryColor || '#23457a';
    body=`<table cellpadding="0" cellspacing="0" border="0" style="font-family:${ff};color:${st.primaryColor||'#23457a'};border-collapse:collapse;border:1.5px solid ${borderColor};border-radius:4px;">
      <tr><td style="padding:14px 18px;">
        <table cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;"><tr>
          ${photo?`<td style="padding-right:14px;vertical-align:top;">${photo}</td>`:''}
          <td style="vertical-align:top;">${nameBlock}${divider}</td>
        </tr></table>
        <div style="margin-top:10px;padding-top:8px;border-top:1px solid ${borderColor}33;">${contact}${social}</div>
        ${logo||menu?`<div style="margin-top:10px;padding-top:8px;border-top:1px solid ${borderColor}33;">${logo}${menu}</div>`:''}
        ${qr?`<div style="padding-top:8px;">${qr}</div>`:''}
      </td></tr>
      ${banner?`<tr><td>${banner}</td></tr>`:''}
    </table>`;
  } else if (skin.layout==='left-bar'){
    /* LEFT-BAR — thick colored bar on the left */
    const barColor = st.borderColor || st.accentColor || '#1fc09f';
    const barWidth = st.barWidth || 6;
    body=`<table cellpadding="0" cellspacing="0" border="0" style="font-family:${ff};color:${st.primaryColor||'#23457a'};border-collapse:collapse;">
      <tr>
        <td style="background:${barColor};width:${barWidth}px;font-size:1px;line-height:1px;">&nbsp;</td>
        <td style="padding:4px 0 4px 18px;vertical-align:top;">
          ${photo?`<table cellpadding=0 cellspacing=0 border=0 style="margin-bottom:4px;"><tr><td style="padding-right:12px;vertical-align:top;">${photo}</td><td style="vertical-align:top;">${nameBlock}${divider}</td></tr></table>`:`${nameBlock}${divider}`}
          <div style="margin-top:8px;">${contact}</div>
          ${social}
          ${logo?`<div style="margin-top:10px;">${logo}</div>`:''}
          ${menu?`<div style="margin-top:6px;">${menu}</div>`:''}
          ${qr?`<div style="margin-top:8px;">${qr}</div>`:''}
        </td>
      </tr>
      ${banner?`<tr><td colspan="2">${banner}</td></tr>`:''}
    </table>`;
  } else if (skin.layout==='letterhead'){
    /* LETTERHEAD — traditional, centered, formal */
    const lhLine = st.dividerColor || st.primaryColor || '#23457a';
    body=`<table cellpadding="0" cellspacing="0" border="0" style="font-family:${ff};color:${st.primaryColor||'#23457a'};border-collapse:collapse;width:100%;max-width:540px;">
      ${logo?`<tr><td align="center" style="padding-bottom:12px;">${logo}</td></tr>`:''}
      <tr><td align="center" style="border-top:1px solid ${lhLine};border-bottom:1px solid ${lhLine};padding:14px 0;">
        ${nameBlock}
      </td></tr>
      <tr><td align="center" style="padding:12px 0 6px 0;">${contact}</td></tr>
      ${social?`<tr><td align="center" style="padding-top:4px;">${social}</td></tr>`:''}
      ${menu?`<tr><td align="center" style="padding-top:8px;">${menu}</td></tr>`:''}
      ${qr?`<tr><td align="center" style="padding-top:10px;">${qr}</td></tr>`:''}
      ${banner?`<tr><td>${banner}</td></tr>`:''}
    </table>`;
  } else { /* stacked — fallback */
    const darkBg=st.darkBg?`background:${st.darkBg};padding:16px 20px;border-radius:8px;`:'';
    const lb=st.borderColor?`border-left:3px solid ${st.borderColor};padding-left:14px;`:'';
    body=`<table cellpadding="0" cellspacing="0" border="0" style="font-family:${ff};color:${st.primaryColor||'#23457a'};border-collapse:collapse;${darkBg}">
      ${logo?`<tr><td style="padding-bottom:10px;">${logo}</td></tr>`:''}
      <tr><td style="${lb}">
        ${photo?`<table cellpadding=0 cellspacing=0 border=0><tr><td style="padding-right:12px;vertical-align:top;">${photo}</td><td style="vertical-align:top;">${nameBlock}${divider}</td></tr></table>`:`${nameBlock}${divider}`}
        <div style="margin-top:8px;">${contact}</div>${social}${qr?`<div style="padding-top:8px;">${qr}</div>`:''}
      </td></tr>
      ${menu?`<tr><td style="padding-top:4px;">${menu}</td></tr>`:''}
      ${banner?`<tr><td>${banner}</td></tr>`:''}
    </table>`;
  }
  return `<div class="${CF_SIG_MARKER}">${body}${_disclaimer(skin)}</div>`;
}

/* expose for non-module use */
if (typeof window!=='undefined'){ window.renderSignatureHTML=renderSignatureHTML; window.SOCIAL_META=SOCIAL_META; window.I18N=I18N; window.CF_SIG_MARKER=CF_SIG_MARKER; }
