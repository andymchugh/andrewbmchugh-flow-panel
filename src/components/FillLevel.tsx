import {  PanelConfigCellFillLevel } from 'components/Config';
import { CellIdMaker } from './Utils';


export type CellFillLevelDriver = (value: string | number | null) => void;
export type CellFillLevelState = {
  element: HTMLElement;
  reference: string;
  driver: CellFillLevelDriver;
};

const gShapeElements: Set<string> = new Set<string>([
  'ellipse', 'circle', 'path', 'rect']
);

//-----------------------------------------------------------------------------
// SVG Shape Elements
//-----------------

export function isShapeElement(el: HTMLElement) {
  return gShapeElements.has(el.nodeName);
}

// The path element supports a bundle of formatting styles. This function
// normalizes what's received to a space delimited string and then splits
// that string into tokens.
function splitPath(d: string) {
  // Convert commas and whitespace to space
  d = d.replace(/([\s,\t,\n\,])/g, ' ');

  // Add space between control characters and the next term
  d = d.replace(/([A-Z,a-z])/g, ' $1 ').trim();

  // Walk the string separating terms joined by dots and dashes
  let dn = '';
  let dotFound = false;
  let midTerm = false;
  for (let i = 0; i < d.length; i++) {
    const currChar = d[i];
    if (currChar === ' ') {
      dotFound = false;
    }

    if (currChar === '.') {
      if (dotFound) {
        dn += ' 0';
      }
      dotFound = true;
    }
    else if (currChar === '-') {
      if (midTerm) {
        dn += ' ';
        dotFound = false;
      }
    }
    midTerm = currChar !== ' ';
    dn += currChar;
  }
  return dn.split(/[\s]+/);;
}

export function svgPathBounds(el: HTMLElement) {
  const d = el.getAttribute('d') || '';
  const toks = splitPath(d);

  let xCurr = 0;
  let yCurr = 0;
  let xOrig: number | null = null;
  let yOrig: number | null = null;
  let xMin: number | null = null;
  let xMax: number | null = null;
  let yMin: number | null = null;
  let yMax: number | null = null;
  let ok = true;
  
  function pos(driveCurr: boolean, xBase: number, yBase: number, xd: string | number, yd: string | number) {
    const x = xBase + Number(xd);
    const y = yBase + Number(yd);
    xMin = xMin === null ? x : Math.min(xMin, x);
    xMax = xMax === null ? x : Math.max(xMax, x);
    yMin = yMin === null ? y : Math.min(yMin, y);
    yMax = yMax === null ? y : Math.max(yMax, y);
    if (driveCurr) {
      xCurr = x;
      yCurr = y;
      if ((xOrig === null) || (yOrig === null)) {
        xOrig = xCurr;
        yOrig = yCurr;
      }
    }
  }

  function moreData(i: number) {
    return (i < toks.length) && (toks[i].length > 0) && !(toks[i][0].toUpperCase() !== toks[i][0].toLowerCase());
  }

  // See https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/d
  for (let i = 0; ok && (i < toks.length);) {
    const control = toks[i++];

    switch(control) {
      case 'M':
      case 'L':
      case 'T':
        while (moreData(i)) {
          pos(true, 0, 0, toks[i], toks[i + 1]);
          i += 2;
        }
        break;
      case 'm':
      case 'l':
      case 't':
        while (moreData(i)) {
          pos(true, xCurr, yCurr, toks[i], toks[i + 1]);
          i += 2;
        }
        break;
      case 'H':
        while (moreData(i)) {
          pos(true, 0, 0, toks[i], yCurr);
          i += 1;
        }
        break;
      case 'h':
        while (moreData(i)) {
          pos(true, xCurr, yCurr, toks[i], 0);
          i += 1;
        }
        break;
      case 'V':
        while (moreData(i)) {
          pos(true, 0, 0, xCurr, toks[i]);
          i += 1;
        }
        break;
      case 'v':
        while (moreData(i)) {
          pos(true, xCurr, yCurr, 0, toks[i]);
          i += 1;
        }
        break;
      case 'C':
      case 'c':
        let cAbsolute = control === 'C';
        while (moreData(i)) {
          if (cAbsolute) {
            cAbsolute = false;
            pos(false, 0, 0, toks[i + 0], toks[i + 1]);
            pos(false, 0, 0, toks[i + 2], toks[i + 3]);
            pos(true, 0, 0, toks[i + 4], toks[i + 5]);
          }
          else {
            pos(false, xCurr, yCurr, toks[i + 0], toks[i + 1]);
            pos(false, xCurr, yCurr, toks[i + 2], toks[i + 3]);
            pos(true, xCurr, yCurr, toks[i + 4], toks[i + 5]);
          }
          i += 6;
        }
        break;
      case 'S':
      case 's':
      case 'Q':
      case 'q':
        let sAbsolute = (control === 'S') || (control === 'Q');
        while (moreData(i)) {
          if (sAbsolute) {
            sAbsolute = false;
            pos(false, 0, 0, toks[i + 0], toks[i + 1]);
            pos(true, 0, 0, toks[i + 2], toks[i + 3]);
          }
          else {
            pos(false, xCurr, yCurr, toks[i + 0], toks[i + 1]);
            pos(true, xCurr, yCurr, toks[i + 2], toks[i + 3]);
          }
          i += 4;
        }
        break;
      case 'A':
        while (moreData(i)) {
          pos(false, 0, 0, xCurr - Number(toks[i]), yCurr - Number(toks[i + 1]));
          pos(false, 0, 0, xCurr + Number(toks[i]), yCurr + Number(toks[i + 1]));

          // The flags don't have to be space separated, so check
          const argsCount = toks[i + 3].length === 1 ? 6 : 5;
          pos(true, 0, 0, toks[i + argsCount - 1], toks[i + argsCount]);
          i += argsCount + 1;
        }
        break;
      case 'a':
        while (moreData(i)) {
          pos(false, 0, 0, xCurr - Number(toks[i]), yCurr - Number(toks[i + 1]));
          pos(false, 0, 0, xCurr + Number(toks[i]), yCurr + Number(toks[i + 1]));

          // The flags don't have to be space separated, so check
          const argsCount = toks[i + 3].length === 1 ? 6 : 5;
          pos(true, 0, 0, xCurr + toks[i + argsCount - 1], yCurr + toks[i + argsCount]);
          i += argsCount + 1;
        }
        break;
      case 'Z':
      case 'z':
        if (typeof xOrig === 'number') {
          xCurr = xOrig;
        }
        if (typeof yOrig === 'number') {
          yCurr = yOrig;
        }
        break;
      default:
        console.log('misinterpreted svg path', control, i, toks[i], toks, d);
        ok = false;
    }
  }
  if (ok &&
    (typeof xMin === 'number') && (typeof xMax === 'number') &&
    (typeof yMin === 'number') && (typeof yMax === 'number')) {
    return {
      xMin: xMin,
      xMax: xMax,
      yMin: yMin,
      yMax: yMax,
    }
  }
  return null;
}

