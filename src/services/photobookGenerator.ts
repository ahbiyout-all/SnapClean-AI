import { db, PhotoRecord } from './db';
import { 
  PhotobookRecord, 
  PhotobookPage, 
  PhotobookPhoto, 
  PhotobookTheme, 
  PhotobookPageLayout,
  StoryTone,
  PhotobookChapter
} from '../types';
import { generatePhotobookStory, rewritePhotobookCaption, generateEventSummary, EventSummary } from './geminiService';

// Default themes metadata with refined editorial styling
export const PHOTOBOOK_THEMES: {
  id: PhotobookTheme;
  name: string;
  nameKo: string;
  description: string;
  descriptionKo: string;
  coverBg: string;
  pageBg: string;
  spineColor: string;
  fontClass: string;
  accentColor: string;
  ambientGlow: string;
}[] = [
  {
    id: 'classic-hardcover',
    name: 'Classic Hardcover',
    nameKo: '클래식 양장본',
    description: 'Timeless navy & gold foil lettering with archival matte paper feel',
    descriptionKo: '중후한 네이비 양장본과 금박 레터링, 아카이브 고급 용지 질감',
    coverBg: 'bg-linear-to-br from-slate-900 via-indigo-950 to-slate-950 text-amber-200 border-amber-500/30',
    pageBg: 'bg-[#faf7f2] text-slate-800',
    spineColor: '#1e1b4b',
    fontClass: 'font-serif',
    accentColor: '#d97706',
    ambientGlow: 'rgba(99, 102, 241, 0.25)',
  },
  {
    id: 'modern-magazine',
    name: 'Modern Magazine',
    nameKo: '모던 매거진',
    description: 'Swiss editorial style with clean asymmetric typography and sleek layouts',
    descriptionKo: '스위스 모더니즘과 킨포크 감성의 미니멀 타이포그래피',
    coverBg: 'bg-linear-to-br from-neutral-900 via-neutral-800 to-black text-white border-neutral-700',
    pageBg: 'bg-white text-neutral-900',
    spineColor: '#171717',
    fontClass: 'font-sans',
    accentColor: '#3b82f6',
    ambientGlow: 'rgba(59, 130, 246, 0.22)',
  },
  {
    id: 'vintage-film',
    name: 'Vintage Film',
    nameKo: '빈티지 필름',
    description: 'Warm analog grain, soft sepia borders, and nostalgic Polaroid memories',
    descriptionKo: '따뜻한 아날로그 그레인, 폴라로이드 프레임과 필름 감성',
    coverBg: 'bg-linear-to-br from-amber-950 via-stone-900 to-stone-950 text-amber-100 border-amber-700/40',
    pageBg: 'bg-[#f5ede0] text-stone-900',
    spineColor: '#451a03',
    fontClass: 'font-serif',
    accentColor: '#b45309',
    ambientGlow: 'rgba(217, 119, 6, 0.25)',
  },
  {
    id: 'art-gallery',
    name: 'Minimalist Artbook',
    nameKo: '미니멀 아트북',
    description: 'Museum-style generous white margins with restrained, contemplative captions',
    descriptionKo: '미술관 전시 도록 스타일의 여백의 미학과 정제된 캡션',
    coverBg: 'bg-linear-to-br from-zinc-900 via-zinc-950 to-black text-zinc-100 border-zinc-800',
    pageBg: 'bg-[#fcfcfc] text-zinc-900',
    spineColor: '#09090b',
    fontClass: 'font-sans',
    accentColor: '#10b981',
    ambientGlow: 'rgba(16, 185, 129, 0.2)',
  },
];

export const STORY_TONES: {
  id: StoryTone;
  labelKo: string;
  labelEn: string;
  descKo: string;
  iconName: string;
}[] = [
  {
    id: 'lyrical',
    labelKo: '서정적 감성',
    labelEn: 'Lyrical & Nostalgic',
    descKo: '계절감과 그리움, 마음 깊이 남겨둘 여운의 시적 에세이',
    iconName: 'Feather',
  },
  {
    id: 'travel',
    labelKo: '여행 탐험기',
    labelEn: 'Vibrant Travelogue',
    descKo: '낯선 길 위의 설렘, 새로운 풍경과 발견의 생생한 기록',
    iconName: 'Compass',
  },
  {
    id: 'family',
    labelKo: '따뜻한 가족 일기',
    labelEn: 'Warm Family Memoir',
    descKo: '함께 웃던 미소와 소박한 행복, 영원한 온기의 기록',
    iconName: 'Heart',
  },
  {
    id: 'minimal',
    labelKo: '미니멀 에디토리얼',
    labelEn: 'Minimal Editorial',
    descKo: '과장 없는 정제된 문장, 빛과 프레임 중심의 도록 스타일',
    iconName: 'Sparkles',
  },
  {
    id: 'nostalgic',
    labelKo: '아련한 그리움',
    labelEn: 'Nostalgic',
    descKo: '오래된 필름처럼 아련하고 따뜻한 추억의 깊이',
    iconName: 'History',
  },
  {
    id: 'professional',
    labelKo: '프로페셔널 에디션',
    labelEn: 'Professional',
    descKo: '정갈하고 객관적인, 잡지 기사 같은 세련된 기록',
    iconName: 'Briefcase',
  },
  {
    id: 'cinematic',
    labelKo: '시네마틱 서사',
    labelEn: 'Cinematic',
    descKo: '한 편의 영화처럼 강렬하고 극적인 순간의 재구성',
    iconName: 'Film',
  },
  {
    id: 'minimalist',
    labelKo: '극강의 미니멀리즘',
    labelEn: 'Minimalist',
    descKo: '모든 수식을 걷어낸, 여백과 본질에만 집중하는 시선',
    iconName: 'Square',
  },
];

