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
    minimal: '빛과 침묵의 시간'
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
  const createSvgDataUrl = (title: string, sub: string, startColor: string, endColor: string) => {
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800" width="100%" height="100%">
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:${startColor};stop-opacity:1" />
            <stop offset="100%" style="stop-color:${endColor};stop-opacity:1" />
          </linearGradient>
          <radialGradient id="sun" cx="70%" cy="30%" r="40%">
            <stop offset="0%" style="stop-color:#ffffff;stop-opacity:0.3" />
            <stop offset="100%" style="stop-color:#000000;stop-opacity:0" />
          </radialGradient>
        </defs>
        <rect width="1200" height="800" fill="url(#grad)" />
        <rect width="1200" height="800" fill="url(#sun)" />
        <circle cx="840" cy="240" r="100" fill="#ffffff" opacity="0.15" />
        <path d="M0 600 Q 300 450 600 550 T 1200 500 L 1200 800 L 0 800 Z" fill="#000000" opacity="0.3" />
        <path d="M0 680 Q 400 580 800 650 T 1200 620 L 1200 800 L 0 800 Z" fill="#000000" opacity="0.4" />
        <text x="600" y="380" fill="#ffffff" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-weight="900" font-size="44" text-anchor="middle" letter-spacing="2">
          ${title}
        </text>
        <text x="600" y="440" fill="#ffffff" opacity="0.75" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-weight="500" font-size="22" text-anchor="middle" letter-spacing="1">
          ${sub}
        </text>
      </svg>
    `.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  };

  return [
    {
      id: 9901,
      originalId: 'sample-1',
      path: createSvgDataUrl('에메랄드 해변의 오후', '바람과 파도가 머물던 자리', '#0f766e', '#134e4a'),
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
      type: 'image/svg+xml',
    },
    {
      id: 9902,
      originalId: 'sample-2',
      path: createSvgDataUrl('별빛 쏟아지는 밤하늘', '은하수 아래 따스한 캠프파이어', '#1e1b4b', '#0f172a'),
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
      type: 'image/svg+xml',
    },
    {
      id: 9903,
      originalId: 'sample-3',
      path: createSvgDataUrl('노을빛 언덕의 미소', '함께 걸어가던 행복한 우리', '#831843', '#4c0519'),
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
      type: 'image/svg+xml',
    },
    {
      id: 9904,
      originalId: 'sample-4',
      path: createSvgDataUrl('안개 낀 아침 숲길', '싱그러운 풀잎 향기 가득한 산책', '#064e3b', '#022c22'),
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
      type: 'image/svg+xml',
    },
    {
      id: 9905,
      originalId: 'sample-5',
      path: createSvgDataUrl('골목길 브런치 카페', '다정한 대화와 향긋한 커피', '#78350f', '#451a03'),
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
      type: 'image/svg+xml',
    },
    {
      id: 9906,
      originalId: 'sample-6',
      path: createSvgDataUrl('도심 속 황금빛 야경', '빛의 강물이 흐르는 밤', '#172554', '#0f172a'),
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
      type: 'image/svg+xml',
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
  book: PhotobookRecord
): Promise<{ updatedBook: PhotobookRecord; summary: EventSummary }> {
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
  const summary = await generateEventSummary(uniqueTags.length > 0 ? uniqueTags : ['Memories', 'Cherished Moments', 'Photo Album']);
  const updatedBook = populateBookWithAiNarrative(book, summary);
  await savePhotobook(updatedBook);
  return { updatedBook, summary };
}
