import sharp, { OverlayOptions } from 'sharp';

export interface GearTile {
  gear_type: string;
  item_name: string;
  enhancement_label?: string; // e.g., "+10" or "VII" or "base"
  rarity?: number; // 0-7
  image_url?: string;
}

export interface GearStatsSummary {
  AP?: number;
  AAP?: number;
  DP?: number;
  SCORE?: number;
}

/**
 * Generate a composed gear image similar to Garmoth layout.
 * Returns a PNG buffer suitable for attaching to a Discord embed.
 */
export async function generateGearImage(
  items: GearTile[],
  stats: GearStatsSummary = {}
): Promise<Buffer> {
  const width = 1024;
  const height = 1024;
  const bg = {
    r: 26,
    g: 28,
    b: 33,
    alpha: 1,
  };

  // Layout: constrain the circle into a smaller box to leave
  // distinct header/footer zones while keeping all slots on the circle.
  const tileSize = 96;
  const footerHeight = 140;
  const topMargin = 64;
  const circleBoxSize = height - footerHeight - topMargin - 40; // bottom padding
  const cx = Math.floor(width / 2);
  const cy = Math.floor(topMargin + circleBoxSize / 2);
  const radius = Math.floor(circleBoxSize / 2 - tileSize / 2 - 12);

  // Normalize duplicates and stabilize order for deterministic placement
  const sorted = normalizeDuplicateSlots(items);

  const base = sharp({
    create: {
      width,
      height,
      channels: 4,
      background: bg,
    },
  }).png();

  const composites: OverlayOptions[] = [];

  // Draw subtle center emblem (SVG) for aesthetics inside circle box
  composites.push({
    input: Buffer.from(
      `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <g opacity="0.06" fill="#ffffff">
          <circle cx="${cx}" cy="${cy}" r="${radius - 40}" />
        </g>
      </svg>`
    ),
    top: 0,
    left: 0,
  });

  // Slot angles for circular layout (degrees)
  const slotAngles: Record<string, number> = {
    // Top arc: three weapons forming the circle
    awakening_weapon: 82,
    main_weapon: 90,
    sub_weapon: 98,
    // Left side: earrings, with helmet above; below earrings: artifact + shoes
    helmet: 122,
    earring1: 140,
    earring2: 160,
    artifact1: 200,
    shoes: 220,
    // Right side: rings, with armor above; below rings: artifact + gloves
    armor: 58,
    ring1: 320,
    ring2: 340,
    artifact2: 300,
    gloves: 280,
    // Bottom: belt centered; back near lower-right
    belt: 180,
    back: 260,
    // Necklace near upper-right
    necklace: 70,
    // Alchemy stone handled separately at center
    alchemy_stone: 270,
  };

  // Unknown slots go to a compact inner circle
  const innerRadius = Math.max(radius - tileSize - 12, 120);
  let innerIndex = 0;
  const innerAngles = [60, 120, 240, 300];

  // Place tiles on circle or inner circle (unknowns)
  for (const tile of sorted) {
    const angleDeg = slotAngles[tile.gear_type];
    const ang = ((angleDeg ?? innerAngles[innerIndex++ % innerAngles.length]) * Math.PI) / 180;
    const r = angleDeg ? radius : innerRadius;
    // Place alchemy stone at the exact center
    if (tile.gear_type === 'alchemy_stone') {
      const xCenter = cx - tileSize / 2;
      const yCenter = cy - tileSize / 2;
      // Draw center tile and labels, then continue
      const border = rarityColor(tile.rarity ?? 0);
      const tileSvg = Buffer.from(
        `<svg width="${tileSize}" height="${tileSize}" xmlns="http://www.w3.org/2000/svg">
          <rect x="0" y="0" width="${tileSize}" height="${tileSize}" rx="16" ry="16" fill="#2c313a" stroke="${border}" stroke-width="6" />
        </svg>`
      );
      composites.push({ input: tileSvg, top: yCenter, left: xCenter });
      if (tile.image_url) {
        try {
          const imgBuf = await fetchImage(tile.image_url);
          const resized = await sharp(imgBuf)
            .resize(tileSize - 8, tileSize - 8, { fit: 'cover' })
            .png()
            .toBuffer();
          composites.push({ input: resized, top: yCenter + 4, left: xCenter + 4 });
        } catch {
          // ignore image fetch errors (center tile)
          void 0;
        }
      }
      const label = (tile.enhancement_label || '').trim() || 'base';
      const badge = Buffer.from(
        `<svg width="${tileSize}" height="${tileSize}" xmlns="http://www.w3.org/2000/svg">
          <rect x="6" y="6" width="48" height="24" rx="8" ry="8" fill="#1f8ecd" opacity="0.95" />
          <text x="30" y="23" font-family="Inter, Arial, Helvetica, sans-serif" font-size="14" fill="#ffffff" text-anchor="middle">${escapeXml(label)}</text>
        </svg>`
      );
      composites.push({ input: badge, top: yCenter, left: xCenter });
      const name = truncate(tile.item_name || tile.gear_type, 18);
      const nameSvg = Buffer.from(
        `<svg width="${tileSize}" height="22" xmlns="http://www.w3.org/2000/svg">
          <rect x="0" y="0" width="${tileSize}" height="22" rx="0" ry="0" fill="#1a1c21" opacity="0.85" />
          <text x="${tileSize / 2}" y="16" font-family="Inter, Arial, Helvetica, sans-serif" font-size="12" fill="#c9d1d9" text-anchor="middle">${escapeXml(name)}</text>
        </svg>`
      );
      composites.push({ input: nameSvg, top: yCenter + tileSize - 22, left: xCenter });
      continue;
    }
    const x = Math.round(cx + Math.cos(ang) * r - tileSize / 2);
    const y = Math.round(cy - Math.sin(ang) * r - tileSize / 2);

    // Base tile background with rarity border
    const border = rarityColor(tile.rarity ?? 0);
    const tileSvg = Buffer.from(
      `<svg width="${tileSize}" height="${tileSize}" xmlns="http://www.w3.org/2000/svg">
        <rect x="0" y="0" width="${tileSize}" height="${tileSize}" rx="16" ry="16" fill="#2c313a" stroke="${border}" stroke-width="6" />
      </svg>`
    );
    composites.push({ input: tileSvg, top: y, left: x });

    // Item image (cover)
    if (tile.image_url) {
      try {
        const imgBuf = await fetchImage(tile.image_url);
        const resized = await sharp(imgBuf)
          .resize(tileSize - 8, tileSize - 8, { fit: 'cover' })
          .png()
          .toBuffer();
        composites.push({ input: resized, top: y + 4, left: x + 4 });
      } catch {
        // ignore image fetch errors, keep tile frame
        void 0;
      }
    }

    // Enhancement label badge (top-left)
    const label = (tile.enhancement_label || '').trim() || 'base';
    const badge = Buffer.from(
      `<svg width="${tileSize}" height="${tileSize}" xmlns="http://www.w3.org/2000/svg">
        <rect x="6" y="6" width="48" height="24" rx="8" ry="8" fill="#1f8ecd" opacity="0.95" />
        <text x="30" y="23" font-family="Inter, Arial, Helvetica, sans-serif" font-size="14" fill="#ffffff" text-anchor="middle">${escapeXml(label)}</text>
      </svg>`
    );
    composites.push({ input: badge, top: y, left: x });

    // Item name strip (bottom)
    const name = truncate(tile.item_name || tile.gear_type, 18);
    const nameSvg = Buffer.from(
      `<svg width="${tileSize}" height="22" xmlns="http://www.w3.org/2000/svg">
        <rect x="0" y="0" width="${tileSize}" height="22" rx="0" ry="0" fill="#1a1c21" opacity="0.85" />
        <text x="${tileSize / 2}" y="16" font-family="Inter, Arial, Helvetica, sans-serif" font-size="12" fill="#c9d1d9" text-anchor="middle">${escapeXml(name)}</text>
      </svg>`
    );
    composites.push({ input: nameSvg, top: y + tileSize - 22, left: x });
  }

  // Footer stats
  const footerSvg = Buffer.from(
    `<svg width="${width}" height="${footerHeight}" xmlns="http://www.w3.org/2000/svg">
      <g font-family="Inter, Arial, Helvetica, sans-serif" font-size="24" fill="#ffffff" text-anchor="middle">
        <text x="${width / 2 - 220}" y="${Math.floor(footerHeight / 2)}">AP ${safeNum(stats.AP)}</text>
        <text x="${width / 2 - 60}" y="${Math.floor(footerHeight / 2)}">AAP ${safeNum(stats.AAP)}</text>
        <text x="${width / 2 + 100}" y="${Math.floor(footerHeight / 2)}">DP ${safeNum(stats.DP)}</text>
        <text x="${width / 2 + 260}" y="${Math.floor(footerHeight / 2)}">SCORE ${safeNum(stats.SCORE)}</text>
      </g>
    </svg>`
  );
  composites.push({ input: footerSvg, top: height - footerHeight, left: 0 });

  return base.composite(composites).png().toBuffer();
}

