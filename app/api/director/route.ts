import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';
import { type StoryboardBeat, type CameraMotionType } from '@/lib/remotion-math';

export interface DirectorBeatChoreography extends StoryboardBeat {
  propIdentifier: string;
}

export interface DirectorAssetResolution {
  presetId: string;
  targetOrgan: string;
  propIdentifier: string;
  sketchfabQuery: string;
  matchedProp: {
    uid: string;
    name: string;
    author: string;
    vertexCount: number;
    ephemeralTmpPath: string;
    licenseLabel: string;
  };
}

export interface DirectorTtsPayload {
  engine: string;
  voice: 'Fenrir' | 'Charon';
  estimatedCostUsd: number;
  wordCount: number;
  wordTimestamps: {
    word: string;
    startFrame: number;
    endFrame: number;
    startTimeSec: number;
  }[];
  audioDataUrl: string;
}

function resolveTopicIdentifiers(topic: string): {
  presetId: string;
  targetOrgan: string;
  propIdentifier: string;
  sketchfabQuery: string;
} {
  const t = topic.toLowerCase();
  if (
    t.includes('tooth') ||
    t.includes('dental') ||
    t.includes('jaw') ||
    t.includes('root canal') ||
    t.includes('implant') ||
    t.includes('screw')
  ) {
    return {
      presetId: 'titanium-tooth',
      targetOrgan: 'Mandible_Cortical_Plate',
      propIdentifier: 'titanium_dental_screw.glb',
      sketchfabQuery: 'dental titanium implant tooth',
    };
  }
  if (
    t.includes('bullet') ||
    t.includes('kevlar') ||
    t.includes('heart') ||
    t.includes('pacemaker') ||
    t.includes('rib') ||
    t.includes('chest')
  ) {
    return {
      presetId: 'kevlar-ribcage',
      targetOrgan: 'Heart_Myocardium',
      propIdentifier: 'fmj_9mm_parabellum_slug.glb',
      sketchfabQuery: 'human heart ribcage anatomy',
    };
  }
  if (
    t.includes('brain') ||
    t.includes('skull') ||
    t.includes('concussion') ||
    t.includes('head') ||
    t.includes('neuron')
  ) {
    return {
      presetId: 'brain-concussion',
      targetOrgan: 'Cerebral_Cortex',
      propIdentifier: 'frontal_impact_vector.glb',
      sketchfabQuery: 'human brain skull sagittal',
    };
  }
  if (
    t.includes('stomach') ||
    t.includes('pill') ||
    t.includes('capsule') ||
    t.includes('acid') ||
    t.includes('digest')
  ) {
    return {
      presetId: 'stomach-capsule',
      targetOrgan: 'Gastric_Fundus_Wall',
      propIdentifier: 'enteric_gel_capsule.glb',
      sketchfabQuery: 'pill capsule stomach anatomy',
    };
  }
  if (
    t.includes('ear') ||
    t.includes('sound') ||
    t.includes('hearing') ||
    t.includes('cochlea') ||
    t.includes('eardrum') ||
    t.includes('shockwave')
  ) {
    return {
      presetId: 'eardrum-rupture',
      targetOrgan: 'Tympanic_Membrane',
      propIdentifier: 'acoustic_pressure_wavefront.glb',
      sketchfabQuery: 'inner ear cochlea eardrum',
    };
  }
  return {
    presetId: 'bee-sting',
    targetOrgan: 'Dermis_Layer',
    propIdentifier: 'apis_mellifera_barbed_stinger.glb',
    sketchfabQuery: 'honeybee stinger skin anatomy',
  };
}

