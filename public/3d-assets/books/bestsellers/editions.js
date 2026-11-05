// Modified for ZERO TO FIRST CLIENT (DEADCODE LABS).
// Original: ThreeUI Community "Bestseller Books" editions.js
// (sha256 524cd925f174bed5e8d4262e06fa7378dd1d749da4edc3da7153e8180ae36025), MIT License — see ../THREEUI-NOTICE.md.
// The three demo editions (Codex, Claude Code, Cursor) are replaced by a single edition. The markup keeps the
// original book construction (shadow, back, page block, page fan, front cover); the cover uses the real ebook
// cover artwork, and the four fan leaves carry the ebook's first interior pages (PDF pages 2, 3 and 4).
// The cover artwork already contains all cover text, so there is no animated cover video and no overlay copy.
export const editions=[
  {
    "id": "ztfc",
    "title": "Zero to First Client",
    "html": "<button\n        class=\"book-card\"\n        type=\"button\"\n        data-book=\"ztfc\"\n        aria-label=\"Open Zero to First Client cover\"\n        style=\"\n          --cover-color: #faf9f6;\n          --cover: url('./ztfc/cover.webp');\n        \"\n      >\n        <span class=\"book\" aria-hidden=\"true\">\n          <span class=\"book-shadow\"></span>\n          <span class=\"book-back\"></span>\n          <span class=\"page-block\"></span>\n          <span class=\"page-fan\"><i></i><i class=\"ztfc-page ztfc-page-04\"></i><i class=\"ztfc-page ztfc-page-03\"></i><i class=\"ztfc-page ztfc-page-02\"></i></span>\n          <span class=\"front-cover\"></span>\n        </span>\n      </button>"
  }
];
