// Автообновление установленного приложения.
// Новая версия скачивается в фоне. Перезагрузка — только на «спокойных» экранах, чтобы не прерывать урок.

let updateReady = false;
let safeToReload = false;
let reloading = false;

function maybeReload() {
  if (updateReady && safeToReload && !reloading) {
    reloading = true;
    location.reload();
  }
}

/** Экран сообщает, можно ли сейчас перезагрузиться (главный экран, выбор профиля, сад). */
export function setSafeToReload(safe: boolean) {
  safeToReload = safe;
  maybeReload();
}

export function initUpdates() {
  if (!('serviceWorker' in navigator) || !import.meta.env.PROD) return;
  // Если service worker уже управлял страницей, смена управляющего = пришла новая версия.
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController) return; // первая установка — перезагружать незачем
    updateReady = true;
    maybeReload();
  });
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('./sw.js')
      .then((reg) => {
        const check = () => void reg.update().catch(() => {});
        // Установленное приложение часто не перезапускается, а только разворачивается — проверяем и тогда.
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') check();
        });
        window.setInterval(check, 30 * 60 * 1000);
      })
      .catch(() => {});
  });
}
