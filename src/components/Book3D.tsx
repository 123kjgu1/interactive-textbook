import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import gsap from "gsap";
import confetti from "canvas-confetti";
import { useState } from "react";

import coverUrl from "@/assets/book-cover.jpg";
import backUrl from "@/assets/book-back.jpg";
import spineUrl from "@/assets/book-spine.jpg";
import pageUrl from "@/assets/book-page.jpg";

const BOOK_W = 3.2;
const BOOK_H = 4.4;
const BOOK_D = 0.55;
const COVER_T = 0.05;
const PAGE_COUNT = 4;
const PAGE_GAP = (BOOK_D - COVER_T * 2) / PAGE_COUNT;

// ---------- Page content ----------
type PageContent = {
  title: string;
  body: string[]; // paragraphs
  footer?: string[];
  emojis: string[]; // decorative floating emojis
  accent: string; // hex accent color
};

const PAGES: PageContent[] = [
  {
    title: "Chapter 1 — The Biggest Oops Ever!",
    body: [
      "Once upon a time, there lived one very confident human who believed he was always right.",
      "Unfortunately, his brain decided to take a holiday at the worst possible moment.",
      "One tiny mistake later… he accidentally hurt the most amazing friend in his life.",
      "",
      "🏆 Achievement Unlocked:  \"Professional Idiot\"",
      "",
      "Rewards:",
      "💔  999 Regrets",
      "😅  Unlimited Overthinking",
      "😭  Zero Happiness",
    ],
    emojis: ["📖", "🤦‍♂️", "😂", "💥", "💔", "😅"],
    accent: "#8a4a2b",
  },
  {
    title: "Chapter 2 — Emergency Meeting",
    body: [
      "An emergency meeting started inside my head.",
      "",
      "🧠 Brain:  \"I told you not to say that!\"",
      "👄 Mouth: \"I only followed your orders!\"",
      "❤️ Heart: \"Can everyone stop arguing and just apologize?\"",
      "",
      "Even Google searched…",
      "\"How to undo hurting someone's feelings?\"",
      "",
      "Search Result:",
      "\"There is no Ctrl + Z in real life.\"",
    ],
    emojis: ["🧠", "💬", "❤️", "🤦‍♂️", "😂", "🔎"],
    accent: "#6b3a8a",
  },
  {
    title: "Chapter 3 — A Better Chapter",
    body: [
      "I can't change yesterday.",
      "I can't erase my mistake.",
      "I can't build a time machine…",
      "(Trust me… I searched for one. 😅)",
      "",
      "But I can admit I was wrong.",
      "I can learn from my mistake.",
      "And I can promise to write better chapters in our friendship.",
      "",
      "If this little book made you smile even once…",
      "then maybe… there's hope for an even happier ending.",
    ],
    emojis: ["🥹", "✨", "❤️", "⭐", "🌟", "💫"],
    accent: "#b8862a",
  },
  {
    title: "❤️  Official Apology  ❤️",
    body: [
      "After a very serious investigation…",
      "the world's biggest idiot has finally accepted his mistake.",
      "",
      "And yes… that idiot is ME. 😅",
      "",
      "🥹 👉 👈",
      "",
      "Will you forgive this limited-edition fool and give our friendship one more beautiful chapter?",
    ],
    footer: ["— turn to the last page for the final word —"],
    emojis: ["❤️", "💖", "💗", "✨", "🥹", "🌸"],
    accent: "#c0392b",
  },
];

