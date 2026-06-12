import React, { useEffect, useRef } from "react";

export default function HologramCore({ state = "calm" }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    let animationFrameId;
    let rotation = 0;
    let waveOffset = 0;
    
    // 基础尺寸设置
    canvas.width = 240;
    canvas.height = 240;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    // 粒子系统初始化
    const particles = [];
    const maxParticles = 40;
    for (let i = 0; i < maxParticles; i++) {
      particles.push({
        angle: Math.random() * Math.PI * 2,
        radius: 40 + Math.random() * 50,
        speed: 0.01 + Math.random() * 0.02,
        size: 1 + Math.random() * 2,
        alpha: 0.1 + Math.random() * 0.5
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // 核心配置根据状态切换
      let primaryColor = "102, 252, 241"; // Cyan
      let secondaryColor = "69, 162, 158"; // Blue
      let coreRadius = 45;
      let rotationSpeed = 0.015;
      let waveSpeed = 0.05;
      let waveAmplitude = 4;
      let glitchEffect = false;

      if (state === "active") {
        rotationSpeed = 0.05;
        waveSpeed = 0.15;
        waveAmplitude = 8;
        coreRadius = 50 + Math.sin(Date.now() * 0.01) * 3;
        primaryColor = "102, 252, 241";
      } else if (state === "glitch") {
        rotationSpeed = 0.08;
        waveSpeed = 0.25;
        waveAmplitude = 12;
        coreRadius = 45 + (Math.random() > 0.85 ? 10 : 0);
        primaryColor = "255, 0, 127"; // Neon Pink
        secondaryColor = "255, 49, 49"; // Red
        glitchEffect = true;
      } else if (state === "calm") {
        rotationSpeed = 0.005;
        waveSpeed = 0.02;
        waveAmplitude = 2;
        coreRadius = 42 + Math.sin(Date.now() * 0.002) * 2;
        primaryColor = "69, 162, 158"; // Deep Blue-Green
        secondaryColor = "11, 12, 16";
      }

      rotation += rotationSpeed;
      waveOffset += waveSpeed;

      // 绘制背景发光环
      const bgGlow = ctx.createRadialGradient(centerX, centerY, 10, centerX, centerY, 100);
      bgGlow.addColorStop(0, `rgba(${primaryColor}, 0.25)`);
      bgGlow.addColorStop(0.5, `rgba(${primaryColor}, 0.05)`);
      bgGlow.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = bgGlow;
      ctx.beginPath();
      ctx.arc(centerX, centerY, 100, 0, Math.PI * 2);
      ctx.fill();

      // 绘制外部几何线圈
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(rotation);
      ctx.strokeStyle = `rgba(${primaryColor}, 0.4)`;
      ctx.lineWidth = 1;
      
      // 双重外框六边形
      for (let j = 0; j < 2; j++) {
        ctx.beginPath();
        const r = 80 - j * 12;
        for (let i = 0; i < 6; i++) {
          const angle = (i * Math.PI) / 3;
          const x = r * Math.cos(angle);
          const y = r * Math.sin(angle);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();
      }

      // 绘制外圈刻度点
      for (let i = 0; i < 12; i++) {
        const angle = (i * Math.PI) / 6;
        ctx.fillStyle = `rgba(${primaryColor}, 0.6)`;
        ctx.beginPath();
        ctx.arc(88 * Math.cos(angle), 88 * Math.sin(angle), 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // 绘制粒子流向核心
      particles.forEach((p) => {
        p.radius -= state === "active" ? 1.2 : 0.4;
        if (p.radius < coreRadius) {
          p.radius = 80 + Math.random() * 20;
          p.angle = Math.random() * Math.PI * 2;
        }
        p.angle += p.speed;
        
        // 随机故障位移
        let glitchX = 0;
        let glitchY = 0;
        if (glitchEffect && Math.random() > 0.95) {
          glitchX = (Math.random() - 0.5) * 20;
          glitchY = (Math.random() - 0.5) * 20;
        }

        const px = centerX + p.radius * Math.cos(p.angle) + glitchX;
        const py = centerY + p.radius * Math.sin(p.angle) + glitchY;
        
        ctx.fillStyle = `rgba(${primaryColor}, ${p.alpha})`;
        ctx.beginPath();
        ctx.arc(px, py, p.size, 0, Math.PI * 2);
        ctx.fill();
      });

      // 绘制核心波形球
      ctx.save();
      if (glitchEffect && Math.random() > 0.88) {
        ctx.translate((Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10);
      }
      
      ctx.lineWidth = 2;
      ctx.shadowBlur = 15;
      
      const grad = ctx.createLinearGradient(centerX - coreRadius, centerY - coreRadius, centerX + coreRadius, centerY + coreRadius);
      if (state === "active") {
        grad.addColorStop(0, "rgba(102, 252, 241, 0.95)"); // Cyan
        grad.addColorStop(0.5, "rgba(139, 92, 246, 0.95)"); // Purple
        grad.addColorStop(1, "rgba(255, 0, 127, 0.95)"); // Pink
        ctx.strokeStyle = grad;
        ctx.shadowColor = "rgba(139, 92, 246, 0.9)";
      } else if (state === "glitch") {
        grad.addColorStop(0, "rgba(255, 0, 127, 0.95)"); // Pink
        grad.addColorStop(1, "rgba(255, 49, 49, 0.95)"); // Red
        ctx.strokeStyle = grad;
        ctx.shadowColor = "rgba(255, 0, 127, 0.9)";
      } else {
        ctx.strokeStyle = `rgba(${primaryColor}, 0.85)`;
        ctx.shadowColor = `rgba(${primaryColor}, 0.8)`;
      }
      
      // 画核心圆形波纹
      ctx.beginPath();
      for (let a = 0; a < Math.PI * 2; a += 0.05) {
        // 使用正弦波叠加计算半径波动
        const wave = Math.sin(a * 8 + waveOffset) * waveAmplitude + Math.cos(a * 4 - waveOffset) * (waveAmplitude / 2);
        const r = coreRadius + wave;
        const x = centerX + r * Math.cos(a);
        const y = centerY + r * Math.sin(a);
        if (a === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();

      // 绘制核心网格图案
      ctx.restore();
      ctx.strokeStyle = `rgba(${primaryColor}, 0.15)`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = -coreRadius; i < coreRadius; i += 8) {
        const offset = Math.sqrt(coreRadius * coreRadius - i * i);
        ctx.moveTo(centerX + i, centerY - offset);
        ctx.lineTo(centerX + i, centerY + offset);
        ctx.moveTo(centerX - offset, centerY + i);
        ctx.lineTo(centerX + offset, centerY + i);
      }
      ctx.stroke();

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [state]);

  return (
    <div className="relative flex flex-col items-center justify-center p-4 rounded-lg cyber-flow-border">
      <div className="absolute top-2 left-2 text-xs font-mono text-cyber-cyan/50 tracking-wider">
        CORE_COCKPIT_SYS // STATUS: {state.toUpperCase()}
      </div>
      <canvas ref={canvasRef} className="w-[240px] h-[240px]" />
      <div className="mt-2 text-center">
        <span className="font-orbitron text-xs font-bold tracking-widest text-cyber-cyan cyber-text-glow">
          LINK CORE v1.0
        </span>
      </div>
    </div>
  );
}
