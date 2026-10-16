/* Shared by the MV3 worker and Node protocol tests. No browser state is stored. */
(() => {
  const encoder = new TextEncoder();
  const NONCE = /^[a-f0-9]{64}$/;
  const MAX_MESSAGE_BYTES = 1024 * 1024;
  const MAX_PARSE_MESSAGE_BYTES = 4 * 1024 * 1024 + 4096;
  function nonce() {
    return Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2, '0')).join('');
  }
  async function proof(key, role, peer, own) {
    if (!NONCE.test(peer) || !NONCE.test(own) || !['server', 'extension'].includes(role)) throw new Error('invalid_challenge');
    const secret = await crypto.subtle.importKey('raw', encoder.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const signature = await crypto.subtle.sign('HMAC', secret, encoder.encode(role + peer + own));
    return Array.from(new Uint8Array(signature), b => b.toString(16).padStart(2, '0')).join('');
  }
  function equal(a, b) {
    if (typeof b !== 'string' || a.length !== b.length) return false;
    let difference = 0;
    for (let i = 0; i < a.length; i++) difference |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return difference === 0;
  }
  function allowed(domain, domains) {
    const host = domain.replace(/^\./, '').toLowerCase();
    return domains.some(d => host === d || host.endsWith('.' + d));
  }
  function filterCookies(cookies, domains) {
    return cookies.filter(c => !c.partitionKey && allowed(c.domain, domains)).map(c => ({
      domain: c.domain, path: c.path, name: c.name, value: c.value,
      secure: c.secure, httpOnly: c.httpOnly, hostOnly: c.hostOnly,
      expirationDate: c.expirationDate,
    }));
  }
  function requestDeadline(value) {
    if (typeof value !== 'string' ||
        !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|\+00:00)$/.test(value)) throw new Error('invalid_deadline');
    const deadline = Date.parse(value);
    if (!Number.isFinite(deadline)) throw new Error('invalid_deadline');
    return deadline;
  }
  function checkedParseResult(result, canonicalUrl) {
    const causes = new Set([
      'credential_missing', 'identity_material_invalid', 'identity_account_conflict', 'parse_response_invalid',
      'parse_request_failed', 'extension_timeout',
      'yuanbao_request_rule_unavailable',
      'yuanbao_response_source_invalid', 'yuanbao_response_size_invalid', 'yuanbao_response_utf8_invalid', 'yuanbao_response_json_invalid', 'yuanbao_response_credential_echo',
    ]);
    if (result && Object.keys(result).sort().join(',') === 'cause' && causes.has(result.cause)) return { cause: result.cause };
    if (!result || Object.keys(result).sort().join(',') !== 'account_id,captured' ||
        typeof result.account_id !== 'string' || !result.account_id || result.account_id !== result.account_id.trim() ||
        /[\x00-\x1f\x7f\ud800-\udfff]/u.test(result.account_id) || encoder.encode(result.account_id).length > 1024) throw new Error('invalid_parse_response');
    const captured = result.captured;
    const apiUrl = 'https://yuanbao.tencent.com/api/weixin/get_parse_result';
    const body = captured?.request_body;
    if (!captured || Object.keys(captured).sort().join(',') !== 'http_status,payload,request_body,request_method,request_url,response_url' ||
        captured.request_method !== 'POST' || captured.request_url !== apiUrl || captured.response_url !== apiUrl ||
        !Number.isInteger(captured.http_status) || captured.http_status < 200 || captured.http_status > 599 ||
        !body || Object.keys(body).sort().join(',') !== 'scene,type,url' ||
        body.type !== 'video_channel_url' || body.url !== canonicalUrl || body.scene !== 1 ||
        !captured.payload || typeof captured.payload !== 'object' || Array.isArray(captured.payload) ||
        encoder.encode(JSON.stringify(captured)).length > 4 * 1024 * 1024) throw new Error('invalid_parse_response');
    return { account_id: result.account_id, captured };
  }
  function unavailableYouTubeStatus() {
    return { type: 'youtube_status', material: 'unavailable', outcome: 'not_checked', task_id: null, checked_at: null, failure_class: null };
  }
  function checkedYouTubeStatus(message) {
    const classes = ['network_blocked', 'challenge', 'login_required', 'identity_unavailable', 'rate_limited', 'context_changed', 'content_unavailable', 'content_protected', 'extractor_broken', 'format_unavailable', 'transient', 'invalid_input', 'runtime_unavailable'];
    if (Object.keys(message).sort().join(',') !== 'checked_at,failure_class,material,outcome,request_id,task_id,type' ||
        typeof message.request_id !== 'string' || !/^[a-f0-9]{32}$/.test(message.request_id) ||
        !['available', 'missing', 'unavailable'].includes(message.material) ||
        !['not_checked', 'accepted', 'failed'].includes(message.outcome)) throw new Error('invalid_status');
    if (message.outcome === 'not_checked') {
      if (message.task_id !== null || message.checked_at !== null || message.failure_class !== null) throw new Error('invalid_status');
    } else {
      if (message.material !== 'available' || typeof message.task_id !== 'string' ||
          !/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(message.task_id) ||
          (message.outcome === 'accepted' ? message.failure_class !== null : !classes.includes(message.failure_class))) throw new Error('invalid_status');
      requestDeadline(message.checked_at);
    }
    return message;
  }
  class Protocol {
    constructor(config, getAll, send, version, readParse) {
      this.config = config;
      this.getAll = getAll;
      this.send = send;
      this.version = version;
      this.readParse = readParse;
      this.own = nonce();
      this.peer = null;
      this.authenticated = false;
      this.busy = false;
      this.youtubePending = null;
    }
    youtubeStatus() {
      if (!this.authenticated || this.busy) return Promise.resolve(unavailableYouTubeStatus());
      if (this.youtubePending) return this.youtubePending.promise;
      let resolve;
      const promise = new Promise(done => { resolve = done; });
      const timer = setTimeout(() => this.clearYouTubeStatus(), 5000);
      const request_id = nonce().slice(0, 32);
      this.youtubePending = { promise, resolve, timer, request_id };
      this.send({ type: 'youtube_status', request_id });
      return promise;
    }
    clearYouTubeStatus(status = unavailableYouTubeStatus()) {
      const pending = this.youtubePending;
      this.youtubePending = null;
      if (pending) { clearTimeout(pending.timer); pending.resolve(status); }
    }
    async receive(message) {
      if (message.type === 'challenge' && !this.peer) {
        if (!NONCE.test(message.nonce)) throw new Error('invalid_challenge');
        this.peer = message.nonce;
        this.send({ type: 'challenge', nonce: this.own });
        return;
      }
      if (message.type === 'proof' && this.peer && !this.authenticated) {
        const expected = await proof(this.config.pairingKey, 'server', this.own, this.peer);
        if (!equal(expected, message.proof)) throw new Error('server_authentication_failed');
        this.authenticated = true;
        this.send({ type: 'proof', proof: await proof(this.config.pairingKey, 'extension', this.peer, this.own), version: this.version });
        return;
      }
      if (!this.authenticated) throw new Error('unauthenticated_request');
      if (message.type === 'youtube_status') {
        const { request_id, ...status } = checkedYouTubeStatus(message);
        if (this.youtubePending?.request_id === request_id) this.clearYouTubeStatus(status);
        return;
      }
      if (message.type === 'ping') { this.send({ type: 'pong' }); return; }
      if (message.type === 'pong' || message.type === 'ready') return;
      if (this.busy || typeof message.request_id !== 'string' || !/^[a-f0-9]{32}$/.test(message.request_id)) throw new Error('invalid_request');
      if (message.type === 'yuanbao_parse') {
        if (Object.keys(message).sort().join(',') !== 'canonical_share_url,deadline,request_id,site,type' ||
            message.site !== 'wechat_channels' || this.config.yuanbaoParse !== true ||
            typeof this.readParse !== 'function' || typeof message.canonical_share_url !== 'string' ||
            !/^https:\/\/weixin\.qq\.com\/sph\/[A-Za-z0-9_-]{4,256}$/.test(message.canonical_share_url)) throw new Error('undeclared_source');
        const deadlineMs = Math.min(requestDeadline(message.deadline), Date.now() + 30000);
        const timeoutResponse = () => this.send({ type: 'yuanbao_parse', request_id: message.request_id, cause: 'extension_timeout' });
        if (Date.now() >= deadlineMs) { timeoutResponse(); return; }
        this.busy = true;
        let timer;
        try {
          const result = await Promise.race([
            Promise.resolve().then(() => {
              if (Date.now() >= deadlineMs) throw new Error('extension_timeout');
              return this.readParse(message.canonical_share_url, deadlineMs);
            }),
            new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('extension_timeout')), deadlineMs - Date.now()); }),
          ]);
          if (Date.now() >= deadlineMs) { timeoutResponse(); return; }
          const response = { type: 'yuanbao_parse', request_id: message.request_id, ...checkedParseResult(result, message.canonical_share_url) };
          if (encoder.encode(JSON.stringify(response)).length > MAX_PARSE_MESSAGE_BYTES) throw new Error('message_too_large');
          if (Date.now() >= deadlineMs) { timeoutResponse(); return; }
          this.send(response);
        } catch (error) {
          if (error?.message !== 'extension_timeout') throw error;
          timeoutResponse();
        } finally { clearTimeout(timer); this.busy = false; }
        return;
      }
      if (message.type !== 'cookies') throw new Error('invalid_request');
      const domains = message.domains;
      if (Object.keys(message).sort().join(',') !== 'deadline,domains,request_id,type' ||
          !Array.isArray(domains) || !domains.length || domains.length > this.config.domains.length ||
          new Set(domains).size !== domains.length || !domains.every(d => this.config.domains.includes(d))) throw new Error('undeclared_domain');
      const deadlineMs = Math.min(requestDeadline(message.deadline), Date.now() + 5000);
      const checkDeadline = () => { if (Date.now() >= deadlineMs) throw new Error('extension_timeout'); };
      const timeoutResponse = () => this.send({ type: 'cookies', request_id: message.request_id, cause: 'extension_timeout' });
      if (Date.now() >= deadlineMs) { timeoutResponse(); return; }
      this.busy = true;
      let timer;
      const operation = { closed: false, results: [] };
      try {
        await Promise.race([
          Promise.resolve().then(() => {
            checkDeadline();
            return Promise.all(domains.map((domain, index) => Promise.resolve().then(() => {
              checkDeadline();
              return Promise.resolve(this.getAll({ domain })).then(cookies => {
                if (operation.closed) return;
                checkDeadline();
                operation.results[index] = cookies;
              });
            })));
          }),
          new Promise((_, reject) => {
            timer = setTimeout(() => reject(new Error('extension_timeout')), deadlineMs - Date.now());
          }),
        ]);
        checkDeadline();
        const selected = filterCookies(operation.results.flat(), domains);
        const unique = [...new Map(selected.map(c => [JSON.stringify([c.domain, c.path, c.name]), c])).values()];
        const response = { type: 'cookies', request_id: message.request_id, cookies: unique };
        if (encoder.encode(JSON.stringify(response)).length > MAX_MESSAGE_BYTES) throw new Error('message_too_large');
        checkDeadline();
        this.send(response);
      } catch (error) {
        if (error?.message !== 'extension_timeout') throw error;
        timeoutResponse();
      } finally { operation.closed = true; operation.results.length = 0; clearTimeout(timer); this.busy = false; }
    }
  }
  class Backoff {
    constructor() { this.attempt = 0; }
    next() { return this.attempt++ === 0 ? 0 : Math.min(30000, 1000 * 2 ** Math.min(this.attempt - 2, 5)); }
    reset() { this.attempt = 0; }
  }
  const api = { unavailableYouTubeStatus, Protocol, Backoff, proof, filterCookies, MAX_MESSAGE_BYTES, MAX_PARSE_MESSAGE_BYTES };
  globalThis.FramefetchIdentity = api;
  if (typeof module !== 'undefined') module.exports = api;
})();
