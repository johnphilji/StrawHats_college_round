export interface Fingerprint {
  tag: string;
  text: string;
  id: string;
  classes: string[];
  attributes: Record<string, string>;
  ancestors: string[];
  siblingText: string;
  index: number;
}

export function captureFingerprint(el: HTMLElement): Fingerprint {
  const fp: Fingerprint = {
    tag: el.tagName.toLowerCase(),
    text: (el.textContent || '').trim().toLowerCase().replace(/\s+/g, ' '),
    id: el.id || '',
    classes: Array.from(el.classList),
    attributes: {},
    ancestors: [],
    siblingText: '',
    index: 0
  };

  ['href', 'name', 'type', 'role', 'aria-label', 'data-action'].forEach(attr => {
    if (el.hasAttribute(attr)) fp.attributes[attr] = el.getAttribute(attr)!;
  });

  let curr: HTMLElement | null = el.parentElement;
  let depth = 0;
  while (curr && depth < 4) {
    let aStr = curr.tagName.toLowerCase();
    if (curr.hasAttribute('role')) aStr += `[role=${curr.getAttribute('role')}]`;
    fp.ancestors.push(aStr);
    curr = curr.parentElement;
    depth++;
  }

  if (el.parentElement) {
    const siblings = Array.from(el.parentElement.children);
    fp.index = siblings.indexOf(el);
    const prev = el.previousElementSibling;
    const next = el.nextElementSibling;
    fp.siblingText = ((prev?.textContent || '') + ' ' + (next?.textContent || '')).trim().toLowerCase();
  }

  return fp;
}

function jaccard(a: string[], b: string[]) {
  if (a.length === 0 && b.length === 0) return 1.0;
  const setA = new Set(a);
  const setB = new Set(b);
  let intersect = 0;
  for (const item of setA) if (setB.has(item)) intersect++;
  const union = setA.size + setB.size - intersect;
  return union === 0 ? 0 : intersect / union;
}

function textScoreCalc(a: string, b: string) {
  if (a === b) return 1.0;
  if (a.includes(b) || b.includes(a)) return 0.8;
  const tA = a.split(' ').filter(Boolean);
  const tB = b.split(' ').filter(Boolean);
  return jaccard(tA, tB);
}

export function healElement(fingerprintStr: string): { element: Element | null, score: number, newSelector?: string } {
  const fp: Fingerprint = JSON.parse(fingerprintStr);
  const candidates = Array.from(document.querySelectorAll(fp.tag));
  
  if (['button', 'a'].includes(fp.tag)) {
    Array.from(document.querySelectorAll('button, a, [role="button"]')).forEach(el => {
      if (!candidates.includes(el)) candidates.push(el);
    });
  }

  let bestScore = 0;
  let bestEl: Element | null = null;
  let runnerUpScore = 0;

  for (const el of candidates) {
    const cfp = captureFingerprint(el as HTMLElement);
    
    // Text Similarity
    const textScore = textScoreCalc(fp.text, cfp.text);

    // Attributes (Boost if href matches, otherwise standard)
    let attrScore = 0.5; // baseline if neither has attributes
    if (Object.keys(fp.attributes).length > 0 || Object.keys(cfp.attributes).length > 0) {
       // if we have 'checkout' in href, give it a big boost since it's a checkout button
       if (cfp.attributes['href']?.includes('checkout') && fp.text.includes('checkout')) {
         attrScore = 1.0;
       } else {
         let attrMatches = 0;
         let attrTotal = Object.keys(fp.attributes).length;
         for (const [k, v] of Object.entries(fp.attributes)) {
           if (cfp.attributes[k] === v) attrMatches++;
         }
         attrScore = attrTotal > 0 ? attrMatches / attrTotal : 0.5;
       }
    }

    // Classes
    const classScore = jaccard(fp.classes, cfp.classes);

    // Ancestors (just check if they share ANY ancestor, e.g. both inside a div)
    const ancScore = jaccard(fp.ancestors, cfp.ancestors) > 0 ? 1.0 : 0.0;

    // Sibling
    const sibScore = jaccard(fp.siblingText.split(' '), cfp.siblingText.split(' '));

    const totalScore = 
      (textScore * 0.35) +
      (attrScore * 0.20) +
      (classScore * 0.10) +
      (ancScore * 0.15) +
      (sibScore * 0.10) +
      (0.10); // Region bucket simplified

    if (totalScore > bestScore) {
      runnerUpScore = bestScore;
      bestScore = totalScore;
      bestEl = el;
    } else if (totalScore > runnerUpScore) {
      runnerUpScore = totalScore;
    }
  }

  if (bestScore >= 0.55 && (bestScore - runnerUpScore) >= 0.10) {
    let selector = bestEl!.tagName.toLowerCase();
    if (bestEl!.id) selector = '#' + bestEl!.id;
    else if (bestEl!.className && typeof bestEl!.className === 'string') {
       selector += '.' + bestEl!.className.split(' ').filter(c => c.trim().length > 0).join('.');
    }
    return { element: bestEl, score: bestScore, newSelector: selector };
  }

  return { element: null, score: bestScore };
}
