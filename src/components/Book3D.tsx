import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import gsap from "gsap";

import coverUrl from "@/assets/book-cover.jpg";
import backUrl from "@/assets/book-back.jpg";
import spineUrl from "@/assets/book-spine.jpg";
import pageUrl from "@/assets/book-page.jpg";

const BOOK_W = 3.2;
const BOOK_H = 4.4;
const BOOK_D = 0.55;
const COVER_T = 0.05;
const PAGE_COUNT = 8;
const PAGE_GAP = (BOOK_D - COVER_T * 2) / PAGE_COUNT;

export default function Book3D() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // ---------- Renderer ----------
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    mount.appendChild(renderer.domElement);

    // ---------- Scene & Camera ----------
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      35,
      mount.clientWidth / mount.clientHeight,
      0.1,
      100,
    );
    camera.position.set(0, 1.5, 11);

    // ---------- Lighting ----------
    scene.add(new THREE.AmbientLight(0xffffff, 0.35));

    const key = new THREE.DirectionalLight(0xfff2d6, 1.6);
    key.position.set(5, 8, 6);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.left = -8;
    key.shadow.camera.right = 8;
    key.shadow.camera.top = 8;
    key.shadow.camera.bottom = -8;
    key.shadow.bias = -0.0005;
    scene.add(key);

    const rim = new THREE.DirectionalLight(0x88aaff, 0.6);
    rim.position.set(-6, 4, -4);
    scene.add(rim);

    const fill = new THREE.PointLight(0xffd8a8, 0.5, 30);
    fill.position.set(-3, 2, 5);
    scene.add(fill);

    // ---------- Ground for shadow ----------
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 40),
      new THREE.ShadowMaterial({ opacity: 0.35 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -BOOK_H / 2 - 0.05;
    ground.receiveShadow = true;
    scene.add(ground);

    // ---------- Textures ----------
    const loader = new THREE.TextureLoader();
    const load = (url: string) => {
      const t = loader.load(url);
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 8;
      return t;
    };
    const texCover = load(coverUrl);
    const texBack = load(backUrl);
    const texSpine = load(spineUrl);
    const texPage = load(pageUrl);

    // ---------- Materials ----------
    const leatherEdge = new THREE.MeshStandardMaterial({
      color: 0x0d2a1e,
      roughness: 0.75,
      metalness: 0.05,
    });
    const pageEdge = new THREE.MeshStandardMaterial({
      color: 0xece0c2,
      roughness: 0.95,
    });
    const coverMat = new THREE.MeshStandardMaterial({
      map: texCover,
      roughness: 0.55,
      metalness: 0.15,
    });
    const backMat = new THREE.MeshStandardMaterial({
      map: texBack,
      roughness: 0.55,
      metalness: 0.15,
    });
    const spineMat = new THREE.MeshStandardMaterial({
      map: texSpine,
      roughness: 0.55,
      metalness: 0.15,
    });
    const pageMatFront = new THREE.MeshStandardMaterial({
      map: texPage,
      roughness: 0.95,
      side: THREE.FrontSide,
    });
    const pageMatBack = new THREE.MeshStandardMaterial({
      map: texPage,
      roughness: 0.95,
      side: THREE.FrontSide,
    });

    // ---------- Book group ----------
    const bookGroup = new THREE.Group();
    scene.add(bookGroup);

    // Pages stack (double-sided planes with pivot on left spine edge)
    const pageInsetY = 0.15;
    const pageW = BOOK_W - 0.15;
    const pageH = BOOK_H - pageInsetY * 2;

    const buildPage = (yOffset: number) => {
      const pivot = new THREE.Group();
      pivot.position.set(-BOOK_W / 2 + 0.05, 0, yOffset);

      const geo = new THREE.PlaneGeometry(pageW, pageH, 20, 1);
      // shift so the left edge is at pivot
      geo.translate(pageW / 2, 0, 0);

      const front = new THREE.Mesh(geo, pageMatFront);
      front.castShadow = true;
      front.receiveShadow = true;
      pivot.add(front);

      const backGeo = geo.clone();
      // flip UVs horizontally for back
      const uv = backGeo.attributes.uv;
      for (let i = 0; i < uv.count; i++) {
        uv.setX(i, 1 - uv.getX(i));
      }
      const back = new THREE.Mesh(backGeo, pageMatBack);
      back.rotation.y = Math.PI;
      back.castShadow = true;
      back.receiveShadow = true;
      pivot.add(back);

      return pivot;
    };

    const pagesGroup = new THREE.Group();
    const pages: THREE.Group[] = [];
    for (let i = 0; i < PAGE_COUNT; i++) {
      // stack from back (near back cover) to front (near front cover)
      const y = -BOOK_D / 2 + COVER_T + PAGE_GAP * (i + 0.5);
      const p = buildPage(y);
      pagesGroup.add(p);
      pages.push(p);
    }
    bookGroup.add(pagesGroup);

    // Back cover
    const backCover = new THREE.Mesh(
      new THREE.BoxGeometry(BOOK_W, BOOK_H, COVER_T),
      [leatherEdge, leatherEdge, leatherEdge, leatherEdge, backMat, backMat],
    );
    backCover.position.z = -BOOK_D / 2 + COVER_T / 2;
    backCover.castShadow = true;
    backCover.receiveShadow = true;
    bookGroup.add(backCover);

    // Spine
    const spine = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, BOOK_H, BOOK_D - COVER_T),
      [spineMat, leatherEdge, leatherEdge, leatherEdge, leatherEdge, leatherEdge],
    );
    spine.position.x = -BOOK_W / 2 - 0.04;
    spine.castShadow = true;
    bookGroup.add(spine);

    // Page block sides (fore-edge and top/bottom)
    const block = new THREE.Mesh(
      new THREE.BoxGeometry(BOOK_W - 0.1, BOOK_H - 0.05, BOOK_D - COVER_T * 2 - 0.01),
      pageEdge,
    );
    block.position.set(0.02, 0, 0);
    block.castShadow = true;
    block.receiveShadow = true;
    bookGroup.add(block);

    // Front cover with pivot at spine
    const frontPivot = new THREE.Group();
    frontPivot.position.set(-BOOK_W / 2, 0, BOOK_D / 2 - COVER_T / 2);
    const frontCover = new THREE.Mesh(
      new THREE.BoxGeometry(BOOK_W, BOOK_H, COVER_T),
      [leatherEdge, leatherEdge, leatherEdge, leatherEdge, coverMat, backMat],
    );
    frontCover.position.x = BOOK_W / 2;
    frontCover.castShadow = true;
    frontCover.receiveShadow = true;
    frontPivot.add(frontCover);
    bookGroup.add(frontPivot);

    // ---------- Controls ----------
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.rotateSpeed = 0.9;
    controls.zoomSpeed = 0.8;
    controls.enablePan = false;
    controls.minDistance = 5;
    controls.maxDistance = 18;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.8;
    controls.target.set(0, 0, 0);

    // ---------- Interaction state ----------
    let opened = false;
    let flipping = false;
    let currentFlipped = 0; // how many pages flipped (0..PAGE_COUNT)
    const hoverTilt = new THREE.Vector2(0, 0);
    const targetTilt = new THREE.Vector2(0, 0);
    const pointer = new THREE.Vector2();
    const raycaster = new THREE.Raycaster();

    const setPageRotation = (idx: number, angle: number) => {
      pages[idx].rotation.y = angle;
    };

    const flipNext = () => {
      if (flipping) return;
      if (currentFlipped >= PAGE_COUNT) {
        closeBook();
        return;
      }
      flipping = true;
      const idx = currentFlipped;
      const p = pages[idx];
      gsap.to(p.rotation, {
        y: -Math.PI,
        duration: 1.2,
        ease: "power2.inOut",
        onComplete: () => {
          currentFlipped++;
          flipping = false;
          if (currentFlipped >= PAGE_COUNT) {
            // small pause then close
            gsap.delayedCall(0.8, closeBook);
          }
        },
      });
    };

    const openBook = () => {
      if (opened || flipping) return;
      opened = true;
      controls.autoRotate = false;
      // Smoothly bring the book upright facing the camera
      gsap.to(bookGroup.rotation, { x: 0, y: 0, z: 0, duration: 1.2, ease: "power3.inOut" });
      gsap.to(camera.position, { x: 0, y: 0.8, z: 8.5, duration: 1.4, ease: "power3.inOut", onUpdate: () => controls.update() });
      gsap.to(controls.target, { x: 0, y: 0, z: 0, duration: 1.4, ease: "power3.inOut" });
      // Open front cover
      gsap.to(frontPivot.rotation, {
        y: -Math.PI * 0.98,
        duration: 1.4,
        delay: 0.4,
        ease: "power2.inOut",
      });
    };

    const closeBook = () => {
      // reverse all page flips
      pages.forEach((p) => {
        gsap.to(p.rotation, { y: 0, duration: 0.6, ease: "power2.inOut" });
      });
      gsap.to(frontPivot.rotation, {
        y: 0,
        duration: 1.2,
        delay: 0.4,
        ease: "power2.inOut",
        onComplete: () => {
          opened = false;
          currentFlipped = 0;
          controls.autoRotate = true;
        },
      });
    };

    // ---------- Pointer events ----------
    const el = renderer.domElement;

    const onPointerMove = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      targetTilt.set(pointer.x * 0.12, pointer.y * 0.12);
    };

    let downPos: { x: number; y: number } | null = null;
    const onPointerDown = (e: PointerEvent) => {
      downPos = { x: e.clientX, y: e.clientY };
    };
    const onPointerUp = (e: PointerEvent) => {
      if (!downPos) return;
      const dx = e.clientX - downPos.x;
      const dy = e.clientY - downPos.y;
      downPos = null;
      if (Math.hypot(dx, dy) > 6) return; // it was a drag, not click

      if (!opened) {
        openBook();
        return;
      }
      // check if right side clicked -> flip page
      const rect = el.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(new THREE.Vector2(nx, ny), camera);
      const hits = raycaster.intersectObjects(pagesGroup.children, true);
      if (hits.length > 0) {
        // determine which page (frontmost unflipped)
        flipNext();
      } else if (nx > 0) {
        flipNext();
      } else if (nx < -0.2 && currentFlipped > 0) {
        // flip back
        if (flipping) return;
        flipping = true;
        const idx = currentFlipped - 1;
        gsap.to(pages[idx].rotation, {
          y: 0,
          duration: 1.1,
          ease: "power2.inOut",
          onComplete: () => {
            currentFlipped--;
            flipping = false;
          },
        });
      }
    };

    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointerup", onPointerUp);

    // ---------- Resize ----------
    const onResize = () => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(mount);

    // ---------- Animate ----------
    let rafId = 0;
    const clock = new THREE.Clock();
    const animate = () => {
      rafId = requestAnimationFrame(animate);
      const dt = clock.getDelta();
      // hover tilt with inertia; disabled when open (controls take over)
      if (!opened) {
        hoverTilt.x += (targetTilt.x - hoverTilt.x) * Math.min(1, dt * 4);
        hoverTilt.y += (targetTilt.y - hoverTilt.y) * Math.min(1, dt * 4);
        bookGroup.rotation.z = hoverTilt.x * 0.15;
      }
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointerup", onPointerUp);
      controls.dispose();
      renderer.dispose();
      mount.removeChild(renderer.domElement);
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
      });
    };
  }, []);

  return <div ref={mountRef} className="h-full w-full touch-none" />;
}