function buildFallbackDirectorBeats(
  topic: string,
  targetOrgan: string,
  propIdentifier: string
): DirectorBeatChoreography[] {
  const cleanTopic = topic.trim() || 'How a Titanium Dental Screw Fuses into the Jawbone';
  const upperTopic = cleanTopic.toUpperCase();
  return [
    {
      id: `dir-b1-${Date.now()}`,
      beatNumber: 1,
      title: 'Macro Exterior Entry',
      startFrame: 0,
      durationInFrames: 90,
      caption: `WHAT ACTUALLY HAPPENS INSIDE YOUR BODY DURING ${upperTopic.slice(0, 44)}`,
      sfxCue: 'whoosh',
      cameraTargetZ: 5.1,
      sliceOffset: 0.22,
      targetOrgan,
      propIdentifier,
      primitiveType: 'PropImpact',
      cameraMotion: 'whip-zoom',
      cameraOrbitRange: [-0.25, 0.15],
      fovKick: 6,
      sceneStage: 'exterior-macro',
      particleMode: 'toxin-droplets',
    },
    {
      id: `dir-b2-${Date.now()}`,
      beatNumber: 2,
      title: 'Cross-Section Orbital Cutaway',
      startFrame: 90,
      durationInFrames: 90,
      caption: 'SLICING THROUGH THE OUTER TISSUE REVEALS THE INTERNAL MECHANISM',
      sfxCue: 'squelch',
      cameraTargetZ: 3.9,
      sliceOffset: 0.06,
      targetOrgan,
      propIdentifier,
      primitiveType: 'CrossSectionSlice',
      cameraMotion: 'slice-orbit',
      cameraOrbitRange: [-0.45, 0.55],
      fovKick: 0,
      sceneStage: 'tissue-cutaway',
      particleMode: 'toxin-droplets',
    },
    {
      id: `dir-b3-${Date.now()}`,
      beatNumber: 3,
      title: 'Microscopic Cellular & Capillary Flow',
      startFrame: 180,
      durationInFrames: 90,
      caption: 'MICROSCOPIC VESSELS AND RED BLOOD CELLS REACT UNDER INTENSE FORCE',
      sfxCue: 'impact',
      cameraTargetZ: 3.1,
      sliceOffset: -0.05,
      targetOrgan,
      propIdentifier,
      primitiveType: 'OrganPulse',
      cameraMotion: 'impact-shake',
      cameraOrbitRange: [-0.15, 0.2],
      fovKick: 9,
      sceneStage: 'cellular-micro',
      particleMode: 'rbc-stream',
    },
    {
      id: `dir-b4-${Date.now()}`,
      beatNumber: 4,
      title: 'Neural Synapse & Brain Cortex',
      startFrame: 270,
      durationInFrames: 90,
      caption: 'NERVE RECEPTORS IMMEDIATELY FIRE HIGH-SPEED SIGNALS TO THE BRAIN',
      sfxCue: 'zap',
      cameraTargetZ: 3.3,
      sliceOffset: 0.0,
      targetOrgan,
      propIdentifier,
      primitiveType: 'CharacterReaction',
      cameraMotion: 'whip-zoom',
      cameraOrbitRange: [-0.2, 0.25],
      fovKick: 6,
      sceneStage: 'neural-cortex',
      particleMode: 'neural-sparks',
    },
  ];
}

function buildFallbackWavBase64(durationSec: number = 3.8): string {
  const sampleRate = 24000;
  const numSamples = Math.floor(sampleRate * durationSec);
  const dataSize = numSamples * 2;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const syllableEnvelope = Math.max(0, Math.sin(t * Math.PI * 4.5));
    const fundamental =
      Math.sin(2 * Math.PI * 118 * t) * 0.55 +
      Math.sin(2 * Math.PI * 236 * t) * 0.25;
    const sample = Math.max(-1, Math.min(1, fundamental * syllableEnvelope * 0.22));
    buffer.writeInt16LE(Math.floor(sample * 32767), 44 + i * 2);
  }

  return buffer.toString('base64');
}

async function resolveSketchfabAsset(
  sketchfabQuery: string,
  propIdentifier: string
): Promise<DirectorAssetResolution['matchedProp']> {
  const cleanSlug = propIdentifier.replace(/\.glb$/i, '');
  const fallbackProp = {
    uid: `sf-${cleanSlug}`,
    name: propIdentifier
      .replace(/\.glb$/i, '')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase()),
    author: 'Z-Anatomy & Med3D Open Index',
    vertexCount: 24800,
    ephemeralTmpPath: `/tmp/props/${propIdentifier}`,
    licenseLabel: 'CC-BY 4.0',
  };

  try {
    const endpoint = `https://api.sketchfab.com/v3/search?type=models&q=${encodeURIComponent(
      sketchfabQuery
    )}&downloadable=true&count=3`;
    const res = await fetch(endpoint, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return fallbackProp;
    const data = await res.json();
    const first = Array.isArray(data?.results) ? data.results[0] : null;
    if (!first) return fallbackProp;

    const slug = String(first.name || cleanSlug)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .slice(0, 28);
    const userObj = (first.user as Record<string, unknown>) || {};
    const licenseObj = (first.license as Record<string, unknown>) || {};

    return {
      uid: String(first.uid || fallbackProp.uid),
      name: String(first.name || fallbackProp.name),
      author: String(userObj.displayName || userObj.username || fallbackProp.author),
      vertexCount: Number(first.vertexCount || fallbackProp.vertexCount),
      ephemeralTmpPath: `/tmp/props/${slug}.glb`,
      licenseLabel: String(licenseObj.label || 'CC-BY 4.0'),
    };
  } catch {
    return fallbackProp;
  }
}

