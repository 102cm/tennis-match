const GAME_MINUTES = 30;
const MEMBERS_STORAGE_KEY = "tennisMembers";
const CLUBS_STORAGE_KEY = "tennisClubs";
const SELECTED_CLUB_STORAGE_KEY = "tennisSelectedClub";
const MEMBERS_BY_CLUB_STORAGE_KEY = "tennisMembersByClub";

const samplePlayers = [
  ["김민준", "M", 9, "18:00", "21:00"],
  ["이서준", "M", 8, "18:00", "21:00"],
  ["박도윤", "M", 7, "18:00", "20:30"],
  ["최지호", "M", 6, "18:30", "21:00"],
  ["정하준", "M", 5, "18:00", "21:00"],
  ["강시우", "M", 4, "19:00", "21:00"],
  ["윤지안", "M", 3, "18:00", "20:00"],
  ["장현우", "M", 2, "18:30", "21:00"],
  ["김서연", "F", 9, "18:00", "21:00"],
  ["이하윤", "F", 8, "18:00", "20:30"],
  ["박지유", "F", 7, "18:30", "21:00"],
  ["최서아", "F", 6, "18:00", "21:00"],
  ["정하은", "F", 5, "19:00", "21:00"],
  ["강지민", "F", 4, "18:00", "20:00"],
  ["윤채원", "F", 3, "18:30", "21:00"],
  ["장다은", "F", 2, "18:00", "21:00"],
];

const els = {
  form: document.querySelector("#scheduleForm"),
  clubGate: document.querySelector("#clubGate"),
  clubSelect: document.querySelector("#clubSelect"),
  newClubName: document.querySelector("#newClubName"),
  enterClubBtn: document.querySelector("#enterClubBtn"),
  addClubBtn: document.querySelector("#addClubBtn"),
  currentClubName: document.querySelector("#currentClubName"),
  switchClubBtn: document.querySelector("#switchClubBtn"),
  workspace: document.querySelector("#workspace"),
  workspaceResizer: document.querySelector("#workspaceResizer"),
  courtCount: document.querySelector("#courtCount"),
  startTime: document.querySelector("#startTime"),
  endTime: document.querySelector("#endTime"),
  applyTimeBtn: document.querySelector("#applyTimeBtn"),
  malePlayersBody: document.querySelector("#malePlayersBody"),
  femalePlayersBody: document.querySelector("#femalePlayersBody"),
  rowTemplate: document.querySelector("#playerRowTemplate"),
  addMaleBtn: document.querySelector("#addMaleBtn"),
  addFemaleBtn: document.querySelector("#addFemaleBtn"),
  sampleBtn: document.querySelector("#sampleBtn"),
  copyBtn: document.querySelector("#copyBtn"),
  shareImageBtn: document.querySelector("#shareImageBtn"),
  memberName: document.querySelector("#memberName"),
  memberGender: document.querySelector("#memberGender"),
  memberScore: document.querySelector("#memberScore"),
  saveMemberBtn: document.querySelector("#saveMemberBtn"),
  memberCount: document.querySelector("#memberCount"),
  membersBody: document.querySelector("#membersBody"),
  memberPicker: document.querySelector("#memberPicker"),
  memberPickerTitle: document.querySelector("#memberPickerTitle"),
  memberPickerBody: document.querySelector("#memberPickerBody"),
  memberPickerCloseBtn: document.querySelector("#memberPickerCloseBtn"),
  memberPickerBlankBtn: document.querySelector("#memberPickerBlankBtn"),
  memberPickerAddBtn: document.querySelector("#memberPickerAddBtn"),
  summaryGrid: document.querySelector("#summaryGrid"),
  scheduleOutput: document.querySelector("#scheduleOutput"),
  fairnessBody: document.querySelector("#fairnessBody"),
};

let latestText = "";
let latestSchedule = [];
let latestPlayers = [];
let latestCourtCount = 0;
let members = [];
let pickerGender = "M";
let clubs = [];
let currentClub = "";

function timeToMinutes(value) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(total) {
  const hours = String(Math.floor(total / 60)).padStart(2, "0");
  const minutes = String(total % 60).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function minutesToDuration(total) {
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  if (hours && minutes) return `${hours}시간${minutes}분`;
  if (hours) return `${hours}시간`;
  return `${minutes}분`;
}

function pairKey(a, b) {
  return [a.id, b.id].sort((x, y) => x - y).join("-");
}

function matchKey(players) {
  return players
    .map((player) => player.id)
    .sort((a, b) => a - b)
    .join("-");
}

function normalizeName(name) {
  return name.trim().replace(/\s+/g, " ");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function findMember(name) {
  const normalized = normalizeName(name);
  return members.find((member) => member.name === normalized);
}

function readJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
  } catch {
    return fallback;
  }
}

