"""
dieline_generator.py
====================
Generates a Pacdora-style Die Line (structural template) PDF in CMYK vector
quality. The output is a single-page PDF containing:

  Layer / Line Type    Color               Stroke
  ─────────────────    ──────────────────  ────────────────────────
  Cut line             Magenta (CMYK)      Solid   0.25 pt
  Fold / Crease        Blue (CMYK)         Dashed  0.25 pt  [4,3]
  Perforation          Black (CMYK)        Dot-dash 0.25 pt [1,2,4,2]
  Bleed Boundary       Grey (CMYK)         Dashed  0.50 pt  [3,3]
  Safety Margin        Green (CMYK)        Dashed  0.25 pt  [2,4]

A colour-coded legend (Pacdora style), registration marks, and CMYK
calibration bar are included at the sheet margins.

The PDF is AI / Illustrator compatible (no transparency, pure vector paths).
"""
import os
from reportlab.pdfgen import canvas
from reportlab.lib.units import mm
from reportlab.lib import colors

# ── Line colours (CMYK) ─────────────────────────────────────────────────────
_CUT_COLOR   = colors.CMYKColor(0, 1,    0,    0)       # Magenta
_FOLD_COLOR  = colors.CMYKColor(1, 0.4,  0,    0)       # Blue
_PERF_COLOR  = colors.CMYKColor(0, 0,    0,    1)       # Black
_BLEED_COLOR = colors.CMYKColor(0, 0,    0,    0.45)    # Dark grey
_SAFE_COLOR  = colors.CMYKColor(0.9, 0,  0.8,  0)       # Green
_REG_BLACK   = colors.CMYKColor(0, 0,    0,    1)

# ── Geometry constants ───────────────────────────────────────────────────────
_BLEED_DEFAULT = 3      # mm
_SAFE_DEFAULT  = 5      # mm   (inner safety margin from trim edge)
_SHEET_MARGIN  = 18     # mm   (space around die for marks)
_MARK_LEN      = 6      # mm
_MARK_GAP      = 2      # mm
_REG_RADIUS    = 4      # mm
_FONT_SM       = 6.5
_FONT_MD       = 8


def _pt(val_mm: float) -> float:
    return val_mm * mm


# ────────────────────────────────────────────────────────────────────────────
# MARK DRAWING HELPERS
# ────────────────────────────────────────────────────────────────────────────

def _crop_marks(c, x, y, w, h, bleed):
    """4-corner crop marks around trim box."""
    c.saveState()
    c.setStrokeColor(_CUT_COLOR)
    c.setLineWidth(0.25)
    gap = _pt(_MARK_GAP)
    ml  = _pt(_MARK_LEN)
    b   = _pt(bleed)

    # Bottom-left corner
    c.line(x - b - gap - ml, y,         x - b - gap, y)
    c.line(x,                y - b - gap - ml, x,    y - b - gap)
    # Bottom-right corner
    c.line(x + w + b + gap,  y,         x + w + b + gap + ml, y)
    c.line(x + w,            y - b - gap - ml, x + w, y - b - gap)
    # Top-left corner
    c.line(x - b - gap - ml, y + h,     x - b - gap, y + h)
    c.line(x,                y + h + b + gap, x,     y + h + b + gap + ml)
    # Top-right corner
    c.line(x + w + b + gap,  y + h,     x + w + b + gap + ml, y + h)
    c.line(x + w,            y + h + b + gap, x + w, y + h + b + gap + ml)
    c.restoreState()


def _bleed_rect(c, x, y, w, h, bleed):
    """Dashed bleed boundary box."""
    c.saveState()
    c.setStrokeColor(_BLEED_COLOR)
    c.setLineWidth(0.5)
    c.setDash([3, 3], 0)
    b = _pt(bleed)
    c.rect(x - b, y - b, w + 2 * b, h + 2 * b, fill=0, stroke=1)
    c.restoreState()


