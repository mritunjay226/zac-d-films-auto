import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';
import { type StoryboardBeat, type CameraMotionType } from '@/lib/remotion-math';

function matchPresetFromPrompt(prompt: string): {
  presetId: string;
  targetOrgan: string;
  sketchfabQuery: string;
} {
  const p = prompt.toLowerCase();
  if (p.includes('tooth') || p.includes('dental') || p.includes('jaw') || p.includes('root canal') || p.includes('implant')) {
    return {
      presetId: 'titanium-tooth',
      targetOrgan: 'Mandible_Cortical_Plate',
      sketchfabQuery: 'dental titanium implant tooth',
    };
  }
  if (p.includes('bullet') || p.includes('kevlar') || p.includes('heart') || p.includes('pacemaker') || p.includes('rib') || p.includes('chest')) {
    return {
      presetId: 'kevlar-ribcage',
      targetOrgan: 'Heart_Myocardium',
      sketchfabQuery: 'human heart ribcage anatomy',
    };
  }
  if (p.includes('brain') || p.includes('skull') || p.includes('concussion') || p.includes('head') || p.includes('neuron')) {
    return {
      presetId: 'brain-concussion',
      targetOrgan: 'Cerebral_Cortex',
      sketchfabQuery: 'human brain skull sagittal',
    };
  }
  if (p.includes('stomach') || p.includes('pill') || p.includes('capsule') || p.includes('acid') || p.includes('digest')) {
    return {
      presetId: 'stomach-capsule',
      targetOrgan: 'Gastric_Fundus_Wall',
      sketchfabQuery: 'pill capsule stomach anatomy',
    };
  }
  if (p.includes('ear') || p.includes('sound') || p.includes('hearing') || p.includes('cochlea') || p.includes('loud')) {
    return {
      presetId: 'eardrum-rupture',
      targetOrgan: 'Tympanic_Membrane',
      sketchfabQuery: 'inner ear cochlea eardrum',
    };
  }
  return {
    presetId: 'bee-sting',
    targetOrgan: 'Dermis_Layer',
    sketchfabQuery: 'honeybee stinger skin anatomy',
  };
}

function buildDeterministicFallbackBeats(
  prompt: string,
  targetOrgan: string
): StoryboardBeat[] {
  const cleanTopic = prompt.trim() || 'How a Surgical Implant Fuses to Human Bone';
  const upperTopic = cleanTopic.toUpperCase();
  return [
    {
      id: `gen-b1-${Date.now()}`,
      beatNumber: 1,
      title: 'Macro Whip-Pan Entry',
      startFrame: 0,
      durationInFrames: 90,
      caption: `WHAT ACTUALLY HAPPENS INSIDE YOUR BODY DURING ${upperTopic.slice(0, 42)}`,
      sfxCue: 'whoosh',
      cameraTargetZ: 5.1,
      sliceOffset: 0.22,
      targetOrgan,
      primitiveType: 'PropImpact',
      cameraMotion: 'whip-zoom',
      fovKick: 6,
    },
    {
      id: `gen-b2-${Date.now()}`,
      beatNumber: 2,
      title: 'Cross-Section Orbital Cutaway',
      startFrame: 90,
      durationInFrames: 90,
      caption: 'SLICING THROUGH THE OUTER TISSUE REVEALS THE INTERNAL MECHANISM',
      sfxCue: 'squelch',
      cameraTargetZ: 3.9,
      sliceOffset: 0.06,
      targetOrgan,
      primitiveType: 'CrossSectionSlice',
      cameraMotion: 'slice-orbit',
      cameraOrbitRange: [-0.45, 0.55],
    },
    {
      id: `gen-b3-${Date.now()}`,
      beatNumber: 3,
      title: 'Impact Trauma & Cellular Compression',
      startFrame: 180,
      durationInFrames: 90,
      caption: 'MICROSCOPIC VESSELS AND FIBERS REACT UNDER INTENSE MECHANICAL FORCE',
      sfxCue: 'impact',
      cameraTargetZ: 3.1,
      sliceOffset: -0.05,
      targetOrgan,
      primitiveType: 'OrganPulse',
      cameraMotion: 'impact-shake',
      fovKick: 9,
    },
    {
      id: `gen-b4-${Date.now()}`,
      beatNumber: 4,
      title: 'Neural Synapse Whip-Zoom',
      startFrame: 270,
      durationInFrames: 90,
      caption: 'NERVE RECEPTORS IMMEDIATELY FIRE HIGH-SPEED SIGNALS TO THE BRAIN',
      sfxCue: 'zap',
      cameraTargetZ: 3.3,
      sliceOffset: 0.0,
      targetOrgan,
      primitiveType: 'CharacterReaction',
      cameraMotion: 'whip-zoom',
      fovKick: 6,
    },
  ];
}