function drawPageTexture(content: PageContent): THREE.CanvasTexture {
  const W = 1024;
  const H = 1400;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // Paper background with subtle vignette
  const grad = ctx.createRadialGradient(W / 2, H / 2, 100, W / 2, H / 2, W);
  grad.addColorStop(0, "#fbf3df");
  grad.addColorStop(1, "#e9dcb6");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Paper grain (noise)
  const grain = ctx.getImageData(0, 0, W, H);
  for (let i = 0; i < grain.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 14;
    grain.data[i] = Math.max(0, Math.min(255, grain.data[i] + n));
    grain.data[i + 1] = Math.max(0, Math.min(255, grain.data[i + 1] + n));
    grain.data[i + 2] = Math.max(0, Math.min(255, grain.data[i + 2] + n));
  }
  ctx.putImageData(grain, 0, 0);

  // Inner ornamental border
  ctx.strokeStyle = content.accent;
  ctx.lineWidth = 3;
  ctx.strokeRect(60, 60, W - 120, H - 120);
  ctx.lineWidth = 1;
  ctx.strokeRect(76, 76, W - 152, H - 152);

  // Corner ornaments
  ctx.fillStyle = content.accent;
  const corners: [number, number][] = [
    [60, 60],
    [W - 60, 60],
    [60, H - 60],
    [W - 60, H - 60],
  ];
  corners.forEach(([x, y]) => {
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, Math.PI * 2);
    ctx.fill();
  });

  // Title
  ctx.fillStyle = content.accent;
  ctx.textAlign = "center";
  ctx.font = "bold 54px Georgia, 'Times New Roman', serif";
  wrapText(ctx, content.title, W / 2, 180, W - 200, 62);

  // Divider
  ctx.beginPath();
  ctx.moveTo(W / 2 - 120, 250);
  ctx.lineTo(W / 2 + 120, 250);
  ctx.strokeStyle = content.accent;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(W / 2, 250, 6, 0, Math.PI * 2);
  ctx.fillStyle = content.accent;
  ctx.fill();

  // Body text
  ctx.fillStyle = "#2a1f14";
  ctx.textAlign = "center";
  ctx.font = "34px Georgia, 'Times New Roman', serif";
  let y = 330;
  const lineH = 52;
  for (const para of content.body) {
    if (para === "") {
      y += lineH * 0.6;
      continue;
    }
    y = wrapText(ctx, para, W / 2, y, W - 200, lineH) + lineH * 0.4;
  }

  // Footer
  if (content.footer) {
    ctx.fillStyle = content.accent;
    ctx.font = "italic 24px Georgia, serif";
    let fy = H - 180;
    for (const line of content.footer) {
      ctx.fillText(line, W / 2, fy);
      fy += 34;
    }
  }

  // Decorative emojis around margins
  ctx.font = "60px 'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif";
  const positions: [number, number][] = [
    [130, 130],
    [W - 130, 130],
    [130, H - 140],
    [W - 130, H - 140],
    [130, H / 2],
    [W - 130, H / 2],
  ];
  content.emojis.slice(0, positions.length).forEach((e, i) => {
    const [x, yy] = positions[i];
    ctx.fillText(e, x, yy);
  });

  // Page number
  ctx.fillStyle = content.accent;
  ctx.font = "italic 22px Georgia, serif";
  ctx.fillText(`~ ${PAGES.indexOf(content) + 1} ~`, W / 2, H - 100);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
): number {
  const words = text.split(" ");
  let line = "";
  for (let i = 0; i < words.length; i++) {
    const test = line ? line + " " + words[i] : words[i];
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, y);
      line = words[i];
      y += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) {
    ctx.fillText(line, x, y);
    y += lineHeight;
  }
  return y;
}

