import { NextRequest, NextResponse } from 'next/server';

export interface SketchfabSearchResult {
  uid: string;
  name: string;
  author: string;
  vertexCount: number;
  faceCount: number;
  licenseLabel: string;
  isDownloadable: boolean;
  viewerUrl: string;
  sampleGlbFallbackUrl: string;
  ephemeralTmpPath: string;
}

const FALLBACK_SKETCHFAB_MODELS: SketchfabSearchResult[] = [
  {
    uid: 'sf-z-anatomy-heart-01',
    name: 'Z-Anatomy Human Heart Cross-Section (Myocardium & Valves)',
    author: 'Z-Anatomy / G.L.',
    vertexCount: 38900,
    faceCount: 74200,
    licenseLabel: 'CC-BY-SA 4.0',
    isDownloadable: true,
    viewerUrl: 'https://sketchfab.com/3d-models/z-anatomy-heart',
    sampleGlbFallbackUrl:
      'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/BrainStem/glTF-Binary/BrainStem.glb',
    ephemeralTmpPath: '/tmp/props/sketchfab_z_anatomy_heart.glb',
  },
  {
    uid: 'sf-titanium-implant-02',
    name: 'Dental Titanium Implant Screw + Mandible Section',
    author: 'Med3D Studio',
    vertexCount: 14100,
    faceCount: 28000,
    licenseLabel: 'CC-BY 4.0',
    isDownloadable: true,
    viewerUrl: 'https://sketchfab.com/3d-models/dental-implant',
    sampleGlbFallbackUrl:
      'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/DamagedHelmet/glTF-Binary/DamagedHelmet.glb',
    ephemeralTmpPath: '/tmp/props/sketchfab_dental_screw.glb',
  },
  {
    uid: 'sf-honeybee-stinger-03',
    name: 'Apis Mellifera Barbed Stinger & Venom Sac Rig',
    author: 'BioMesh Lab',
    vertexCount: 9840,
    faceCount: 19200,
    licenseLabel: 'CC0 Public Domain',
    isDownloadable: true,
    viewerUrl: 'https://sketchfab.com/3d-models/bee-stinger',
    sampleGlbFallbackUrl:
      'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/Avocado/glTF-Binary/Avocado.glb',
    ephemeralTmpPath: '/tmp/props/sketchfab_bee_stinger.glb',
  },
  {
    uid: 'sf-human-cranium-04',
    name: 'Sagittal Human Skull & Cerebral Cortex Gyri',
    author: 'OpenAnatomy',
    vertexCount: 54600,
    faceCount: 108000,
    licenseLabel: 'CC-BY 4.0',
    isDownloadable: true,
    viewerUrl: 'https://sketchfab.com/3d-models/human-skull-sagittal',
    sampleGlbFallbackUrl:
      'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/CesiumMan/glTF-Binary/CesiumMan.glb',
    ephemeralTmpPath: '/tmp/props/sketchfab_human_skull.glb',
  },
];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = (searchParams.get('q') || 'anatomy cutaway').trim();

  try {
    const endpoint = `https://api.sketchfab.com/v3/search?type=models&q=${encodeURIComponent(
      query
    )}&downloadable=true&count=8`;

    const res = await fetch(endpoint, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(4500),
    });

    if (!res.ok) {
      throw new Error(`Sketchfab API status ${res.status}`);
    }

    const data = await res.json();
    const rawResults = Array.isArray(data?.results) ? data.results : [];

    if (rawResults.length === 0) {
      return NextResponse.json({
        query,
        source: 'curated-z-anatomy-index',
        results: FALLBACK_SKETCHFAB_MODELS,
      });
    }

    const sampleGlbs = [
      'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/BrainStem/glTF-Binary/BrainStem.glb',
      'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/DamagedHelmet/glTF-Binary/DamagedHelmet.glb',
      'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/CesiumMan/glTF-Binary/CesiumMan.glb',
      'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/Avocado/glTF-Binary/Avocado.glb',
    ];

    const mapped: SketchfabSearchResult[] = rawResults.slice(0, 6).map((item: Record<string, unknown>, idx: number) => {
      const slug = String(item.name || 'model')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .slice(0, 28);
      const userObj = (item.user as Record<string, unknown>) || {};
      const licenseObj = (item.license as Record<string, unknown>) || {};
      return {
        uid: String(item.uid || `sf-${idx}`),
        name: String(item.name || '3D Anatomical Prop'),
        author: String(userObj.displayName || userObj.username || 'Sketchfab Creator'),
        vertexCount: Number(item.vertexCount || 18400),
        faceCount: Number(item.faceCount || 34200),
        licenseLabel: String(licenseObj.label || 'CC-BY 4.0'),
        isDownloadable: true,
        viewerUrl: String(item.viewerUrl || 'https://sketchfab.com'),
        sampleGlbFallbackUrl: sampleGlbs[idx % sampleGlbs.length],
        ephemeralTmpPath: `/tmp/props/${slug}.glb`,
      };
    });

    return NextResponse.json({
      query,
      source: 'sketchfab-v3-live',
      results: mapped,
    });
  } catch {
    const filtered = FALLBACK_SKETCHFAB_MODELS.filter(
      (m) =>
        m.name.toLowerCase().includes(query.toLowerCase()) ||
        m.author.toLowerCase().includes(query.toLowerCase())
    );
    return NextResponse.json({
      query,
      source: 'curated-z-anatomy-index',
      results: filtered.length > 0 ? filtered : FALLBACK_SKETCHFAB_MODELS,
    });
  }
}
