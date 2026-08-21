const SPREADSHEET_ID = '15uMfJDmleLfw2-2PaLVU_8a-zSGn7-T8qbXu_082VXs';
const STATE_SHEET = 'CloudState';
const DATA_SHEET = 'InviteData';
const FALL_SHEET = '2026 Fall';
const NOTICE_SHEET = 'Notice';

function doGet(e) {
  try {
    const action = (e && e.parameter && e.parameter.action) || 'load';
    if (action !== 'load') return json_({ok:false, error:'Unknown action'});
    const sh = getOrCreateSheet_(SpreadsheetApp.openById(SPREADSHEET_ID), STATE_SHEET);
    const raw = sh.getRange('A2').getValue();
    return json_({ok:true, state:raw ? JSON.parse(raw) : null});
  } catch (err) {
    return json_({ok:false, error:String(err && err.message || err)});
  }
}

function doPost(e) {
  try {
    const payload = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (payload.action !== 'save' || !payload.state) return json_({ok:false, error:'Invalid payload'});
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    saveState_(ss, payload.state);
    writeMainData_(ss, payload.state);
    writeFallData_(ss, payload.state);
    writeNoticeData_(ss, payload.state);
    return json_({ok:true, savedAt:new Date().toISOString()});
  } catch (err) {
    return json_({ok:false, error:String(err && err.message || err)});
  }
}

function saveState_(ss, state) {
  const sh = getOrCreateSheet_(ss, STATE_SHEET);
  sh.clear();
  sh.getRange('A1:B1').setValues([['InviteManager Cloud State', 'Last Updated']]);
  sh.getRange('A2').setValue(JSON.stringify(state));
  sh.getRange('B2').setValue(new Date());
  sh.setFrozenRows(1);
}

function writeMainData_(ss, state) {
  const labels = {pool:'邀请', yes:'确定', maybe:'待定', no:'不来'};
  const cats = {member:'弟兄姊妹', friend:'福音朋友'};
  const rows = (state.people || []).map(person => {
    const category = state.bottomTypes && state.bottomTypes[person.id] || person.category || 'friend';
    return [person.name || '', cats[category] || category,
      labels[state.statuses && state.statuses[person.id] || 'pool'],
      state.personNotes && state.personNotes[person.id] || person.note || '', person.id || ''];
  });
  writeRows_(getOrCreateSheet_(ss, DATA_SHEET), ['Name','Category','Status','Note','Person ID'], rows);
}

function writeFallData_(ss, state) {
  const fall = state.campaigns && state.campaigns.fall2026 || {};
  const labels = {pool:'邀请', yes:'确定', maybe:'待定', no:'不来'};
  const cats = {member:'弟兄姊妹', friend:'福音朋友'};
  const rows = (fall.people || []).map(person => {
    const category = state.bottomTypes && state.bottomTypes[person.id] || person.category || 'friend';
    return [person.name || '', cats[category] || category,
      labels[fall.statuses && fall.statuses[person.id] || 'pool'],
      fall.personNotes && fall.personNotes[person.id] || person.note || '', person.id || ''];
  });
  writeRows_(getOrCreateSheet_(ss, FALL_SHEET), ['Name','Category','Status','Note','Person ID'], rows);
}

function writeNoticeData_(ss, state) {
  const rows = (state.notices || []).slice().reverse().map(n =>
    [n.text || '', n.createdAt || '', n.updatedAt || '', n.id || '']);
  writeRows_(getOrCreateSheet_(ss, NOTICE_SHEET), ['Notice','Published At','Updated At','Notice ID'], rows);
}

function writeRows_(sheet, headers, rows) {
  sheet.clear();
  sheet.getRange(1,1,1,headers.length).setValues([headers]);
  if (rows.length) sheet.getRange(2,1,rows.length,headers.length).setValues(rows);
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, headers.length);
}

function getOrCreateSheet_(ss, name) {
  return ss.getSheetByName(name) || ss.insertSheet(name);
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