export async function POST(req: NextRequest) {
  let prompt = '';
  try {
    const body = await req.json();
    prompt = String(body?.prompt || '');

    if (!prompt.trim()) {
      return NextResponse.json(
        { error: 'Please provide a topic prompt to generate a 4-beat 3D storyboard.' },
        { status: 400 }
      );
    }

    const matched = matchPresetFromPrompt(prompt);
    const targetOrgan: string = body?.targetOrgan || matched.targetOrgan;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      const fallbackBeats = buildDeterministicFallbackBeats(prompt, targetOrgan);
      return NextResponse.json({
        source: 'deterministic-agent-synthesizer',
        topic: prompt,
        recommendedPresetId: matched.presetId,
        recommendedTargetOrgan: matched.targetOrgan,
        recommendedSketchfabQuery: matched.sketchfabQuery,
        beats: fallbackBeats,
      });
    }

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
        contents: `You are the AI Director for a Zack D. Films 3D anatomical cutaway short.
Topic: "${prompt}"
Target primary organ sub-mesh: "${targetOrgan}"
Generate a 4-beat storyboard (each beat is 90 frames at 30 FPS, total 360 frames).
For each beat, specify:
- beatNumber (1..4)
- title (short punchy beat title)
- caption (fast-paced uppercase documentary narration sentence, 9-13 words)
- sfxCue (whoosh, squelch, impact, heartbeat, or zap)
- cameraTargetZ (2.8 to 5.4)
- sliceOffset (-0.2 to 0.35)
- primitiveType (PropImpact, CrossSectionSlice, OrganPulse, or CharacterReaction)
- cameraMotion (whip-zoom, slice-orbit, or impact-shake)`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
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
                primitiveType: { type: Type.STRING },
                cameraMotion: {
                  type: Type.STRING,
                  description: 'One of: whip-zoom, slice-orbit, impact-shake',
                },
              },
              required: [
                'beatNumber',
                'title',
                'caption',
                'sfxCue',
                'cameraTargetZ',
                'sliceOffset',
                'primitiveType',
                'cameraMotion',
              ],
            },
          },
        },
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Gemini timeout')), 4500)
      ),
    ]);

    const rawText = response.text?.trim() || '[]';
    const parsed = JSON.parse(rawText);

    if (!Array.isArray(parsed) || parsed.length < 4) {
      return NextResponse.json({
        source: 'deterministic-agent-synthesizer',
        topic: prompt,
        recommendedPresetId: matched.presetId,
        recommendedTargetOrgan: matched.targetOrgan,
        recommendedSketchfabQuery: matched.sketchfabQuery,
        beats: buildDeterministicFallbackBeats(prompt, targetOrgan),
      });
    }

    const validSfx = ['whoosh', 'squelch', 'impact', 'heartbeat', 'zap'] as const;
    const validPrimitives = [
      'CrossSectionSlice',
      'PropImpact',
      'OrganPulse',
      'CharacterReaction',
    ] as const;
    const validCameraMotions: CameraMotionType[] = [
      'whip-zoom',
      'slice-orbit',
      'impact-shake',
    ];

    const beats: StoryboardBeat[] = parsed.slice(0, 4).map((item, idx) => {
      const sfx = validSfx.includes(item.sfxCue) ? item.sfxCue : validSfx[idx % validSfx.length];
      const prim = validPrimitives.includes(item.primitiveType)
        ? item.primitiveType
        : validPrimitives[idx % validPrimitives.length];
      const camMotion: CameraMotionType = validCameraMotions.includes(item.cameraMotion)
        ? item.cameraMotion
        : validCameraMotions[idx % validCameraMotions.length];

      return {
        id: `ai-b${idx + 1}-${Date.now()}`,
        beatNumber: (idx + 1) as 1 | 2 | 3 | 4,
        title: String(item.title || `Beat ${idx + 1}`),
        startFrame: idx * 90,
        durationInFrames: 90,
        caption: String(item.caption || '').toUpperCase(),
        sfxCue: sfx,
        cameraTargetZ: Number(
          Math.max(2.7, Math.min(5.6, Number(item.cameraTargetZ) || 5.1 - idx * 0.5)).toFixed(2)
        ),
        sliceOffset: Number(
          Math.max(-0.4, Math.min(0.6, Number(item.sliceOffset) || 0.12)).toFixed(2)
        ),
        targetOrgan,
        primitiveType: prim,
        cameraMotion: camMotion,
        cameraOrbitRange: [-0.45, 0.55],
        fovKick: camMotion === 'impact-shake' ? 9 : 5,
      };
    });

    return NextResponse.json({
      source: 'gemini-3.8-flash',
      topic: prompt,
      recommendedPresetId: matched.presetId,
      recommendedTargetOrgan: matched.targetOrgan,
      recommendedSketchfabQuery: matched.sketchfabQuery,
      beats,
    });
  } catch {
    const safeTopic = prompt.trim() || 'Titanium Dental Screw Implant';
    const matched = matchPresetFromPrompt(safeTopic);
    return NextResponse.json({
      source: 'deterministic-agent-synthesizer',
      topic: safeTopic,
      recommendedPresetId: matched.presetId,
      recommendedTargetOrgan: matched.targetOrgan,
      recommendedSketchfabQuery: matched.sketchfabQuery,
      beats: buildDeterministicFallbackBeats(safeTopic, matched.targetOrgan),
    });
  }
}
