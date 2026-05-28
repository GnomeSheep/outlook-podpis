/* Auto-insert handler — runs on OnNewMessageCompose when enabled by the user.
   Reads the saved skin + user data from RoamingSettings and inserts the signature. */

Office.onReady(() => {});

async function onNewMessageCompose(event) {
  try {
    const enabled = Office.context.roamingSettings.get('cf_autoInsert');
    if (!enabled) { event.completed(); return; }

    const skinId = Office.context.roamingSettings.get('cf_skin');
    const userRaw = Office.context.roamingSettings.get('cf_user');
    if (!userRaw) { event.completed(); return; }
    const user = JSON.parse(userRaw);

    // load skins
    let skins = [];
    try { const r = await fetch('./skins.json?v=' + Date.now()); if (r.ok) skins = await r.json(); } catch (e) {}
    const skin = skins.find(s => s.id === skinId) || skins[0];
    if (!skin || typeof renderSignatureHTML !== 'function') { event.completed(); return; }

    const item = Office.context.mailbox.item;

    const insert = (useShort) => {
      const html = renderSignatureHTML(skin, user, { short: useShort });
      item.body.setSignatureAsync(html, { coercionType: Office.CoercionType.Html }, () => event.completed());
    };

    if (item.getComposeTypeAsync) {
      item.getComposeTypeAsync(r => {
        const isReply = r.status === 'succeeded' && r.value && /reply|forward/i.test(r.value.composeType || '');
        insert(!!isReply);
      });
    } else {
      insert(false);
    }
  } catch (e) {
    event.completed();
  }
}

// Register for the manifest action name
if (typeof Office !== 'undefined') {
  Office.actions = Office.actions || {};
  if (Office.actions.associate) {
    Office.actions.associate('onNewMessageCompose', onNewMessageCompose);
  }
}
