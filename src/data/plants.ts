import type { LocationMeta, LogEntry, Plant } from '@/types/plant';

/** Base date used by the seed so the D-day math stays deterministic in dev. */
export const SEED_TODAY = '2026-04-21';

export const SEED_PLANTS: Plant[] = [
  { id: 'anth-waro',  name: '와로퀘아넘',   species: '안스리움 Waroqueanum',     location: '온실장', light: '밝은 간접광', humidity: '높음 70%+', waterCycle: 4,  fertCycle: 21, lastWater: '2026-04-19', lastFert: '2026-04-05', nextWater: '2026-04-23', note: '잎맥 벨벳감 유지 중. 토양 살짝 마르면 물', color: '#3a5a3a', mood: 'velvet' },
  { id: 'anth-dora',  name: '도라야끼 실버', species: '안스리움 Doraya Silver',   location: '온실장', light: '밝은 간접광', humidity: '높음 70%+', waterCycle: 4,  fertCycle: 21, lastWater: '2026-04-20', lastFert: '2026-04-08', nextWater: '2026-04-24', note: '새 잎 전개 중', color: '#4a6a4a', mood: 'silver' },
  { id: 'anth-clari', name: '클라리네비움', species: '안스리움 Clarinervium',    location: '온실장', light: '밝은 간접광', humidity: '높음',       waterCycle: 5,  fertCycle: 21, lastWater: '2026-04-17', lastFert: '2026-04-01', nextWater: '2026-04-22', note: '잎맥 선명. 건강', color: '#2d4a2d', mood: 'velvet' },
  { id: 'bluestar',   name: '블루스타 고사리', species: 'Phlebodium aureum',     location: '온실장', light: '반그늘',       humidity: '매우 높음',   waterCycle: 3,  fertCycle: 30, lastWater: '2026-04-20', lastFert: '2026-03-25', nextWater: '2026-04-23', note: '은청색 잎. 분무 자주', color: '#6a8aa0', mood: 'frond' },
  { id: 'cotton-fern',name: '솜사탕 고사리', species: "Nephrolepis 'Suzy Wong'", location: '온실장', light: '반그늘',       humidity: '매우 높음',   waterCycle: 3,  fertCycle: 30, lastWater: '2026-04-18', lastFert: '2026-03-28', nextWater: '2026-04-21', note: '곱슬잎 잘 자람', color: '#5a7a3a', mood: 'frond' },

  { id: 'flo-ghost',  name: '플로리다 고스트', species: '필로덴드론 Florida Ghost', location: '거실',   light: '밝은 간접광', humidity: '보통',       waterCycle: 7,  fertCycle: 14, lastWater: '2026-04-14', lastFert: '2026-04-07', nextWater: '2026-04-21', note: '흰 새잎 초록으로 변색 중', color: '#7a9a5a', mood: 'variegated' },
  { id: 'monstera',   name: '몬스테라',       species: 'Monstera deliciosa',      location: '거실',   light: '밝은 간접광', humidity: '보통',       waterCycle: 7,  fertCycle: 14, lastWater: '2026-04-16', lastFert: '2026-04-09', nextWater: '2026-04-23', note: '찢김 많은 큰 잎 3개', color: '#2d5a2d', mood: 'tropical' },
  { id: 'pachira',    name: '파키라 (삽목)', species: 'Pachira aquatica',          location: '베란다', light: '밝은 간접광', humidity: '보통',       waterCycle: 10, fertCycle: 30, lastWater: '2026-04-13', lastFert: '2026-04-01', nextWater: '2026-04-23', note: '뿌리 활착 완료. 성장 시작', color: '#4a6a3a', mood: 'tropical' },
  { id: 'bengal',     name: '뱅갈고무나무 (삽목)', species: 'Ficus benghalensis',  location: '베란다', light: '직사 괜찮음', humidity: '보통',       waterCycle: 10, fertCycle: 30, lastWater: '2026-04-15', lastFert: '2026-04-01', nextWater: '2026-04-25', note: '새 잎 2장 전개', color: '#5a6a3a', mood: 'tree' },
  { id: 'boston-var', name: '무늬 보스턴 고사리', species: "Nephrolepis 'Tiger'", location: '거실',   light: '반그늘',       humidity: '높음',       waterCycle: 4,  fertCycle: 30, lastWater: '2026-04-18', lastFert: '2026-04-03', nextWater: '2026-04-22', note: '분무 필요', color: '#6a8a4a', mood: 'frond' },
  { id: 'ivy-var',    name: '무늬 아이비',    species: 'Hedera helix variegata',  location: '거실',   light: '반그늘',       humidity: '보통',       waterCycle: 6,  fertCycle: 30, lastWater: '2026-04-16', lastFert: '2026-03-30', nextWater: '2026-04-22', note: '덩굴 길이 40cm', color: '#7a8a5a', mood: 'variegated' },
  { id: 'dischidia',  name: '디시디아 그린',  species: 'Dischidia nummularia',    location: '거실',   light: '밝은 간접광', humidity: '보통',       waterCycle: 10, fertCycle: 30, lastWater: '2026-04-14', lastFert: '2026-04-01', nextWater: '2026-04-24', note: '행잉. 통풍 중요', color: '#5a7a4a', mood: 'trailing' },

  { id: 'alo-black',  name: '블랙벨벳',       species: 'Alocasia reginula',        location: '거실',   light: '밝은 간접광', humidity: '높음',       waterCycle: 5,  fertCycle: 21, lastWater: '2026-04-18', lastFert: '2026-04-05', nextWater: '2026-04-23', note: '검은 벨벳 잎 3장', color: '#1a2a1a', mood: 'velvet' },
  { id: 'alo-maha',   name: '마하라니',       species: 'Alocasia Maharani',        location: '거실',   light: '밝은 간접광', humidity: '높음',       waterCycle: 5,  fertCycle: 21, lastWater: '2026-04-17', lastFert: '2026-04-03', nextWater: '2026-04-22', note: '두툼한 은회색 잎', color: '#5a6a6a', mood: 'velvet' },
  { id: 'alo-frydek', name: '무늬 프라이덱',  species: 'Alocasia Frydek Variegata',location: '온실장', light: '밝은 간접광', humidity: '높음 70%+', waterCycle: 5,  fertCycle: 21, lastWater: '2026-04-19', lastFert: '2026-04-07', nextWater: '2026-04-24', note: '무늬 안정. 컨디션 좋음', color: '#2d4a2d', mood: 'variegated' },
  { id: 'alo-jacq',   name: '잭클린',         species: 'Alocasia Jacklyn',         location: '거실',   light: '밝은 간접광', humidity: '높음',       waterCycle: 5,  fertCycle: 21, lastWater: '2026-04-16', lastFert: '2026-04-02', nextWater: '2026-04-21', note: '특이한 잎맥 패턴', color: '#3a5a3a', mood: 'velvet' },

  { id: 'lithops',    name: '리톱스',         species: 'Lithops spp.',             location: '베란다', light: '강한 직사광', humidity: '매우 낮음',   waterCycle: 30, fertCycle: 60, lastWater: '2026-04-05', lastFert: '2026-03-01', nextWater: '2026-05-05', note: '탈피기. 물 금지', color: '#a8987a', mood: 'succulent' },
  { id: 'manson',     name: '만손초',         species: 'Adromischus',              location: '베란다', light: '강한 직사광', humidity: '낮음',       waterCycle: 14, fertCycle: 60, lastWater: '2026-04-10', lastFert: '2026-03-10', nextWater: '2026-04-24', note: '토실토실', color: '#8a8a5a', mood: 'succulent' },
  { id: 'winter',     name: '월동자',         species: 'Crassula mesembryanthemoides', location: '베란다', light: '직사광', humidity: '낮음',   waterCycle: 14, fertCycle: 60, lastWater: '2026-04-08', lastFert: '2026-03-05', nextWater: '2026-04-22', note: '솜털 잎', color: '#9a9a7a', mood: 'succulent' },
  { id: 'senna',      name: '세나 메리디오날리스', species: 'Senna meridionalis',   location: '베란다', light: '직사광',       humidity: '낮음',       waterCycle: 10, fertCycle: 45, lastWater: '2026-04-12', lastFert: '2026-03-20', nextWater: '2026-04-22', note: '건강 상태 매우 양호', color: '#7a6a4a', mood: 'tree' },
  { id: 'agave',      name: '아가베 오테로이', species: 'Agave oteroi',            location: '베란다', light: '강한 직사광', humidity: '매우 낮음',   waterCycle: 21, fertCycle: 60, lastWater: '2026-04-01', lastFert: '2026-03-01', nextWater: '2026-04-22', note: '발아 후 성장 중. 뾰족한 잎 5장', color: '#6a7a5a', mood: 'succulent' },

  { id: 'pomegranate',name: '석류',           species: 'Punica granatum (실생)',   location: '베란다', light: '직사광',       humidity: '보통',       waterCycle: 5,  fertCycle: 45, lastWater: '2026-04-18', lastFert: '2026-04-01', nextWater: '2026-04-23', note: '씨앗 1개 발아. 생존 관찰 중', color: '#7a9a5a', mood: 'seedling' },
];