def _safety_rect(c, x, y, w, h, safe):
    """Dashed safety/live-area boundary inside trim box."""
    c.saveState()
    c.setStrokeColor(_SAFE_COLOR)
    c.setLineWidth(0.25)
    c.setDash([2, 4], 0)
    s = _pt(safe)
    c.rect(x + s, y + s, w - 2 * s, h - 2 * s, fill=0, stroke=1)
    c.restoreState()


def _fold_lines(c, x, y, w, h, has_fold_h=True, has_fold_v=False):
    """Dashed fold/crease lines at halves (can be customised per shape)."""
    c.saveState()
    c.setStrokeColor(_FOLD_COLOR)
    c.setLineWidth(0.25)
    c.setDash([4, 3], 0)
    if has_fold_h:
        mid_y = y + h / 2
        c.line(x, mid_y, x + w, mid_y)
    if has_fold_v:
        mid_x = x + w / 2
        c.line(mid_x, y, mid_x, y + h)
    c.restoreState()


def _perforation_lines(c, x, y, w, h, count=3):
    """Dot-dash perforation lines (tear strips) near the top of the design."""
    c.saveState()
    c.setStrokeColor(_PERF_COLOR)
    c.setLineWidth(0.25)
    c.setDash([1, 2, 4, 2], 0)  # dot–gap–dash–gap pattern
    spacing = h / (count + 1)
    for i in range(1, count + 1):
        py = y + spacing * i
        c.line(x + _pt(5), py, x + w - _pt(5), py)
    c.restoreState()


def _registration_mark(c, cx, cy):
    """⊕ registration target."""
    c.saveState()
    c.setStrokeColor(_REG_BLACK)
    c.setFillColor(colors.white)
    c.setLineWidth(0.4)
    r = _pt(_REG_RADIUS)
    c.circle(cx, cy, r, fill=1, stroke=1)
    c.setFillColor(_REG_BLACK)
    c.circle(cx, cy, r * 0.2, fill=1, stroke=0)
    c.line(cx - r * 1.6, cy, cx + r * 1.6, cy)
    c.line(cx, cy - r * 1.6, cx, cy + r * 1.6)
    c.restoreState()


def _cmyk_bar(c, sheet_w_pt, y_pt):
    """CMYK calibration bar at sheet bottom."""
    patches = [
        (colors.CMYKColor(1, 0, 0, 0), 'C'),
        (colors.CMYKColor(0, 1, 0, 0), 'M'),
        (colors.CMYKColor(0, 0, 1, 0), 'Y'),
        (colors.CMYKColor(0, 0, 0, 1), 'K'),
        (colors.CMYKColor(0, 0, 0, 0), 'W'),
        (colors.CMYKColor(1, 1, 0, 0), 'C+M'),
        (colors.CMYKColor(1, 0, 1, 0), 'C+Y'),
        (colors.CMYKColor(0, 1, 1, 0), 'M+Y'),
    ]
    bw = sheet_w_pt / len(patches)
    bh = _pt(4)
    for i, (col, lbl) in enumerate(patches):
        bx = i * bw
        c.setFillColor(col)
        c.setStrokeColor(_REG_BLACK)
        c.setLineWidth(0.2)
        c.rect(bx, y_pt, bw, bh, fill=1, stroke=1)
        c.setFillColor(_REG_BLACK if i != 3 else colors.white)
        c.setFont('Helvetica', 5)
        c.drawCentredString(bx + bw / 2, y_pt + 1.5, lbl)