// Helper to format date cleanly
export function formatDate(timestamp?: number): string {
  if (!timestamp) return '';
  const d = new Date(timestamp);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

// Generate tone-based rule captions when offline or building base book
export function generateToneBasedCaption(
  photo: PhotoRecord,
  tone: StoryTone = 'lyrical',
  idx: number = 0
): string {
  if (photo.description) return photo.description;

  const d = new Date(photo.dateTaken || photo.lastModified || Date.now());
  const hours = d.getHours();
  const timeWord = 
    hours >= 5 && hours < 11 ? '맑은 아침의 온기' :
    hours >= 11 && hours < 16 ? '눈부신 한낮의 햇살' :
    hours >= 16 && hours < 20 ? '붉게 물든 노을빛' : '달빛 어린 고요한 시간';

  const tonePools: Record<StoryTone, string[]> = {
    lyrical: [
      '시간이 잠시 머물다 간 자리, 영원히 흐르지 않을 기억 한 조각.',
      '바람에 실려 온 계절의 숨결과 마음에 새겨진 잔잔한 미소.',
      '우리가 함께 바라보았던 하늘은 여전히 그 자리에 머물러 있습니다.',
      '스쳐 지나간 찰나가 영혼의 가장 따뜻한 풍경이 되는 순간.',
      '빛과 그림자가 수놓은 잊혀지지 않을 오늘의 아름다운 온기.'
    ],
    travel: [
      '지도 밖으로 발길을 옮기며 마주한 낯설고도 눈부신 세상.',
      '골목을 돌아서면 펼쳐지던 새로운 바람과 자유로운 공기.',
      '여행자의 마음에 오래도록 머물 이국적인 풍경의 첫인상.',
      '길 위에서 발견한 소소한 놀라움, 잊지 못할 여정의 한 페이지.',
      '떠나온 곳과 닿은 곳 사이에서 피어난 가장 찬란한 모험.'
    ],
    family: [
      '서로의 눈을 마주 보며 함께 웃던 우리들의 소중한 오늘.',
      '소박해서 더 애틋하고 가득 차오르는 따스한 일상의 선물.',
      '언제 꺼내어 보아도 마음이 뭉클해지는 가족의 다정한 시간.',
      '아이의 맑은 미소 속에 번져가던 영원한 사랑의 기록.',
      '함께 손을 잡고 걸어온 길목마다 남겨진 포근한 흔적들.'
    ],
    minimal: [
      '정제된 시선으로 포착한 빛과 공간의 고요한 조화.',
      '여백 속에 멈춰 선 침묵, 시선이 머무는 곳의 본질.',
      '단정한 선과 부드러운 명암이 빚어낸 찰나의 프레임.',
      '군더더기 없는 구도에서 발견한 일상의 단아한 미학.',
      '빛의 각도에 따라 잔잔히 변화하는 시간의 윤곽.'
    ],
    nostalgic: [
      '먼지 쌓인 앨범 속에서 다시 피어난 아련한 그날의 기억.',
      '빛바랜 사진처럼 따뜻하고 애틋한 우리들의 지난 시간.',
      '그리움의 조각들이 모여 하나의 아름다운 풍경이 됩니다.',
      '시간이 흘러도 변치 않을 우리들만의 소중한 약속.',
      '추억이라는 이름으로 남겨진 가장 빛나는 순간들.'
    ],
    professional: [
      '객관적인 시각으로 기록된 현대적인 공간과 인물의 조화.',
      '정교한 구도와 빛의 설계를 통해 완성된 기록의 가치.',
      '현장의 분위기를 생생하고 전문적으로 전달하는 시각적 서사.',
      '기술적 완성도와 예술적 영감이 만나는 지점의 기록.',
      '세련된 미학적 접근으로 재해석된 공간의 비전.'
    ],
    cinematic: [
      '한 편의 영화처럼 강렬하게 다가오는 빛과 어둠의 대비.',
      '극적인 앵글로 포착된 찰나의 순간, 멈춰버린 서사.',
      '프레임 너머로 이어지는 거대한 이야기의 한 장면.',
      '감각적인 연출과 본능적인 포착이 빚어낸 압도적 영상미.',
      '주인공이 된 듯한 기분으로 마주하는 세상의 풍경.'
    ],
    minimalist: [
      '오직 본질만을 남긴, 극도의 절제미가 빚어낸 조화.',
      '비어 있음으로써 더 가득 차오르는 공간의 미학.',
      '최소한의 선과 면으로 표현된 세상의 윤곽.',
      '복잡함을 덜어내고 마주하는 순수한 존재의 가치.',
      '말하지 않음으로써 더 많은 것을 전달하는 침묵의 언어.'
    ]
  };

  const pool = tonePools[tone] || tonePools.lyrical;
  const quote = pool[idx % pool.length];
  const loc = photo.locationName ? `${photo.locationName} · ` : '';

  return `${loc}${timeWord} — ${quote}`;
}

// 3-Axis Intelligent Photo Clustering (Time-Burst + Location + Aesthetic Best-Shots)
export function clusterPhotosIntoChapters(
  photos: PhotoRecord[],
  tone: StoryTone = 'lyrical'
): { chapters: PhotobookChapter[]; clusteredGroups: PhotoRecord[][] } {
  if (photos.length === 0) {
    return { chapters: [], clusteredGroups: [] };
  }

  // 1. Chronological sort
  const sorted = [...photos].sort(
    (a, b) => (a.dateTaken || a.lastModified || 0) - (b.dateTaken || b.lastModified || 0)
  );

  const clusteredGroups: PhotoRecord[][] = [];
  let currentGroup: PhotoRecord[] = [sorted[0]];

  const THREE_HOURS_MS = 3 * 60 * 60 * 1000;

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];

    const prevTime = prev.dateTaken || prev.lastModified || 0;
    const currTime = curr.dateTaken || curr.lastModified || 0;
    const timeDiff = currTime - prevTime;

    const locChanged = prev.locationName && curr.locationName && prev.locationName !== curr.locationName;

    // Split if time interval exceeds 3 hours or location clearly changed
    if (timeDiff > THREE_HOURS_MS || (locChanged && currentGroup.length >= 3)) {
      clusteredGroups.push(currentGroup);
      currentGroup = [curr];
    } else {
      currentGroup.push(curr);
    }
  }

  if (currentGroup.length > 0) {
    clusteredGroups.push(currentGroup);
  }

  // If too many small clusters, merge them smoothly (max 5 chapters)
  while (clusteredGroups.length > 5) {
    let minIdx = 0;
    let minLen = clusteredGroups[0].length;
    for (let j = 1; j < clusteredGroups.length; j++) {
      if (clusteredGroups[j].length < minLen) {
        minLen = clusteredGroups[j].length;
        minIdx = j;
      }
    }
    if (minIdx === 0) {
      clusteredGroups[0] = [...clusteredGroups[0], ...clusteredGroups[1]];
      clusteredGroups.splice(1, 1);
    } else {
      clusteredGroups[minIdx - 1] = [...clusteredGroups[minIdx - 1], ...clusteredGroups[minIdx]];
      clusteredGroups.splice(minIdx, 1);
    }
  }

  // Define chapter titles based on Tone and Order
  const toneChapterTitles: Record<StoryTone, { title: string; subtitle: string; prologue: string }[]> = {
    lyrical: [
      { title: '1장. 설레는 빛의 시작', subtitle: 'A gentle dawn of memories', prologue: '햇살이 조심스레 닿던 시간, 모든 것이 새로웠던 순간들의 기록.' },
      { title: '2장. 바람이 머물던 골목', subtitle: 'Where time stood still', prologue: '발걸음을 멈추고 주위를 둘러보았을 때 비로소 들려오던 풍경의 속삭임.' },
      { title: '3장. 따스한 오후의 온기', subtitle: 'Golden afternoon whispers', prologue: '함께 나눈 대화와 번져가던 미소들이 공기 중에 가득 차오르던 순간.' },
      { title: '4장. 노을빛으로 물든 자리', subtitle: 'Twilight poetry in crimson', prologue: '하루가 저물며 하늘을 물들이던 붉은 온기, 영원히 잊히지 않을 실루엣.' },
      { title: '5장. 마음에 남겨진 여운', subtitle: 'Echoes of eternal grace', prologue: '어둠이 찾아와도 가슴 속에 은은한 등불처럼 켜져 있을 아름다운 기억.' },
    ],
    travel: [
      { title: '1장. 지도 밖으로의 첫 발자국', subtitle: 'The journey begins', prologue: '낯선 공기가 코끝을 스치며 시작된 우리들의 설레는 탐험.' },
      { title: '2장. 낯선 풍경과 마주하다', subtitle: 'Uncharted perspectives', prologue: '도시의 소음 너머로 펼쳐진 자연의 웅장한 자태와 마주한 경이로움.' },
      { title: '3장. 길 위에서 찾은 보물', subtitle: 'Wandering hidden gems', prologue: '계획에 없던 작은 길목에서 건져 올린 뜻밖의 눈부신 선물들.' },
      { title: '4장. 황금빛으로 채워진 수평선', subtitle: 'Golden horizon horizons', prologue: '지평선 너머로 해가 저물어갈 때 마음속에 새겨진 자유의 감각.' },
      { title: '5장. 여정의 끝, 새로운 시작', subtitle: 'Treasures of the road', prologue: '발걸음은 돌아왔지만 마음만은 영원히 머물고 있을 그곳의 기억.' },
    ],
    family: [
      { title: '1장. 함께 눈뜨는 아침', subtitle: 'Morning warmth & giggles', prologue: '작은 웃음소리로 시작된 하루, 우리 가족의 가장 순수한 시작.' },
      { title: '2장. 손잡고 걸어온 길', subtitle: 'Steps intertwined with love', prologue: '작은 손을 꼭 쥐고 한 걸음씩 내딛던 보폭에 담긴 깊은 사랑.' },
      { title: '3장. 마주 보며 나눈 미소', subtitle: 'Eyes filled with happiness', prologue: '특별한 말이 없어도 눈빛만으로 온 마음이 편안해지던 소중한 날.' },
      { title: '4장. 식탁 위의 행복한 기억', subtitle: 'Shared blessings & feasts', prologue: '맛있는 음식과 다정한 목소리로 채워졌던 우리들만의 온기.' },
      { title: '5장. 영원히 든든한 품', subtitle: 'Our forever sanctuary', prologue: '세상 그 어떤 곳보다 가장 따뜻하고 든든한 우리의 보금자리.' },
    ],
    minimal: [
      { title: '1장. 빛의 여백', subtitle: 'Geometry of first light', prologue: '비어 있는 공간 속에서 피어나는 빛과 선의 정갈한 아름다움.' },
      { title: '2장. 정제된 프레임', subtitle: 'Structured observations', prologue: '시선이 머무는 자리를 최소한의 요소로 담아낸 찰나의 침묵.' },
      { title: '3장. 형태와 텍스처', subtitle: 'Tangible quietude', prologue: '자연과 사물이 빚어낸 결을 따라 부드럽게 흐르는 시간의 감촉.' },
      { title: '4장. 흑과 백 사이의 시간', subtitle: 'Chiaroscuro in focus', prologue: '명암의 뚜렷한 대비 속에서 오롯이 드러나는 피사체의 본질.' },
      { title: '5장. 남겨진 고요', subtitle: 'Pure contemplation', prologue: '모든 장식을 덜어내고 오직 마음에 남겨진 순수한 여운.' },
    ],
    nostalgic: [
      { title: '1장. 아련한 첫 기억', subtitle: 'Soft echoes of the past', prologue: '먼지 쌓인 앨범 속에서 다시 피어난 아련한 그날의 기록.' },
      { title: '2장. 빛바랜 거리의 풍경', subtitle: 'Vintage whispers', prologue: '오래된 필름처럼 따뜻하고 애틋한 우리들의 지난 시간.' },
      { title: '3장. 그리움의 조각들', subtitle: 'Fragments of longing', prologue: '시간이 흘러도 변치 않을 우리들만의 소중한 약속.' },
      { title: '4장. 따뜻한 오후의 잔상', subtitle: 'Sepia-toned afternoons', prologue: '노을빛 아래 남겨진 우리들의 다정한 실루엣.' },
      { title: '5장. 영원히 머물 자리', subtitle: 'Eternal sanctuary', prologue: '추억이라는 이름으로 남겨진 가장 빛나는 순간들.' },
    ],
    professional: [
      { title: '1장. 공간의 비전', subtitle: 'Architectural perspectives', prologue: '정교한 구도와 빛의 설계를 통해 완성된 기록의 가치.' },
      { title: '2장. 현대적 서사', subtitle: 'Modern narratives', prologue: '객관적인 시각으로 기록된 현대적인 공간과 인물의 조화.' },
      { title: '3장. 기술적 완성도', subtitle: 'Technical precision', prologue: '현장의 분위기를 생생하고 전문적으로 전달하는 시각적 기록.' },
      { title: '4장. 미학적 접근', subtitle: 'Aesthetic evaluation', prologue: '기술적 완성도와 예술적 영감이 만나는 지점의 포착.' },
      { title: '5장. 완벽한 기록', subtitle: 'Definitive archive', prologue: '세련된 미학적 접근으로 재해석된 공간의 비전.' },
    ],
    cinematic: [
      { title: '1장. 오프닝 샷', subtitle: 'The dramatic overture', prologue: '한 편의 영화처럼 강렬하게 다가오는 빛과 어둠의 대비.' },
      { title: '2장. 클로즈업의 순간', subtitle: 'Emotional intensity', prologue: '극적인 앵글로 포착된 찰나의 순간, 멈춰버린 서사.' },
      { title: '3장. 프레임 너머의 세계', subtitle: 'Beyond the boundary', prologue: '프레임 너머로 이어지는 거대한 이야기의 한 장면.' },
      { title: '4장. 영상미의 절정', subtitle: 'Visual symphony', prologue: '감각적인 연출과 본능적인 포착이 빚어낸 압도적 영상미.' },
      { title: '5장. 거대한 대단원', subtitle: 'The grand finale', prologue: '주인공이 된 듯한 기분으로 마주하는 세상의 풍경.' },
    ],
    minimalist: [
      { title: '1장. 본질의 발견', subtitle: 'Core observations', prologue: '오직 본질만을 남긴, 극도의 절제미가 빚어낸 조화.' },
      { title: '2장. 비어 있는 충만함', subtitle: 'Fullness of void', prologue: '비어 있음으로써 더 가득 차오르는 공간의 미학.' },
      { title: '3장. 선과 면의 조화', subtitle: 'Lines and planes', prologue: '최소한의 선과 면으로 표현된 세상의 윤곽.' },
      { title: '4장. 침묵의 언어', subtitle: 'Silent expressions', prologue: '복잡함을 덜어내고 마주하는 순수한 존재의 가치.' },
      { title: '5장. 정갈한 마침표', subtitle: 'Quiet resolution', prologue: '말하지 않음으로써 더 많은 것을 전달하는 침묵의 언어.' },
    ],
  };

  const titles = toneChapterTitles[tone] || toneChapterTitles.lyrical;

  const chapters: PhotobookChapter[] = clusteredGroups.map((group, idx) => {
    // Pick the best shot in the cluster for chapter hero
    const bestInGroup = [...group].sort((a, b) => (b.aestheticScore || 0) - (a.aestheticScore || 0))[0] || group[0];
    const firstTime = group[0].dateTaken || group[0].lastModified || 0;
    const lastTime = group[group.length - 1].dateTaken || group[group.length - 1].lastModified || 0;
    const loc = group.find(p => p.locationName)?.locationName;

    const meta = titles[idx % titles.length];

    return {
      id: `chapter-${idx + 1}`,
      title: loc ? `${meta.title} (${loc})` : meta.title,
      subtitle: meta.subtitle,
      prologue: meta.prologue,
      timeRange: { start: firstTime, end: lastTime },
      locationName: loc,
      heroPhotoPath: bestInGroup.path,
      photoCount: group.length,
    };
  });

  return { chapters, clusteredGroups };
}