function memberStore() {
  return readJson(MEMBERS_BY_CLUB_STORAGE_KEY, {});
}

function saveMemberStore(store) {
  localStorage.setItem(MEMBERS_BY_CLUB_STORAGE_KEY, JSON.stringify(store));
}

function migrateLegacyMembers() {
  const legacyMembers = readJson(MEMBERS_STORAGE_KEY, []);
  const store = memberStore();
  const btgClub = "BTG";
  if (store["기본 클럽"]?.length && !store[btgClub]?.length) {
    store[btgClub] = store["기본 클럽"];
    delete store["기본 클럽"];
    clubs = clubs.filter((club) => club !== "기본 클럽");
  }
  if (legacyMembers.length && !store[btgClub]?.length) {
    store[btgClub] = legacyMembers;
  }
  if (!store[btgClub]?.length) return;
  saveMemberStore(store);
  clubs = clubs.includes(btgClub) ? clubs : [btgClub, ...clubs];
  localStorage.setItem(CLUBS_STORAGE_KEY, JSON.stringify(clubs));
  localStorage.removeItem(MEMBERS_STORAGE_KEY);
}

function loadClubs() {
  clubs = readJson(CLUBS_STORAGE_KEY, []);
  migrateLegacyMembers();
  renderClubSelect();
}

function renderClubSelect() {
  if (!clubs.length) {
    els.clubSelect.innerHTML = `<option value="">클럽을 추가해주세요</option>`;
    els.enterClubBtn.disabled = true;
    return;
  }
  els.enterClubBtn.disabled = false;
  els.clubSelect.innerHTML = clubs
    .map((club) => `<option value="${escapeHtml(club)}">${escapeHtml(club)}</option>`)
    .join("");
  const savedClub = localStorage.getItem(SELECTED_CLUB_STORAGE_KEY);
  if (savedClub && clubs.includes(savedClub)) {
    els.clubSelect.value = savedClub;
  }
}

function addClub() {
  const name = normalizeName(els.newClubName.value);
  if (!name) return;
  if (!clubs.includes(name)) {
    clubs.push(name);
    clubs.sort((a, b) => a.localeCompare(b, "ko"));
    localStorage.setItem(CLUBS_STORAGE_KEY, JSON.stringify(clubs));
  }
  els.newClubName.value = "";
  renderClubSelect();
  els.clubSelect.value = name;
}

function clearParticipantsAndResults() {
  els.malePlayersBody.replaceChildren();
  els.femalePlayersBody.replaceChildren();
  els.summaryGrid.innerHTML = "";
  els.fairnessBody.innerHTML = "";
  els.scheduleOutput.innerHTML = `<div class="empty-state">참가자를 선택한 뒤 대진표를 생성해주세요.</div>`;
  latestText = "";
  latestSchedule = [];
  latestPlayers = [];
  latestCourtCount = 0;
  updateRosterNumbers();
}

function selectClub(name) {
  if (!name || !clubs.includes(name)) return;
  currentClub = name;
  localStorage.setItem(SELECTED_CLUB_STORAGE_KEY, currentClub);
  els.currentClubName.textContent = currentClub;
  els.clubGate.hidden = true;
  loadMembers();
  clearParticipantsAndResults();
}

function showClubGate() {
  renderClubSelect();
  els.clubGate.hidden = false;
}

function loadMembers() {
  const store = memberStore();
  members = currentClub ? store[currentClub] || [] : [];
  renderMembers();
}

function saveMembers() {
  if (!currentClub) return;
  const store = memberStore();
  store[currentClub] = members;
  saveMemberStore(store);
  renderMembers();
}

function renderMembers() {
  els.memberCount.textContent = `${members.length}명`;
  els.membersBody.innerHTML = [...members]
    .sort((a, b) => a.name.localeCompare(b.name, "ko"))
    .map(
      (member) => `
        <tr>
          <td>${escapeHtml(member.name)}</td>
          <td>${member.gender === "M" ? "남" : "여"}</td>
          <td>${member.score}</td>
          <td><button class="remove-btn member-remove-btn" type="button" data-member-name="${escapeHtml(member.name)}" title="삭제">×</button></td>
        </tr>
      `,
    )
    .join("");
  if (!els.memberPicker.hidden) renderMemberPicker();
}