export default function Book3D() {
  const mountRef = useRef<HTMLDivElement>(null);
  const [showApology, setShowApology] = useState(false);
  const [showThanks, setShowThanks] = useState(false);
  const closeBookRef = useRef<(() => void) | null>(null);

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
    // Per-page front materials with story-text canvas textures
    const pageFrontMats = PAGES.map(
      (pc) =>
        new THREE.MeshStandardMaterial({
          map: drawPageTexture(pc),
          roughness: 0.95,
          side: THREE.FrontSide,
        }),
    );
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

    const buildPage = (yOffset: number, idx: number) => {
      const pivot = new THREE.Group();
      pivot.position.set(-BOOK_W / 2 + 0.05, 0, yOffset);

      const geo = new THREE.PlaneGeometry(pageW, pageH, 20, 1);
      // shift so the left edge is at pivot
      geo.translate(pageW / 2, 0, 0);

      const front = new THREE.Mesh(geo, pageFrontMats[idx]);
      front.castShadow = true;
      front.receiveShadow = true;
      pivot.add(front);

      const backGeo = geo.clone();
      // flip UVs horizontally for back
      const uv = backGeo.attributes.uv;
      for (let i = 0; i < uv.count; i++) {
        uv.setX(i, 1 - uv.getX(i));
      }
      // Show the NEXT page's text on the back side, so once this page
      // is flipped over, the reader sees the next chapter (instead of
      // a blank page hiding the pages beneath).
      const backMaterial =
        idx + 1 < pageFrontMats.length ? pageFrontMats[idx + 1] : pageMatBack;
      const back = new THREE.Mesh(backGeo, backMaterial);
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
      // page 0 must be on top (first read), so reverse order
      const stackIdx = PAGE_COUNT - 1 - i;
      const y = -BOOK_D / 2 + COVER_T + PAGE_GAP * (stackIdx + 0.5);
      const p = buildPage(y, i);
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
    let lastFlipAt = 0;
    let currentFlipped = 0; // how many pages flipped (0..PAGE_COUNT)
    const hoverTilt = new THREE.Vector2(0, 0);
    const targetTilt = new THREE.Vector2(0, 0);
    const pointer = new THREE.Vector2();
    const raycaster = new THREE.Raycaster();

    const setPageRotation = (idx: number, angle: number) => {
      pages[idx].rotation.y = angle;
    };

    const flipNext = () => {
      const now = performance.now();
      if (flipping || now - lastFlipAt < 250) return;
      if (currentFlipped >= PAGE_COUNT) {
        setShowApology(true);
        return;
      }
      flipping = true;
      lastFlipAt = now;
      const idx = currentFlipped;
      const p = pages[idx];
      gsap.to(p.rotation, {
        y: -Math.PI,
        duration: 1.2,
        ease: "power2.inOut",
        onComplete: () => {
          currentFlipped++;
          flipping = false;
          lastFlipAt = performance.now();
          if (currentFlipped >= PAGE_COUNT) {
            // reveal apology overlay after last page
            gsap.delayedCall(0.6, () => setShowApology(true));
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
    closeBookRef.current = closeBook;

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
      if (flipping) return;
      const rect = el.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      if (nx >= 0) {
        flipNext();
      } else if (currentFlipped > 0) {
        // flip back
        flipping = true;
        lastFlipAt = performance.now();
        const idx = currentFlipped - 1;
        gsap.to(pages[idx].rotation, {
          y: 0,
          duration: 1.1,
          ease: "power2.inOut",
          onComplete: () => {
            currentFlipped--;
            flipping = false;
            lastFlipAt = performance.now();
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

  const handleForgive = () => {
    confetti({
      particleCount: 220,
      spread: 100,
      origin: { y: 0.6 },
      colors: ["#ff5b7f", "#ffd166", "#ef476f", "#ffffff", "#ffb3c1"],
    });
    setShowApology(false);
    setTimeout(() => {
      closeBookRef.current?.();
      setShowThanks(true);
    }, 400);
  };

  return (
    <div className="relative h-full w-full">
      <div ref={mountRef} className="h-full w-full touch-none" />

      {showApology && (
        <div className="pointer-events-auto absolute inset-0 z-20 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="mx-4 max-w-md rounded-2xl border border-amber-200/30 bg-gradient-to-b from-[#fdf6e3] to-[#f2e3b8] p-8 text-center shadow-2xl">
            <div className="mb-3 text-6xl">❤️</div>
            <h2 className="font-serif text-2xl text-[#8a2b2b]">
              Official Apology
            </h2>
            <p className="mt-4 font-serif text-[#3b2a14]">
              Will you forgive this limited-edition fool and give our friendship
              one more beautiful chapter? 🥹👉👈
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <button
                onClick={handleForgive}
                className="rounded-full bg-gradient-to-r from-rose-500 to-pink-500 px-6 py-3 font-semibold text-white shadow-lg transition hover:scale-105"
              >
                💖 Yes, I Forgive You
              </button>
              <button
                onClick={handleForgive}
                className="rounded-full border border-amber-700/40 bg-white/70 px-6 py-3 font-semibold text-[#7a4a1a] transition hover:scale-105"
              >
                😂 Only This Time
              </button>
            </div>
          </div>
        </div>
      )}

      {showThanks && (
        <div className="pointer-events-none absolute inset-x-0 bottom-16 z-20 flex justify-center px-4">
          <div className="rounded-full bg-black/70 px-6 py-3 text-center font-serif text-amber-100 shadow-xl backdrop-blur">
            Thank you… I promise the next chapter will be full of smiles. ❤️📖
          </div>
        </div>
      )}
    </div>
  );
}