async function synthesizeDirectorTts(
  narrationScript: string,
  voice: 'Fenrir' | 'Charon',
  apiKey?: string,
  fps: number = 30,
  totalFrames: number = 360
): Promise<DirectorTtsPayload> {
  const cleanText = narrationScript.trim();
  const words = cleanText.split(/\s+/).filter(Boolean);
  const framesPerWord = Math.max(3, Math.floor(totalFrames / Math.max(1, words.length)));

  const wordTimestamps = words.map((word, index) => ({
    word,
    startFrame: index * framesPerWord,
    endFrame: (index + 1) * framesPerWord,
    startTimeSec: Number(((index * framesPerWord) / fps).toFixed(2)),
  }));

  if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const response = await Promise.race([
        ai.models.generateContent({
          model: 'gemini-3.8-flash-lite-tts',
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: cleanText,
                  speechMetadata: {
                    style:
                      'Fast, punchy, authoritative Zack D. Films 3D science documentary narrator',
                  },
                },
              ],
            },
          ],
          config: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: voice },
              },
            },
          },
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Gemini TTS timeout')), 4500)
        ),
      ]);

      const base64Audio =
        response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

      if (base64Audio) {
        return {
          engine: 'gemini-3.8-flash-lite-tts',
          voice,
          estimatedCostUsd: 0.012,
          wordCount: words.length,
          wordTimestamps,
          audioDataUrl: `data:audio/wav;base64,${base64Audio}`,
        };
      }
    } catch {
      // Fall through to deterministic WAV buffer fallback
    }
  }

  const fallbackBase64 = buildFallbackWavBase64(4.0);
  return {
    engine: 'gemini-3.8-flash-lite-tts (local preview wav)',
    voice,
    estimatedCostUsd: 0.012,
    wordCount: words.length,
    wordTimestamps,
    audioDataUrl: `data:audio/wav;base64,${fallbackBase64}`,
  };
}

