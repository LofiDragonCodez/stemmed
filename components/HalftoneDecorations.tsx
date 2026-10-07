"use client";

import Image from "next/image";
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "framer-motion";
import { useEffect, useRef } from "react";

type ActiveDrag = {
  pointerId: number;
  startX: number;
  startY: number;
  originX: number;
  originY: number;
};

export default function HalftoneDecorations() {
  const dragBoundsRef = useRef<HTMLDivElement>(null);
  const draggableRef = useRef<HTMLDivElement>(null);
  const activeDrag = useRef<ActiveDrag | null>(null);
  const reducedMotion = useReducedMotion();
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const smoothX = useSpring(pointerX, { stiffness: 55, damping: 22, mass: 0.7 });
  const smoothY = useSpring(pointerY, { stiffness: 55, damping: 22, mass: 0.7 });
  const blobX = useTransform(smoothX, [-1, 1], [-12, 12]);
  const blobY = useTransform(smoothY, [-1, 1], [-9, 9]);
  const squiggleX = useTransform(smoothX, [-1, 1], [10, -10]);
  const squiggleY = useTransform(smoothY, [-1, 1], [8, -8]);
  const burstX = useTransform(smoothX, [-1, 1], [-8, 8]);
  const burstY = useTransform(smoothY, [-1, 1], [-8, 8]);
  const dragX = useMotionValue(0);
  const dragY = useMotionValue(0);
  const idleX = useMotionValue(0);
  const idleY = useMotionValue(0);

  function startDrag(event: React.PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    const element = draggableRef.current;
    if (!element) return;

    event.preventDefault();
    activeDrag.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: dragX.get(),
      originY: dragY.get(),
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveDrag(event: React.PointerEvent<HTMLDivElement>) {
    const drag = activeDrag.current;
    const stage = dragBoundsRef.current;
    const element = draggableRef.current;
    if (!drag || drag.pointerId !== event.pointerId || !stage || !element) {
      return;
    }

    event.preventDefault();
    const stageBounds = stage.getBoundingClientRect();
    const elementBounds = element.getBoundingClientRect();
    const baseLeft = elementBounds.left - dragX.get() - idleX.get();
    const baseTop = elementBounds.top - dragY.get() - idleY.get();
    const minX = stageBounds.left - baseLeft;
    const maxX = stageBounds.right - baseLeft - elementBounds.width;
    const minY = stageBounds.top - baseTop;
    const maxY = stageBounds.bottom - baseTop - elementBounds.height;

    dragX.set(
      Math.min(
        maxX,
        Math.max(minX, drag.originX + event.clientX - drag.startX),
      ),
    );
    dragY.set(
      Math.min(
        maxY,
        Math.max(minY, drag.originY + event.clientY - drag.startY),
      ),
    );
  }

  function endDrag(event: React.PointerEvent<HTMLDivElement>) {
    if (activeDrag.current?.pointerId === event.pointerId) {
      activeDrag.current = null;
    }
  }

  useEffect(() => {
    if (reducedMotion) return;
    const direction = Math.random() * Math.PI * 2;
    const phase = Math.random() * Math.PI * 2;
    let frame = 0;
    let animationFrame = 0;

    function float() {
      frame += 1 / 60;
      if (!activeDrag.current) {
        const drift = Math.sin(frame * 0.7 + phase) * 7;
        idleX.set(Math.cos(direction) * drift);
        idleY.set(Math.sin(direction) * drift);
      }
      animationFrame = window.requestAnimationFrame(float);
    }

    animationFrame = window.requestAnimationFrame(float);
    return () => window.cancelAnimationFrame(animationFrame);
  }, [activeDrag, idleX, idleY, reducedMotion]);

  useEffect(() => {
    if (reducedMotion) return;

    function trackPointer(event: PointerEvent) {
      if (event.pointerType !== "mouse") return;
      pointerX.set((event.clientX / window.innerWidth) * 2 - 1);
      pointerY.set((event.clientY / window.innerHeight) * 2 - 1);
    }

    function resetPointer() {
      pointerX.set(0);
      pointerY.set(0);
    }

    window.addEventListener("pointermove", trackPointer, { passive: true });
    window.addEventListener("blur", resetPointer);
    return () => {
      window.removeEventListener("pointermove", trackPointer);
      window.removeEventListener("blur", resetPointer);
    };
  }, [pointerX, pointerY, reducedMotion]);

  return (
    <>
      <div className="decorations" aria-hidden="true">
        <motion.div className="decoration decoration-blob" style={{ x: blobX, y: blobY }}>
          <Image src="/halftone-blob.svg" alt="" width={290} height={220} loading="lazy" />
        </motion.div>
        <motion.div className="decoration decoration-search" style={{ x: burstX, y: burstY }}>
          <Image
            src="/halftone-sunburst.svg"
            alt=""
            width={180}
            height={180}
            loading="lazy"
          />
        </motion.div>
        <motion.div className="decoration decoration-squiggle" style={{ x: squiggleX, y: squiggleY }}>
          <Image
            src="/halftone-squiggle.svg"
            alt=""
            width={440}
            height={280}
            loading="lazy"
          />
        </motion.div>
      </div>
      <div ref={dragBoundsRef} className="drag-stage" aria-hidden="true">
        <motion.div
          className="draggable-easter-egg"
          style={{ x: dragX, y: dragY }}
        >
          <motion.div
            ref={draggableRef}
            className="draggable-sunburst"
            style={{ x: idleX, y: idleY }}
            onPointerDown={startDrag}
            onPointerMove={moveDrag}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onLostPointerCapture={endDrag}
          >
            <Image
              src="/halftone-sunburst.svg"
              alt=""
              width={180}
              height={180}
              loading="lazy"
              draggable={false}
            />
          </motion.div>
        </motion.div>
      </div>
    </>
  );
}
