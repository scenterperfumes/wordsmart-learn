export function getDevice() {
  let id = localStorage.getItem("lws_device_id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("lws_device_id", id);
  }
  const ua = navigator.userAgent;
  const browser = /Edg\//.test(ua) ? "Edge" : /OPR\//.test(ua) ? "Opera" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Browser";
  const os = /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iOS" : /Windows/.test(ua) ? "Windows" : /Mac OS/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : "Unknown OS";
  return { id, name: `${browser} on ${os}` };
}

export function burstConfetti(x = window.innerWidth / 2, y = window.innerHeight / 2) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  for (let i = 0; i < 24; i++) {
    const el = document.createElement('span');
    el.className = 'pip-confetti';
    el.textContent = ['♠','♥','♣','♦'][i%4] ?? '♠';
    el.style.left = `${x}px`; el.style.top = `${y}px`;
    const angle = Math.random() * Math.PI * 2; const dist = 60 + Math.random() * 110;
    document.body.appendChild(el);
    requestAnimationFrame(() => { el.style.transform = `translate(${Math.cos(angle)*dist}px,${Math.sin(angle)*dist+40}px) rotate(${Math.random()*360}deg)`; el.style.opacity = '0'; });
    setTimeout(() => el.remove(), 900);
  }
}

export function speak(text: string) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text.toLowerCase());
  u.lang = "en-US";
  u.rate = 0.9;
  window.speechSynthesis.speak(u);
}