function saveMemberFromForm() {
  const name = normalizeName(els.memberName.value);
  const score = Number(els.memberScore.value);
  if (!name || score < 1 || score > 10) return;

  const nextMember = { name, gender: els.memberGender.value, score };
  const existingIndex = members.findIndex((member) => member.name === name);
  if (existingIndex >= 0) {
    members[existingIndex] = nextMember;
  } else {
    members.push(nextMember);
  }
  els.memberName.value = "";
  els.memberScore.value = "5";
  saveMembers();
  autofillAllParticipantScores();
}

function applyMemberToRow(row) {
  const member = findMember(row.querySelector(".player-name").value);
  if (!member) return;
  row.querySelector(".player-score").value = member.score;
}

function autofillAllParticipantScores() {
  [...document.querySelectorAll("#malePlayersBody tr, #femalePlayersBody tr")].forEach(applyMemberToRow);
}

function participantNamesByGender(gender) {
  const body = gender === "M" ? els.malePlayersBody : els.femalePlayersBody;
  return new Set([...body.querySelectorAll(".player-name")].map((input) => normalizeName(input.value)).filter(Boolean));
}

function openMemberPicker(gender) {
  pickerGender = gender;
  els.memberPickerTitle.textContent = gender === "M" ? "남자 회원 선택" : "여자 회원 선택";
  renderMemberPicker();
  els.memberPicker.hidden = false;
}

function closeMemberPicker() {
  els.memberPicker.hidden = true;
}

function renderMemberPicker() {
  const selectedNames = participantNamesByGender(pickerGender);
  const filteredMembers = members
    .filter((member) => member.gender === pickerGender)
    .sort((a, b) => a.name.localeCompare(b.name, "ko"));

  if (!filteredMembers.length) {
    els.memberPickerBody.innerHTML = `
      <tr>
        <td colspan="4" class="empty-cell">저장된 ${pickerGender === "M" ? "남자" : "여자"} 회원이 없습니다.</td>
      </tr>
    `;
    return;
  }

  els.memberPickerBody.innerHTML = filteredMembers
    .map((member) => {
      const alreadyAdded = selectedNames.has(member.name);
      return `
        <tr>
          <td>
            <input class="member-picker-check" type="checkbox" value="${escapeHtml(member.name)}" ${alreadyAdded ? "disabled" : ""} />
          </td>
          <td>${escapeHtml(member.name)}</td>
          <td>${member.score}</td>
          <td>${alreadyAdded ? "추가됨" : "대기"}</td>
        </tr>
      `;
    })
    .join("");
}

function addSelectedMembersToRoster() {
  const checkedBoxes = [...els.memberPickerBody.querySelectorAll(".member-picker-check:checked")];
  checkedBoxes.forEach((checkbox) => {
    const member = findMember(checkbox.value);
    if (!member) return;
    addPlayerRow(pickerGender, [member.name, pickerGender, member.score, els.startTime.value, els.endTime.value]);
  });
  closeMemberPicker();
  generate();
}

function addPlayerRow(gender, player = ["", gender, 5, els.startTime.value, els.endTime.value]) {
  const row = els.rowTemplate.content.firstElementChild.cloneNode(true);
  const [name, , score, start, end] = player;
  row.querySelector(".player-name").value = name;
  row.querySelector(".player-score").value = score;
  row.querySelector(".player-start").value = start || els.startTime.value;
  row.querySelector(".player-end").value = end || els.endTime.value;
  row.querySelector(".player-name").addEventListener("input", () => applyMemberToRow(row));
  row.querySelector(".player-name").addEventListener("change", () => applyMemberToRow(row));
  row.querySelector(".remove-btn").addEventListener("click", () => {
    row.remove();
    updateRosterNumbers();
  });
  row.dataset.gender = gender;
  const target = gender === "M" ? els.malePlayersBody : els.femalePlayersBody;
  target.append(row);
  updateRosterNumbers();
}

function loadSample() {
  els.malePlayersBody.replaceChildren();
  els.femalePlayersBody.replaceChildren();
  samplePlayers.forEach((player) => addPlayerRow(player[1], player));
  updateRosterNumbers();
}

function updateRosterNumbers() {
  [
    [els.malePlayersBody, "남자 명단"],
    [els.femalePlayersBody, "여자 명단"],
  ].forEach(([body, label]) => {
    const rows = [...body.querySelectorAll("tr")];
    rows.forEach((row, index) => {
      row.querySelector(".row-no").textContent = index + 1;
    });
    const heading = body.closest(".roster-panel").querySelector("h3");
    heading.innerHTML = `${label} <span class="roster-count">${rows.length}명</span>`;
  });
}

function applyTimeToAllPlayers() {
  [...document.querySelectorAll(".player-start")].forEach((input) => {
    input.value = els.startTime.value;
  });
  [...document.querySelectorAll(".player-end")].forEach((input) => {
    input.value = els.endTime.value;
  });
}

