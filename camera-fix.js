/* V3 camera and ball visibility patch */
(function () {
  function closeProjection(point, elevation) {
    const cam = cameraState();
    const h = elevation || 0;

    if (cam.mode === 'overview') {
      return {
        x: width / 2 + (point.x - cam.x) * 2.7,
        y: height * 0.08 + (-point.z) * 3.05 - h * 0.2,
        scale: 1
      };
    }

    if (cam.mode === 'putt') {
      const dz = cam.z - point.z;
      const dx = point.x - cam.x;
      return {
        x: width / 2 + dx * 18,
        y: height * 0.73 - dz * 15.5 - h * 2.3,
        scale: clamp(1 - dz / 95, 0.62, 1.15)
      };
    }

    const dz = Math.max(0, cam.z - point.z);
    const depth = clamp(dz / 190, 0, 1);
    const curve = 1 - Math.exp(-dz / 72);
    const baseY = height * (cam.mode === 'flight' ? 0.76 : 0.79);
    const verticalRange = height * (cam.mode === 'flight' ? 0.5 : 0.49);
    const horizontalScale = lerp(7.4, 3.15, depth);

    return {
      x: width / 2 + (point.x - cam.x) * horizontalScale,
      y: baseY - curve * verticalRange - h * lerp(1.5, 0.82, depth),
      scale: lerp(1.15, 0.68, depth)
    };
  }

  project = closeProjection;

  fairwayEdges = function (z) {
    const t = clamp((-z - 10) / 148, 0, 1);
    const center = Math.sin(t * 2.65) * 5;
    const half = 14 + t * 23;
    return { left: center - half, right: center + half };
  };

  drawGround = function () {
    if (game.view === 'overview') {
      ctx.fillStyle = '#2e7138';
      ctx.fillRect(width * 0.025, height * 0.03, width * 0.95, height * 0.94);
      drawFairwayOverview();
      return;
    }

    const horizon = height * (game.view === 'flight' ? 0.39 : 0.37);
    ctx.fillStyle = '#2e7338';
    ctx.fillRect(0, horizon, width, height - horizon);
    ctx.fillStyle = '#245d2d';
    ctx.beginPath();
    ctx.moveTo(0, horizon + 30);
    ctx.quadraticCurveTo(width * 0.2, horizon - 22, width * 0.43, horizon + 22);
    ctx.quadraticCurveTo(width * 0.72, horizon - 18, width, horizon + 26);
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fill();
    drawFairwayPerspective();
  };

  drawFairwayPerspective = function () {
    const left = [];
    const right = [];
    for (let i = 0; i <= 36; i += 1) {
      const z = game.ball.z - 2 - i * 5.1;
      const edge = fairwayEdges(z);
      left.push(project({ x: edge.left, z }));
      right.push(project({ x: edge.right, z }));
    }

    ctx.fillStyle = '#58ad49';
    ctx.beginPath();
    left.forEach((point, index) => index ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y));
    right.reverse().forEach(point => ctx.lineTo(point.x, point.y));
    ctx.closePath();
    ctx.fill();

    for (let band = 0; band < 12; band += 1) {
      const z1 = game.ball.z - 5 - band * 14;
      const z2 = z1 - 7;
      const e1 = fairwayEdges(z1);
      const e2 = fairwayEdges(z2);
      const a = project({ x: e1.left, z: z1 });
      const b = project({ x: e1.right, z: z1 });
      const c = project({ x: e2.right, z: z2 });
      const d = project({ x: e2.left, z: z2 });
      ctx.fillStyle = band % 2 ? 'rgba(13,92,36,.15)' : 'rgba(255,255,255,.06)';
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.lineTo(c.x, c.y);
      ctx.lineTo(d.x, d.y);
      ctx.closePath();
      ctx.fill();
    }
  };

  drawFairwayOverview = function () {
    const left = [];
    const right = [];
    for (let i = 0; i <= 35; i += 1) {
      const z = -i * 5;
      const edge = fairwayEdges(z);
      left.push(project({ x: edge.left, z }));
      right.push(project({ x: edge.right, z }));
    }
    ctx.fillStyle = '#58ad4a';
    ctx.beginPath();
    left.forEach((point, index) => index ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y));
    right.reverse().forEach(point => ctx.lineTo(point.x, point.y));
    ctx.closePath();
    ctx.fill();
  };

  function featureDimensions(rx, rz, screenPoint, worldPoint) {
    if (game.view === 'overview') return { x: rx * 2.7, y: rz * 3.05 };
    const cam = cameraState();
    const depth = clamp((cam.z - worldPoint.z) / 190, 0, 1);
    const boost = lerp(1.2, 1.65, depth);
    return {
      x: rx * 4.25 * screenPoint.scale * boost,
      y: Math.max(8, rz * 1.65 * screenPoint.scale * boost)
    };
  }

  drawFeatureEllipse = function (world, rx, rz, color, rotation) {
    const point = project(world);
    const size = featureDimensions(rx, rz, point, world);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(point.x, point.y, size.x, size.y, rotation || 0, 0, Math.PI * 2);
    ctx.fill();
  };

  drawCourseFeatures = function () {
    drawFeatureEllipse(pin, 22, 16, '#78ca5f');
    drawFeatureEllipse({ x: -16, z: -156 }, 11, 8, '#ead48d', -0.15);
    drawFeatureEllipse({ x: 22, z: -177 }, 10, 7, '#ead48d', 0.25);
    drawFeatureEllipse({ x: 34, z: -116 }, 17, 35, '#277fb8', -0.08);

    const water = project({ x: 34, z: -116 });
    ctx.strokeStyle = 'rgba(255,255,255,.28)';
    ctx.lineWidth = 1.2;
    for (let i = -2; i <= 2; i += 1) {
      ctx.beginPath();
      ctx.ellipse(
        water.x,
        water.y + i * 5,
        game.view === 'overview' ? 42 : 62 * water.scale,
        game.view === 'overview' ? 106 : 16 * water.scale,
        0,
        0,
        Math.PI * 2
      );
      ctx.stroke();
    }

    for (let i = 0; i < 13; i += 1) {
      drawTree({ x: -42 - (i % 2) * 8, z: -18 - i * 12 }, 14 - i * 0.35);
      drawTree({ x: 50 + (i % 2) * 7, z: -16 - i * 12 }, 14 - i * 0.35);
    }
    drawFlag();
  };

  drawTree = function (position, size) {
    const point = project(position);
    const s = game.view === 'overview' ? 6 : Math.max(5, size * point.scale * 1.9);
    ctx.fillStyle = '#6c492b';
    ctx.fillRect(point.x - s * 0.1, point.y - s * 0.08, s * 0.2, s * 0.72);
    ctx.fillStyle = '#1e5a2c';
    ctx.beginPath();
    ctx.arc(point.x, point.y - s * 0.42, s * 0.68, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2f7b39';
    ctx.beginPath();
    ctx.arc(point.x - s * 0.34, point.y - s * 0.32, s * 0.42, 0, Math.PI * 2);
    ctx.fill();
  };

  drawFlag = function () {
    const point = project(pin);
    const poleHeight = game.view === 'overview' ? 25 : 78 * point.scale;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
    ctx.lineTo(point.x, point.y - poleHeight);
    ctx.stroke();
    ctx.fillStyle = '#e83e3e';
    ctx.beginPath();
    ctx.moveTo(point.x, point.y - poleHeight);
    ctx.lineTo(point.x + 34 * point.scale, point.y - poleHeight + 10 * point.scale);
    ctx.lineTo(point.x, point.y - poleHeight + 21 * point.scale);
    ctx.closePath();
    ctx.fill();
  };

  drawAimTarget = function () {
    const point = project(game.aim);
    const ring = game.view === 'overview' ? 16 : 26;
    ctx.strokeStyle = '#ffe14f';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(point.x, point.y, ring, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,225,79,.22)';
    ctx.beginPath();
    ctx.ellipse(point.x, point.y, ring * 2.2, ring * 0.95, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff7b5';
    ctx.font = '900 12px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(Math.round(distance(game.ball, game.aim)) + ' YDS', point.x, point.y - ring - 10);
  };

  drawGolfer = function () {
    if (game.view === 'overview' || game.view === 'flight' || game.lie === 'green') return;
    const ball = project(game.ball);
    ctx.strokeStyle = '#142d20';
    ctx.lineCap = 'round';
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(ball.x - 23, ball.y - 70);
    ctx.lineTo(ball.x - 17, ball.y - 33);
    ctx.moveTo(ball.x - 22, ball.y - 52);
    ctx.lineTo(ball.x + 7, ball.y - 29);
    ctx.moveTo(ball.x - 17, ball.y - 33);
    ctx.lineTo(ball.x - 28, ball.y + 5);
    ctx.moveTo(ball.x - 17, ball.y - 33);
    ctx.lineTo(ball.x + 5, ball.y + 5);
    ctx.stroke();
    ctx.fillStyle = '#d29a72';
    ctx.beginPath();
    ctx.arc(ball.x - 23, ball.y - 83, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#d9dde0';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(ball.x + 7, ball.y - 29);
    ctx.lineTo(ball.x + 32, ball.y + 1);
    ctx.stroke();
  };

  drawBall = function (point, elevation, glow) {
    const ballPoint = point || game.ball;
    const screen = project(ballPoint, elevation || 0);
    if (glow) {
      const gradient = ctx.createRadialGradient(screen.x, screen.y, 2, screen.x, screen.y, 18);
      gradient.addColorStop(0, 'rgba(255,255,255,.95)');
      gradient.addColorStop(0.35, 'rgba(255,244,154,.55)');
      gradient.addColorStop(1, 'rgba(255,244,154,0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(screen.x, screen.y, 18, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(screen.x, screen.y, game.view === 'overview' ? 4 : glow ? 7 : 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.28)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  };

  function drawTrail() {
    if (!game.trail || game.trail.length < 2) return;
    ctx.save();
    ctx.lineCap = 'round';
    for (let i = 1; i < game.trail.length; i += 1) {
      const a = game.trail[i - 1];
      const b = game.trail[i];
      const pa = project(a, a.h || 0);
      const pb = project(b, b.h || 0);
      const alpha = i / game.trail.length;
      ctx.strokeStyle = 'rgba(255,246,183,' + (0.08 + alpha * 0.72) + ')';
      ctx.lineWidth = 1.5 + alpha * 4.5;
      ctx.beginPath();
      ctx.moveTo(pa.x, pa.y);
      ctx.lineTo(pb.x, pb.y);
      ctx.stroke();
    }
    ctx.restore();
  }

  render = function (animatedBall) {
    if (!width) return;
    drawSky();
    drawGround();
    drawCourseFeatures();
    drawPrediction();
    drawGolfer();
    drawTrail();
    if (animatedBall) drawBall(animatedBall, animatedBall.h || 0, true);
    else drawBall();
  };

  animateShot = function (points, isPutt) {
    game.flying = true;
    game.view = 'flight';
    game.trail = [];
    ui.swingZone.style.opacity = '0.35';
    ui.swingZone.style.pointerEvents = 'none';
    const startTime = performance.now();
    const duration = isPutt ? 1350 : 2450;
    const start = { ...game.ball };

    function frame(now) {
      const t = clamp((now - startTime) / duration, 0, 1);
      const smooth = ease(t);
      const index = smooth * (points.length - 1);
      const lower = Math.floor(index);
      const a = points[lower];
      const b = points[Math.min(lower + 1, points.length - 1)];
      const fraction = index - lower;
      const ball = {
        x: lerp(a.x, b.x, fraction),
        z: lerp(a.z, b.z, fraction),
        h: lerp(a.h || 0, b.h || 0, fraction)
      };

      game.camera.x = lerp(game.camera.x, ball.x, 0.07);
      game.camera.z = lerp(game.camera.z, ball.z + (isPutt ? 4 : 44), 0.07);
      game.trail.push({ ...ball });
      if (game.trail.length > 28) game.trail.shift();
      render(ball);

      if (t < 1) requestAnimationFrame(frame);
      else {
        game.trail = [];
        settleShot(points[points.length - 1], isPutt, start);
      }
    }

    requestAnimationFrame(frame);
  };

  aimFromPointer = function (event) {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    if (game.view === 'overview') {
      game.aim = { x: (x - width / 2) / 2.7, z: -(y - height * 0.08) / 3.05 };
    } else {
      const normalized = clamp((height * 0.79 - y) / (height * 0.49), 0.08, 0.98);
      const dz = -72 * Math.log(1 - normalized);
      const depth = clamp(dz / 190, 0, 1);
      const horizontalScale = lerp(7.4, 3.15, depth);
      game.aim = {
        x: game.ball.x + (x - width / 2) / horizontalScale,
        z: game.ball.z + 6 - dz
      };
    }

    const dx = game.aim.x - game.ball.x;
    const dz = game.aim.z - game.ball.z;
    const length = Math.hypot(dx, dz) || 1;
    const maxDistance = clubs[game.club].distance * game.factor * 1.08;
    if (length > maxDistance) {
      game.aim.x = game.ball.x + dx / length * maxDistance;
      game.aim.z = game.ball.z + dz / length * maxDistance;
    }
    render();
  };

  if (!game.trail) game.trail = [];
  game.camera = { x: game.ball.x, z: game.ball.z + 6 };
  render();
})();
