"""
ups_generator.py
================
Generates a professional UPS (Up-Step / Step-and-Repeat / Imposition) PDF
in vector CMYK quality with:
  • Cutting (crop) marks
  • Creasing (fold) marks
  • Bleed boundary marks
  • Registration targets

All marks follow industry-standard prepress conventions.
"""
import os
import math
from reportlab.pdfgen import canvas
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.pagesizes import A3, A4, A5, A6

# ── Registration Black (CMYK 0,0,0,1) ──────────────────────────────────────
_REG_BLACK = colors.CMYKColor(0, 0, 0, 1)
_BLEED_GRAY = colors.CMYKColor(0, 0, 0, 0.45)
_CREASE_BLUE = colors.CMYKColor(1, 0.4, 0, 0)
_SAFE_GREEN = colors.CMYKColor(0.9, 0, 0.8, 0)

# ── Standard paper sizes (in mm) ───────────────────────────────────────────
PAPER_SIZES_MM = {
    "A3":              (297, 420),
    "A4":              (210, 297),
    "A5":              (148, 210),
    "A6":              (105, 148),
    "Business Card":   (85, 54),
    "DL Envelope":     (110, 220),
}

# Margin around sheet edge where registration marks live (mm)
_SHEET_MARGIN = 10
_MARK_LEN = 5       # crop mark length (mm)
_MARK_GAP = 2       # gap between design edge and start of mark (mm)
_MARK_W = 0.25      # crop mark stroke width (pt)
_REG_RADIUS = 3     # registration circle radius (mm)
_BLEED_OFFSET = 3   # default bleed (mm) — overridden by data


def _pt(val_mm: float) -> float:
    """Convert mm to ReportLab points."""
    return val_mm * mm


def _draw_cutting_marks(c: canvas.Canvas, x: float, y: float, w: float, h: float, bleed_mm: float):
    """
    Draw 4-corner crop marks outside the design box.
    x, y = bottom-left of the *trim* box (in pt)
    w, h = trim box width/height (in pt)
    """
    c.saveState()
    c.setStrokeColor(_REG_BLACK)
    c.setLineWidth(_MARK_W)

    gap = _pt(_MARK_GAP)
    ml = _pt(_MARK_LEN)
    b = _pt(bleed_mm)

    # Bottom-left
    c.line(x - b - gap - ml, y,          x - b - gap, y)           # horizontal
    c.line(x,                 y - b - gap - ml, x,       y - b - gap)  # vertical

    # Bottom-right
    c.line(x + w + b + gap,   y,          x + w + b + gap + ml, y)
    c.line(x + w,             y - b - gap - ml, x + w,   y - b - gap)

    # Top-left
    c.line(x - b - gap - ml, y + h,      x - b - gap, y + h)
    c.line(x,                y + h + b + gap, x,       y + h + b + gap + ml)

    # Top-right
    c.line(x + w + b + gap,  y + h,      x + w + b + gap + ml, y + h)
    c.line(x + w,            y + h + b + gap, x + w,   y + h + b + gap + ml)

    c.restoreState()


def _draw_bleed_box(c: canvas.Canvas, x: float, y: float, w: float, h: float, bleed_mm: float):
    """Draw a dashed bleed-boundary rectangle."""
    c.saveState()
    c.setStrokeColor(_BLEED_GRAY)
    c.setLineWidth(0.5)
    c.setDash(3, 3)
    b = _pt(bleed_mm)
    c.rect(x - b, y - b, w + 2 * b, h + 2 * b, fill=0, stroke=1)
    c.restoreState()


def _draw_creasing_marks(c: canvas.Canvas, x: float, y: float, w: float, h: float):
    """
    Draw dashed crease/fold lines along the horizontal and vertical mid-lines
    of the design cell. In real packaging these would be at fold positions.
    """
    c.saveState()
    c.setStrokeColor(_CREASE_BLUE)
    c.setLineWidth(0.5)
    c.setDash(4, 3)
    mid_x = x + w / 2
    mid_y = y + h / 2
    # Horizontal fold
    c.line(x, mid_y, x + w, mid_y)
    # Vertical fold
    c.line(mid_x, y, mid_x, y + h)
    c.restoreState()


