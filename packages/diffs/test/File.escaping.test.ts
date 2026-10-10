import { afterAll, describe, expect, test } from 'bun:test';

import { File } from '../src/components/File';
import { DEFAULT_THEMES } from '../src/constants';
import { disposeHighlighter } from '../src/highlighter/shared_highlighter';
import type { FileContents } from '../src/types';
import { installDom, wait } from './domHarness';

// Standing security fixture: adversarial file content must render as inert
// text. File contents, file names, and every other untrusted string reach the
// DOM through hast-util-to-html over trees whose untrusted values are text
// nodes or escaped properties. This fixture guards that construction against
// future edits and upstream re-syncs: no payload line may ever produce an
// element or an event-handler attribute, and every payload line must remain
// literal text.
const ADVERSARIAL_LINES = [
  '<script>alert(1)</script>',
  '<img src=x onerror=alert(2)>',
  '"><svg onload=alert(3)>',
  '<iframe src="javascript:alert(4)"></iframe>',
  '<a href="javascript:alert(5)">click</a>',
  '&lt;script&gt;alert(6)&lt;/script&gt;',
  '&#x3C;img src=x onerror=alert(7)&#x3E;',
  '</code></pre><script>alert(8)</script>',
  '" onmouseover="alert(9)" x="',
];

const ADVERSARIAL_NAME = '<img src=x onerror=alert(10)> spec.md';

afterAll(async () => {
  await disposeHighlighter();
});

async function renderFile(
  file: FileContents
): Promise<{ cleanup(): void; root: ShadowRoot }> {
  const dom = installDom();
  const fileContainer = document.createElement('div');
  document.body.appendChild(fileContainer);

  const component = new File<undefined>({ theme: DEFAULT_THEMES });
  component.render({ file, fileContainer, forceRender: true });

  // The viewer render is asynchronous: lines appear with empty content first
  // and are re-rendered once the shared highlighter resolves its themes, so
  // wait for actual payload text rather than for the pre element.
  for (let attempt = 0; attempt < 100; attempt++) {
    const root = fileContainer.shadowRoot;
    if (
      root?.querySelector('pre') != null &&
      (root.textContent ?? '').includes('alert(1)')
    ) {
      return {
        root,
        cleanup() {
          component.cleanUp();
          dom.cleanup();
        },
      };
    }
    await wait(0);
  }

  dom.cleanup();
  throw new Error('file did not render');
}

describe('File escaping', () => {
  test('renders adversarial file content as inert text', async () => {
    const { cleanup, root } = await renderFile({
      name: ADVERSARIAL_NAME,
      contents: `${ADVERSARIAL_LINES.join('\n')}\n`,
    });

    try {
      expect(
        root.querySelectorAll('script, iframe, object, embed').length
      ).toBe(0);
      // The header renders legitimate icon svgs; no svg may originate from
      // file content, so only svgs (and elements generally) carrying
      // event-handler attributes are rejected.
      expect(
        root.querySelectorAll(
          '[onclick], [onerror], [onload], [onmouseover], [onfocus]'
        ).length
      ).toBe(0);
      expect(
        root.querySelectorAll(
          'a[href^="javascript:"], use[href^="javascript:"]'
        ).length
      ).toBe(0);

      const text = root.textContent ?? '';
      for (const line of ADVERSARIAL_LINES) {
        expect(text.includes(line)).toBe(true);
      }
      // The file name renders as literal header text, never as markup.
      expect(text.includes(ADVERSARIAL_NAME)).toBe(true);
    } finally {
      cleanup();
    }
  });
});