function collectPlayers() {
  const rows = [
    ...[...els.malePlayersBody.querySelectorAll("tr")].map((row) => ({ row, gender: "M" })),
    ...[...els.femalePlayersBody.querySelectorAll("tr")].map((row) => ({ row, gender: "F" })),
  ];

  return rows
    .map(({ row, gender }, index) => ({
      id: index + 1,
      name: row.querySelector(".player-name").value.trim() || `참가자${index + 1}`,
      gender,
      score: Number(row.querySelector(".player-score").value),
      start: timeToMinutes(row.querySelector(".player-start").value),
      end: timeToMinutes(row.querySelector(".player-end").value),
      games: 0,
      availableSlots: 0,
    }))
    .filter((player) => player.end > player.start && player.score >= 1 && player.score <= 10);
}

function setInputWidth(width) {
  const shellWidth = els.workspace.getBoundingClientRect().width;
  const maxWidth = Math.max(420, shellWidth - 560);
  const nextWidth = Math.min(Math.max(width, 420), maxWidth);
  els.workspace.style.setProperty("--input-width", `${nextWidth}px`);
  localStorage.setItem("tennisInputWidth", String(Math.round(nextWidth)));
}

function setupWorkspaceResizer() {
  const savedWidth = Number(localStorage.getItem("tennisInputWidth"));
  if (savedWidth) setInputWidth(savedWidth);

  let dragging = false;
  const move = (event) => {
    if (!dragging) return;
    const left = els.workspace.getBoundingClientRect().left;
    setInputWidth(event.clientX - left);
  };
  const stop = () => {
    dragging = false;
    document.body.style.userSelect = "";
  };

  els.workspaceResizer.addEventListener("pointerdown", (event) => {
    dragging = true;
    document.body.style.userSelect = "none";
    els.workspaceResizer.setPointerCapture(event.pointerId);
  });
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", stop);
  window.addEventListener("resize", () => {
    const current = Number(localStorage.getItem("tennisInputWidth")) || 520;
    setInputWidth(current);
  });
  els.workspaceResizer.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const current = Number(localStorage.getItem("tennisInputWidth")) || 520;
    setInputWidth(current + (event.key === "ArrowRight" ? 32 : -32));
  });
}

function buildSlots(start, end) {
  const slots = [];
  for (let t = start; t + GAME_MINUTES <= end; t += GAME_MINUTES) {
    slots.push({ start: t, end: t + GAME_MINUTES });
  }
  return slots;
}

function isAvailable(player, slot) {
  return player.start <= slot.start && player.end >= slot.end;
}

function combo4(players) {
  const combos = [];
  for (let a = 0; a < players.length - 3; a += 1) {
    for (let b = a + 1; b < players.length - 2; b += 1) {
      for (let c = b + 1; c < players.length - 1; c += 1) {
        for (let d = c + 1; d < players.length; d += 1) {
          combos.push([players[a], players[b], players[c], players[d]]);
        }
      }
    }
  }
  return combos;
}

function teamSplits(group) {
  const [a, b, c, d] = group;
  return [
    [
      [a, b],
      [c, d],
    ],
    [
      [a, c],
      [b, d],
    ],
    [
      [a, d],
      [b, c],
    ],
  ];
}

function classifyMatch(group) {
  const men = group.filter((player) => player.gender === "M").length;
  if (men === 4) return "남자복식";
  if (men === 0) return "여자복식";
  if (men === 2) return "혼합복식";
  return "혼성보정";
}

function displayMatchType(type) {
  return type === "혼성보정" ? "혼합복식" : type;
}

function teamType(team) {
  return team.map((player) => player.gender).sort().join("");
}

function strengthBand(group) {
  const scores = group.map((player) => player.score).sort((a, b) => b - a);
  const spread = scores[0] - scores[3];
  const avg = scores.reduce((sum, score) => sum + score, 0) / 4;
  if (avg >= 7 && spread <= 3) return "상위권 맞대결";
  if (spread >= 5) return "상하 조합";
  if (spread <= 2) return "동수준 매치";
  return "균형 조합";
}

function canMakeGenderDoubles(players, gender) {
  return players.filter((player) => player.gender === gender).length >= 4;
}

function typePriority(type, available) {
  const canMakeMen = canMakeGenderDoubles(available, "M");
  const canMakeWomen = canMakeGenderDoubles(available, "F");
  if (type === "남자복식") return 85;
  if (type === "여자복식") return 85;
  if (type === "혼합복식") return canMakeMen || canMakeWomen ? -95 : 8;
  return canMakeMen || canMakeWomen ? -130 : -18;
}