def _draw_registration_mark(c: canvas.Canvas, cx: float, cy: float):
    """Draw a ⊕ registration target centred at (cx, cy) in pt."""
    c.saveState()
    c.setStrokeColor(_REG_BLACK)
    c.setFillColor(colors.white)
    c.setLineWidth(0.4)
    r = _pt(_REG_RADIUS)
    # Outer circle
    c.circle(cx, cy, r, fill=1, stroke=1)
    # Inner dot
    c.setFillColor(_REG_BLACK)
    c.circle(cx, cy, r * 0.2, fill=1, stroke=0)
    # Cross hairs
    c.line(cx - r * 1.5, cy, cx + r * 1.5, cy)
    c.line(cx, cy - r * 1.5, cx, cy + r * 1.5)
    c.restoreState()


def _draw_cmyk_color_bar(c: canvas.Canvas, sheet_w_pt: float, y_pt: float):
    """Draw a CMYK colour calibration bar at the bottom of the sheet."""
    bar_colors = [
        colors.CMYKColor(1, 0, 0, 0),   # Cyan
        colors.CMYKColor(0, 1, 0, 0),   # Magenta
        colors.CMYKColor(0, 0, 1, 0),   # Yellow
        colors.CMYKColor(0, 0, 0, 1),   # Black
        colors.CMYKColor(0, 0, 0, 0),   # Paper white
        colors.CMYKColor(1, 1, 0, 0),   # C+M
        colors.CMYKColor(1, 0, 1, 0),   # C+Y
        colors.CMYKColor(0, 1, 1, 0),   # M+Y
    ]
    names = ['C', 'M', 'Y', 'K', 'W', 'C+M', 'C+Y', 'M+Y']
    bar_w = sheet_w_pt / len(bar_colors)
    bar_h = _pt(4)
    for i, (col, name) in enumerate(zip(bar_colors, names)):
        bx = i * bar_w
        c.setFillColor(col)
        c.setStrokeColor(_REG_BLACK)
        c.setLineWidth(0.2)
        c.rect(bx, y_pt, bar_w, bar_h, fill=1, stroke=1)
        c.setFillColor(_REG_BLACK if i != 3 else colors.white)
        c.setFont('Helvetica', 5)
        c.drawCentredString(bx + bar_w / 2, y_pt + 1.5, name)


def _draw_legend(c: canvas.Canvas, x_pt: float, y_pt: float):
    """Draw a small colour-coded legend (Pacdora style)."""
    items = [
        (_REG_BLACK,  False, "Cut Line"),
        (_BLEED_GRAY, True,  "Bleed Line"),
        (_CREASE_BLUE, True, "Fold / Crease"),
    ]
    c.setFont('Helvetica', 7)
    row_h = _pt(5)
    for i, (col, dashed, label) in enumerate(items):
        ly = y_pt - i * row_h
        c.saveState()
        c.setStrokeColor(col)
        c.setLineWidth(0.6)
        if dashed:
            c.setDash(3, 2)
        c.line(x_pt, ly, x_pt + _pt(8), ly)
        c.restoreState()
        c.setFillColor(_REG_BLACK)
        c.drawString(x_pt + _pt(10), ly - 2, label)


