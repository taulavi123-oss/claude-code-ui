// Clawd, ported from Claudie 1.1.3 (MIT). He sits beside the prompt box,
// blinks, looks at the pointer, waves while Claude works, can be grabbed,
// thrown, and walked back home; clicking makes him jump and talk.
import "./clawd.css";

export type PetState = "idle" | "thinking" | "writing" | "waiting";

const LINES_TOUCH = ["hi!", "hey there", "need anything?", "psst", "I'm awake."];
const LINES_HELD = ["whoa!", "put me down!", "I can fly!"];
const LINES_FALL = ["ow.", "I'm fine.", "landed."];
const LINES_READY = ["done!", "all set", "what next?"];

export function mountClawd(host: HTMLElement) {
  const LINHAS = [" ▐▛███▜▌", "▝▜█████▛▘", "  ▘▘ ▝▝"];
  const Q: Record<string, number[]> = {
    " ": [0, 0, 0, 0],
    "█": [1, 1, 1, 1],
    "▐": [0, 1, 0, 1],
    "▌": [1, 0, 1, 0],
    "▛": [1, 1, 1, 0],
    "▜": [1, 1, 0, 1],
    "▝": [0, 1, 0, 0],
    "▘": [1, 0, 0, 0],
  };
  const corpo: number[][] = [];
  LINHAS.forEach((line, j) => [...line].forEach((c, i) => Q[c]!.forEach((v, k) => v && corpo.push([i * 2 + (k & 1), j * 2 + (k >> 1)]))));
  const x0 = Math.min(...corpo.map((p) => p[0]));
  const y0 = Math.min(...corpo.map((p) => p[1]));
  const PIX = corpo.map(([x, y]) => [x - x0, y - y0]);
  const OLHOS = [
    [4, 1],
    [11, 1],
  ];
  const BRACOS = PIX.filter(([x, y]) => y === 2 && (x < 2 || x > 13));
  const PERNAS = PIX.filter(([, y]) => y === 4);
  const RESTO = PIX.filter((p) => !BRACOS.includes(p) && !PERNAS.includes(p));

  const PW = 4;
  const PH = 8;
  const W = (Math.max(...PIX.map((p) => p[0])) + 1) * PW;
  const H = (Math.max(...PIX.map((p) => p[1])) + 1) * PH;
  const MARGEM = 18;
  const CW = W + MARGEM * 2;
  const CH = H + MARGEM * 2;
  const dpr = Math.min(2, devicePixelRatio || 1);

  const box = document.createElement("div");
  box.className = "clawd";
  box.dataset.testid = "claude-pet";
  const bubble = document.createElement("div");
  bubble.className = "clawd-balao";
  const cv = document.createElement("canvas");
  box.append(bubble, cv);
  host.append(box);

  cv.width = CW * dpr;
  cv.height = CH * dpr;
  cv.style.width = `${CW}px`;
  cv.style.height = `${CH}px`;
  const ctx = cv.getContext("2d")!;

  let estado: PetState = "idle";
  let desde = performance.now();
  let pulo = 0;
  let tremor = 0;
  let piscaAte = 0;
  let proxPisca = performance.now() + 2500;
  let olhar = 0;
  let mouseX: number | null = null;
  let timerBalao = 0;

  const fala = (text: string, ms = 0) => {
    window.clearTimeout(timerBalao);
    if (!text) return bubble.classList.remove("on");
    bubble.textContent = text;
    bubble.classList.add("on");
    bubble.classList.toggle("longo", text.length > 22);
    if (ms) timerBalao = window.setTimeout(() => bubble.classList.remove("on"), ms);
  };

  // ---- free: grab him, swing him, drop him; he walks back to his spot ------
  type Mode = "casa" | "arrastado" | "cai" | "tonto" | "volta";
  let modo: Mode = "casa";
  let x = 0;
  let y = 0;
  let vx = 0;
  let vy = 0;
  let ang = 0;
  let angV = 0;
  let pvx = 0;
  let pvxAnt = 0;
  let jogado = false;
  let tontoAte = 0;
  let dir = -1;
  let passo = 0;
  let casa = { x: 0, y: 0 };
  let hostR = { left: 0, top: 0, width: 0 };
  let segura: { dx: number; dy: number; x0: number; y0: number; moveu: boolean; am: number[][] } | null = null;
  let giro = -9;
  let cliques: number[] = [];

  const toque = () => {
    pulo = performance.now();
    const agora = performance.now();
    cliques = cliques.filter((t) => agora - t < 1300);
    cliques.push(agora);
    if (cliques.length === 4) return fala("calm down!", 1600);
    if (cliques.length === 7) return fala("I'll tell Claude…", 1800);
    if (cliques.length >= 10) {
      cliques = [];
      giro = agora;
      return fala("ok, you win. watch me spin!", 2200);
    }
    if (cliques.length > 1) return;
    fala(LINES_TOUCH[Math.floor(Math.random() * LINES_TOUCH.length)]!, 2600);
  };

  cv.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    try {
      cv.setPointerCapture(e.pointerId);
    } catch {
      // already released
    }
    if (modo === "casa") {
      x = casa.x;
      y = casa.y;
    }
    segura = { dx: e.clientX - hostR.left - x, dy: e.clientY - hostR.top - y, x0: e.clientX, y0: e.clientY, moveu: false, am: [] };
    pvx = pvxAnt = 0;
  });

  cv.addEventListener("pointermove", (e) => {
    if (!segura) return;
    if (!segura.moveu && Math.hypot(e.clientX - segura.x0, e.clientY - segura.y0) > 5) {
      segura.moveu = true;
      modo = "arrastado";
      ang = angV = 0;
      box.classList.add("livre");
      box.style.transformOrigin = `${segura.dx}px ${segura.dy}px`;
      fala(LINES_HELD[Math.floor(Math.random() * LINES_HELD.length)]!, 1600);
    }
    if (modo !== "arrastado") return;
    x = e.clientX - hostR.left - segura.dx;
    y = e.clientY - hostR.top - segura.dy;
    const am = segura.am;
    am.push([e.clientX, e.clientY, performance.now()]);
    if (am.length > 5) am.shift();
    if (am.length > 1) {
      const a = am[am.length - 2]!;
      const b = am[am.length - 1]!;
      pvx = pvx * 0.5 + ((b[0]! - a[0]!) / Math.max(0.008, (b[2]! - a[2]!) / 1000)) * 0.5;
    }
  });

  const solta = () => {
    if (!segura) return;
    const s = segura;
    segura = null;
    if (!s.moveu) return toque();
    const a = s.am;
    const p = a[0];
    const u = a[a.length - 1];
    const dt = Math.max(0.016, ((u?.[2] ?? 0) - (p?.[2] ?? 0)) / 1000);
    vx = p ? Math.max(-1400, Math.min(1400, (u![0]! - p[0]!) / dt)) : 0;
    vy = p ? Math.max(-1600, Math.min(1600, (u![1]! - p[1]!) / dt)) : 0;
    modo = "cai";
    jogado = true;
  };
  cv.addEventListener("pointerup", solta);
  cv.addEventListener("pointercancel", solta);

  const posiciona = () => {
    const surface = host.closest('[data-testid="session-surface"]') as HTMLElement | null;
    const comp = surface?.querySelector('[data-testid="prompt-box"]') as HTMLElement | null;
    if (!surface || !comp) return;
    const main = host.getBoundingClientRect();
    const c = comp.getBoundingClientRect();
    hostR = { left: main.left, top: main.top, width: main.width };
    casa = { x: c.left - main.left - CW + 8, y: c.bottom - main.top - CH + MARGEM - 6 };
    if (modo === "casa") {
      box.style.transform = `translate(${casa.x}px, ${casa.y}px)`;
      box.classList.toggle("sem-espaco", casa.x <= 4);
    }
    box.style.setProperty("--margem", `${Math.max(120, c.left - main.left)}px`);
  };

  function anda(dt: number, ms: number) {
    if (modo === "arrastado") {
      const acc = (pvx - pvxAnt) / Math.max(dt, 0.008);
      pvxAnt = pvx;
      pvx *= Math.exp(-6 * dt);
      angV += (-17 * Math.sin(ang) + acc * 0.0018 + pvx * 0.0016) * dt;
      angV *= Math.exp(-0.6 * dt);
      ang = Math.max(-1.3, Math.min(1.3, ang + angV * dt));
    } else if (modo === "cai") {
      vy += 2600 * dt;
      x += vx * dt;
      y += vy * dt;
      vx *= 0.995;
      ang *= Math.exp(-5 * dt);
      const max = hostR.width - CW;
      if (x < -MARGEM || x > max) {
        x = Math.max(-MARGEM, Math.min(max, x));
        vx = -vx * 0.5;
      }
      if (y >= casa.y) {
        y = casa.y;
        ang = 0;
        box.style.transformOrigin = "";
        if (vy > 700) {
          vy = -vy * 0.32;
          vx *= 0.6;
        } else if (jogado && vy > 380) {
          modo = "tonto";
          tontoAte = ms + 1300;
          fala(LINES_FALL[Math.floor(Math.random() * LINES_FALL.length)]!, 1500);
        } else {
          modo = "volta";
          fala(LINES_FALL[Math.floor(Math.random() * LINES_FALL.length)]!, 1400);
        }
      }
    } else if (modo === "tonto") {
      if (ms > tontoAte) modo = "volta";
    } else if (modo === "volta") {
      y = casa.y;
      dir = Math.sign(casa.x - x) || dir;
      x += dir * 110 * dt;
      passo += dt * 9;
      if ((dir > 0 && x >= casa.x) || (dir < 0 && x <= casa.x)) {
        modo = "casa";
        box.classList.remove("livre");
        posiciona();
        return;
      }
    }
    if (modo !== "casa") box.style.transform = `translate(${x}px, ${y}px) rotate(${ang}rad)`;
  }

  let cor = "#d77757";
  let centro = 0;
  let ultimoQ = 0;
  const mede = () => {
    if (!host.offsetParent) return;
    posiciona();
    cor = getComputedStyle(document.documentElement).getPropertyValue("--color-primary").trim() || "#d77757";
    centro = box.getBoundingClientRect().left + CW / 2;
  };

  const desenha = (ms: number) => {
    raf = requestAnimationFrame(desenha);
    if (document.hidden || !host.offsetParent || (modo === "casa" && ms - ultimoQ < 1000 / 30 - 4)) return;
    const dtq = Math.min(0.05, (ms - (ultimoQ || ms)) / 1000);
    ultimoQ = ms;
    anda(dtq, ms);
    const t = ms / 1000;
    const dt = (ms - desde) / 1000;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, CW, CH);

    let dy = 0;
    let dx = 0;
    if (modo === "casa") {
      if (estado === "idle") dy = Math.sin(t * 1.6) * 1.2;
      if (estado === "thinking") dy = Math.sin(t * 4) * 2.2;
      if (estado === "writing") dy = Math.abs(Math.sin(t * 9)) * -1.6;
      if (estado === "waiting") dy = Math.sin(t * 6) * 1.5;
    }
    if (modo === "volta") dy = Math.floor(passo) % 2 ? -1 : 0;
    const p = (ms - pulo) / 600;
    if (p >= 0 && p < 1) dy -= Math.sin(p * Math.PI) * 14;
    const q = (ms - tremor) / 500;
    if (q >= 0 && q < 1) dx = Math.sin(q * 40) * 3 * (1 - q);

    const ox = MARGEM + dx;
    const oy = MARGEM + dy;
    const px = (gx: number, gy: number, c = cor) => {
      ctx.fillStyle = c;
      ctx.fillRect(Math.round(ox + gx * PW), Math.round(oy + gy * PH), PW, PH);
    };

    const gp = (ms - giro) / 700;
    if (gp >= 0 && gp < 1) {
      ctx.translate(CW / 2, CH / 2);
      ctx.rotate(gp * Math.PI * 2);
      ctx.translate(-CW / 2, -CH / 2);
    }

    for (const [gx, gy] of RESTO) px(gx, gy);

    if (ms > proxPisca) {
      piscaAte = ms + 130;
      proxPisca = ms + 2500 + Math.random() * 3500;
    }
    const alvo = modo === "volta" ? dir : modo === "arrastado" ? (ang > 0.2 ? -1 : ang < -0.2 ? 1 : 0) : estado === "idle" && mouseX != null ? Math.max(-1, Math.min(1, Math.round((mouseX - centro) / 160))) : estado === "writing" ? 1 : 0;
    olhar += (alvo - olhar) * 0.15;
    const o = Math.round(olhar);
    const tonto = modo === "tonto";
    for (const [ex, ey] of OLHOS) {
      px(ex, ey);
      if (ms > piscaAte && !tonto) ctx.clearRect(Math.round(ox + (ex + o) * PW), Math.round(oy + (ey + (modo === "arrastado" ? 0.25 : 0)) * PH), PW, PH);
    }

    for (const [gx, gy] of BRACOS) {
      const esquerdo = gx < 8;
      let ay = 0;
      if (modo === "arrastado" || (modo === "cai" && vy < 0)) ay = -1.5;
      else if (modo === "volta") ay = (Math.floor(passo) + (esquerdo ? 0 : 1)) % 2 ? -0.5 : 0;
      else if (modo === "casa") {
        if (estado === "writing") ay = (Math.floor(t * 8) + (esquerdo ? 0 : 1)) % 2 ? -0.5 : 0.5;
        if (estado === "waiting" && !esquerdo) ay = -1 - (Math.floor(t * 4) % 2);
        if (estado === "thinking" && esquerdo) ay = -0.5;
      }
      ctx.fillStyle = cor;
      ctx.fillRect(Math.round(ox + gx * PW), Math.round(oy + (gy + ay) * PH), PW, PH);
    }

    PERNAS.forEach(([gx, gy], i) => {
      let lev = 0;
      if (modo === "arrastado") lev = i % 2 === (angV > 0 ? 0 : 1) ? 3 : 1;
      else if (modo === "volta") lev = (Math.floor(passo) + i) % 2 ? -3 : 0;
      else if (modo === "casa" && estado === "writing" && (Math.floor(t * 6) + i) % 2) lev = -2;
      ctx.fillStyle = cor;
      ctx.fillRect(Math.round(ox + gx * PW), Math.round(oy + gy * PH + lev), PW, PH);
    });

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (tonto) {
      ctx.fillStyle = "#f5c66b";
      for (let k = 0; k < 3; k++) {
        const a = t * 6 + (k * Math.PI * 2) / 3;
        ctx.fillRect(Math.round(ox + W / 2 + Math.cos(a) * 22 - 2), Math.round(oy - 6 + Math.sin(a) * 5), 4, 4);
      }
    }
    if (modo === "casa" && estado === "thinking") {
      for (let k = 0; k < 3; k++) {
        const f = (t * 1.4 + k / 3) % 1;
        ctx.globalAlpha = Math.sin(f * Math.PI);
        ctx.fillStyle = cor;
        ctx.fillRect(Math.round(ox + 9 * PW + k * 6), Math.round(oy - 4 - f * 12), 3, 3);
        ctx.globalAlpha = 1;
      }
    }
    if (modo === "casa" && estado === "waiting" && Math.floor(t * 3) % 2) {
      ctx.fillStyle = cor;
      ctx.fillRect(ox + W + 4, oy - 6, 3, 9);
      ctx.fillRect(ox + W + 4, oy + 5, 3, 3);
    }
  };

  let raf = 0;
  const onMove = (e: PointerEvent) => {
    mouseX = e.clientX;
  };
  const onResize = () => mede();

  mede();
  // A retry: the first measurement can happen before the prompt box exists.
  const warm = window.setTimeout(mede, 400);
  const timer = window.setInterval(mede, 400);
  const ro = new ResizeObserver(mede);
  const surface = host.closest('[data-testid="session-surface"]');
  const comp = surface?.querySelector('[data-testid="prompt-box"]');
  if (comp) ro.observe(comp);
  window.addEventListener("resize", onResize);
  window.addEventListener("pointermove", onMove, { passive: true });
  raf = requestAnimationFrame(desenha);

  return {
    setState(next: PetState) {
      if (next === estado) return;
      const finished = estado === "writing" || estado === "thinking";
      estado = next;
      desde = performance.now();
      if (next === "idle" && finished) fala(LINES_READY[Math.floor(Math.random() * LINES_READY.length)]!, 1800);
    },
    say(text: string, ms = 2600) {
      fala(text, ms);
    },
    destroy() {
      cancelAnimationFrame(raf);
      window.clearTimeout(timerBalao);
      window.clearTimeout(warm);
      window.clearInterval(timer);
      ro.disconnect();
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onMove);
      box.remove();
    },
  };
}