function buildCandidates(available, state, mixedTargetRatio, slot) {
  const candidates = [];
  const groups = combo4(available);
  for (const group of groups) {
    const type = classifyMatch(group);
    for (const [teamA, teamB] of teamSplits(group)) {
      const teamAScore = teamA[0].score + teamA[1].score;
      const teamBScore = teamB[0].score + teamB[1].score;
      const repeatedPartners =
        (state.partners.get(pairKey(teamA[0], teamA[1])) || 0) +
        (state.partners.get(pairKey(teamB[0], teamB[1])) || 0);
      const fairnessNeed = group.reduce((sum, player) => {
        const expected = player.availableSlots ? state.totalAssigned / state.totalAvailability : 0;
        const actual = player.availableSlots ? player.games / player.availableSlots : 0;
        return sum + Math.max(0, expected - actual);
      }, 0);
      const typeCounts = state.typeCounts;
      const mixedRatio = state.totalMatches ? typeCounts["혼합복식"] / state.totalMatches : 0;
      const mixedPenalty = type === "혼합복식" && mixedRatio > mixedTargetRatio ? 35 : 0;
      const irregularPenalty = type === "혼성보정" ? 35 : 0;
      const sameTeamPenalty =
        type === "혼합복식" && (teamType(teamA) !== "FM" || teamType(teamB) !== "FM") ? 7 : 0;
      const pairRepeatPenalty = repeatedPartners * 5;
      const repeatMatchPenalty = state.matches.has(matchKey(group)) ? 8 : 0;
      const playerLoadPenalty = group.reduce((sum, player) => sum + player.games * 0.7, 0);
      const scoreGap = Math.abs(teamAScore - teamBScore);
      const varietyBonus = state.bandCounts[strengthBand(group)] < Math.max(...Object.values(state.bandCounts)) ? 1.5 : 0;
      const availabilityUrgency = group.reduce((sum, player) => {
        const remainingSlots = Math.max(1, Math.floor((player.end - slot.start) / GAME_MINUTES));
        return sum + 1 / remainingSlots + 1 / Math.max(1, player.availableSlots);
      }, 0);
      const previousWaiterCount = group.filter((player) => state.previousWaiting.has(player.id)).length;
      const typeBonus =
        type !== "혼합복식" && state.typeCounts[type] <= Math.min(state.typeCounts["남자복식"], state.typeCounts["여자복식"])
          ? 1.25
          : 0;
      const doublesPriority = typePriority(type, available);

      candidates.push({
        type,
        band: strengthBand(group),
        teamA,
        teamB,
        group,
        scoreGap,
        sortScore:
          fairnessNeed * 22 +
          previousWaiterCount * 120 +
          availabilityUrgency * 8 +
          doublesPriority +
          varietyBonus +
          typeBonus -
          scoreGap * 3 -
          mixedPenalty -
          irregularPenalty -
          sameTeamPenalty -
          pairRepeatPenalty -
          repeatMatchPenalty -
          playerLoadPenalty,
      });
    }
  }
  return candidates.sort((a, b) => b.sortScore - a.sortScore || a.scoreGap - b.scoreGap);
}

function createSchedule(courtCount, slots, players) {
  const state = {
    totalAssigned: 0,
    totalAvailability: players.reduce((sum, player) => sum + player.availableSlots, 0),
    totalMatches: 0,
    typeCounts: { 남자복식: 0, 여자복식: 0, 혼합복식: 0, 혼성보정: 0 },
    bandCounts: { "상위권 맞대결": 0, "상하 조합": 0, "동수준 매치": 0, "균형 조합": 0 },
    partners: new Map(),
    matches: new Set(),
    previousWaiting: new Set(),
  };
  const mixedTargetRatio = 0.3;

  return slots.map((slot) => {
    const available = players.filter((player) => isAvailable(player, slot));
    const used = new Set();
    const matches = [];

    for (let court = 1; court <= courtCount; court += 1) {
      const pool = available.filter((player) => !used.has(player.id));
      if (pool.length < 4) break;
      const [candidate] = buildCandidates(pool, state, mixedTargetRatio, slot);
      if (!candidate) break;

      candidate.group.forEach((player) => {
        used.add(player.id);
        player.games += 1;
      });
      state.totalAssigned += candidate.group.length;
      state.totalMatches += 1;
      state.typeCounts[candidate.type] += 1;
      state.bandCounts[candidate.band] += 1;
      state.partners.set(pairKey(candidate.teamA[0], candidate.teamA[1]), (state.partners.get(pairKey(candidate.teamA[0], candidate.teamA[1])) || 0) + 1);
      state.partners.set(pairKey(candidate.teamB[0], candidate.teamB[1]), (state.partners.get(pairKey(candidate.teamB[0], candidate.teamB[1])) || 0) + 1);
      state.matches.add(matchKey(candidate.group));

      matches.push({ court, ...candidate });
    }

    const waiting = available.filter((player) => !used.has(player.id));
    state.previousWaiting = new Set(waiting.map((player) => player.id));
    return { slot, available, waiting, matches };
  });
}

