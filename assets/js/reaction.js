<script>
(function(){
  const API = '/api';
  let ME = null;   // {uid, csrf}

  async function me(){
    const r = await fetch(`${API}/me.php`, {credentials:'include'});
    ME = await r.json();
    document.querySelectorAll('[data-auth-forms]').forEach(el=>{
      const loggedIn = !!ME.uid;
      el.classList.toggle('d-none', loggedIn);
    });
    document.querySelectorAll('[data-comment-ui]').forEach(el=>{
      const loggedIn = !!ME.uid;
      el.classList.toggle('d-none', !loggedIn);
    });
  }

  async function loadCounts(wrapper){
    const slug = wrapper.dataset.articleSlug;
    const res = await fetch(`${API}/reactions_get.php?slug=${encodeURIComponent(slug)}`, {credentials:'include'});
    const data = await res.json();
    if (data.counts){
      for (const k in data.counts){
        const el = wrapper.querySelector(`[data-count="${k}"]`);
        if (el) el.textContent = data.counts[k];
      }
    }
    if (data.mine){
      // optional: highlight user’s choice
      wrapper.querySelectorAll('.reaction-emoji').forEach(e=>{
        e.style.opacity = (e.dataset.react === data.mine) ? '1' : '0.5';
      });
    }
  }

  async function setReaction(wrapper, type){
    if (!ME?.uid){ alert('Please sign in to react.'); return; }
    const slug = wrapper.dataset.articleSlug;
    const form = new FormData();
    form.set('slug', slug);
    form.set('type', type);
    const res = await fetch(`${API}/reactions_set.php`, {
      method:'POST', body:form, credentials:'include',
      headers: {'X-CSRF-Token': ME.csrf}
    });
    const data = await res.json();
    if (data.ok) loadCounts(wrapper); else alert(data.error||'Failed');
  }

  async function loadComments(wrapper){
    const slug = wrapper.dataset.articleSlug;
    const r = await fetch(`${API}/comments_list.php?slug=${encodeURIComponent(slug)}`, {credentials:'include'});
    const data = await r.json();
    const list = wrapper.querySelector('.comment-list');
    list.innerHTML = (data.comments||[]).map(c=>`
      <div class="one">
        <strong>${escapeHtml(c.username)}</strong>
        <div class="small text-secondary">${new Date(c.created_at).toLocaleString()}</div>
        <div>${escapeHtml(c.body)}</div>
      </div>
    `).join('') || '<div class="text-secondary">No comments yet.</div>';
  }

  function escapeHtml(s){
    return (s||'').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }

  // Event delegation
  document.addEventListener('click', async (e)=>{
    const react = e.target.closest('.reaction-emoji');
    if (react){
      const wrap = e.target.closest('[data-article-slug]');
      setReaction(wrap, react.dataset.react);
    }
    if (e.target.matches('[data-action="toggle-comments"]')){
      const wrap = e.target.closest('[data-article-slug]');
      const box = wrap.querySelector('.comment-box');
      box.classList.toggle('show');
      if (box.classList.contains('show')){
        await me();                   // ensure state
        await loadComments(wrap);     // load list
      }
    }
  });

  // Auth forms
  document.addEventListener('submit', async (e)=>{
    const form = e.target;
    if (form.matches('form[data-form="register"]')){
      e.preventDefault();
      const fd = new FormData(form);
      const r = await fetch(`${API}/auth_register.php`, {method:'POST', body:fd, credentials:'include'});
      const j = await r.json();
      if (j.ok){ alert('Check your email to verify your account.'); }
      else alert(j.error||'Registration failed');
    }
    if (form.matches('form[data-form="login"]')){
      e.preventDefault();
      const fd = new FormData(form);
      const r = await fetch(`${API}/auth_login.php`, {method:'POST', body:fd, credentials:'include'});
      const j = await r.json();
      if (j.ok){ await me(); alert('Signed in. You can comment & react.'); }
      else alert(j.error||'Login failed');
    }
    if (form.matches('form[data-form="comment"]')){
      e.preventDefault();
      if (!ME?.uid){ alert('Sign in first.'); return; }
      const wrap = form.closest('[data-article-slug]');
      const fd = new FormData(form);
      fd.set('slug', wrap.dataset.articleSlug);
      const r = await fetch(`${API}/comments_add.php`, {
        method:'POST', body:fd, credentials:'include',
        headers:{'X-CSRF-Token':ME.csrf}
      });
      const j = await r.json();
      if (j.ok){ form.reset(); loadComments(wrap); }
      else alert(j.error||'Could not post');
    }
  });

  // On page load: discover all wrappers and hydrate counts
  window.addEventListener('DOMContentLoaded', async ()=>{
    await me();
    document.querySelectorAll('[data-article-slug]').forEach(loadCounts);
  });
})();
</script>
