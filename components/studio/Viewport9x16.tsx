'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  Play,
  Pause,
  RotateCcw,
  Download,
  Film,
  Volume2,
  VolumeX,
  Crosshair,
  Video,
  Sparkles,
} from 'lucide-react';
import {
  type AnatomicalPreset,
  type StoryboardBeat,
  type SceneStageType,
  getActiveBeatAtFrame,
  getWordByWordCaptionState,
  computeDeterministicSpring,
  computeOrganPulseScale,
  computeCameraChoreography,
  resolveBeatSceneStage,
  resolveBeatParticleMode,
  SCENE_STAGE_LABELS,
  interpolateFrame,
} from '@/lib/remotion-math';
import {
  buildAnatomicalRig,
  updateMultiSceneParticles,
  type BuiltAnatomicalRig,
} from '@/lib/procedural-anatomy-builder';
import { sfxEngine } from '@/lib/web-audio-sfx';
import { SceneCompositionOverlay } from '@/remotion/SceneComposition';

export interface SubMeshTelemetryItem {
  name: string;
  visible: boolean;
  vertices: number;
  boxCenter: [number, number, number];
}

interface Viewport9x16Props {
  preset: AnatomicalPreset;
  beats: StoryboardBeat[];
  currentFrame: number;
  isPlaying: boolean;
  onFrameChange: (frame: number | ((prev: number) => number)) => void;
  onTogglePlay: () => void;
  sliceAxis: 'x' | 'y' | 'z';
  manualSliceOffset: number | null;
  skinOpacity: number;
  pulseFrequency: number;
  pulseAmplitude: number;
  visibilityMap: Record<string, boolean>;
  externalGlbUrl: string | null;
  externalGlbName: string | null;
  onClearExternalGlb: () => void;
  onSubMeshesDetected: (items: SubMeshTelemetryItem[]) => void;
  onTargetCenterComputed: (center: [number, number, number]) => void;
  onExportTsx: () => void;
  narratorVoiceLabel?: string | null;
}

// Pre-allocated scratch math objects outside render loop (zero GC)
const _tempBox = new THREE.Box3();
const _tempCenter = new THREE.Vector3();
const _tempSize = new THREE.Vector3();
const _tempLookAt = new THREE.Vector3();

const ALL_SCENE_STAGES: SceneStageType[] = [
  'exterior-macro',
  'tissue-cutaway',
  'cellular-micro',
  'neural-cortex',
];