function renderSummary(slots, courtCount, players, schedule) {
  const matchCount = schedule.reduce((sum, slot) => sum + slot.matches.length, 0);
  const possibleCourts = slots.length * courtCount;
  const men = players.filter((player) => player.gender === "M").length;
  const women = players.filter((player) => player.gender === "F").length;
  const typeCounts = schedule.reduce(
    (counts, entry) => {
      entry.matches.forEach((match) => {
        const type = displayMatchType(match.type);
        counts[type] = (counts[type] || 0) + 1;
      });
      return counts;
    },
    { 남자복식: 0, 여자복식: 0, 혼합복식: 0 },
  );
  const data = [
    ["최대 경기수", `${possibleCourts}경기`],
    ["총 참가 인원", `${players.length}명 (남 ${men}, 여 ${women})`],
    ["남복 경기 수", `${typeCounts["남자복식"] || 0}경기`],
    ["여복 경기 수", `${typeCounts["여자복식"] || 0}경기`],
    ["혼복 경기 수", `${typeCounts["혼합복식"] || 0}경기`],
  ];
  els.summaryGrid.innerHTML = data.map(([label, value]) => `<div class="summary-card"><span>${label}</span><strong>${value}</strong></div>`).join("");
}

function playerText(player) {
  return `${player.name}(${player.gender === "M" ? "남" : "여"}, ${player.score})`;
}

function teamText(team) {
  return team.map(playerText).join(" / ");
}

function renderSchedule(schedule) {
  if (!schedule.length) {
    els.scheduleOutput.innerHTML = `<div class="empty-state">운영 시간이 30분 이상이어야 합니다.</div>`;
    return;
  }

  els.scheduleOutput.innerHTML = schedule
    .map((entry) => {
      const waiting = entry.waiting.map((player) => player.name).join(", ") || "없음";
      const cards = entry.matches
        .map(
          (match) => `
            <article class="match-card">
              <div class="match-meta">
                <span>코트 ${match.court}</span>
                <span>${match.type} · ${match.band}</span>
              </div>
              <div class="team-line">
                <strong>${teamText(match.teamA)}</strong>
                <span class="team-score">합산 ${match.teamA[0].score + match.teamA[1].score}점</span>
              </div>
              <div class="vs">VS</div>
              <div class="team-line">
                <strong>${teamText(match.teamB)}</strong>
                <span class="team-score">합산 ${match.teamB[0].score + match.teamB[1].score}점 · 차이 ${match.scoreGap}점</span>
              </div>
            </article>
          `,
        )
        .join("");
      const emptyCourts = entry.matches.length ? "" : `<p class="empty-state">배정 가능한 4인 조합이 없습니다.</p>`;
      return `
        <section class="slot-block">
          <div class="slot-head">
            <strong>${minutesToTime(entry.slot.start)}~${minutesToTime(entry.slot.end)}</strong>
            <div class="waiting">대기: ${waiting}</div>
          </div>
          <div class="court-grid">${cards}${emptyCourts}</div>
        </section>
      `;
    })
    .join("");
}

function renderFairness(players) {
  els.fairnessBody.innerHTML = [...players]
    .sort((a, b) => b.games - a.games || b.availableSlots - a.availableSlots)
    .map((player) => {
      const ratio = player.availableSlots ? `${Math.round((player.games / player.availableSlots) * 100)}%` : "0%";
      return `
        <tr>
          <td>${player.name}</td>
          <td>${player.gender === "M" ? "남" : "여"}</td>
          <td>${player.score}</td>
          <td>${minutesToDuration(player.availableSlots * GAME_MINUTES)}</td>
          <td>${player.games}</td>
          <td>${ratio}</td>
        </tr>
      `;
    })
    .join("");
}

function makePlainText(schedule) {
  return schedule
    .map((entry) => {
      const header = `[${minutesToTime(entry.slot.start)}~${minutesToTime(entry.slot.end)}]`;
      const matches = entry.matches
        .map((match) => `코트 ${match.court}: ${teamText(match.teamA)} vs ${teamText(match.teamB)} (${match.type}, 점수차 ${match.scoreGap})`)
        .join("\n");
      const waiting = `대기: ${entry.waiting.map((player) => player.name).join(", ") || "없음"}`;
      return `${header}\n${matches || "배정 없음"}\n${waiting}`;
    })
    .join("\n\n");
}

