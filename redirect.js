(function () {
  const TIME_ZONE = 'America/Los_Angeles';
  const OVERRIDES_PATH = 'tournament-overrides.json';
  const THURSDAY_INDEX = 4;
  const WEEKDAY_INDEX = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  const api = {
    TIME_ZONE,
    OVERRIDES_PATH,
    getPacificDateParts,
    formatPacificDateKey,
    getApplicableTournamentThursday,
    getThursdayOrdinal,
    generateDigitalPoolDateSlug,
    isLadiesNightEightBallMonth,
    buildNormalTournamentUrl,
    validateOverrideEntry,
    evaluateTournamentDecision,
    loadTournamentOverrides,
    startRedirectFlow,
  };

  globalThis.CivilizedPoolRedirect = api;

  function pad2(value) {
    return String(value).padStart(2, '0');
  }

  function getPacificDateParts(date = new Date()) {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: TIME_ZONE,
      weekday: 'short',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    });

    const parts = formatter.formatToParts(date);
    const values = {};

    for (const part of parts) {
      if (part.type !== 'literal') {
        values[part.type] = part.value;
      }
    }

    const weekdayIndex = WEEKDAY_INDEX[values.weekday];

    if (weekdayIndex === undefined) {
      throw new Error(`Unexpected weekday value: ${values.weekday}`);
    }

    return {
      year: Number(values.year),
      month: Number(values.month),
      day: Number(values.day),
      weekdayIndex,
    };
  }

  function formatPacificDateKey(dateParts) {
    return `${dateParts.year}-${pad2(dateParts.month)}-${pad2(dateParts.day)}`;
  }

  function addPacificCalendarDays(dateParts, daysToAdd) {
    const shiftedUtc = new Date(Date.UTC(dateParts.year, dateParts.month - 1, dateParts.day, 12));
    shiftedUtc.setUTCDate(shiftedUtc.getUTCDate() + daysToAdd);
    return getPacificDateParts(shiftedUtc);
  }

  function getApplicableTournamentThursday(date = new Date()) {
    const pacificToday = getPacificDateParts(date);
    const daysUntilThursday = (THURSDAY_INDEX - pacificToday.weekdayIndex + 7) % 7;
    return addPacificCalendarDays(pacificToday, daysUntilThursday);
  }

  function getThursdayOrdinal(dateParts) {
    return Math.floor((dateParts.day - 1) / 7) + 1;
  }

  function generateDigitalPoolDateSlug(dateParts) {
    return `${dateParts.month}${dateParts.day}${dateParts.year}`;
  }

  function isLadiesNightEightBallMonth(dateParts) {
    return dateParts.month % 2 === 1;
  }

  function buildNormalTournamentUrl(dateParts) {
    if (dateParts.weekdayIndex !== THURSDAY_INDEX) {
      return null;
    }

    const nthThursday = getThursdayOrdinal(dateParts);
    const slug = generateDigitalPoolDateSlug(dateParts);

    switch (nthThursday) {
      case 1:
        return `https://digitalpool.com/tournaments/rodders-first-thursday-8-ball-${slug}/overview`;
      case 2:
        return `https://digitalpool.com/tournaments/rodders-second-thursday-9-ball-${slug}/overview`;
      case 3:
        return `https://digitalpool.com/tournaments/rodders-third-thursday-ladies-night-${isLadiesNightEightBallMonth(dateParts) ? '8-ball' : '9-ball'}-${slug}/overview`;
      case 4:
        return `https://digitalpool.com/tournaments/rodders-fourth-thursday-8-and-9-ball-${slug}/overview`;
      default:
        return null;
    }
  }

  function isAbsoluteHttpsUrl(value) {
    if (typeof value !== 'string' || !value.trim()) {
      return false;
    }

    try {
      const parsed = new URL(value);
      return parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }

  function validateOverrideEntry(entry) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      return { valid: false, reason: 'override entry is not an object' };
    }

    const hasUrl = Object.prototype.hasOwnProperty.call(entry, 'url');
    const hasCancelled = Object.prototype.hasOwnProperty.call(entry, 'cancelled');
    const note = typeof entry.note === 'string' && entry.note.trim() ? entry.note.trim() : '';

    if (entry.cancelled === true) {
      if (hasUrl) {
        return { valid: false, reason: 'cancelled override must not include a url' };
      }

      return { valid: true, cancelled: true, note };
    }

    if (hasCancelled && entry.cancelled !== false) {
      return { valid: false, reason: 'cancelled must be true when provided' };
    }

    if (!hasUrl || !isAbsoluteHttpsUrl(entry.url)) {
      return { valid: false, reason: 'missing or invalid url' };
    }

    return { valid: true, cancelled: false, url: entry.url, note };
  }

  async function loadTournamentOverrides(overridesPath = OVERRIDES_PATH) {
    const response = await fetch(new URL(overridesPath, window.location.href), {
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`Could not load ${overridesPath}: ${response.status}`);
    }

    const data = await response.json();

    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      throw new Error('Overrides file did not contain an object');
    }

    return data;
  }

  function evaluateTournamentDecision({ now = new Date(), overrides = null } = {}) {
    const applicableThursday = getApplicableTournamentThursday(now);
    const tournamentDateKey = formatPacificDateKey(applicableThursday);
    const overrideEntry = overrides && Object.prototype.hasOwnProperty.call(overrides, tournamentDateKey)
      ? validateOverrideEntry(overrides[tournamentDateKey])
      : null;

    if (overrideEntry && !overrideEntry.valid) {
      return {
        status: 'fallback',
        tournamentDateKey,
        displayTitle: 'Tournament link coming soon.',
        displayLead: "We're getting this week's tournament signup link ready. Please check back shortly.",
        displayNote: '',
        debugReason: overrideEntry.reason,
      };
    }

    if (overrideEntry && overrideEntry.cancelled) {
      return {
        status: 'cancelled',
        tournamentDateKey,
        displayTitle: 'No tournament this week.',
        displayLead: 'This week has been marked as cancelled.',
        displayNote: overrideEntry.note || '',
        debugReason: 'cancelled override',
      };
    }

    if (overrideEntry && overrideEntry.url) {
      return {
        status: 'redirect',
        tournamentDateKey,
        url: overrideEntry.url,
        displayTitle: 'Redirecting to tournament signup...',
        displayLead: 'If you are not redirected automatically, use the button below.',
        displayNote: overrideEntry.note || '',
        debugReason: 'override url',
      };
    }

    const normalUrl = buildNormalTournamentUrl(applicableThursday);

    if (normalUrl) {
      return {
        status: 'redirect',
        tournamentDateKey,
        url: normalUrl,
        displayTitle: 'Redirecting to tournament signup...',
        displayLead: 'If you are not redirected automatically, use the button below.',
        displayNote: '',
        debugReason: 'generated url',
      };
    }

    return {
      status: 'fallback',
      tournamentDateKey,
      displayTitle: 'Tournament link coming soon.',
      displayLead: "We're getting this week's tournament signup link ready. Please check back shortly.",
      displayNote: '',
      debugReason: 'unhandled fifth Thursday',
    };
  }

  function getViewNodes() {
    return {
      title: document.getElementById('page-title'),
      lead: document.getElementById('page-lead'),
      action: document.getElementById('page-action'),
      note: document.getElementById('page-note'),
    };
  }

  function setViewContent({ title, lead, note, actionLabel, actionHref }) {
    const nodes = getViewNodes();
    if (nodes.title) {
      nodes.title.textContent = title;
    }
    if (nodes.lead) {
      nodes.lead.textContent = lead;
    }
    if (nodes.note) {
      nodes.note.textContent = note || '';
    }

    if (nodes.action) {
      nodes.action.textContent = '';

      if (actionLabel && actionHref) {
        const link = document.createElement('a');
        link.className = 'button';
        link.href = actionHref;
        link.textContent = actionLabel;
        nodes.action.appendChild(link);
        nodes.action.classList.add('is-visible');
      } else {
        nodes.action.classList.remove('is-visible');
      }
    }
  }

  function renderDecision(decision) {
    if (decision.status === 'redirect') {
      setViewContent({
        title: decision.displayTitle,
        lead: decision.displayLead,
        note: decision.displayNote,
        actionLabel: 'Continue to tournament signup',
        actionHref: decision.url,
      });
      return;
    }

    if (decision.status === 'cancelled') {
      setViewContent({
        title: decision.displayTitle,
        lead: decision.displayLead,
        note: decision.displayNote,
      });
      return;
    }

    setViewContent({
      title: decision.displayTitle,
      lead: decision.displayLead,
      note: decision.displayNote,
    });
  }

  function renderInitialState() {
    setViewContent({
      title: "Finding this week's tournament...",
      lead: 'Please wait while we look up the current Rodder\'s tournament signup link.',
      note: '',
    });
  }

  async function startRedirectFlow() {
    renderInitialState();

    try {
      const overrides = await loadTournamentOverrides();
      const decision = evaluateTournamentDecision({ overrides });

      renderDecision(decision);

      if (decision.status === 'redirect') {
        window.setTimeout(() => {
          window.location.replace(decision.url);
        }, 125);
      }
    } catch (error) {
      console.error('Civilized Pool redirect failed', error);
      setViewContent({
        title: 'Tournament link coming soon.',
        lead: "We're getting this week's tournament signup link ready. Please check back shortly.",
        note: '',
      });
    }
  }

  function shouldAutoStart() {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return false;
    }

    const path = window.location.pathname;
    return path === '/' || path.endsWith('/') || path.endsWith('/index.html');
  }

  if (typeof window !== 'undefined' && typeof document !== 'undefined' && shouldAutoStart()) {
    startRedirectFlow();
  }
})();