function rarityColor(rarity: number): string {
  // Simple mapping, tweak as needed
  switch (true) {
    case rarity >= 7:
      return '#f59e0b'; // amber/gold
    case rarity >= 5:
      return '#a855f7'; // purple
    case rarity >= 3:
      return '#3b82f6'; // blue
    case rarity >= 2:
      return '#10b981'; // green
    case rarity >= 1:
      return '#9ca3af'; // gray
    default:
      return '#4b5563'; // slate
  }
}

async function fetchImage(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`);
  const arr = await res.arrayBuffer();
  return Buffer.from(arr);
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

function safeNum(n: unknown): number {
  const v = typeof n === 'string' ? parseInt(n, 10) : (n as number);
  return Number.isFinite(v) ? v : 0;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normalizeDuplicateSlots(items: GearTile[]): GearTile[] {
  const result: GearTile[] = [];
  const counters: Record<string, number> = { ring: 0, earring: 0, artifact: 0 };

  for (const it of items) {
    const base = baseSlot(it.gear_type);
    if (base in counters) {
      counters[base] += 1;
      const idx = counters[base];
      const suffix = idx === 1 ? '1' : '2';
      result.push({ ...it, gear_type: `${base}${suffix}` });
    } else {
      result.push(it);
    }
  }
  return result;
}

function baseSlot(slot: string): string {
  if (slot.startsWith('ring')) return 'ring';
  if (slot.startsWith('earring')) return 'earring';
  if (slot.startsWith('artifact')) return 'artifact';
  return slot;
}
