const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage, registerFont } = require('canvas');
const { writePsd, initializeCanvas } = require('ag-psd');

initializeCanvas(createCanvas);

const ROOT = __dirname;
const FONTS = path.join(ROOT, 'fonts');

registerFont(path.join(FONTS, 'BebasNeue-Regular.ttf'), { family: 'BebasNeue' });
registerFont(path.join(FONTS, 'RobotoCondensed-Regular.ttf'), { family: 'RobotoCondensed' });
registerFont(path.join(FONTS, 'Oswald-Bold.ttf'), { family: 'Oswald' });

const fontTuning = JSON.parse(fs.readFileSync(path.join(ROOT, 'font_tuning.json'), 'utf8'));

const metadata = JSON.parse(fs.readFileSync(path.join(ROOT, 'layer_metadata.json'), 'utf8'));

function colorFor(name) {
  return name === 'black' ? { r: 0, g: 0, b: 0 } : { r: 255, g: 255, b: 255 };
}

function fitFontSize(ctx, text, fontFamily, maxWidth, maxHeight, weight = '') {
  let size = maxHeight;
  while (size > 8) {
    ctx.font = `${weight} ${size}px "${fontFamily}"`;
    const metrics = ctx.measureText(text);
    const width = metrics.width;
    const height = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
    if (width <= maxWidth && height <= maxHeight) {
      return size;
    }
    size -= 1;
  }
  return 8;
}

function renderHorizontalTextLayer(layerMeta, layerKey, viewName) {
  const { text, width, height, color } = layerMeta;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, width, height);

  const tuningKey = `${viewName}_${layerKey}`;
  const fontFamily = viewName === 'front' ? 'Oswald' : 'BebasNeue';
  const fontSize = fontTuning[tuningKey]?.size || fitFontSize(ctx, text, fontFamily, width, height);
  ctx.font = `${fontSize}px "${fontFamily}"`;
  ctx.fillStyle = color === 'black' ? '#000000' : '#ffffff';
  ctx.textBaseline = 'alphabetic';

  const metrics = ctx.measureText(text);
  const textWidth = metrics.width;
  const ascent = metrics.actualBoundingBoxAscent;
  const descent = metrics.actualBoundingBoxDescent;
  const textHeight = ascent + descent;
  const x = (width - textWidth) / 2;
  const y = (height - textHeight) / 2 + ascent;
  ctx.fillText(text, x, y);

  return {
    canvas,
    fontSize,
    fontFamily,
    x,
    y,
    textWidth,
    textHeight,
  };
}

function renderVerticalTextLayer(layerMeta, layerKey, viewName) {
  const { text, width, height, color } = layerMeta;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, width, height);

  const words = text.split(' ');
  const letters = [];
  for (let w = 0; w < words.length; w += 1) {
    for (const ch of words[w]) letters.push(ch);
    if (w < words.length - 1) letters.push(' ');
  }

  const tuningKey = `${viewName}_${layerKey}`;
  const fontSize = fontTuning[tuningKey]?.size || Math.floor(height / (letters.length * 1.35));

  const fontFamily = 'RobotoCondensed';
  ctx.font = `${fontSize}px "${fontFamily}"`;
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const spacing = fontSize * 1.15;
  const totalHeight = spacing * (letters.length - 1) + fontSize;
  let y = (height - totalHeight) / 2 + fontSize / 2;

  for (const letter of letters) {
    if (letter !== ' ') {
      ctx.fillText(letter, width / 2, y);
    }
    y += spacing;
  }

  return { canvas, fontSize, fontFamily };
}

async function imageLayerFromPng(name, pngPath, left = 0, top = 0) {
  const image = await loadImage(pngPath);
  const canvas = createCanvas(image.width, image.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0);
  return {
    name,
    left,
    top,
    right: left + image.width,
    bottom: top + image.height,
    canvas,
  };
}

function textLayer(name, layerMeta, rendered, left, top, layerKey, viewName) {
  const fillColor = colorFor(layerMeta.color);
  const fontPostScript =
    layerMeta.orientation === 'horizontal'
      ? viewName === 'front'
        ? 'Oswald'
        : 'BebasNeue'
      : 'RobotoCondensed';

  return {
    name,
    left,
    top,
    right: left + layerMeta.width,
    bottom: top + layerMeta.height,
    canvas: rendered.canvas,
    text: {
      text: layerMeta.text,
      transform: [1, 0, 0, 1, left + (rendered.x || 0), top + (rendered.y || 0)],
      style: {
        font: { name: fontPostScript },
        fontSize: rendered.fontSize,
        fillColor,
        tracking: layerMeta.orientation === 'vertical' ? 80 : 20,
      },
      paragraphStyle: {
        justification: 'center',
      },
    },
  };
}

async function buildViewPsd(view) {
  const basePath = path.join(ROOT, `${view.name}_base.png`);
  const children = [await imageLayerFromPng('Jersey Base', basePath, 0, 0)];

  for (const [key, layerMeta] of Object.entries(view.text_layers)) {
    const rendered =
      layerMeta.orientation === 'vertical'
        ? renderVerticalTextLayer(layerMeta, key, view.name)
        : renderHorizontalTextLayer(layerMeta, key, view.name);

    const layerName = layerMeta.text
      .split(' ')
      .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
      .join(' ');

    children.push(textLayer(layerName, layerMeta, rendered, layerMeta.x, layerMeta.y, key, view.name));
  }

  return {
    width: view.width,
    height: view.height,
    children,
  };
}

async function buildCombinedPsd() {
  const front = metadata.views.find((view) => view.name === 'front');
  const back = metadata.views.find((view) => view.name === 'back');
  const gap = 80;
  const width = Math.max(front.width, back.width);
  const height = front.height + gap + back.height;

  const frontPsd = await buildViewPsd(front);
  const backPsd = await buildViewPsd(back);

  const children = [
    {
      name: 'Front',
      children: frontPsd.children.map((layer) => ({ ...layer })),
    },
    {
      name: 'Back',
      children: backPsd.children.map((layer) => ({
        ...layer,
        top: layer.top + front.height + gap,
        bottom: layer.bottom + front.height + gap,
        text: layer.text
          ? {
              ...layer.text,
              transform: [
                layer.text.transform[0],
                layer.text.transform[1],
                layer.text.transform[2],
                layer.text.transform[3],
                layer.text.transform[4],
                layer.text.transform[5] + front.height + gap,
              ],
            }
          : undefined,
      })),
    },
  ];

  return { width, height, children };
}

function savePsd(psd, filename) {
  const buffer = writePsd(psd, {
    invalidateTextLayers: true,
    generateThumbnail: true,
    trimImageData: false,
    noBackground: true,
  });
  const outPath = path.join(ROOT, filename);
  fs.writeFileSync(outPath, Buffer.from(buffer));
  console.log(`Wrote ${outPath}`);
}

(async () => {
  for (const view of metadata.views) {
    savePsd(await buildViewPsd(view), `jaguars-jersey-${view.name}.psd`);
  }

  savePsd(await buildCombinedPsd(), 'jaguars-jersey-combined.psd');
})();