// Core intelligent photobook generator with 4 tones & smart layouts
export function createPhotobookFromPhotos(
  photos: PhotoRecord[],
  options: {
    title?: string;
    subtitle?: string;
    theme?: PhotobookTheme;
    storyTone?: StoryTone;
    bgmType?: 'gentle-piano' | 'warm-vinyl' | 'summer-breeze' | 'none';
  } = {}
): PhotobookRecord {
  // 1. Clean and filter photos
  const cleanPhotos = photos
    .filter(p => !p.isDeleted)
    .sort((a, b) => (a.dateTaken || a.lastModified || 0) - (b.dateTaken || b.lastModified || 0));

  const validPhotos = cleanPhotos.length > 0 ? cleanPhotos : generateSamplePhotos();
  const storyTone: StoryTone = options.storyTone || 'lyrical';
  const theme: PhotobookTheme = options.theme || 'classic-hardcover';

  // 2. Perform 3-Axis Smart Clustering
  const { chapters, clusteredGroups } = clusterPhotosIntoChapters(validPhotos, storyTone);

  // 3. Determine best cover photo (highest aesthetic score + sharpness)
  const coverCandidate = [...validPhotos].sort(
    (a, b) => ((b.aestheticScore || 0) * 10 + (b.blurScore || 0)) - ((a.aestheticScore || 0) * 10 + (a.blurScore || 0))
  )[0] || validPhotos[0];

  const firstDate = validPhotos[0]?.dateTaken || validPhotos[0]?.lastModified;
  const lastDate = validPhotos[validPhotos.length - 1]?.dateTaken || validPhotos[validPhotos.length - 1]?.lastModified;
  const dateRangeText = firstDate && lastDate
    ? formatDate(firstDate) === formatDate(lastDate)
      ? formatDate(firstDate)
      : `${formatDate(firstDate)} ~ ${formatDate(lastDate)}`
    : formatDate(Date.now());

  const toneTitles: Record<StoryTone, string> = {
    lyrical: '빛나는 시간의 조각들',
    travel: '낯선 바람이 머문 길목',
    family: '함께여서 눈부신 날들',
    minimal: '빛과 침묵의 시간',
    nostalgic: '아련한 추억의 깊이',
    professional: '현대적 기록의 가치',
    cinematic: '스크린 위의 순간들',
    minimalist: '순수한 본질의 미학'
  };

  const autoTitle = options.title || 
    (validPhotos[0]?.locationName 
      ? `${validPhotos[0].locationName}에서의 소중한 기록` 
      : toneTitles[storyTone]);

  const autoSubtitle = options.subtitle || (
    storyTone === 'travel' ? '지도 밖으로 떠난 우리들의 잊지 못할 기록' :
    storyTone === 'family' ? '서로의 미소로 채워진 소중한 가족 앨범' :
    storyTone === 'minimal' ? '정제된 프레임 속에 담아낸 찰나의 순간' :
    '기억 속에 영원히 머무를 소중한 순간의 아카이브'
  );

  // 4. Build Spreads Page by Page
  const pages: PhotobookPage[] = [];

  // Front Cover (Page 0)
  pages.push({
    id: `page-0-cover`,
    pageNumber: 0,
    layout: 'cover',
    photos: [{
      photoId: coverCandidate.id,
      path: coverCandidate.path,
      caption: autoTitle,
      date: dateRangeText,
      aestheticScore: coverCandidate.aestheticScore,
    }],
    chapterTitle: autoTitle,
    subtitle: autoSubtitle,
    storyNote: `${dateRangeText} • AI 에디터가 정밀 선별한 베스트 컬렉션`,
  });

  let globalPhotoIdx = 0;
  let pageNumber = 1;

  // Process each cluster into spreads
  clusteredGroups.forEach((group, clusterIdx) => {
    const chapterMeta = chapters[clusterIdx] || {
      title: `Chapter ${clusterIdx + 1}`,
      subtitle: 'Memories in Focus',
      prologue: '순간의 기록'
    };

    let groupPhotoIdx = 0;

    while (groupPhotoIdx < group.length) {
      const remainingInGroup = group.length - groupPhotoIdx;
      let layout: PhotobookPageLayout;
      let takeCount = 1;

      const currentPhoto = group[groupPhotoIdx];
      const isWideOrHero = (currentPhoto.aestheticScore || 0) >= 8.0 || 
        (currentPhoto.width && currentPhoto.height && currentPhoto.width / currentPhoto.height > 1.35);

      if (groupPhotoIdx === 0 && isWideOrHero) {
        layout = 'hero-with-caption';
        takeCount = 1;
      } else if (remainingInGroup >= 4 && (pageNumber % 3 === 0)) {
        layout = 'quad-grid';
        takeCount = 4;
      } else if (remainingInGroup >= 3 && (pageNumber % 2 === 0)) {
        layout = 'trio-collage';
        takeCount = 3;
      } else if (remainingInGroup >= 2) {
        layout = 'duo-vertical';
        takeCount = 2;
      } else {
        layout = isWideOrHero ? 'full-bleed' : 'hero-with-caption';
        takeCount = 1;
      }

      const slice = group.slice(groupPhotoIdx, groupPhotoIdx + takeCount);
      const bookPhotos: PhotobookPhoto[] = slice.map((p, i) => ({
        photoId: p.id,
        path: p.path,
        caption: generateToneBasedCaption(p, storyTone, globalPhotoIdx + i),
        date: formatDate(p.dateTaken || p.lastModified),
        location: p.locationName,
        rotation: ((globalPhotoIdx + i) % 5 - 2) * 0.7,
        blurScore: p.blurScore,
        aestheticScore: p.aestheticScore,
      }));

      pages.push({
        id: `page-${pageNumber}`,
        pageNumber,
        layout,
        photos: bookPhotos,
        chapterTitle: chapterMeta.title,
        subtitle: chapterMeta.subtitle,
        storyNote: groupPhotoIdx === 0 ? chapterMeta.prologue : undefined,
        accentQuote: '우리가 기억하는 것은 날들이 아니라 순간들이다.',
      });

      groupPhotoIdx += takeCount;
      globalPhotoIdx += takeCount;
      pageNumber++;
    }
  });

  // Ensure even inner pages for realistic 3D book spread
  if (pageNumber % 2 === 1) {
    pages.push({
      id: `page-${pageNumber}`,
      pageNumber,
      layout: 'quote-memory',
      photos: [],
      chapterTitle: '추억의 여백 (Prologue)',
      subtitle: 'Echoes of Serenity',
      storyNote: '사진이란 시간을 잠시 멈추게 하는 마법이자, 우리가 사랑했던 순간들을 다시 살아 숨쉬게 하는 영혼의 책갈피입니다.',
      accentQuote: 'We do not remember days, we remember moments.',
    });
    pageNumber++;
  }

  // Back Cover
  pages.push({
    id: `page-${pageNumber}-back`,
    pageNumber,
    layout: 'back-cover',
    photos: [],
    chapterTitle: 'SnapClean AI Digital Photobook 2.0',
    subtitle: 'Curated with Intelligent Vision & 3D Interactive FlipBook',
    storyNote: `수많은 컷 속에서 가장 선명하게 빛나는 보석 같은 순간들만을 엮었습니다.\n${dateRangeText} • SnapClean Archive`,
  });

  return {
    id: `photobook-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    title: autoTitle,
    subtitle: autoSubtitle,
    theme,
    storyTone,
    chapters,
    coverImage: coverCandidate.path,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    totalPhotos: validPhotos.length,
    dateRangeText,
    locationSummary: validPhotos[0]?.locationName || 'Everyday Memories',
    bgmType: options.bgmType || 'gentle-piano',
    pages,
  };
}

// AI-enhanced story generation using Gemini
export async function enhancePhotobookWithAi(
  photobook: PhotobookRecord,
  samplePhotos: PhotoRecord[]
): Promise<PhotobookRecord> {
  try {
    const photoDetails = samplePhotos.slice(0, 15).map((p, i) => ({
      index: i + 1,
      date: formatDate(p.dateTaken || p.lastModified),
      category: p.category || 'Memory',
      location: p.locationName || 'Travel',
      tags: p.tags?.slice(0, 3) || []
    }));

    const parsed = await generatePhotobookStory(
      photobook.title, 
      photobook.theme, 
      photoDetails, 
      photobook.storyTone || 'lyrical'
    );

    if (parsed) {
      const updatedPages = [...photobook.pages];

      if (parsed.curatedTitle) photobook.title = parsed.curatedTitle;
      if (parsed.curatedSubtitle) photobook.subtitle = parsed.curatedSubtitle;

      let chapterIdx = 0;
      updatedPages.forEach((page) => {
        if (page.layout !== 'cover' && page.layout !== 'back-cover') {
          if (parsed.chapters && parsed.chapters[chapterIdx]) {
            const ch = parsed.chapters[chapterIdx];
            if (!page.chapterTitle || page.chapterTitle.startsWith('Chapter') || page.chapterTitle.includes('장.')) {
              page.chapterTitle = ch.chapterTitle;
            }
            if (ch.storyNote) page.storyNote = ch.storyNote;
            if (ch.accentQuote) page.accentQuote = ch.accentQuote;
            chapterIdx = (chapterIdx + 1) % parsed.chapters.length;
          }
        } else if (page.layout === 'back-cover' && parsed.epilogue) {
          page.storyNote = parsed.epilogue;
        }
      });

      photobook.pages = updatedPages;
      photobook.updatedAt = Date.now();
      await savePhotobook(photobook);
    }
  } catch (err) {
    console.warn('[Photobook AI Enhancement Error]:', err);
  }

  return photobook;
}

// Single photo caption rewriter with Gemini AI
export async function rewritePhotoCaption(
  photo: PhotobookPhoto,
  tone: StoryTone = 'lyrical'
): Promise<string> {
  try {
    const newCaption = await rewritePhotobookCaption(
      { location: photo.location, date: photo.date, score: photo.aestheticScore },
      tone,
      photo.caption
    );
    return newCaption;
  } catch (e) {
    return generateToneBasedCaption({ path: photo.path } as any, tone, Math.floor(Math.random() * 10));
  }
}

// Generate reliable inline SVG sample photos when empty
export function generateSamplePhotos(): PhotoRecord[] {
  return [
    {
      id: 9901,
      originalId: 'sample-1',
      path: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
      size: 2450000,
      width: 1920,
      height: 1080,
      category: 'Travel',
      dateTaken: Date.now() - 86400000 * 20,
      locationName: '제주도 애월 해변',
      aestheticScore: 9.5,
      blurScore: 94,
      status: 'analyzed' as const,
      lastModified: Date.now() - 86400000 * 20,
      type: 'image/jpeg',
    },
    {
      id: 9902,
      originalId: 'sample-2',
      path: 'https://images.unsplash.com/photo-1509114397022-ed747cca3f65?auto=format&fit=crop&w=1200&q=80',
      size: 3100000,
      width: 1920,
      height: 1200,
      category: 'Nature',
      dateTaken: Date.now() - 86400000 * 18,
      locationName: '강원도 영월 별마로',
      aestheticScore: 9.7,
      blurScore: 96,
      status: 'analyzed' as const,
      lastModified: Date.now() - 86400000 * 18,
      type: 'image/jpeg',
    },
    {
      id: 9903,
      originalId: 'sample-3',
      path: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1200&q=80',
      size: 2800000,
      width: 1080,
      height: 1620,
      category: 'People',
      dateTaken: Date.now() - 86400000 * 15,
      locationName: '올림픽공원 나홀로나무',
      aestheticScore: 9.0,
      blurScore: 89,
      status: 'analyzed' as const,
      lastModified: Date.now() - 86400000 * 15,
      type: 'image/jpeg',
    },
    {
      id: 9904,
      originalId: 'sample-4',
      path: 'https://images.unsplash.com/photo-1511497584788-876761c119ef?auto=format&fit=crop&w=1200&q=80',
      size: 3400000,
      width: 1920,
      height: 1080,
      category: 'Nature',
      dateTaken: Date.now() - 86400000 * 12,
      locationName: '사려니 숲길',
      aestheticScore: 9.3,
      blurScore: 92,
      status: 'analyzed' as const,
      lastModified: Date.now() - 86400000 * 12,
      type: 'image/jpeg',
    },
    {
      id: 9905,
      originalId: 'sample-5',
      path: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80',
      size: 2200000,
      width: 1600,
      height: 1067,
      category: 'Food',
      dateTaken: Date.now() - 86400000 * 8,
      locationName: '삼청동 한옥 브런치',
      aestheticScore: 8.8,
      blurScore: 90,
      status: 'analyzed' as const,
      lastModified: Date.now() - 86400000 * 8,
      type: 'image/jpeg',
    },
    {
      id: 9906,
      originalId: 'sample-6',
      path: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=1200&q=80',
      size: 3500000,
      width: 1920,
      height: 1080,
      category: 'Travel',
      dateTaken: Date.now() - 86400000 * 5,
      locationName: '남산 서울타워 전망대',
      aestheticScore: 9.6,
      blurScore: 95,
      status: 'analyzed' as const,
      lastModified: Date.now() - 86400000 * 5,
      type: 'image/jpeg',
    },
  ];
}

// Database persistent store operations
export async function savePhotobook(book: PhotobookRecord): Promise<void> {
  try {
    if (db.photobooks) {
      await db.photobooks.put(book);
    }
  } catch (e) {
    console.warn('Failed to save photobook to Dexie, fallback to localStorage', e);
  }
  try {
    const list = getLocalPhotobooks();
    const idx = list.findIndex(b => b.id === book.id);
    if (idx >= 0) {
      list[idx] = book;
    } else {
      list.unshift(book);
    }
    localStorage.setItem('snapclean_photobooks', JSON.stringify(list));
  } catch (e) {}
}

export function getLocalPhotobooks(): PhotobookRecord[] {
  try {
    const raw = localStorage.getItem('snapclean_photobooks');
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export async function getAllPhotobooks(): Promise<PhotobookRecord[]> {
  try {
    if (db.photobooks) {
      const records = await db.photobooks.toArray();
      if (records.length > 0) {
        return records.sort((a, b) => b.updatedAt - a.updatedAt);
      }
    }
  } catch (e) {}
  return getLocalPhotobooks();
}

export async function deletePhotobook(id: string): Promise<void> {
  try {
    if (db.photobooks) {
      await db.photobooks.delete(id);
    }
  } catch (e) {}
  try {
    const list = getLocalPhotobooks().filter(b => b.id !== id);
    localStorage.setItem('snapclean_photobooks', JSON.stringify(list));
  } catch (e) {}
}

/**
 * Automatically populates a photobook's pages and photos with emotional, context-aware captions
 * derived from the Gemini AI generateEventSummary output (title, story, mood).
 */
export function populateBookWithAiNarrative(
  book: PhotobookRecord,
  summary: EventSummary
): PhotobookRecord {
  const mood = summary.mood || 'Sentimental';
  const cleanStory = summary.story?.trim() || 'A cherished collection of captured memories.';
  const storySentences = cleanStory.split(/[.!?]+/).map(s => s.trim()).filter(Boolean);
  const firstSentence = storySentences[0] || cleanStory;

  const updatedPages = book.pages.map((page, pageIdx) => {
    // 1. Cover Page
    if (page.layout === 'cover') {
      return {
        ...page,
        subtitle: cleanStory,
        storyNote: `[${mood}] ${cleanStory}`,
        photos: page.photos.map(p => ({
          ...p,
          caption: `${summary.title || book.title} • ${firstSentence}`
        }))
      };
    }

    // 2. Back Cover Page
    if (page.layout === 'back-cover') {
      return {
        ...page,
        chapterTitle: summary.title || page.chapterTitle,
        storyNote: `${cleanStory}\n\n[Mood: ${mood}] 우리가 함께한 모든 소중한 순간들이 언제나 찬란하게 빛나기를.`
      };
    }

    // 3. Quote Memory Page
    if (page.layout === 'quote-memory') {
      return {
        ...page,
        accentQuote: `"${firstSentence}..."`,
        storyNote: `[${mood}] ${cleanStory}`
      };
    }

    // 4. Content Spreads - Generate rich, emotional, context-aware captions
    const updatedPhotos = page.photos.map((photo, photoIdx) => {
      const loc = photo.location ? `${photo.location} · ` : '';
      const dateText = photo.date ? `${photo.date} · ` : '';

      // Poetic emotional caption variations weaving mood, event narrative, and scene context
      const emotionalTemplates = [
        `${loc}${firstSentence}`,
        `${loc}[${mood}] 마음에 스며든 따스한 온기와 잊지 못할 찰나의 미소.`,
        `바람결에 실려 온 그날의 향기, 영원히 간직하고픈 소중한 기억.`,
        `${dateText}빛과 그림자가 수놓은 우리들의 가장 찬란했던 오후.`,
        `함께여서 더없이 애틋하고 아름다웠던 우리들의 다정한 시간.`,
        `${loc}시간이 멈추었으면 했던 순간, 마음에 새겨진 영혼의 풍경.`,
        `작은 웃음소리마저 보석처럼 빛나던 잊을 수 없는 그날의 기억.`,
        `[${mood}] 일상의 모든 순간이 기적이 되었던 특별한 하루.`,
        `${loc}${dateText}발길 닿는 곳마다 마주한 다정하고 눈부신 삶의 한 장면.`
      ];

      const chosenCaption = emotionalTemplates[(pageIdx * 3 + photoIdx) % emotionalTemplates.length];
      
      return {
        ...photo,
        caption: chosenCaption
      };
    });

    return {
      ...page,
      subtitle: page.subtitle || `${mood} • ${page.chapterTitle || 'Memories'}`,
      storyNote: page.storyNote || cleanStory,
      accentQuote: page.accentQuote || `"${firstSentence}"`,
      photos: updatedPhotos
    };
  });

  return {
    ...book,
    title: book.title || summary.title,
    subtitle: `${cleanStory} [${mood}]`,
    updatedAt: Date.now(),
    pages: updatedPages
  };
}

/**
 * Triggers generateEventSummary for an event photobook and populates all pages with emotional captions.
 */
export async function applyAiNarrativeToPhotobook(
  book: PhotobookRecord,
  forcedTone?: StoryTone
): Promise<{ updatedBook: PhotobookRecord; summary: EventSummary }> {
  const activeTone = forcedTone || book.storyTone || 'lyrical';
  // Extract context-aware tags from the album's photos, locations, dates, chapters, and theme
  const tags: string[] = [
    book.title,
    book.storyTone || 'lyrical',
    book.locationSummary || '',
    ...(book.chapters?.map(c => c.title) || []),
    ...(book.chapters?.map(c => c.locationName).filter(Boolean) as string[] || []),
    ...book.pages.flatMap(p => p.photos.map(ph => ph.location).filter(Boolean) as string[]),
    ...book.pages.flatMap(p => p.photos.map(ph => (ph as any).category).filter(Boolean) as string[]),
    ...book.pages.flatMap(p => ((p.photos.flatMap(ph => (ph as any).tags || [])) as string[])),
  ].filter(t => typeof t === 'string' && t.trim().length > 0);

  const uniqueTags = Array.from(new Set(tags)).slice(0, 15);
  const summary = await generateEventSummary(uniqueTags.length > 0 ? uniqueTags : ['Memories', 'Cherished Moments', 'Photo Album'], activeTone);
  const updatedBook = populateBookWithAiNarrative({ ...book, storyTone: activeTone }, summary);
  await savePhotobook(updatedBook);
  return { updatedBook, summary };
}

/**
 * Extracts a complete list of PhotoRecords from a PhotobookRecord,
 * cross-referencing with the database for rich metadata if available.
 */
export async function extractPhotosFromPhotobook(book: PhotobookRecord): Promise<PhotoRecord[]> {
  const seenPaths = new Set<string>();
  const extracted: PhotoRecord[] = [];

  let dbPhotos: PhotoRecord[] = [];
  try {
    dbPhotos = await db.photos.toArray();
  } catch (err) {
    console.warn('[extractPhotosFromPhotobook] Could not read db.photos:', err);
  }

  const dbByPath = new Map<string, PhotoRecord>();
  const dbById = new Map<number, PhotoRecord>();
  for (const p of dbPhotos) {
    if (p.path) dbByPath.set(p.path, p);
    if (p.id) dbById.set(p.id, p);
  }

  for (const page of book.pages) {
    for (const ph of page.photos) {
      if (!ph.path || seenPaths.has(ph.path)) continue;
      seenPaths.add(ph.path);

      // Match in db
      const matched = (ph.photoId && dbById.get(ph.photoId)) || dbByPath.get(ph.path);
      if (matched) {
        extracted.push(matched);
      } else {
        const parsedTime = ph.date ? Date.parse(ph.date) : 0;
        const fallbackTime = !isNaN(parsedTime) && parsedTime > 0 ? parsedTime : Date.now();
        extracted.push({
          id: ph.photoId || Math.floor(Math.random() * 10000000),
          originalId: `ph_${ph.photoId || Math.floor(Math.random() * 10000000)}`,
          path: ph.path,
          size: 1024 * 1024,
          lastModified: fallbackTime,
          dateTaken: fallbackTime,
          status: 'analyzed',
          category: (ph as any).category || 'Memories',
          aestheticScore: ph.aestheticScore || 8.0,
          blurScore: ph.blurScore || 90,
          description: ph.caption,
          locationName: ph.location,
          tags: (ph as any).tags || [],
        } as PhotoRecord);
      }
    }
  }

  return extracted;
}

export interface MergeEventsOptions {
  customTitle?: string;
  storyTone?: StoryTone;
  theme?: PhotobookTheme;
  bgmType?: 'gentle-piano' | 'warm-vinyl' | 'summer-breeze' | 'none';
  customSummary?: EventSummary;
  enableAiSummary?: boolean;
}

/**
 * Manually merges two generated events into one consolidated event photobook.
 * Combines photos chronologically, reconciles date ranges, synthesizes an event summary
 * using generateEventSummary, creates the new unified photobook, and cleans up the source events.
 */
export async function mergeEvents(
  eventA: PhotobookRecord,
  eventB: PhotobookRecord,
  options: MergeEventsOptions = {}
): Promise<{ mergedBook: PhotobookRecord; summary: EventSummary }> {
  if (eventA.id === eventB.id) {
    throw new Error('Cannot merge an event with itself');
  }

  // 1. Extract photos from both events
  const [photosA, photosB] = await Promise.all([
    extractPhotosFromPhotobook(eventA),
    extractPhotosFromPhotobook(eventB),
  ]);

  // Combine and deduplicate photos by path or id
  const pathSet = new Set<string>();
  const mergedPhotos: PhotoRecord[] = [];
  for (const p of [...photosA, ...photosB]) {
    const key = p.path || String(p.id);
    if (!pathSet.has(key)) {
      pathSet.add(key);
      mergedPhotos.push(p);
    }
  }

  // Sort photos chronologically
  mergedPhotos.sort((a, b) => (a.dateTaken || a.lastModified || 0) - (b.dateTaken || b.lastModified || 0));

  // Determine active tone, theme, and bgm
  const activeTone: StoryTone = options.storyTone || eventA.storyTone || eventB.storyTone || 'lyrical';
  const activeTheme: PhotobookTheme = options.theme || eventA.theme || eventB.theme || 'classic-hardcover';
  const activeBgm = options.bgmType || eventA.bgmType || eventB.bgmType || 'gentle-piano';

  // 2. Synthesize tags from both events for the AI event summary
  const mergedTags: string[] = [
    eventA.title,
    eventB.title,
    eventA.locationSummary || '',
    eventB.locationSummary || '',
    ...(eventA.chapters?.map(c => c.title) || []),
    ...(eventB.chapters?.map(c => c.title) || []),
    ...(eventA.chapters?.map(c => c.locationName).filter(Boolean) as string[] || []),
    ...(eventB.chapters?.map(c => c.locationName).filter(Boolean) as string[] || []),
    ...mergedPhotos.flatMap(p => p.tags || []),
    ...mergedPhotos.map(p => p.locationName).filter(Boolean) as string[],
    ...mergedPhotos.map(p => p.category).filter(Boolean) as string[],
  ].filter(t => typeof t === 'string' && t.trim().length > 0);

  const uniqueTags = Array.from(new Set(mergedTags)).slice(0, 18);

  // 3. Generate or use provided event summary
  let summary: EventSummary;
  if (options.customSummary) {
    summary = options.customSummary;
  } else if (options.enableAiSummary !== false) {
    summary = await generateEventSummary(
      uniqueTags.length > 0 ? uniqueTags : [eventA.title, eventB.title, 'Merged Memories'],
      activeTone
    );
  } else {
    summary = {
      title: options.customTitle || `${eventA.title} & ${eventB.title}`,
      story: `${eventA.title}와(과) ${eventB.title}의 소중한 순간들이 하나로 어우러진 특별한 이야기입니다.`,
      mood: 'Sentimental'
    };
  }

  const mergedTitle = options.customTitle?.trim() || summary.title || `${eventA.title} & ${eventB.title}`;

  // 4. Create base merged photobook
  let mergedBook = createPhotobookFromPhotos(mergedPhotos, {
    title: mergedTitle,
    theme: activeTheme,
    storyTone: activeTone,
    bgmType: activeBgm,
  });

  // Calculate merged location summary
  const uniqueLocations = Array.from(
    new Set([eventA.locationSummary, eventB.locationSummary, ...mergedPhotos.map(p => p.locationName)].filter(Boolean) as string[])
  );
  if (uniqueLocations.length > 0) {
    mergedBook.locationSummary = uniqueLocations.slice(0, 3).join(', ');
  }

  // 5. Populate pages with synthesized AI narrative
  mergedBook = populateBookWithAiNarrative(mergedBook, summary);

  // 6. Persist to storage and clean up source events
  await savePhotobook(mergedBook);
  await Promise.all([
    deletePhotobook(eventA.id),
    deletePhotobook(eventB.id),
  ]);

  return { mergedBook, summary };
}

export const mergeEventPhotobooks = mergeEvents;

export interface MergeHistoryRecord {
  id: string;
  timestamp: number;
  mergedBookId: string;
  mergedBookTitle: string;
  originalEvents: [PhotobookRecord, PhotobookRecord];
  photoCount: number;
  summaryTitle?: string;
  storyTone?: StoryTone;
  isReverted?: boolean;
  revertedAt?: number;
}

const MERGE_HISTORY_STORAGE_KEY = 'snapclean_photobook_merge_history';

export function getMergeHistory(): MergeHistoryRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(MERGE_HISTORY_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.warn('[MergeHistory] Failed to read merge history from localStorage:', err);
    return [];
  }
}

export function saveMergeHistory(history: MergeHistoryRecord[]): void {
  if (typeof window === 'undefined') return;
  try {
    const trimmed = history.slice(0, 25);
    localStorage.setItem(MERGE_HISTORY_STORAGE_KEY, JSON.stringify(trimmed));
  } catch (err) {
    console.warn('[MergeHistory] Failed to save merge history to localStorage:', err);
  }
}

export function recordMergeHistory(record: MergeHistoryRecord): void {
  const current = getMergeHistory();
  const updated = [record, ...current.filter(r => r.id !== record.id)];
  saveMergeHistory(updated);
}

export function markMergeHistoryReverted(historyId: string): void {
  const current = getMergeHistory();
  const updated = current.map(r => {
    if (r.id === historyId) {
      return { ...r, isReverted: true, revertedAt: Date.now() };
    }
    return r;
  });
  saveMergeHistory(updated);
}

export function clearMergeHistory(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(MERGE_HISTORY_STORAGE_KEY);
}

/**
 * Reverts a previously merged event photobook back into its original two events.
 * 1. Re-saves eventA and eventB into IndexedDB
 * 2. Deletes mergedBook from IndexedDB
 * 3. Updates history ledger marking the operation as reverted
 */
export async function undoMergeEvent(
  mergedBookId: string,
  originalEvents: [PhotobookRecord, PhotobookRecord],
  historyId?: string
): Promise<{ restoredEvents: [PhotobookRecord, PhotobookRecord] }> {
  const [eventA, eventB] = originalEvents;

  // Restore the original two events and remove the merged one
  await Promise.all([
    savePhotobook(eventA),
    savePhotobook(eventB),
    deletePhotobook(mergedBookId),
  ]);

  if (historyId) {
    markMergeHistoryReverted(historyId);
  } else {
    const current = getMergeHistory();
    const match = current.find(r => r.mergedBookId === mergedBookId && !r.isReverted);
    if (match) {
      markMergeHistoryReverted(match.id);
    }
  }

  return { restoredEvents: [eventA, eventB] };
}