export const Viewport9x16: React.FC<Viewport9x16Props> = ({
  preset,
  beats,
  currentFrame,
  isPlaying,
  onFrameChange,
  onTogglePlay,
  sliceAxis,
  manualSliceOffset,
  skinOpacity,
  pulseFrequency,
  pulseAmplitude,
  visibilityMap,
  externalGlbUrl,
  externalGlbName,
  onClearExternalGlb,
  onSubMeshesDetected,
  onTargetCenterComputed,
  onExportTsx,
  narratorVoiceLabel,
}) => {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const webglCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [audioMuted, setAudioMuted] = useState(false);
  const [isRecordingWebm, setIsRecordingWebm] = useState(false);
  const [recordProgress, setRecordProgress] = useState(0);
  const [glbLoadingStatus, setGlbLoadingStatus] = useState<string | null>(null);
  const [activeClipCount, setActiveClipCount] = useState(0);

  const targetOrganCenterRef = useRef<[number, number, number]>([0, 0.05, 0]);

  // Store mutable props in ref so WebGL loop never tears down on state changes
  const stateRef = useRef({
    preset,
    beats,
    currentFrame,
    isPlaying,
    sliceAxis,
    manualSliceOffset,
    skinOpacity,
    pulseFrequency,
    pulseAmplitude,
    visibilityMap,
    audioMuted,
    externalGlbUrl,
  });

  useEffect(() => {
    stateRef.current = {
      preset,
      beats,
      currentFrame,
      isPlaying,
      sliceAxis,
      manualSliceOffset,
      skinOpacity,
      pulseFrequency,
      pulseAmplitude,
      visibilityMap,
      audioMuted,
      externalGlbUrl,
    };
  }, [
    preset,
    beats,
    currentFrame,
    isPlaying,
    sliceAxis,
    manualSliceOffset,
    skinOpacity,
    pulseFrequency,
    pulseAmplitude,
    visibilityMap,
    audioMuted,
    externalGlbUrl,
  ]);

  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const clipPlaneRef = useRef<THREE.Plane>(new THREE.Plane(new THREE.Vector3(0, 0, -1), 0.5));
  const rigRootRef = useRef<THREE.Group | null>(null);
  const builtRigRef = useRef<BuiltAnatomicalRig | null>(null);
  const propGroupRef = useRef<THREE.Group | null>(null);
  const pulseTargetsRef = useRef<THREE.Object3D[]>([]);
  const skinMeshesRef = useRef<THREE.Mesh[]>([]);
  const clipCapMeshRef = useRef<THREE.Mesh | null>(null);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const orbitAnglesRef = useRef({ theta: 0.32, phi: 0.14, isDragging: false, lastX: 0, lastY: 0 });
  const lastTriggeredBeatRef = useRef<number>(-1);

  // Advance deterministic frame counter at 30 FPS when playing
  useEffect(() => {
    if (!isPlaying) return;
    const interval = window.setInterval(() => {
      onFrameChange((prev) => (prev + 1) % 360);
    }, 1000 / 30);
    return () => window.clearInterval(interval);
  }, [isPlaying, onFrameChange]);

  // Trigger synthesized Web Audio SFX (including Whip-Pan Whoosh on scene cut) & Gemini TTS Narrator
  useEffect(() => {
    if (!isPlaying || audioMuted) return;
    if (currentFrame === 0 && sfxEngine.hasNarratorTrack()) {
      sfxEngine.playNarratorFromOffset(0);
    }
    const activeBeat = getActiveBeatAtFrame(beats, currentFrame);
    if (
      activeBeat.beatNumber !== lastTriggeredBeatRef.current &&
      currentFrame >= activeBeat.startFrame &&
      currentFrame <= activeBeat.startFrame + 4
    ) {
      lastTriggeredBeatRef.current = activeBeat.beatNumber;
      if (activeBeat.sfxCue !== 'whoosh') {
        sfxEngine.triggerSfx('whoosh');
      }
      sfxEngine.triggerSfx(activeBeat.sfxCue);
    }
  }, [currentFrame, isPlaying, audioMuted, beats]);

  // Initialize persistent Three.js WebGLRenderer & 4-Point Subsurface Studio Lighting once
  useEffect(() => {
    const mount = canvasMountRef.current;
    if (!mount) return;

    const isHeadless =
      typeof navigator !== 'undefined' &&
      (navigator.webdriver || /HeadlessChrome/i.test(navigator.userAgent));

    const width = 324;
    const height = 576;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x080b12);
    scene.fog = new THREE.FogExp2(0x080b12, 0.075);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    camera.position.set(0.6, 0.35, 4.6);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      antialias: !isHeadless,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isHeadless ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;
    renderer.localClippingEnabled = true;
    renderer.shadowMap.enabled = !isHeadless;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    renderer.domElement.className = 'w-full h-full block cursor-grab active:cursor-grabbing';
    webglCanvasRef.current = renderer.domElement;
    mount.innerHTML = '';
    mount.appendChild(renderer.domElement);

    if (!isHeadless) {
      try {
        const pmremGenerator = new THREE.PMREMGenerator(renderer);
        scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
        pmremGenerator.dispose();
      } catch {
        // Fallback if PMREM fails in restricted WebGL context
      }
    }

    const hemiLight = new THREE.HemisphereLight(0xe0f2fe, 0x1e1b4b, 0.9);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff7ed, 2.25);
    keyLight.position.set(3.5, 5.2, 4.5);
    if (!isHeadless) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.set(1024, 1024);
      keyLight.shadow.bias = -0.0005;
    }
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.35);
    rimLight.position.set(-3.8, 2.0, -3.2);
    scene.add(rimLight);

    // Warm Subsurface Back-Scatter Point Light for organic tissue transmission
    const sssLight = new THREE.PointLight(0xf43f5e, 1.8, 6.5, 1.8);
    sssLight.position.set(0, 0.1, -0.8);
    scene.add(sssLight);

    const shadowDisc = new THREE.Mesh(
      new THREE.CircleGeometry(1.65, 36),
      new THREE.MeshBasicMaterial({
        color: 0x020617,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
      })
    );
    shadowDisc.rotation.x = -Math.PI / 2;
    shadowDisc.position.y = -1.22;
    scene.add(shadowDisc);

    let animFrameId = 0;
    let lastRenderTime = 0;

    const renderLoop = (timestamp: number) => {
      animFrameId = window.requestAnimationFrame(renderLoop);
      if (isHeadless && timestamp - lastRenderTime < 66) {
        return;
      }
      lastRenderTime = timestamp;

      const st = stateRef.current;
      const frame = st.currentFrame;
      const activeBeat = getActiveBeatAtFrame(st.beats, frame);
      const activeStage = resolveBeatSceneStage(activeBeat);
      const activeParticleMode = resolveBeatParticleMode(activeBeat);

      // 1. Switch Active Multi-Scene Stage (Scene 1: Exterior -> Scene 2: Cutaway -> Scene 3: Cellular -> Scene 4: Brain)
      if (builtRigRef.current && !st.externalGlbUrl) {
        const rig = builtRigRef.current;
        for (const stageKey of ALL_SCENE_STAGES) {
          // Keep Tissue Cutaway visible underneath Exterior Macro so prop penetrates into layered tissue
          if (activeStage === 'exterior-macro') {
            rig.stageGroups[stageKey].visible =
              stageKey === 'exterior-macro' || stageKey === 'tissue-cutaway';
          } else {
            rig.stageGroups[stageKey].visible = stageKey === activeStage;
          }
        }
        if (rig.propGroup) {
          rig.propGroup.visible =
            activeStage === 'exterior-macro' || activeStage === 'tissue-cutaway';
        }

        // Update deterministic 3D InstancedMesh particles (Red Blood Cells, Droplets, Neural Sparks)
        updateMultiSceneParticles(rig, frame, activeStage, activeParticleMode);
      }

      // 2. Update CrossSectionSlice Plane normal & constant deterministically
      const plane = clipPlaneRef.current;
      if (st.sliceAxis === 'x') plane.normal.set(-1, 0, 0);
      else if (st.sliceAxis === 'y') plane.normal.set(0, -1, 0);
      else plane.normal.set(0, 0, -1);

      const beatLocalProgress = Math.max(
        0,
        Math.min(1, (frame - activeBeat.startFrame) / Math.max(1, activeBeat.durationInFrames))
      );
      const interpolatedSlice =
        st.manualSliceOffset !== null
          ? st.manualSliceOffset
          : activeStage === 'exterior-macro'
            ? 0.68
            : interpolateFrame(
                beatLocalProgress,
                [0, 1],
                [activeBeat.sliceOffset + 0.25, activeBeat.sliceOffset]
              );
      plane.constant = interpolatedSlice;

      if (clipCapMeshRef.current) {
        const cap = clipCapMeshRef.current;
        cap.visible = activeStage === 'tissue-cutaway';
        if (st.sliceAxis === 'x') {
          cap.rotation.set(0, Math.PI / 2, 0);
          cap.position.set(interpolatedSlice, 0, 0);
        } else if (st.sliceAxis === 'y') {
          cap.rotation.set(Math.PI / 2, 0, 0);
          cap.position.set(0, interpolatedSlice, 0);
        } else {
          cap.rotation.set(0, 0, 0);
          cap.position.set(0, 0, interpolatedSlice);
        }
      }

      // 3. Apply X-Ray Skin Opacity & Sub-Mesh Visibility Toggles
      for (const skinMesh of skinMeshesRef.current) {
        const mat = skinMesh.material as THREE.MeshPhysicalMaterial;
        if (mat) {
          mat.transparent = st.skinOpacity < 0.99;
          mat.opacity = st.skinOpacity;
        }
      }

      if (rigRootRef.current) {
        rigRootRef.current.traverse((obj) => {
          if (obj.name && Object.prototype.hasOwnProperty.call(st.visibilityMap, obj.name)) {
            obj.visible = st.visibilityMap[obj.name];
          }
        });
      }

      // 4. Apply PropImpact deterministic spring trajectory
      if (propGroupRef.current) {
        const springVal = computeDeterministicSpring(frame, 0, 30, 12, 120, 1);
        const entryOffset = (1 - springVal) * 1.15;
        if (st.preset.id === 'kevlar-ribcage') {
          propGroupRef.current.position.set(0, 0, entryOffset);
        } else if (st.preset.id === 'eardrum-rupture') {
          propGroupRef.current.position.set(-entryOffset, 0, 0);
        } else {
          propGroupRef.current.position.set(0, entryOffset, 0);
        }
      }

      // 5. Apply OrganPulse deterministic sinusoidal scale pulsing
      const pulseScale = computeOrganPulseScale(frame, st.pulseFrequency, st.pulseAmplitude);
      for (const target of pulseTargetsRef.current) {
        target.scale.setScalar(pulseScale);
      }

      // 6. Scrub GLTF AnimationMixer deterministically via mixer.setTime(frame / fps)
      if (mixerRef.current) {
        mixerRef.current.setTime(frame / 30);
      }

      // 7. Execute Zack D. Films 3D Camera Choreography & Whip-Pan Scene Transitions
      const orb = orbitAnglesRef.current;
      const choreo = computeCameraChoreography(activeBeat, frame, 30, orb.theta, orb.phi);

      if (Math.abs(camera.fov - choreo.fov) > 0.05) {
        camera.fov = choreo.fov;
        camera.updateProjectionMatrix();
      }

      const camX =
        Math.sin(choreo.theta) * Math.cos(choreo.phi) * choreo.radius + choreo.shakeOffset[0];
      const camY =
        Math.sin(choreo.phi) * choreo.radius + 0.12 + choreo.shakeOffset[1];
      const camZ =
        Math.cos(choreo.theta) * Math.cos(choreo.phi) * choreo.radius + choreo.shakeOffset[2];

      camera.position.lerp(_tempCenter.set(camX, camY, camZ), 0.34);

      const [tx, ty, tz] = targetOrganCenterRef.current;
      _tempLookAt.set(
        tx * choreo.lookAtPullFactor * 0.35 + choreo.shakeOffset[0] * 0.5,
        ty * choreo.lookAtPullFactor * 0.35 + 0.02 + choreo.shakeOffset[1] * 0.5,
        tz * choreo.lookAtPullFactor * 0.35
      );
      camera.lookAt(_tempLookAt);

      renderer.render(scene, camera);
    };

    animFrameId = window.requestAnimationFrame(renderLoop);

    return () => {
      window.cancelAnimationFrame(animFrameId);
      renderer.dispose();
    };
  }, []);

  // Rebuild Multi-Scene Procedural 3D Anatomical Rig or Load External Binary .GLB
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    if (rigRootRef.current) {
      scene.remove(rigRootRef.current);
      rigRootRef.current = null;
    }
    builtRigRef.current = null;
    mixerRef.current = null;
    setActiveClipCount(0);

    if (externalGlbUrl) {
      setGlbLoadingStatus(`Streaming binary GLTF: ${externalGlbName || 'model.glb'}...`);
      const loader = new GLTFLoader();
      loader.load(
        externalGlbUrl,
        (gltf) => {
          const model = gltf.scene;
          model.name = externalGlbName || 'Loaded_GLB_Root';

          _tempBox.setFromObject(model);
          _tempBox.getCenter(_tempCenter);
          _tempBox.getSize(_tempSize);
          const maxDim = Math.max(_tempSize.x, _tempSize.y, _tempSize.z, 0.001);
          const scaleFactor = 2.1 / maxDim;
          model.scale.setScalar(scaleFactor);
          model.position.set(
            -_tempCenter.x * scaleFactor,
            -_tempCenter.y * scaleFactor,
            -_tempCenter.z * scaleFactor
          );

          const detectedMeshes: SubMeshTelemetryItem[] = [];
          const skinList: THREE.Mesh[] = [];
          const pulseList: THREE.Object3D[] = [];

          model.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              const mesh = child as THREE.Mesh;
              if (!mesh.name) {
                mesh.name = `GLB_SubMesh_${detectedMeshes.length + 1}`;
              }
              const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
              materials.forEach((m) => {
                if (m) {
                  m.clippingPlanes = [clipPlaneRef.current];
                  m.clipShadows = true;
                  m.side = THREE.DoubleSide;
                }
              });

              _tempBox.setFromObject(mesh);
              _tempBox.getCenter(_tempCenter);
              const vertCount = mesh.geometry?.attributes?.position?.count || 1200;

              detectedMeshes.push({
                name: mesh.name,
                visible: true,
                vertices: vertCount,
                boxCenter: [
                  Number(_tempCenter.x.toFixed(2)),
                  Number(_tempCenter.y.toFixed(2)),
                  Number(_tempCenter.z.toFixed(2)),
                ],
              });

              if (detectedMeshes.length === 1) skinList.push(mesh);
              if (detectedMeshes.length === 2) pulseList.push(mesh);
            }
          });

          if (gltf.animations && gltf.animations.length > 0) {
            const mixer = new THREE.AnimationMixer(model);
            gltf.animations.forEach((clip) => {
              mixer.clipAction(clip).play();
            });
            mixerRef.current = mixer;
            setActiveClipCount(gltf.animations.length);
          }

          const wrapper = new THREE.Group();
          wrapper.add(model);
          scene.add(wrapper);
          rigRootRef.current = wrapper;
          propGroupRef.current = null;
          skinMeshesRef.current = skinList;
          pulseTargetsRef.current = pulseList;
          clipCapMeshRef.current = null;

          onSubMeshesDetected(detectedMeshes);
          if (detectedMeshes[0]) {
            targetOrganCenterRef.current = detectedMeshes[0].boxCenter;
            onTargetCenterComputed(detectedMeshes[0].boxCenter);
          }
          setGlbLoadingStatus(null);
        },
        undefined,
        () => {
          setGlbLoadingStatus('Binary GLB stream fallback — restored Z-Anatomy rig');
          onClearExternalGlb();
          setTimeout(() => setGlbLoadingStatus(null), 2500);
        }
      );
      return;
    }

    const built = buildAnatomicalRig(preset.id, clipPlaneRef.current);
    scene.add(built.rootGroup);
    rigRootRef.current = built.rootGroup;
    builtRigRef.current = built;
    propGroupRef.current = built.propGroup;
    pulseTargetsRef.current = built.pulseTargets;
    skinMeshesRef.current = built.skinMeshes;
    clipCapMeshRef.current = built.clipCapMesh;

    if (rendererRef.current && cameraRef.current) {
      rendererRef.current.compile(scene, cameraRef.current);
    }

    const telemetryItems: SubMeshTelemetryItem[] = preset.subMeshes.map((sm) => {
      const obj = built.rootGroup.getObjectByName(sm.name);
      if (obj) {
        _tempBox.setFromObject(obj);
        _tempBox.getCenter(_tempCenter);
        return {
          name: sm.name,
          visible: true,
          vertices: sm.vertices,
          boxCenter: [
            Number(_tempCenter.x.toFixed(2)),
            Number(_tempCenter.y.toFixed(2)),
            Number(_tempCenter.z.toFixed(2)),
          ],
        };
      }
      return {
        name: sm.name,
        visible: true,
        vertices: sm.vertices,
        boxCenter: sm.center,
      };
    });

    onSubMeshesDetected(telemetryItems);
    const primaryTarget =
      telemetryItems.find((t) => t.name === preset.targetMeshName) || telemetryItems[0];
    if (primaryTarget) {
      targetOrganCenterRef.current = primaryTarget.boxCenter;
      onTargetCenterComputed(primaryTarget.boxCenter);
    }
  }, [
    preset,
    externalGlbUrl,
    externalGlbName,
    onClearExternalGlb,
    onSubMeshesDetected,
    onTargetCenterComputed,
  ]);

  // Composite In-Browser .WebM Video Renderer (4-Scene Three.js WebGL + Burned-In Captions + Gemini TTS & SFX Audio)
  const handleRenderCompositeWebm = () => {
    if (isRecordingWebm || !webglCanvasRef.current) return;
    setIsRecordingWebm(true);
    setRecordProgress(0);

    const compositeCanvas = document.createElement('canvas');
    compositeCanvas.width = 540;
    compositeCanvas.height = 960;
    const ctx = compositeCanvas.getContext('2d');

    const canvasStream = compositeCanvas.captureStream(30);
    const audioStream = sfxEngine.getAudioStream();
    if (audioStream) {
      audioStream.getAudioTracks().forEach((track) => canvasStream.addTrack(track));
    }

    let recorder: MediaRecorder | null = null;
    const chunks: BlobPart[] = [];
    try {
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : 'video/webm';
      recorder = new MediaRecorder(canvasStream, { mimeType });
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${preset.id}-zack-3d-short.webm`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setIsRecordingWebm(false);
        setRecordProgress(0);
      };
      recorder.start();
    } catch {
      setIsRecordingWebm(false);
      return;
    }

    if (sfxEngine.hasNarratorTrack()) {
      sfxEngine.playNarratorFromOffset(0);
    }
    sfxEngine.triggerSfx('whoosh');

    let step = 0;
    const totalSteps = 60;
    const recordTimer = window.setInterval(() => {
      step++;
      const simFrame = Math.floor((step / totalSteps) * 359);
      onFrameChange(simFrame);
      setRecordProgress(Math.round((step / totalSteps) * 100));

      if (ctx && webglCanvasRef.current) {
        ctx.fillStyle = '#080b12';
        ctx.fillRect(0, 0, 540, 960);
        ctx.drawImage(webglCanvasRef.current, 0, 0, 540, 960);

        const beat = getActiveBeatAtFrame(stateRef.current.beats, simFrame);
        const { words, activeWordIndex } = getWordByWordCaptionState(beat, simFrame);
        ctx.font = '800 22px sans-serif';
        ctx.textAlign = 'center';
        const captionLine = words.join(' ');
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 6;
        ctx.strokeText(captionLine.slice(0, 38), 270, 840);
        ctx.fillStyle = '#facc15';
        ctx.fillText(words[activeWordIndex] || '', 270, 800);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(captionLine.slice(0, 38), 270, 840);
      }

      if (step >= totalSteps) {
        window.clearInterval(recordTimer);
        if (recorder && recorder.state !== 'inactive') {
          recorder.stop();
        }
      }
    }, 35);
  };

  const activeBeat = getActiveBeatAtFrame(beats, currentFrame);
  const currentChoreo = computeCameraChoreography(activeBeat, currentFrame, 30);
  const activeSceneStage = resolveBeatSceneStage(activeBeat);

  return (
    <div className="flex flex-col items-center">
      {/* Contrast-Framed Dark Stage Inside the Light UI */}
      <div
        data-testid="viewport-9x16-stage"
        className="relative w-[324px] h-[576px] bg-[#080b12] rounded-2xl border border-zinc-200 shadow-lg overflow-hidden select-none"
        onPointerDown={(e) => {
          orbitAnglesRef.current.isDragging = true;
          orbitAnglesRef.current.lastX = e.clientX;
          orbitAnglesRef.current.lastY = e.clientY;
        }}
        onPointerMove={(e) => {
          if (!orbitAnglesRef.current.isDragging) return;
          const dx = e.clientX - orbitAnglesRef.current.lastX;
          const dy = e.clientY - orbitAnglesRef.current.lastY;
          orbitAnglesRef.current.lastX = e.clientX;
          orbitAnglesRef.current.lastY = e.clientY;
          orbitAnglesRef.current.theta -= dx * 0.008;
          orbitAnglesRef.current.phi = Math.max(
            -0.65,
            Math.min(0.75, orbitAnglesRef.current.phi + dy * 0.006)
          );
        }}
        onPointerUp={() => {
          orbitAnglesRef.current.isDragging = false;
        }}
        onPointerLeave={() => {
          orbitAnglesRef.current.isDragging = false;
        }}
      >
        {/* Top Floating Studio HUD Overlay (No backdrop-blur over WebGL) */}
        <div className="absolute top-3 inset-x-3 z-10 flex flex-col gap-1.5 pointer-events-none">
          <div className="flex items-center justify-between">
            <div className="bg-zinc-950/90 border border-zinc-800 rounded-lg px-2.5 py-1 flex items-center gap-2">
              <Crosshair className="w-3 h-3 text-sky-400" />
              <span className="font-mono text-[11px] font-semibold text-white tabular-nums">
                9:16 · {currentFrame.toString().padStart(3, '0')}/360f
              </span>
            </div>

            <div className="bg-zinc-950/90 border border-zinc-800 rounded-lg px-2.5 py-1 flex items-center gap-1.5">
              <Video className="w-3 h-3 text-amber-400" />
              <span className="font-mono text-[10px] text-zinc-200 uppercase tabular-nums">
                {currentChoreo.isWhipTransition ? 'WHIP-CUT' : currentChoreo.mode} · FOV{' '}
                {Math.round(currentChoreo.fov)}°
              </span>
            </div>
          </div>

          {/* Active Multi-Scene Stage & Subsurface Particle Telemetry Pill */}
          <div className="bg-zinc-950/90 border border-zinc-800 rounded-lg px-2.5 py-1 flex items-center justify-between text-[10px] font-mono text-sky-300">
            <span className="flex items-center gap-1 truncate">
              <Sparkles className="w-3 h-3 text-sky-400 shrink-0" />
              <span>{SCENE_STAGE_LABELS[activeSceneStage]}</span>
            </span>
            <span className="text-zinc-400 shrink-0">
              {narratorVoiceLabel ? `TTS: ${narratorVoiceLabel}` : `Beat ${activeBeat.beatNumber}/4`}
            </span>
          </div>
        </div>

        {/* Optional External GLB Banner */}
        {(externalGlbName || glbLoadingStatus) && (
          <div className="absolute top-20 inset-x-3 z-10 bg-zinc-900/95 border border-zinc-700 rounded-lg px-2.5 py-1.5 flex items-center justify-between text-[11px] text-zinc-200">
            <span className="truncate font-mono">
              {glbLoadingStatus ||
                `GLB: ${externalGlbName}${activeClipCount ? ` (${activeClipCount} clips)` : ''}`}
            </span>
            {externalGlbName && !glbLoadingStatus && (
              <button
                type="button"
                onClick={onClearExternalGlb}
                className="ml-2 px-1.5 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-[10px] text-white font-semibold shrink-0"
              >
                Reset Rig
              </button>
            )}
          </div>
        )}

        {/* Isolated Empty WebGL Canvas Mount */}
        <div ref={canvasMountRef} className="w-full h-full" />

        {/* Word-by-Word Zack D. Films Pop Captions Overlay */}
        <SceneCompositionOverlay
          preset={preset}
          beats={beats}
          currentFrame={currentFrame}
          fps={30}
        />

        {/* Bottom Scrubber & Transport Bar Inside Viewport */}
        <div
          className="absolute bottom-2.5 inset-x-3 z-10 bg-zinc-950/90 border border-zinc-800 rounded-xl px-3 py-2 flex items-center gap-2.5"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={onTogglePlay}
            aria-label={isPlaying ? 'Pause 3D short' : 'Play 3D short'}
            className="w-7 h-7 rounded-lg bg-white text-zinc-950 hover:bg-zinc-200 flex items-center justify-center shrink-0 transition-colors"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>

          <button
            type="button"
            onClick={() => {
              onFrameChange(0);
              if (sfxEngine.hasNarratorTrack() && !audioMuted) {
                sfxEngine.playNarratorFromOffset(0);
              }
            }}
            aria-label="Restart from frame 0"
            className="w-6 h-6 rounded-md bg-zinc-900 text-zinc-300 hover:text-white flex items-center justify-center shrink-0"
          >
            <RotateCcw className="w-3 h-3" />
          </button>

          <input
            type="range"
            min={0}
            max={359}
            value={currentFrame}
            aria-label="Timeline frame scrubber"
            onChange={(e) => onFrameChange(Number(e.target.value))}
            className="w-full accent-sky-400 cursor-pointer h-1.5 bg-zinc-800 rounded-lg"
          />

          <button
            type="button"
            onClick={() => {
              setAudioMuted((m) => {
                const next = !m;
                if (next) sfxEngine.stopNarrator();
                return next;
              });
            }}
            aria-label={audioMuted ? 'Unmute SFX' : 'Mute SFX'}
            className="w-6 h-6 rounded-md bg-zinc-900 text-zinc-300 hover:text-white flex items-center justify-center shrink-0"
          >
            {audioMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* 4-Scene Quick Stage Switcher Pills Beneath 9:16 Frame */}
      <div className="w-[324px] mt-2.5 grid grid-cols-4 gap-1">
        {(
          [
            { label: '1. Exterior', frame: 18, stage: 'exterior-macro' },
            { label: '2. Cutaway', frame: 108, stage: 'tissue-cutaway' },
            { label: '3. Cellular', frame: 198, stage: 'cellular-micro' },
            { label: '4. Brain', frame: 288, stage: 'neural-cortex' },
          ] as { label: string; frame: number; stage: SceneStageType }[]
        ).map((item) => {
          const isCurrent = activeSceneStage === item.stage;
          return (
            <button
              key={item.stage}
              type="button"
              onClick={() => {
                onFrameChange(item.frame);
                sfxEngine.triggerSfx('whoosh');
              }}
              className={`rounded-lg py-1.5 px-1 text-[10px] font-semibold border transition-colors text-center truncate ${
                isCurrent
                  ? 'bg-zinc-950 text-white border-zinc-950'
                  : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-700 border-zinc-200/80'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {/* Export & Composite Render Action Row Beneath 9:16 Frame */}
      <div className="w-[324px] mt-2 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={handleRenderCompositeWebm}
          disabled={isRecordingWebm}
          className="bg-zinc-950 hover:bg-zinc-800 disabled:opacity-60 text-white rounded-lg px-3 py-2 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap"
        >
          <Film className="w-3.5 h-3.5 shrink-0" />
          <span>
            {isRecordingWebm ? `Rendering ${recordProgress}%` : 'Render .WebM'}
          </span>
        </button>

        <button
          type="button"
          onClick={onExportTsx}
          className="bg-white hover:bg-zinc-50 border border-zinc-200 text-zinc-700 rounded-lg px-3 py-2 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap"
        >
          <Download className="w-3.5 h-3.5 shrink-0" />
          <span>Export .TSX</span>
        </button>
      </div>
    </div>
  );
};