def generate_ups_pdf(data: dict, output_path: str) -> bool:
    """
    Generate a multi-up (step-and-repeat) imposition PDF.

    Parameters
    ----------
    data : dict
        Analysis data dict. Expected keys:
          file_name, width_mm, height_mm, paper_size, paper_material,
          gsm, bleed_mm (optional, default 3)
    output_path : str
        Filesystem path for the output PDF.

    Returns
    -------
    bool  True on success.
    """
    try:
        file_name = data.get("file_name", "Design")
        design_w_mm = float(data.get("width_mm") or 100)
        design_h_mm = float(data.get("height_mm") or 100)
        bleed_mm = float(data.get("bleed_mm") or 3)
        paper_size_name = data.get("paper_size", "A4")
        paper_material = data.get("paper_material", "Art Paper")
        gsm = data.get("gsm", 150)

        # ── Sheet size ───────────────────────────────────────────────────
        sheet_wh = PAPER_SIZES_MM.get(paper_size_name)
        if not sheet_wh:
            sheet_wh = (210, 297)  # fallback A4
        sheet_w_mm, sheet_h_mm = sheet_wh

        # Usable area (sheet minus margins)
        usable_w_mm = sheet_w_mm - 2 * _SHEET_MARGIN
        usable_h_mm = sheet_h_mm - 2 * _SHEET_MARGIN

        # Design cell = trim + bleed on each side
        cell_w_mm = design_w_mm + 2 * bleed_mm
        cell_h_mm = design_h_mm + 2 * bleed_mm

        # Number of columns & rows
        cols = max(1, int(usable_w_mm / cell_w_mm))
        rows = max(1, int(usable_h_mm / cell_h_mm))

        # Convert to points
        sheet_w_pt = _pt(sheet_w_mm)
        sheet_h_pt = _pt(sheet_h_mm)
        margin_pt = _pt(_SHEET_MARGIN)
        cell_w_pt = _pt(cell_w_mm)
        cell_h_pt = _pt(cell_h_mm)
        design_w_pt = _pt(design_w_mm)
        design_h_pt = _pt(design_h_mm)

        # ── Canvas ───────────────────────────────────────────────────────
        c = canvas.Canvas(output_path, pagesize=(sheet_w_pt, sheet_h_pt))
        c.setTitle(f"UPS — {file_name}")
        c.setAuthor("PrintGuard AI")
        c.setSubject(f"Step-and-Repeat · {paper_size_name} · {paper_material} · {gsm}gsm")

        # ── Background ───────────────────────────────────────────────────
        c.setFillColor(colors.white)
        c.rect(0, 0, sheet_w_pt, sheet_h_pt, fill=1, stroke=0)

        # ── Grid of design cells ─────────────────────────────────────────
        # Start from top-left, work row by row downward
        for row in range(rows):
            for col in range(cols):
                # Bottom-left of the TRIM BOX for this cell
                cell_origin_x = margin_pt + col * cell_w_pt + _pt(bleed_mm)
                # Sheet is measured from bottom, so invert rows
                cell_origin_y = (sheet_h_pt - margin_pt
                                 - (row + 1) * cell_h_pt
                                 + _pt(bleed_mm))

                trim_x = cell_origin_x
                trim_y = cell_origin_y
                trim_w = design_w_pt
                trim_h = design_h_pt

                # Design placeholder (light grey fill)
                c.setFillColor(colors.CMYKColor(0, 0, 0, 0.06))
                c.setStrokeColor(colors.CMYKColor(0, 0, 0, 0.15))
                c.setLineWidth(0.3)
                c.rect(trim_x, trim_y, trim_w, trim_h, fill=1, stroke=1)

                # Label inside placeholder
                c.setFillColor(_REG_BLACK)
                c.setFont("Helvetica", min(7, design_w_mm * 0.06))
                label = f"{file_name[:20]}"
                c.drawCentredString(trim_x + trim_w / 2,
                                    trim_y + trim_h / 2 - 3,
                                    label)
                c.setFont("Helvetica", min(6, design_w_mm * 0.05))
                c.drawCentredString(trim_x + trim_w / 2,
                                    trim_y + trim_h / 2 - 10,
                                    f"{design_w_mm:.0f}×{design_h_mm:.0f}mm")

                # Marks
                _draw_bleed_box(c, trim_x, trim_y, trim_w, trim_h, bleed_mm)
                _draw_cutting_marks(c, trim_x, trim_y, trim_w, trim_h, bleed_mm)
                _draw_creasing_marks(c, trim_x, trim_y, trim_w, trim_h)

        # ── Registration marks at sheet corners ──────────────────────────
        reg_off = _pt(5)
        _draw_registration_mark(c, reg_off, reg_off)
        _draw_registration_mark(c, sheet_w_pt - reg_off, reg_off)
        _draw_registration_mark(c, reg_off, sheet_h_pt - reg_off)
        _draw_registration_mark(c, sheet_w_pt - reg_off, sheet_h_pt - reg_off)

        # ── CMYK colour bar at very bottom ───────────────────────────────
        _draw_cmyk_color_bar(c, sheet_w_pt, _pt(2))

        # ── Sheet info header ────────────────────────────────────────────
        c.setFillColor(_REG_BLACK)
        c.setFont("Helvetica-Bold", 7)
        c.drawString(margin_pt, sheet_h_pt - _pt(7),
                     f"PrintGuard AI · UPS Imposition · {paper_size_name} · "
                     f"{paper_material} · {gsm}gsm · "
                     f"{cols}×{rows} = {cols * rows} up")

        # ── Legend ───────────────────────────────────────────────────────
        legend_x = sheet_w_pt - _pt(40)
        legend_y = sheet_h_pt - _pt(10)
        _draw_legend(c, legend_x, legend_y)

        c.save()
        return True

    except Exception as exc:
        import traceback
        traceback.print_exc()
        print(f"UPS generator error: {exc}")
        return False
