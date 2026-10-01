/**
 * Horários: estado real de aberto ou fechado e a semana agrupada.
 *
 * Os dados vêm de data/site.json. Nada aqui é escrito à mão.
 * O relógio usado é o de Lisboa, não o do visitante, porque o que
 * interessa é se o café está aberto agora, não onde está quem visita.
 * Fechos depois da meia-noite pertencem ao dia seguinte.
 */

const TZ = "Europe/Lisbon";
const DAY_NAMES = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const DAY_LONG = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

const toMinutes = (hhmm) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

/** Minutos desde a meia-noite e dia da semana, no fuso do café. */
function localNow(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ, weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false
  }).formatToParts(date);
  const get = (t) => parts.find((p) => p.type === t)?.value ?? "";
  const map = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return { day: map[get("weekday")] ?? date.getDay(), minutes: Number(get("hour")) * 60 + Number(get("minute")) };
}

/**
 * Converte os horários em intervalos absolutos por dia de início e
 * verifica se o momento actual cai dentro de algum.
 */
export function evaluate(hours, now = localNow()) {
  const byDay = new Map(hours.map((h) => [h.day, h]));

  // Cada dia abre um intervalo [open, close). Se close <= open, o intervalo
  // atravessa a meia-noite e estende-se para o dia seguinte. Basta testar o
  // intervalo aberto hoje e o que possa ter começado ontem.
  for (const offset of [0, -1]) {
    const day = (now.day + offset + 7) % 7;
    const entry = byDay.get(day);
    if (!entry) continue;
    const open = toMinutes(entry.open);
    const close = toMinutes(entry.close);
    const overnight = close <= open;
    const end = overnight ? close + 1440 : close;
    const t = offset === 0 ? now.minutes : now.minutes + 1440;
    if (t >= open && t < end) {
      return { open: true, closesAt: entry.close, overnight };
    }
  }

  // Fechado: procurar a próxima abertura, até sete dias à frente.
  for (let i = 0; i < 8; i += 1) {
    const day = (now.day + i) % 7;
    const entry = byDay.get(day);
    if (!entry) continue;
    const open = toMinutes(entry.open);
    if (i === 0 && now.minutes >= open) continue;
    return {
      open: false,
      opensAt: entry.open,
      opensDay: day,
      opensToday: i === 0,
      opensTomorrow: i === 1
    };
  }
  return { open: false };
}

/** Junta dias seguidos com o mesmo horário: "Terça a sexta". */
export function groupWeek(hours) {
  const byDay = new Map(hours.map((h) => [h.day, h]));
  const rows = [];
  let run = null;

  for (const day of WEEK_ORDER) {
    const entry = byDay.get(day);
    if (!entry) continue;
    const key = `${entry.open}-${entry.close}`;
    if (run && run.key === key) {
      run.days.push(day);
    } else {
      if (run) rows.push(run);
      run = { key, days: [day], open: entry.open, close: entry.close };
    }
  }
  if (run) rows.push(run);

  return rows.map((r) => ({
    label: r.days.length === 1
      ? DAY_NAMES[r.days[0]]
      : `${DAY_NAMES[r.days[0]]} a ${DAY_NAMES[r.days.at(-1)].toLowerCase()}`,
    days: r.days,
    value: `${r.open} - ${r.close}`
  }));
}

export function mountHours(site) {
  const section = document.querySelector("#horarios");
  if (!section || !site?.hours?.length) return;

  const render = () => {
    const now = localNow();
    const state = evaluate(site.hours, now);

    section.setAttribute("data-open", String(state.open));
    const label = section.querySelector("[data-hours-label]");
    const title = section.querySelector("[data-hours-now]");
    const next = section.querySelector("[data-hours-next]");

    if (label) label.textContent = state.open ? "Aberto agora" : "Fechado agora";
    if (title) title.textContent = state.open ? "Estamos abertos" : "Estamos fechados";

    if (next) {
      if (state.open) {
        next.textContent = state.closesAt === "00:00"
          ? "Fecha à meia-noite."
          : state.overnight
            ? `Fecha às ${state.closesAt} da madrugada.`
            : `Fecha às ${state.closesAt}.`;
      } else if (state.opensAt) {
        const when = state.opensToday
          ? "hoje"
          : state.opensTomorrow
            ? "amanhã"
            : DAY_LONG[state.opensDay];
        next.textContent = `Abrimos ${when} às ${state.opensAt}.`;
      } else {
        next.textContent = "";
      }
    }

    const list = section.querySelector("[data-hours-list]");
    if (list) {
      list.replaceChildren(
        ...groupWeek(site.hours).map((row) => {
          const wrap = document.createElement("div");
          wrap.className = "hours__row";
          if (row.days.includes(now.day)) wrap.setAttribute("data-today", "");
          const dt = document.createElement("dt");
          dt.textContent = row.label;
          const dd = document.createElement("dd");
          dd.textContent = row.value;
          wrap.append(dt, dd);
          return wrap;
        })
      );
    }
  };

  render();
  // Um acerto por minuto mantém o estado correcto sem custo percetível.
  const timer = setInterval(render, 60_000);
  window.addEventListener("pagehide", () => clearInterval(timer), { once: true });
}
