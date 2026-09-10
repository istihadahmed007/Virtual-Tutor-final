import React, { useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";

/**
 * High-fidelity, GPU-accelerated Vesper volumetric stardust ribbon background.
 *
 * Faithfully matches the exact Vesper.ai hero aesthetic:
 * 1. Undulating luminous silk ribbon in upper viewport (Möbius twist, left loop, right crest)
 * 2. Multi-layered volumetric silk glow with bright edge ridges and soft translucent body
 * 3. 14,000+ stardust particles flowing along the ribbon contour and dispersing into cosmic spray
 * 4. Ambient starfield across the deep black (#000000) canvas
 * 5. Smooth 3D mouse parallax tracking
 * 6. Resilient 2D canvas fallback
 */
interface CinematicHeroBackgroundProps {
  className?: string;
  isFixed?: boolean;
}

export const CinematicHeroBackground: React.FC<CinematicHeroBackgroundProps> = ({
  className = "",
  isFixed = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const getWidth = () =>
      Math.max(10, (isFixed ? window.innerWidth : canvas.parentElement?.clientWidth || window.innerWidth) * dpr);
    const getHeight = () =>
      Math.max(10, (isFixed ? window.innerHeight : canvas.parentElement?.clientHeight || window.innerHeight) * dpr);

    let animId: number;
    let width = (canvas.width = getWidth());
    let height = (canvas.height = getHeight());

    // Mouse tracking for 3D parallax
    const mouse = {
      targetX: 0,
      targetY: 0,
      currentX: 0,
      currentY: 0,
    };

    const handleMouseMove = (e: MouseEvent) => {
      const halfW = window.innerWidth / 2;
      const halfH = window.innerHeight / 2;
      mouse.targetX = (e.clientX - halfW) / (halfW || 1);
      mouse.targetY = (e.clientY - halfH) / (halfH || 1);
    };

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = getWidth();
      height = canvas.height = getHeight();
      if (gl) {
        gl.viewport(0, 0, width, height);
      }
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("resize", handleResize);

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined" && canvas.parentElement) {
      resizeObserver = new ResizeObserver(() => {
        handleResize();
      });
      resizeObserver.observe(canvas.parentElement);
    }

    // ─── 2D CANVAS FALLBACK HANDLER ───
    const start2DFallback = () => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Generate 250 flowing stardust particles for 2D fallback
      const fallbackParticles = Array.from({ length: 280 }, () => ({
        u: Math.random(),
        radius: Math.random() * 0.4 + 0.05,
        speed: (Math.random() * 0.15 + 0.08) * (Math.random() > 0.5 ? 1 : -1),
        size: Math.random() * 2.2 + 0.8,
        phase: Math.random() * Math.PI * 2,
        isRibbon: Math.random() < 0.75,
        ambientX: Math.random(),
        ambientY: Math.random(),
      }));

      const render2D = () => {
        const time = performance.now() * 0.001;
        mouse.currentX += (mouse.targetX - mouse.currentX) * 0.05;
        mouse.currentY += (mouse.targetY - mouse.currentY) * 0.05;

        ctx.fillStyle = "#000000";
        ctx.fillRect(0, 0, width, height);

        ctx.save();
        ctx.globalCompositeOperation = "screen";

        // Parallax offset
        const pX = mouse.currentX * 24 * dpr;
        const pY = -mouse.currentY * 18 * dpr;

        // Draw flowing luminous ribbon layers
        for (let b = 0; b < 4; b++) {
          ctx.beginPath();
          const offsetTime = time * 0.4 + b * 0.7;
          ctx.strokeStyle = `rgba(240, 246, 255, ${0.45 - b * 0.09})`;
          ctx.lineWidth = (52 - b * 9) * dpr;

          for (let x = -20; x <= width + 20; x += 14) {
            const u = x / width;
            const archLeft = Math.exp(-Math.pow((u - 0.24) / 0.14, 2)) * 0.38 * height;
            const archRight = Math.exp(-Math.pow((u - 0.76) / 0.18, 2)) * 0.26 * height;
            const centerDip = -Math.exp(-Math.pow((u - 0.50) / 0.13, 2)) * 0.14 * height;
            const wave = Math.sin(u * 5.5 - offsetTime) * 32 * dpr;
            const wave2 = Math.cos(u * 8.2 + offsetTime * 0.6) * 14 * dpr;
            const y = height * 0.32 - archLeft - archRight - centerDip + wave + wave2 + pY;

            if (x === -20) ctx.moveTo(x + pX, y);
            else ctx.lineTo(x + pX, y);
          }
          ctx.stroke();
        }

        // Draw flowing stardust particles
        for (const p of fallbackParticles) {
          let px = 0;
          let py = 0;
          const twinkle = 0.4 + 0.6 * Math.sin(p.phase + time * 3.5);

          if (p.isRibbon) {
            const u = (p.u + time * p.speed * 0.25) % 1;
            const xBase = u * width;
            const archLeft = Math.exp(-Math.pow((u - 0.24) / 0.14, 2)) * 0.38 * height;
            const archRight = Math.exp(-Math.pow((u - 0.76) / 0.18, 2)) * 0.26 * height;
            const centerDip = -Math.exp(-Math.pow((u - 0.50) / 0.13, 2)) * 0.14 * height;
            const wave = Math.sin(u * 5.5 - time * 0.4) * 32 * dpr;
            const yBase = height * 0.32 - archLeft - archRight - centerDip + wave;

            const scatter = Math.sin(p.phase + time * 2) * p.radius * 75 * dpr;
            px = xBase + pX + scatter * 0.4;
            py = yBase + pY + scatter;
          } else {
            px = p.ambientX * width + pX * 0.4;
            py = p.ambientY * height + pY * 0.4;
          }

          ctx.fillStyle = `rgba(255, 255, 255, ${twinkle * (p.isRibbon ? 0.9 : 0.4)})`;
          ctx.beginPath();
          ctx.arc(px, py, p.size * dpr * (0.8 + 0.3 * twinkle), 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
        animId = requestAnimationFrame(render2D);
      };

      animId = requestAnimationFrame(render2D);
    };

    let gl: WebGLRenderingContext | null = null;
    try {
      gl = canvas.getContext("webgl", {
        alpha: true,
        antialias: true,
        depth: false,
        premultipliedAlpha: false,
      });
    } catch {
      gl = null;
    }

    if (!gl) {
      start2DFallback();
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("resize", handleResize);
        cancelAnimationFrame(animId);
      };
    }

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("resize", handleResize);

    // =========================================================================
    // WEBGL ACCELERATED VESPER SCENE
    // =========================================================================
    if (gl) {
      gl.viewport(0, 0, width, height);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE); // Additive blending for volumetric stardust & silk
      gl.disable(gl.DEPTH_TEST);

      // ─── 1. RIBBON VERTEX SHADER ───
      const ribbonVS = `
        precision highp float;
        attribute vec2 aCoord; // x: u [0, 1] along curve, y: v [-1, 1] across width
        attribute float aLayer; // 0 = wide aura, 1 = mid body, 2 = sharp ridge
        
        uniform float uTime;
        uniform vec2 uResolution;
        uniform vec2 uMouse;

        varying vec2 vCoord;
        varying float vAlpha;
        varying float vLayer;

        void main() {
          vCoord = aCoord;
          vLayer = aLayer;
          float u = aCoord.x;
          float v = aCoord.y;
          float t = uTime * 0.40;

          // X spans full viewport width with slight overflow
          float x = mix(-1.15, 1.15, u);

          // Spine Y matching Vesper Capture.PNG:
          // Left bulbous loop at u ~ 0.22, center twist dip at u ~ 0.48, right crest at u ~ 0.76
          float archLeft = exp(-pow((u - 0.24) / 0.14, 2.0)) * 0.48;
          float archRight = exp(-pow((u - 0.76) / 0.18, 2.0)) * 0.32;
          float centerDip = -exp(-pow((u - 0.50) / 0.13, 2.0)) * 0.18;
          float tail = (u - 0.5) * 0.08;

          // Gentle continuous wave undulations
          float wave1 = sin(u * 5.5 - t * 0.8) * 0.045;
          float wave2 = cos(u * 8.5 + t * 0.5) * 0.022;
          float wave3 = sin(u * 2.8 + t * 0.25) * 0.035;

          // Base Y position in upper viewport: 0.28 clip Y puts it elegantly above headline
          float y = 0.28 + archLeft + archRight + centerDip + tail + wave1 + wave2 + wave3;

          // Z depth curve
          float z = sin(u * 6.28 * 0.85 - 0.4) * 0.35 + cos(u * 4.2 + t * 0.35) * 0.10;

          // Ribbon width: wide on left loop, narrow in center twist, expanding at right tail
          float wLeft = exp(-pow((u - 0.24) / 0.16, 2.0)) * 0.36;
          float wRight = exp(-pow((u - 0.76) / 0.20, 2.0)) * 0.26;
          float baseW = 0.18 + 0.03 * sin(u * 7.0 - t * 0.6);
          float width = baseW + wLeft + wRight;

          // Layer scaling: 0 = wide envelope (1.3x), 1 = mid silk (1.0x), 2 = sharp core (0.45x)
          if (aLayer < 0.5) {
            width *= 1.45;
          } else if (aLayer > 1.5) {
            width *= 0.45;
          }

          // Möbius twist angle
          float twist = u * 3.14159 * 1.85 + sin(u * 3.6 - t * 0.4) * 0.55 + cos(t * 0.2) * 0.15;

          // Normal & Binormal for ribbon orientation
          vec2 normal = vec2(-sin(twist), cos(twist));
          float zOffset = sin(twist * 0.7);

          // Displace along ribbon width
          vec3 pos = vec3(x, y + normal.y * (v * width * 0.5), z + zOffset * (v * width * 0.4));
          pos.x += normal.x * (v * width * 0.3);

          // 3D Parallax from mouse
          pos.x += uMouse.x * 0.06 * (1.0 + pos.z * 0.5);
          pos.y += -uMouse.y * 0.05 * (1.0 + pos.z * 0.5);

          // Edge fade
          vAlpha = smoothstep(0.0, 0.08, u) * smoothstep(1.0, 0.92, u);

          gl_Position = vec4(pos.x, pos.y, pos.z * 0.5, 1.0);
        }
      `;

      // ─── 1. RIBBON FRAGMENT SHADER ───
      const ribbonFS = `
        precision highp float;
        varying vec2 vCoord;
        varying float vAlpha;
        varying float vLayer;

        void main() {
          float v = vCoord.y;
          float u = vCoord.x;

          float core = exp(-v * v * 3.5);
          float ridge = exp(-pow(v - 0.30, 2.0) * 16.0) * 0.45;
          float ridge2 = exp(-pow(v + 0.32, 2.0) * 18.0) * 0.35;

          // Subtle silk thread lines
          float threads = 0.94 + 0.06 * sin(v * 80.0 + u * 40.0);

          // Micro stardust grain
          float grain = fract(sin(dot(vCoord * 140.0, vec2(12.9898, 78.233))) * 43758.5453) * 0.08;

          float intensity = (core * 0.85 + ridge + ridge2 + grain) * threads;

          float layerAlpha;
          if (vLayer < 0.5) {
            // Wide soft aura
            layerAlpha = intensity * 0.18 * vAlpha;
          } else if (vLayer > 1.5) {
            // Sharp brilliant core ridge
            layerAlpha = intensity * 0.75 * vAlpha;
          } else {
            // Mid translucent silk
            layerAlpha = intensity * 0.45 * vAlpha;
          }

          // Brilliant monochrome white with soft platinum falloff
          vec3 color = mix(vec3(0.94, 0.97, 1.0), vec3(1.0, 1.0, 1.0), core);

          gl_FragColor = vec4(color * layerAlpha, layerAlpha);
        }
      `;

      // ─── 2. STARDUST PARTICLES SHADERS ───
      const particleVS = `
        precision highp float;
        attribute float aU;
        attribute float aRadius;
        attribute float aAngle;
        attribute float aSpeed;
        attribute float aSize;
        attribute float aPhase;
        attribute float aType; // 0 = dense ribbon stardust, 1 = ambient cosmos

        uniform float uTime;
        uniform vec2 uResolution;
        uniform vec2 uMouse;
        uniform float uDpr;

        varying float vAlpha;

        void main() {
          float t = uTime * 0.40;
          float u = fract(aU + t * aSpeed * 0.22);

          vec3 pos;

          if (aType < 0.5) {
            // Flowing ribbon stardust
            float x = mix(-1.15, 1.15, u);

            float archLeft = exp(-pow((u - 0.24) / 0.14, 2.0)) * 0.48;
            float archRight = exp(-pow((u - 0.76) / 0.18, 2.0)) * 0.32;
            float centerDip = -exp(-pow((u - 0.50) / 0.13, 2.0)) * 0.18;
            float tail = (u - 0.5) * 0.08;

            float wave1 = sin(u * 5.5 - t * 0.8) * 0.045;
            float wave2 = cos(u * 8.5 + t * 0.5) * 0.022;
            float y = 0.28 + archLeft + archRight + centerDip + tail + wave1 + wave2;
            float z = sin(u * 6.28 * 0.85 - 0.4) * 0.35;

            float twist = u * 3.14159 * 1.85 + sin(u * 3.6 - t * 0.4) * 0.55;
            vec2 normal = vec2(-sin(twist), cos(twist));

            // Orbit & Gaussian plume scatter around ribbon spine
            float angle = aAngle + t * aSpeed * 1.4;
            pos = vec3(
              x + normal.x * cos(angle) * aRadius * 0.3,
              y + normal.y * sin(angle) * aRadius,
              z + cos(angle) * aRadius * 0.4
            );
          } else {
            // Ambient starry cosmic field across full viewport
            float seedX = aU * 2.4 - 1.2;
            float seedY = sin(aAngle) * 0.95;
            float seedZ = cos(aAngle) * 0.5;
            pos = vec3(seedX, seedY, seedZ);
          }

          // Parallax from mouse
          pos.x += uMouse.x * 0.08 * (1.0 + pos.z * 0.5);
          pos.y += -uMouse.y * 0.06 * (1.0 + pos.z * 0.5);

          // Twinkle respiration
          float twinkle = 0.5 + 0.5 * sin(aPhase + t * 3.2);
          vAlpha = (0.35 + twinkle * 0.65) * (aType < 0.5 ? 0.95 : 0.45);

          // Size scaling with device pixel ratio
          gl_PointSize = clamp(aSize * uDpr * (0.8 + 0.35 * twinkle), 1.0, 6.0);
          gl_Position = vec4(pos.x, pos.y, pos.z * 0.5, 1.0);
        }
      `;

      const particleFS = `
        precision highp float;
        varying float vAlpha;

        void main() {
          vec2 coord = gl_PointCoord - vec2(0.5);
          float dist = length(coord);
          if (dist > 0.5) discard;

          // Circular point with brilliant glowing stardust center
          float core = smoothstep(0.5, 0.05, dist);
          float glow = exp(-dist * 4.2);
          float alpha = (core * 0.7 + glow * 0.3) * vAlpha;

          gl_FragColor = vec4(vec3(1.0), alpha);
        }
      `;

      // Helper to compile shaders
      const createShader = (type: number, src: string) => {
        const shader = gl!.createShader(type);
        if (!shader) return null;
        gl!.shaderSource(shader, src);
        gl!.compileShader(shader);
        if (!gl!.getShaderParameter(shader, gl!.COMPILE_STATUS)) {
          console.warn(gl!.getShaderInfoLog(shader));
          gl!.deleteShader(shader);
          return null;
        }
        return shader;
      };

      const createProgram = (vsSrc: string, fsSrc: string) => {
        const vs = createShader(gl!.VERTEX_SHADER, vsSrc);
        const fs = createShader(gl!.FRAGMENT_SHADER, fsSrc);
        if (!vs || !fs) return null;
        const prog = gl!.createProgram();
        if (!prog) return null;
        gl!.attachShader(prog, vs);
        gl!.attachShader(prog, fs);
        gl!.linkProgram(prog);
        if (!gl!.getProgramParameter(prog, gl!.LINK_STATUS)) {
          console.warn(gl!.getProgramInfoLog(prog));
          return null;
        }
        return prog;
      };

      const ribbonProgram = createProgram(ribbonVS, ribbonFS);
      const particleProgram = createProgram(particleVS, particleFS);

      if (!ribbonProgram || !particleProgram) {
        start2DFallback();
        return;
      }

      // ─── 3. BUILD MULTI-LAYER RIBBON MESH DATA ───
      // 3 layers: Layer 0 (soft envelope), Layer 1 (mid silk), Layer 2 (sharp ridge)
      const U_SEG = 220;
      const V_SEG = 24;
      const ribbonVertices: number[] = [];
      const ribbonIndices: number[] = [];

      let vertexOffset = 0;
      for (let layer = 0; layer < 3; layer++) {
        for (let i = 0; i <= U_SEG; i++) {
          const u = i / U_SEG;
          for (let j = 0; j <= V_SEG; j++) {
            const v = (j / V_SEG) * 2 - 1; // -1 to 1
            ribbonVertices.push(u, v, layer);
          }
        }

        for (let i = 0; i < U_SEG; i++) {
          for (let j = 0; j < V_SEG; j++) {
            const row1 = vertexOffset + i * (V_SEG + 1);
            const row2 = vertexOffset + (i + 1) * (V_SEG + 1);

            ribbonIndices.push(row1 + j, row2 + j, row1 + j + 1);
            ribbonIndices.push(row1 + j + 1, row2 + j, row2 + j + 1);
          }
        }
        vertexOffset += (U_SEG + 1) * (V_SEG + 1);
      }

      const ribbonVBO = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, ribbonVBO);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(ribbonVertices), gl.STATIC_DRAW);

      const ribbonIBO = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ribbonIBO);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(ribbonIndices), gl.STATIC_DRAW);

      // ─── 4. BUILD STARDUST PARTICLES DATA (14,000 Particles) ───
      const PARTICLE_COUNT = 14000;
      const particleData: number[] = [];

      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const isRibbon = i < 10500; // 10,500 particles follow ribbon contour
        const u = Math.random();

        // Clustered near ribbon with exponential falloff
        const rPower = Math.pow(Math.random(), 3.0);
        const radius = isRibbon ? rPower * 0.48 + 0.015 : Math.random() * 1.6;
        const angle = Math.random() * Math.PI * 2;
        const speed = (Math.random() * 0.35 + 0.12) * (Math.random() > 0.5 ? 1 : -1);
        const size = isRibbon ? Math.random() * 2.4 + 1.1 : Math.random() * 1.4 + 0.7;
        const phase = Math.random() * Math.PI * 2;
        const type = isRibbon ? 0.0 : 1.0;

        particleData.push(u, radius, angle, speed, size, phase, type);
      }

      const particleVBO = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, particleVBO);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(particleData), gl.STATIC_DRAW);

      // Program Uniforms
      const rTimeLoc = gl.getUniformLocation(ribbonProgram, "uTime");
      const rResLoc = gl.getUniformLocation(ribbonProgram, "uResolution");
      const rMouseLoc = gl.getUniformLocation(ribbonProgram, "uMouse");

      const pTimeLoc = gl.getUniformLocation(particleProgram, "uTime");
      const pResLoc = gl.getUniformLocation(particleProgram, "uResolution");
      const pMouseLoc = gl.getUniformLocation(particleProgram, "uMouse");
      const pDprLoc = gl.getUniformLocation(particleProgram, "uDpr");

      // ─── 5. RENDER ANIMATION LOOP ───
      const startTime = performance.now();

      const renderGL = () => {
        const elapsed = (performance.now() - startTime) / 1000;

        // Damped mouse tracking
        mouse.currentX += (mouse.targetX - mouse.currentX) * 0.05;
        mouse.currentY += (mouse.targetY - mouse.currentY) * 0.05;

        gl!.clearColor(0.0, 0.0, 0.0, 1.0);
        gl!.clear(gl!.COLOR_BUFFER_BIT);

        const time = shouldReduceMotion ? 2.5 : elapsed;

        // 1. Draw Stardust Particles Point Cloud
        gl!.useProgram(particleProgram);
        gl!.uniform1f(pTimeLoc, time);
        gl!.uniform2f(pResLoc, width, height);
        gl!.uniform2f(pMouseLoc, mouse.currentX, mouse.currentY);
        gl!.uniform1f(pDprLoc, dpr);

        gl!.bindBuffer(gl!.ARRAY_BUFFER, particleVBO);
        const stride = 7 * 4;
        const aULoc = gl!.getAttribLocation(particleProgram, "aU");
        const aRadLoc = gl!.getAttribLocation(particleProgram, "aRadius");
        const aAngLoc = gl!.getAttribLocation(particleProgram, "aAngle");
        const aSpdLoc = gl!.getAttribLocation(particleProgram, "aSpeed");
        const aSizLoc = gl!.getAttribLocation(particleProgram, "aSize");
        const aPhsLoc = gl!.getAttribLocation(particleProgram, "aPhase");
        const aTypLoc = gl!.getAttribLocation(particleProgram, "aType");

        gl!.enableVertexAttribArray(aULoc);
        gl!.vertexAttribPointer(aULoc, 1, gl!.FLOAT, false, stride, 0);

        gl!.enableVertexAttribArray(aRadLoc);
        gl!.vertexAttribPointer(aRadLoc, 1, gl!.FLOAT, false, stride, 4);

        gl!.enableVertexAttribArray(aAngLoc);
        gl!.vertexAttribPointer(aAngLoc, 1, gl!.FLOAT, false, stride, 8);

        gl!.enableVertexAttribArray(aSpdLoc);
        gl!.vertexAttribPointer(aSpdLoc, 1, gl!.FLOAT, false, stride, 12);

        gl!.enableVertexAttribArray(aSizLoc);
        gl!.vertexAttribPointer(aSizLoc, 1, gl!.FLOAT, false, stride, 16);

        gl!.enableVertexAttribArray(aPhsLoc);
        gl!.vertexAttribPointer(aPhsLoc, 1, gl!.FLOAT, false, stride, 20);

        gl!.enableVertexAttribArray(aTypLoc);
        gl!.vertexAttribPointer(aTypLoc, 1, gl!.FLOAT, false, stride, 24);

        gl!.drawArrays(gl!.POINTS, 0, PARTICLE_COUNT);

        // 2. Draw Multi-Layer Silk Ribbon
        gl!.useProgram(ribbonProgram);
        gl!.uniform1f(rTimeLoc, time);
        gl!.uniform2f(rResLoc, width, height);
        gl!.uniform2f(rMouseLoc, mouse.currentX, mouse.currentY);

        gl!.bindBuffer(gl!.ARRAY_BUFFER, ribbonVBO);
        const rCoordLoc = gl!.getAttribLocation(ribbonProgram, "aCoord");
        const rLayerLoc = gl!.getAttribLocation(ribbonProgram, "aLayer");

        gl!.enableVertexAttribArray(rCoordLoc);
        gl!.vertexAttribPointer(rCoordLoc, 2, gl!.FLOAT, false, 3 * 4, 0);

        gl!.enableVertexAttribArray(rLayerLoc);
        gl!.vertexAttribPointer(rLayerLoc, 1, gl!.FLOAT, false, 3 * 4, 2 * 4);

        gl!.bindBuffer(gl!.ELEMENT_ARRAY_BUFFER, ribbonIBO);
        gl!.drawElements(gl!.TRIANGLES, ribbonIndices.length, gl!.UNSIGNED_SHORT, 0);

        animId = requestAnimationFrame(renderGL);
      };

      animId = requestAnimationFrame(renderGL);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", handleResize);
      resizeObserver?.disconnect();
      cancelAnimationFrame(animId);
    };
  }, [shouldReduceMotion]);

  return (
    <>
      {/* ─── Vesper WebGL Volumetric Stardust Ribbon Background ─── */}
      <div
        className={`${isFixed ? "fixed" : "absolute"} inset-0 pointer-events-none z-0 overflow-hidden bg-black select-none ${className}`}
        aria-hidden="true"
      >
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none block"
        />

        {/* Ambient Dark Center Readability Vignette (z-index 1) */}
        <div
          className="absolute inset-0 pointer-events-none z-[1]"
          style={{
            background: isFixed
              ? "radial-gradient(ellipse 85% 65% at 50% 50%, rgba(0, 0, 0, 0.45) 0%, rgba(0, 0, 0, 0.15) 55%, rgba(0, 0, 0, 0.65) 100%)"
              : "radial-gradient(ellipse 70% 45% at 50% 40%, rgba(0, 0, 0, 0.6) 0%, rgba(0, 0, 0, 0.18) 60%, transparent 92%), linear-gradient(to bottom, transparent 80%, #000000 100%)",
          }}
        />
      </div>
    </>
  );
};
