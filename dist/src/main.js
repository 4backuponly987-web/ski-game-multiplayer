function setBootStatus(message) {
  const node = document.querySelector('#boot-status');
  if (node) node.textContent = String(message || 'LOADING MOUNTAIN…');
}

function showBootError(error) {
  console.error('[ALPINE FREERIDE] startup failed', error);
  const menu = document.querySelector('#main-menu') || document.body;
  const existing = document.querySelector('#boot-error');
  if (existing) existing.remove();
  const panel = document.createElement('div');
  panel.id = 'boot-error';
  panel.setAttribute('role', 'alert');
  panel.style.cssText = [
    'max-width:640px', 'margin:18px 0 0', 'padding:14px 16px',
    'border:1px solid rgba(255,120,100,.75)', 'border-radius:10px',
    'background:rgba(25,8,8,.88)', 'color:#fff1ed', 'font:600 13px/1.45 system-ui,sans-serif',
    'white-space:normal', 'pointer-events:auto'
  ].join(';');
  const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error || 'Unknown startup error');
  panel.textContent = `ALPINE FREERIDE could not start. ${message} — close any older RUN_GAME window, then hard-refresh with Ctrl+Shift+R. If it persists, copy this message.`;
  const actions = menu.querySelector?.('.menu-actions');
  if (actions?.parentElement) actions.parentElement.insertBefore(panel, actions.nextSibling);
  else menu.appendChild(panel);
  const play = document.querySelector('#play-button');
  if (play) { play.disabled = true; play.textContent = 'STARTUP ERROR'; }
}

async function boot() {
  const bootStartedAt = performance.now();
  try {
    const canvas = document.querySelector('#game-canvas');
    if (!canvas) throw new Error('Game canvas was not found.');
    setBootStatus('LOADING SHADERS…');
    await new Promise(resolve => requestAnimationFrame(resolve));
    const { Game } = await import('./Game.js');
    setBootStatus('BUILDING RESORT…');
    const game = new Game(canvas);
    const inviteRoom = game.multiplayer?.getRoomFromUrl?.();
    if (inviteRoom) setTimeout(() => game.menu?.openMultiplayer?.(), 0);
    setBootStatus('DROPPING IN…');
    document.documentElement.dataset.bootMs = String(Math.round(performance.now() - bootStartedAt));
    document.querySelector('#boot-loader')?.remove();
    if (new URLSearchParams(location.search).has('qa')) window.__alpine = game;
  } catch (error) {
    document.querySelector('#boot-loader')?.remove();
    showBootError(error);
  }
}

boot();
