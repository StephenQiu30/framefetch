const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
function popup(reply) {
  const elements = new Map();
  for (const id of fs.readFileSync(__dirname + '/popup.html', 'utf8').matchAll(/id="([^"]+)"/g)) {
    elements.set(id[1], { textContent: '', hidden: false, disabled: false, addEventListener(type, handler) { this[type] = handler; } });
  }
  const calls = [];
  let response = reply;
  const context = vm.createContext({ document: { getElementById: id => elements.get(id), querySelectorAll: () => [...elements.entries()].filter(([id]) => ['login-youtube', 'login-yuanbao', 'refresh', 'reconnect'].includes(id)).map(([, element]) => element) },
    chrome: { runtime: { sendMessage: async message => { calls.push(message); if (response instanceof Error) throw response; return response; } } },
  });
  vm.runInContext(fs.readFileSync(__dirname + '/popup.js', 'utf8'), context);
  return { elements, calls, reply: value => { response = value; }, flush: () => new Promise(resolve => setImmediate(resolve)) };
}
const base = { version: '1.4.0', connected: true, session: 'available', busy: false, cause: null };
function state(material, outcome = 'not_checked', failure_class = null) {
  return { ...base, youtube: { material, outcome, failure_class, task_id: outcome === 'not_checked' ? null : 'target-task', checked_at: outcome === 'not_checked' ? null : '2026-10-16T10:00:00+00:00' } };
}
test('YouTube material availability never claims successful upstream verification', async () => {
  const p = popup(state('available')); await p.flush();
  assert.equal(p.elements.get('youtube-material')?.textContent, '材料可读取');
  assert.equal(p.elements.get('youtube-outcome').textContent, '尚未验证');
  assert.match(p.elements.get('youtube-message').textContent, /重新解析/);
  p.elements.get('login-youtube').click(); await p.flush();
  assert.equal(p.calls.at(-1).type, 'login_youtube');
});
test('YouTube reports only the recent task and keeps network failures distinct from login', async () => {
  const p = popup(state('available', 'accepted')); await p.flush();
  assert.equal(p.elements.get('youtube-outcome')?.textContent, '最近任务解析通过');
  assert.match(p.elements.get('youtube-task').textContent, /target-task/);
  p.reply(state('available', 'failed', 'rate_limited')); p.elements.get('refresh').click(); await p.flush();
  assert.match(p.elements.get('youtube-message').textContent, /限流/);
  assert.doesNotMatch(p.elements.get('youtube-message').textContent, /登录失效/);
  p.reply(state('available', 'failed', 'login_required')); p.elements.get('refresh').click(); await p.flush();
  assert.match(p.elements.get('youtube-message').textContent, /登录/);
});
test('missing, disconnected, busy and failed refresh erase any old success', async () => {
  const p = popup(state('available', 'accepted')); await p.flush();
  for (const next of [state('missing'), { ...state('unavailable'), connected: false }, { ...state('unavailable'), busy: true }, new Error('synthetic-private-error')]) {
    p.reply(next); p.elements.get('refresh').click(); await p.flush();
    assert.notEqual(p.elements.get('youtube-outcome')?.textContent, '最近任务解析通过');
    assert.equal(p.elements.get('youtube-task').textContent, '');
    assert.doesNotMatch(p.elements.get('youtube-message').textContent, /synthetic-private-error/);
  }
});
