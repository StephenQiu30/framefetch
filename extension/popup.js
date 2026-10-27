/* Diagnostics contain only status and fixed causes, never account material. */
const sessionLabels = { missing: '缺少登录材料', available: '可用', unavailable: '暂不可用' };
const causeMessages = {
  credential_missing: '请在元宝页面完成登录，然后重新解析视频号链接。',
  identity_account_conflict: '元宝账号在解析时发生变化，请确认账号后重新解析。',
  identity_material_invalid: '元宝登录状态暂不可用，请确认登录后重新解析。',
  parse_response_invalid: '元宝解析响应未通过校验，请重新解析。',
  yuanbao_request_rule_unavailable: '元宝请求来源规则未启用，请重新加载插件。',
  yuanbao_response_source_invalid: '元宝响应来源不符合固定解析接口，请重新解析。',
  yuanbao_response_size_invalid: '元宝解析响应超过大小限制，请重新解析。',
  yuanbao_response_utf8_invalid: '元宝解析响应编码异常，请重新解析。',
  yuanbao_response_json_invalid: '元宝未返回有效的解析 JSON，请稍后重新解析。',
  yuanbao_response_credential_echo: '元宝响应包含认证材料，插件已拒绝导出。',
  parse_request_failed: '元宝解析请求失败，请检查网络后重新解析。',
  extension_timeout: '元宝解析请求超时，请检查网络后重新解析。',
};
const youtubeFailures = {
  rate_limited: 'YouTube 暂时限流，请稍后在帧取重新解析，避免连续重试。',
  network_blocked: '请求被网络或平台阻止，请先在此 Chrome 确认同一视频可播放，再重新解析。',
  challenge: '平台要求进一步验证，请先在此 Chrome 正常确认同一视频可播放，再重新解析。',
  login_required: '平台要求登录，请打开 YouTube 确认登录并播放同一视频，然后在帧取重新解析。',
  identity_unavailable: '当前登录材料无法用于任务，请确认 Chrome 登录后刷新状态并重新解析。',
  context_changed: '任务上下文已变化，请在帧取重新解析，不要继续使用旧画质列表。',
  content_unavailable: '该目标暂不可访问，请在 Chrome 核对同一视频；登录不会扩张内容权限。',
  content_protected: '该目标受保护，无法通过链接下载；可使用已获授权的本地文件导入。',
  format_unavailable: '该目标没有可用画质，请在帧取重新解析。',
  extractor_broken: '解析器暂时无法处理该目标，请稍后重试。',
  transient: '解析暂时失败，请检查同一视频是否可播后重新解析。',
  invalid_input: '目标链接未通过校验，请核对链接后重新解析。',
  runtime_unavailable: '解析运行环境暂不可用，请检查服务状态后重新解析。',
};
function renderYouTube(state) {
  const youtube = state.youtube;
  const readable = state.connected && youtube?.material === 'available';
  const outcome = readable ? youtube.outcome : 'not_checked';
  document.getElementById('youtube-material').textContent = !state.connected ? '暂不可用' :
    { available: '材料可读取', missing: '缺少登录材料', unavailable: '暂不可用' }[youtube?.material] ?? '暂不可用';
  document.getElementById('youtube-outcome').textContent = {
    accepted: '最近任务解析通过', failed: '最近任务解析失败', not_checked: '尚未验证',
  }[outcome] ?? '尚未验证';
  document.getElementById('youtube-task').textContent = outcome !== 'not_checked' && youtube.task_id ?
    `任务 ${youtube.task_id} · ${youtube.checked_at}（5 分钟内的结果，仅适用于该任务）` : '';
  document.getElementById('youtube-message').textContent = !state.connected ?
    '请先连接所配置的身份服务，再刷新状态。' : state.busy ? '正在处理任务，请完成后刷新状态。' :
    youtube?.material === 'missing' ? '请在此 Chrome 的 YouTube 页面完成登录，确认同一视频可播放，再刷新状态并在帧取重新解析。' :
    !readable ? '暂时无法读取材料，请稍后刷新状态；持续失败时检查插件与宿主连接。' :
    outcome === 'accepted' ? '携带当前材料的最近任务已通过解析。其他视频仍需实际解析，下载以完整文件校验为准。' :
    outcome === 'failed' ? youtubeFailures[youtube.failure_class] ?? '最近任务未完成，请在帧取重新解析并查看任务详情。' :
    '材料可读取不代表登录仍然有效。请在帧取重新解析目标视频，以实际任务结果为准。';
}
const connection = document.getElementById('connection');
const session = document.getElementById('session');
const message = document.getElementById('message');
const buttons = [...document.querySelectorAll('button')];
let pending = false;
async function refresh(type = 'status') {
  if (pending) return;
  pending = true;
  buttons.forEach(button => { button.disabled = true; });
  try {
    const state = await chrome.runtime.sendMessage({ type });
    if (!state || state.error) throw new Error('status_unavailable');
    document.getElementById('version').textContent = `v${state.version}`;
    document.getElementById('endpoint').textContent = state.endpoint ?? '尚未配置服务地址';
    connection.textContent = state.connected ? '已连接' : '未连接';
    session.textContent = sessionLabels[state.session] ?? '暂不可用';
    renderYouTube(state);
    document.getElementById('reconnect').hidden = state.connected;
    message.textContent = !state.connected ? '请确认上述服务地址可用，然后点击“重新连接”。' :
      state.busy ? '正在处理解析任务，请稍候。' :
      state.cause ? causeMessages[state.cause] ?? '上次解析未完成，请重新解析。' :
      state.session === 'missing' ? '请点击“登录元宝”，完成登录后重新解析。' :
      '解析无需打开元宝页面。登录有效性将在实际请求时校验。';
  } catch {
    connection.textContent = '暂不可用';
    document.getElementById('endpoint').textContent = '服务地址暂不可读取';
    session.textContent = '暂不可用';
    renderYouTube({ connected: false });
    message.textContent = '无法读取插件状态，请重新加载插件后再试。';
  } finally {
    pending = false;
    buttons.forEach(button => { button.disabled = false; });
  }
}
document.getElementById('login-youtube').addEventListener('click', () => { void refresh('login_youtube'); });
document.getElementById('login-yuanbao').addEventListener('click', () => { void refresh('login_yuanbao'); });
document.getElementById('refresh').addEventListener('click', () => { void refresh(); });
document.getElementById('reconnect').addEventListener('click', () => { void refresh('reconnect'); });
void refresh();