export const SEED_LOG: LogEntry[] = [
  { date: '2026-04-20', action: 'water', plantId: 'anth-dora',   note: '새 잎 전개 시작' },
  { date: '2026-04-20', action: 'water', plantId: 'bluestar',    note: '분무 함께' },
  { date: '2026-04-19', action: 'water', plantId: 'anth-waro',   note: '' },
  { date: '2026-04-19', action: 'water', plantId: 'alo-frydek',  note: '' },
  { date: '2026-04-18', action: 'water', plantId: 'cotton-fern', note: '' },
  { date: '2026-04-18', action: 'prune', plantId: 'ivy-var',     note: '긴 덩굴 정리 15cm' },
  { date: '2026-04-18', action: 'water', plantId: 'pomegranate', note: '조심스럽게 분무' },
  { date: '2026-04-17', action: 'water', plantId: 'anth-clari',  note: '' },
  { date: '2026-04-15', action: 'repot', plantId: 'monstera',    note: '한 치수 큰 분갈이. 수태믹스' },
  { date: '2026-04-14', action: 'fert',  plantId: 'flo-ghost',   note: '하이포넥스 1000배' },
  { date: '2026-04-10', action: 'water', plantId: 'manson',      note: '' },
  { date: '2026-04-05', action: 'water', plantId: 'lithops',     note: '살짝만 — 이후 단수' },
];

export const SEED_LOCATIONS: LocationMeta[] = [
  { id: '온실장', label: '온실장', sub: '높은 습도' },
  { id: '거실',   label: '거실',   sub: '밝은 간접광' },
  { id: '베란다', label: '베란다', sub: '직사광 / 환기' },
];
