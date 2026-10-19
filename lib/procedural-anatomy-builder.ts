import * as THREE from 'three';
import { type SceneStageType, type ParticleModeType } from './remotion-math';

export interface BuiltAnatomicalRig {
  rootGroup: THREE.Group;
  propGroup: THREE.Group;
  stageGroups: Record<SceneStageType, THREE.Group>;
  particleMeshes: {
    rbcMesh: THREE.InstancedMesh;
    dropletMesh: THREE.InstancedMesh;
    sparkMesh: THREE.InstancedMesh;
  };
  pulseTargets: THREE.Object3D[];
  skinMeshes: THREE.Mesh[];
  clipCapMesh: THREE.Mesh;
  materials: THREE.Material[];
}

// Pre-allocated scratch transform dummy for zero-GC instanced particle updates
const _particleDummy = new THREE.Object3D();

/**
 * Generates a high-contrast 128x128 procedural Voronoi cellular & fibrous micro-bump texture
 * using HTML5 2D Canvas so tissues, bone trabeculae, and cellular membranes show organic micro-relief.
 */
function createCellularVoronoiBumpTexture(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = '#787878';
  ctx.fillRect(0, 0, size, size);

  // Deterministic pseudo-random cellular nuclei centers
  const cells: [number, number, number][] = [];
  for (let i = 0; i < 36; i++) {
    const cx = ((i * 37 + 19) % size);
    const cy = ((i * 53 + 11) % size);
    const r = 10 + (i % 5) * 3;
    cells.push([cx, cy, r]);
  }

  for (const [cx, cy, r] of cells) {
    const grad = ctx.createRadialGradient(cx, cy, 1, cx, cy, r);
    grad.addColorStop(0, 'rgba(235, 235, 235, 0.85)');
    grad.addColorStop(0.65, 'rgba(135, 135, 135, 0.5)');
    grad.addColorStop(1, 'rgba(55, 55, 55, 0.9)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 4);
  return tex;
}

/**
 * Updates the 3 deterministic InstancedMesh particle systems (Red Blood Cells, Venom/Bio-Fluid Droplets, Neural Sparks)
 * as a pure function of `frame` (0..359).
 */
export function updateMultiSceneParticles(
  rig: BuiltAnatomicalRig,
  frame: number,
  activeStage: SceneStageType,
  activeParticleMode: ParticleModeType
): void {
  const { rbcMesh, dropletMesh, sparkMesh } = rig.particleMeshes;

  const showRbc =
    activeStage === 'cellular-micro' ||
    activeStage === 'tissue-cutaway' ||
    activeParticleMode === 'rbc-stream';
  const showDroplets =
    activeStage === 'exterior-macro' ||
    activeStage === 'tissue-cutaway' ||
    activeStage === 'cellular-micro' ||
    activeParticleMode === 'toxin-droplets';
  const showSparks =
    activeStage === 'neural-cortex' || activeParticleMode === 'neural-sparks';

  rbcMesh.visible = showRbc;
  dropletMesh.visible = showDroplets;
  sparkMesh.visible = showSparks;

  // 1. Animate 36 Biconcave Red Blood Cells (Erythrocytes) flowing along vascular path
  if (showRbc) {
    const rbcCount = rbcMesh.count;
    for (let i = 0; i < rbcCount; i++) {
      const progress = ((frame * 0.014 + i / rbcCount) % 1 + 1) % 1;
      const x = -1.35 + progress * 2.7;
      const waveY =
        Math.sin(progress * Math.PI * 2.5 + i * 0.7) * 0.16 +
        ((i % 3) - 1) * 0.09;
      const waveZ =
        Math.cos(progress * Math.PI * 2.0 + i * 1.1) * 0.14 +
        (activeStage === 'cellular-micro' ? 0.12 : 0.18);

      _particleDummy.position.set(x, waveY, waveZ);
      _particleDummy.rotation.set(
        frame * 0.06 + i * 0.5,
        frame * 0.08 + i * 0.3,
        Math.sin(frame * 0.05 + i) * 0.6
      );
      const scaleBase = activeStage === 'cellular-micro' ? 0.13 : 0.075;
      // Biconcave discoid flattening (1 : 0.36 : 1)
      _particleDummy.scale.set(scaleBase, scaleBase * 0.36, scaleBase);
      _particleDummy.updateMatrix();
      rbcMesh.setMatrixAt(i, _particleDummy.matrix);
    }
    rbcMesh.instanceMatrix.needsUpdate = true;
  }

  // 2. Animate 32 Bio-Fluid / Venom / Micro-Pellet Droplets dispersing radially
  if (showDroplets) {
    const dropCount = dropletMesh.count;
    for (let i = 0; i < dropCount; i++) {
      const cycle = ((frame * 0.018 + i * 0.09) % 1 + 1) % 1;
      const theta = (i / dropCount) * Math.PI * 2 + (i % 5) * 0.4;
      const radius = 0.08 + cycle * 0.95;
      const y = 0.45 - cycle * 1.05 + Math.sin(i * 1.7 + frame * 0.1) * 0.08;
      const x = Math.cos(theta) * radius;
      const z = Math.sin(theta) * radius * 0.75;

      _particleDummy.position.set(x, y, z);
      _particleDummy.rotation.set(0, 0, 0);
      const s = Math.max(0.015, (1 - cycle * 0.65) * 0.065);
      _particleDummy.scale.setScalar(s);
      _particleDummy.updateMatrix();
      dropletMesh.setMatrixAt(i, _particleDummy.matrix);
    }
    dropletMesh.instanceMatrix.needsUpdate = true;
  }

  // 3. Animate 28 Action-Potential Neural Sparks racing along axon pathways into cortex
  if (showSparks) {
    const sparkCount = sparkMesh.count;
    for (let i = 0; i < sparkCount; i++) {
      const t = ((frame * 0.026 + i / sparkCount) % 1 + 1) % 1;
      const branch = (i % 4) - 1.5;
      const y = -0.95 + t * 1.65;
      const x =
        branch * 0.22 * t + Math.sin(t * Math.PI * 3 + i) * 0.08;
      const z =
        Math.cos(t * Math.PI * 2.5 + i * 0.6) * 0.15 + 0.08;

      _particleDummy.position.set(x, y, z);
      _particleDummy.rotation.set(frame * 0.1, frame * 0.12, 0);
      const pulse = 0.055 + Math.sin(frame * 0.35 + i) * 0.022;
      _particleDummy.scale.set(pulse * 0.7, pulse * 1.8, pulse * 0.7);
      _particleDummy.updateMatrix();
      sparkMesh.setMatrixAt(i, _particleDummy.matrix);
    }
    sparkMesh.instanceMatrix.needsUpdate = true;
  }
}

export function buildAnatomicalRig(
  presetId: string,
  clipPlane: THREE.Plane
): BuiltAnatomicalRig {
  const rootGroup = new THREE.Group();
  rootGroup.name = `PresetRoot_${presetId}`;

  const exteriorGroup = new THREE.Group();
  exteriorGroup.name = 'Stage1_ExteriorMacro';

  const cutawayGroup = new THREE.Group();
  cutawayGroup.name = 'Stage2_TissueCutaway';

  const cellularGroup = new THREE.Group();
  cellularGroup.name = 'Stage3_CellularMicro';

  const neuralGroup = new THREE.Group();
  neuralGroup.name = 'Stage4_NeuralCortex';

  rootGroup.add(exteriorGroup, cutawayGroup, cellularGroup, neuralGroup);

  const stageGroups: Record<SceneStageType, THREE.Group> = {
    'exterior-macro': exteriorGroup,
    'tissue-cutaway': cutawayGroup,
    'cellular-micro': cellularGroup,
    'neural-cortex': neuralGroup,
  };

  const propGroup = new THREE.Group();
  propGroup.name = 'PropImpactGroup';

  const pulseTargets: THREE.Object3D[] = [];
  const skinMeshes: THREE.Mesh[] = [];
  const materials: THREE.Material[] = [];

  const bumpMap = createCellularVoronoiBumpTexture();

  const registerMat = <T extends THREE.Material>(mat: T, useClip: boolean = true): T => {
    if (useClip) {
      mat.clippingPlanes = [clipPlane];
      mat.clipShadows = true;
    }
    mat.side = THREE.DoubleSide;
    materials.push(mat);
    return mat;
  };

  // Glowing Cross-Section Laser Frame Indicator (zero center occlusion)
  const capGeo = new THREE.RingGeometry(1.36, 1.42, 64);
  const capMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.78,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const clipCapMesh = new THREE.Mesh(capGeo, capMat);
  clipCapMesh.name = 'CrossSection_GlowCap';
  cutawayGroup.add(clipCapMesh);

  // ============================================================================
  // SHARED DYNAMIC 3D PARTICLE SYSTEMS (THREE.InstancedMesh)
  // ============================================================================
  const rbcGeo = new THREE.SphereGeometry(1, 20, 16);
  const rbcMat = registerMat(
    new THREE.MeshPhysicalMaterial({
      color: 0xdc2626,
      emissive: 0x7f1d1d,
      emissiveIntensity: 0.42,
      roughness: 0.22,
      metalness: 0.08,
      clearcoat: 0.92,
      clearcoatRoughness: 0.12,
      sheen: 0.5,
      sheenColor: new THREE.Color(0xfca5a5),
    }),
    false
  );
  const rbcMesh = new THREE.InstancedMesh(rbcGeo, rbcMat, 36);
  rbcMesh.name = 'Particles_Erythrocyte_RBC';
  rootGroup.add(rbcMesh);

  const dropletColor =
    presetId === 'bee-sting'
      ? 0xf59e0b
      : presetId === 'stomach-capsule'
        ? 0x84cc16
        : presetId === 'titanium-tooth'
          ? 0x38bdf8
          : 0xf43f5e;
  const dropletGeo = new THREE.SphereGeometry(1, 14, 12);
  const dropletMat = registerMat(
    new THREE.MeshPhysicalMaterial({
      color: dropletColor,
      emissive: dropletColor,
      emissiveIntensity: 0.55,
      roughness: 0.1,
      transmission: 0.65,
      thickness: 0.5,
      clearcoat: 1.0,
    }),
    false
  );
  const dropletMesh = new THREE.InstancedMesh(dropletGeo, dropletMat, 32);
  dropletMesh.name = 'Particles_BioFluid_Droplets';
  rootGroup.add(dropletMesh);

  const sparkGeo = new THREE.OctahedronGeometry(1, 1);
  const sparkMat = registerMat(
    new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
    }),
    false
  );
  const sparkMesh = new THREE.InstancedMesh(sparkGeo, sparkMat, 28);
  sparkMesh.name = 'Particles_Neural_Sparks';
  rootGroup.add(sparkMesh);

  // ============================================================================
  // SCENE 1 (EXTERIOR MACRO) & SCENE 2 (TISSUE CUTAWAY) BY PRESET
  // ============================================================================
  if (presetId === 'bee-sting') {
    // Organic Subsurface Epidermis with wet specular sheen
    const epiMat = registerMat(
      new THREE.MeshPhysicalMaterial({
        color: 0xf2b89b,
        roughness: 0.38,
        metalness: 0.04,
        transmission: 0.28,
        thickness: 0.65,
        attenuationColor: new THREE.Color(0xdc2626),
        attenuationDistance: 0.8,
        clearcoat: 0.65,
        clearcoatRoughness: 0.2,
        sheen: 0.55,
        sheenColor: new THREE.Color(0xfecdd3),
        bumpMap,
        bumpScale: 0.024,
        transparent: true,
        opacity: 0.94,
      })
    );
    const epiMesh = new THREE.Mesh(
      new THREE.BoxGeometry(2.3, 0.36, 1.85, 24, 6, 24),
      epiMat
    );
    epiMesh.position.set(0, 0.85, 0);
    epiMesh.name = 'Epidermis_Stratum_Corneum';
    cutawayGroup.add(epiMesh);
    skinMeshes.push(epiMesh);

    // Dermis_Layer with subsurface crimson scatter & wet clearcoat
    const dermisMat = registerMat(
      new THREE.MeshPhysicalMaterial({
        color: 0xd9485f,
        roughness: 0.42,
        metalness: 0.05,
        transmission: 0.22,
        thickness: 0.9,
        attenuationColor: new THREE.Color(0x991b1b),
        clearcoat: 0.82,
        clearcoatRoughness: 0.16,
        bumpMap,
        bumpScale: 0.032,
      })
    );
    const dermisMesh = new THREE.Mesh(
      new THREE.BoxGeometry(2.26, 0.92, 1.82, 20, 12, 20),
      dermisMat
    );
    dermisMesh.position.set(0, 0.18, 0);
    dermisMesh.name = 'Dermis_Layer';
    cutawayGroup.add(dermisMesh);

    // Subcutis_Adipose_Lobules
    const adiposeGroup = new THREE.Group();
    adiposeGroup.name = 'Subcutis_Adipose_Lobules';
    const fatMat = registerMat(
      new THREE.MeshPhysicalMaterial({
        color: 0xfbbf24,
        roughness: 0.28,
        metalness: 0.04,
        transmission: 0.32,
        thickness: 0.5,
        clearcoat: 0.78,
        bumpMap,
        bumpScale: 0.018,
      })
    );
    const baseSubMesh = new THREE.Mesh(new THREE.BoxGeometry(2.24, 0.52, 1.8), fatMat);
    baseSubMesh.position.set(0, -0.58, 0);
    adiposeGroup.add(baseSubMesh);

    const lobuleGeo = new THREE.SphereGeometry(0.22, 20, 16);
    for (let x = -0.8; x <= 0.8; x += 0.4) {
      for (let z = -0.6; z <= 0.6; z += 0.4) {
        const lobule = new THREE.Mesh(lobuleGeo, fatMat);
        lobule.position.set(x, -0.45 + ((Math.abs(x * 10 + z * 10) % 3) * 0.04), z);
        lobule.scale.set(1.1, 0.85, 1.05);
        adiposeGroup.add(lobule);
      }
    }
    cutawayGroup.add(adiposeGroup);

    // Capillary_Plexus
    const vesselGroup = new THREE.Group();
    vesselGroup.name = 'Capillary_Plexus';
    const arteryMat = registerMat(
      new THREE.MeshPhysicalMaterial({
        color: 0xef4444,
        emissive: 0x7f1d1d,
        emissiveIntensity: 0.4,
        roughness: 0.2,
        clearcoat: 0.9,
      })
    );
    const veinMat = registerMat(
      new THREE.MeshPhysicalMaterial({
        color: 0x2563eb,
        roughness: 0.25,
        clearcoat: 0.85,
      })
    );
    const arteryCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-1.05, -0.15, 0.25),
      new THREE.Vector3(-0.35, 0.18, 0.12),
      new THREE.Vector3(0.25, 0.05, 0.2),
      new THREE.Vector3(1.05, 0.28, 0.1),
    ]);
    const veinCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-1.05, -0.28, -0.15),
      new THREE.Vector3(-0.2, -0.02, 0.05),
      new THREE.Vector3(0.4, -0.18, -0.1),
      new THREE.Vector3(1.05, 0.05, 0.18),
    ]);
    vesselGroup.add(
      new THREE.Mesh(new THREE.TubeGeometry(arteryCurve, 44, 0.08, 16, false), arteryMat)
    );
    vesselGroup.add(
      new THREE.Mesh(new THREE.TubeGeometry(veinCurve, 44, 0.07, 16, false), veinMat)
    );
    cutawayGroup.add(vesselGroup);
    pulseTargets.push(vesselGroup);

    // Nociceptor_Nerve_Root
    const nerveGroup = new THREE.Group();
    nerveGroup.name = 'Nociceptor_Nerve_Root';
    const nerveMat = registerMat(
      new THREE.MeshPhysicalMaterial({
        color: 0x38bdf8,
        emissive: 0x0284c7,
        emissiveIntensity: 0.72,
        roughness: 0.18,
        clearcoat: 0.9,
      })
    );
    const nerveCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.55, -0.65, 0.15),
      new THREE.Vector3(-0.22, -0.1, 0.18),
      new THREE.Vector3(-0.04, 0.42, 0.12),
      new THREE.Vector3(0.18, 0.65, 0.08),
    ]);
    nerveGroup.add(
      new THREE.Mesh(new THREE.TubeGeometry(nerveCurve, 36, 0.048, 14, false), nerveMat)
    );
    cutawayGroup.add(nerveGroup);
    pulseTargets.push(nerveGroup);

    // Prop_Barbed_Stinger_VenomSac (shared in Exterior & Cutaway)
    propGroup.name = 'Prop_Barbed_Stinger_VenomSac';
    const stingerMat = registerMat(
      new THREE.MeshPhysicalMaterial({
        color: 0x18181b,
        roughness: 0.16,
        metalness: 0.88,
        clearcoat: 0.9,
      })
    );
    const shaft = new THREE.Mesh(new THREE.ConeGeometry(0.11, 1.55, 24), stingerMat);
    shaft.rotation.x = Math.PI;
    shaft.position.set(0, 0.45, 0.12);
    propGroup.add(shaft);

    for (let i = 0; i < 5; i++) {
      const barb = new THREE.Mesh(new THREE.ConeGeometry(0.095, 0.22, 12), stingerMat);
      barb.position.set(0, -0.08 + i * 0.2, 0.12);
      barb.rotation.z = (i % 2 === 0 ? 1 : -1) * 0.38;
      propGroup.add(barb);
    }

    const sacMat = registerMat(
      new THREE.MeshPhysicalMaterial({
        color: 0xf59e0b,
        emissive: 0xd97706,
        emissiveIntensity: 0.45,
        roughness: 0.14,
        transmission: 0.6,
        thickness: 0.8,
        clearcoat: 0.95,
        bumpMap,
        bumpScale: 0.02,
      })
    );
    const venomSac = new THREE.Mesh(new THREE.SphereGeometry(0.3, 28, 24), sacMat);
    venomSac.scale.set(1.0, 1.38, 0.95);
    venomSac.position.set(0, 1.35, 0.12);
    propGroup.add(venomSac);
    pulseTargets.push(venomSac);
    rootGroup.add(propGroup);
  } else if (presetId === 'kevlar-ribcage') {
    const kevlarMat = registerMat(
      new THREE.MeshPhysicalMaterial({
        color: 0xeab308,
        roughness: 0.48,
        metalness: 0.25,
        sheen: 0.7,
        sheenColor: new THREE.Color(0xfef08a),
        bumpMap,
        bumpScale: 0.045,
      })
    );
    const kevlarMesh = new THREE.Mesh(
      new THREE.BoxGeometry(2.1, 2.2, 0.16, 20, 20, 4),
      kevlarMat
    );
    kevlarMesh.position.set(0, 0.05, 0.92);
    kevlarMesh.name = 'Aramid_Kevlar_Weave_Panel';
    cutawayGroup.add(kevlarMesh);
    skinMeshes.push(kevlarMesh);

    const ribGroup = new THREE.Group();
    ribGroup.name = 'Thoracic_Ribcage_Sternum';
    const boneMat = registerMat(
      new THREE.MeshPhysicalMaterial({
        color: 0xf5f5f0,
        roughness: 0.34,
        metalness: 0.06,
        clearcoat: 0.45,
        bumpMap,
        bumpScale: 0.02,
      })
    );
    const sternum = new THREE.Mesh(new THREE.BoxGeometry(0.28, 1.45, 0.14), boneMat);
    sternum.position.set(0, 0.1, 0.55);
    ribGroup.add(sternum);

    for (let i = -2; i <= 2; i++) {
      const y = i * 0.28;
      [-1, 1].forEach((side) => {
        const ribCurve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(side * 0.14, y, 0.52),
          new THREE.Vector3(side * 0.88, y - 0.05, 0.25),
          new THREE.Vector3(side * 0.92, y + 0.04, -0.38),
          new THREE.Vector3(side * 0.2, y + 0.08, -0.62),
        ]);
        const rib = new THREE.Mesh(
          new THREE.TubeGeometry(ribCurve, 32, 0.068, 14, false),
          boneMat
        );
        ribGroup.add(rib);
      });
    }
    cutawayGroup.add(ribGroup);

    const heartGroup = new THREE.Group();
    heartGroup.name = 'Heart_Myocardium';
    const heartMat = registerMat(
      new THREE.MeshPhysicalMaterial({
        color: 0xdc2626,
        emissive: 0x7f1d1d,
        emissiveIntensity: 0.38,
        roughness: 0.24,
        transmission: 0.2,
        thickness: 0.8,
        clearcoat: 0.92,
        clearcoatRoughness: 0.12,
        bumpMap,
        bumpScale: 0.028,
      })
    );
    const leftVentricle = new THREE.Mesh(new THREE.SphereGeometry(0.48, 32, 28), heartMat);
    leftVentricle.scale.set(0.95, 1.32, 0.92);
    leftVentricle.rotation.z = 0.28;
    leftVentricle.position.set(-0.08, 0.05, 0.05);
    heartGroup.add(leftVentricle);
    cutawayGroup.add(heartGroup);
    pulseTargets.push(heartGroup);

    const aortaCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.05, 0.42, 0.08),
      new THREE.Vector3(-0.02, 0.82, 0.08),
      new THREE.Vector3(0.24, 0.88, -0.05),
      new THREE.Vector3(0.28, 0.45, -0.18),
    ]);
    const aortaMesh = new THREE.Mesh(
      new THREE.TubeGeometry(aortaCurve, 36, 0.125, 16, false),
      heartMat
    );
    aortaMesh.name = 'Ascending_Aorta_Arch';
    cutawayGroup.add(aortaMesh);

    const lungGroup = new THREE.Group();
    lungGroup.name = 'Pulmonary_Lobes_Pair';
    const lungMat = registerMat(
      new THREE.MeshPhysicalMaterial({
        color: 0xf472b6,
        roughness: 0.38,
        transmission: 0.25,
        thickness: 0.6,
        clearcoat: 0.75,
        bumpMap,
        bumpScale: 0.022,
      })
    );
    [-0.62, 0.62].forEach((xPos) => {
      const lobe = new THREE.Mesh(new THREE.SphereGeometry(0.48, 28, 24), lungMat);
      lobe.scale.set(0.75, 1.48, 0.82);
      lobe.position.set(xPos, 0.12, -0.08);
      lungGroup.add(lobe);
    });
    cutawayGroup.add(lungGroup);

    propGroup.name = 'Prop_9mm_Parabellum_Slug';
    const copperMat = registerMat(
      new THREE.MeshPhysicalMaterial({
        color: 0xd97706,
        roughness: 0.16,
        metalness: 0.94,
        clearcoat: 0.85,
      })
    );
    const bulletMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.16, 0.52, 28),
      copperMat
    );
    bulletMesh.rotation.x = Math.PI / 2;
    bulletMesh.position.set(0, 0.1, 1.25);
    propGroup.add(bulletMesh);
    rootGroup.add(propGroup);
  } else if (presetId === 'titanium-tooth') {
    const boneMat = registerMat(
      new THREE.MeshPhysicalMaterial({
        color: 0xf3e8ff,
        roughness: 0.38,
        metalness: 0.06,
        transmission: 0.18,
        thickness: 0.5,
        clearcoat: 0.5,
        bumpMap,
        bumpScale: 0.036,
      })
    );
    const mandible = new THREE.Mesh(
      new THREE.BoxGeometry(2.1, 1.25, 1.4, 18, 14, 14),
      boneMat
    );
    mandible.position.set(0, -0.45, 0);
    mandible.name = 'Mandible_Cortical_Plate';
    cutawayGroup.add(mandible);

    const gumMat = registerMat(
      new THREE.MeshPhysicalMaterial({
        color: 0xfb7185,
        roughness: 0.25,
        transmission: 0.32,
        thickness: 0.7,
        attenuationColor: new THREE.Color(0xbe123c),
        clearcoat: 0.88,
        clearcoatRoughness: 0.12,
        bumpMap,
        bumpScale: 0.02,
        transparent: true,
        opacity: 0.94,
      })
    );
    const gum = new THREE.Mesh(new THREE.BoxGeometry(2.14, 0.36, 1.44), gumMat);
    gum.position.set(0, 0.32, 0);
    gum.name = 'Gingiva_Mucosa_Collar';
    cutawayGroup.add(gum);
    skinMeshes.push(gum);

    const nerveMat = registerMat(
      new THREE.MeshPhysicalMaterial({
        color: 0xfacc15,
        emissive: 0xca8a04,
        emissiveIntensity: 0.52,
        roughness: 0.22,
        clearcoat: 0.85,
      })
    );
    const nerveCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-1.05, -0.82, 0.08),
      new THREE.Vector3(-0.3, -0.88, 0.12),
      new THREE.Vector3(0.35, -0.85, 0.08),
      new THREE.Vector3(1.05, -0.78, 0.05),
    ]);
    const nerveMesh = new THREE.Mesh(
      new THREE.TubeGeometry(nerveCurve, 36, 0.078, 16, false),
      nerveMat
    );
    nerveMesh.name = 'Inferior_Alveolar_Nerve';
    cutawayGroup.add(nerveMesh);
    pulseTargets.push(nerveMesh);

    propGroup.name = 'Prop_Titanium_Fixture_Screw';
    const titaniumMat = registerMat(
      new THREE.MeshPhysicalMaterial({
        color: 0x94a3b8,
        roughness: 0.15,
        metalness: 0.96,
        clearcoat: 0.85,
      })
    );
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.16, 1.15, 32),
      titaniumMat
    );
    post.position.set(0, -0.05, 0);
    propGroup.add(post);

    for (let i = 0; i < 7; i++) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.22 - i * 0.008, 0.034, 14, 32),
        titaniumMat
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.set(0, 0.34 - i * 0.14, 0);
      propGroup.add(ring);
    }
    rootGroup.add(propGroup);

    const crownMat = registerMat(
      new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        roughness: 0.12,
        metalness: 0.04,
        transmission: 0.18,
        thickness: 0.5,
        clearcoat: 0.96,
        clearcoatRoughness: 0.08,
      })
    );
    const crownGroup = new THREE.Group();
    crownGroup.name = 'Zirconia_Molar_Crown';
    const centerCrown = new THREE.Mesh(
      new THREE.BoxGeometry(0.62, 0.58, 0.62, 8, 8, 8),
      crownMat
    );
    centerCrown.position.set(0, 0.82, 0);
    crownGroup.add(centerCrown);

    [-0.76, 0.76].forEach((xOff) => {
      const neighbor = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.56, 0.58), crownMat);
      neighbor.position.set(xOff, 0.78, 0);
      crownGroup.add(neighbor);
    });
    cutawayGroup.add(crownGroup);
  } else if (presetId === 'brain-concussion') {
    const skullMat = registerMat(
      new THREE.MeshPhysicalMaterial({
        color: 0xf5f5f4,
        roughness: 0.35,
        metalness: 0.05,
        clearcoat: 0.5,
        bumpMap,
        bumpScale: 0.02,
        transparent: true,
        opacity: 0.9,
      })
    );
    const skull = new THREE.Mesh(new THREE.SphereGeometry(1.22, 36, 28), skullMat);
    skull.scale.set(0.92, 1.02, 1.12);
    skull.position.set(0, 0.22, 0);
    skull.name = 'Cranium_Calvaria_Vault';
    cutawayGroup.add(skull);
    skinMeshes.push(skull);

    const csfMat = registerMat(
      new THREE.MeshPhysicalMaterial({
        color: 0x38bdf8,
        roughness: 0.1,
        transmission: 0.78,
        transparent: true,
        opacity: 0.38,
      })
    );
    const csf = new THREE.Mesh(new THREE.SphereGeometry(1.08, 32, 24), csfMat);
    csf.scale.set(0.9, 0.98, 1.08);
    csf.position.set(0, 0.22, 0);
    csf.name = 'Subarachnoid_CSF_Envelope';
    cutawayGroup.add(csf);

    const cortexGeo = new THREE.SphereGeometry(0.94, 48, 36);
    const posAttr = cortexGeo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const vx = posAttr.getX(i);
      const vy = posAttr.getY(i);
      const vz = posAttr.getZ(i);
      const gyriFold =
        1 +
        0.06 * Math.sin(vx * 11.5) * Math.cos(vy * 11.5) +
        0.04 * Math.sin(vz * 13.5);
      posAttr.setXYZ(i, vx * gyriFold * 0.88, vy * gyriFold * 0.95, vz * gyriFold * 1.06);
    }
    cortexGeo.computeVertexNormals();

    const cortexMat = registerMat(
      new THREE.MeshPhysicalMaterial({
        color: 0xf472b6,
        emissive: 0x9d174d,
        emissiveIntensity: 0.32,
        roughness: 0.3,
        transmission: 0.24,
        thickness: 0.7,
        clearcoat: 0.9,
        clearcoatRoughness: 0.14,
        bumpMap,
        bumpScale: 0.032,
      })
    );
    const cortex = new THREE.Mesh(cortexGeo, cortexMat);
    cortex.position.set(0, 0.25, 0);
    cortex.name = 'Cerebral_Cortex';
    propGroup.add(cortex);
    pulseTargets.push(cortex);
    rootGroup.add(propGroup);

    const whiteMat = registerMat(
      new THREE.MeshPhysicalMaterial({
        color: 0xfef3c7,
        roughness: 0.28,
        clearcoat: 0.7,
      })
    );
    const callosumCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.15, -0.45),
      new THREE.Vector3(0, 0.42, -0.15),
      new THREE.Vector3(0, 0.42, 0.22),
      new THREE.Vector3(0, 0.14, 0.46),
    ]);
    const callosum = new THREE.Mesh(
      new THREE.TubeGeometry(callosumCurve, 28, 0.14, 14, false),
      whiteMat
    );
    callosum.name = 'Corpus_Callosum_White_Matter';
    cutawayGroup.add(callosum);

    const stemCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.05, -0.05),
      new THREE.Vector3(0, -0.45, -0.08),
      new THREE.Vector3(0, -0.98, -0.16),
    ]);
    const stem = new THREE.Mesh(
      new THREE.TubeGeometry(stemCurve, 24, 0.19, 16, false),
      whiteMat
    );
    stem.name = 'Brainstem_Pons_Medulla';
    cutawayGroup.add(stem);
  } else if (presetId === 'stomach-capsule') {
    const stomachMat = registerMat(
      new THREE.MeshPhysicalMaterial({
        color: 0xe11d48,
        roughness: 0.34,
        transmission: 0.25,
        thickness: 0.7,
        clearcoat: 0.88,
        bumpMap,
        bumpScale: 0.03,
        transparent: true,
        opacity: 0.92,
      })
    );
    const stomachCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.35, 1.05, 0),
      new THREE.Vector3(-0.55, 0.25, 0),
      new THREE.Vector3(-0.2, -0.62, 0),
      new THREE.Vector3(0.55, -0.35, 0),
      new THREE.Vector3(0.68, 0.25, 0),
    ]);
    const stomachMesh = new THREE.Mesh(
      new THREE.TubeGeometry(stomachCurve, 44, 0.62, 28, false),
      stomachMat
    );
    stomachMesh.name = 'Gastric_Fundus_Wall';
    cutawayGroup.add(stomachMesh);
    skinMeshes.push(stomachMesh);
    pulseTargets.push(stomachMesh);

    const rugaeMat = registerMat(
      new THREE.MeshPhysicalMaterial({
        color: 0xfb7185,
        roughness: 0.38,
        clearcoat: 0.85,
        bumpMap,
        bumpScale: 0.045,
      })
    );
    const rugaeMesh = new THREE.Mesh(
      new THREE.TubeGeometry(stomachCurve, 36, 0.52, 22, false),
      rugaeMat
    );
    rugaeMesh.name = 'Mucosal_Rugae_Folds';
    cutawayGroup.add(rugaeMesh);

    const acidMat = registerMat(
      new THREE.MeshPhysicalMaterial({
        color: 0x84cc16,
        emissive: 0x3f6212,
        emissiveIntensity: 0.5,
        roughness: 0.12,
        transmission: 0.68,
        clearcoat: 0.95,
      })
    );
    const acidPool = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.52, 0.45, 28), acidMat);
    acidPool.position.set(0.05, -0.52, 0);
    acidPool.name = 'Hydrochloric_Acid_Pool';
    cutawayGroup.add(acidPool);

    propGroup.name = 'Prop_Gelatin_Pill_Capsule';
    const capRedMat = registerMat(
      new THREE.MeshPhysicalMaterial({
        color: 0xef4444,
        roughness: 0.12,
        clearcoat: 0.95,
        transmission: 0.3,
      })
    );
    const capWhiteMat = registerMat(
      new THREE.MeshPhysicalMaterial({
        color: 0xf8fafc,
        roughness: 0.14,
        clearcoat: 0.95,
      })
    );
    const topHalf = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.34, 24), capRedMat);
    topHalf.position.set(-0.15, 0.22, 0.12);
    const botHalf = new THREE.Mesh(
      new THREE.CylinderGeometry(0.175, 0.175, 0.34, 24),
      capWhiteMat
    );
    botHalf.position.set(-0.15, -0.1, 0.12);
    propGroup.add(topHalf, botHalf);
    rootGroup.add(propGroup);

    const pelletsGroup = new THREE.Group();
    pelletsGroup.name = 'Enteric_Micro_Pellets_Cloud';
    const pelletMat = registerMat(
      new THREE.MeshPhysicalMaterial({
        color: 0x38bdf8,
        emissive: 0x0284c7,
        emissiveIntensity: 0.55,
        roughness: 0.15,
        clearcoat: 0.9,
      })
    );
    const pelletGeo = new THREE.SphereGeometry(0.055, 14, 12);
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2;
      const r = 0.15 + (i % 3) * 0.1;
      const p = new THREE.Mesh(pelletGeo, pelletMat);
      p.position.set(Math.cos(angle) * r, -0.22 + (i % 4) * 0.08, Math.sin(angle) * r * 0.6);
      pelletsGroup.add(p);
    }
    cutawayGroup.add(pelletsGroup);
    pulseTargets.push(pelletsGroup);
  } else {
    // 'eardrum-rupture'
    const canalMat = registerMat(
      new THREE.MeshPhysicalMaterial({
        color: 0xfda4af,
        roughness: 0.36,
        transmission: 0.22,
        clearcoat: 0.8,
        bumpMap,
        bumpScale: 0.025,
        transparent: true,
        opacity: 0.92,
      })
    );
    const canalCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-1.25, 0.08, 0),
      new THREE.Vector3(-0.65, 0.02, 0),
      new THREE.Vector3(-0.18, 0.0, 0),
    ]);
    const canalMesh = new THREE.Mesh(
      new THREE.TubeGeometry(canalCurve, 32, 0.36, 24, false),
      canalMat
    );
    canalMesh.name = 'External_Acoustic_Meatus';
    cutawayGroup.add(canalMesh);
    skinMeshes.push(canalMesh);

    const drumMat = registerMat(
      new THREE.MeshPhysicalMaterial({
        color: 0xfef08a,
        roughness: 0.2,
        transmission: 0.62,
        clearcoat: 0.9,
        transparent: true,
        opacity: 0.88,
      })
    );
    const drumMesh = new THREE.Mesh(new THREE.ConeGeometry(0.38, 0.16, 32), drumMat);
    drumMesh.rotation.z = -Math.PI / 2;
    drumMesh.position.set(-0.12, 0, 0);
    drumMesh.name = 'Tympanic_Membrane';
    cutawayGroup.add(drumMesh);
    pulseTargets.push(drumMesh);

    const ossicleGroup = new THREE.Group();
    ossicleGroup.name = 'Ossicles_Malleus_Incus_Stapes';
    const ossMat = registerMat(
      new THREE.MeshPhysicalMaterial({
        color: 0xf8fafc,
        roughness: 0.26,
        metalness: 0.12,
        clearcoat: 0.75,
      })
    );
    const malleus = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.42, 16), ossMat);
    malleus.rotation.z = -0.35;
    malleus.position.set(0.05, 0.15, 0);
    const incus = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.04, 0.38, 16), ossMat);
    incus.rotation.z = 0.45;
    incus.position.set(0.24, 0.16, 0);
    const stapes = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.028, 14, 24), ossMat);
    stapes.position.set(0.42, 0.05, 0);
    ossicleGroup.add(malleus, incus, stapes);
    cutawayGroup.add(ossicleGroup);
    pulseTargets.push(ossicleGroup);

    const cochleaPoints: THREE.Vector3[] = [];
    for (let t = 0; t <= 56; t++) {
      const angle = (t / 56) * Math.PI * 4.5;
      const radius = 0.42 * (1 - (t / 56) * 0.72);
      cochleaPoints.push(
        new THREE.Vector3(
          0.78 + Math.cos(angle) * radius,
          0.04 + Math.sin(angle) * radius,
          (t / 56) * 0.28 - 0.14
        )
      );
    }
    const cochleaCurve = new THREE.CatmullRomCurve3(cochleaPoints);
    const cochleaMat = registerMat(
      new THREE.MeshPhysicalMaterial({
        color: 0x38bdf8,
        emissive: 0x0369a1,
        emissiveIntensity: 0.42,
        roughness: 0.2,
        clearcoat: 0.9,
      })
    );
    const cochleaMesh = new THREE.Mesh(
      new THREE.TubeGeometry(cochleaCurve, 72, 0.088, 18, false),
      cochleaMat
    );
    cochleaMesh.name = 'Spiral_Cochlea_Labyrinth';
    cutawayGroup.add(cochleaMesh);

    propGroup.name = 'Prop_160dB_Pressure_Wavefront';
    const waveMat = registerMat(
      new THREE.MeshBasicMaterial({
        color: 0xf43f5e,
        side: THREE.DoubleSide,
      })
    );
    for (let i = 0; i < 4; i++) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.24 + i * 0.055, 0.026, 14, 28),
        waveMat
      );
      ring.rotation.y = Math.PI / 2;
      ring.position.set(-0.95 + i * 0.16, 0.02, 0);
      propGroup.add(ring);
    }
    rootGroup.add(propGroup);
  }

  // ============================================================================
  // BUILD SCENE 1: EXTERIOR MACRO IMPACT STAGE (`exteriorGroup`)
  // ============================================================================
  const extSurfaceMat = registerMat(
    new THREE.MeshPhysicalMaterial({
      color: presetId === 'kevlar-ribcage' ? 0xca8a04 : 0xe89980,
      roughness: 0.34,
      transmission: 0.3,
      thickness: 0.9,
      attenuationColor: new THREE.Color(0xb91c1c),
      clearcoat: 0.72,
      sheen: 0.6,
      bumpMap,
      bumpScale: 0.035,
    }),
    false
  );
  const extSlab = new THREE.Mesh(
    new THREE.CylinderGeometry(1.45, 1.55, 0.65, 40, 8),
    extSurfaceMat
  );
  extSlab.position.set(0, -0.35, 0);
  exteriorGroup.add(extSlab);

  // Concentric impact shockwave rings on Exterior Stage
  const shockRingMat = registerMat(
    new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.65,
      side: THREE.DoubleSide,
    }),
    false
  );
  for (let r = 0; r < 3; r++) {
    const shockRing = new THREE.Mesh(
      new THREE.RingGeometry(0.32 + r * 0.32, 0.36 + r * 0.32, 48),
      shockRingMat
    );
    shockRing.rotation.x = -Math.PI / 2;
    shockRing.position.set(0, 0.01 + r * 0.02, 0);
    exteriorGroup.add(shockRing);
    pulseTargets.push(shockRing);
  }

  // ============================================================================
  // BUILD SCENE 3: MICROSCOPIC CELLULAR & CAPILLARY LUMEN STAGE (`cellularGroup`)
  // ============================================================================
  const lumenCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-1.55, -0.18, -0.1),
    new THREE.Vector3(-0.45, 0.12, 0.08),
    new THREE.Vector3(0.45, -0.08, 0.12),
    new THREE.Vector3(1.55, 0.22, -0.05),
  ]);
  const lumenMat = registerMat(
    new THREE.MeshPhysicalMaterial({
      color: 0xbe123c,
      emissive: 0x4c0519,
      emissiveIntensity: 0.45,
      roughness: 0.25,
      transmission: 0.42,
      thickness: 0.8,
      clearcoat: 0.92,
      bumpMap,
      bumpScale: 0.04,
      transparent: true,
      opacity: 0.86,
    })
  );
  const lumenTube = new THREE.Mesh(
    new THREE.TubeGeometry(lumenCurve, 48, 0.54, 24, false),
    lumenMat
  );
  lumenTube.name = 'Capillary_Lumen_Wall';
  cellularGroup.add(lumenTube);

  // Clustered 3D Biological Cells with Translucent Plasma Membranes & Glowing Nuclei
  const cellMembraneMat = registerMat(
    new THREE.MeshPhysicalMaterial({
      color: 0xf43f5e,
      roughness: 0.16,
      transmission: 0.72,
      thickness: 0.6,
      clearcoat: 1.0,
      bumpMap,
      bumpScale: 0.015,
      transparent: true,
      opacity: 0.78,
    }),
    false
  );
  const cellNucleusMat = registerMat(
    new THREE.MeshPhysicalMaterial({
      color: 0xf59e0b,
      emissive: 0xd97706,
      emissiveIntensity: 0.65,
      roughness: 0.22,
      clearcoat: 0.85,
    }),
    false
  );
  const cellPositions: [number, number, number][] = [
    [-0.75, 0.62, -0.15],
    [0.05, 0.72, 0.12],
    [0.82, 0.58, -0.1],
    [-0.62, -0.68, 0.15],
    [0.18, -0.72, -0.12],
    [0.85, -0.58, 0.14],
  ];
  const cellMembraneGeo = new THREE.IcosahedronGeometry(0.28, 3);
  const cellNucleusGeo = new THREE.SphereGeometry(0.12, 16, 14);

  for (const [cx, cy, cz] of cellPositions) {
    const cellNode = new THREE.Group();
    const membrane = new THREE.Mesh(cellMembraneGeo, cellMembraneMat);
    const nucleus = new THREE.Mesh(cellNucleusGeo, cellNucleusMat);
    cellNode.add(membrane, nucleus);
    cellNode.position.set(cx, cy, cz);
    cellularGroup.add(cellNode);
    pulseTargets.push(cellNode);
  }

  // ============================================================================
  // BUILD SCENE 4: NEURAL PATHWAY & SAGITTAL BRAIN CORTEX STAGE (`neuralGroup`)
  // ============================================================================
  const neuralCortexGeo = new THREE.SphereGeometry(0.88, 44, 32);
  const nPos = neuralCortexGeo.attributes.position;
  for (let i = 0; i < nPos.count; i++) {
    const vx = nPos.getX(i);
    const vy = nPos.getY(i);
    const vz = nPos.getZ(i);
    const fold =
      1 +
      0.062 * Math.sin(vx * 12.0) * Math.cos(vy * 12.0) +
      0.038 * Math.sin(vz * 14.0);
    nPos.setXYZ(i, vx * fold * 0.9, vy * fold * 0.94, vz * fold * 1.05);
  }
  neuralCortexGeo.computeVertexNormals();

  const neuralCortexMat = registerMat(
    new THREE.MeshPhysicalMaterial({
      color: 0xec4899,
      emissive: 0x831843,
      emissiveIntensity: 0.42,
      roughness: 0.26,
      transmission: 0.32,
      thickness: 0.85,
      clearcoat: 0.92,
      bumpMap,
      bumpScale: 0.035,
    })
  );
  const neuralBrainMesh = new THREE.Mesh(neuralCortexGeo, neuralCortexMat);
  neuralBrainMesh.position.set(0, 0.36, 0);
  neuralBrainMesh.name = 'Somatosensory_Cortex';
  neuralGroup.add(neuralBrainMesh);
  pulseTargets.push(neuralBrainMesh);

  // Translucent Cranial Halo Shell
  const cranialShellMat = registerMat(
    new THREE.MeshPhysicalMaterial({
      color: 0x38bdf8,
      roughness: 0.15,
      transmission: 0.82,
      transparent: true,
      opacity: 0.25,
    }),
    false
  );
  const cranialShell = new THREE.Mesh(
    new THREE.SphereGeometry(1.06, 32, 24),
    cranialShellMat
  );
  cranialShell.scale.set(0.92, 0.98, 1.08);
  cranialShell.position.set(0, 0.36, 0);
  neuralGroup.add(cranialShell);

  // Ascending Myelinated Axon Tracts with Glowing Nodes of Ranvier
  const axonMat = registerMat(
    new THREE.MeshPhysicalMaterial({
      color: 0x0284c7,
      emissive: 0x0369a1,
      emissiveIntensity: 0.68,
      roughness: 0.18,
      clearcoat: 0.9,
    }),
    false
  );
  [-0.28, 0, 0.28].forEach((xOffset, idx) => {
    const tractCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(xOffset * 1.4, -1.05, 0.08),
      new THREE.Vector3(xOffset * 0.9, -0.45, 0.12 - idx * 0.05),
      new THREE.Vector3(xOffset * 0.5, 0.15, 0.05),
      new THREE.Vector3(xOffset * 0.25, 0.55, 0),
    ]);
    const tractMesh = new THREE.Mesh(
      new THREE.TubeGeometry(tractCurve, 32, 0.052, 12, false),
      axonMat
    );
    neuralGroup.add(tractMesh);
  });

  // Initialize particles at frame 0
  updateMultiSceneParticles(
    {
      rootGroup,
      propGroup,
      stageGroups,
      particleMeshes: { rbcMesh, dropletMesh, sparkMesh },
      pulseTargets,
      skinMeshes,
      clipCapMesh,
      materials,
    },
    0,
    'exterior-macro',
    'toxin-droplets'
  );

  return {
    rootGroup,
    propGroup,
    stageGroups,
    particleMeshes: { rbcMesh, dropletMesh, sparkMesh },
    pulseTargets,
    skinMeshes,
    clipCapMesh,
    materials,
  };
}