function svgShapeBounds(el: HTMLElement) {
  if (el.nodeName === 'rect') {
    const x = Number(el.getAttribute('x'));
    const y = Number(el.getAttribute('y'));
    const width = Number(el.getAttribute('width'));
    const height = Number(el.getAttribute('height'));
    return {
      xMin: x,
      xMax: x + width,
      yMin: y,
      yMax: y + height,
    }
  }
  else if (el.nodeName === 'ellipse') {
    const cx = Number(el.getAttribute('cx'));
    const cy = Number(el.getAttribute('cy'));
    const rx = Number(el.getAttribute('rx'));
    const ry = Number(el.getAttribute('ry'));
    return {
      xMin: cx - rx,
      xMax: cx + rx,
      yMin: cy - ry,
      yMax: cy + ry,
    }
  }
  else if (el.nodeName === 'circle') {
    const cx = Number(el.getAttribute('cx'));
    const cy = Number(el.getAttribute('cy'));
    const r = Number(el.getAttribute('r'));
    return {
      xMin: cx - r,
      xMax: cx + r,
      yMin: cy - r,
      yMax: cy + r,
    }
  }
  return null;
}

export function getClipper(config: PanelConfigCellFillLevel, cellIdMaker: CellIdMaker, el: HTMLElement): CellFillLevelState | null {
  const bounds = (el.nodeName === 'path') ? svgPathBounds(el) : svgShapeBounds(el);
  if (!bounds) {
    return null;
  }

  const widthMax = bounds.xMax - bounds.xMin;
  const heightMax = bounds.yMax - bounds.yMin;
  
  let r = document.createElement('rect');
  r.setAttribute('x', bounds.xMin.toString());
  r.setAttribute('y', bounds.yMin.toString());
  r.setAttribute('width', widthMax.toString());
  r.setAttribute('height', heightMax.toString());
  let clipPath = document.createElement('clipPath');
  clipPath.setAttribute('id', cellIdMaker());
  clipPath.appendChild(r);

  const clipSize = function(boundsMin: number, boundsMax: number, value: number) {
    let scalar = 0;
    if ((typeof config.thresholdOffValue === 'number') && (value <= config.thresholdOffValue)) {
      scalar = 0;
    }
    else if (value <= config.thresholdLwrValue) {
      scalar = config.thresholdLwrFillPercent;
    }
    else if (value >= config.thresholdUprValue) {
      scalar = config.thresholdUprFillPercent;
    }
    else {
      const factor = (value - config.thresholdLwrValue) / (config.thresholdUprValue - config.thresholdLwrValue);
      const fillRange = (config.thresholdUprFillPercent - config.thresholdLwrFillPercent);
      scalar = config.thresholdLwrFillPercent + (factor * fillRange);
    }
    return (boundsMax - boundsMin) * scalar * 0.01;
  }

  const clipperBase = {
    reference: 'url(#' + clipPath.id + ')',
    element: clipPath,
  };

  switch(config.fillDirection) {
    case 'leftToRight':
      return {
        ...clipperBase,
        driver: function(value: string | number | null) {
          const width = clipSize(bounds.xMin, bounds.xMax, typeof value === 'number' ? value : widthMax);
          r.setAttribute('width', width.toString());
        }
      };
    case 'rightToLeft':
      return {
        ...clipperBase,
        driver: function(value: string | number | null) {
          const width = clipSize(bounds.xMin, bounds.xMax, typeof value === 'number' ? value : widthMax);
          r.setAttribute('x', (bounds.xMax - width).toString());
          r.setAttribute('width', width.toString());
        },
      };
    case 'topToBottom':
      return {
        ...clipperBase,
        driver: function(value: string | number | null) {
          const height = clipSize(bounds.yMin, bounds.yMax, typeof value === 'number' ? value : heightMax);
          r.setAttribute('height', height.toString());
        }
      };
    default: // 'bottomToTop'
      return {
        ...clipperBase,
        driver: function(value: string | number | null) {
          const height = clipSize(bounds.yMin, bounds.yMax, typeof value === 'number' ? value : heightMax);
          r.setAttribute('y', (bounds.yMax - height).toString());
          r.setAttribute('height', height.toString());
        },
      };
  }
}