function matchShareText(match) {
  const teamA = match.teamA.map((player) => player.name).join(" / ");
  const teamB = match.teamB.map((player) => player.name).join(" / ");
  return [`[${displayMatchType(match.type)}]`, `${teamA}`, `vs ${teamB}`];
}

function drawWrappedText(ctx, text, x, y, maxWidth, lineHeight, maxLines = 4) {
  const words = text.split(" ");
  const lines = [];
  let line = "";
  words.forEach((word) => {
    const testLine = line ? `${line} ${word}` : word;
    if (ctx.measureText(testLine).width <= maxWidth) {
      line = testLine;
      return;
    }
    if (line) lines.push(line);
    line = word;
  });
  if (line) lines.push(line);

  lines.slice(0, maxLines).forEach((item, index) => {
    const suffix = index === maxLines - 1 && lines.length > maxLines ? "..." : "";
    ctx.fillText(`${item}${suffix}`, x, y + index * lineHeight);
  });
  return Math.min(lines.length, maxLines) * lineHeight;
}

function downloadShareImage() {
  if (!latestSchedule.length || !latestCourtCount) return;

  const margin = 36;
  const timeWidth = 132;
  const courtWidth = 245;
  const waitingWidth = 260;
  const headerHeight = 118;
  const tableHeaderHeight = 42;
  const rowHeight = 116;
  const width = margin * 2 + timeWidth + courtWidth * latestCourtCount + waitingWidth;
  const height = margin * 2 + headerHeight + tableHeaderHeight + rowHeight * latestSchedule.length;
  const canvas = document.createElement("canvas");
  const scale = 2;
  canvas.width = width * scale;
  canvas.height = height * scale;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  const ctx = canvas.getContext("2d");
  ctx.scale(scale, scale);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  const typeCounts = latestSchedule.reduce(
    (counts, entry) => {
      entry.matches.forEach((match) => {
        const type = displayMatchType(match.type);
        counts[type] = (counts[type] || 0) + 1;
      });
      return counts;
    },
    { 남자복식: 0, 여자복식: 0, 혼합복식: 0 },
  );
  const men = latestPlayers.filter((player) => player.gender === "M").length;
  const women = latestPlayers.filter((player) => player.gender === "F").length;

  ctx.fillStyle = "#18201c";
  ctx.font = "700 30px Malgun Gothic, Segoe UI, sans-serif";
  ctx.fillText("테니스 복식 대진표", margin, margin + 32);
  ctx.font = "500 16px Malgun Gothic, Segoe UI, sans-serif";
  ctx.fillStyle = "#66736c";
  ctx.fillText(
    `참가 ${latestPlayers.length}명 (남 ${men}, 여 ${women}) · 남복 ${typeCounts["남자복식"] || 0} · 여복 ${typeCounts["여자복식"] || 0} · 혼복 ${typeCounts["혼합복식"] || 0}`,
    margin,
    margin + 66,
  );

  const startY = margin + headerHeight;
  ctx.fillStyle = "#19735f";
  ctx.fillRect(margin, startY, width - margin * 2, tableHeaderHeight);
  ctx.fillStyle = "#ffffff";
  ctx.font = "700 15px Malgun Gothic, Segoe UI, sans-serif";
  ctx.fillText("시간", margin + 14, startY + 27);
  for (let court = 1; court <= latestCourtCount; court += 1) {
    ctx.fillText(`코트 ${court}`, margin + timeWidth + courtWidth * (court - 1) + 14, startY + 27);
  }
  ctx.fillText("대기", margin + timeWidth + courtWidth * latestCourtCount + 14, startY + 27);

  latestSchedule.forEach((entry, rowIndex) => {
    const y = startY + tableHeaderHeight + rowHeight * rowIndex;
    ctx.fillStyle = rowIndex % 2 ? "#fbfcfa" : "#f4f7f5";
    ctx.fillRect(margin, y, width - margin * 2, rowHeight);
    ctx.strokeStyle = "#dce3df";
    ctx.strokeRect(margin, y, width - margin * 2, rowHeight);

    ctx.fillStyle = "#18201c";
    ctx.font = "700 15px Malgun Gothic, Segoe UI, sans-serif";
    ctx.fillText(`${minutesToTime(entry.slot.start)}~${minutesToTime(entry.slot.end)}`, margin + 14, y + 32);

    for (let court = 1; court <= latestCourtCount; court += 1) {
      const x = margin + timeWidth + courtWidth * (court - 1);
      ctx.strokeStyle = "#dce3df";
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + rowHeight);
      ctx.stroke();
      const match = entry.matches.find((item) => item.court === court);
      ctx.fillStyle = "#18201c";
      ctx.font = "700 13px Malgun Gothic, Segoe UI, sans-serif";
      const lines = match ? matchShareText(match) : ["-"];
      lines.forEach((line, index) => {
        ctx.fillText(line, x + 14, y + 25 + index * 24);
      });
    }

    const waitingX = margin + timeWidth + courtWidth * latestCourtCount;
    ctx.strokeStyle = "#dce3df";
    ctx.beginPath();
    ctx.moveTo(waitingX, y);
    ctx.lineTo(waitingX, y + rowHeight);
    ctx.stroke();
    ctx.fillStyle = "#18201c";
    ctx.font = "600 13px Malgun Gothic, Segoe UI, sans-serif";
    drawWrappedText(ctx, entry.waiting.map((player) => player.name).join(", ") || "없음", waitingX + 14, y + 28, waitingWidth - 28, 22, 4);
  });

  const link = document.createElement("a");
  link.download = `tennis-schedule-${els.startTime.value.replace(":", "")}-${els.endTime.value.replace(":", "")}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

function generate(event) {
  event?.preventDefault();
  const start = timeToMinutes(els.startTime.value);
  const end = timeToMinutes(els.endTime.value);
  const courtCount = Number(els.courtCount.value);
  const slots = buildSlots(start, end);
  const players = collectPlayers();
  players.forEach((player) => {
    player.availableSlots = slots.filter((slot) => isAvailable(player, slot)).length;
  });

  if (end <= start || courtCount < 1 || players.length < 4) {
    els.scheduleOutput.innerHTML = `<div class="empty-state notice">운영 시간, 코트 수, 참가자 4명 이상을 확인해주세요.</div>`;
    els.summaryGrid.innerHTML = "";
    els.fairnessBody.innerHTML = "";
    latestText = "";
    latestSchedule = [];
    latestPlayers = [];
    latestCourtCount = 0;
    return;
  }

  const schedule = createSchedule(courtCount, slots, players);
  latestText = makePlainText(schedule);
  latestSchedule = schedule;
  latestPlayers = players;
  latestCourtCount = courtCount;
  renderSummary(slots, courtCount, players, schedule);
  renderSchedule(schedule);
  renderFairness(players);
}

els.addMaleBtn.addEventListener("click", () => openMemberPicker("M"));
els.addFemaleBtn.addEventListener("click", () => openMemberPicker("F"));
els.enterClubBtn.addEventListener("click", () => selectClub(els.clubSelect.value));
els.addClubBtn.addEventListener("click", addClub);
els.newClubName.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;
  event.preventDefault();
  addClub();
});
els.switchClubBtn.addEventListener("click", showClubGate);
els.applyTimeBtn.addEventListener("click", () => {
  applyTimeToAllPlayers();
  generate();
});
els.saveMemberBtn.addEventListener("click", saveMemberFromForm);
els.memberName.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;
  event.preventDefault();
  saveMemberFromForm();
});
els.membersBody.addEventListener("click", (event) => {
  const button = event.target.closest(".member-remove-btn");
  if (!button) return;
  members = members.filter((member) => member.name !== button.dataset.memberName);
  saveMembers();
});
els.memberPickerCloseBtn.addEventListener("click", closeMemberPicker);
els.memberPicker.addEventListener("click", (event) => {
  if (event.target !== els.memberPicker) return;
  closeMemberPicker();
});
els.memberPickerBlankBtn.addEventListener("click", () => {
  addPlayerRow(pickerGender);
  closeMemberPicker();
});
els.memberPickerAddBtn.addEventListener("click", addSelectedMembersToRoster);
window.addEventListener("keydown", (event) => {
  if (event.key !== "Escape" || els.memberPicker.hidden) return;
  closeMemberPicker();
});
els.sampleBtn.addEventListener("click", () => {
  loadSample();
  generate();
});
els.form.addEventListener("submit", generate);
els.copyBtn.addEventListener("click", async () => {
  if (!latestText) return;
  await navigator.clipboard.writeText(latestText);
  els.copyBtn.textContent = "복사됨";
  window.setTimeout(() => {
    els.copyBtn.textContent = "복사";
  }, 1200);
});
els.shareImageBtn.addEventListener("click", downloadShareImage);

setupWorkspaceResizer();
loadClubs();
updateRosterNumbers();
els.scheduleOutput.innerHTML = `<div class="empty-state">클럽을 선택한 뒤 참가자를 추가해주세요.</div>`;