def _legend(c, x, y):
    """Colour-coded legend panel (Pacdora-style vertical list)."""
    entries = [
        (_CUT_COLOR,   False, None,          "Cut Line"),
        (_FOLD_COLOR,  True,  [4, 3],        "Fold / Crease"),
        (_PERF_COLOR,  True,  [1, 2, 4, 2],  "Perforation"),
        (_BLEED_COLOR, True,  [3, 3],        "Bleed Boundary"),
        (_SAFE_COLOR,  True,  [2, 4],        "Safety Margin"),
    ]
    row_h = _pt(6)
    c.setFont('Helvetica-Bold', _FONT_SM)
    c.setFillColor(_REG_BLACK)
    c.drawString(x, y + _pt(3), "LINE TYPE LEGEND")
    c.setFont('Helvetica', _FONT_SM)

    for i, (col, dashed, dash_arr, label) in enumerate(entries):
        ly = y - i * row_h
        c.saveState()
        c.setStrokeColor(col)
        c.setLineWidth(0.7)
        if dashed and dash_arr:
            c.setDash(dash_arr, 0)
        c.line(x, ly, x + _pt(10), ly)
        c.restoreState()
        c.setFillColor(_REG_BLACK)
        c.drawString(x + _pt(12), ly - 2, label)


# ── Dimension arrows helper ──────────────────────────────────────────────────
def _dim_label(c, x1, y, x2, label, above=True):
    """Draw a double-headed dimension arrow with a label."""
    c.saveState()
    c.setStrokeColor(_REG_BLACK)
    c.setLineWidth(0.3)
    c.line(x1, y, x2, y)
    arrow = _pt(1.5)
    # Left arrow head
    c.line(x1, y, x1 + arrow, y + arrow / 2)
    c.line(x1, y, x1 + arrow, y - arrow / 2)
    # Right arrow head
    c.line(x2, y, x2 - arrow, y + arrow / 2)
    c.line(x2, y, x2 - arrow, y - arrow / 2)
    c.setFont('Helvetica', _FONT_SM)
    c.setFillColor(_REG_BLACK)
    mid = (x1 + x2) / 2
    dy = _pt(2) if above else -_pt(4)
    c.drawCentredString(mid, y + dy, label)
    c.restoreState()


# ────────────────────────────────────────────────────────────────────────────
# MAIN GENERATOR
# ────────────────────────────────────────────────────────────────────────────