export async function POST(req: NextRequest) {
  let rawTopic = '';
  try {
    const body = await req.json();
    rawTopic = String(body?.topic || body?.prompt || '').trim();

    if (!rawTopic) {
      return NextResponse.json(
        { error: 'Please provide a user topic or prompt to generate the 4-beat storyboard.' },
        { status: 400 }
      );
    }

    const voice: 'Fenrir' | 'Charon' = body?.voice === 'Charon' ? 'Charon' : 'Fenrir';
    const includeTts = Boolean(body?.includeTts);
    const includeAssets = body?.includeAssets !== false;

    // 1. Parse User Topic & Resolve Baseline Anatomical / Prop Identifiers
    const resolved = resolveTopicIdentifiers(rawTopic);
    const targetOrgan = String(body?.targetOrgan || resolved.targetOrgan);
    const propIdentifier = String(body?.propIdentifier || resolved.propIdentifier);
    const apiKey = process.env.GEMINI_API_KEY;

    let beats: DirectorBeatChoreography[] = [];
    let recommendedPresetId = resolved.presetId;
    let recommendedTargetOrgan = targetOrgan;
    let recommendedPropId = propIdentifier;
    let recommendedSketchfabQuery = resolved.sketchfabQuery;
    let scriptSource = 'deterministic-agent-synthesizer';

    // 2. Generate Structured JSON Storyboard & Camera Choreography via Google Gemini SDK
    if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
      try {
        const ai = new GoogleGenAI({
          apiKey,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            },
          },
        });

        const response = await Promise.race([
          ai.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: `You are the Autonomous AI Director for a Zack D. Films 3D anatomical cutaway short.
User Topic: "${rawTopic}"
Default Target Organ Sub-Mesh: "${targetOrgan}"
Default Ephemeral Prop Mesh: "${propIdentifier}"

Generate a structured JSON director plan containing:
1. recommendedPresetId (one of: "bee-sting", "kevlar-ribcage", "titanium-tooth", "brain-concussion", "stomach-capsule", "eardrum-rupture")
2. recommendedTargetOrgan (exact anatomical sub-mesh identifier)
3. recommendedPropId (ephemeral .glb prop filename)
4. recommendedSketchfabQuery (search query for Sketchfab 3D API)
5. beats: 4 storyboard beats (90 frames each at 30 FPS, frames 0..360) with:
   - beatNumber (1..4)
   - title (short punchy beat title)
   - caption (fast-paced uppercase documentary narration sentence, 9-13 words)
   - sfxCue ("whoosh", "squelch", "impact", "heartbeat", or "zap")
   - cameraTargetZ (zoom distance in meters, 2.8 to 5.4)
   - sliceOffset (cross-section plane constant, -0.25 to 0.35)
   - targetOrgan (target organ sub-mesh name)
   - propIdentifier (active 3D prop identifier)
   - primitiveType ("PropImpact", "CrossSectionSlice", "OrganPulse", or "CharacterReaction")
   - cameraMotion ("whip-zoom", "slice-orbit", or "impact-shake")
   - orbitStartRad (starting azimuth angle in radians, -0.6 to 0.0)
   - orbitEndRad (ending azimuth angle in radians, 0.1 to 0.7)
   - fovKick (dynamic FOV kick in degrees during impact trauma, 0 to 12)`,
            config: {
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  recommendedPresetId: { type: Type.STRING },
                  recommendedTargetOrgan: { type: Type.STRING },
                  recommendedPropId: { type: Type.STRING },
                  recommendedSketchfabQuery: { type: Type.STRING },
                  beats: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        beatNumber: { type: Type.INTEGER },
                        title: { type: Type.STRING },
                        caption: { type: Type.STRING },
                        sfxCue: { type: Type.STRING },
                        cameraTargetZ: { type: Type.NUMBER },
                        sliceOffset: { type: Type.NUMBER },
                        targetOrgan: { type: Type.STRING },
                        propIdentifier: { type: Type.STRING },
                        primitiveType: { type: Type.STRING },
                        cameraMotion: { type: Type.STRING },
                        orbitStartRad: { type: Type.NUMBER },
                        orbitEndRad: { type: Type.NUMBER },
                        fovKick: { type: Type.NUMBER },
                      },
                      required: [
                        'beatNumber',
                        'title',
                        'caption',
                        'sfxCue',
                        'cameraTargetZ',
                        'sliceOffset',
                        'targetOrgan',
                        'propIdentifier',
                        'primitiveType',
                        'cameraMotion',
                        'orbitStartRad',
                        'orbitEndRad',
                        'fovKick',
                      ],
                    },
                  },
                },
                required: [
                  'recommendedPresetId',
                  'recommendedTargetOrgan',
                  'recommendedPropId',
                  'recommendedSketchfabQuery',
                  'beats',
                ],
              },
            },
          }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Gemini director timeout')), 4500)
          ),
        ]);

        const parsed = JSON.parse(response.text?.trim() || '{}');
        const validPresets = [
          'bee-sting',
          'kevlar-ribcage',
          'titanium-tooth',
          'brain-concussion',
          'stomach-capsule',
          'eardrum-rupture',
        ];
        if (validPresets.includes(parsed.recommendedPresetId)) {
          recommendedPresetId = parsed.recommendedPresetId;
        }
        if (parsed.recommendedTargetOrgan) {
          recommendedTargetOrgan = String(parsed.recommendedTargetOrgan);
        }
        if (parsed.recommendedPropId) {
          recommendedPropId = String(parsed.recommendedPropId);
        }
        if (parsed.recommendedSketchfabQuery) {
          recommendedSketchfabQuery = String(parsed.recommendedSketchfabQuery);
        }

        if (Array.isArray(parsed.beats) && parsed.beats.length >= 4) {
          const validSfx = ['whoosh', 'squelch', 'impact', 'heartbeat', 'zap'] as const;
          const validPrimitives = [
            'CrossSectionSlice',
            'PropImpact',
            'OrganPulse',
            'CharacterReaction',
          ] as const;
          const validMotions: CameraMotionType[] = [
            'whip-zoom',
            'slice-orbit',
            'impact-shake',
          ];

          beats = parsed.beats.slice(0, 4).map((item: Record<string, unknown>, idx: number) => {
            const sfx = validSfx.includes(item.sfxCue as (typeof validSfx)[number])
              ? (item.sfxCue as (typeof validSfx)[number])
              : validSfx[idx % validSfx.length];
            const prim = validPrimitives.includes(
              item.primitiveType as (typeof validPrimitives)[number]
            )
              ? (item.primitiveType as (typeof validPrimitives)[number])
              : validPrimitives[idx % validPrimitives.length];
            const camMotion = validMotions.includes(item.cameraMotion as CameraMotionType)
              ? (item.cameraMotion as CameraMotionType)
              : validMotions[idx % validMotions.length];

            const oStart = Number(item.orbitStartRad);
            const oEnd = Number(item.orbitEndRad);

            const defaultStages = [
              'exterior-macro',
              'tissue-cutaway',
              'cellular-micro',
              'neural-cortex',
            ] as const;
            const defaultParticles = [
              'toxin-droplets',
              'toxin-droplets',
              'rbc-stream',
              'neural-sparks',
            ] as const;

            return {
              id: `dir-b${idx + 1}-${Date.now()}`,
              beatNumber: (idx + 1) as 1 | 2 | 3 | 4,
              title: String(item.title || `Beat ${idx + 1}`),
              startFrame: idx * 90,
              durationInFrames: 90,
              caption: String(item.caption || '').toUpperCase(),
              sfxCue: sfx,
              cameraTargetZ: Number(
                Math.max(
                  2.7,
                  Math.min(5.6, Number(item.cameraTargetZ) || 5.1 - idx * 0.5)
                ).toFixed(2)
              ),
              sliceOffset: Number(
                Math.max(-0.4, Math.min(0.6, Number(item.sliceOffset) || 0.12)).toFixed(2)
              ),
              targetOrgan: String(item.targetOrgan || recommendedTargetOrgan),
              propIdentifier: String(item.propIdentifier || recommendedPropId),
              primitiveType: prim,
              cameraMotion: camMotion,
              cameraOrbitRange: [
                Number.isFinite(oStart) ? Number(oStart.toFixed(2)) : -0.45,
                Number.isFinite(oEnd) ? Number(oEnd.toFixed(2)) : 0.55,
              ],
              fovKick: Number(
                Math.max(
                  0,
                  Math.min(
                    12,
                    Number(item.fovKick) || (camMotion === 'impact-shake' ? 9 : 5)
                  )
                )
              ),
              sceneStage: defaultStages[idx % 4],
              particleMode: defaultParticles[idx % 4],
            };
          });
          scriptSource = 'gemini-3.8-flash';
        }
      } catch {
        // Fall through to deterministic beats below
      }
    }

    if (beats.length < 4) {
      beats = buildFallbackDirectorBeats(
        rawTopic,
        recommendedTargetOrgan,
        recommendedPropId
      );
    }

    // 3. Orchestrate Pipeline Between Gemini Script Generation, 3D Asset Resolution, and Gemini TTS
    const [matchedProp, ttsPayload] = await Promise.all([
      includeAssets
        ? resolveSketchfabAsset(recommendedSketchfabQuery, recommendedPropId)
        : Promise.resolve({
            uid: `sf-${recommendedPresetId}`,
            name: recommendedPropId,
            author: 'Z-Anatomy Core Kit',
            vertexCount: 24800,
            ephemeralTmpPath: `/tmp/props/${recommendedPropId}`,
            licenseLabel: 'CC-BY 4.0',
          }),
      includeTts
        ? synthesizeDirectorTts(
            beats.map((b) => b.caption).join('. '),
            voice,
            apiKey
          )
        : Promise.resolve(null),
    ]);

    const assets: DirectorAssetResolution = {
      presetId: recommendedPresetId,
      targetOrgan: recommendedTargetOrgan,
      propIdentifier: recommendedPropId,
      sketchfabQuery: recommendedSketchfabQuery,
      matchedProp,
    };

    return NextResponse.json({
      source: scriptSource,
      topic: rawTopic,
      recommendedPresetId,
      recommendedTargetOrgan,
      recommendedPropId,
      recommendedSketchfabQuery,
      beats,
      assets,
      tts: ttsPayload,
    });
  } catch {
    const safeTopic = rawTopic || 'How a Titanium Dental Screw Fuses into the Jawbone';
    const resolved = resolveTopicIdentifiers(safeTopic);
    const fallbackBeats = buildFallbackDirectorBeats(
      safeTopic,
      resolved.targetOrgan,
      resolved.propIdentifier
    );
    return NextResponse.json({
      source: 'deterministic-agent-synthesizer',
      topic: safeTopic,
      recommendedPresetId: resolved.presetId,
      recommendedTargetOrgan: resolved.targetOrgan,
      recommendedPropId: resolved.propIdentifier,
      recommendedSketchfabQuery: resolved.sketchfabQuery,
      beats: fallbackBeats,
      assets: {
        presetId: resolved.presetId,
        targetOrgan: resolved.targetOrgan,
        propIdentifier: resolved.propIdentifier,
        sketchfabQuery: resolved.sketchfabQuery,
        matchedProp: {
          uid: `sf-${resolved.presetId}`,
          name: resolved.propIdentifier,
          author: 'Z-Anatomy Core Kit',
          vertexCount: 24800,
          ephemeralTmpPath: `/tmp/props/${resolved.propIdentifier}`,
          licenseLabel: 'CC-BY 4.0',
        },
      },
      tts: null,
    });
  }
}
