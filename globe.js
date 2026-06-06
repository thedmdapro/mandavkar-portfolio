/* =============================================================================
 * ChokepointGlobe — interactive 3D maritime-chokepoint globe for the hero.
 *
 * Single global, no modules, no imports. UMD-style IIFE.
 *   window.ChokepointGlobe = { init(canvas, opts), destroy() }
 *
 * Depends on GLOBAL `THREE` (r0.160 UMD) and GLOBAL `gsap`, both loaded BEFORE
 * init() is called. We reference them ONLY inside init() (not at parse time) so
 * the file can be parsed before Three.js has lazy-loaded.
 *
 * Visual intent: an oversized dark sphere bleeding off the right + bottom of the
 * canvas, dot-matrix continents, breathing ochre chokepoint nodes, and curated
 * oxblood great-circle arcs that draw in then pulse. One glow hue, one accent.
 * No bloom, no starfield, no photoreal earth.
 * ========================================================================== */

(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // STATIC DATA (safe to define at parse time — no THREE/gsap references here)
  // ---------------------------------------------------------------------------

  // 12 maritime chokepoints. lat/lon in degrees.
  var CHOKEPOINTS = [
    { name: 'Strait of Hormuz',          lat: 26.57,  lon: 56.25 },
    { name: 'Strait of Malacca',         lat: 1.43,   lon: 102.89 },
    { name: 'Bab-el-Mandeb / Suez',      lat: 12.58,  lon: 43.33 },
    { name: 'Panama Canal',              lat: 9.08,   lon: -79.68 },
    { name: 'Bosphorus',                 lat: 41.12,  lon: 29.07 },
    { name: 'Strait of Gibraltar',       lat: 35.97,  lon: -5.50 },
    { name: 'Taiwan Strait',             lat: 24.50,  lon: 119.20 },
    { name: 'Danish Straits',            lat: 55.87,  lon: 12.70 },
    { name: 'Cape of Good Hope',         lat: -34.36, lon: 18.47 },
    { name: 'Cape Horn',                 lat: -55.98, lon: -67.27 },
    { name: 'Lombok Strait',             lat: -8.70,  lon: 115.85 },
    { name: 'Arctic NSR',                lat: 74.00,  lon: 80.00 }
  ];

  // index lookup by name for arc wiring
  var IDX = {};
  for (var ci = 0; ci < CHOKEPOINTS.length; ci++) IDX[CHOKEPOINTS[ci].name] = ci;

  // Curated arcs. tier 1 = brightest/widest … tier 3 = faintest. Only these draw.
  var ARCS = [
    // T1
    { a: 'Strait of Hormuz',     b: 'Strait of Malacca',     tier: 1 },
    { a: 'Strait of Malacca',    b: 'Taiwan Strait',         tier: 1 },
    { a: 'Strait of Hormuz',     b: 'Bab-el-Mandeb / Suez',  tier: 1 },
    { a: 'Bab-el-Mandeb / Suez', b: 'Strait of Gibraltar',   tier: 1 },
    { a: 'Bab-el-Mandeb / Suez', b: 'Cape of Good Hope',     tier: 1 },
    // T2
    { a: 'Strait of Gibraltar',  b: 'Panama Canal',          tier: 2 },
    { a: 'Panama Canal',         b: 'Taiwan Strait',         tier: 2 },
    { a: 'Strait of Malacca',    b: 'Lombok Strait',         tier: 2 },
    { a: 'Bosphorus',            b: 'Bab-el-Mandeb / Suez',  tier: 2 },
    // T3
    { a: 'Danish Straits',       b: 'Bosphorus',             tier: 3 },
    { a: 'Arctic NSR',           b: 'Danish Straits',        tier: 3 },
    { a: 'Cape Horn',            b: 'Panama Canal',          tier: 3 }
  ];

  // Coarse continent outlines as closed lat/lon polygons (degrees). Deliberately
  // low-fidelity — enough that the dot-matrix reads as Earth without shipping a
  // texture. Point-in-polygon over these decides land vs sea. Fully self-contained.
  // Order: [lon, lat] pairs.
  var LAND_POLYS = [
    // --- Eurasia + a chunk of the Middle East (the hero-facing landmass) ---
    [[-10,36],[-5,43],[0,49],[2,51],[8,54],[12,55],[20,55],[28,58],[30,61],
     [28,66],[33,69],[42,67],[50,69],[60,70],[69,73],[80,73],[100,76],[113,74],
     [130,72],[142,72],[160,70],[170,68],[178,66],[180,64],[170,60],[160,60],
     [155,52],[143,46],[135,44],[130,42],[127,38],[122,31],[120,24],[110,21],
     [108,15],[106,10],[100,7],[98,9],[97,16],[93,22],[88,21],[80,15],[77,8],
     [73,18],[68,24],[60,25],[57,25],[48,29],[44,38],[36,36],[28,36],[20,38],
     [12,37],[3,37],[-6,36],[-10,36]],
    // --- Africa ---
    [[-17,15],[-16,21],[-10,30],[0,32],[10,34],[20,32],[32,31],[35,28],[43,12],
     [51,12],[48,2],[42,-2],[40,-10],[40,-18],[35,-22],[32,-28],[27,-34],[20,-35],
     [16,-29],[12,-17],[9,-1],[6,4],[-4,5],[-12,8],[-17,15]],
    // --- North America ---
    [[-168,66],[-160,70],[-140,70],[-125,70],[-110,68],[-95,68],[-82,73],[-70,68],
     [-64,60],[-66,50],[-60,47],[-66,44],[-70,42],[-74,40],[-76,35],[-81,31],
     [-81,25],[-90,29],[-94,29],[-97,26],[-99,22],[-105,20],[-110,23],[-114,30],
     [-117,33],[-122,37],[-124,42],[-124,48],[-130,55],[-138,59],[-150,60],
     [-160,59],[-165,62],[-168,66]],
    // --- South America ---
    [[-81,8],[-77,8],[-70,11],[-62,10],[-52,4],[-50,-2],[-44,-3],[-40,-10],
     [-39,-18],[-48,-25],[-54,-34],[-58,-39],[-63,-42],[-66,-50],[-69,-54],
     [-74,-52],[-73,-44],[-72,-35],[-71,-25],[-70,-18],[-76,-14],[-81,-6],
     [-80,2],[-78,6],[-81,8]],
    // --- Australia ---
    [[114,-22],[122,-18],[130,-12],[137,-12],[142,-11],[146,-18],[150,-24],
     [153,-28],[150,-37],[143,-39],[136,-35],[129,-32],[121,-34],[115,-34],
     [113,-26],[114,-22]],
    // --- Greenland (small, helps the north read) ---
    [[-45,60],[-30,60],[-20,70],[-22,78],[-35,82],[-50,80],[-55,72],[-48,64],[-45,60]],
    // --- Madagascar (tiny accent) ---
    [[43,-12],[50,-15],[50,-24],[45,-25],[43,-18],[43,-12]],
    // --- British Isles (tiny accent so Europe limb reads) ---
    [[-8,51],[-5,55],[-3,58],[0,53],[-2,50],[-6,50],[-8,51]],
    // --- Japan (tiny accent) ---
    [[130,31],[135,34],[140,38],[142,41],[140,35],[136,33],[130,31]]
  ];

  // ---------------------------------------------------------------------------
  // Shared geo helper (no THREE dependency — returns a plain {x,y,z})
  // Convention given by the host:
  //   phi=(90-lat)*PI/180; theta=(lon+180)*PI/180
  //   x=-R*sin(phi)*cos(theta); y=R*cos(phi); z=R*sin(phi)*sin(theta)
  // ---------------------------------------------------------------------------
  function latLonToXYZ(lat, lon, R) {
    var phi = (90 - lat) * Math.PI / 180;
    var theta = (lon + 180) * Math.PI / 180;
    return {
      x: -R * Math.sin(phi) * Math.cos(theta),
      y: R * Math.cos(phi),
      z: R * Math.sin(phi) * Math.sin(theta)
    };
  }

  // Even-odd ray-cast point-in-polygon for land sampling. poly = [[lon,lat],...]
  function pointInPoly(lon, lat, poly) {
    var inside = false;
    for (var i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      var xi = poly[i][0], yi = poly[i][1];
      var xj = poly[j][0], yj = poly[j][1];
      var hit = ((yi > lat) !== (yj > lat)) &&
        (lon < (xj - xi) * (lat - yi) / (yj - yi) + xi);
      if (hit) inside = !inside;
    }
    return inside;
  }
  function isLand(lon, lat) {
    for (var p = 0; p < LAND_POLYS.length; p++) {
      if (pointInPoly(lon, lat, LAND_POLYS[p])) return true;
    }
    return false;
  }

  // Parse "rgb(r,g,b)" / "rgba(...)" / "#rrggbb" → {r,g,b} in 0..1. Defensive.
  function parseColor(str, fallback) {
    var out = fallback || { r: 1, g: 1, b: 1 };
    if (typeof str !== 'string') return out;
    var m = str.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i);
    if (m) {
      return { r: +m[1] / 255, g: +m[2] / 255, b: +m[3] / 255 };
    }
    var h = str.replace('#', '').trim();
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    if (h.length === 6) {
      var n = parseInt(h, 16);
      if (!isNaN(n)) return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 };
    }
    return out;
  }

  // ---------------------------------------------------------------------------
  // Module-level state for the single active instance + destroy().
  // ---------------------------------------------------------------------------
  var STATE = null;

  // ---------------------------------------------------------------------------
  // PUBLIC API
  // ---------------------------------------------------------------------------
  var ChokepointGlobe = {

    /**
     * init(canvasEl, opts)
     * opts = { reduce, finePtr, lowDetail, colors:{dark,node,arc,arcGlow,land,graticule}, onReady }
     */
    init: function (canvasEl, opts) {
      // Guard re-entry: tear down any previous instance first.
      try { if (STATE) ChokepointGlobe.destroy(); } catch (e) {}

      opts = opts || {};
      var colors = opts.colors || {};
      var reduce = !!opts.reduce;
      var finePtr = !!opts.finePtr;
      var lowDetail = !!opts.lowDetail;
      var onReady = typeof opts.onReady === 'function' ? opts.onReady : function () {};
      var firedReady = false;
      function fireReady() {
        if (firedReady) return;
        firedReady = true;
        try { onReady(); } catch (e) {}
      }

      // Bail cleanly if THREE missing — host keeps its poster fallback.
      if (typeof THREE === 'undefined' || !canvasEl) {
        fireReady();
        return;
      }
      var hasGSAP = (typeof gsap !== 'undefined');

      // --- resolve colors → THREE.Color (with sane fallbacks) ---
      var cDark      = parseColor(colors.dark,      { r: 0.078, g: 0.086, b: 0.118 });
      var cNode      = parseColor(colors.node,      { r: 0.831, g: 0.627, b: 0.235 });
      var cArc       = parseColor(colors.arc,       { r: 0.588, g: 0.216, b: 0.204 });
      var cArcGlow   = parseColor(colors.arcGlow,   { r: 0.831, g: 0.627, b: 0.235 });
      var cLand      = parseColor(colors.land,      { r: 0.78,  g: 0.74,  b: 0.66 });
      var cGrat      = parseColor(colors.graticule, { r: 0.85,  g: 0.82,  b: 0.74 });

      var COL_DARK    = new THREE.Color(cDark.r, cDark.g, cDark.b);
      var COL_NODE    = new THREE.Color(cNode.r, cNode.g, cNode.b);
      var COL_ARC     = new THREE.Color(cArc.r, cArc.g, cArc.b);
      var COL_ARCGLOW = new THREE.Color(cArcGlow.r, cArcGlow.g, cArcGlow.b);
      var COL_LAND    = new THREE.Color(cLand.r, cLand.g, cLand.b);
      var COL_GRAT    = new THREE.Color(cGrat.r, cGrat.g, cGrat.b);

      // LUMINOUS FLUX redesign: darken the sphere base so glowing elements pop,
      // and derive a warm oxblood→ochre palette from the existing tokens for the
      // atmosphere halo, the glowing land dots, and the flowing arc particles.
      // We add NO required new color keys — everything is derived from
      // dark / node(ochre) / arc(oxblood) / arcGlow(ochre) / land(cream).
      // (Optional override keys `halo` and `landWarm` are honoured if supplied.)
      var COL_SPHERE = COL_DARK.clone().lerp(new THREE.Color(0, 0, 0), 0.18);

      // Halo / fresnel atmosphere colour: warm oxblood→ochre. Default derived by
      // pushing the oxblood arc colour toward the ochre node colour.
      var cHalo = colors.halo ? parseColor(colors.halo, null) : null;
      var COL_HALO = cHalo
        ? new THREE.Color(cHalo.r, cHalo.g, cHalo.b)
        : COL_ARC.clone().lerp(COL_NODE, 0.45);

      // Warm land glow: oxblood body lifted toward ochre. Derived from arc→node so
      // dots read as luminous data, not flat cream. (Override key: `landWarm`.)
      var cLandWarm = colors.landWarm ? parseColor(colors.landWarm, null) : null;
      var COL_LAND_BODY = cLandWarm
        ? new THREE.Color(cLandWarm.r, cLandWarm.g, cLandWarm.b)
        : COL_ARC.clone().lerp(COL_NODE, 0.30);          // oxblood-leaning
      var COL_LAND_HI = COL_NODE.clone().lerp(new THREE.Color(1, 1, 1), 0.30); // ochre highlight

      // -----------------------------------------------------------------------
      // RENDERER — guard WebGL context creation, never throw.
      // -----------------------------------------------------------------------
      var renderer;
      try {
        renderer = new THREE.WebGLRenderer({
          canvas: canvasEl,
          alpha: true,
          antialias: false,   // perf: MSAA on a half-viewport canvas is costly; dpr + fresnel soften enough
          powerPreference: 'high-performance'
        });
      } catch (e) {
        fireReady();
        return;
      }
      if (!renderer || !renderer.getContext || !renderer.getContext()) {
        try { if (renderer) renderer.dispose(); } catch (e) {}
        fireReady();
        return;
      }

      var parent = canvasEl.parentNode || canvasEl;
      function readRect() {
        var r = (parent.getBoundingClientRect && parent.getBoundingClientRect()) || { width: 800, height: 600 };
        return { w: Math.max(1, r.width || 800), h: Math.max(1, r.height || 600) };
      }
      var rect = readRect();

      var pixelRatio = Math.min(1.25, window.devicePixelRatio || 1);   // perf: large canvas
      if (lowDetail) pixelRatio = Math.min(1.0, pixelRatio); // lower internal res
      renderer.setPixelRatio(pixelRatio);
      renderer.setSize(rect.w, rect.h, false);
      // Render colors AS AUTHORED. The host passes plain CSS rgb() (sRGB) strings
      // for a flat, stylized matte look. If we let THREE encode linear→sRGB on
      // output it lifts the dark sphere into washed-out grey. So we treat our
      // THREE.Color values as already display-referred and skip the encode.
      try {
        if ('outputColorSpace' in renderer) {
          renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
        } else if ('outputEncoding' in renderer && typeof THREE.LinearEncoding !== 'undefined') {
          renderer.outputEncoding = THREE.LinearEncoding;
        }
      } catch (e) {}

      // -----------------------------------------------------------------------
      // SCENE + CAMERA
      // Composition: globe oversized, bleeding off the RIGHT + BOTTOM, with the
      // Europe→Middle-East→Asia hemisphere facing camera. We do this by pushing
      // the sphere group to the right/down and aiming the camera at it from a
      // slight angle, then yawing the globe so the dense hemisphere faces us.
      // -----------------------------------------------------------------------
      var scene = new THREE.Scene();

      var R = 1.0; // unit sphere radius — everything scales off this.

      var camera = new THREE.PerspectiveCamera(38, rect.w / rect.h, 0.1, 100);
      camera.position.set(0, 0, 3.05);
      camera.lookAt(0, 0, 0);

      // World group we offset so the sphere bleeds off-canvas to the right/bottom.
      var world = new THREE.Group();
      // Shift right & down in view space. The camera looks down -Z, so +X is
      // screen-right, +Y is screen-up. Move the globe right and down.
      world.position.set(0.92, -0.42, 0);
      scene.add(world);

      // Rotation group (yaw + pitch applied here so offset stays fixed).
      var spin = new THREE.Group();
      world.add(spin);

      // Start yaw so the Europe / Middle East / Asia face is presented.
      // Tuned empirically with the given lat/lon convention.
      var yaw = -1.15;      // current yaw angle (radians)
      var pitch = 0.18;     // current pitch (radians), clamped
      var PITCH_MIN = -0.45, PITCH_MAX = 0.55;
      spin.rotation.order = 'YXZ';

      // -----------------------------------------------------------------------
      // 1) DARK MATTE SPHERE
      // -----------------------------------------------------------------------
      var sphereSegs = lowDetail ? 32 : 48;
      var sphereGeo = new THREE.SphereGeometry(R * 0.998, sphereSegs, sphereSegs);
      // Bake a soft directional shade into vertex colors so the matte sphere
      // reads as a 3D form (terminator falloff) without any light rig. The shade
      // is computed in LOCAL space; since `spin` rotates the mesh, the lit side
      // stays fixed to the geometry — acceptable for a subtle matte look and far
      // cheaper than re-lighting per frame.
      var sphereColors = new Float32Array(sphereGeo.attributes.position.count * 3);
      var sLightDir = new THREE.Vector3(-0.35, 0.5, 0.9).normalize(); // upper-left-ish
      var spv = sphereGeo.attributes.position;
      var sNrm = new THREE.Vector3();
      var litCol = COL_SPHERE.clone();
      var shadowCol = COL_DARK.clone().multiplyScalar(0.55); // deep limb so glow pops
      for (var sv = 0; sv < spv.count; sv++) {
        sNrm.set(spv.getX(sv), spv.getY(sv), spv.getZ(sv)).normalize();
        var ndl = sNrm.dot(sLightDir);            // -1..1
        var k = smoothstep(-0.6, 0.85, ndl);      // 0 dark limb → 1 lit
        sphereColors[sv * 3]     = shadowCol.r + (litCol.r - shadowCol.r) * k;
        sphereColors[sv * 3 + 1] = shadowCol.g + (litCol.g - shadowCol.g) * k;
        sphereColors[sv * 3 + 2] = shadowCol.b + (litCol.b - shadowCol.b) * k;
      }
      sphereGeo.setAttribute('color', new THREE.Float32BufferAttribute(sphereColors, 3));
      var sphereMat = new THREE.MeshBasicMaterial({
        vertexColors: true,
        transparent: false,
        opacity: 1.0
      });
      var sphereMesh = new THREE.Mesh(sphereGeo, sphereMat);
      spin.add(sphereMesh);

      // -----------------------------------------------------------------------
      // 1b) FRESNEL ATMOSPHERE HALO — a back-facing shell, slightly larger than
      // the globe, lit by a fresnel falloff that is brightest at the limb/edge.
      // Reads as a glowing warm atmosphere. Cheap: one ShaderMaterial, additive,
      // back faces only, no depth write. Lives on `world` (not `spin`) so the
      // halo stays oriented to the camera, not the rotating geometry.
      // lowDetail → skipped entirely (perf).
      // -----------------------------------------------------------------------
      var atmoMesh = null, atmoMat = null, atmoGeo = null;
      if (!lowDetail) {
        atmoGeo = new THREE.SphereGeometry(R * 1.16, lowDetail ? 24 : 40, lowDetail ? 24 : 40);
        atmoMat = new THREE.ShaderMaterial({
          transparent: true,
          blending: THREE.AdditiveBlending,
          side: THREE.BackSide,
          depthWrite: false,
          depthTest: false,
          uniforms: {
            uColor:     { value: COL_HALO.clone() },
            uColorEdge: { value: COL_NODE.clone() },   // ochre toward the very rim
            uIntensity: { value: 0.85 },
            uPower:     { value: 3.2 },
            uTime:      { value: 0.0 }
          },
          vertexShader: [
            'varying vec3 vN;',
            'varying vec3 vView;',
            'void main() {',
            '  vec4 wp = modelMatrix * vec4(position, 1.0);',
            '  vN = normalize(mat3(modelMatrix) * normal);',
            '  vView = normalize(cameraPosition - wp.xyz);',
            '  gl_Position = projectionMatrix * viewMatrix * wp;',
            '}'
          ].join('\n'),
          fragmentShader: [
            'varying vec3 vN;',
            'varying vec3 vView;',
            'uniform vec3 uColor;',
            'uniform vec3 uColorEdge;',
            'uniform float uIntensity;',
            'uniform float uPower;',
            'uniform float uTime;',
            'void main() {',
            // back faces: flip normal so it points outward toward the camera.
            '  vec3 n = normalize(-vN);',
            '  float fres = 1.0 - max(dot(n, normalize(vView)), 0.0);',
            '  float rim = pow(fres, uPower);',
            // gentle breathing so the atmosphere feels alive (not strobing)
            '  float pulse = 0.92 + 0.08 * sin(uTime * 0.6);',
            // warmer (ochre) toward the extreme limb, oxblood-ochre inward
            '  vec3 col = mix(uColor, uColorEdge, smoothstep(0.55, 1.0, rim));',
            '  float a = rim * uIntensity * pulse;',
            '  gl_FragColor = vec4(col * a, a);',
            '}'
          ].join('\n')
        });
        atmoMesh = new THREE.Mesh(atmoGeo, atmoMat);
        atmoMesh.renderOrder = -1; // draw behind the dots/arcs
        world.add(atmoMesh);
      }

      // -----------------------------------------------------------------------
      // 2) FAINT GRATICULE (lat/long LineSegments, ~6% opacity)
      // -----------------------------------------------------------------------
      var gratGeo = new THREE.BufferGeometry();
      var gratPos = [];
      var GR = R * 1.001;
      var latStep = lowDetail ? 30 : 20;   // degrees between parallels
      var lonStep = lowDetail ? 30 : 20;   // degrees between meridians
      var seg = lowDetail ? 48 : 72;       // segments per ring
      // Parallels
      for (var la = -80; la <= 80; la += latStep) {
        for (var s = 0; s < seg; s++) {
          var lo0 = -180 + (360 * s) / seg;
          var lo1 = -180 + (360 * (s + 1)) / seg;
          var p0 = latLonToXYZ(la, lo0, GR);
          var p1 = latLonToXYZ(la, lo1, GR);
          gratPos.push(p0.x, p0.y, p0.z, p1.x, p1.y, p1.z);
        }
      }
      // Meridians
      for (var lo = -180; lo < 180; lo += lonStep) {
        for (var t = 0; t < seg; t++) {
          var la0 = -90 + (180 * t) / seg;
          var la1 = -90 + (180 * (t + 1)) / seg;
          var q0 = latLonToXYZ(la0, lo, GR);
          var q1 = latLonToXYZ(la1, lo, GR);
          gratPos.push(q0.x, q0.y, q0.z, q1.x, q1.y, q1.z);
        }
      }
      gratGeo.setAttribute('position', new THREE.Float32BufferAttribute(gratPos, 3));
      var gratMat = new THREE.LineBasicMaterial({
        color: COL_GRAT,
        transparent: true,
        opacity: 0.06,
        depthWrite: false
      });
      var graticule = new THREE.LineSegments(gratGeo, gratMat);
      spin.add(graticule);

      // -----------------------------------------------------------------------
      // 3) DOT-MATRIX LANDMASSES (THREE.Points)
      // Sample a lat/lon grid; keep points that fall on land. Density tuned to
      // hit ~5–6k desktop, ~1.5k lowDetail. A small round sprite gives soft dots.
      // -----------------------------------------------------------------------
      var landPos = [];
      var landDir = []; // unit direction per dot (for limb-aware highlight)
      var landSeed = []; // per-dot random seed for shimmer + size/brightness
      // grid resolution in degrees — finer = more points.
      // step 1.4 → ~5.3k desktop dots; step 2.6 → ~1.5k lowDetail dots.
      var gridStep = lowDetail ? 3.2 : 1.9;   // perf: fewer dots = less per-dot shader work
      var landR = R * 1.004;
      for (var glat = -78; glat <= 84; glat += gridStep) {
        // Equal-area-ish: widen lon step toward poles so dots don't bunch.
        var lonScale = 1 / Math.max(0.30, Math.cos(glat * Math.PI / 180));
        var gStep = gridStep * lonScale;
        for (var glon = -180; glon < 180; glon += gStep) {
          // tiny jitter to avoid mechanical rows
          var jLat = glat + (Math.random() - 0.5) * gridStep * 0.5;
          var jLon = glon + (Math.random() - 0.5) * gStep * 0.5;
          if (isLand(jLon, jLat)) {
            var lp = latLonToXYZ(jLat, jLon, landR);
            landPos.push(lp.x, lp.y, lp.z);
            var lpn = 1 / Math.max(1e-6, Math.sqrt(lp.x * lp.x + lp.y * lp.y + lp.z * lp.z));
            landDir.push(lp.x * lpn, lp.y * lpn, lp.z * lpn);
            landSeed.push(Math.random());
          }
        }
      }
      var landGeo = new THREE.BufferGeometry();
      landGeo.setAttribute('position', new THREE.Float32BufferAttribute(landPos, 3));
      landGeo.setAttribute('aDir', new THREE.Float32BufferAttribute(landDir, 3));
      landGeo.setAttribute('aSeed', new THREE.Float32BufferAttribute(landSeed, 1));

      var landDotTex = makeDotTexture();
      // LUMINOUS land: a custom additive Points shader. Each dot is coloured by a
      // warm oxblood→ochre gradient (oxblood in the body, ochre toward the limb /
      // highlights), with per-dot size + brightness variation and a slow shimmer.
      // The result reads as glowing data, not flat cream. lowDetail keeps the
      // shader (it's cheap) but disables shimmer via uShimmer=0.
      var landBaseSize = lowDetail ? 240.0 : 175.0; // px-space size factor (scaled by uPixelRatio)
      var landMat = new THREE.ShaderMaterial({
        transparent: true,
        blending: THREE.NormalBlending,   // NOT additive: dense continents would sum to white blowout
        depthWrite: false,
        depthTest: true,
        uniforms: {
          uMap:       { value: landDotTex },
          uBody:      { value: COL_LAND_BODY.clone() },
          uHi:        { value: COL_LAND_HI.clone() },
          uSize:      { value: landBaseSize },
          uPixelRatio:{ value: pixelRatio },
          uTime:      { value: 0.0 },
          uShimmer:   { value: lowDetail ? 0.0 : 1.0 },
          uOpacity:   { value: lowDetail ? 0.85 : 0.92 }
        },
        vertexShader: [
          'attribute vec3 aDir;',
          'attribute float aSeed;',
          'uniform float uSize;',
          'uniform float uPixelRatio;',
          'uniform float uTime;',
          'uniform float uShimmer;',
          'varying float vLimb;',
          'varying float vBright;',
          'void main() {',
          '  vec4 mv = modelViewMatrix * vec4(position, 1.0);',
          // limb factor: how edge-on this dot is to the camera (0 front → 1 limb)
          '  vec3 wn = normalize(mat3(modelMatrix) * aDir);',
          '  vec3 vd = normalize(cameraPosition - (modelMatrix * vec4(position,1.0)).xyz);',
          '  vLimb = 1.0 - max(dot(wn, vd), 0.0);',
          // slow per-dot shimmer in brightness
          '  float sh = uShimmer * 0.22 * sin(uTime * 1.3 + aSeed * 6.2831);',
          '  vBright = 0.78 + 0.22 * aSeed + sh;',
          // per-dot size variation; attenuate with distance like sizeAttenuation
          '  float sizeVar = 0.75 + 0.6 * aSeed;',
          '  gl_PointSize = uSize * uPixelRatio * sizeVar / max(0.001, -mv.z);',
          '  gl_Position = projectionMatrix * mv;',
          '}'
        ].join('\n'),
        fragmentShader: [
          'uniform sampler2D uMap;',
          'uniform vec3 uBody;',
          'uniform vec3 uHi;',
          'uniform float uOpacity;',
          'varying float vLimb;',
          'varying float vBright;',
          'void main() {',
          '  vec4 tex = texture2D(uMap, gl_PointCoord);',
          '  if (tex.a < 0.04) discard;',
          // oxblood body → ochre highlight toward the limb
          '  vec3 col = mix(uBody, uHi, smoothstep(0.15, 0.85, vLimb));',
          '  float a = tex.a * uOpacity * clamp(vBright, 0.0, 1.4);',
          '  gl_FragColor = vec4(col * vBright, a);',
          '}'
        ].join('\n')
      });
      var landPoints = new THREE.Points(landGeo, landMat);
      spin.add(landPoints);

      // -----------------------------------------------------------------------
      // 4) CHOKEPOINT NODES — additive glow sprites + tiny solid core.
      // Back-hemisphere nodes fade by depth so the globe reads solid.
      // -----------------------------------------------------------------------
      var glowTex = makeGlowTexture();
      var ringTex = makeRingTexture();

      // Which chokepoints are endpoints of a tier-1 arc → they get an expanding
      // halo ring + extra brightness, marking the primary flow hubs.
      var TIER1_NODES = {};
      for (var ti = 0; ti < ARCS.length; ti++) {
        if (ARCS[ti].tier === 1) { TIER1_NODES[IDX[ARCS[ti].a]] = true; TIER1_NODES[IDX[ARCS[ti].b]] = true; }
      }

      var nodeObjs = []; // { group, glow, core, ring?, dir, name, baseScale, tier1 }
      var nodeGroup = new THREE.Group();
      spin.add(nodeGroup);

      for (var n = 0; n < CHOKEPOINTS.length; n++) {
        var cp = CHOKEPOINTS[n];
        var isT1 = !!TIER1_NODES[n];
        var pos = latLonToXYZ(cp.lat, cp.lon, R * 1.012);
        var dir = new THREE.Vector3(pos.x, pos.y, pos.z).normalize();
        var ndGroup = new THREE.Group();
        ndGroup.position.set(pos.x, pos.y, pos.z);

        // soft additive glow halo — bigger + brighter than before
        var glowMat = new THREE.SpriteMaterial({
          map: glowTex,
          color: COL_NODE,
          transparent: true,
          opacity: 0.95,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          depthTest: false
        });
        var glow = new THREE.Sprite(glowMat);
        var gScale = isT1 ? 0.155 : 0.125;
        glow.scale.set(gScale, gScale, gScale);
        ndGroup.add(glow);

        // tiny solid bright core (near-white ochre)
        var coreMat = new THREE.SpriteMaterial({
          map: glowTex,
          color: COL_NODE.clone().lerp(new THREE.Color(1, 1, 1), 0.7),
          transparent: true,
          opacity: 1.0,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          depthTest: false
        });
        var core = new THREE.Sprite(coreMat);
        core.scale.set(0.034, 0.034, 0.034);
        ndGroup.add(core);

        // expanding halo ring (tier-1 hubs only): a thin ring sprite that grows
        // outward and fades on a loop, like a sonar ping over the flow hub.
        var ring = null, ringMat = null;
        if (isT1) {
          ringMat = new THREE.SpriteMaterial({
            map: ringTex,
            color: COL_NODE,
            transparent: true,
            opacity: 0.0,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            depthTest: false
          });
          ring = new THREE.Sprite(ringMat);
          ring.scale.set(0.06, 0.06, 0.06);
          ndGroup.add(ring);
        }

        nodeGroup.add(ndGroup);
        nodeObjs.push({
          group: ndGroup, glow: glow, core: core,
          ring: ring, ringMat: ringMat, dir: dir,
          name: cp.name, baseScale: gScale, tier1: isT1,
          phase: Math.random() * Math.PI * 2,  // breathing offset
          ringPhase: Math.random()             // ring loop offset (0..1)
        });
      }

      // -----------------------------------------------------------------------
      // 5) GREAT-CIRCLE ARCS — slerp between node unit vectors, lifted by an
      // altitude that scales with arc length, → TubeGeometry. Additive, gradient
      // arc→arcGlow. Draw-in via drawRange, then a travelling pulse.
      // lowDetail → no arcs.
      // -----------------------------------------------------------------------
      var arcObjs = []; // { mesh, mat, total, pulse... }
      var ARC_SAMPLES = lowDetail ? 0 : 64;

      if (!lowDetail) {
        for (var ai = 0; ai < ARCS.length; ai++) {
          var spec = ARCS[ai];
          var ia = IDX[spec.a], ib = IDX[spec.b];
          if (ia == null || ib == null) continue;
          var va = new THREE.Vector3().copy(nodeObjs[ia].dir);
          var vb = new THREE.Vector3().copy(nodeObjs[ib].dir);

          // angle between the two unit vectors (arc length on unit sphere)
          var dot = THREE.MathUtils.clamp(va.dot(vb), -1, 1);
          var omega = Math.acos(dot);
          // bow altitude: longer arc → higher lift, but gently and capped so
          // long routes don't whip off the canvas. omega/PI ∈ [0,1].
          var lift = 0.04 + 0.20 * (omega / Math.PI);

          var pts = [];
          for (var sm = 0; sm <= ARC_SAMPLES; sm++) {
            var t2 = sm / ARC_SAMPLES;
            var v = slerp(va, vb, omega, t2);
            // raise off the surface with a sine bow (0 at ends, max at middle)
            var h = Math.sin(Math.PI * t2) * lift;
            v.multiplyScalar(R * 1.012 + h);
            pts.push(v);
          }
          // chordal param keeps the pulse speed even along the bowed curve.
          var curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');

          // tier-based geometry weight (brighter, slightly fatter than before so
          // arcs read as luminous capital-flow conduits, not hairlines)
          var tubeRadius = spec.tier === 1 ? 0.0085 : (spec.tier === 2 ? 0.0058 : 0.0040);
          var tubeOpacity = spec.tier === 1 ? 0.85 : (spec.tier === 2 ? 0.62 : 0.42);
          var radialSeg = 6;
          var tubularSeg = lowDetail ? 48 : 96;

          var tubeGeo = new THREE.TubeGeometry(curve, tubularSeg, tubeRadius, radialSeg, false);

          // per-vertex gradient arc → arcGlow along the tube length (u of uv.x)
          applyArcGradient(tubeGeo, COL_ARC, COL_ARCGLOW);

          var arcMat = new THREE.MeshBasicMaterial({
            vertexColors: true,
            transparent: true,
            opacity: tubeOpacity,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            depthTest: true
          });
          var arcMesh = new THREE.Mesh(tubeGeo, arcMat);

          // draw-in: hide all index range initially, animate to full.
          var totalIndex = tubeGeo.index ? tubeGeo.index.count : (tubeGeo.attributes.position.count);
          tubeGeo.setDrawRange(0, reduce ? totalIndex : 0);

          spin.add(arcMesh);

          // FLOWING CAPITAL-FLOW PARTICLES — a small POOLED handful of bright
          // sprites continuously streaming origin→destination on a loop. Tier-1
          // arcs carry more/brighter particles; tier-3 fewer/dimmer. Each particle
          // has its own phase so they stagger along the conduit. Shared glowTex,
          // shared loop — cheap. reduce → none (single static frame). lowDetail
          // never reaches here (no arcs).
          var nParticles = spec.tier === 1 ? 4 : (spec.tier === 2 ? 3 : 2);
          var partScale = spec.tier === 1 ? 0.052 : (spec.tier === 2 ? 0.042 : 0.034);
          var partPeak = spec.tier === 1 ? 1.0 : (spec.tier === 2 ? 0.78 : 0.55);
          var flowSpeed = spec.tier === 1 ? 0.42 : (spec.tier === 2 ? 0.34 : 0.27); // laps/sec
          var particles = [];
          if (!reduce) {
            for (var pp = 0; pp < nParticles; pp++) {
              var fpMat = new THREE.SpriteMaterial({
                map: glowTex,
                // particles ride brightest near the ochre destination glow
                color: COL_ARCGLOW.clone().lerp(new THREE.Color(1, 1, 1), 0.25),
                transparent: true,
                opacity: 0.0,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
                depthTest: false
              });
              var fp = new THREE.Sprite(fpMat);
              fp.scale.set(partScale, partScale, partScale);
              fp.visible = false;
              spin.add(fp);
              particles.push({ spr: fp, mat: fpMat, t: pp / nParticles });
            }
          }

          arcObjs.push({
            mesh: arcMesh, mat: arcMat, geo: tubeGeo, total: totalIndex,
            curve: curve, tier: spec.tier, baseOpacity: tubeOpacity,
            particles: particles, partPeak: partPeak, flowSpeed: flowSpeed,
            flowActive: false,
            drawn: reduce ? 1 : 0
          });
        }
      }

      // -----------------------------------------------------------------------
      // HOVER LABEL (only if finePtr && !lowDetail && !reduce)
      // -----------------------------------------------------------------------
      var raycaster = null, pointerNDC = null, labelEl = null, hoverEnabled = false;
      var pointerInside = false;
      if (finePtr && !lowDetail && !reduce) {
        hoverEnabled = true;
        raycaster = new THREE.Raycaster();
        raycaster.params.Sprite = raycaster.params.Sprite || {};
        pointerNDC = new THREE.Vector2(-2, -2);
        labelEl = document.createElement('div');
        labelEl.className = 'globe-node-label';
        labelEl.style.position = 'absolute';
        labelEl.style.pointerEvents = 'none';
        labelEl.style.left = '0px';
        labelEl.style.top = '0px';
        // appended to canvas parent per contract
        if (parent && parent.appendChild) parent.appendChild(labelEl);
      }

      // -----------------------------------------------------------------------
      // INTERACTION — drag-to-spin with inertia + clamped pitch. No OrbitControls.
      // -----------------------------------------------------------------------
      var dragging = false;
      var lastX = 0, lastY = 0;
      var velYaw = 0, velPitch = 0;
      var AUTO_YAW = 0.0016;            // radians/frame auto spin
      var pointerId = null;

      function clientToLocal(ev) {
        var b = canvasEl.getBoundingClientRect();
        return { x: ev.clientX - b.left, y: ev.clientY - b.top, w: b.width, h: b.height };
      }

      function onPointerDown(ev) {
        if (reduce) return;
        dragging = true;
        pointerId = ev.pointerId;
        var p = clientToLocal(ev);
        lastX = p.x; lastY = p.y;
        velYaw = 0; velPitch = 0;
        if (canvasEl.setPointerCapture && ev.pointerId != null) {
          try { canvasEl.setPointerCapture(ev.pointerId); } catch (e) {}
        }
      }
      function onPointerMove(ev) {
        var p = clientToLocal(ev);
        // update NDC for raycaster regardless of drag
        if (hoverEnabled) {
          pointerInside = true;
          pointerNDC.x = (p.x / p.w) * 2 - 1;
          pointerNDC.y = -(p.y / p.h) * 2 + 1;
        }
        if (!dragging) return;
        var dx = p.x - lastX, dy = p.y - lastY;
        lastX = p.x; lastY = p.y;
        var kx = 0.005, ky = 0.004;
        yaw += dx * kx;
        pitch = clamp(pitch - dy * ky, PITCH_MIN, PITCH_MAX);
        velYaw = dx * kx;
        velPitch = -dy * ky;
      }
      function onPointerUp(ev) {
        dragging = false;
        if (canvasEl.releasePointerCapture && pointerId != null) {
          try { canvasEl.releasePointerCapture(pointerId); } catch (e) {}
        }
        pointerId = null;
      }
      function onPointerLeave() {
        pointerInside = false;
        if (labelEl) labelEl.classList.remove('visible');
      }

      if (!reduce) {
        canvasEl.addEventListener('pointerdown', onPointerDown, { passive: true });
        window.addEventListener('pointermove', onPointerMove, { passive: true });
        window.addEventListener('pointerup', onPointerUp, { passive: true });
        canvasEl.addEventListener('pointerleave', onPointerLeave, { passive: true });
      }

      // -----------------------------------------------------------------------
      // RESIZE (debounced)
      // -----------------------------------------------------------------------
      var resizeTimer = null;
      function applyResize() {
        var rr = readRect();
        renderer.setSize(rr.w, rr.h, false);
        camera.aspect = rr.w / rr.h;
        camera.updateProjectionMatrix();
        render(); // immediate redraw after resize even when paused
      }
      function onResize() {
        if (resizeTimer) clearTimeout(resizeTimer);
        resizeTimer = setTimeout(applyResize, 120);
      }
      window.addEventListener('resize', onResize, { passive: true });

      // -----------------------------------------------------------------------
      // PAUSE DISCIPLINE — IntersectionObserver + visibilitychange.
      // -----------------------------------------------------------------------
      var onScreen = true;
      var io = null;
      if (typeof IntersectionObserver !== 'undefined') {
        io = new IntersectionObserver(function (entries) {
          for (var e = 0; e < entries.length; e++) {
            onScreen = entries[e].isIntersecting;
          }
          if (onScreen && !reduce) ensureRunning();
          else stopLoop();
        }, { threshold: 0.01 });
        io.observe(parent || canvasEl);
      }
      function onVisibility() {
        if (document.hidden) stopLoop();
        else if (onScreen && !reduce) ensureRunning();
      }
      document.addEventListener('visibilitychange', onVisibility);

      // -----------------------------------------------------------------------
      // RENDER LOOP
      // -----------------------------------------------------------------------
      var rafId = null;
      var running = false;
      var clock = (THREE.Clock ? new THREE.Clock() : null);
      var elapsed = 0;
      var tmpV = new THREE.Vector3();
      var camDir = new THREE.Vector3();

      function ensureRunning() {
        if (reduce) return;
        if (!running) {
          running = true;
          if (clock) clock.start();
          rafId = requestAnimationFrame(loop);
        }
      }
      function stopLoop() {
        running = false;
        if (rafId != null) { cancelAnimationFrame(rafId); rafId = null; }
        if (clock) clock.stop();
      }

      // perf: cap the globe to ~33fps. A slow auto-rotating sphere doesn't need
      // 60, and this nearly halves GPU cost. Motion stays time-accurate because
      // step() advances by the accumulated delta, not a fixed tick.
      var frameAcc = 0, MIN_DT = 1 / 33;
      function loop() {
        if (!running) return;
        rafId = requestAnimationFrame(loop);
        var dt = clock ? clock.getDelta() : 0.016;
        frameAcc += dt;
        if (frameAcc < MIN_DT) return;
        elapsed += frameAcc;
        step(frameAcc);
        render();
        frameAcc = 0;
      }

      // per-frame simulation
      function step(dt) {
        // auto-rotate + inertia
        if (!dragging) {
          // decay residual velocity then ease back to gentle auto-spin
          velYaw *= 0.95;
          velPitch *= 0.9;
          yaw += velYaw;
          pitch = clamp(pitch + velPitch, PITCH_MIN, PITCH_MAX);
          if (Math.abs(velYaw) < AUTO_YAW) {
            yaw += AUTO_YAW;
          }
        }
        spin.rotation.y = yaw;
        spin.rotation.x = pitch;

        // drive shader time uniforms (atmosphere breath + land shimmer)
        if (atmoMat) atmoMat.uniforms.uTime.value = elapsed;
        if (landMat && landMat.uniforms) landMat.uniforms.uTime.value = elapsed;

        // camera forward direction (for depth-based node fade)
        camera.getWorldDirection(camDir);

        // node breathing + back-hemisphere fade + tier-1 expanding ring
        for (var i = 0; i < nodeObjs.length; i++) {
          var no = nodeObjs[i];
          // world-space node direction
          tmpV.copy(no.dir).applyQuaternion(spin.getWorldQuaternion(_q));
          // facing factor: 1 front, 0 back. camDir points away from camera into
          // scene, so a node facing the camera has dir·(-camDir) > 0.
          var facing = -tmpV.dot(camDir);
          var front = smoothstep(-0.15, 0.45, facing); // 0 back → 1 front
          // stronger breathing pulse than before
          var breathe = 0.5 + 0.5 * Math.sin(elapsed * 1.7 + no.phase);
          var s = no.baseScale * (0.82 + 0.30 * breathe);
          no.glow.scale.set(s, s, s);
          no.glow.material.opacity = 0.9 * front * (0.6 + 0.4 * breathe);
          no.core.material.opacity = front * (0.85 + 0.15 * breathe);
          no.group.visible = front > 0.02;

          // expanding halo ring on tier-1 hubs: grows + fades on a loop
          if (no.ring) {
            var rt = (elapsed * 0.5 + no.ringPhase) % 1; // 0..1 loop
            var rScale = no.baseScale * (0.55 + 1.7 * rt);
            no.ring.scale.set(rScale, rScale, rScale);
            // fade in fast, out slow, gated by front-facing
            no.ringMat.opacity = (1 - rt) * (1 - rt) * 0.55 * front;
          }
        }

        // arc draw-in (fallback if gsap missing) + travelling pulse
        for (var a = 0; a < arcObjs.length; a++) {
          var ao = arcObjs[a];
          // if gsap not present, ease drawn → 1 manually with a stagger
          if (!hasGSAP && ao.drawn < 1) {
            var delay = a * 0.12;
            if (elapsed > delay) ao.drawn = Math.min(1, ao.drawn + dt * 1.4);
          }
          var count = Math.floor(ao.total * ao.drawn);
          ao.geo.setDrawRange(0, count);

          // flowing capital-flow particles, once the conduit is drawn in
          if (ao.drawn >= 0.999) ao.flowActive = true;
          if (ao.flowActive && ao.particles && ao.particles.length) {
            for (var fp = 0; fp < ao.particles.length; fp++) {
              var par = ao.particles[fp];
              par.t = (par.t + dt * ao.flowSpeed) % 1;
              var fpt = ao.curve.getPointAt(par.t);
              par.spr.position.copy(fpt);
              par.spr.visible = true;
              // fade in/out at the ends so particles don't pop at origin/dest
              var fade = Math.sin(Math.PI * par.t);
              // brighten as it nears the destination (ochre glow) end
              var arrive = 0.6 + 0.4 * par.t;
              par.mat.opacity = fade * arrive * ao.partPeak;
            }
          }
        }

        // hover raycast (throttled to frame)
        if (hoverEnabled && pointerInside && !dragging) {
          updateHover();
        }
      }

      var _q = new THREE.Quaternion();
      var _proj = new THREE.Vector3();

      function updateHover() {
        raycaster.setFromCamera(pointerNDC, camera);
        // build a flat list of glow sprites to test
        var hits = raycaster.intersectObjects(collectGlowSprites(), false);
        var found = null;
        for (var h = 0; h < hits.length; h++) {
          var obj = hits[h].object;
          if (obj && obj.userData && obj.userData.nodeRef && obj.userData.nodeRef.group.visible) {
            found = obj.userData.nodeRef;
            break;
          }
        }
        if (found) {
          // project node world pos to screen
          _proj.copy(found.dir).multiplyScalar(R * 1.012)
            .applyMatrix4(spin.matrixWorld);
          _proj.project(camera);
          var b = canvasEl.getBoundingClientRect();
          // label positioned relative to parent; compute parent-local coords
          var pb = parent.getBoundingClientRect ? parent.getBoundingClientRect() : b;
          var sx = (_proj.x * 0.5 + 0.5) * b.width + (b.left - pb.left);
          var sy = (-_proj.y * 0.5 + 0.5) * b.height + (b.top - pb.top);
          labelEl.textContent = found.name;
          labelEl.style.left = sx + 'px';
          labelEl.style.top = sy + 'px';
          labelEl.classList.add('visible');
        } else {
          labelEl.classList.remove('visible');
        }
      }

      var _glowList = null;
      function collectGlowSprites() {
        if (_glowList) return _glowList;
        _glowList = [];
        for (var i = 0; i < nodeObjs.length; i++) {
          nodeObjs[i].glow.userData.nodeRef = nodeObjs[i];
          _glowList.push(nodeObjs[i].glow);
        }
        return _glowList;
      }

      function render() {
        try { renderer.render(scene, camera); } catch (e) {}
        if (!firedReady) fireReady(); // onReady AFTER first rendered frame
      }

      // -----------------------------------------------------------------------
      // GSAP animation: staggered arc draw-in. Falls back to manual easing in
      // step() when gsap is absent.
      // -----------------------------------------------------------------------
      function startGSAP() {
        if (!hasGSAP || reduce) return;
        for (var a = 0; a < arcObjs.length; a++) {
          (function (ao, i) {
            gsap.to(ao, {
              drawn: 1,
              duration: 1.1,
              delay: 0.25 + i * 0.13,
              ease: 'power2.out'
            });
          })(arcObjs[a], a);
        }
      }

      // -----------------------------------------------------------------------
      // BOOT
      // -----------------------------------------------------------------------
      // First, set rotation so the first frame is already composed correctly.
      spin.rotation.y = yaw;
      spin.rotation.x = pitch;

      if (reduce) {
        // exactly ONE static frame, no rAF, no animation.
        // arcs already at full drawRange (reduce path set drawn=1 / full range).
        // node front-fade computed once:
        camera.getWorldDirection(camDir);
        for (var ri = 0; ri < nodeObjs.length; ri++) {
          var rno = nodeObjs[ri];
          tmpV.copy(rno.dir).applyQuaternion(spin.getWorldQuaternion(_q));
          var rf = smoothstep(-0.15, 0.45, -tmpV.dot(camDir));
          rno.glow.material.opacity = 0.85 * rf;
          rno.core.material.opacity = rf;
          rno.group.visible = rf > 0.02;
          // tier-1 ring shown at a pleasant static radius (no loop)
          if (rno.ring) {
            var rrScale = rno.baseScale * 1.1;
            rno.ring.scale.set(rrScale, rrScale, rrScale);
            rno.ringMat.opacity = 0.28 * rf;
          }
        }
        // atmosphere is static in reduce — set time once for a stable pulse value
        if (atmoMat) atmoMat.uniforms.uTime.value = 0;
        if (landMat && landMat.uniforms) landMat.uniforms.uTime.value = 0;
        render();           // single frame + fires onReady
      } else {
        startGSAP();
        ensureRunning();    // loop will render → first frame fires onReady
        // safety: if loop somehow hasn't fired ready within a tick, force it.
        setTimeout(fireReady, 600);
      }

      // -----------------------------------------------------------------------
      // STATE for destroy()
      // -----------------------------------------------------------------------
      STATE = {
        destroyFns: function () {
          stopLoop();
          if (resizeTimer) clearTimeout(resizeTimer);
          // kill gsap tweens on arc objects
          if (hasGSAP) {
            try { for (var a = 0; a < arcObjs.length; a++) gsap.killTweensOf(arcObjs[a]); } catch (e) {}
          }
          // listeners
          try { canvasEl.removeEventListener('pointerdown', onPointerDown); } catch (e) {}
          try { window.removeEventListener('pointermove', onPointerMove); } catch (e) {}
          try { window.removeEventListener('pointerup', onPointerUp); } catch (e) {}
          try { canvasEl.removeEventListener('pointerleave', onPointerLeave); } catch (e) {}
          try { window.removeEventListener('resize', onResize); } catch (e) {}
          try { document.removeEventListener('visibilitychange', onVisibility); } catch (e) {}
          if (io) { try { io.disconnect(); } catch (e) {} }

          // remove label
          if (labelEl && labelEl.parentNode) {
            try { labelEl.parentNode.removeChild(labelEl); } catch (e) {}
          }

          // dispose geometries / materials / textures
          safeDispose(sphereGeo); safeDispose(sphereMat);
          safeDispose(atmoGeo); safeDispose(atmoMat);
          safeDispose(gratGeo); safeDispose(gratMat);
          safeDispose(landGeo); safeDispose(landMat);
          safeDispose(landDotTex); safeDispose(glowTex); safeDispose(ringTex);
          for (var i = 0; i < nodeObjs.length; i++) {
            safeDispose(nodeObjs[i].glow.material);
            safeDispose(nodeObjs[i].core.material);
            if (nodeObjs[i].ringMat) safeDispose(nodeObjs[i].ringMat);
          }
          for (var k = 0; k < arcObjs.length; k++) {
            safeDispose(arcObjs[k].geo);
            safeDispose(arcObjs[k].mat);
            if (arcObjs[k].particles) {
              for (var pk = 0; pk < arcObjs[k].particles.length; pk++) {
                safeDispose(arcObjs[k].particles[pk].mat);
              }
            }
          }
          // scene teardown
          try { scene.clear && scene.clear(); } catch (e) {}
          try { renderer.dispose(); } catch (e) {}
          try {
            if (renderer.forceContextLoss) renderer.forceContextLoss();
          } catch (e) {}
        }
      };

      // -----------------------------------------------------------------------
      // small local helpers that needed THREE in scope
      // -----------------------------------------------------------------------
      function slerp(v0, v1, omega, t) {
        // spherical linear interpolation of unit vectors
        if (omega < 1e-5) return v0.clone();
        var s0 = Math.sin((1 - t) * omega) / Math.sin(omega);
        var s1 = Math.sin(t * omega) / Math.sin(omega);
        return new THREE.Vector3(
          v0.x * s0 + v1.x * s1,
          v0.y * s0 + v1.y * s1,
          v0.z * s0 + v1.z * s1
        );
      }
    },

    // -------------------------------------------------------------------------
    // destroy() — cancel rAF, dispose, remove listeners. Never throws.
    // -------------------------------------------------------------------------
    destroy: function () {
      if (!STATE) return;
      try { STATE.destroyFns(); } catch (e) {}
      STATE = null;
    }
  };

  // ---------------------------------------------------------------------------
  // THREE-independent utility helpers (parse-time safe).
  // ---------------------------------------------------------------------------
  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
  function smoothstep(e0, e1, x) {
    var t = clamp((x - e0) / (e1 - e0), 0, 1);
    return t * t * (3 - 2 * t);
  }
  function safeDispose(obj) {
    if (!obj) return;
    try { if (obj.dispose) obj.dispose(); } catch (e) {}
  }

  // Soft round dot sprite for land points (radial alpha falloff).
  function makeDotTexture() {
    var size = 64;
    var c = document.createElement('canvas');
    c.width = c.height = size;
    var ctx = c.getContext('2d');
    var g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0.0, 'rgba(255,255,255,1)');
    g.addColorStop(0.55, 'rgba(255,255,255,0.85)');
    g.addColorStop(0.8, 'rgba(255,255,255,0.25)');
    g.addColorStop(1.0, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    var tex = new THREE.Texture(c);
    tex.needsUpdate = true;
    if ('colorSpace' in tex) { try { tex.colorSpace = THREE.SRGBColorSpace; } catch (e) {} }
    return tex;
  }

  // Soft glow sprite for nodes + arc pulses.
  function makeGlowTexture() {
    var size = 128;
    var c = document.createElement('canvas');
    c.width = c.height = size;
    var ctx = c.getContext('2d');
    var g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0.0, 'rgba(255,255,255,1)');
    g.addColorStop(0.25, 'rgba(255,255,255,0.7)');
    g.addColorStop(0.55, 'rgba(255,255,255,0.22)');
    g.addColorStop(1.0, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    var tex = new THREE.Texture(c);
    tex.needsUpdate = true;
    if ('colorSpace' in tex) { try { tex.colorSpace = THREE.SRGBColorSpace; } catch (e) {} }
    return tex;
  }

  // Thin soft ring sprite for the tier-1 node "sonar" halo. A bright annulus
  // with feathered inner + outer edges so the expand/fade reads cleanly.
  function makeRingTexture() {
    var size = 128;
    var c = document.createElement('canvas');
    c.width = c.height = size;
    var ctx = c.getContext('2d');
    var g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    // transparent center, bright thin ring near the rim, soft falloff to edge
    g.addColorStop(0.0, 'rgba(255,255,255,0)');
    g.addColorStop(0.62, 'rgba(255,255,255,0)');
    g.addColorStop(0.78, 'rgba(255,255,255,0.9)');
    g.addColorStop(0.88, 'rgba(255,255,255,0.5)');
    g.addColorStop(1.0, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    var tex = new THREE.Texture(c);
    tex.needsUpdate = true;
    if ('colorSpace' in tex) { try { tex.colorSpace = THREE.SRGBColorSpace; } catch (e) {} }
    return tex;
  }

  // Apply a per-vertex color gradient along a TubeGeometry's length using uv.x.
  function applyArcGradient(geo, colA, colB) {
    var uv = geo.attributes.uv;
    var count = geo.attributes.position.count;
    var colors = new Float32Array(count * 3);
    for (var i = 0; i < count; i++) {
      // TubeGeometry uv.x runs 0→1 along the tube length.
      var t = uv ? uv.getX(i) : (i / count);
      var r = colA.r + (colB.r - colA.r) * t;
      var g = colA.g + (colB.g - colA.g) * t;
      var b = colA.b + (colB.b - colA.b) * t;
      colors[i * 3] = r;
      colors[i * 3 + 1] = g;
      colors[i * 3 + 2] = b;
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  }

  // ---------------------------------------------------------------------------
  // Expose single global.
  // ---------------------------------------------------------------------------
  window.ChokepointGlobe = ChokepointGlobe;

})();