def generate_dieline_pdf(data: dict, output_path: str) -> bool:
    """
    Generate a Pacdora-style die line PDF.

    Parameters
    ----------
    data : dict
        Must contain: file_name, width_mm, height_mm, paper_size,
        paper_material, gsm.
        Optional: bleed_mm (default 3), safe_mm (default 5),
        has_fold (default True), has_perf (default False).

    Returns
    -------
    bool  True on success.
    """
    try:
        file_name     = data.get("file_name", "Design")
        design_w_mm   = float(data.get("width_mm") or 100)
        design_h_mm   = float(data.get("height_mm") or 100)
        bleed_mm      = float(data.get("bleed_mm") or _BLEED_DEFAULT)
        safe_mm       = float(data.get("safe_mm") or _SAFE_DEFAULT)
        paper_material= data.get("paper_material", "Art Paper")
        paper_size    = data.get("paper_size", "A4")
        gsm           = data.get("gsm", 150)
        has_fold      = bool(data.get("has_fold", True))
        has_perf      = bool(data.get("has_perf", False))

        # Sheet = design + bleed + margin on each side
        sheet_w_mm = design_w_mm + 2 * bleed_mm + 2 * _SHEET_MARGIN
        sheet_h_mm = design_h_mm + 2 * bleed_mm + 2 * _SHEET_MARGIN

        sheet_w_pt = _pt(sheet_w_mm)
        sheet_h_pt = _pt(sheet_h_mm)

        # Trim box anchored in center of sheet
        trim_x = _pt(_SHEET_MARGIN + bleed_mm)
        trim_y = _pt(_SHEET_MARGIN + bleed_mm)
        trim_w = _pt(design_w_mm)
        trim_h = _pt(design_h_mm)

        # ── Canvas ───────────────────────────────────────────────────────
        c = canvas.Canvas(output_path, pagesize=(sheet_w_pt, sheet_h_pt))
        c.setTitle(f"Die Line — {file_name}")
        c.setAuthor("PrintGuard AI")
        c.setSubject(f"Dieline · {paper_size} · {paper_material} · {gsm}gsm")

        # White background
        c.setFillColor(colors.white)
        c.rect(0, 0, sheet_w_pt, sheet_h_pt, fill=1, stroke=0)

        # ── Design area fill (very light grey placeholder) ────────────────
        c.setFillColor(colors.CMYKColor(0, 0, 0, 0.04))
        c.setStrokeColor(colors.CMYKColor(0, 0, 0, 0))
        c.rect(trim_x, trim_y, trim_w, trim_h, fill=1, stroke=0)

        # ── Die Lines ────────────────────────────────────────────────────
        # 1. Safety margin (innermost)
        _safety_rect(c, trim_x, trim_y, trim_w, trim_h, safe_mm)

        # 2. Trim / cut line (solid magenta)
        c.saveState()
        c.setStrokeColor(_CUT_COLOR)
        c.setLineWidth(0.25)
        c.rect(trim_x, trim_y, trim_w, trim_h, fill=0, stroke=1)
        c.restoreState()

        # 3. Bleed boundary (outside trim)
        _bleed_rect(c, trim_x, trim_y, trim_w, trim_h, bleed_mm)

        # 4. Fold lines
        if has_fold:
            _fold_lines(c, trim_x, trim_y, trim_w, trim_h,
                        has_fold_h=True, has_fold_v=False)

        # 5. Perforation lines
        if has_perf:
            _perforation_lines(c, trim_x, trim_y, trim_w, trim_h, count=2)

        # 6. Crop marks
        _crop_marks(c, trim_x, trim_y, trim_w, trim_h, bleed_mm)

        # ── Dimension labels ─────────────────────────────────────────────
        dim_y = trim_y - _pt(bleed_mm + 9)
        _dim_label(c, trim_x, dim_y, trim_x + trim_w,
                   f"{design_w_mm:.0f} mm (trim)", above=False)

        dim_x_bleed = trim_x - _pt(bleed_mm)
        _dim_label(c, dim_x_bleed, dim_y - _pt(5),
                   dim_x_bleed + trim_w + _pt(2 * bleed_mm),
                   f"{design_w_mm + 2 * bleed_mm:.0f} mm (+ bleed)", above=False)

        # Vertical dimension (rotated)
        c.saveState()
        c.translate(trim_x - _pt(bleed_mm + 8), trim_y + trim_h / 2)
        c.rotate(90)
        _dim_label(c, -trim_h / 2, 0, trim_h / 2,
                   f"{design_h_mm:.0f} mm", above=True)
        c.restoreState()

        # ── Registration marks at sheet corners ──────────────────────────
        off = _pt(7)
        _registration_mark(c, off, off)
        _registration_mark(c, sheet_w_pt - off, off)
        _registration_mark(c, off, sheet_h_pt - off)
        _registration_mark(c, sheet_w_pt - off, sheet_h_pt - off)

        # ── CMYK calibration bar ─────────────────────────────────────────
        _cmyk_bar(c, sheet_w_pt, _pt(1.5))

        # ── Legend ───────────────────────────────────────────────────────
        legend_x = sheet_w_pt - _pt(45)
        legend_y = sheet_h_pt - _pt(12)
        _legend(c, legend_x, legend_y)

        # ── Header info ──────────────────────────────────────────────────
        c.setFillColor(_REG_BLACK)
        c.setFont("Helvetica-Bold", 7.5)
        c.drawString(_pt(5), sheet_h_pt - _pt(7),
                     f"PrintGuard AI · Die Line · {file_name}")
        c.setFont("Helvetica", 6.5)
        c.drawString(_pt(5), sheet_h_pt - _pt(12),
                     f"{paper_size} · {paper_material} · {gsm}gsm · "
                     f"Trim: {design_w_mm:.0f}×{design_h_mm:.0f}mm · "
                     f"Bleed: {bleed_mm}mm · Safe: {safe_mm}mm")

        c.save()
        return True

    except Exception as exc:
        import traceback
        traceback.print_exc()
        print(f"Die line generator error: {exc}")
        return False
