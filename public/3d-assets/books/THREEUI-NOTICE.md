# ThreeUI "Bestseller Books" — third-party notice

The 3D book in the hero comes from the ThreeUI Community component **Bestseller Books**.
It was extracted from `bestsellers-book-showcase`, and its pinned source revision is
`sha256:7c1ed1ca4a4c58f1c33956c84edd8f7ba450ea0312df718701e634a207568138`.

- Registered source bundle: https://threeui.com/source-code/bestseller-books.json
- Package: `@designcodeio/threeui` 1.2.0, MIT License, © 2026 Meng To. Repository: https://github.com/MengTo/threeui

## Files vendored and their changes

| File | Original SHA-256 | Changes |
|---|---|---|
| `src/components/threeui/BestsellerBooks.tsx` | bcea1f73…5510a | Unmodified |
| `src/components/threeui/BookAssetHost.tsx` | 9bf23273…c844d | Unmodified |
| `bestsellers/viewer.js` | a7ba5892…6dedf | Header comment added; `video?.` optional chaining; tilt resets on `pointerleave` |
| `bestsellers/book.css` | 7a9884fc…86613 | Original rules unchanged; a scoped `[data-book="ztfc"]` skin is appended |
| `bestsellers/editions.js` | 524cd925…36025 | The three demo editions are replaced by the single ZERO TO FIRST CLIENT edition |
| `bestsellers/preview.html` | 7c861c92…7bb1 | Title changed; a postMessage open/close bridge is added |
| `runtime/style.css` | dcbecb8f…d06 | Unmodified |
| `runtime/resources.js` | 31ab62fc…004b5 | Unmodified |

These were not used:
- The demo cover JPEGs and MP4s (Codex, Claude Code and Cursor artwork).
- `assets.js`, the optional self-hosting list. The served copy also didn't match its registered hash.

The cover and page images in `bestsellers/ztfc/` are © 2026 DEADCODE LABS. They were rendered from the ebook (cover and PDF pages 2–4), and the MIT license does not cover them.

## MIT License

Copyright (c) 2026 Meng To

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
